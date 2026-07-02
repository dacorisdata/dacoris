from datetime import date, datetime
import os
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import (
    Institution,
    PgProgressReport,
    PgReportType,
    PgStageStatus,
    PgSupervisorReport,
    User,
)
from routes.postgraduate.deps import require_supervisor
from routes.postgraduate.students import _authorize_student_access
from services.external_systems.excel_is_reader import get_excel_repository
from services.file_upload import get_file_path, save_upload
from services.pg.audit import log_pg_action
from services.pg.journey_service import list_students_for_institution, merge_student_payload
from services.pg.staff_linking import resolve_staff_id_for_user

router = APIRouter(prefix="/api/postgraduate/supervisor", tags=["postgraduate-supervisor"])

DELAY_REPORT_UPLOAD_SUBFOLDER = "pg_delay_reports"
VALID_RISK_LEVELS = {"low", "medium", "high", "critical"}


class ProgressValidation(BaseModel):
    supervisor_validation: str
    supervisor_rating: Optional[str] = None
    status: str = "approved"


def _parse_optional_date(value: Optional[str]) -> Optional[date]:
    if not value or not str(value).strip():
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date format")


def _student_snapshot_from_payload(payload: dict) -> dict:
    student = payload["external"]["student"]
    journey = payload["external"].get("journey") or {}
    expected = journey.get("expected_graduation") or student.get("expected_graduation_date")
    expected_date = None
    if expected:
        try:
            expected_date = date.fromisoformat(str(expected)[:10])
        except ValueError:
            expected_date = None
    current_stage = journey.get("current_stage") or student.get("current_stage_name")
    return {
        "student_name": student.get("full_name"),
        "programme_name": student.get("programme_name"),
        "department": student.get("department"),
        "cohort_year": student.get("cohort_year") or journey.get("cohort"),
        "stage_name": current_stage,
        "expected_completion_date": expected_date,
        "days_overdue": journey.get("days_overdue") or 0,
    }


def _serialize_delay_report(report: PgSupervisorReport) -> dict:
    return {
        "id": report.id,
        "student_id": report.student_id,
        "student_name": report.student_name,
        "programme_name": report.programme_name,
        "department": report.department,
        "cohort_year": report.cohort_year,
        "stage_name": report.stage_name,
        "expected_completion_date": report.expected_completion_date.isoformat() if report.expected_completion_date else None,
        "days_overdue": report.days_overdue,
        "primary_delay_category": report.primary_delay_category,
        "secondary_delay_category": report.secondary_delay_category,
        "narrative": report.narrative,
        "action_taken": report.action_taken,
        "recommended_intervention": report.recommended_intervention,
        "revised_milestone_date": report.revised_milestone_date.isoformat() if report.revised_milestone_date else None,
        "risk_level": report.risk_level,
        "escalation_needed": report.escalation_needed,
        "evidence_filename": report.evidence_filename,
        "has_evidence": bool(report.evidence_stored_filename),
        "created_at": report.created_at.isoformat() if report.created_at else None,
    }


