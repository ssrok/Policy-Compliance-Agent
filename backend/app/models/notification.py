from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.db.base import Base

class Notification(Base):
    __tablename__ = "regulatory_notifications"

    id          = Column(Integer, primary_key=True, index=True)
    title       = Column(String, nullable=False)
    source      = Column(String, nullable=False)
    change_type = Column(String, nullable=False, default="OTHER")
    actionable  = Column(Boolean, default=False)
    link        = Column(String, nullable=True, default="")   # Fix 2: official source URL
    message     = Column(String, nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
