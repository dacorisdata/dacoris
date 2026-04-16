from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from database import get_db
from models import EthicsApplication, EthicsStatus, ResearchProject, User
from auth import require_roles, ResearchRole
from services.workflow import can_transition_ethics
from services.notifications import create_notification

router = APIRouter(prefix="/api/research/ethics", tags=["ethics"])


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
    title: str
    submitted_at: Optional[datetime]
    approved_until: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=EthicsOut, status_code=201)
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
    return app


@router.get("/project/{project_id}", response_model=List[EthicsOut])
async def get_project_ethics(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.ETHICS_REVIEWER
    ]))
):
    result = await db.execute(
        select(EthicsApplication).where(EthicsApplication.project_id == project_id)
    )
    return result.scalars().all()


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
