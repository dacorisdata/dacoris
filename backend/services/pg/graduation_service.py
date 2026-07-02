from __future__ import annotations

from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Institution, PgClearanceStatus, PgGraduationClearance
from services.external_systems.excel_is_reader import ExcelISRepository, get_excel_repository
from services.pg.stage_gate_engine import StageGateEngine, load_db_state


async def get_or_create_clearance(
    db: AsyncSession,
    institution_id: str,
    student_id: str,
) -> PgGraduationClearance:
    result = await db.execute(
        select(PgGraduationClearance).where(
            PgGraduationClearance.institution_id == institution_id,
            PgGraduationClearance.student_id == student_id,
        )
    )
    row = result.scalar_one_or_none()
    if row:
        return row
    row = PgGraduationClearance(institution_id=institution_id, student_id=student_id)
    db.add(row)
    return row


async def refresh_graduation_clearance(
    db: AsyncSession,
    institution: Institution,
    student_id: str,
    programme_code: str,
    repo: Optional[ExcelISRepository] = None,
) -> Dict[str, Any]:
    repo = repo or get_excel_repository()
    db_state = await load_db_state(db, institution.id, student_id)
    gates = StageGateEngine(repo, institution.name, institution.domain).evaluate_gates(
        student_id,
        programme_code,
        db_state,
    )

    clearance = await get_or_create_clearance(db, institution.id, student_id)
    clearance.coursework_cleared = gates["gate_a_coursework"]["passed"]
    clearance.supervisor_cleared = gates["gate_b_supervisor"]["passed"]
    clearance.proposal_cleared = gates["gate_c_proposal"]["passed"]
    clearance.ethics_cleared = gates["gate_d_research_cleared"]["passed"]
    clearance.data_analysis_cleared = gates["gate_e_data_analysis"]["passed"]
    clearance.thesis_cleared = gates["gate_f_thesis_ready"]["passed"]
    clearance.defense_cleared = gates["gate_g_defense"]["passed"]
    clearance.publication_cleared = (
        gates["gate_h_graduation"]["publications"] >= gates["gate_h_graduation"]["publications_required"]
    )
    clearance.finance_cleared = gates["gate_h_graduation"]["finance_clearance"]

    blockers = []
    for key, label in [
        ("gate_a_coursework", "Coursework incomplete"),
        ("gate_b_supervisor", "Supervisor not confirmed"),
        ("gate_c_proposal", "Proposal not approved"),
        ("gate_d_research_cleared", "Ethics/DMP not cleared"),
        ("gate_f_thesis_ready", "Thesis not ready"),
        ("gate_g_defense", "Defense not passed"),
    ]:
        if not gates[key]["passed"]:
            blockers.append(label)
    if not clearance.publication_cleared:
        blockers.append("Publication requirement not met")
    if not clearance.finance_cleared:
        blockers.append("Finance clearance pending")

    clearance.blockers = "; ".join(blockers) if blockers else None
    if gates["gate_h_graduation"]["passed"]:
        clearance.status = PgClearanceStatus.CLEARED
    elif blockers:
        clearance.status = PgClearanceStatus.BLOCKED
    else:
        clearance.status = PgClearanceStatus.IN_PROGRESS

    return {
        "clearance": {
            "status": clearance.status.value,
            "coursework_cleared": clearance.coursework_cleared,
            "supervisor_cleared": clearance.supervisor_cleared,
            "proposal_cleared": clearance.proposal_cleared,
            "ethics_cleared": clearance.ethics_cleared,
            "data_analysis_cleared": clearance.data_analysis_cleared,
            "thesis_cleared": clearance.thesis_cleared,
            "defense_cleared": clearance.defense_cleared,
            "publication_cleared": clearance.publication_cleared,
            "finance_cleared": clearance.finance_cleared,
            "repository_cleared": clearance.repository_cleared,
            "blockers": clearance.blockers,
        },
        "gates": gates,
    }
