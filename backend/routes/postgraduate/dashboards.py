from collections import Counter, defaultdict
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import (
    Institution,
    PgGraduationClearance,
    PgInterventionCase,
    PgInterventionStatus,
    PgReportType,
    PgSupervisorReport,
    User,
)
from routes.postgraduate.deps import require_pg_admin, require_supervisor
from services.pg.journey_service import list_students_for_institution
from services.pg.staff_linking import resolve_staff_id_for_user
from services.external_systems.excel_is_reader import get_excel_repository

router = APIRouter(prefix="/api/postgraduate/dashboards", tags=["postgraduate-dashboards"])

STAGE_ORDER = [
    "Coursework",
    "Proposal Development",
    "Proposal Defense",
    "Data Collection",
    "Thesis Writing",
    "Publication",
    "Thesis Defense",
    "Graduation",
]

LATE_STAGES = {"publication", "thesis writing", "thesis defense", "graduation", "corrections"}


def _is_msc(degree_level: Optional[str]) -> bool:
    d = (degree_level or "").lower()
    return "msc" in d or "master" in d or "m.sc" in d


def _is_phd(degree_level: Optional[str]) -> bool:
    d = (degree_level or "").lower()
    return "phd" in d or "doctor" in d or "dphil" in d


def _normalize_stage(stage_name: Optional[str]) -> str:
    name = (stage_name or "Unknown").strip()
    lower = name.lower()
    for canonical in STAGE_ORDER:
        if canonical.lower() in lower or lower in canonical.lower():
            return canonical
    if "proposal" in lower and "defense" not in lower:
        return "Proposal Development"
    if "ethics" in lower:
        return "Data Collection"
    if "data" in lower:
        return "Data Collection"
    if "defense" in lower or "defence" in lower:
        return "Thesis Defense"
    if "correction" in lower:
        return "Graduation"
    return name


def _build_department_bottlenecks(students: list) -> list[dict]:
    dept_overdue: Counter = Counter()
    dept_stage: dict[str, Counter] = defaultdict(Counter)
    for student in students:
        overdue = student.get("days_overdue") or 0
        if overdue <= 0:
            continue
        dept = student.get("department") or "Unknown"
        dept_overdue[dept] += 1
        dept_stage[dept][_normalize_stage(student.get("current_stage_name"))] += 1

    rows = []
    for dept, count in dept_overdue.most_common(8):
        top_stage = dept_stage[dept].most_common(1)
        rows.append({
            "department": dept,
            "overdue_count": count,
            "top_block_stage": top_stage[0][0] if top_stage else None,
            "top_block_count": top_stage[0][1] if top_stage else 0,
        })
    return rows


def _build_supervisor_workload(students: list) -> list[dict]:
    workload: dict[str, dict] = {}
    for student in students:
        supervisor = student.get("lead_supervisor") or "Unassigned"
        entry = workload.setdefault(supervisor, {
            "supervisor": supervisor,
            "assigned_students": 0,
            "at_risk": 0,
            "overdue": 0,
        })
        entry["assigned_students"] += 1
        if (student.get("days_overdue") or 0) > 0:
            entry["overdue"] += 1
        if (student.get("risk_level") or "").lower() in ("high", "critical", "medium"):
            entry["at_risk"] += 1

    return sorted(
        workload.values(),
        key=lambda row: (row["at_risk"], row["overdue"], row["assigned_students"]),
        reverse=True,
    )[:10]


def _build_stage_distribution(stage_counts: Counter) -> list[dict]:
    normalized: Counter = Counter()
    for stage, count in stage_counts.items():
        normalized[_normalize_stage(stage)] += count

    ordered = []
    seen = set()
    for stage in STAGE_ORDER:
        if stage in normalized:
            ordered.append({"stage": stage, "count": normalized[stage]})
            seen.add(stage)
    for stage, count in sorted(normalized.items()):
        if stage not in seen:
            ordered.append({"stage": stage, "count": count})
    return ordered


