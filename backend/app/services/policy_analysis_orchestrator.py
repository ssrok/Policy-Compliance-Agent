"""
policy_analysis_orchestrator.py
--------------------------------
End-to-end pipeline for multi-policy simulation, comparison,
explainability, impact analysis, and ranking.
"""

from itertools import combinations
from typing import Any, Dict, List

import pandas as pd

from app.services.policy_simulator import simulate
from app.services.comparison_engine import compare_policy_results
from app.services.explainability_engine import generate_row_level_explanations
from app.services.impact_analysis import analyze_rule_impact, generate_policy_recommendation
from app.services.policy_ranking import rank_policies


def _analyze_policy(
    policy_id: str,
    rules: List[str],
    dataset: pd.DataFrame,
    baseline_result: Dict[str, Any],
) -> Dict[str, Any]:
    """Run the full analysis pipeline for a single policy against the baseline."""
    scenario_result = simulate(dataset, rules)
    comparison      = compare_policy_results(baseline_result, scenario_result)
    explanations    = generate_row_level_explanations(baseline_result, scenario_result, comparison)
    impact          = analyze_rule_impact(explanations, comparison)
    recommendation  = generate_policy_recommendation(comparison, impact)

    return {
        "policy_id":       policy_id,
        "scenario_result": scenario_result,
        "comparison":      comparison,
        "explanations":    explanations,
        "impact_analysis": impact,
        "recommendation":  recommendation,
    }


def run_policy_analysis(
    dataset:        pd.DataFrame,
    baseline_rules: List[str],
    new_policies:   List[Dict[str, Any]],  # max 3
) -> Dict[str, Any]:
    """
    End-to-end multi-policy analysis pipeline.

    Args:
        dataset:        Input DataFrame.
        baseline_rules: Rules representing the current/baseline policy.
        new_policies:   Up to 3 policy dicts, each with 'policy_id' and 'rules'.

    Returns:
        {
            "baseline":  simulate() output,
            "policies":  [...individual + combined policy analyses...],
            "ranking":   rank_policies() output,
            "summary":   {"total_policies": int, "best_policy_id": str}
        }
    """
    if len(new_policies) > 3:
        raise ValueError("Maximum of 3 policies allowed.")

    baseline_result = simulate(dataset, baseline_rules)
    policies_output: List[Dict[str, Any]] = []

    # ── Individual policies ───────────────────────────────────────────────────
    for policy in new_policies:
        policies_output.append(
            _analyze_policy(policy["policy_id"], policy["rules"], dataset, baseline_result)
        )

    # ── Combined policies ─────────────────────────────────────────────────────
    for r in range(2, len(new_policies) + 1):
        for combo in combinations(new_policies, r):
            combined_id    = "+".join(p["policy_id"] for p in combo)
            combined_rules = list({rule for p in combo for rule in p["rules"]})
            policies_output.append(
                _analyze_policy(combined_id, combined_rules, dataset, baseline_result)
            )

    # ── Ranking ───────────────────────────────────────────────────────────────
    ranked      = rank_policies(policies_output)
    best_policy = ranked.get("best_policy") or {}

    return {
        "baseline":  baseline_result,
        "policies":  policies_output,
        "ranking":   ranked,
        "summary": {
            "total_policies":  len(policies_output),
            "best_policy_id":  best_policy.get("policy_id", ""),
        },
    }
