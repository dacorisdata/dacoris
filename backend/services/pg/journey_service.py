from __future__ import annotations

from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Institution, PgStudentProfile, PgStudentStageStatus, User
from services.external_systems.excel_is_reader import ExcelISRepository, get_excel_repository
from services.pg.stage_gate_engine import DEFAULT_STAGES, StageGateEngine, load_db_state
from services.pg.student_linking import resolve_student_id_for_user
from services.pg.supervisor_assignment_service import get_active_lead_supervisor, get_merged_assignments


def _institution_filters(institution: Institution) -> tuple[str, str]:
    return institution.name, institution.domain


async def merge_student_payload(
    db: AsyncSession,
    institution: Institution,
    student_id: str,
    repo: Optional[ExcelISRepository] = None,
) -> Optional[Dict[str, Any]]:
    repo = repo or get_excel_repository()
    inst_name, domain = _institution_filters(institution)

    student = repo.get_student(student_id, inst_name, domain)
    if not student:
        return None

    journey = repo.get_journey(student_id, inst_name, domain)
    enrolments = repo.get_enrolments(student_id, inst_name, domain)
    account = repo.get_finance_account(student_id, inst_name, domain)
    transactions = repo.get_transactions(student_id, inst_name, domain)
    assignments = repo.get_supervisor_assignments(student_id=student_id, institution_name=inst_name, domain=domain)
    db_assignments = await get_merged_assignments(db, institution, student_id=student_id, repo=repo)
    if db_assignments:
        assignments_data = db_assignments
    else:
        assignments_data = [a.model_dump(mode="json") for a in assignments]
    rules = repo.get_programme_rules(student.programme_code, inst_name, domain)
    programme = repo.get_programme(student.programme_code, inst_name, domain)

    db_state = await load_db_state(db, institution.id, student_id)
    db_state["supervisor_assignments"] = assignments_data
    gates = StageGateEngine(repo, inst_name, domain).evaluate_gates(
        student_id,
        student.programme_code,
        db_state,
    )

    profile_result = await db.execute(
        select(PgStudentProfile).where(
            PgStudentProfile.institution_id == institution.id,
            PgStudentProfile.student_id == student_id,
        )
    )
    profile = profile_result.scalar_one_or_none()

    stage_result = await db.execute(
        select(PgStudentStageStatus).where(
            PgStudentStageStatus.institution_id == institution.id,
            PgStudentStageStatus.student_id == student_id,
        ).order_by(PgStudentStageStatus.stage_order)
    )
    orchestration_stages = stage_result.scalars().all()

    journey_stages = []
    if journey:
        for stage in journey.stages:
            orch = next((s for s in orchestration_stages if s.stage_order == stage.stage_no), None)
            journey_stages.append({
                "stage_no": stage.stage_no,
                "stage_name": stage.stage_name,
                "excel_status": stage.status,
                "excel_date": stage.stage_date.isoformat() if stage.stage_date else None,
                "extra": stage.extra,
                "orchestration_status": orch.status.value if orch and orch.status else None,
                "is_overdue": orch.is_overdue if orch else False,
            })

    return {
        "external": {
            "student": student.model_dump(mode="json"),
            "journey": journey.model_dump(mode="json") if journey else None,
            "enrolments": [e.model_dump(mode="json") for e in enrolments],
            "finance_account": account.model_dump(mode="json") if account else None,
            "transactions": [t.model_dump(mode="json") for t in transactions],
            "supervisor_assignments": assignments_data,
            "programme": programme.model_dump(mode="json") if programme else None,
            "programme_rules": [r.model_dump(mode="json") for r in rules],
        },
        "orchestration": {
            "profile_id": profile.id if profile else None,
            "research_project_id": profile.research_project_id if profile else None,
            "stage_statuses": [
                {
                    "stage_order": s.stage_order,
                    "stage_name": s.stage_name,
                    "status": s.status.value if s.status else None,
                    "is_overdue": s.is_overdue,
                }
                for s in orchestration_stages
            ],
            "proposal": db_state.get("proposal"),
            "defense": db_state.get("defense"),
            "clearance": db_state.get("clearance"),
        },
        "gates": gates,
        "journey_stages": journey_stages,
    }


async def list_students_for_institution(
    db: AsyncSession,
    institution: Institution,
    repo: Optional[ExcelISRepository] = None,
) -> List[Dict[str, Any]]:
    repo = repo or get_excel_repository()
    inst_name, domain = _institution_filters(institution)
    students = repo.get_students(inst_name, domain)
    merged_assignments = await get_merged_assignments(db, institution, repo=repo) if db else []
    items: List[Dict[str, Any]] = []
    for student in students:
        journey = repo.get_journey(student.student_id, inst_name, domain)
        lead_supervisor = get_active_lead_supervisor(merged_assignments, student.student_id)
        if not lead_supervisor and journey:
            lead_supervisor = journey.lead_supervisor
        items.append({
            "student_id": student.student_id,
            "full_name": student.full_name,
            "programme_code": student.programme_code,
            "programme_name": student.programme_name,
            "degree_level": student.degree_level,
            "department": student.department,
            "cohort_year": student.cohort_year,
            "current_stage_name": student.current_stage_name,
            "current_stage_no": student.current_stage_no,
            "status": student.status,
            "risk_level": journey.risk_level if journey else None,
            "days_overdue": journey.days_overdue if journey else None,
            "lead_supervisor": lead_supervisor,
            "overall_status": journey.overall_status if journey else None,
        })
    return items

