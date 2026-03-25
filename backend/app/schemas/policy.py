from pydantic import BaseModel

class PolicyUploadResponse(BaseModel):
    file_id: str
    filename: str

class PolicyProcessResponse(BaseModel):
    file_id: str
    num_clauses: int
    clauses: list[str]
