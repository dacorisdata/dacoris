from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Institution, PgInterventionCase, PgInterventionStatus, User
from routes.postgraduate.deps import require_pg_admin, require_supervisor
from services.pg.journey_service import list_students_for_institution
from services.pg.staff_linking import resolve_staff_id_for_user
from services.external_systems.excel_is_reader import get_excel_repository

router = APIRouter(prefix="/api/postgraduate/dashboards", tags=["postgraduate-dashboards"])


@router.get("/university")
async def university_dashboard(
    ctx: tuple[User, Institution] = Depends(require_pg_admin),
    db: AsyncSession = Depends(get_db),
):
    _, institution = ctx
    students = await list_students_for_institution(db, institution)
    stage_counts = Counter(s.get("current_stage_name") or "Unknown" for s in students)
    risk_counts = Counter(s.get("risk_level") or "Unknown" for s in students)
    at_risk = [s for s in students if (s.get("days_overdue") or 0) > 0 or (s.get("risk_level") or "").lower() in ("high", "critical", "medium")]

    intervention_result = await db.execute(
        select(PgInterventionCase).where(
            PgInterventionCase.institution_id == institution.id,
            PgInterventionCase.status != PgInterventionStatus.CLOSED,
        )
    )
    open_interventions = intervention_result.scalars().all()

    return {
        "total_students": len(students),
        "by_stage": dict(stage_counts),
        "by_risk": dict(risk_counts),
        "at_risk_students": at_risk,
        "open_interventions": len(open_interventions),
        "students": students,
    }


@router.get("/department")
async def department_dashboard(
    ctx: tuple[User, Institution] = Depends(require_pg_admin),
    db: AsyncSession = Depends(get_db),
):
    _, institution = ctx
    students = await list_students_for_institution(db, institution)
    dept_counts = Counter(s.get("department") or "Unknown" for s in students)
    return {"by_department": dict(dept_counts), "students": students}


@router.get("/supervisor")
async def supervisor_workload_dashboard(
    ctx: tuple[User, Institution] = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    user, institution = ctx
    staff_id = await resolve_staff_id_for_user(db, user, institution)
    repo = get_excel_repository()
    staff = repo.get_staff(staff_id=staff_id, institution_name=institution.name, domain=institution.domain) if staff_id else None
    await db.commit()
    return {"staff": staff.model_dump(mode="json") if staff else None}
