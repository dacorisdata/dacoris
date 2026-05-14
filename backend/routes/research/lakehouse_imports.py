"""
Lakehouse Data Import API Endpoints (Metadata-First Architecture)

These endpoints handle:
- Registering new data imports (metadata only)
- Triggering MinIO Bronze ingestion
- Listing and managing imports
- Status tracking and retry logic
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from io import BytesIO
import os
import tempfile

from database import get_db
from models import (
    User, ResearchProject, DataImport, DataImportStatus, DataSourceType,
    ResearchRole, Institution
)
from auth import require_roles, get_current_user
from services.minio_service import get_minio_service

router = APIRouter(prefix="/api/research/lakehouse-imports", tags=["lakehouse-imports"])

# ──── Schemas ────────────────────────────────────────────────────────────────

class DataImportCreate(BaseModel):
    institution_id: int
    researcher_id: int
    project_id: Optional[int] = None
    source_url: Optional[str] = None
    source_type: DataSourceType
    source_tag: str = Field(..., description="Human-readable label for this import")
    file_name: Optional[str] = None
    file_format: Optional[str] = None
    description: Optional[str] = None
    priority: int = Field(default=5, ge=1, le=10)
    metadata_json: Optional[str] = None

class DataImportResponse(BaseModel):
    id: str
    institution_id: int
    researcher_id: int
    project_id: Optional[int]
    source_url: Optional[str]
    source_type: str
    source_tag: str
    file_name: Optional[str]
    file_format: Optional[str]
    ingest_status: str
    bronze_path: Optional[str]
    bronze_bucket: Optional[str]
    file_size_bytes: Optional[int]
    record_count: Optional[int]
    description: Optional[str]
    priority: int
    retry_count: int
    error_message: Optional[str]
    created_at: datetime
    ingest_triggered_at: Optional[datetime]
    ingest_completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class DataImportListResponse(BaseModel):
    imports: List[DataImportResponse]
    total: int
    page: int
    page_size: int

# ──── Background Tasks ───────────────────────────────────────────────────────

async def trigger_bronze_ingestion(
    import_id: str,
    source_url: str,
    bronze_path: str,
    metadata: dict,
    db_session: AsyncSession
):
    """
    Background task to ingest data to MinIO Bronze bucket
    """
    minio_service = get_minio_service()
    
    try:
        # Update status to 'ingesting'
        stmt = select(DataImport).where(DataImport.id == import_id)
        result = await db_session.execute(stmt)
        data_import = result.scalar_one_or_none()
        
        if not data_import:
            print(f"Import {import_id} not found")
            return
        
        data_import.ingest_status = DataImportStatus.INGESTING
        data_import.ingest_triggered_at = datetime.utcnow()
        await db_session.commit()
        
        # Ingest from URL to MinIO
        upload_result = await minio_service.ingest_from_url(
            source_url=source_url,
            bronze_path=bronze_path,
            metadata=metadata
        )
        
        # Update status to 'ingested'
        data_import.ingest_status = DataImportStatus.INGESTED
        data_import.bronze_path = upload_result['bronze_path']
        data_import.bronze_bucket = upload_result['bronze_bucket']
        data_import.file_size_bytes = upload_result['file_size_bytes']
        data_import.ingest_completed_at = datetime.utcnow()
        data_import.error_message = None
        
        await db_session.commit()
        print(f"✓ Import {import_id} ingested successfully to {bronze_path}")
        
    except Exception as e:
        # Update status to 'failed'
        print(f"✗ Import {import_id} failed: {str(e)}")
        
        stmt = select(DataImport).where(DataImport.id == import_id)
        result = await db_session.execute(stmt)
        data_import = result.scalar_one_or_none()
        
        if data_import:
            data_import.ingest_status = DataImportStatus.FAILED
            data_import.error_message = str(e)
            data_import.retry_count += 1
            data_import.last_retry_at = datetime.utcnow()
            await db_session.commit()

# ──── Routes ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=DataImportResponse, status_code=status.HTTP_201_CREATED)
async def register_data_import(
    payload: DataImportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Register a new data import (metadata only) - NO MinIO ingestion yet
    
    This endpoint:
    1. Saves metadata to PostgreSQL with status 'queued'
    2. Generates Bronze path for future ingestion
    3. Returns immediately with import ID
    
    MinIO will pull queued imports via /api/ingest/queued-imports endpoint
    """
    # Verify user has access to institution and project
    if payload.institution_id != current_user.primary_institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this institution"
        )
    
    if payload.project_id:
        project_query = select(ResearchProject).where(
            and_(
                ResearchProject.id == payload.project_id,
                ResearchProject.institution_id == payload.institution_id
            )
        )
        project_result = await db.execute(project_query)
        project = project_result.scalar_one_or_none()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or access denied"
            )
    
    # Validate source_url is provided
    if not payload.source_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="source_url is required for ingestion"
        )
    
    # Generate Bronze path (for future ingestion)
    from datetime import datetime
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    project_part = f"proj-{payload.project_id}" if payload.project_id else "no-project"
    bronze_path = f"inst-{payload.institution_id}/{project_part}/{payload.source_tag}_{timestamp}.{payload.file_format or 'csv'}"
    
    # Create metadata record with QUEUED status
    data_import = DataImport(
        institution_id=payload.institution_id,
        researcher_id=payload.researcher_id,
        project_id=payload.project_id,
        source_url=payload.source_url,
        source_type=payload.source_type,
        source_tag=payload.source_tag,
        file_name=payload.file_name,
        file_format=payload.file_format,
        description=payload.description,
        priority=payload.priority,
        metadata_json=payload.metadata_json,
        ingest_status=DataImportStatus.QUEUED,
        bronze_path=bronze_path,
        bronze_bucket="dacoris-bronze",
        created_by=current_user.id
    )
    
    db.add(data_import)
    await db.commit()
    await db.refresh(data_import)
    
    return data_import