def _build_completion_forecast(students: list) -> dict:
    defense_ready = 0
    graduation_ready = 0
    needs_intervention = 0
    for student in students:
        stage = (student.get("current_stage_name") or "").lower()
        risk = (student.get("risk_level") or "").lower()
        overdue = student.get("days_overdue") or 0
        if "defense" in stage or "defence" in stage:
            defense_ready += 1
        if "graduation" in stage or student.get("overall_status", "").lower() == "completed":
            graduation_ready += 1
        if overdue > 30 or risk in ("high", "critical"):
            needs_intervention += 1
        elif any(token in stage for token in LATE_STAGES) and overdue > 0:
            needs_intervention += 1
    return {
        "expected_defenses": defense_ready,
        "graduation_ready": graduation_ready,
        "needs_senior_intervention": needs_intervention,
    }


@router.get("/university")
async def university_dashboard(
    ctx: tuple[User, Institution] = Depends(require_pg_admin),
    db: AsyncSession = Depends(get_db),
):
    _, institution = ctx
    students = await list_students_for_institution(db, institution)
    stage_counts = Counter(s.get("current_stage_name") or "Unknown" for s in students)
    risk_counts = Counter(s.get("risk_level") or "Unknown" for s in students)
    at_risk = [
        s for s in students
        if (s.get("days_overdue") or 0) > 0
        or (s.get("risk_level") or "").lower() in ("high", "critical", "medium")
    ]

    intervention_result = await db.execute(
        select(PgInterventionCase).where(
            PgInterventionCase.institution_id == institution.id,
            PgInterventionCase.status != PgInterventionStatus.CLOSED,
        )
    )
    open_interventions = intervention_result.scalars().all()
    interventions_by_category = Counter(
        (case.category or "Uncategorised") for case in open_interventions
    )

    delay_report_result = await db.execute(
        select(PgSupervisorReport).where(
            PgSupervisorReport.institution_id == institution.id,
            PgSupervisorReport.report_type == PgReportType.DELAY_REPORT,
        )
    )
    delay_reports = delay_report_result.scalars().all()

    clearance_result = await db.execute(
        select(PgGraduationClearance).where(
            PgGraduationClearance.institution_id == institution.id,
        )
    )
    clearances = clearance_result.scalars().all()
    publication_cleared = sum(1 for row in clearances if row.publication_cleared)
    thesis_cleared = sum(1 for row in clearances if row.thesis_cleared)
    defense_cleared = sum(1 for row in clearances if row.defense_cleared)
    fully_cleared = sum(1 for row in clearances if row.status and row.status.value == "cleared")
    clearance_total = len(clearances) or 1

    active_msc = sum(1 for s in students if _is_msc(s.get("degree_level")))
    active_phd = sum(1 for s in students if _is_phd(s.get("degree_level")))

    return {
        "total_students": len(students),
        "active_msc": active_msc,
        "active_phd": active_phd,
        "by_stage": dict(stage_counts),
        "stage_distribution": _build_stage_distribution(stage_counts),
        "by_risk": dict(risk_counts),
        "at_risk_students": at_risk,
        "at_risk_count": len(at_risk),
        "open_interventions": len(open_interventions),
        "interventions_by_category": [
            {"category": category, "count": count}
            for category, count in interventions_by_category.most_common()
        ],
        "overdue_supervisor_reports": len(delay_reports),
        "publication_compliant_pct": round((publication_cleared / clearance_total) * 100),
        "clearance_summary": {
            "publication_cleared": publication_cleared,
            "thesis_cleared": thesis_cleared,
            "defense_cleared": defense_cleared,
            "fully_cleared": fully_cleared,
            "total_tracked": len(clearances),
        },
        "department_bottlenecks": _build_department_bottlenecks(students),
        "supervisor_workload": _build_supervisor_workload(students),
        "completion_forecast": _build_completion_forecast(students),
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
