from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_active_user
from database import get_db
from models import Institution, PgProgressReport, PgStageStatus, User
from routes.postgraduate.deps import require_university_institution
from services.pg.audit import log_pg_action
from services.pg.journey_service import resolve_student_id_for_user

router = APIRouter(prefix="/api/postgraduate/progress-reports", tags=["postgraduate-progress"])


class ProgressReportCreate(BaseModel):
    current_stage: Optional[str] = None
    activities_completed: Optional[str] = None
    challenges: Optional[str] = None
    requested_support: Optional[str] = None
    next_planned_activity: Optional[str] = None


@router.get("")
async def list_progress_reports(
    institution: Institution = Depends(require_university_institution),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    student_id = await resolve_student_id_for_user(db, current_user, institution)
    query = select(PgProgressReport).where(PgProgressReport.institution_id == institution.id)
    if student_id:
        query = query.where(PgProgressReport.student_id == student_id)
    result = await db.execute(query.order_by(PgProgressReport.created_at.desc()))
    reports = result.scalars().all()
    return {
        "reports": [
            {
                "id": r.id,
                "student_id": r.student_id,
                "current_stage": r.current_stage,
                "status": r.status.value if r.status else None,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "supervisor_validation": r.supervisor_validation,
            }
            for r in reports
        ]
    }


@router.post("", status_code=201)
async def create_progress_report(
    body: ProgressReportCreate,
    institution: Institution = Depends(require_university_institution),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    student_id = await resolve_student_id_for_user(db, current_user, institution, commit=True)
    if not student_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No student record linked to this account")
    report = PgProgressReport(
        institution_id=institution.id,
        student_id=student_id,
        user_id=current_user.id,
        current_stage=body.current_stage,
        activities_completed=body.activities_completed,
        challenges=body.challenges,
        requested_support=body.requested_support,
        next_planned_activity=body.next_planned_activity,
        status=PgStageStatus.SUBMITTED,
    )
    db.add(report)
    await log_pg_action(
        db,
        institution_id=institution.id,
        entity_type="progress_report",
        entity_id=report.id,
        action="submitted",
        actor=current_user,
        student_id=student_id,
    )
    await db.commit()
    await db.refresh(report)
    return {"id": report.id, "status": report.status.value}
