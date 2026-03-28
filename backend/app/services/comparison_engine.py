"""
comparison_engine.py
--------------------
Compares two simulate() outputs to identify what changed between
a baseline policy run and a scenario policy run.
"""

from typing import Any, Dict, List


def compare_policy_results(
    baseline: Dict[str, Any],
    scenario: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Diff two simulate() outputs using only their row_status dicts.

    Args:
        baseline: simulate() result representing the current/original policy.
        scenario: simulate() result representing the proposed/changed policy.

    Returns:
        {
            "summary": {
                "baseline_violations": int,
                "scenario_violations": int,
                "delta":               int,
                "percent_change":      float
            },
            "details": {
                "new_violations":      list[int],
                "resolved_violations": list[int],
                "unchanged_violations":list[int],
                "unchanged_compliant": list[int]
            }
        }
    """
    baseline_status: Dict[int, str] = baseline.get("row_status", {})
    scenario_status: Dict[int, str] = scenario.get("row_status", {})

    # Union of all row indices from both runs — O(n)
    all_indices = set(baseline_status.keys()) | set(scenario_status.keys())

    new_violations:       List[int] = []
    resolved_violations:  List[int] = []
    unchanged_violations: List[int] = []
    unchanged_compliant:  List[int] = []

    for idx in all_indices:
        b = baseline_status.get(idx, "compliant")
        s = scenario_status.get(idx, "compliant")

        if b == "compliant" and s == "violation":
            new_violations.append(idx)
        elif b == "violation" and s == "compliant":
            resolved_violations.append(idx)
        elif b == "violation" and s == "violation":
            unchanged_violations.append(idx)
        else:
            unchanged_compliant.append(idx)

    baseline_violations = baseline.get("violations", 0)
    scenario_violations = scenario.get("violations", 0)
    delta               = scenario_violations - baseline_violations
    total_rows          = max(len(all_indices), 1)

    if baseline_violations > 0:
        percent_change = round((delta / baseline_violations) * 100, 2)
    else:
        percent_change = 0.0 if scenario_violations == 0 else 100.0

    impact_ratio = round((len(new_violations) / total_rows) * 100, 2)

    return {
        "summary": {
            "baseline_violations": baseline_violations,
            "scenario_violations": scenario_violations,
            "delta":               delta,
            "percent_change":      percent_change,
            "impact_ratio":        impact_ratio,
            "total_rows":          total_rows,
        },
        "details": {
            "new_violations":       sorted(new_violations),
            "resolved_violations":  sorted(resolved_violations),
            "unchanged_violations": sorted(unchanged_violations),
            "unchanged_compliant":  sorted(unchanged_compliant),
        },
        "counts": {
            "new_violations":       len(new_violations),
            "resolved_violations":  len(resolved_violations),
            "unchanged_violations": len(unchanged_violations),
            "unchanged_compliant":  len(unchanged_compliant),
        },
    }
