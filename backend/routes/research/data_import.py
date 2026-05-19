from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import List, Optional
import json
from datetime import datetime, timedelta

from database import get_db
from models import (
    User, ResearchProject, DataImportRequest, DataImportRequestStatus,
    ResearchRole, Institution,
)
from auth import require_roles

router = APIRouter(prefix="/api/research/data-import", tags=["data-import"])

# ──── Schemas ────────────────────────────────────────────────────────────────────────
class DataImportRequestCreate(BaseModel):
    project_id: str
    justification: str
    requested_datasets: List[str]  # List of dataset identifiers/names
    access_duration_months: int

class DataImportRequestOut(BaseModel):
    id: str
    project_id: str
    project_title: str
    requester_id: str
    requester_name: str
    status: DataImportRequestStatus
    justification: str
    requested_datasets: List[str]
    access_duration_months: int
    approved_by_id: Optional[str] = None
    approved_by_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ──── Helpers ───────────────────────────────────────────────────────────────────────
def _enrich(req: DataImportRequest, db: AsyncSession) -> dict:
    """Serialize with project title and requester/approver names."""
    project = req.project
    requester = req.requester
    approver = req.approver
    return {
        "id": req.id,
        "project_id": req.project_id,
        "project_title": project.title if project else None,
        "requester_id": req.requester_id,
        "requester_name": requester.full_name if requester else None,
        "status": req.status,
        "justification": req.justification,
        "requested_datasets": json.loads(req.requested_datasets) if req.requested_datasets else [],
        "access_duration_months": req.access_duration_months,
        "approved_by_id": req.approved_by_id,
        "approved_by_name": approver.full_name if approver else None,
        "approved_at": req.approved_at,
        "rejection_reason": req.rejection_reason,
        "expires_at": req.expires_at,
        "created_at": req.created_at,
        "updated_at": req.updated_at,
    }

# ──── Routes ───────────────────────────────────────────────────────────────────────
@router.post("", response_model=DataImportRequestOut, status_code=status.HTTP_201_CREATED)
async def submit_data_import_request(
    payload: DataImportRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.CO_INVESTIGATOR]))
):
    # Verify the user is a member of the project (PI or co-investigator)
    project_query = select(ResearchProject).where(
        and_(
            ResearchProject.id == payload.project_id,
            ResearchProject.institution_id == current_user.primary_institution_id,
            or_(
                ResearchProject.pi_id == current_user.id,
                # Optionally check ProjectMember if you want to allow co-investigators
            )
        )
    )
    project_result = await db.execute(project_query)
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied."
        )

    # Check for existing pending request for the same project
    existing_query = select(DataImportRequest).where(
        and_(
            DataImportRequest.project_id == payload.project_id,
            DataImportRequest.requester_id == current_user.id,
            DataImportRequest.status.in_([DataImportRequestStatus.PENDING, DataImportRequestStatus.APPROVED])
        )
    )
    existing_result = await db.execute(existing_query)
    existing = existing_result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have a pending or approved import request for this project."
        )

    # Create the request
    db_request = DataImportRequest(
        project_id=payload.project_id,
        requester_id=current_user.id,
        justification=payload.justification,
        requested_datasets=json.dumps(payload.requested_datasets),
        access_duration_months=payload.access_duration_months,
    )
    db.add(db_request)
    await db.commit()
    await db.refresh(db_request)

    # Re-fetch with eager-loaded relationships
    refetch = await db.execute(
        select(DataImportRequest)
        .options(
            selectinload(DataImportRequest.project),
            selectinload(DataImportRequest.requester),
            selectinload(DataImportRequest.approver),
        )
        .where(DataImportRequest.id == db_request.id)
    )
    db_request = refetch.scalar_one()

    return _enrich(db_request, db)


@router.get("", response_model=List[DataImportRequestOut])
async def list_my_data_import_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.CO_INVESTIGATOR]))
):
    """List all data import requests submitted by the current researcher."""
    query = (
        select(DataImportRequest)
        .options(
            # Eager load relationships to avoid N+1
            selectinload(DataImportRequest.project),
            selectinload(DataImportRequest.requester),
            selectinload(DataImportRequest.approver),
        )
        .where(DataImportRequest.requester_id == current_user.id)
        .order_by(DataImportRequest.created_at.desc())
    )
    result = await db.execute(query)
    requests = result.scalars().all()
    return [_enrich(r, db) for r in requests]
