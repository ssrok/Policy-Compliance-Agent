import os
import re
import logging
from fastapi import HTTPException
from app.core.config import settings
from app.services.pdf_extractor import extract_text_from_pdf
from app.services.clause_segmenter import segment_clauses

logger = logging.getLogger(__name__)

_SAFE_FILE_ID = re.compile(r'^[a-zA-Z0-9_\-]+$')

def process_policy(file_id: str) -> dict:
    # Fix 3: Validate file_id to prevent path traversal
    if not file_id or not _SAFE_FILE_ID.match(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID format.")

    filename  = f"{file_id}.pdf"
    upload_dir = os.path.realpath(settings.UPLOAD_DIR)
    file_path  = os.path.realpath(os.path.join(upload_dir, filename))

    # Ensure resolved path stays inside UPLOAD_DIR
    if not file_path.startswith(upload_dir + os.sep):
        raise HTTPException(status_code=400, detail="Invalid file path.")

    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        raise HTTPException(status_code=404, detail=f"File ID '{file_id}' does not exist.")

    logger.info(f"Starting policy processing for: {file_id}")
    try:
        raw_text = extract_text_from_pdf(file_path)
        clauses  = segment_clauses(raw_text)
    except Exception as e:
        logger.error(f"Processing failed for {file_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Critical processing error: {str(e)}")

    if not clauses:
        logger.warning(f"Empty extraction result for: {file_id}")
        raise HTTPException(status_code=422, detail="No valid policy clauses could be extracted.")

    logger.info(f"Processing complete: {len(clauses)} clauses for {file_id}")
    return {"file_id": file_id, "num_clauses": len(clauses), "clauses": clauses}
