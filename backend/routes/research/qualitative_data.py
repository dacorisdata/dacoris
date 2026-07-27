"""
Qualitative Data API Endpoints (KII / FGD)

Unlike the MinIO Bronze lakehouse pipeline used for quantitative DataImport, qualitative
records (transcripts, audio, video from Key Informant Interviews and Focus Group
Discussions) are stored directly on local disk under UPLOAD_DIR — there is no ingestion
queue or versioning here, just metadata + a stored file, optionally linked to a project.
"""

import os
import uuid
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from database import get_db
from models import User, ResearchProject, QualitativeData, QualitativeDataType
from auth import get_current_user

router = APIRouter(prefix="/api/research/qualitative-data", tags=["qualitative-data"])

UPLOAD_DIR = os.environ.get("QUALITATIVE_UPLOAD_DIR", os.path.join(os.environ.get("UPLOAD_DIR", "./uploads"), "qualitative_data"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {
    # Transcripts / documents
    ".docx", ".doc", ".pdf", ".txt",
    # Audio
    ".mp3", ".wav", ".m4a", ".ogg",
    # Video
    ".mp4", ".mov", ".avi", ".mkv", ".webm",
}

MAX_FILE_SIZE_BYTES = int(os.environ.get("QUALITATIVE_MAX_UPLOAD_MB", "500")) * 1024 * 1024


# ──── Schemas ────────────────────────────────────────────────────────────────

class QualitativeDataResponse(BaseModel):
    id: str
    institution_id: str
    researcher_id: str
    project_id: Optional[str] = None
    project_title: Optional[str] = None
    data_type: str
    title: str
    description: Optional[str] = None
    date_conducted: Optional[datetime] = None
    location: Optional[str] = None
    language: Optional[str] = None
    original_filename: Optional[str] = None
    file_format: Optional[str] = None
    file_size_bytes: Optional[int] = None
    mime_type: Optional[str] = None
    researcher_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class QualitativeDataListResponse(BaseModel):
    records: List[QualitativeDataResponse]
    total: int
    page: int
    page_size: int


# ──── Helpers ────────────────────────────────────────────────────────────────

def _serialize(record: QualitativeData) -> QualitativeDataResponse:
    return QualitativeDataResponse(
        id=record.id,
        institution_id=record.institution_id,
        researcher_id=record.researcher_id,
        project_id=record.project_id,
        project_title=record.project.title if record.project else None,
        data_type=record.data_type.value if hasattr(record.data_type, "value") else str(record.data_type),
        title=record.title,
        description=record.description,
        date_conducted=record.date_conducted,
        location=record.location,
        language=record.language,
        original_filename=record.original_filename,
        file_format=record.file_format,
        file_size_bytes=record.file_size_bytes,
        mime_type=record.mime_type,
        researcher_name=record.researcher.name if record.researcher else None,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


_LOAD_OPTS = [
    selectinload(QualitativeData.project),
    selectinload(QualitativeData.researcher),
]


def _parse_data_type(value: str) -> QualitativeDataType:
    try:
        return QualitativeDataType(value.lower())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="data_type must be one of: kii, fgd, other",
        )


def _parse_date_conducted(value: Optional[str]) -> Optional[datetime]:
    if not value or not value.strip():
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date_conducted format")


# ──── Routes ─────────────────────────────────────────────────────────────────

@router.post("", response_model=QualitativeDataResponse, status_code=status.HTTP_201_CREATED)
async def upload_qualitative_data(
    file: UploadFile = File(...),
    data_type: str = Form(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    date_conducted: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
    project_id: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a KII/FGD transcript, audio, or video file and record its metadata.
    The file is stored on local disk only — it is NOT sent to the MinIO Bronze
    lakehouse pipeline used for quantitative datasets.
    """
    if not current_user.primary_institution_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No institution linked to your account")

    if not title or not title.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Title is required")

    parsed_type = _parse_data_type(data_type)

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    project = None
    if project_id and project_id.strip():
        project = await db.get(ResearchProject, project_id.strip())
        if not project or project.institution_id != current_user.primary_institution_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found or access denied")

    file_content = await file.read()
    file_size = len(file_content)
    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum size of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB",
        )

    stored_filename = f"{uuid.uuid4().hex}{ext}"
    dest_path = os.path.join(UPLOAD_DIR, stored_filename)
    with open(dest_path, "wb") as f:
        f.write(file_content)

    record = QualitativeData(
        institution_id=current_user.primary_institution_id,
        researcher_id=current_user.id,
        project_id=project.id if project else None,
        data_type=parsed_type,
        title=title.strip(),
        description=description,
        date_conducted=_parse_date_conducted(date_conducted),
        location=location,
        language=language,
        original_filename=file.filename,
        stored_filename=stored_filename,
        file_path=dest_path,
        file_format=ext.lstrip("."),
        file_size_bytes=file_size,
        mime_type=file.content_type or "application/octet-stream",
        created_by_id=current_user.id,
    )
    db.add(record)
    await db.commit()

    result = await db.execute(
        select(QualitativeData).where(QualitativeData.id == record.id).options(*_LOAD_OPTS)
    )
    return _serialize(result.scalar_one())


@router.get("", response_model=QualitativeDataListResponse)
async def list_qualitative_data(
    project_id: Optional[str] = None,
    data_type: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List qualitative data records for the current researcher."""
    where_clauses = [QualitativeData.researcher_id == current_user.id]

    if project_id:
        where_clauses.append(QualitativeData.project_id == project_id)

    if data_type:
        where_clauses.append(QualitativeData.data_type == _parse_data_type(data_type))

    count_query = select(func.count(QualitativeData.id)).where(and_(*where_clauses))
    total = (await db.execute(count_query)).scalar() or 0

    offset = (page - 1) * page_size
    query = (
        select(QualitativeData)
        .options(*_LOAD_OPTS)
        .where(and_(*where_clauses))
        .order_by(desc(QualitativeData.created_at))
        .limit(page_size)
        .offset(offset)
    )
    result = await db.execute(query)
    records = list(result.scalars().all())

    return {
        "records": [_serialize(r) for r in records],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{record_id}", response_model=QualitativeDataResponse)
async def get_qualitative_data(
    record_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(QualitativeData)
        .where(and_(QualitativeData.id == record_id, QualitativeData.researcher_id == current_user.id))
        .options(*_LOAD_OPTS)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Qualitative data record not found")
    return _serialize(record)


@router.get("/{record_id}/download")
async def download_qualitative_data(
    record_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(QualitativeData).where(
            and_(QualitativeData.id == record_id, QualitativeData.researcher_id == current_user.id)
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Qualitative data record not found")

    path = record.file_path if record.file_path and os.path.isfile(record.file_path) else os.path.join(UPLOAD_DIR, record.stored_filename or "")
    if not path or not os.path.isfile(path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on server")

    return FileResponse(
        path,
        filename=record.original_filename or record.stored_filename,
        media_type=record.mime_type or "application/octet-stream",
    )


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_qualitative_data(
    record_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(QualitativeData).where(
            and_(QualitativeData.id == record_id, QualitativeData.researcher_id == current_user.id)
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Qualitative data record not found")

    file_path = record.file_path
    await db.delete(record)
    await db.commit()

    if file_path and os.path.isfile(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass

    return None
