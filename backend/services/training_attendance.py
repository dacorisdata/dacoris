"""Attendance-based training progress helpers."""
from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models import (
    TrainingProgram,
    TrainingEnrollment,
    TrainingEnrollmentStatus,
    TrainingAttendance,
    TrainingAttendanceStatus,
)


def program_session_count(program: TrainingProgram) -> int:
    if program.session_count and program.session_count > 0:
        return program.session_count
    hours = program.duration_hours or program.cpd_hours or 8
    return max(1, int(round(hours / 4)))


async def _attendance_counts(db: AsyncSession, enrollment_id: str) -> dict:
    rows = await db.execute(
        select(TrainingAttendance.status, func.count(TrainingAttendance.id))
        .where(TrainingAttendance.enrollment_id == enrollment_id)
        .group_by(TrainingAttendance.status)
    )
    counts = {row[0]: row[1] for row in rows.all()}
    return {
        "pending": counts.get(TrainingAttendanceStatus.PENDING, 0),
        "confirmed": counts.get(TrainingAttendanceStatus.CONFIRMED, 0),
        "rejected": counts.get(TrainingAttendanceStatus.REJECTED, 0),
    }


async def sync_enrollment_progress(
    db: AsyncSession,
    enrollment: TrainingEnrollment,
    issue_certificate_fn,
) -> None:
    """Recompute progress from confirmed attendance and complete when all sessions confirmed."""
    if not enrollment.program:
        return
    total = program_session_count(enrollment.program)
    counts = await _attendance_counts(db, enrollment.id)
    confirmed = counts["confirmed"]
    enrollment.progress_percentage = min(100.0, (confirmed / total) * 100) if total else 0

    if (
        enrollment.status == TrainingEnrollmentStatus.ACTIVE
        and confirmed >= total
        and counts["pending"] == 0
    ):
        enrollment.status = TrainingEnrollmentStatus.COMPLETED
        enrollment.completed_at = datetime.now(timezone.utc)
        enrollment.progress_percentage = 100
        if enrollment.program.certification_awarded:
            await issue_certificate_fn(db, enrollment)


def serialize_attendance(record: TrainingAttendance) -> dict:
    return {
        "id": record.id,
        "enrollment_id": record.enrollment_id,
        "session_number": record.session_number,
        "attendance_date": record.attendance_date.isoformat() if record.attendance_date else None,
        "status": record.status.value if hasattr(record.status, "value") else record.status,
        "marked_by_name": record.marked_by.name if record.marked_by else None,
        "marked_at": record.marked_at,
        "confirmed_by_name": record.confirmed_by.name if record.confirmed_by else None,
        "confirmed_at": record.confirmed_at,
        "manager_notes": record.manager_notes,
    }


async def attendance_summary_for_enrollment(db: AsyncSession, enrollment: TrainingEnrollment) -> dict:
    total = program_session_count(enrollment.program) if enrollment.program else 0
    counts = await _attendance_counts(db, enrollment.id)
    return {
        "session_count": total,
        "confirmed": counts["confirmed"],
        "pending": counts["pending"],
        "rejected": counts["rejected"],
    }
