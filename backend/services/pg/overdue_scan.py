from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import (
    Institution,
    Notification,
    NotificationPriority,
    NotificationType,
    PgInterventionCase,
    PgInterventionStatus,
    PgStudentStageStatus,
    PgStageStatus,
    User,
)
from services.external_systems.excel_is_reader import get_excel_repository
from services.pg.journey_service import list_students_for_institution


async def run_pg_overdue_scan(db: AsyncSession, institution: Institution) -> dict:
    students = await list_students_for_institution(db, institution)
    repo = get_excel_repository()
    overdue_count = 0
    notifications_created = 0
    interventions_created = 0

    for summary in students:
        days_overdue = summary.get("days_overdue") or 0
        if days_overdue <= 0:
            continue
        overdue_count += 1
        student_id = summary["student_id"]

        stage_result = await db.execute(
            select(PgStudentStageStatus).where(
                PgStudentStageStatus.institution_id == institution.id,
                PgStudentStageStatus.student_id == student_id,
                PgStudentStageStatus.stage_name == summary.get("current_stage_name"),
            )
        )
        stage = stage_result.scalar_one_or_none()
        if stage:
            stage.is_overdue = True
            stage.status = PgStageStatus.OVERDUE
        else:
            db.add(
                PgStudentStageStatus(
                    institution_id=institution.id,
                    student_id=student_id,
                    stage_order=summary.get("current_stage_no") or 0,
                    stage_name=summary.get("current_stage_name") or "Unknown",
                    status=PgStageStatus.OVERDUE,
                    is_overdue=True,
                )
            )

        existing = await db.execute(
            select(PgInterventionCase).where(
                PgInterventionCase.institution_id == institution.id,
                PgInterventionCase.student_id == student_id,
                PgInterventionCase.status != PgInterventionStatus.CLOSED,
                PgInterventionCase.category == "overdue_stage",
            )
        )
        if not existing.scalar_one_or_none():
            db.add(
                PgInterventionCase(
                    institution_id=institution.id,
                    student_id=student_id,
                    category="overdue_stage",
                    stage_name=summary.get("current_stage_name"),
                    required_action="Supervisor delay report required",
                    status=PgInterventionStatus.OPEN,
                )
            )
            interventions_created += 1

        journey = repo.get_journey(student_id, institution.name, institution.domain)
        if journey and journey.lead_supervisor:
            staff = repo.get_staff_list(institution.name, institution.domain)
            supervisor = next((s for s in staff if s.full_name == journey.lead_supervisor), None)
            if supervisor and supervisor.email:
                user_result = await db.execute(select(User).where(User.email == supervisor.email))
                supervisor_user = user_result.scalar_one_or_none()
                if supervisor_user:
                    db.add(
                        Notification(
                            recipient_id=supervisor_user.id,
                            type=NotificationType.SYSTEM_ANNOUNCEMENT,
                            priority=NotificationPriority.HIGH,
                            title="Postgraduate stage overdue",
                            message=(
                                f"Student {summary.get('full_name')} is {days_overdue} days overdue "
                                f"at stage {summary.get('current_stage_name')}. Delay report required."
                            ),
                            action_url=f"/researcher/postgraduate/supervisor/students/{student_id}",
                            related_entity_type="pg_student",
                            related_entity_id=student_id,
                        )
                    )
                    notifications_created += 1

    await db.commit()
    return {
        "scanned_at": datetime.utcnow().isoformat(),
        "overdue_count": overdue_count,
        "notifications_created": notifications_created,
        "interventions_created": interventions_created,
    }
