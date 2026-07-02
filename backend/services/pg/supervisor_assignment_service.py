from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Institution, PgSupervisorAssignment, PgSupervisorAssignmentStatus, User
from services.external_systems.excel_is_reader import ExcelISRepository, get_excel_repository
from services.pg.audit import log_pg_action


def _serialize_db_assignment(row: PgSupervisorAssignment) -> Dict[str, Any]:
    return {
        "id": row.id,
        "assignment_id": row.id,
        "student_id": row.student_id,
        "lead_supervisor_id": row.lead_supervisor_id,
        "lead_supervisor_name": row.lead_supervisor_name,
        "lead_supervisor_email": row.lead_supervisor_email,
        "co_supervisor_id": row.co_supervisor_id or "",
        "co_supervisor_name": row.co_supervisor_name or "",
        "co_supervisor_email": row.co_supervisor_email or "",
        "appointment_date": row.appointment_date.isoformat() if row.appointment_date else None,
        "status": row.status.value if row.status else None,
        "notes": row.notes or "",
        "source": "dacoris",
        "end_reason": row.end_reason,
    }


def _serialize_excel_assignment(item) -> Dict[str, Any]:
    data = item.model_dump(mode="json")
    data["source"] = "excel"
    data["id"] = item.assignment_id
    return data


async def get_merged_assignments(
    db: AsyncSession,
    institution: Institution,
    *,
    student_id: Optional[str] = None,
    staff_id: Optional[str] = None,
    repo: Optional[ExcelISRepository] = None,
) -> List[Dict[str, Any]]:
    repo = repo or get_excel_repository()
    inst_name, domain = institution.name, institution.domain

    query = select(PgSupervisorAssignment).where(
        PgSupervisorAssignment.institution_id == institution.id
    )
    if student_id:
        query = query.where(PgSupervisorAssignment.student_id == student_id)
    result = await db.execute(query.order_by(PgSupervisorAssignment.created_at.desc()))
    db_rows = result.scalars().all()

    db_active_students = {
        row.student_id
        for row in db_rows
        if row.status == PgSupervisorAssignmentStatus.ACTIVE
    }

    def _with_student_name(data: Dict[str, Any]) -> Dict[str, Any]:
        student = repo.get_student(data["student_id"], inst_name, domain)
        if student:
            data["student_name"] = student.full_name
            data["programme"] = student.programme_name
        return data

    merged: List[Dict[str, Any]] = [
        _with_student_name(_serialize_db_assignment(row)) for row in db_rows
    ]

    excel_items = repo.get_supervisor_assignments(
        student_id=student_id,
        staff_id=staff_id,
        institution_name=inst_name,
        domain=domain,
    )
    for item in excel_items:
        if item.student_id in db_active_students:
            continue
        merged.append(_with_student_name(_serialize_excel_assignment(item)))

    if staff_id:
        merged = [
            row for row in merged
            if row.get("lead_supervisor_id") == staff_id or row.get("co_supervisor_id") == staff_id
        ]

    return merged


def get_active_lead_supervisor(
    assignments: List[Dict[str, Any]],
    student_id: str,
) -> Optional[str]:
    for row in assignments:
        if row.get("student_id") != student_id:
            continue
        if (row.get("status") or "").lower() == "active" and row.get("lead_supervisor_name"):
            return row["lead_supervisor_name"]
    return None


def list_supervisors_for_institution(
    institution: Institution,
    repo: Optional[ExcelISRepository] = None,
) -> List[Dict[str, Any]]:
    repo = repo or get_excel_repository()
    staff = repo.get_staff_list(institution.name, institution.domain)
    items = []
    for member in staff:
        role = (member.role or "").lower()
        staff_type = (member.staff_type or "").lower()
        if "supervisor" in role or "supervisor" in staff_type or "lecturer" in role or "professor" in role:
            items.append({
                "staff_id": member.staff_id,
                "full_name": member.full_name,
                "email": member.email,
                "department": member.department,
                "active_msc_students": member.active_msc_students,
                "active_phd_students": member.active_phd_students,
                "total_supervisees": member.total_supervisees,
            })
    if not items:
        items = [{
            "staff_id": member.staff_id,
            "full_name": member.full_name,
            "email": member.email,
            "department": member.department,
            "active_msc_students": member.active_msc_students,
            "active_phd_students": member.active_phd_students,
            "total_supervisees": member.total_supervisees,
        } for member in staff]
    return sorted(items, key=lambda s: (s.get("full_name") or "").lower())


