"""
Prototype file upload service — stores files to local disk.
Replace with S3/MinIO in V1.0.
"""
import os
import uuid
import aiofiles
from fastapi import UploadFile, HTTPException

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE_MB", 50)) * 1024 * 1024

ALLOWED_TYPES = {
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv", "image/jpeg", "image/png",
}

async def save_upload(file: UploadFile, subfolder: str = "documents") -> dict:
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"File type {file.content_type} not allowed")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, f"File exceeds {MAX_FILE_SIZE // 1024 // 1024}MB limit")

    ext = os.path.splitext(file.filename)[1]
    stored_name = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(UPLOAD_DIR, subfolder, stored_name)
    os.makedirs(os.path.dirname(path), exist_ok=True)

    async with aiofiles.open(path, "wb") as f:
        await f.write(content)

    return {
        "original_filename": file.filename,
        "stored_filename": stored_name,
        "file_size_bytes": len(content),
        "mime_type": file.content_type,
        "path": path,
    }

def get_file_path(stored_filename: str, subfolder: str = "documents") -> str:
    return os.path.join(UPLOAD_DIR, subfolder, stored_filename)
