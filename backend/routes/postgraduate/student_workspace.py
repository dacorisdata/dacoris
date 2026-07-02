from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_active_user
from database import get_db
from models import (
    Institution,
    PgDefenseRecord,
    PgInterventionCase,
    PgInterventionStatus,
    PgProgressReport,
    PgProposalRecord,
    PgStageStatus,
    PgStudentProfile,
    PgSupervisorReport,
    User,
)
from routes.postgraduate.deps import is_pg_student, require_university_institution
from services.pg.audit import log_pg_action
from services.pg.graduation_service import refresh_graduation_clearance
from services.pg.journey_service import merge_student_payload, resolve_student_id_for_user

router = APIRouter(prefix="/api/postgraduate/student", tags=["postgraduate-student"])


class PgProfileUpdate(BaseModel):
    research_interests: Optional[str] = None
    orcid: Optional[str] = None


class ChallengeReport(BaseModel):
    category: str = "student_report"
    stage_name: Optional[str] = None
    required_action: Optional[str] = None
    narrative: str = Field(..., min_length=10)


class ThesisDraftUpdate(BaseModel):
    title: Optional[str] = None
    draft_content: str = Field(..., min_length=20)
    status: str = "submitted"


class PublicationEntry(BaseModel):
    title: str
    journal_or_venue: Optional[str] = None
    doi: Optional[str] = None
    publication_year: Optional[int] = None
    url: Optional[str] = None


def _publications_from_profile(profile: Optional[PgStudentProfile]) -> List[Dict[str, Any]]:
    if not profile or not profile.research_interests:
        return []
    try:
        data = json.loads(profile.research_interests)
        if isinstance(data, dict) and isinstance(data.get("publications"), list):
            return data["publications"]
    except json.JSONDecodeError:
        pass
    return []


def _save_publications(profile: PgStudentProfile, publications: List[Dict[str, Any]]) -> None:
    existing: Dict[str, Any] = {}
    if profile.research_interests:
        try:
            parsed = json.loads(profile.research_interests)
            if isinstance(parsed, dict):
                existing = parsed
        except json.JSONDecodeError:
            existing = {"notes": profile.research_interests}
    existing["publications"] = publications
    profile.research_interests = json.dumps(existing)


