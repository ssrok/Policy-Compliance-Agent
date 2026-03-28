"""
impact_analysis.py
------------------
Aggregates row-level explainability into rule-level impact insights.
Uses only pre-computed explanation and comparison outputs — no rule re-evaluation.
"""

from collections import defaultdict
from typing import Any, Dict, List, Optional


def analyze_rule_impact(
    explanations: List[Dict[str, Any]],
    comparison:   Dict[str, Any],
    top_n:        Optional[int] = 5,
) -> Dict[str, Any]:
    """
    Aggregate row-level explanations into per-rule impact metrics.

    Args:
        explanations: Output of generate_row_level_explanations().
        comparison:   Output of compare_policy_results().
        top_n:        Number of top rules to surface (None = return all).

    Returns:
        {
            "rule_impact": [
                {
                    "rule":                str,
                    "new_violations":      int,
                    "resolved_violations": int,
                    "net_impact":          int,
                    "impact_percent":      float
                }
            ],
            "total_rules_evaluated": int,
            "total_new_violations":  int
        }
    """
    # O(n) — single pass over explanations
    new_counts:      Dict[str, int] = defaultdict(int)
    resolved_counts: Dict[str, int] = defaultdict(int)

    for exp in explanations:
        change_type     = exp.get("change_type")
        triggered_rules = exp.get("triggered_rules", [])

        if change_type == "new_violation":
            for rule in triggered_rules:
                new_counts[rule] += 1
        elif change_type == "resolved_violation":
            for rule in triggered_rules:
                resolved_counts[rule] += 1

    # Union of all rules seen across both change types
    all_rules = set(new_counts.keys()) | set(resolved_counts.keys())

    total_new_violations = comparison.get("counts", {}).get("new_violations", 0)
    denominator = total_new_violations if total_new_violations > 0 else 1

    rule_impact = []
    for rule in all_rules:
        new_v      = new_counts[rule]
        resolved_v = resolved_counts[rule]
        net        = new_v - resolved_v
        impact_pct = round((new_v / denominator) * 100, 2)

        rule_impact.append({
            "rule":                rule,
            "new_violations":      new_v,
            "resolved_violations": resolved_v,
            "net_impact":          net,
            "impact_percent":      impact_pct,
        })

    # Sort: net_impact desc, then new_violations desc
    rule_impact.sort(key=lambda x: (-x["net_impact"], -x["new_violations"]))

    return {
        "rule_impact":            rule_impact[:top_n] if top_n else rule_impact,
        "total_rules_evaluated":  len(all_rules),
        "total_new_violations":   total_new_violations,
    }


# ── Policy recommendation ─────────────────────────────────────────────────────

def generate_policy_recommendation(
    comparison:      Dict[str, Any],
    impact_analysis: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Produce a structured, deterministic policy recommendation.
    No LLM — all logic is rule-based on computed metrics.

    Args:
        comparison:      Output of compare_policy_results().
        impact_analysis: Output of analyze_rule_impact().

    Returns:
        {
            "policy_type":  "stricter" | "lenient" | "neutral",
            "risk_level":   "high" | "medium" | "low",
            "key_drivers":  [{"rule": str, "impact_percent": float}],
            "recommendation": str,
            "reasoning":    str
        }
    """
    summary     = comparison.get("summary", {})
    delta       = summary.get("delta", 0)
    pct_change  = summary.get("percent_change", 0.0)
    impact_ratio = summary.get("impact_ratio", 0.0)
    rule_impact = impact_analysis.get("rule_impact", [])

    # ── 1. Policy type ────────────────────────────────────────────────────────
    if delta > 0:
        policy_type = "stricter"
    elif delta < 0:
        policy_type = "lenient"
    else:
        policy_type = "neutral"

    # ── 2. Risk level ─────────────────────────────────────────────────────────
    if policy_type == "stricter":
        if pct_change > 50 or impact_ratio > 20:
            risk_level = "high"
        elif pct_change > 20 or impact_ratio > 10:
            risk_level = "medium"
        else:
            risk_level = "low"
    elif policy_type == "lenient":
        # Reducing enforcement always carries at least medium risk
        risk_level = "high" if abs(pct_change) > 30 else "medium"
    else:
        risk_level = "low"

    # ── 3. Key drivers (top 3 rules by impact_percent) ────────────────────────
    key_drivers = [
        {"rule": r["rule"], "impact_percent": r["impact_percent"]}
        for r in rule_impact[:3]
    ]

    top_rule_pct = key_drivers[0]["impact_percent"] if key_drivers else 0.0
    concentrated = top_rule_pct > 50
    num_drivers  = len(key_drivers)

    # ── 4. Recommendation + reasoning ────────────────────────────────────────
    if policy_type == "stricter":
        if concentrated and num_drivers >= 1:
            top_rule = key_drivers[0]["rule"]
            recommendation = (
                f"Review the threshold in rule '{top_rule}' before deploying — "
                f"it alone drives {top_rule_pct}% of new violations."
            )
            reasoning = (
                f"Policy introduces {delta} additional violation(s) (+{pct_change}%). "
                f"Impact is highly concentrated: '{top_rule}' accounts for "
                f"{top_rule_pct}% of newly flagged rows."
            )
        else:
            rules_str = "; ".join(d["rule"] for d in key_drivers) or "multiple rules"
            recommendation = (
                "Policy broadly tightens multiple conditions. "
                "Validate each rule threshold against business tolerance before rollout."
            )
            reasoning = (
                f"Policy introduces {delta} additional violation(s) (+{pct_change}%). "
                f"Impact is distributed across {num_drivers} rule(s): {rules_str}."
            )

    elif policy_type == "lenient":
        recommendation = (
            "Policy reduces enforcement. Ensure relaxed thresholds are intentional "
            "and do not expose the organisation to unacceptable compliance risk."
        )
        reasoning = (
            f"Policy resolves {abs(delta)} violation(s) ({pct_change}% change). "
            "Reduced enforcement may increase regulatory exposure."
        )

    else:  # neutral
        recommendation = "Policy change has no net impact on violation count. Safe to deploy."
        reasoning      = "Delta is zero — no rows changed compliance status."

    return {
        "policy_type":    policy_type,
        "risk_level":     risk_level,
        "key_drivers":    key_drivers,
        "recommendation": recommendation,
        "reasoning":      reasoning,
    }
