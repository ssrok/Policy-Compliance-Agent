"""
violation_engine/severity.py
-----------------------------
Generic severity classification for policy violations.

Logic:
- Numeric rules: severity based on how far the value deviates from threshold
    > 20% deviation  → high
    > 5%  deviation  → medium
    otherwise        → low
- Non-numeric rules: always "high" (binary — either compliant or not)
"""

from typing import Any


def calculate_severity(value: Any, operator: str, threshold: Any) -> str:
    """
    Classifies violation severity based on the distance between
    the actual value and the rule threshold.

    Args:
        value:     The actual value from the dataset row.
        operator:  The rule operator (e.g. ">", "<=", "==").
        threshold: The rule threshold value.

    Returns:
        "high" | "medium" | "low"
    """
    # Non-numeric values → always high (binary violation)
    try:
        actual    = float(value)
        threshold_f = float(threshold)
    except (TypeError, ValueError):
        return "high"

    # Avoid division by zero
    if threshold_f == 0:
        return "high" if actual != threshold_f else "low"

    deviation = abs(actual - threshold_f) / abs(threshold_f)

    if deviation > 0.20:
        return "high"
    elif deviation > 0.05:
        return "medium"
    else:
        return "low"
