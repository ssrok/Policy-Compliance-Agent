from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.models.policy import Policy
from app.models.dataset import Dataset
from pydantic import BaseModel

router = APIRouter()

class SessionContextResponse(BaseModel):
    policy_name: str | None = None
    dataset_name: str | None = None
    total_rows: int | None = None
    compliance_score: float | None = None

@router.get("/context", response_model=SessionContextResponse)
def get_session_context(db: Session = Depends(get_db)):
    """
    Fetch the most recent policy and dataset context for the current session.
    """
    # 1. Fetch latest successful policy
    latest_policy = (
        db.query(Policy)
        .filter(Policy.status == "completed")
        .order_by(Policy.created_at.desc())
        .first()
    )
    
    # 2. Fetch latest dataset
    latest_dataset = (
        db.query(Dataset)
        .order_by(Dataset.created_at.desc())
        .first()
    )
    
    total_rows = 0
    if latest_dataset and latest_dataset.metadata_:
        total_rows = latest_dataset.metadata_.get("total_rows", 0)
    
    return SessionContextResponse(
        policy_name=latest_policy.filename if latest_policy else None,
        dataset_name=latest_dataset.file_name if latest_dataset else None,
        total_rows=total_rows,
        compliance_score=88.4 if latest_policy and latest_dataset else None # Mock for now per requirement
    )
