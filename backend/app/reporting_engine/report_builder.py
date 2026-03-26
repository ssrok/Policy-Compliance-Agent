"""
reporting_engine/report_builder.py
------------------------------------
Module 9 — Builds the final structured report for the frontend/dashboard.

Combines:
  - Summary from execution engine
  - Enriched + explained violations from Modules 7 & 8
  - Severity metrics aggregation
  - Chart-ready data

Output shape:
{
    "summary":    { total_rows, violations, compliance_rate },
    "violations": [ EnrichedViolation... ],
    "metrics":    { high, medium, low },
    "chart_data": { labels, values }
}
"""

from typing import Any, Dict, List
from app.violation_engine.models import EnrichedViolation


def _aggregate_metrics(violations: List[EnrichedViolation]) -> Dict[str, int]:
    """Counts violations grouped by severity."""
    counts = {"high": 0, "medium": 0, "low": 0}
    for v in violations:
        severity = v.severity.lower()
        if severity in counts:
            counts[severity] += 1
    return counts


def build_report(
    summary: Dict[str, Any],
    violations: List[EnrichedViolation]
) -> Dict[str, Any]:
    """
    Assembles the final compliance report.

    Args:
        summary:    The summary dict from run_compliance_check()
                    { total_rows, violations, compliance_rate }
        violations: Enriched + explained violations from Modules 7 & 8.

    Returns:
        Final report dict ready to be returned as a JSON API response.
    """
    metrics = _aggregate_metrics(violations)

    chart_data = {
        "labels": ["high", "medium", "low"],
        "values": [metrics["high"], metrics["medium"], metrics["low"]]
    }

    return {
        "summary":    summary,
        "violations": [v.model_dump() for v in violations],
        "metrics":    metrics,
        "chart_data": chart_data,
    }
