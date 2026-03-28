from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.db.base import Base

class Rule(Base):
    __tablename__ = "rules"

    id            = Column(Integer, primary_key=True, index=True)
    rule_id       = Column(String, unique=True, index=True, nullable=False)
    file_id       = Column(String, index=True, nullable=False)
    source_clause = Column(String, nullable=False)
    clause_index  = Column(Integer, nullable=True)   # position of clause in the policy list
    entity        = Column(String, nullable=True)
    field         = Column(String, nullable=True)
    operator      = Column(String, nullable=True)
    value         = Column(Float,  nullable=True)
    action        = Column(String, nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
