from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.services.chat_service import handle_chat, create_chat_session

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    """Legacy request — backward compatible."""
    message: str


class ChatQueryRequest(BaseModel):
    """Full persistent request with optional session/dataset/policy linking."""
    query:      str
    session_id: Optional[str] = None
    dataset_id: Optional[str] = None
    policy_id:  Optional[str] = None


class SessionCreateRequest(BaseModel):
    dataset_id: Optional[str] = None
    policy_id:  Optional[str] = None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/chat")
def chat(request: ChatRequest):
    """Legacy endpoint — uses _current_df fallback, no DB session required."""
    return handle_chat(request.message)


@router.post("/chat/query")
def chat_query(request: ChatQueryRequest, db: Session = Depends(get_db)):
    """
    Persistent endpoint.
    Loads dataset from DB via dataset_id (falls back to _current_df).
    Resolves dataset_id + policy_id from session_id when provided.
    """
    return handle_chat(
        query      = request.query,
        dataset_id = request.dataset_id,
        session_id = request.session_id,
        policy_id  = request.policy_id,
        db         = db,
    )


@router.post("/chat/session")
def start_session(request: SessionCreateRequest, db: Session = Depends(get_db)):
    """Create a chat session linking a dataset and policy. Returns session_id."""
    session_id = create_chat_session(db, request.dataset_id, request.policy_id)
    return {"session_id": session_id}