@router.get("/me")
async def supervisor_me(
    ctx: tuple[User, Institution] = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    user, institution = ctx
    staff_id = await resolve_staff_id_for_user(db, user, institution)
    repo = get_excel_repository()
    staff = repo.get_staff(staff_id=staff_id, institution_name=institution.name, domain=institution.domain) if staff_id else None
    await db.commit()
    return {
        "user_id": user.id,
        "staff_id": staff_id,
        "staff": staff.model_dump(mode="json") if staff else None,
    }


@router.get("/dashboard")
async def supervisor_dashboard(
    ctx: tuple[User, Institution] = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    user, institution = ctx
    staff_id = await resolve_staff_id_for_user(db, user, institution)
    if not staff_id:
        return {"assigned_students": [], "pending_validations": 0, "overdue_students": []}

    repo = get_excel_repository()
    assignments = repo.get_supervisor_assignments(
        staff_id=staff_id,
        institution_name=institution.name,
        domain=institution.domain,
    )
    all_students = await list_students_for_institution(db, institution)
    student_map = {s["student_id"]: s for s in all_students}
    assigned = []
    overdue = []
    for assignment in assignments:
        summary = student_map.get(assignment.student_id)
        if not summary:
            continue
        assigned.append({**summary, "assignment": assignment.model_dump(mode="json")})
        if summary.get("days_overdue") and summary["days_overdue"] > 0:
            overdue.append(summary)

    pending_result = await db.execute(
        select(PgProgressReport).where(
            PgProgressReport.institution_id == institution.id,
            PgProgressReport.status == PgStageStatus.SUBMITTED,
        )
    )
    pending = pending_result.scalars().all()
    assigned_ids = {a.student_id for a in assignments}
    pending_count = sum(1 for p in pending if p.student_id in assigned_ids)

    await db.commit()
    return {
        "assigned_students": assigned,
        "pending_validations": pending_count,
        "overdue_students": overdue,
        "total_assigned": len(assigned),
    }


@router.get("/students")
async def supervisor_students(
    ctx: tuple[User, Institution] = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    user, institution = ctx
    staff_id = await resolve_staff_id_for_user(db, user, institution)
    repo = get_excel_repository()
    assignments = repo.get_supervisor_assignments(
        staff_id=staff_id,
        institution_name=institution.name,
        domain=institution.domain,
    ) if staff_id else []
    all_students = await list_students_for_institution(db, institution)
    student_map = {s["student_id"]: s for s in all_students}
    students = [student_map[a.student_id] for a in assignments if a.student_id in student_map]
    await db.commit()
    return {"students": students, "total": len(students)}


@router.get("/students/{student_id}")
async def supervisor_student_detail(
    student_id: str,
    ctx: tuple[User, Institution] = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    user, institution = ctx
    await _authorize_student_access(db, user, institution, student_id)
    payload = await merge_student_payload(db, institution, student_id)
    if not payload:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return payload


@router.get("/delay-reports")
async def list_delay_reports(
    ctx: tuple[User, Institution] = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    user, institution = ctx
    result = await db.execute(
        select(PgSupervisorReport).where(
            PgSupervisorReport.institution_id == institution.id,
            PgSupervisorReport.supervisor_user_id == user.id,
            PgSupervisorReport.report_type == PgReportType.DELAY_REPORT,
        ).order_by(PgSupervisorReport.created_at.desc())
    )
    reports = result.scalars().all()
    return {
        "reports": [_serialize_delay_report(r) for r in reports]
    }


@router.post("/delay-reports", status_code=201)
async def create_delay_report(
    student_id: str = Form(...),
    primary_delay_category: str = Form(...),
    narrative: str = Form(...),
    secondary_delay_category: Optional[str] = Form(None),
    action_taken: Optional[str] = Form(None),
    recommended_intervention: Optional[str] = Form(None),
    revised_milestone_date: Optional[str] = Form(None),
    risk_level: str = Form("medium"),
    escalation_needed: bool = Form(False),
    evidence: Optional[UploadFile] = File(None),
    ctx: tuple[User, Institution] = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    user, institution = ctx
    await _authorize_student_access(db, user, institution, student_id)

    if not primary_delay_category.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Primary delay category is required")
    if not narrative.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Narrative explanation is required")
    if risk_level.lower() not in VALID_RISK_LEVELS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid risk level")

    payload = await merge_student_payload(db, institution, student_id)
    if not payload:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    snapshot = _student_snapshot_from_payload(payload)

    evidence_filename = None
    evidence_stored_filename = None
    evidence_mime_type = None
    if evidence and evidence.filename:
        file_info = await save_upload(evidence, subfolder=DELAY_REPORT_UPLOAD_SUBFOLDER)
        evidence_filename = file_info["original_filename"]
        evidence_stored_filename = file_info["stored_filename"]
        evidence_mime_type = file_info.get("mime_type")

    report = PgSupervisorReport(
        institution_id=institution.id,
        student_id=student_id,
        supervisor_user_id=user.id,
        report_type=PgReportType.DELAY_REPORT,
        primary_delay_category=primary_delay_category.strip(),
        secondary_delay_category=(secondary_delay_category or "").strip() or None,
        narrative=narrative,
        action_taken=action_taken,
        recommended_intervention=recommended_intervention,
        revised_milestone_date=_parse_optional_date(revised_milestone_date),
        risk_level=risk_level.lower(),
        escalation_needed=escalation_needed,
        evidence_filename=evidence_filename,
        evidence_stored_filename=evidence_stored_filename,
        evidence_mime_type=evidence_mime_type,
        **snapshot,
    )
    db.add(report)
    await log_pg_action(
        db,
        institution_id=institution.id,
        entity_type="delay_report",
        entity_id=report.id,
        action="created",
        actor=user,
        student_id=student_id,
    )
    await db.commit()
    await db.refresh(report)
    return {"id": report.id, "message": "Delay report submitted"}


@router.get("/delay-reports/{report_id}")
async def get_delay_report(
    report_id: str,
    ctx: tuple[User, Institution] = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    user, institution = ctx
    result = await db.execute(
        select(PgSupervisorReport).where(
            PgSupervisorReport.id == report_id,
            PgSupervisorReport.institution_id == institution.id,
            PgSupervisorReport.supervisor_user_id == user.id,
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return _serialize_delay_report(report)


@router.get("/delay-reports/{report_id}/evidence")
async def download_delay_report_evidence(
    report_id: str,
    ctx: tuple[User, Institution] = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    user, institution = ctx
    result = await db.execute(
        select(PgSupervisorReport).where(
            PgSupervisorReport.id == report_id,
            PgSupervisorReport.institution_id == institution.id,
            PgSupervisorReport.supervisor_user_id == user.id,
        )
    )
    report = result.scalar_one_or_none()
    if not report or not report.evidence_stored_filename:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")

    path = get_file_path(report.evidence_stored_filename, DELAY_REPORT_UPLOAD_SUBFOLDER)
    if not os.path.isfile(path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file missing")

    return FileResponse(
        path,
        filename=report.evidence_filename or report.evidence_stored_filename,
        media_type=report.evidence_mime_type or "application/octet-stream",
    )


@router.post("/progress-reports/{report_id}/validate")
async def validate_progress_report(
    report_id: str,
    body: ProgressValidation,
    ctx: tuple[User, Institution] = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    user, institution = ctx
    result = await db.execute(
        select(PgProgressReport).where(
            PgProgressReport.id == report_id,
            PgProgressReport.institution_id == institution.id,
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Progress report not found")
    await _authorize_student_access(db, user, institution, report.student_id)
    report.supervisor_validation = body.supervisor_validation
    report.supervisor_rating = body.supervisor_rating
    report.validated_by_id = user.id
    report.validated_at = datetime.utcnow()
    report.status = PgStageStatus.APPROVED if body.status == "approved" else PgStageStatus.RETURNED_FOR_CORRECTION
    await log_pg_action(
        db,
        institution_id=institution.id,
        entity_type="progress_report",
        entity_id=report.id,
        action="validated",
        actor=user,
        student_id=report.student_id,
    )
    await db.commit()
    return {"id": report.id, "status": report.status.value}
