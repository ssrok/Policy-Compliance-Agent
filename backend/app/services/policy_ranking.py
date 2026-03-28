"""
policy_ranking.py
-----------------
Compares up to 3 policy scenarios and ranks them by a deterministic
scoring model based on impact, risk, and rule concentration.

No LLM. No rule re-evaluation. O(n) over policies and their rule lists.
"""

from typing import Any, Dict, List


# ── Scoring constants ─────────────────────────────────────────────────────────

_RISK_PENALTY   = {"high": -3, "medium": -2, "low": -1}
_STABILITY_LOW  = -10.0
_STABILITY_HIGH =  10.0
_STABILITY_BONUS = 2
_CONCENTRATION_HIGH_THRESHOLD   = 50.0
_CONCENTRATION_MEDIUM_THRESHOLD = 30.0


def _score_policy(
    delta:            int,
    percent_change:   float,
    risk_level:       str,
    top_impact_pct:   float,
) -> float:
    """Compute a single numeric score for one policy. Higher = better."""
    delta_score          = -abs(delta)
    risk_penalty         = _RISK_PENALTY.get(risk_level, -2)
    stability_bonus      = _STABILITY_BONUS if _STABILITY_LOW <= percent_change <= _STABILITY_HIGH else 0
    concentration_penalty = (
        -2 if top_impact_pct > _CONCENTRATION_HIGH_THRESHOLD else
        -1 if top_impact_pct > _CONCENTRATION_MEDIUM_THRESHOLD else
         0
    )
    return delta_score + risk_penalty + concentration_penalty + stability_bonus


def rank_policies(policies: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Rank up to 3 policy scenarios by computed score.

    Args:
        policies: List of dicts, each containing:
            - policy_id:      str
            - comparison:     compare_policy_results() output
            - impact_analysis: analyze_rule_impact() output
            - recommendation: generate_policy_recommendation() output

    Returns:
        {
            "ranked_policies": [
                {
                    "policy_id":    str,
                    "rank":         int,
                    "score":        float,
                    "summary":      {"delta", "percent_change", "risk_level"},
                    "key_driver":   {"rule", "impact_percent"} | None
                }
            ],
            "best_policy": {
                "policy_id": str,
                "reason":    str
            }
        }
    """
    if not policies:
        return {"ranked_policies": [], "best_policy": None}

    scored: List[Dict[str, Any]] = []

    for policy in policies[:3]:  # cap at 3
        policy_id    = policy.get("policy_id", "unknown")
        summary      = policy.get("comparison", {}).get("summary", {})
        rule_impact  = policy.get("impact_analysis", {}).get("rule_impact", [])
        rec          = policy.get("recommendation", {})

        delta          = summary.get("delta", 0)
        percent_change = summary.get("percent_change", 0.0)
        risk_level     = rec.get("risk_level", "medium")

        # Top rule by impact_percent — O(r) where r = rules in this policy
        top_rule = max(rule_impact, key=lambda r: r.get("impact_percent", 0.0), default=None)
        top_impact_pct = top_rule["impact_percent"] if top_rule else 0.0

        score = _score_policy(delta, percent_change, risk_level, top_impact_pct)

        scored.append({
            "policy_id":    policy_id,
            "score":        score,
            "delta":        delta,
            "percent_change": percent_change,
            "risk_level":   risk_level,
            "top_rule":     top_rule,
            "top_impact_pct": top_impact_pct,
        })

    # Sort: score desc, then abs(delta) asc as tiebreaker
    scored.sort(key=lambda x: (-x["score"], abs(x["delta"])))

    ranked_policies = []
    for rank, p in enumerate(scored, start=1):
        key_driver = (
            {"rule": p["top_rule"]["rule"], "impact_percent": p["top_impact_pct"]}
            if p["top_rule"] else None
        )
        ranked_policies.append({
            "policy_id": p["policy_id"],
            "rank":      rank,
            "score":     p["score"],
            "summary": {
                "delta":          p["delta"],
                "percent_change": p["percent_change"],
                "risk_level":     p["risk_level"],
            },
            "key_driver": key_driver,
        })

    # ── Best policy reason ────────────────────────────────────────────────────
    best        = scored[0]
    best_id     = best["policy_id"]
    concentrated = best["top_impact_pct"] > _CONCENTRATION_HIGH_THRESHOLD
    distribution = "concentrated in a single rule" if concentrated else "distributed across multiple rules"
    delta_sign   = f"+{best['delta']}" if best["delta"] >= 0 else str(best["delta"])

    reason = (
        f"Policy {best_id} is preferred because it maintains a violation delta of "
        f"{delta_sign}, has {best['risk_level']} risk, and impact is {distribution}."
    )

    return {
        "ranked_policies": ranked_policies,
        "best_policy": {
            "policy_id": best_id,
            "reason":    reason,
        },
    }
