from pydantic import BaseModel
from datetime import datetime
from typing import Any, Dict, List, Optional

class PolicyUploadResponse(BaseModel):
    file_id: str
    filename: str

class PolicyProcessResponse(BaseModel):
    file_id: str
    num_clauses: int
    clauses: List[str]

class PolicyDetail(BaseModel):
    file_id: str
    filename: str
    status: str
    num_clauses: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class PolicyListResponse(BaseModel):
    policies: List[PolicyDetail]


# ── Policy analysis ───────────────────────────────────────────────────────────

class PolicyScenario(BaseModel):
    policy_id: str
    rules: List[str]


class PolicyAnalyzeRequest(BaseModel):
    dataset_id: str
    baseline_rules: List[str]
    new_policies: List[PolicyScenario]

    class Config:
        json_schema_extra = {
            "example": {
                "dataset_id": "<uuid>",
                "baseline_rules": ["amount > 1000"],
                "new_policies": [
                    {"policy_id": "P1", "rules": ["amount > 500"]},
                    {"policy_id": "P2", "rules": ["status == 'ACTIVE'"]},
                ],
            }
        }


class PolicySummary(BaseModel):
    total_policies: int
    best_policy_id: str


class PolicyAnalyzeResponse(BaseModel):
    baseline: Dict[str, Any]
    policies: List[Dict[str, Any]]
    ranking: Dict[str, Any]
    summary: PolicySummary
