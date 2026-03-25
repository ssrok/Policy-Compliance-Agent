from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.db.base import Base

class Rule(Base):
    __tablename__ = "rules"

    id          = Column(Integer, primary_key=True, index=True)
    rule_id     = Column(String, unique=True, index=True, nullable=False)  # e.g. "AML_001"
    file_id     = Column(String, index=True, nullable=False)               # links back to uploaded PDF
    source_clause = Column(String, nullable=False)                         # original clause text
    entity      = Column(String, nullable=True)   # e.g. "transaction"
    field       = Column(String, nullable=True)   # e.g. "amount"
    operator    = Column(String, nullable=True)   # e.g. ">"
    value       = Column(Float,  nullable=True)   # e.g. 10000
    action      = Column(String, nullable=True)   # e.g. "flag"
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
