"""
MinIO Ingest Queue Endpoints

These endpoints are used by the MinIO ingest service to:
- Pull queued imports from Dacoris
- Update ingestion status
- Report errors
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import os

from database import get_db
from models import DataImport, DataImportStatus

router = APIRouter(prefix="/api/ingest", tags=["ingest-queue"])

# ──── Schemas ────────────────────────────────────────────────────────────────

class QueuedImportResponse(BaseModel):
    import_id: str = Field(alias='id')
    institution_id: str
    researcher_id: str
    project_id: Optional[str]
    source_url: Optional[str]
    source_type: str
    source_tag: str
    file_name: Optional[str]
    file_format: Optional[str]
    bronze_path: Optional[str]
    bronze_bucket: Optional[str]
    priority: int
    file_size_bytes: Optional[int]
    status: str = Field(validation_alias='ingest_status')
    metadata_json: Optional[str] = None
    created_at: datetime
    retry_count: int
    
    class Config:
        from_attributes = True
        populate_by_name = True

class QueuedImportsListResponse(BaseModel):
    imports: List[QueuedImportResponse]
    total: int
    timestamp: datetime

class IngestStatusUpdate(BaseModel):
    import_id: str
    status: str  # 'ingesting', 'ingested', 'failed'
    bronze_path: Optional[str] = None
    file_size_bytes: Optional[int] = None
    record_count: Optional[int] = None
    error_message: Optional[str] = None

class IngestStatusResponse(BaseModel):
    success: bool
    import_id: str
    updated_at: datetime

# ──── Authentication ─────────────────────────────────────────────────────────

_bearer = HTTPBearer()

def verify_ingest_api_key(credentials: HTTPAuthorizationCredentials = Depends(_bearer)):
    """Verify API key for MinIO ingest service"""
    expected_key = os.getenv("INGEST_API_KEY", "dev-ingest-key-change-in-production")
    
    if credentials.credentials != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    return True

# ──── Routes ─────────────────────────────────────────────────────────────────

@router.get("/queued-imports", response_model=QueuedImportsListResponse)
async def get_queued_imports(
    status_filter: str = "queued,pending",
    limit: int = 100,
    priority_order: bool = True,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_ingest_api_key)
):
    """
    Get list of queued imports for MinIO to process
    
    Authentication: Requires INGEST_API_KEY in Authorization header
    
    Query Parameters:
    - status_filter: Comma-separated list of statuses (default: "queued,pending")
    - limit: Maximum number of imports to return (default: 100)
    - priority_order: Sort by priority desc, then created_at asc (default: true)
    """
    # Parse status filter
    statuses = [s.strip().upper() for s in status_filter.split(',')]
    valid_statuses = []
    for s in statuses:
        try:
            valid_statuses.append(DataImportStatus[s])
        except KeyError:
            pass  # Skip invalid statuses
    
    if not valid_statuses:
        valid_statuses = [DataImportStatus.QUEUED, DataImportStatus.PENDING]
    
    # Build query
    query = select(DataImport).where(DataImport.ingest_status.in_(valid_statuses))
    
    # Apply ordering
    if priority_order:
        query = query.order_by(
            desc(DataImport.priority),
            DataImport.created_at.asc()
        )
    else:
        query = query.order_by(DataImport.created_at.asc())
    
    query = query.limit(limit)
    
    # Execute query
    result = await db.execute(query)
    imports = result.scalars().all()
    
    return {
        "imports": imports,
        "total": len(imports),
        "timestamp": datetime.utcnow()
    }


@router.post("/update-status", response_model=IngestStatusResponse)
async def update_import_status(
    payload: IngestStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_ingest_api_key)
):
    """
    Update ingestion status for an import
    
    Called by MinIO ingest service to report:
    - Ingestion started (status: 'ingesting')
    - Ingestion completed (status: 'ingested')
    - Ingestion failed (status: 'failed')
    
    Authentication: Requires INGEST_API_KEY in Authorization header
    """
    # Find import record
    query = select(DataImport).where(DataImport.id == payload.import_id)
    result = await db.execute(query)
    data_import = result.scalar_one_or_none()
    
    if not data_import:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Import {payload.import_id} not found"
        )
    
    # Update status
    try:
        new_status = DataImportStatus[payload.status.upper()]
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: {payload.status}"
        )
    
    data_import.ingest_status = new_status
    
    # Update fields based on status
    if new_status == DataImportStatus.INGESTING:
        data_import.ingest_triggered_at = datetime.utcnow()
        data_import.error_message = None
    
    elif new_status == DataImportStatus.INGESTED:
        data_import.ingest_completed_at = datetime.utcnow()
        if payload.bronze_path:
            data_import.bronze_path = payload.bronze_path
        if payload.file_size_bytes:
            data_import.file_size_bytes = payload.file_size_bytes
        if payload.record_count:
            data_import.record_count = payload.record_count
        data_import.error_message = None
    
    elif new_status == DataImportStatus.FAILED:
        data_import.error_message = payload.error_message or "Ingestion failed"
        data_import.retry_count += 1
        data_import.last_retry_at = datetime.utcnow()
    
    data_import.updated_at = datetime.utcnow()
    
    await db.commit()
    
    return {
        "success": True,
        "import_id": payload.import_id,
        "updated_at": datetime.utcnow()
    }


@router.get("/health")
async def ingest_health_check():
    """Health check endpoint for MinIO ingest service"""
    return {
        "status": "healthy",
        "service": "dacoris-ingest-queue",
        "timestamp": datetime.utcnow().isoformat()
    }
