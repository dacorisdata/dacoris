from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Institution, PgInterventionCase, PgInterventionStatus, User
from routes.postgraduate.deps import require_pg_admin
from services.pg.audit import log_pg_action

router = APIRouter(prefix="/api/postgraduate/interventions", tags=["postgraduate-interventions"])


class InterventionCreate(BaseModel):
    student_id: str
    category: str
    owner_role: Optional[str] = None
    stage_name: Optional[str] = None
    required_action: Optional[str] = None
    expected_outcome: Optional[str] = None
    due_date: Optional[date] = None


class InterventionUpdate(BaseModel):
    status: Optional[str] = None
    required_action: Optional[str] = None
    closure_reason: Optional[str] = None


@router.get("")
async def list_interventions(
    ctx: tuple[User, Institution] = Depends(require_pg_admin),
    db: AsyncSession = Depends(get_db),
):
    _, institution = ctx
    result = await db.execute(
        select(PgInterventionCase).where(
            PgInterventionCase.institution_id == institution.id
        ).order_by(PgInterventionCase.created_at.desc())
    )
    cases = result.scalars().all()
    return {
        "interventions": [
            {
                "id": c.id,
                "student_id": c.student_id,
                "category": c.category,
                "status": c.status.value if c.status else None,
                "stage_name": c.stage_name,
                "due_date": c.due_date.isoformat() if c.due_date else None,
                "required_action": c.required_action,
            }
            for c in cases
        ]
    }


@router.post("", status_code=201)
async def create_intervention(
    body: InterventionCreate,
    ctx: tuple[User, Institution] = Depends(require_pg_admin),
    db: AsyncSession = Depends(get_db),
):
    user, institution = ctx
    case = PgInterventionCase(
        institution_id=institution.id,
        student_id=body.student_id,
        category=body.category,
        owner_role=body.owner_role,
        stage_name=body.stage_name,
        required_action=body.required_action,
        expected_outcome=body.expected_outcome,
        due_date=body.due_date,
        created_by_id=user.id,
    )
    db.add(case)
    await log_pg_action(
        db,
        institution_id=institution.id,
        entity_type="intervention",
        entity_id=case.id,
        action="opened",
        actor=user,
        student_id=body.student_id,
    )
    await db.commit()
    await db.refresh(case)
    return {"id": case.id}


@router.patch("/{case_id}")
async def update_intervention(
    case_id: str,
    body: InterventionUpdate,
    ctx: tuple[User, Institution] = Depends(require_pg_admin),
    db: AsyncSession = Depends(get_db),
):
    user, institution = ctx
    result = await db.execute(
        select(PgInterventionCase).where(
            PgInterventionCase.id == case_id,
            PgInterventionCase.institution_id == institution.id,
        )
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intervention not found")
    if body.status:
        case.status = PgInterventionStatus(body.status)
    if body.required_action is not None:
        case.required_action = body.required_action
    if body.closure_reason is not None:
        case.closure_reason = body.closure_reason
    await log_pg_action(
        db,
        institution_id=institution.id,
        entity_type="intervention",
        entity_id=case.id,
        action="updated",
        actor=user,
        student_id=case.student_id,
    )
    await db.commit()
    return {"id": case.id, "status": case.status.value}
