"""
policy_simulator.py
-------------------
Thin simulation layer that feeds a DataFrame and a list of rule strings
directly into the existing rule engine, bypassing the schema-mapping step
by auto-mapping each rule's field to the closest matching column name.
"""

from typing import Any, Dict, List

import pandas as pd

from app.rule_engine.rule_parser import parse_rule
from app.rule_engine.execution_engine import execute_rule
from app.rule_engine.summary import generate_summary


def simulate(df: pd.DataFrame, rules: List[str]) -> Dict[str, Any]:
    """
    Run the existing rule engine against a DataFrame.

    Args:
        df:    The dataset as a pandas DataFrame.
        rules: List of rule strings, e.g. ["amount > 1000", "status == 'ACTIVE'"].

    Returns:
        {
            "total_rows":      int,
            "violations":      int,
            "compliance_rate": float,
            "violation_rows":  list[dict]   # each entry: {row_index, rule, value}
        }
    """
    if df is None or df.empty:
        return {
            "total_rows": 0,
            "violations": 0,
            "compliance_rate": 0.0,
            "violation_rows": [],
        }

    rows        = df.to_dict(orient="records")
    columns     = set(df.columns.tolist())
    unique_violated: set = set()
    all_violation_rows: List[Dict[str, Any]] = []
    skipped_rules: List[str] = []
    rule_impact: Dict[str, List[int]] = {}

    for rule_str in rules:
        try:
            parsed = parse_rule(rule_str)
        except ValueError:
            skipped_rules.append(rule_str)
            continue

        field = parsed.get("field", "")
        if field not in columns:
            skipped_rules.append(rule_str)
            continue

        result = execute_rule(parsed, mapped_column=field, dataset_rows=rows)
        rule_impact[rule_str] = []

        for v in result.get("violations", []):
            idx = v.get("row_index")
            unique_violated.add(idx)
            rule_impact[rule_str].append(idx)
            all_violation_rows.append({
                "row_index": idx,
                "rule":      rule_str,
                "value":     v.get("value"),
            })

    summary = generate_summary(len(rows), len(unique_violated))

    row_status = {
        i: ("violation" if i in unique_violated else "compliant")
        for i in range(len(rows))
    }

    return {
        "total_rows":      summary["total_rows"],
        "violations":      summary["violations"],
        "compliance_rate": summary["compliance_rate"],
        "violation_rows":  all_violation_rows,
        "row_status":      row_status,
        "rule_impact":     rule_impact,
        "skipped_rules":   skipped_rules,
    }
