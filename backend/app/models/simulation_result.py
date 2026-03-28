from sqlalchemy import Column, String, Integer, Float, DateTime
from sqlalchemy.sql import func
from app.db.base import Base


class SimulationResult(Base):
    __tablename__ = "simulation_results"

    simulation_id  = Column(String, primary_key=True, index=True)  # UUID string
    dataset_id     = Column(String, nullable=True)
    policy_id      = Column(String, nullable=True)
    column_used    = Column(String, nullable=True)
    old_threshold  = Column(Float, nullable=True)
    new_threshold  = Column(Float, nullable=True)
    old_violations = Column(Integer, nullable=True)
    new_violations = Column(Integer, nullable=True)
    difference     = Column(Integer, nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
