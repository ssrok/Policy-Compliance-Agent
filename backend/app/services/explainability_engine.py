"""
explainability_engine.py
------------------------
Produces structured, data-grounded, LLM-ready row-level explanations
for compliance changes between a baseline and a scenario simulation run.

Anti-hallucination principle:
  All fields are derived exclusively from pre-computed simulation outputs.
  No inference, no pattern detection, no generated text beyond templates.
"""

from collections import defaultdict
from typing import Any, Dict, List


# ── Utility ───────────────────────────────────────────────────────────────────

def invert_rule_impact(
    rule_impact: Dict[str, List[int]],
) -> Dict[int, List[str]]:
    """
    Invert {rule: [row_indices]} → {row_index: [rules]}.
    O(V), uses sets to prevent duplicate rules per row.
    """
    inverted: Dict[int, set] = defaultdict(set)
    for rule, indices in rule_impact.items():
        for idx in indices:
            inverted[idx].add(rule)
    return {idx: list(rules) for idx, rules in inverted.items()}


def _build_value_lookup(
    violation_rows: List[Dict[str, Any]],
) -> Dict[int, Dict[str, Any]]:
    """
    Build {row_index: {rule: value}} from violation_rows.
    O(V) — one pass, first value per (row, rule) pair wins.
    """
    lookup: Dict[int, Dict[str, Any]] = defaultdict(dict)
    for entry in violation_rows:
        idx  = entry.get("row_index")
        rule = entry.get("rule")
        val  = entry.get("value")
        if idx is not None and rule and rule not in lookup[idx]:
            lookup[idx][rule] = val
    return dict(lookup)


# ── Core explainability ───────────────────────────────────────────────────────

def generate_row_level_explanations(
    baseline:   Dict[str, Any],
    scenario:   Dict[str, Any],
    comparison: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """
    Explain why each row changed between baseline and scenario.

    Returns a list of structured, data-backed explanation dicts.
    All values are sourced from pre-computed simulation outputs only.
    """
    new_violations      = comparison["details"]["new_violations"]
    resolved_violations = comparison["details"]["resolved_violations"]

    # Compute all lookups once — O(V) each
    scenario_row_to_rules = invert_rule_impact(scenario.get("rule_impact", {}))
    baseline_row_to_rules = invert_rule_impact(baseline.get("rule_impact", {}))
    scenario_values       = _build_value_lookup(scenario.get("violation_rows", []))
    baseline_values       = _build_value_lookup(baseline.get("violation_rows", []))

    explanations: List[Dict[str, Any]] = []

    # ── New violations ────────────────────────────────────────────────────────
    for idx in new_violations:
        triggered_rules = scenario_row_to_rules.get(idx, [])
        rule_values     = scenario_values.get(idx, {})

        triggered_values = [
            {"rule": rule, "value": rule_values.get(rule)}
            for rule in triggered_rules
        ]

        # Anchor explanation to first concrete value available
        anchor = next(
            (tv for tv in triggered_values if tv["value"] is not None),
            triggered_values[0] if triggered_values else None,
        )

        if anchor:
            explanation = (
                f"Row {idx} became non-compliant because it violates "
                f"{len(triggered_rules)} rule(s): {', '.join(triggered_rules)}. "
                f"For example, value {anchor['value']} failed condition {anchor['rule']}."
            )
        else:
            explanation = (
                f"Row {idx} became non-compliant because it violates "
                f"{len(triggered_rules)} rule(s): {', '.join(triggered_rules)}."
            )

        explanations.append({
            "row_index":       idx,
            "change_type":     "new_violation",
            "triggered_rules": triggered_rules,
            "details": {
                "previous_status":  "compliant",
                "current_status":   "violation",
                "triggered_values": triggered_values,
            },
            "explanation":          explanation,
            "confidence":           "high",
            "explanation_metadata": {
                "num_rules_triggered": len(triggered_rules),
                "has_multiple_rules":  len(triggered_rules) > 1,
            },
        })

    # ── Resolved violations ───────────────────────────────────────────────────
    for idx in resolved_violations:
        triggered_rules = baseline_row_to_rules.get(idx, [])
        rule_values     = baseline_values.get(idx, {})

        triggered_values = [
            {"rule": rule, "value": rule_values.get(rule)}
            for rule in triggered_rules
        ]

        explanation = (
            f"Row {idx} is now compliant because it no longer violates "
            f"previous rule(s): {', '.join(triggered_rules)}."
            if triggered_rules else
            f"Row {idx} is now compliant."
        )

        explanations.append({
            "row_index":       idx,
            "change_type":     "resolved_violation",
            "triggered_rules": triggered_rules,
            "details": {
                "previous_status":  "violation",
                "current_status":   "compliant",
                "triggered_values": triggered_values,
            },
            "explanation":          explanation,
            "confidence":           "high",
            "explanation_metadata": {
                "num_rules_triggered": len(triggered_rules),
                "has_multiple_rules":  len(triggered_rules) > 1,
            },
        })

    return explanations


# ── LLM input preparation ─────────────────────────────────────────────────────

def prepare_llm_summary_input(
    explanations:       List[Dict[str, Any]],
    comparison_summary: Dict[str, Any],
    max_samples:        int = 5,
) -> Dict[str, Any]:
    """
    Package pre-computed facts into a structured dict for LLM summarization.

    No text is generated here — only real computed values are included.
    The LLM layer should rephrase, not infer.

    Args:
        explanations:       Output of generate_row_level_explanations().
        comparison_summary: comparison["summary"] from compare_policy_results().
        max_samples:        Max explanation samples to include (default 5).

    Returns:
        LLM-safe input dict with summary, top_rules, and sample_explanations.
    """
    # Aggregate rule impact counts across all explanations
    rule_counts: Dict[str, int] = defaultdict(int)
    for exp in explanations:
        for rule in exp.get("triggered_rules", []):
            rule_counts[rule] += 1

    top_rules = sorted(
        [{"rule": rule, "impact_count": count} for rule, count in rule_counts.items()],
        key=lambda x: x["impact_count"],
        reverse=True,
    )

    # Sample: prefer new_violations first, then resolved
    new_samples = [e for e in explanations if e["change_type"] == "new_violation"]
    resolved_samples = [e for e in explanations if e["change_type"] == "resolved_violation"]
    sample_pool = (new_samples + resolved_samples)[:max_samples]

    sample_explanations = []
    for exp in sample_pool:
        anchor = next(
            (tv for tv in exp["details"]["triggered_values"] if tv["value"] is not None),
            None,
        )
        sample_explanations.append({
            "row_index":   exp["row_index"],
            "change_type": exp["change_type"],
            "rule":        exp["triggered_rules"][0] if exp["triggered_rules"] else None,
            "value":       anchor["value"] if anchor else None,
        })

    return {
        "summary":             comparison_summary,
        "top_rules":           top_rules,
        "sample_explanations": sample_explanations,
    }