@router.post("/upload-csv", response_model=DataImportResponse, status_code=status.HTTP_201_CREATED)
async def upload_csv_file(
    file: UploadFile = File(...),
    institution_id: int = None,
    project_id: Optional[int] = None,
    source_tag: str = None,
    description: Optional[str] = None,
    priority: int = 5,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload CSV file - saves metadata only, file stored temporarily
    
    This endpoint:
    1. Saves file to temporary location
    2. Creates metadata record with status 'queued'
    3. MinIO will pull and ingest later
    """
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are supported"
        )
    
    # Verify user has access
    if institution_id != current_user.primary_institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this institution"
        )
    
    # Generate Bronze path
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    project_part = f"proj-{project_id}" if project_id else "no-project"
    bronze_path = f"inst-{institution_id}/{project_part}/{source_tag}_{timestamp}.csv"
    
    # Read file content to get size
    file_content = await file.read()
    file_size = len(file_content)
    
    # Save to temporary location (will be picked up by MinIO later)
    upload_dir = os.getenv("UPLOAD_DIR", "./uploads")
    os.makedirs(upload_dir, exist_ok=True)
    temp_file_path = os.path.join(upload_dir, f"{source_tag}_{timestamp}.csv")
    
    with open(temp_file_path, 'wb') as f:
        f.write(file_content)
    
    # Create metadata record with QUEUED status
    data_import = DataImport(
        institution_id=institution_id,
        researcher_id=current_user.id,
        project_id=project_id,
        source_url=f"file://{temp_file_path}",  # Local file path
        source_type=DataSourceType.FILE_UPLOAD,
        source_tag=source_tag,
        file_name=file.filename,
        file_format='csv',
        description=description,
        priority=priority,
        file_size_bytes=file_size,
        ingest_status=DataImportStatus.QUEUED,
        bronze_path=bronze_path,
        bronze_bucket="dacoris-bronze",
        created_by=current_user.id
    )
    
    db.add(data_import)
    await db.commit()
    await db.refresh(data_import)
    
    return data_import


@router.get("", response_model=DataImportListResponse)
async def list_data_imports(
    project_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    source_type: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List data imports for current researcher with optional filters
    """
    # Build query
    where_clauses = [DataImport.researcher_id == current_user.id]
    
    if project_id:
        where_clauses.append(DataImport.project_id == project_id)
    
    if status_filter:
        where_clauses.append(DataImport.ingest_status == status_filter)
    
    if source_type:
        where_clauses.append(DataImport.source_type == source_type)
    
    # Count total
    count_query = select(func.count(DataImport.id)).where(and_(*where_clauses))
    count_result = await db.execute(count_query)
    total = count_result.scalar()
    
    # Get paginated results
    offset = (page - 1) * page_size
    query = (
        select(DataImport)
        .where(and_(*where_clauses))
        .order_by(desc(DataImport.created_at))
        .limit(page_size)
        .offset(offset)
    )
    
    result = await db.execute(query)
    imports = result.scalars().all()
    
    return {
        "imports": imports,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/{import_id}", response_model=DataImportResponse)
async def get_data_import(
    import_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed information about a specific import"""
    query = select(DataImport).where(
        and_(
            DataImport.id == import_id,
            DataImport.researcher_id == current_user.id
        )
    )
    result = await db.execute(query)
    data_import = result.scalar_one_or_none()
    
    if not data_import:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Import not found"
        )
    
    return data_import


@router.post("/{import_id}/retry", response_model=DataImportResponse)
async def retry_failed_import(
    import_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retry a failed import"""
    query = select(DataImport).where(
        and_(
            DataImport.id == import_id,
            DataImport.researcher_id == current_user.id
        )
    )
    result = await db.execute(query)
    data_import = result.scalar_one_or_none()
    
    if not data_import:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Import not found"
        )
    
    if data_import.ingest_status != DataImportStatus.FAILED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only failed imports can be retried"
        )
    
    if data_import.retry_count >= 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum retry attempts exceeded"
        )
    
    # Reset status to queued
    data_import.ingest_status = DataImportStatus.QUEUED
    data_import.error_message = None
    await db.commit()
    
    # Trigger background ingestion
    metadata = {
        'import_id': data_import.id,
        'institution_id': str(data_import.institution_id),
        'researcher_id': str(data_import.researcher_id),
        'project_id': str(data_import.project_id) if data_import.project_id else '',
        'source_tag': data_import.source_tag
    }
    
    background_tasks.add_task(
        trigger_bronze_ingestion,
        import_id=data_import.id,
        source_url=data_import.source_url,
        bronze_path=data_import.bronze_path,
        metadata=metadata,
        db_session=db
    )
    
    await db.refresh(data_import)
    return data_import


