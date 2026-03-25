import logging
from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.concurrency import run_in_threadpool
from app.schemas.policy import PolicyUploadResponse, PolicyProcessResponse
from app.services.policy_service import save_policy_file
from app.services.policy_pipeline import process_policy

# Configure logger for route tracking
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/upload", response_model=PolicyUploadResponse)
async def upload_policy(file: UploadFile = File(...)):
    """
    Ingest a policy PDF file for analysis.
    Only allows application/pdf MIME type.
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    # Run blocking storage I/O in a threadpool
    logger.info(f"💾 Ingesting file: {file.filename}")
    file_id = await run_in_threadpool(save_policy_file, file)
    
    return PolicyUploadResponse(
        file_id=file_id,
        filename=file.filename
    )

@router.post("/process/{file_id}", response_model=PolicyProcessResponse)
async def process_policy_endpoint(file_id: str):
    """
    Execute the full policy processing pipeline for a given file_id:
    PDF Extraction -> Text Normalization -> NLP Clause Segmentation.
    """
    # Orchestrate the heavy compute/IO work in a threadpool to keep the server responsive
    logger.info(f"⚙️ Processing request for file_id={file_id}")
    outcome = await run_in_threadpool(process_policy, file_id)
    
    # Efficiently unpack the service response into the Pydantic model
    return PolicyProcessResponse(**outcome)