async def create_supervisor_assignment(
    db: AsyncSession,
    institution: Institution,
    actor: User,
    *,
    student_id: str,
    lead_supervisor_id: str,
    co_supervisor_id: Optional[str] = None,
    appointment_date: Optional[date] = None,
    notes: Optional[str] = None,
    repo: Optional[ExcelISRepository] = None,
) -> PgSupervisorAssignment:
    repo = repo or get_excel_repository()
    lead = repo.get_staff(lead_supervisor_id, institution_name=institution.name, domain=institution.domain)
    if not lead:
        raise ValueError("Lead supervisor not found in HR records")

    co = None
    if co_supervisor_id:
        co = repo.get_staff(co_supervisor_id, institution_name=institution.name, domain=institution.domain)
        if not co:
            raise ValueError("Co-supervisor not found in HR records")

    active_result = await db.execute(
        select(PgSupervisorAssignment).where(
            PgSupervisorAssignment.institution_id == institution.id,
            PgSupervisorAssignment.student_id == student_id,
            PgSupervisorAssignment.status == PgSupervisorAssignmentStatus.ACTIVE,
        )
    )
    for existing in active_result.scalars().all():
        existing.status = PgSupervisorAssignmentStatus.ENDED
        existing.ended_at = datetime.now(timezone.utc)
        existing.end_reason = "Reassigned via admin"

    assignment = PgSupervisorAssignment(
        institution_id=institution.id,
        student_id=student_id,
        lead_supervisor_id=lead.staff_id,
        lead_supervisor_name=lead.full_name,
        lead_supervisor_email=lead.email,
        co_supervisor_id=co.staff_id if co else None,
        co_supervisor_name=co.full_name if co else None,
        co_supervisor_email=co.email if co else None,
        appointment_date=appointment_date or date.today(),
        notes=notes,
        created_by_id=actor.id,
    )
    db.add(assignment)
    await log_pg_action(
        db,
        institution_id=institution.id,
        entity_type="supervisor_assignment",
        entity_id=assignment.id,
        action="assigned",
        actor=actor,
        student_id=student_id,
        new_value=f"{lead.full_name} ({lead.staff_id})",
    )
    return assignment


async def update_supervisor_assignment(
    db: AsyncSession,
    institution: Institution,
    actor: User,
    assignment_id: str,
    *,
    status: Optional[str] = None,
    co_supervisor_id: Optional[str] = None,
    notes: Optional[str] = None,
    end_reason: Optional[str] = None,
    repo: Optional[ExcelISRepository] = None,
) -> PgSupervisorAssignment:
    repo = repo or get_excel_repository()
    result = await db.execute(
        select(PgSupervisorAssignment).where(
            PgSupervisorAssignment.id == assignment_id,
            PgSupervisorAssignment.institution_id == institution.id,
        )
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise LookupError("Assignment not found")

    previous = assignment.status.value if assignment.status else None

    if status:
        assignment.status = PgSupervisorAssignmentStatus(status)
        if assignment.status == PgSupervisorAssignmentStatus.ENDED:
            assignment.ended_at = datetime.now(timezone.utc)
            assignment.end_reason = end_reason or "Ended by admin"

    if co_supervisor_id is not None:
        if co_supervisor_id == "":
            assignment.co_supervisor_id = None
            assignment.co_supervisor_name = None
            assignment.co_supervisor_email = None
        else:
            co = repo.get_staff(co_supervisor_id, institution_name=institution.name, domain=institution.domain)
            if not co:
                raise ValueError("Co-supervisor not found in HR records")
            assignment.co_supervisor_id = co.staff_id
            assignment.co_supervisor_name = co.full_name
            assignment.co_supervisor_email = co.email

    if notes is not None:
        assignment.notes = notes

    await log_pg_action(
        db,
        institution_id=institution.id,
        entity_type="supervisor_assignment",
        entity_id=assignment.id,
        action="updated",
        actor=actor,
        student_id=assignment.student_id,
        previous_value=previous,
        new_value=assignment.status.value if assignment.status else None,
        reason=end_reason,
    )
    return assignment
