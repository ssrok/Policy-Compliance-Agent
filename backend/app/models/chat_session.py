from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from app.db.base import Base


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    session_id = Column(String, primary_key=True, index=True)   # UUID string
    dataset_id = Column(String, nullable=True)                   # FK → datasets.dataset_id
    policy_id  = Column(String, nullable=True)                   # FK → policies.file_id
    created_at = Column(DateTime(timezone=True), server_default=func.now())
