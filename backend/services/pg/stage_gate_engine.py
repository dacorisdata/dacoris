from __future__ import annotations

from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import (
    EthicsApplication,
    EthicsStatus,
    PgDefenseRecord,
    PgGraduationClearance,
    PgProposalRecord,
    PgProposalStatus,
    PgStageStatus,
    PgStudentProfile,
    PgStudentStageStatus,
    PgSupervisorReport,
    ResearchProject,
)
from services.external_systems.excel_is_reader import ExcelISRepository, JOURNEY_STAGE_NAMES


def _completed_enrolments(enrolments) -> int:
    return sum(1 for e in enrolments if (e.status or "").lower() in ("completed", "complete", "pass", "passed"))


class StageGateEngine:
    def __init__(self, repo: ExcelISRepository, institution_name: str, domain: str):
        self.repo = repo
        self.institution_name = institution_name
        self.domain = domain

    def evaluate_gates(
        self,
        student_id: str,
        programme_code: str,
        db_state: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        db_state = db_state or {}
        enrolments = self.repo.get_enrolments(student_id, self.institution_name, self.domain)
        programme = self.repo.get_programme(programme_code, self.institution_name, self.domain)
        rules = self.repo.get_programme_rules(programme_code, self.institution_name, self.domain)
        assignments = self.repo.get_supervisor_assignments(student_id=student_id, institution_name=self.institution_name, domain=self.domain)
        account = self.repo.get_finance_account(student_id, self.institution_name, self.domain)
        journey = self.repo.get_journey(student_id, self.institution_name, self.domain)

        min_units = programme.min_coursework_units if programme else 8
        for rule in rules:
            if rule.rule_type.lower() == "coursework" and rule.min_value:
                min_units = int(rule.min_value)

        completed = _completed_enrolments(enrolments)
        gate_a = completed >= min_units

        if db_state.get("supervisor_assignments"):
            assignments_data = db_state["supervisor_assignments"]
            active_assignment = next(
                (a for a in assignments_data if (a.get("status") or "").lower() == "active"),
                None,
            )
            gate_b = active_assignment is not None and bool(active_assignment.get("lead_supervisor_id"))
            lead_supervisor_name = active_assignment.get("lead_supervisor_name") if active_assignment else None
        else:
            active_assignment = next(
                (a for a in assignments if (a.status or "").lower() == "active"),
                None,
            )
            gate_b = active_assignment is not None and bool(active_assignment.lead_supervisor_id)
            lead_supervisor_name = active_assignment.lead_supervisor_name if active_assignment else None

        proposal = db_state.get("proposal")
        gate_c = proposal and proposal.get("status") in (
            PgProposalStatus.APPROVED.value,
            PgProposalStatus.APPROVED_WITH_CORRECTIONS.value,
        )

        ethics = db_state.get("ethics")
        project = db_state.get("project")
        ethics_ok = ethics and ethics.get("status") in (
            EthicsStatus.APPROVED.value,
            EthicsStatus.APPROVED_WITH_MODS.value,
        )
        dmp_ok = bool(project and project.get("has_dmp"))
        gate_d = bool(gate_c and ethics_ok and dmp_ok)

        stage_statuses = db_state.get("stage_statuses") or []
        data_stage = next((s for s in stage_statuses if s.get("stage_name") == "Data Collection"), None)
        signoffs = db_state.get("signoffs") or []
        gate_e = bool(
            data_stage
            and data_stage.get("status") in (PgStageStatus.COMPLETED.value, PgStageStatus.APPROVED.value)
            and any(s.get("stage_name") == "Data Collection" for s in signoffs)
        )

        gate_f = any(s.get("report_type") == "completion_recommendation" for s in signoffs) or any(
            s.get("stage_name") == "Thesis Writing" and s.get("report_type") == "stage_signoff" for s in signoffs
        )

        defense = db_state.get("defense")
        gate_g = defense and defense.get("outcome") in ("passed", "approved", "Approved", "Passed")

        pub_required = programme.pub_requirement if programme else 1
        pub_count = 0
        if journey:
            pub_stage = next((s for s in journey.stages if s.stage_no == 8), None)
            if pub_stage and pub_stage.extra.get("pub_count") is not None:
                pub_count = int(pub_stage.extra["pub_count"])
        pub_rules = [r for r in rules if r.rule_type.lower() == "publication"]
        if pub_rules and pub_rules[0].min_value:
            pub_required = int(pub_rules[0].min_value)

        finance_ok = bool(account and account.finance_clearance)
        clearance = db_state.get("clearance")
        gate_h = bool(
            gate_a and gate_b and gate_c and gate_d and gate_f and gate_g
            and pub_count >= pub_required
            and finance_ok
            and (not clearance or clearance.get("status") == "cleared")
        )

        return {
            "gate_a_coursework": {"passed": gate_a, "completed_units": completed, "required_units": min_units},
            "gate_b_supervisor": {"passed": gate_b, "lead_supervisor": lead_supervisor_name},
            "gate_c_proposal": {"passed": gate_c, "status": proposal.get("status") if proposal else None},
            "gate_d_research_cleared": {"passed": gate_d, "ethics_status": ethics.get("status") if ethics else None, "has_dmp": dmp_ok},
            "gate_e_data_analysis": {"passed": gate_e},
            "gate_f_thesis_ready": {"passed": gate_f},
            "gate_g_defense": {"passed": gate_g, "outcome": defense.get("outcome") if defense else None},
            "gate_h_graduation": {
                "passed": gate_h,
                "publications": pub_count,
                "publications_required": pub_required,
                "finance_clearance": finance_ok,
            },
            "can_enter_data_collection": bool(gate_c and ethics_ok),
            "can_submit_thesis": bool(gate_f and pub_count >= pub_required),
            "can_graduate": gate_h,
        }


async def load_db_state(db: AsyncSession, institution_id: str, student_id: str) -> Dict[str, Any]:
    profile_result = await db.execute(
        select(PgStudentProfile).where(
            PgStudentProfile.institution_id == institution_id,
            PgStudentProfile.student_id == student_id,
        )
    )
    profile = profile_result.scalar_one_or_none()

    proposal_result = await db.execute(
        select(PgProposalRecord).where(
            PgProposalRecord.institution_id == institution_id,
            PgProposalRecord.student_id == student_id,
        )
    )
    proposal = proposal_result.scalar_one_or_none()

    defense_result = await db.execute(
        select(PgDefenseRecord).where(
            PgDefenseRecord.institution_id == institution_id,
            PgDefenseRecord.student_id == student_id,
        )
    )
    defense = defense_result.scalar_one_or_none()

    clearance_result = await db.execute(
        select(PgGraduationClearance).where(
            PgGraduationClearance.institution_id == institution_id,
            PgGraduationClearance.student_id == student_id,
        )
    )
    clearance = clearance_result.scalar_one_or_none()

    stage_result = await db.execute(
        select(PgStudentStageStatus).where(
            PgStudentStageStatus.institution_id == institution_id,
            PgStudentStageStatus.student_id == student_id,
        )
    )
    stages = stage_result.scalars().all()

    signoff_result = await db.execute(
        select(PgSupervisorReport).where(
            PgSupervisorReport.institution_id == institution_id,
            PgSupervisorReport.student_id == student_id,
        )
    )
    signoffs = signoff_result.scalars().all()

    ethics = None
    project = None
    if proposal and proposal.ethics_application_id:
        ethics_result = await db.execute(
            select(EthicsApplication).where(EthicsApplication.id == proposal.ethics_application_id)
        )
        ethics_row = ethics_result.scalar_one_or_none()
        if ethics_row:
            ethics = {"status": ethics_row.status.value if ethics_row.status else None}

    project_id = profile.research_project_id if profile else (proposal.research_project_id if proposal else None)
    if project_id:
        project_result = await db.execute(select(ResearchProject).where(ResearchProject.id == project_id))
        project_row = project_result.scalar_one_or_none()
        if project_row:
            has_dmp = bool(
                project_row.dmp_plan_title
                or project_row.dmp_types_of_data
                or project_row.dmp_linked_document_id
            )
            project = {"id": project_row.id, "has_dmp": has_dmp, "project_type": project_row.project_type}

    return {
        "profile": profile,
        "proposal": {"status": proposal.status.value, "id": proposal.id} if proposal else None,
        "defense": {"outcome": defense.outcome, "id": defense.id} if defense else None,
        "clearance": {"status": clearance.status.value, "id": clearance.id} if clearance else None,
        "ethics": ethics,
        "project": project,
        "stage_statuses": [
            {"stage_name": s.stage_name, "status": s.status.value if s.status else None}
            for s in stages
        ],
        "signoffs": [
            {
                "report_type": s.report_type.value if s.report_type else None,
                "stage_name": s.stage_name,
            }
            for s in signoffs
        ],
    }


DEFAULT_STAGES = [
    (1, "Admission & Enrolment", 90),
    (2, "Coursework", 365),
    (3, "Supervisor Assignment", 60),
    (4, "Proposal Development", 180),
    (5, "Proposal Defense", 30),
    (6, "Data Collection", 365),
    (7, "Thesis Writing", 365),
    (8, "Publication", 180),
    (9, "Thesis Defense", 60),
    (10, "Graduation", 30),
]
