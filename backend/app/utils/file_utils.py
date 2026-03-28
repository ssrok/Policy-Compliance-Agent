"""
file_utils.py
-------------
Utility functions for file handling and validation.
"""

import pathlib
import os
from typing import Union
from fastapi import UploadFile

SUPPORTED_EXTENSIONS = {
    ".csv": "csv",
    ".xlsx": "excel",
    ".xls": "excel",
    ".json": "json"
}

def detect_file_type(file_input: Union[str, UploadFile]) -> str:
    if isinstance(file_input, UploadFile):
        filename = file_input.filename
    else:
        filename = file_input

    if not filename:
        raise ValueError("Provided file input has no filename.")

    # Sanitize: strip directory components, allow only the bare filename
    safe_name = os.path.basename(filename)
    ext = pathlib.Path(safe_name).suffix.lower()

    if ext not in SUPPORTED_EXTENSIONS:
        allowed = ", ".join(SUPPORTED_EXTENSIONS.keys())
        raise ValueError(f"Unsupported file type '{ext}'. Allowed: {allowed}")

    return SUPPORTED_EXTENSIONS[ext]
