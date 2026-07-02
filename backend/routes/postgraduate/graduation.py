from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Institution, User
from routes.postgraduate.deps import require_pg_admin
from services.pg.graduation_service import refresh_graduation_clearance
from services.pg.journey_service import list_students_for_institution
from services.external_systems.excel_is_reader import get_excel_repository

router = APIRouter(prefix="/api/postgraduate/graduation-clearance", tags=["postgraduate-graduation"])


@router.get("")
async def list_clearance(
    ctx: tuple[User, Institution] = Depends(require_pg_admin),
    db: AsyncSession = Depends(get_db),
):
    _, institution = ctx
    repo = get_excel_repository()
    students = await list_students_for_institution(db, institution, repo)
    clearances = []
    for student in students:
        sid = student["student_id"]
        ext = repo.get_student(sid, institution.name, institution.domain)
        if not ext:
            continue
        data = await refresh_graduation_clearance(db, institution, sid, ext.programme_code, repo)
        clearances.append({
            "student_id": sid,
            "full_name": student["full_name"],
            "lead_supervisor": student.get("lead_supervisor"),
            "programme_name": student["programme_name"],
            "department": student.get("department"),
            **data["clearance"],
        })
    await db.commit()
    return {"clearances": clearances}
