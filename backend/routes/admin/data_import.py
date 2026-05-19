from fastapi import APIRouter, Depends, HTTPException, status, Query
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

router = APIRouter(prefix="/api/admin/data-import", tags=["admin-data-import"])

# ──── Schemas ────────────────────────────────────────────────────────────────
class DataImportApproval(BaseModel):
    decision: DataImportRequestStatus  # approved | rejected
    rejection_reason: Optional[str] = None

class DataImportRequestOut(BaseModel):
    id: str
    project_id: str
    project_title: str
    requester_id: str
    requester_name: str
    requester_email: str
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

# ──── Helpers ───────────────────────────────────────────────────────────────
def _enrich(req: DataImportRequest, db: AsyncSession) -> dict:
    """Serialize with project title and requester/approver details."""
    project = req.project
    requester = req.requester
    approver = req.approver
    return {
        "id": req.id,
        "project_id": req.project_id,
        "project_title": project.title if project else None,
        "requester_id": req.requester_id,
        "requester_name": requester.full_name if requester else None,
        "requester_email": requester.email if requester else None,
        "status": req.status,
        "justification": req.justification,
        "requested_datasets": json.loads(req.requested_datasets) if isinstance(req.requested_datasets, str) else (req.requested_datasets or []),
        "access_duration_months": req.access_duration_months,
        "approved_by_id": req.approved_by_id,
        "approved_by_name": approver.full_name if approver else None,
        "approved_at": req.approved_at,
        "rejection_reason": req.rejection_reason,
        "expires_at": req.expires_at,
        "created_at": req.created_at,
        "updated_at": req.updated_at,
    }

# ──── Routes ───────────────────────────────────────────────────────────────
@router.get("", response_model=List[DataImportRequestOut])
async def list_data_import_requests(
    status_filter: Optional[str] = Query(None, description="Filter by status: pending, approved, rejected, expired"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.INSTITUTIONAL_LEAD, ResearchRole.GRANT_OFFICER]))
):
    """Admin view: all data import requests with optional status filter."""
    where_clauses = []
    if status_filter and status_filter in [s.value for s in DataImportRequestStatus]:
        where_clauses.append(DataImportRequest.status == status_filter)

    query = (
        select(DataImportRequest)
        .options(
            selectinload(DataImportRequest.project),
            selectinload(DataImportRequest.requester),
            selectinload(DataImportRequest.approver),
        )
        .where(and_(*where_clauses) if where_clauses else True)
        .order_by(DataImportRequest.created_at.desc())
    )
    result = await db.execute(query)
    requests = result.scalars().all()
    return [_enrich(r, db) for r in requests]


@router.post("/{request_id}/review", response_model=DataImportRequestOut)
async def review_data_import_request(
    request_id: str,
    payload: DataImportApproval,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.INSTITUTIONAL_LEAD, ResearchRole.GRANT_OFFICER]))
):
    """Approve or reject a data import request."""
    # Fetch request
    query = select(DataImportRequest).where(DataImportRequest.id == request_id)
    result = await db.execute(query)
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data import request not found."
        )
    if req.status != DataImportRequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This request has already been reviewed."
        )

    # Apply decision
    req.status = payload.decision
    req.approved_by_id = current_user.id
    req.approved_at = datetime.utcnow()
    if payload.decision == DataImportRequestStatus.APPROVED:
        # Set expiry based on requested duration
        req.expires_at = datetime.utcnow() + timedelta(days=req.access_duration_months * 30)
        req.rejection_reason = None
    else:
        req.rejection_reason = payload.rejection_reason
        req.expires_at = None

    await db.commit()

    # Re-fetch with eager-loaded relationships
    refetch = await db.execute(
        select(DataImportRequest)
        .options(
            selectinload(DataImportRequest.project),
            selectinload(DataImportRequest.requester),
            selectinload(DataImportRequest.approver),
        )
        .where(DataImportRequest.id == request_id)
    )
    req = refetch.scalar_one()

    return _enrich(req, db)
