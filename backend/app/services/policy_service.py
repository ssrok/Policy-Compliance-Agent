import os
import uuid
from fastapi import UploadFile, HTTPException
from app.core.config import settings
import shutil

def save_policy_file(file: UploadFile) -> str:
    # 1. Validate file extension and MIME type
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only application/pdf is allowed")

    # 2. Check if file is empty
    # For small to medium files, this is safe. Larger files might need seek/tell.
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    if file_size == 0:
        raise HTTPException(status_code=400, detail="Reject empty files")
    file.file.seek(0)

    # 0. Ensure directory exists (safeguard)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # 3. Generate unique file ID and path
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.pdf"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)

    # 4. Save file to disk
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")

    return file_id
