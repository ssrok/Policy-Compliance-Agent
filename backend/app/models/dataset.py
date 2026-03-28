from sqlalchemy import Column, String, DateTime, JSON
from sqlalchemy.sql import func
from app.db.base import Base


class Dataset(Base):
    __tablename__ = "datasets"

    dataset_id = Column(String, primary_key=True, index=True)   # UUID string
    file_name  = Column(String, nullable=False)
    data_json  = Column(JSON, nullable=False)                    # safe-serialized rows (max 1000, NaN→None, no numpy types)
    metadata_  = Column("metadata", JSON, nullable=True)         # shape, column types, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())
