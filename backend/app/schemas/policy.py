from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

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
