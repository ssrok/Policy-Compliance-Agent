import os
import logging
from fastapi import HTTPException
from app.core.config import settings
from app.services.pdf_extractor import extract_text_from_pdf
from app.services.clause_segmenter import segment_clauses

# Configure structured logging
logger = logging.getLogger(__name__)

def process_policy(file_id: str) -> dict:
    """
    Orchestrates the policy processing pipeline with robust error handling 
    and document validation.
    """
    
    # 1. Resolve and validate file path
    filename = f"{file_id}.pdf"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        raise HTTPException(
            status_code=404, 
            detail=f"The requested file ID '{file_id}' does not exist on the server."
        )

    logger.info(f"🚀 Starting policy processing for: {file_id}")
    
    # 2. Pipeline Execution with global error containment
    try:
        # Step A: Convert PDF to raw text
        raw_text = extract_text_from_pdf(file_path)
        
        # Step B: Segment text into clean clauses
        clauses = segment_clauses(raw_text)
        
    except Exception as e:
        logger.error(f"❌ Processing failed for {file_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Critical processing error: {str(e)}"
        )
    
    # 3. Validation: Document Must Contain Clauses
    if not clauses:
        logger.warning(f"⚠️ Empty extraction result for: {file_id}")
        raise HTTPException(
            status_code=422,
            detail="Processing completed but no valid policy clauses could be extracted from this document."
        )
    
    # 4. Success Response with Metrics
    logger.info(f"✅ Processing complete: Found {len(clauses)} clauses for {file_id}")
    return {
        "file_id": file_id,
        "num_clauses": len(clauses),
        "clauses": clauses
    }
