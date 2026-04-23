from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import os, uuid, shutil

from database import get_db
from models import (EthicsApplication, EthicsStatus, EthicsDocument,
                    ResearchProject, User)
from auth import require_roles, ResearchRole
from services.workflow import can_transition_ethics
from services.notifications import create_notification

router = APIRouter(prefix="/api/research/ethics", tags=["ethics"])

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/tmp/uploads/ethics")
os.makedirs(UPLOAD_DIR, exist_ok=True)

_ETHICS_LOAD = [
    selectinload(EthicsApplication.project),
    selectinload(EthicsApplication.submitted_by),
    selectinload(EthicsApplication.documents).selectinload(EthicsDocument.uploaded_by),
]

ETHICS_STAGES = [
    "submitted", "screened", "assigned", "under_review", "decision", "final_approval"
]


class EthicsCreate(BaseModel):
    project_id: int
    application_type: str = "full_review"
    title: str
    lay_summary: Optional[str] = None
    methodology: Optional[str] = None
    risk_assessment: Optional[str] = None
    data_handling: Optional[str] = None


class EthicsOut(BaseModel):
    id: int
    project_id: int
    application_type: str
    status: str
    title: Optional[str]
    submitted_at: Optional[datetime]
    approved_until: Optional[datetime]
    created_at: datetime
    project_title: Optional[str] = None
    stage_index: int = 0
    document_count: int = 0

    class Config:
        from_attributes = True


def _serialize_ethics(app: EthicsApplication) -> dict:
    status_val = app.status.value if hasattr(app.status, "value") else app.status
    stage_idx = ETHICS_STAGES.index(status_val) if status_val in ETHICS_STAGES else 0
    return {
        "id": app.id,
        "project_id": app.project_id,
        "application_type": app.application_type,
        "status": status_val,
        "title": app.title,
        "lay_summary": app.lay_summary,
        "methodology": app.methodology,
        "risk_assessment": app.risk_assessment,
        "data_handling": app.data_handling,
        "submitted_at": app.submitted_at,
        "approved_until": app.approved_until,
        "decision_notes": app.decision_notes,
        "created_at": app.created_at,
        "project_title": app.project.title if app.project else None,
        "submitted_by_name": app.submitted_by.name if app.submitted_by else None,
        "stage_index": stage_idx,
        "document_count": len(app.documents) if app.documents else 0,
        "documents": [
            {
                "id": d.id, "document_type": d.document_type,
                "original_filename": d.original_filename,
                "file_size_bytes": d.file_size_bytes,
                "uploaded_at": d.uploaded_at,
                "uploaded_by_name": d.uploaded_by.name if d.uploaded_by else None,
            }
            for d in (app.documents or [])
        ],
    }


@router.get("/my")
async def list_my_applications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    result = await db.execute(
        select(EthicsApplication)
        .where(EthicsApplication.submitted_by_id == current_user.id)
        .options(*_ETHICS_LOAD)
        .order_by(EthicsApplication.created_at.desc())
    )
    return [_serialize_ethics(a) for a in result.scalars().all()]


@router.post("", status_code=201)
async def submit_ethics_application(
    data: EthicsCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    project = await db.get(ResearchProject, data.project_id)
    if not project or project.institution_id != current_user.primary_institution_id:
        raise HTTPException(404, "Project not found")

    app = EthicsApplication(
        institution_id=current_user.primary_institution_id,
        submitted_by_id=current_user.id,
        status=EthicsStatus.SUBMITTED,
        submitted_at=datetime.now(timezone.utc),
        **data.model_dump()
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)

    result = await db.execute(
        select(EthicsApplication).where(EthicsApplication.id == app.id).options(*_ETHICS_LOAD)
    )
    return _serialize_ethics(result.scalar_one())


@router.get("/project/{project_id}")
async def get_project_ethics(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.ETHICS_REVIEWER
    ]))
):
    result = await db.execute(
        select(EthicsApplication)
        .where(EthicsApplication.project_id == project_id)
        .options(*_ETHICS_LOAD)
        .order_by(EthicsApplication.created_at.desc())
    )
    return [_serialize_ethics(a) for a in result.scalars().all()]


@router.post("/{app_id}/documents", status_code=201)
async def upload_ethics_document(
    app_id: int,
    document_type: str = Form("protocol"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    result = await db.execute(select(EthicsApplication).where(EthicsApplication.id == app_id))
    app = result.scalar_one_or_none()
    if not app or app.institution_id != current_user.primary_institution_id:
        raise HTTPException(404, "Application not found")

    ext = os.path.splitext(file.filename or "")[1]
    stored = f"{uuid.uuid4().hex}{ext}"
    dest = os.path.join(UPLOAD_DIR, stored)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    doc = EthicsDocument(
        application_id=app_id,
        document_type=document_type,
        original_filename=file.filename,
        stored_filename=stored,
        file_size_bytes=os.path.getsize(dest),
        mime_type=file.content_type,
        uploaded_by_id=current_user.id,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return {"id": doc.id, "original_filename": doc.original_filename}


@router.patch("/{app_id}/decision")
async def update_ethics_decision(
    app_id: int,
    target_status: EthicsStatus,
    decision_notes: Optional[str] = None,
    approved_until: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.ETHICS_REVIEWER
    ]))
):
    app = await db.get(EthicsApplication, app_id)
    if not app or app.institution_id != current_user.primary_institution_id:
        raise HTTPException(404, "Application not found")

    if not can_transition_ethics(app.status, target_status):
        raise HTTPException(400, f"Cannot move from {app.status} to {target_status}")

    app.status = target_status
    app.decision_notes = decision_notes
    if approved_until:
        app.approved_until = approved_until

    await db.commit()

    await create_notification(
        db, app.submitted_by_id,
        title=f"Ethics application: {target_status.value.replace('_', ' ').title()}",
        message=f'Your ethics application "{app.title}" has a new decision: {target_status.value}',
        entity_type="ethics", entity_id=app_id
    )
    return {"id": app_id, "status": target_status}
