import html
import logging
import pandas as pd
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from app.rule_engine.orchestrator import run_compliance_check
from app.ml.feature_engineering import generate_features
from app.ml.anomaly_detection import AnomalyDetector
from app.ml.risk_scoring import RiskScorer
from app.ml.explainability_engine import ExplainabilityEngine

logger = logging.getLogger(__name__)
router = APIRouter()


class DatasetPayloadSchema(BaseModel):
    dataset_id: str
    columns: List[str]
    rows: List[Dict[str, Any]]

class MappingPayloadSchema(BaseModel):
    rule_field: str
    mapped_column: Any
    confidence: float
    match_type: str

class ComplianceRequest(BaseModel):
    dataset: DatasetPayloadSchema
    rules: List[str]
    mappings: List[MappingPayloadSchema]


def _sanitize_value(v: Any) -> Any:
    """Fix 8: Sanitize violation values to prevent XSS."""
    if isinstance(v, str):
        return html.escape(v)
    return v


def _run_ml_pipeline(rows: list, columns: list, mappings: list, compliance_report: dict) -> dict:
    """
    Fix 5: Feature engineering uses mapped columns from schema mapping.
    Fix 6: Runs in threadpool via run_in_threadpool — does not block event loop.
    """
    risk_summary = {"average_risk_score": 0.0, "high_risk_count": 0, "medium_risk_count": 0, "low_risk_count": 0}
    risk_data    = []
    explanations = []

    try:
        df = pd.DataFrame(rows)
        if df.empty:
            return {"risk_summary": risk_summary, "risk_data": risk_data, "explanations": explanations}

        # Fix 5: Identify numeric columns from actual mapped columns, not hardcoded "amount"
        mapped_cols = [m["mapped_column"] for m in mappings if m.get("mapped_column")]
        numeric_mapped = [c for c in mapped_cols if c in df.columns and pd.api.types.is_numeric_dtype(df[c])]

        # generate_features works on whatever numeric columns exist
        df_features = generate_features(df, numeric_cols=numeric_mapped if numeric_mapped else None)

        detector = AnomalyDetector()
        detector.fit(df_features)
        anomaly_df = detector.predict(df_features)

        all_violations = []
        for rule_res in compliance_report.get("rule_results", []):
            all_violations.extend(rule_res.get("violations", []))

        scorer  = RiskScorer()
        risk_df = scorer.compute_risk(df, all_violations, anomaly_df)

        logger.info(f"ML pipeline: {len(df)} rows, {len(all_violations)} violations")

        explainer    = ExplainabilityEngine()
        explanations = explainer.generate_explanations(df, all_violations, risk_df, anomaly_df)

        for i in range(len(risk_df)):
            risk_data.append({
                "row_index":    i,
                "risk_score":   float(risk_df.iloc[i]["risk_score"]),
                "risk_level":   str(risk_df.iloc[i]["risk_level"]),
                "anomaly_score": float(anomaly_df.iloc[i]["anomaly_score"]),
                "is_anomaly":   int(anomaly_df.iloc[i]["is_anomaly"]),
            })

        risk_summary = {
            "average_risk_score": float(risk_df["risk_score"].mean()),
            "high_risk_count":    int((risk_df["risk_level"] == "HIGH").sum()),
            "medium_risk_count":  int((risk_df["risk_level"] == "MEDIUM").sum()),
            "low_risk_count":     int((risk_df["risk_level"] == "LOW").sum()),
        }

    except Exception as ml_err:
        logger.error(f"ML pipeline failure: {ml_err}")

    return {"risk_summary": risk_summary, "risk_data": risk_data, "explanations": explanations}


@router.post("/check")
async def check_compliance(request: ComplianceRequest):
    try:
        mappings_raw = [m.model_dump() for m in request.mappings]
        dataset_raw  = request.dataset.model_dump()

        # Rule engine runs in threadpool (can be CPU-heavy for large datasets)
        compliance_report = await run_in_threadpool(
            run_compliance_check,
            dataset=dataset_raw,
            rules_list=request.rules,
            mappings=mappings_raw,
        )

        # Fix 6: ML pipeline also runs in threadpool — never blocks the event loop
        ml_results = await run_in_threadpool(
            _run_ml_pipeline,
            request.dataset.rows,
            request.dataset.columns,
            mappings_raw,
            compliance_report,
        )

        # Fix 8: Sanitize all violation values before returning
        for rule_res in compliance_report.get("rule_results", []):
            for v in rule_res.get("violations", []):
                v["value"] = _sanitize_value(v.get("value"))

        return {**compliance_report, **ml_results}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Compliance check engine failure: {str(e)}")
