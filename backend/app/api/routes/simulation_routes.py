from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from typing import List

from app.state.store import get_dataset, has_dataset
from app.simulation.simulator import simulate_rule_change, simulate_rule, get_dataset_stats, DEMO_RULES, DEMO_MAPPINGS
from app.rule_engine.rule_parser import parse_rule
from app.violation_engine.enricher import enrich_violations

router = APIRouter()


class RuleChangeRequest(BaseModel):
    session_id: str = "demo_session"
    rule_index: int
    new_value: float


class AddRuleRequest(BaseModel):
    session_id: str = "demo_session"
    new_rule: str


class FreeformRuleRequest(BaseModel):
    session_id: str = "demo_session"
    rule: str


@router.get("/rules")
def get_current_rules(session_id: str = "demo_session"):
    """Returns the current active demo rules with parsed metadata."""
    from app.rule_engine.rule_parser import parse_rule
    rules = []
    for i, r in enumerate(DEMO_RULES):
        try:
            parsed = parse_rule(r)
            rules.append({
                "index":    i,
                "rule":     r,
                "field":    parsed["field"],
                "operator": parsed["operator"],
                "value":    parsed["value"],
            })
        except Exception:
            rules.append({"index": i, "rule": r, "field": None, "operator": None, "value": None})
    return {"rules": rules, "total": len(rules)}


@router.get("/stats")
def get_stats(session_id: str = "demo_session"):
    """Returns dataset statistics for the simulation context panel."""
    if not has_dataset(session_id):
        raise HTTPException(status_code=404, detail="Dataset not found. Restart server to load demo data.")
    df = get_dataset(session_id)
    return get_dataset_stats(df)


@router.post("/time-machine")
async def time_machine(request: RuleChangeRequest):
    """
    Time Machine: modify an existing rule's threshold value and compare
    compliance results before and after the change.
    """
    if not has_dataset(request.session_id):
        raise HTTPException(status_code=404, detail="Dataset not found.")

    df = get_dataset(request.session_id)

    try:
        result = await run_in_threadpool(
            simulate_rule_change,
            df,
            DEMO_RULES,
            request.rule_index,
            request.new_value,
            DEMO_MAPPINGS,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")


@router.post("/freeform")
async def freeform_simulation(request: FreeformRuleRequest):
    """
    Freeform simulation: user provides any rule string like 'transaction_amount > 500000'.
    Runs compliance with existing rules vs existing rules + new rule, returns full diff.
    """
    if not has_dataset(request.session_id):
        raise HTTPException(status_code=404, detail="Dataset not found. Restart server to load demo data.")

    # Validate rule can be parsed
    try:
        parsed = parse_rule(request.rule)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid rule format: {str(e)}. Use: field operator value (e.g. transaction_amount > 500000)")

    df = get_dataset(request.session_id)

    try:
        from app.rule_engine.orchestrator import run_compliance_check

        def _run():
            dataset = {
                "dataset_id": request.session_id,
                "columns": df.columns.tolist(),
                "rows": df.to_dict(orient="records"),
            }

            # Before: existing rules only
            before_result = run_compliance_check(dataset, DEMO_RULES, DEMO_MAPPINGS)
            before_violations = sum(len(rr.get("violations", [])) for rr in before_result.get("rule_results", []))
            before_rows = set()
            for rr in before_result.get("rule_results", []):
                for v in rr.get("violations", []):
                    before_rows.add(v.get("row_index"))

            # After: existing rules + new rule
            # Add mapping for the new rule field if not already present
            new_field = parsed["field"]
            mappings = list(DEMO_MAPPINGS)
            if not any(m["rule_field"] == new_field for m in mappings):
                mappings.append({"rule_field": new_field, "mapped_column": new_field})

            after_rules = DEMO_RULES + [request.rule]
            after_result = run_compliance_check(dataset, after_rules, mappings)
            after_violations = sum(len(rr.get("violations", [])) for rr in after_result.get("rule_results", []))
            after_rows = set()
            for rr in after_result.get("rule_results", []):
                for v in rr.get("violations", []):
                    after_rows.add(v.get("row_index"))

            enriched = enrich_violations(after_result["rule_results"])
            severity = {"high": 0, "medium": 0, "low": 0}
            for v in enriched:
                sev = v.severity.lower()
                if sev in severity:
                    severity[sev] += 1

            delta = after_violations - before_violations
            delta_pct = round((delta / max(1, before_violations)) * 100, 1)
            newly_flagged = after_rows - before_rows
            newly_cleared = before_rows - after_rows

            return {
                "original_rules": DEMO_RULES,
                "new_rule": request.rule,
                "before": {
                    "violations": before_violations,
                    "compliance_rate": before_result["summary"]["compliance_rate"],
                    "total_rows": len(df),
                },
                "after": {
                    "violations": after_violations,
                    "compliance_rate": after_result["summary"]["compliance_rate"],
                    "total_rows": len(df),
                },
                "delta": {
                    "violation_change": delta,
                    "percent_change": delta_pct,
                    "newly_flagged_rows": len(newly_flagged),
                    "newly_cleared_rows": len(newly_cleared),
                    "direction": "stricter" if delta > 0 else "relaxed" if delta < 0 else "no_change",
                },
                "severity_breakdown": severity,
            }

        result = await run_in_threadpool(_run)
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")
