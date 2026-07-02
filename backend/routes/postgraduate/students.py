from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User
from routes.postgraduate.deps import (
    is_pg_admin,
    is_pg_student,
    is_supervisor,
    require_pg_admin,
    require_university_institution,
)
from auth import get_current_active_user
from models import Institution
from services.pg.journey_service import list_students_for_institution, merge_student_payload, resolve_student_id_for_user
from services.pg.graduation_service import refresh_graduation_clearance

router = APIRouter(prefix="/api/postgraduate/students", tags=["postgraduate-students"])


@router.get("")
async def list_students(
    institution: Institution = Depends(require_university_institution),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if is_pg_admin(current_user):
        students = await list_students_for_institution(db, institution)
        return {"students": students, "total": len(students)}

    if is_supervisor(current_user):
        from services.pg.staff_linking import resolve_staff_id_for_user
        from services.pg.supervisor_assignment_service import get_merged_assignments

        staff_id = await resolve_staff_id_for_user(db, current_user, institution)
        if not staff_id:
            return {"students": [], "total": 0}
        assignments = await get_merged_assignments(
            db, institution, staff_id=staff_id,
        )
        student_ids = {a["student_id"] for a in assignments}
        all_students = await list_students_for_institution(db, institution)
        filtered = [s for s in all_students if s["student_id"] in student_ids]
        return {"students": filtered, "total": len(filtered)}

    student_id = await resolve_student_id_for_user(db, current_user, institution, commit=True)
    if not student_id:
        return {"students": [], "total": 0}
    payload = await merge_student_payload(db, institution, student_id)
    if not payload:
        return {"students": [], "total": 0}
    ext = payload["external"]["student"]
    return {
        "students": [{
            "student_id": ext["student_id"],
            "full_name": ext["full_name"],
            "programme_code": ext["programme_code"],
            "programme_name": ext["programme_name"],
            "degree_level": ext["degree_level"],
            "department": ext["department"],
            "current_stage_name": ext["current_stage_name"],
        }],
        "total": 1,
    }


@router.get("/me")
async def get_my_student_record(
    institution: Institution = Depends(require_university_institution),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    student_id = await resolve_student_id_for_user(db, current_user, institution, commit=True)
    if not student_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No postgraduate student record linked to this account")
    payload = await merge_student_payload(db, institution, student_id)
    if not payload:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return payload


@router.get("/{student_id}")
async def get_student(
    student_id: str,
    institution: Institution = Depends(require_university_institution),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _authorize_student_access(db, current_user, institution, student_id)
    payload = await merge_student_payload(db, institution, student_id)
    if not payload:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return payload


@router.get("/{student_id}/journey")
async def get_student_journey(
    student_id: str,
    institution: Institution = Depends(require_university_institution),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _authorize_student_access(db, current_user, institution, student_id)
    payload = await merge_student_payload(db, institution, student_id)
    if not payload:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return {
        "student_id": student_id,
        "journey_stages": payload["journey_stages"],
        "gates": payload["gates"],
        "external_journey": payload["external"].get("journey"),
    }


@router.get("/{student_id}/coursework")
async def get_student_coursework(
    student_id: str,
    institution: Institution = Depends(require_university_institution),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _authorize_student_access(db, current_user, institution, student_id)
    payload = await merge_student_payload(db, institution, student_id)
    if not payload:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return {
        "enrolments": payload["external"]["enrolments"],
        "programme_rules": payload["external"]["programme_rules"],
        "gate": payload["gates"]["gate_a_coursework"],
    }


@router.get("/{student_id}/finance")
async def get_student_finance(
    student_id: str,
    institution: Institution = Depends(require_university_institution),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _authorize_student_access(db, current_user, institution, student_id)
    payload = await merge_student_payload(db, institution, student_id)
    if not payload:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return {
        "account": payload["external"]["finance_account"],
        "transactions": payload["external"]["transactions"],
        "gate": payload["gates"]["gate_h_graduation"],
    }


@router.get("/{student_id}/graduation-clearance")
async def get_student_clearance(
    student_id: str,
    institution: Institution = Depends(require_university_institution),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _authorize_student_access(db, current_user, institution, student_id)
    payload = await merge_student_payload(db, institution, student_id)
    if not payload:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    programme_code = payload["external"]["student"]["programme_code"]
    result = await refresh_graduation_clearance(db, institution, student_id, programme_code)
    await db.commit()
    return result


async def _authorize_student_access(db, current_user, institution, student_id):
    if is_pg_admin(current_user):
        return
    if is_pg_student(current_user):
        own_id = await resolve_student_id_for_user(db, current_user, institution)
        if own_id != student_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        return
    if is_supervisor(current_user):
        from services.pg.staff_linking import resolve_staff_id_for_user
        from services.pg.supervisor_assignment_service import get_merged_assignments

        staff_id = await resolve_staff_id_for_user(db, current_user, institution)
        assignments = await get_merged_assignments(
            db, institution, student_id=student_id,
        )
        if not any(
            a.get("lead_supervisor_id") == staff_id or a.get("co_supervisor_id") == staff_id
            for a in assignments
        ):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
