import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.rule import RuleExtractionRequest, RuleExtractionResponse, RuleResponse
from app.services.llm_extractor import extract_rules_from_clauses
from app.services.rule_service import save_rules, get_rules_by_file, get_all_rules

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/extract", response_model=RuleExtractionResponse)
async def extract_rules(payload: RuleExtractionRequest, db: Session = Depends(get_db)):
    """
    Module 2 + 3 combined endpoint.
    Accepts file_id + clauses (output of /policy/process).
    Runs LLM extraction on each clause, then saves structured rules to DB.
    """
    if not payload.clauses:
        raise HTTPException(status_code=400, detail="No clauses provided")

    logger.info(f"Starting rule extraction for file_id={payload.file_id}, clauses={len(payload.clauses)}")

    # Module 2: LLM extraction (blocking — run in threadpool)
    extracted = await run_in_threadpool(extract_rules_from_clauses, payload.clauses)

    if not extracted:
        raise HTTPException(status_code=422, detail="LLM could not extract any rules from the provided clauses")

    # Module 3: Save to DB
    saved_rules = await run_in_threadpool(save_rules, db, payload.file_id, extracted)

    return RuleExtractionResponse(
        file_id=payload.file_id,
        total_rules=len(saved_rules),
        rules=saved_rules
    )


@router.get("/file/{file_id}", response_model=list[RuleResponse])
def get_rules_for_file(file_id: str, db: Session = Depends(get_db)):
    """Get all extracted rules for a specific policy file."""
    rules = get_rules_by_file(db, file_id)
    if not rules:
        raise HTTPException(status_code=404, detail=f"No rules found for file_id={file_id}")
    return rules


@router.get("/", response_model=list[RuleResponse])
def list_all_rules(db: Session = Depends(get_db)):
    """Get all rules across all policy files."""
    return get_all_rules(db)