@router.post("/upload-excel", response_model=DataImportResponse, status_code=status.HTTP_201_CREATED)
async def upload_excel_file(
    file: UploadFile = File(...),
    institution_id: int = None,
    project_id: Optional[int] = None,
    source_tag: str = None,
    description: Optional[str] = None,
    priority: int = 5,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload Excel file (.xlsx/.xls) - saves metadata only, file stored temporarily
    Raw data will be ingested to MinIO Bronze by the background worker.
    """
    if not file.filename.lower().endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only Excel files (.xlsx, .xls) are supported"
        )

    if institution_id != current_user.primary_institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this institution"
        )

    if not source_tag:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="source_tag is required"
        )

    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    project_part = f"proj-{project_id}" if project_id else "no-project"
    file_ext = 'xlsx' if file.filename.lower().endswith('.xlsx') else 'xls'
    bronze_path = f"inst-{institution_id}/{project_part}/{source_tag}_{timestamp}.{file_ext}"

    file_content = await file.read()
    file_size = len(file_content)

    upload_dir = os.getenv("UPLOAD_DIR", "./uploads")
    os.makedirs(upload_dir, exist_ok=True)
    temp_file_path = os.path.join(upload_dir, f"{source_tag}_{timestamp}.{file_ext}")

    with open(temp_file_path, 'wb') as f:
        f.write(file_content)

    data_import = DataImport(
        institution_id=institution_id,
        researcher_id=current_user.id,
        project_id=project_id,
        source_url=f"file://{temp_file_path}",
        source_type=DataSourceType.EXCEL,
        source_tag=source_tag,
        file_name=file.filename,
        file_format=file_ext,
        description=description,
        priority=priority,
        file_size_bytes=file_size,
        ingest_status=DataImportStatus.QUEUED,
        bronze_path=bronze_path,
        bronze_bucket="dacoris-bronze",
        created_by=current_user.id
    )

    db.add(data_import)
    await db.commit()
    await db.refresh(data_import)

    return data_import


@router.delete("/{import_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_data_import(
    import_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete import metadata record
    Note: This does NOT delete the file from MinIO Bronze bucket
    """
    query = select(DataImport).where(
        and_(
            DataImport.id == import_id,
            DataImport.researcher_id == current_user.id
        )
    )
    result = await db.execute(query)
    data_import = result.scalar_one_or_none()
    
    if not data_import:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Import not found"
        )
    
    await db.delete(data_import)
    await db.commit()
    
    return None
