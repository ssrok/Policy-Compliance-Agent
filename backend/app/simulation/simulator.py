import pandas as pd
from typing import List, Dict, Any
from app.rule_engine.orchestrator import run_compliance_check
from app.rule_engine.rule_parser import parse_rule
from app.violation_engine.enricher import enrich_violations


# Default rule set used for demo session
DEMO_RULES = [
    "transaction_amount > 1000000",
    "previous_flag_count > 3",
]

# Default mappings for demo dataset columns
DEMO_MAPPINGS = [
    {"rule_field": "transaction_amount",  "mapped_column": "transaction_amount"},
    {"rule_field": "previous_flag_count", "mapped_column": "previous_flag_count"},
    {"rule_field": "is_international",    "mapped_column": "is_international"},
    {"rule_field": "kyc_risk_level",      "mapped_column": "kyc_risk_level"},
]


def _df_to_dataset(df: pd.DataFrame) -> Dict[str, Any]:
    return {
        "dataset_id": "demo_session",
        "columns": df.columns.tolist(),
        "rows": df.to_dict(orient="records"),
    }


def _count_violations(result: Dict[str, Any]) -> int:
    total = 0
    for rr in result.get("rule_results", []):
        total += len(rr.get("violations", []))
    return total


def _get_violated_rows(result: Dict[str, Any]) -> set:
    rows = set()
    for rr in result.get("rule_results", []):
        for v in rr.get("violations", []):
            rows.add(v.get("row_index"))
    return rows


def simulate_rule(
    df: pd.DataFrame,
    existing_rules: List[str],
    new_rule: str,
    mappings: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Adds a new rule on top of existing rules and compares violation counts.
    """
    dataset = _df_to_dataset(df)

    old_result = run_compliance_check(dataset, existing_rules, mappings)
    old_count  = _count_violations(old_result)
    old_rows   = _get_violated_rows(old_result)

    updated_rules = existing_rules + [new_rule]
    new_result = run_compliance_check(dataset, updated_rules, mappings)
    new_count  = _count_violations(new_result)
    new_rows   = _get_violated_rows(new_result)

    increase_pct = (
        ((new_count - old_count) / max(1, old_count)) * 100
        if old_count > 0 else 100.0
    )

    newly_flagged = new_rows - old_rows

    return {
        "old_violations":     old_count,
        "new_violations":     new_count,
        "increase_percent":   round(increase_pct, 1),
        "newly_flagged_rows": len(newly_flagged),
        "total_rows":         len(df),
        "new_rule_applied":   new_rule,
        "old_compliance_rate": old_result["summary"]["compliance_rate"],
        "new_compliance_rate": new_result["summary"]["compliance_rate"],
    }


def simulate_rule_change(
    df: pd.DataFrame,
    existing_rules: List[str],
    rule_index: int,
    new_value: float,
    mappings: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Time Machine: modifies the value of an existing rule at rule_index,
    re-runs compliance, and returns a before/after comparison.

    Example: rule 'transaction_amount > 1000000' with new_value=800000
             becomes 'transaction_amount > 800000'
    """
    if rule_index < 0 or rule_index >= len(existing_rules):
        raise ValueError(f"rule_index {rule_index} out of range (0-{len(existing_rules)-1})")

    original_rule = existing_rules[rule_index]
    parsed        = parse_rule(original_rule)
    field         = parsed["field"]
    operator      = parsed["operator"]
    modified_rule = f"{field} {operator} {new_value}"

    # Build modified rule list
    modified_rules = list(existing_rules)
    modified_rules[rule_index] = modified_rule

    dataset = _df_to_dataset(df)

    # Before
    before_result = run_compliance_check(dataset, existing_rules, mappings)
    before_count  = _count_violations(before_result)
    before_rows   = _get_violated_rows(before_result)
    before_enriched = enrich_violations(before_result["rule_results"])

    # After
    after_result  = run_compliance_check(dataset, modified_rules, mappings)
    after_count   = _count_violations(after_result)
    after_rows    = _get_violated_rows(after_result)
    after_enriched = enrich_violations(after_result["rule_results"])

    delta         = after_count - before_count
    delta_pct     = round((delta / max(1, before_count)) * 100, 1)
    newly_flagged = after_rows - before_rows
    newly_cleared = before_rows - after_rows

    # Severity breakdown after change
    severity_after = {"high": 0, "medium": 0, "low": 0}
    for v in after_enriched:
        sev = v.severity.lower()
        if sev in severity_after:
            severity_after[sev] += 1

    return {
        "original_rule":          original_rule,
        "modified_rule":          modified_rule,
        "rule_index":             rule_index,
        "before": {
            "violations":         before_count,
            "compliance_rate":    before_result["summary"]["compliance_rate"],
            "total_rows":         len(df),
        },
        "after": {
            "violations":         after_count,
            "compliance_rate":    after_result["summary"]["compliance_rate"],
            "total_rows":         len(df),
        },
        "delta": {
            "violation_change":   delta,
            "percent_change":     delta_pct,
            "newly_flagged_rows": len(newly_flagged),
            "newly_cleared_rows": len(newly_cleared),
            "direction":          "stricter" if delta > 0 else "relaxed" if delta < 0 else "no_change",
        },
        "severity_breakdown":     severity_after,
    }


def get_dataset_stats(df: pd.DataFrame) -> Dict[str, Any]:
    amount_col = "transaction_amount" if "transaction_amount" in df.columns else "amount"
    stats: Dict[str, Any] = {
        "total_rows": len(df),
        "avg_amount": 0.0,
        "max_amount": 0.0,
        "min_amount": 0.0,
        "std_amount": 0.0,
    }
    if amount_col in df.columns:
        stats["avg_amount"] = round(float(df[amount_col].mean()), 2)
        stats["max_amount"] = round(float(df[amount_col].max()), 2)
        stats["min_amount"] = round(float(df[amount_col].min()), 2)
        stats["std_amount"] = round(float(df[amount_col].std()), 2)
    if "kyc_risk_level" in df.columns:
        stats["high_risk_percent"] = round((df["kyc_risk_level"] == "high").sum() / len(df) * 100, 1)
    else:
        stats["high_risk_percent"] = 0.0
    if "is_international" in df.columns:
        stats["international_percent"] = round(df["is_international"].sum() / len(df) * 100, 1)
    else:
        stats["international_percent"] = 0.0
    if "previous_flag_count" in df.columns:
        stats["avg_flag_count"] = round(float(df["previous_flag_count"].mean()), 2)
    else:
        stats["avg_flag_count"] = 0.0
    return stats