async def _require_student_id(db, user, institution) -> str:
    if not is_pg_student(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Postgraduate student access required")
    student_id = await resolve_student_id_for_user(db, user, institution, commit=True)
    if not student_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No student record linked to this account")
    return student_id


async def _get_profile(db, institution_id: str, student_id: str) -> PgStudentProfile:
    result = await db.execute(
        select(PgStudentProfile).where(
            PgStudentProfile.institution_id == institution_id,
            PgStudentProfile.student_id == student_id,
        )
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")
    return profile


@router.get("/requirements")
async def get_requirements(
    institution: Institution = Depends(require_university_institution),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    student_id = await _require_student_id(db, current_user, institution)
    payload = await merge_student_payload(db, institution, student_id)
    if not payload:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return {
        "gates": payload["gates"],
        "programme_rules": payload["external"]["programme_rules"],
        "programme": payload["external"]["programme"],
        "journey_stages": payload["journey_stages"],
    }


@router.get("/feedback")
async def get_supervision_feedback(
    institution: Institution = Depends(require_university_institution),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    student_id = await _require_student_id(db, current_user, institution)
    progress_result = await db.execute(
        select(PgProgressReport).where(
            PgProgressReport.institution_id == institution.id,
            PgProgressReport.student_id == student_id,
        ).order_by(PgProgressReport.created_at.desc())
    )
    progress_reports = progress_result.scalars().all()
    supervisor_result = await db.execute(
        select(PgSupervisorReport).where(
            PgSupervisorReport.institution_id == institution.id,
            PgSupervisorReport.student_id == student_id,
        ).order_by(PgSupervisorReport.created_at.desc())
    )
    supervisor_reports = supervisor_result.scalars().all()
    return {
        "progress_reports": [
            {
                "id": r.id,
                "current_stage": r.current_stage,
                "activities_completed": r.activities_completed,
                "challenges": r.challenges,
                "requested_support": r.requested_support,
                "next_planned_activity": r.next_planned_activity,
                "status": r.status.value if r.status else None,
                "supervisor_validation": r.supervisor_validation,
                "supervisor_rating": r.supervisor_rating,
                "validated_at": r.validated_at.isoformat() if r.validated_at else None,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in progress_reports
        ],
        "supervisor_reports": [
            {
                "id": r.id,
                "report_type": r.report_type.value if r.report_type else None,
                "stage_name": r.stage_name,
                "progress_rating": r.progress_rating,
                "achievements": r.achievements,
                "next_milestone": r.next_milestone,
                "risks": r.risks,
                "support_needed": r.support_needed,
                "narrative": r.narrative,
                "recommended_intervention": r.recommended_intervention,
                "risk_level": r.risk_level,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in supervisor_reports
        ],
    }


@router.get("/challenges")
async def list_challenges(
    institution: Institution = Depends(require_university_institution),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    student_id = await _require_student_id(db, current_user, institution)
    result = await db.execute(
        select(PgInterventionCase).where(
            PgInterventionCase.institution_id == institution.id,
            PgInterventionCase.student_id == student_id,
        ).order_by(PgInterventionCase.created_at.desc())
    )
    cases = result.scalars().all()
    return {
        "challenges": [
            {
                "id": c.id,
                "category": c.category,
                "status": c.status.value if c.status else None,
                "stage_name": c.stage_name,
                "required_action": c.required_action,
                "expected_outcome": c.expected_outcome,
                "due_date": c.due_date.isoformat() if c.due_date else None,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in cases
        ]
    }


@router.post("/challenges", status_code=201)
async def report_challenge(
    body: ChallengeReport,
    institution: Institution = Depends(require_university_institution),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    student_id = await _require_student_id(db, current_user, institution)
    case = PgInterventionCase(
        institution_id=institution.id,
        student_id=student_id,
        category=body.category,
        stage_name=body.stage_name,
        required_action=body.narrative if not body.required_action else body.required_action,
        expected_outcome=body.narrative,
        status=PgInterventionStatus.OPEN,
        created_by_id=current_user.id,
    )
    db.add(case)
    await log_pg_action(
        db,
        institution_id=institution.id,
        entity_type="intervention",
        entity_id=case.id,
        action="student_reported",
        actor=current_user,
        student_id=student_id,
    )
    await db.commit()
    await db.refresh(case)
    return {"id": case.id, "status": case.status.value}


@router.patch("/profile")
async def update_pg_profile(
    body: PgProfileUpdate,
    institution: Institution = Depends(require_university_institution),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    student_id = await _require_student_id(db, current_user, institution)
    profile = await _get_profile(db, institution.id, student_id)
    if body.research_interests is not None:
        profile.research_interests = body.research_interests
    if body.orcid is not None:
        profile.orcid = body.orcid
    await db.commit()
    return {"student_id": student_id, "research_interests": profile.research_interests, "orcid": profile.orcid}


@router.get("/thesis-draft")
async def get_thesis_draft(
    institution: Institution = Depends(require_university_institution),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    student_id = await _require_student_id(db, current_user, institution)
    result = await db.execute(
        select(PgDefenseRecord).where(
            PgDefenseRecord.institution_id == institution.id,
            PgDefenseRecord.student_id == student_id,
            PgDefenseRecord.defense_type == "thesis_draft",
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        return {"draft": None}
    return {
        "draft": {
            "id": record.id,
            "title": record.examiners,
            "draft_content": record.corrections_required,
            "status": record.status.value if record.status else None,
            "updated_at": record.updated_at.isoformat() if record.updated_at else None,
        }
    }


@router.put("/thesis-draft")
async def upsert_thesis_draft(
    body: ThesisDraftUpdate,
    institution: Institution = Depends(require_university_institution),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    student_id = await _require_student_id(db, current_user, institution)
    result = await db.execute(
        select(PgDefenseRecord).where(
            PgDefenseRecord.institution_id == institution.id,
            PgDefenseRecord.student_id == student_id,
            PgDefenseRecord.defense_type == "thesis_draft",
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        record = PgDefenseRecord(
            institution_id=institution.id,
            student_id=student_id,
            defense_type="thesis_draft",
        )
        db.add(record)
    record.examiners = body.title or "Thesis draft"
    record.corrections_required = body.draft_content
    record.status = PgStageStatus.SUBMITTED if body.status == "submitted" else PgStageStatus.IN_PROGRESS
    await log_pg_action(
        db,
        institution_id=institution.id,
        entity_type="thesis_draft",
        entity_id=record.id,
        action="submitted",
        actor=current_user,
        student_id=student_id,
    )
    await db.commit()
    await db.refresh(record)
    return {"id": record.id, "status": record.status.value}


@router.get("/publications")
async def list_publications(
    institution: Institution = Depends(require_university_institution),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    student_id = await _require_student_id(db, current_user, institution)
    profile = await _get_profile(db, institution.id, student_id)
    return {"publications": _publications_from_profile(profile)}


@router.post("/publications", status_code=201)
async def add_publication(
    body: PublicationEntry,
    institution: Institution = Depends(require_university_institution),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    student_id = await _require_student_id(db, current_user, institution)
    profile = await _get_profile(db, institution.id, student_id)
    publications = _publications_from_profile(profile)
    publications.append(body.model_dump())
    _save_publications(profile, publications)
    await log_pg_action(
        db,
        institution_id=institution.id,
        entity_type="publication",
        entity_id=profile.id,
        action="added",
        actor=current_user,
        student_id=student_id,
    )
    await db.commit()
    return {"publications": publications}


@router.get("/graduation-readiness")
async def get_graduation_readiness(
    institution: Institution = Depends(require_university_institution),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    student_id = await _require_student_id(db, current_user, institution)
    payload = await merge_student_payload(db, institution, student_id)
    if not payload:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    programme_code = payload["external"]["student"]["programme_code"]
    result = await refresh_graduation_clearance(db, institution, student_id, programme_code)
    await db.commit()
    return result
