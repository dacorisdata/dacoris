from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from routes.postgraduate.deps import require_pg_admin
from models import Institution, User
from services.pg.overdue_scan import run_pg_overdue_scan
from services.pg.supervisor_assignment_service import (
    create_supervisor_assignment,
    get_merged_assignments,
    list_supervisors_for_institution,
    update_supervisor_assignment,
)

router = APIRouter(prefix="/api/postgraduate/admin", tags=["postgraduate-admin"])


class SupervisorAssignmentCreate(BaseModel):
    student_id: str
    lead_supervisor_id: str
    co_supervisor_id: Optional[str] = None
    appointment_date: Optional[date] = None
    notes: Optional[str] = None


class SupervisorAssignmentUpdate(BaseModel):
    status: Optional[str] = None
    co_supervisor_id: Optional[str] = None
    notes: Optional[str] = None
    end_reason: Optional[str] = None


@router.post("/overdue-scan")
async def trigger_overdue_scan(
    ctx: tuple[User, Institution] = Depends(require_pg_admin),
    db: AsyncSession = Depends(get_db),
):
    _, institution = ctx
    return await run_pg_overdue_scan(db, institution)


@router.get("/supervisor-assignments")
async def list_supervisor_assignments(
    ctx: tuple[User, Institution] = Depends(require_pg_admin),
    db: AsyncSession = Depends(get_db),
):
    _, institution = ctx
    assignments = await get_merged_assignments(db, institution)
    return {"assignments": assignments, "total": len(assignments)}


@router.get("/supervisors")
async def list_supervisors(
    ctx: tuple[User, Institution] = Depends(require_pg_admin),
):
    _, institution = ctx
    supervisors = list_supervisors_for_institution(institution)
    return {"supervisors": supervisors, "total": len(supervisors)}


@router.post("/supervisor-assignments", status_code=201)
async def assign_supervisor(
    body: SupervisorAssignmentCreate,
    ctx: tuple[User, Institution] = Depends(require_pg_admin),
    db: AsyncSession = Depends(get_db),
):
    user, institution = ctx
    try:
        assignment = await create_supervisor_assignment(
            db,
            institution,
            user,
            student_id=body.student_id,
            lead_supervisor_id=body.lead_supervisor_id,
            co_supervisor_id=body.co_supervisor_id,
            appointment_date=body.appointment_date,
            notes=body.notes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    await db.commit()
    await db.refresh(assignment)
    return {"id": assignment.id, "student_id": assignment.student_id}


@router.patch("/supervisor-assignments/{assignment_id}")
async def patch_supervisor_assignment(
    assignment_id: str,
    body: SupervisorAssignmentUpdate,
    ctx: tuple[User, Institution] = Depends(require_pg_admin),
    db: AsyncSession = Depends(get_db),
):
    user, institution = ctx
    try:
        assignment = await update_supervisor_assignment(
            db,
            institution,
            user,
            assignment_id,
            status=body.status,
            co_supervisor_id=body.co_supervisor_id,
            notes=body.notes,
            end_reason=body.end_reason,
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    await db.commit()
    return {"id": assignment.id, "status": assignment.status.value if assignment.status else None}
