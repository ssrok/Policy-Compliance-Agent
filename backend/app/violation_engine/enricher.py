"""
violation_engine/enricher.py
-----------------------------
Transforms raw violation dicts (from execution engine) into
fully enriched EnrichedViolation objects.

Input (per rule_result):
    {
        "rule": "amount > 10000",
        "mapped_column": "txn_value",
        "violations": [{"row_index": 5, "value": 500}]
    }

Output (per violation):
    EnrichedViolation(...)
"""

import uuid
from typing import Any, Dict, List

from app.rule_engine.rule_parser import parse_rule
from app.violation_engine.models import EnrichedViolation
from app.violation_engine.severity import calculate_severity


def _build_expected(operator: str, threshold: Any) -> str:
    """Builds a human-readable expected condition string."""
    return f"{operator} {threshold}"


def _build_message(value: Any, operator: str, threshold: Any) -> str:
    """Builds a human-readable violation message."""
    return f"Value {value} does not satisfy {operator} {threshold}"


def enrich_violations(rule_results: List[Dict[str, Any]]) -> List[EnrichedViolation]:
    """
    Iterates over all rule results from the execution engine and
    enriches each raw violation into a structured EnrichedViolation.

    Args:
        rule_results: The 'rule_results' list from run_compliance_check() output.

    Returns:
        List of EnrichedViolation objects.
    """
    enriched: List[EnrichedViolation] = []

    for rule_result in rule_results:
        # Skip rules that were skipped by the orchestrator (no column mapping)
        if rule_result.get("status") == "skipped":
            continue

        rule_str    = rule_result.get("rule", "")
        column      = rule_result.get("mapped_column", "")
        raw_violations = rule_result.get("violations", [])

        if not raw_violations:
            continue

        # Parse rule once per rule_result (not per violation)
        try:
            parsed = parse_rule(rule_str)
            operator  = parsed.get("operator", "")
            threshold = parsed.get("value")
        except ValueError:
            operator  = ""
            threshold = None

        for raw in raw_violations:
            row_index = raw.get("row_index", -1)
            value     = raw.get("value")

            enriched.append(EnrichedViolation(
                violation_id = str(uuid.uuid4()),
                rule         = rule_str,
                row_index    = row_index,
                column       = column,
                value        = value,
                expected     = _build_expected(operator, threshold),
                message      = _build_message(value, operator, threshold),
                severity     = calculate_severity(value, operator, threshold),
            ))

    return enriched
