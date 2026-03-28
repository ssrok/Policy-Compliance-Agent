from pydantic import BaseModel
from datetime import datetime

class ExtractedRule(BaseModel):
    """Single rule as returned by the LLM."""
    entity:   str | None = None
    field:    str | None = None
    operator: str | None = None
    value:    float | None = None
    action:   str | None = None
    source_clause: str

class RuleResponse(ExtractedRule):
    """Rule as stored in DB — includes DB-assigned fields."""
    id:         int
    rule_id:    str
    file_id:    str
    created_at: datetime

    class Config:
        from_attributes = True

class RuleExtractionRequest(BaseModel):
    """Request body: pass file_id + clauses from Module 1 output."""
    file_id: str
    clauses: list[str]

class RuleExtractionResponse(BaseModel):
    file_id:     str
    total_rules: int
    rules:       list[RuleResponse]
