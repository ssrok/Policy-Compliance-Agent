"""
explainability_engine/explainer.py
------------------------------------
Module 8 — Generates human-readable explanations for each violation.

Default implementation is template-based (no LLM, no model training).
Designed to be pluggable — swap generate_explanation() for an LLM call
without changing any other module.

Usage:
    from app.explainability_engine.explainer import attach_explanations

    violations_with_explanations = attach_explanations(enriched_violations)
"""

from typing import Any, List
from app.violation_engine.models import EnrichedViolation


# ---------------------------------------------------------------------------
# Operator → plain English map
# ---------------------------------------------------------------------------
_OPERATOR_LABELS = {
    ">":  "greater than",
    "<":  "less than",
    ">=": "greater than or equal to",
    "<=": "less than or equal to",
    "==": "equal to",
    "!=": "not equal to",
}


def generate_explanation(rule: str, column: str, value: Any, expected: str) -> str:
    """
    Generates a plain-English explanation for a single violation.

    Template-based — no external dependencies.
    Pluggable: replace this function body with an LLM call if needed.

    Args:
        rule:     The full rule string e.g. "amount > 10000"
        column:   The dataset column that was evaluated e.g. "txn_value"
        value:    The actual value found in the row e.g. 500
        expected: The expected condition string e.g. "> 10000"

    Returns:
        A human-readable explanation string.

    Example:
        "Column 'txn_value' has value 500, which violates the rule
         requiring values greater than 10000."
    """
    # Parse operator from expected string (e.g. "> 10000" → operator=">", threshold="10000")
    parts = expected.strip().split(" ", 1)
    operator  = parts[0] if parts else ""
    threshold = parts[1] if len(parts) > 1 else ""

    op_label = _OPERATOR_LABELS.get(operator, f"satisfying '{operator}'")

    return (
        f"Column '{column}' has value {value}, which violates the policy rule "
        f"'{rule}' requiring values {op_label} {threshold}."
    )


def attach_explanations(violations: List[EnrichedViolation]) -> List[EnrichedViolation]:
    """
    Attaches a plain-English explanation to each EnrichedViolation.

    Args:
        violations: List of EnrichedViolation objects from Module 7.

    Returns:
        The same list with the 'explanation' field populated on each item.
    """
    for v in violations:
        v.explanation = generate_explanation(
            rule     = v.rule,
            column   = v.column,
            value    = v.value,
            expected = v.expected,
        )
    return violations
