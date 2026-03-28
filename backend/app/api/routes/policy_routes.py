import logging
import io
import re
import pdfplumber
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.policy import Policy
from app.models.notification import Notification
from app.schemas.policy import (
    PolicyUploadResponse,
    PolicyProcessResponse,
    PolicyListResponse,
    PolicyDetail
)
from app.services.policy_service import save_policy_file
from app.services.policy_pipeline import process_policy
from app.services.clause_segmenter import segment_clauses

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=PolicyListResponse)
def list_policies(db: Session = Depends(get_db)):
    policies = db.query(Policy).order_by(Policy.created_at.desc()).all()
    return {"policies": policies}


@router.get("/{file_id}", response_model=PolicyDetail)
def get_policy(file_id: str, db: Session = Depends(get_db)):
    policy = db.query(Policy).filter(Policy.file_id == file_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    return policy


@router.post("/upload", response_model=PolicyUploadResponse)
async def upload_policy(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    logger.info(f"Ingesting file: {file.filename}")
    file_id = await run_in_threadpool(save_policy_file, file)
    new_policy = Policy(file_id=file_id, filename=file.filename, status="pending")
    db.add(new_policy)
    db.commit()
    db.refresh(new_policy)
    return PolicyUploadResponse(file_id=file_id, filename=file.filename)


@router.post("/process/{file_id}", response_model=PolicyProcessResponse)
async def process_policy_endpoint(file_id: str, db: Session = Depends(get_db)):
    policy = db.query(Policy).filter(Policy.file_id == file_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="File ID not found in database registry")
    policy.status = "processing"
    db.commit()
    logger.info(f"Processing request for file_id={file_id}")
    try:
        outcome = await run_in_threadpool(process_policy, file_id)
        policy.status = "completed"
        policy.num_clauses = outcome.get("num_clauses", 0)
        policy.clauses = outcome.get("clauses", [])
        db.commit()
        return PolicyProcessResponse(**outcome)
    except Exception as e:
        policy.status = "failed"
        db.commit()
        logger.error(f"Processing failed for {file_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract")
async def extract_clauses_direct(file: UploadFile = File(...)):
    if not file or not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a valid PDF document.")
    try:
        file_content = await file.read()
        extracted_text = ""
        with io.BytesIO(file_content) as buf:
            with pdfplumber.open(buf) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        extracted_text += page_text + "\n"
        if not extracted_text:
            return {"clauses": []}
        clauses = [line.strip() for line in extracted_text.split("\n") if line.strip()]
        return {"clauses": clauses}
    except Exception as e:
        logger.error(f"Extraction error: {str(e)}")
        return {"clauses": []}


@router.post("/merge-notifications")
async def merge_notifications_into_policy(
    payload: dict,
    db: Session = Depends(get_db)
):
    """
    Merges regulatory notification clauses into existing policy clauses.

    Body:
        {
            "existing_clauses": [...],
            "notification_ids": [0, 1, 2]   # optional — indices into notifications list
                                              # if omitted, merges ALL notifications
        }

    Response:
        { merged_clauses, original_count, new_from_notifications, total, message }
    """
    existing_clauses: list = payload.get("existing_clauses", [])
    notification_ids: list | None = payload.get("notification_ids", None)  # Fix 4: selective

    # Get notifications from in-memory manager (always up to date)
    # Falls back to DB if memory is empty (e.g. after restart)
    from app.regulatory.notifications import notification_manager
    all_notifications = notification_manager.get_notifications()

    if not all_notifications:
        db_rows = db.query(Notification).order_by(Notification.created_at.desc()).all()
        all_notifications = [
            {"title": r.title, "source": r.source, "change_type": r.change_type,
             "message": r.message, "actionable": r.actionable, "link": r.link or ""}
            for r in db_rows
        ]

    if not all_notifications:
        return {
            "merged_clauses": existing_clauses,
            "original_count": len(existing_clauses),
            "new_from_notifications": 0,
            "total": len(existing_clauses),
            "message": "No regulatory notifications found to merge."
        }

    # Fix 4: filter to selected notifications if ids provided
    if notification_ids is not None:
        selected = [
            all_notifications[i]
            for i in notification_ids
            if 0 <= i < len(all_notifications)
        ]
    else:
        selected = all_notifications

    if not selected:
        return {
            "merged_clauses": existing_clauses,
            "original_count": len(existing_clauses),
            "new_from_notifications": 0,
            "total": len(existing_clauses),
            "message": "No matching notifications selected."
        }

    # Build raw text from selected notifications
    notification_text_parts = []
    for n in selected:
        change_label = n["change_type"].replace("_", " ").title()
        sentence = f"{n['source']} {change_label}: {n['title']}. {n['message']}"
        notification_text_parts.append(sentence)

    notification_text = " ".join(notification_text_parts)

    def _segment():
        return segment_clauses(notification_text)

    notification_clauses = await run_in_threadpool(_segment)

    # Merge — deduplicate by normalized text
    existing_set = {c.strip().lower() for c in existing_clauses}
    new_clauses = [
        c for c in notification_clauses
        if c.strip().lower() not in existing_set
    ]

    merged = existing_clauses + new_clauses

    logger.info(
        f"[PolicyMerge] original={len(existing_clauses)} "
        f"selected_notifications={len(selected)} "
        f"new_clauses={len(new_clauses)} total={len(merged)}"
    )

    return {
        "merged_clauses": merged,
        "original_count": len(existing_clauses),
        "new_from_notifications": len(new_clauses),
        "total": len(merged),
        "message": f"Merged {len(new_clauses)} new clauses from {len(selected)} regulatory notifications."
    }
