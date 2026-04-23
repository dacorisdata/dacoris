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
    "application/pdf", 
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/csv", 
    "text/plain",
    "image/jpeg", 
    "image/png",
    "image/gif",
    "application/zip",
    "application/x-zip-compressed",
    # Common variations
    "application/octet-stream",  # Generic binary, often used for unknown types
}

async def save_upload(file: UploadFile, subfolder: str = "documents") -> dict:
    # More lenient check - allow if content_type is None or in allowed list
    if file.content_type and file.content_type not in ALLOWED_TYPES:
        # Check file extension as fallback
        ext = os.path.splitext(file.filename)[1].lower()
        allowed_extensions = {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', 
                             '.csv', '.txt', '.jpg', '.jpeg', '.png', '.gif', '.zip'}
        if ext not in allowed_extensions:
            raise HTTPException(400, f"File type '{file.content_type}' with extension '{ext}' not allowed. Allowed: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, CSV, TXT, images, ZIP")

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
    }

def get_file_path(stored_filename: str, subfolder: str = "documents") -> str:
    return os.path.join(UPLOAD_DIR, subfolder, stored_filename)
