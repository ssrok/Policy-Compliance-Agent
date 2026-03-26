"""
api/routes/report_routes.py
----------------------------
POST /api/v1/report/generate

Accepts the raw execution engine output and returns a fully enriched,
explained, and structured compliance report.

Pipeline:
    execution_output
        → Module 7: run_violation_engine()   (enrich violations)
        → Module 8: attach_explanations()    (add plain-English explanations)
        → Module 9: build_report()           (assemble final report)
"""

from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.violation_engine.orchestrator import run_violation_engine
from app.explainability_engine.explainer import attach_explanations
from app.reporting_engine.report_builder import build_report

router = APIRouter()


# ---------------------------------------------------------------------------
# Request contract — mirrors execution engine output shape exactly
# ---------------------------------------------------------------------------

class RawViolation(BaseModel):
    row_index: int
    value: Any

class RuleResult(BaseModel):
    rule: str
    mapped_column: Any          # str or None (skipped rules have None)
    violations: List[RawViolation] = []
    status: str = "executed"    # "executed" | "skipped"
    reason: str = ""

class SummarySchema(BaseModel):
    total_rows: int
    violations: int
    compliance_rate: float

class ExecutionOutputSchema(BaseModel):
    summary: SummarySchema
    rule_results: List[RuleResult]


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@router.post("/generate")
async def generate_report(execution_output: ExecutionOutputSchema):
    """
    Accepts raw compliance execution engine output and returns a fully
    enriched report with violations, explanations, severity metrics,
    and chart-ready data.

    Input:  Output of POST /api/v1/compliance/check
    Output: Structured report for frontend dashboard
    """
    try:
        raw = execution_output.model_dump()

        # Module 7 — enrich raw violations
        enriched = run_violation_engine(raw)

        # Module 8 — attach explanations
        enriched = attach_explanations(enriched)

        # Module 9 — build final report
        report = build_report(raw["summary"], enriched)

        return report

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")
