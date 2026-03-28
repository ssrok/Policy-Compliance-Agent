"""
dataset_ingestion_service.py
----------------------------
Orchestrates dataset ingestion: parse → standardize → persist to DB + memory.
"""

import json
import uuid
from typing import Any, Dict, Optional

import pandas as pd
from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.utils.file_utils import detect_file_type
from app.services.dataset_parser import parse_dataset
from app.services.dataset_standardizer import standardize_dataset
from app.services.dataset_metadata import extract_metadata

# ── In-memory fallback (single-user / no dataset_id supplied) ────────────────
_current_df: Optional[pd.DataFrame] = None


def set_current_df(df: pd.DataFrame) -> None:
    global _current_df
    _current_df = df
    print("Dataset stored:", df.shape)


def get_current_df() -> Optional[pd.DataFrame]:
    return _current_df


# ── DB helpers ────────────────────────────────────────────────────────────────

def get_dataset_by_id(dataset_id: str, db: Session) -> Optional[Any]:
    """Load a Dataset row from Supabase by its UUID."""
    from app.models.dataset import Dataset
    return db.query(Dataset).filter(Dataset.dataset_id == dataset_id).first()


def df_from_dataset(dataset_row: Any) -> pd.DataFrame:
    """Reconstruct a DataFrame from a persisted Dataset row."""
    return pd.DataFrame(dataset_row.data_json)


# ── Main ingestion ────────────────────────────────────────────────────────────

def ingest_dataset(file: UploadFile, db: Optional[Session] = None) -> Dict[str, Any]:
    """
    Parse → standardize → persist to DB (if db provided) + memory.

    Returns the standard ingestion dict. When db is supplied the dataset_id
    is the persisted UUID; otherwise it comes from standardize_dataset().
    """
    from app.models.dataset import Dataset

    # Step 1: detect file type
    file_type = detect_file_type(file)

    # Step 2: parse into DataFrame
    df = parse_dataset(file, file_type)

    # Step 3: keep in memory for fallback
    set_current_df(df)

    # Step 4: standardize
    standardized = standardize_dataset(df)
    metadata     = extract_metadata(df)

    # Step 5: persist to DB when a session is available
    if db is not None:
        dataset_id = str(uuid.uuid4())

        # Safe serialization: NaN → None, numpy types → Python natives
        _df = df.head(500).copy()
        _df = _df.where(pd.notnull(_df), None)
        data_json = json.loads(_df.to_json(orient="records"))

        print("DF shape:", df.shape)
        print("Saving dataset...")
        print("Dataset rows:", len(data_json))
        print("Sample row:", data_json[0] if data_json else "empty")

        row = Dataset(
            dataset_id = dataset_id,
            file_name  = file.filename or "unknown",
            data_json  = data_json,
            metadata_  = metadata,
        )
        try:
            db.add(row)
            db.commit()
            db.refresh(row)
        except Exception as e:
            print("DATASET SAVE ERROR:", str(e))
            raise e
        print("Dataset persisted to DB:", dataset_id, df.shape)
    else:
        dataset_id = standardized["dataset_id"]

    return {
        "dataset_id": dataset_id,
        "columns":    standardized["columns"],
        "rows":       standardized["rows"],
        "metadata":   metadata,
    }
