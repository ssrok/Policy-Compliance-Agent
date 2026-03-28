"""
dataset_routes.py
-----------------
REST API endpoints for uploading and ingesting structured datasets.
"""

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.services.dataset_ingestion_service import ingest_dataset

router = APIRouter()


# ── Response schemas ──────────────────────────────────────────────────────────

class MetadataResponse(BaseModel):
    total_rows: int
    total_columns: int
    column_types: Dict[str, str]


class DatasetIngestionResponse(BaseModel):
    dataset_id: str
    columns: List[str]
    rows: List[Dict[str, Any]]
    metadata: MetadataResponse


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/upload", response_model=DatasetIngestionResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),          # DB injected — enables persistence
):
    if not file:
        raise HTTPException(status_code=400, detail={"error": "File missing"})

    try:
        # ingest_dataset now persists to DB and keeps _current_df in sync
        result = ingest_dataset(file, db=db)
        print("Dataset available in chat:", True)
    except ValueError as e:
        msg = str(e)
        if "Unsupported" in msg:
            raise HTTPException(status_code=415, detail={"error": "Unsupported file type", "details": msg})
        elif "Empty dataset" in msg:
            raise HTTPException(status_code=422, detail={"error": "Empty dataset", "details": msg})
        elif "Corrupt file" in msg:
            raise HTTPException(status_code=400, detail={"error": "Corrupt file", "details": msg})
        else:
            raise HTTPException(status_code=400, detail={"error": "Parsing failure", "details": msg})
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": "Unexpected failure", "details": str(e)})

    return DatasetIngestionResponse(
        dataset_id=result["dataset_id"],
        columns=result["columns"],
        rows=result["rows"],
        metadata=result["metadata"],
    )
