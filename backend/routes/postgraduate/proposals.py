from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_active_user
from database import get_db
from models import (
    EthicsApplication,
    EthicsStatus,
    Institution,
    PgProposalRecord,
    PgProposalStatus,
    PgStudentProfile,
    ProjectStatus,
    ResearchProject,
    User,
)
from routes.postgraduate.deps import is_pg_admin, require_university_institution
from routes.postgraduate.students import _authorize_student_access
from services.pg.audit import log_pg_action
from services.pg.journey_service import resolve_student_id_for_user

router = APIRouter(prefix="/api/postgraduate/proposals", tags=["postgraduate-proposals"])


class ProposalCreate(BaseModel):
    title: Optional[str] = None
    abstract: Optional[str] = None
    keywords: Optional[str] = None


class ProposalUpdate(BaseModel):
    title: Optional[str] = None
    abstract: Optional[str] = None
    keywords: Optional[str] = None
    status: Optional[str] = None


class ProposalDecision(BaseModel):
    status: str
    board_decision: Optional[str] = None
    corrections_required: Optional[str] = None


@router.get("")
async def list_proposals(
    institution: Institution = Depends(require_university_institution),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(PgProposalRecord).where(PgProposalRecord.institution_id == institution.id)
    if not is_pg_admin(current_user):
        student_id = await resolve_student_id_for_user(db, current_user, institution, commit=True)
        if not student_id:
            return {"proposals": []}
        query = query.where(PgProposalRecord.student_id == student_id)
    result = await db.execute(query.order_by(PgProposalRecord.created_at.desc()))
    proposals = result.scalars().all()
    return {
        "proposals": [
            {
                "id": p.id,
                "student_id": p.student_id,
                "title": p.title,
                "status": p.status.value if p.status else None,
                "research_project_id": p.research_project_id,
            }
            for p in proposals
        ]
    }


@router.post("", status_code=201)
async def create_proposal(
    body: ProposalCreate,
    institution: Institution = Depends(require_university_institution),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    student_id = await resolve_student_id_for_user(db, current_user, institution, commit=True)
    if not student_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No student record linked")
    proposal = PgProposalRecord(
        institution_id=institution.id,
        student_id=student_id,
        title=body.title,
        abstract=body.abstract,
        keywords=body.keywords,
        status=PgProposalStatus.DRAFT,
    )
    db.add(proposal)
    await db.commit()
    await db.refresh(proposal)
    return {"id": proposal.id, "status": proposal.status.value}


@router.get("/{proposal_id}")
async def get_proposal(
    proposal_id: str,
    institution: Institution = Depends(require_university_institution),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PgProposalRecord).where(
            PgProposalRecord.id == proposal_id,
            PgProposalRecord.institution_id == institution.id,
        )
    )
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposal not found")
    if not is_pg_admin(current_user):
        student_id = await resolve_student_id_for_user(db, current_user, institution)
        if proposal.student_id != student_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return {
        "id": proposal.id,
        "student_id": proposal.student_id,
        "title": proposal.title,
        "abstract": proposal.abstract,
        "keywords": proposal.keywords,
        "status": proposal.status.value if proposal.status else None,
        "board_decision": proposal.board_decision,
        "corrections_required": proposal.corrections_required,
        "research_project_id": proposal.research_project_id,
        "created_at": proposal.created_at.isoformat() if proposal.created_at else None,
        "updated_at": proposal.updated_at.isoformat() if proposal.updated_at else None,
    }


@router.patch("/{proposal_id}")
async def update_proposal(
    proposal_id: str,
    body: ProposalUpdate,
    institution: Institution = Depends(require_university_institution),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PgProposalRecord).where(
            PgProposalRecord.id == proposal_id,
            PgProposalRecord.institution_id == institution.id,
        )
    )
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposal not found")
    student_id = await resolve_student_id_for_user(db, current_user, institution, commit=True)
    if not is_pg_admin(current_user):
        if proposal.student_id != student_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        if proposal.status != PgProposalStatus.DRAFT:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Proposal can no longer be edited")
    if body.title is not None:
        proposal.title = body.title
    if body.abstract is not None:
        proposal.abstract = body.abstract
    if body.keywords is not None:
        proposal.keywords = body.keywords
    if body.status is not None and not is_pg_admin(current_user):
        if body.status == "submitted":
            proposal.status = PgProposalStatus.SUBMITTED
    await db.commit()
    return {"id": proposal.id, "status": proposal.status.value}


@router.post("/{proposal_id}/approve")
async def approve_proposal(
    proposal_id: str,
    body: ProposalDecision,
    institution: Institution = Depends(require_university_institution),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not is_pg_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    result = await db.execute(
        select(PgProposalRecord).where(
            PgProposalRecord.id == proposal_id,
            PgProposalRecord.institution_id == institution.id,
        )
    )
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposal not found")

    proposal.status = PgProposalStatus(body.status)
    proposal.board_decision = body.board_decision
    proposal.corrections_required = body.corrections_required

    if proposal.status in (PgProposalStatus.APPROVED, PgProposalStatus.APPROVED_WITH_CORRECTIONS):
        profile_result = await db.execute(
            select(PgStudentProfile).where(
                PgStudentProfile.institution_id == institution.id,
                PgStudentProfile.student_id == proposal.student_id,
            )
        )
        profile = profile_result.scalar_one_or_none()
        user_id = profile.user_id if profile else current_user.id

        project = ResearchProject(
            institution_id=institution.id,
            pi_id=user_id,
            title=proposal.title or f"PG Research - {proposal.student_id}",
            description=proposal.abstract,
            project_type="postgraduate",
            status=ProjectStatus.ACTIVE,
            research_keywords=proposal.keywords,
            project_abstract=proposal.abstract,
        )
        db.add(project)
        await db.flush()
        proposal.research_project_id = project.id
        if profile:
            profile.research_project_id = project.id

        ethics = EthicsApplication(
            institution_id=institution.id,
            project_id=project.id,
            submitted_by_id=user_id,
            title=proposal.title,
            lay_summary=proposal.abstract,
            status=EthicsStatus.DRAFT,
        )
        db.add(ethics)
        await db.flush()
        proposal.ethics_application_id = ethics.id

    await log_pg_action(
        db,
        institution_id=institution.id,
        entity_type="proposal",
        entity_id=proposal.id,
        action="approved" if "approved" in body.status else "updated",
        actor=current_user,
        student_id=proposal.student_id,
    )
    await db.commit()
    return {
        "id": proposal.id,
        "status": proposal.status.value,
        "research_project_id": proposal.research_project_id,
        "ethics_application_id": proposal.ethics_application_id,
    }
