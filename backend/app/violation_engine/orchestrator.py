"""
violation_engine/orchestrator.py
---------------------------------
Entry point for Module 7.

Takes the raw output from the compliance execution engine and
returns a list of fully enriched violation objects.

Usage:
    from app.violation_engine.orchestrator import run_violation_engine

    enriched = run_violation_engine(execution_engine_output)
"""

from typing import Any, Dict, List
from app.violation_engine.enricher import enrich_violations
from app.violation_engine.models import EnrichedViolation


def run_violation_engine(execution_output: Dict[str, Any]) -> List[EnrichedViolation]:
    """
    Orchestrates Module 7: transforms raw execution engine output
    into enriched, structured violation objects.

    Args:
        execution_output: Direct output from run_compliance_check()
                          { "summary": {...}, "rule_results": [...] }

    Returns:
        List of EnrichedViolation objects ready for Module 8 + 9.
    """
    rule_results = execution_output.get("rule_results", [])
    return enrich_violations(rule_results)
