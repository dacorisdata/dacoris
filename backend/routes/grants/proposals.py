from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response
from fastapi.responses import FileResponse as FastAPIFileResponse
import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from database import get_db
from models import (Proposal, ProposalSection, ProposalSectionVersion, ProposalDocument,
                    ProposalCollaborator, ProposalStatus, GrantOpportunity, User,
                    ProposalStageHistory, ProposalStageAssignment, STAGE_INTENDED_DAYS)
from auth import require_roles, ResearchRole, get_current_user
from services.workflow import can_transition_proposal
from services.notifications import create_notification
from services.file_upload import save_upload

router = APIRouter(prefix="/api/grants/proposals", tags=["proposals"])

DEFAULT_SECTIONS = [
    {"section_type": "executive_summary", "title": "Executive Summary"},
    {"section_type": "problem_statement", "title": "Problem Statement"},
    {"section_type": "methodology", "title": "Methodology"},
    {"section_type": "budget_justification", "title": "Budget Justification"},
    {"section_type": "mel_plan", "title": "M&E Plan"},
]


class CollaboratorInvite(BaseModel):
    orcid: str
    name: str
    email: Optional[str] = None
    role: str = "Co-Investigator"


class ProposalCreate(BaseModel):
    opportunity_id: int
    title: str
    collaborators: Optional[List[CollaboratorInvite]] = []


class OpportunityBasic(BaseModel):
    id: int
    title: str
    sponsor: Optional[str] = None
    sponsor_type: Optional[str] = None
    category: Optional[str] = None
    geography: Optional[str] = None
    eligible_applicants: Optional[str] = None
    applicant_type: Optional[str] = None
    funding_type: Optional[str] = None
    currency: Optional[str] = None
    amount_min: Optional[float] = None
    amount_max: Optional[float] = None
    open_date: Optional[datetime] = None
    deadline: Optional[datetime] = None
    status: Optional[str] = None
    round_cycle: Optional[str] = None
    contact_email: Optional[str] = None
    url: Optional[str] = None
    application_url: Optional[str] = None
    notes: Optional[str] = None
    description: Optional[str] = None
    eligibility: Optional[str] = None
    criteria: Optional[str] = None
    is_curated: Optional[bool] = None

    class Config:
        from_attributes = True


class UserBasic(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True


class CollaboratorOut(BaseModel):
    id: int
    role: str
    status: str
    invited_email: Optional[str] = None
    invited_orcid: Optional[str] = None
    invited_name: Optional[str] = None
    user: Optional[UserBasic] = None

    class Config:
        from_attributes = True


class SectionSummary(BaseModel):
    id: int
    title: str
    word_count: int
    section_order: int
    content_html: Optional[str] = None
    section_type: Optional[str] = None

    class Config:
        from_attributes = True


class StageHistoryOut(BaseModel):
    id: int
    stage_step: int
    stage_name: Optional[str]
    entered_at: Optional[datetime]
    intended_days: Optional[int]
    exited_at: Optional[datetime]
    entered_by: Optional[UserBasic] = None

    class Config:
        from_attributes = True


class StageAssignmentOut(BaseModel):
    id: int
    stage_step: int
    stage_name: Optional[str]
    reviewer: Optional[UserBasic]
    assigned_at: Optional[datetime]
    notes: Optional[str]
    status: Optional[str]

    class Config:
        from_attributes = True


class ProposalOut(BaseModel):
    id: int
    title: str
    status: str
    opportunity_id: int
    lead_pi_id: int
    current_version: int
    submitted_at: Optional[datetime]
    created_at: datetime
    review_step: Optional[int] = 0
    review_stage_name: Optional[str] = None
    stage_notes: Optional[str] = None
    opportunity: Optional[OpportunityBasic] = None
    collaborators: Optional[List[CollaboratorOut]] = []
    lead_pi: Optional[UserBasic] = None
    sections: Optional[List[SectionSummary]] = []
    stage_history: Optional[List[StageHistoryOut]] = []
    stage_assignments: Optional[List[StageAssignmentOut]] = []

    class Config:
        from_attributes = True


class SectionUpdate(BaseModel):
    content_html: str
    word_count: Optional[int] = 0


@router.post("", response_model=ProposalOut, status_code=201)
async def create_proposal(
    data: ProposalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER]))
):
    # Validate opportunity exists (no institution check for now)
    opp = await db.get(GrantOpportunity, data.opportunity_id)
    if not opp:
        raise HTTPException(404, "Opportunity not found")

    proposal = Proposal(
        opportunity_id=data.opportunity_id,
        institution_id=current_user.primary_institution_id,
        lead_pi_id=current_user.id,
        title=data.title,
    )
    db.add(proposal)
    await db.flush()

    # Create default sections
    for s in DEFAULT_SECTIONS:
        db.add(ProposalSection(proposal_id=proposal.id, **s))

    # Invite collaborators
    if data.collaborators:
        for collab in data.collaborators:
            # Check if user exists with this ORCID
            result = await db.execute(
                select(User).where(User.orcid_id == collab.orcid)
            )
            user = result.scalar_one_or_none()
            
            if user:
                # Add as collaborator
                db.add(ProposalCollaborator(
                    proposal_id=proposal.id,
                    user_id=user.id,
                    role=collab.role,
                    status="accepted"  # Auto-accept if user exists
                ))
                
                # Send notification
                await create_notification(
                    db=db,
                    user_id=user.id,
                    title="Proposal Collaboration Invite",
                    message=f"{current_user.name} invited you to collaborate on '{data.title}'",
                    link=f"/researcher/grants/proposals/{proposal.id}"
                )
            else:
                # Create pending invitation
                db.add(ProposalCollaborator(
                    proposal_id=proposal.id,
                    user_id=None,  # Will be filled when they register
                    role=collab.role,
                    status="pending",
                    invited_email=collab.email,
                    invited_orcid=collab.orcid,
                    invited_name=collab.name
                ))
                
                # TODO: Send email invitation
                print(f"TODO: Send email to {collab.email} for proposal {proposal.id}")

    await db.commit()
    await db.refresh(proposal)
    return proposal


@router.get("", response_model=List[ProposalOut])
async def list_proposals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER,
        ResearchRole.INSTITUTIONAL_LEAD
    ]))
):
    query = select(Proposal).where(
        Proposal.institution_id == current_user.primary_institution_id
    ).options(
        selectinload(Proposal.opportunity),
        selectinload(Proposal.collaborators).selectinload(ProposalCollaborator.user),
        selectinload(Proposal.lead_pi),
        selectinload(Proposal.sections),
        selectinload(Proposal.stage_history).selectinload(ProposalStageHistory.entered_by),
        selectinload(Proposal.stage_assignments).selectinload(ProposalStageAssignment.reviewer),
    )
    result = await db.execute(query.order_by(Proposal.created_at.desc()))
    return result.scalars().all()


@router.get("/{proposal_id}")
async def get_proposal(
    proposal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER,
        ResearchRole.INSTITUTIONAL_LEAD
    ]))
):
    result = await db.execute(
        select(Proposal)
        .options(
            selectinload(Proposal.opportunity),
            selectinload(Proposal.sections),
            selectinload(Proposal.documents),
            selectinload(Proposal.collaborators).selectinload(ProposalCollaborator.user),
            selectinload(Proposal.lead_pi),
            selectinload(Proposal.reviews),
            selectinload(Proposal.stage_history).selectinload(ProposalStageHistory.entered_by),
            selectinload(Proposal.stage_assignments).selectinload(ProposalStageAssignment.reviewer),
        )
        .where(
            Proposal.id == proposal_id,
            Proposal.institution_id == current_user.primary_institution_id
        )
    )
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(404, "Proposal not found")
    
    # Sort sections by section_order
    if proposal.sections:
        proposal.sections.sort(key=lambda s: s.section_order)
    
    return proposal


@router.put("/{proposal_id}/sections/{section_id}")
async def update_section(
    proposal_id: int,
    section_id: int,
    data: SectionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER]))
):
    result = await db.execute(
        select(ProposalSection).where(
            ProposalSection.id == section_id,
            ProposalSection.proposal_id == proposal_id,
        )
    )
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(404, "Section not found")

    # Check section-level permissions
    # First check if user is the lead PI (always allowed)
    proposal_check = await db.execute(select(Proposal).where(Proposal.id == proposal_id))
    proposal_obj = proposal_check.scalar_one_or_none()
    is_lead_pi = proposal_obj and proposal_obj.lead_pi_id == current_user.id
    
    if section.allowed_roles and not is_lead_pi:
        allowed = [r.strip() for r in section.allowed_roles.split(",") if r.strip()]
        # Get user roles from the user_roles table
        from sqlalchemy import text
        roles_result = await db.execute(
            text("SELECT role FROM user_roles WHERE user_id = :user_id"),
            {"user_id": current_user.id}
        )
        user_roles = [row[0] for row in roles_result.fetchall()]
        
        if not any(r in allowed for r in user_roles):
            raise HTTPException(403, f"You don't have permission to edit this section. Required roles: {', '.join(allowed)}")

    # Save current content as a version snapshot before overwriting
    if section.content_html:  # Only save if there's existing content
        snapshot = ProposalSectionVersion(
            section_id=section.id,
            version_number=section.version,
            content_html=section.content_html,
            word_count=section.word_count,
            saved_by_id=section.last_edited_by_id or current_user.id,
        )
        db.add(snapshot)

    section.content_html = data.content_html
    section.word_count = data.word_count
    section.last_edited_by_id = current_user.id
    section.version += 1
    await db.commit()
    return {"id": section_id, "version": section.version}


@router.get("/{proposal_id}/sections/{section_id}/versions")
async def get_section_versions(
    proposal_id: int,
    section_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER]))
):
    result = await db.execute(
        select(ProposalSectionVersion)
        .where(ProposalSectionVersion.section_id == section_id)
        .order_by(ProposalSectionVersion.version_number.desc())
    )
    versions = result.scalars().all()
    # Load saved_by users
    out = []
    for v in versions:
        user = await db.get(User, v.saved_by_id) if v.saved_by_id else None
        out.append({
            "id": v.id,
            "version_number": v.version_number,
            "content_html": v.content_html,
            "word_count": v.word_count,
            "saved_by": user.name if user else "Unknown",
            "saved_at": v.saved_at.isoformat() if v.saved_at else None,
        })
    return out


@router.post("/{proposal_id}/sections/{section_id}/restore/{version_id}")
async def restore_section_version(
    proposal_id: int,
    section_id: int,
    version_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER]))
):
    version = await db.get(ProposalSectionVersion, version_id)
    if not version or version.section_id != section_id:
        raise HTTPException(404, "Version not found")

    result = await db.execute(select(ProposalSection).where(ProposalSection.id == section_id))
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(404, "Section not found")

    # Snapshot current before restoring
    snapshot = ProposalSectionVersion(
        section_id=section.id,
        version_number=section.version,
        content_html=section.content_html,
        word_count=section.word_count,
        saved_by_id=current_user.id,
    )
    db.add(snapshot)

    section.content_html = version.content_html
    section.word_count = version.word_count
    section.last_edited_by_id = current_user.id
    section.version += 1
    await db.commit()
    return {"id": section_id, "version": section.version, "restored_from": version_id}


class SectionPermissions(BaseModel):
    allowed_roles: str  # comma-separated, empty = all


@router.put("/{proposal_id}/sections/{section_id}/permissions")
async def set_section_permissions(
    proposal_id: int,
    section_id: int,
    data: SectionPermissions,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    # Only lead PI can set permissions
    proposal_res = await db.execute(select(Proposal).where(
        Proposal.id == proposal_id,
        Proposal.lead_pi_id == current_user.id
    ))
    proposal = proposal_res.scalar_one_or_none()
    if not proposal:
        raise HTTPException(403, "Only the lead PI can set section permissions")

    result = await db.execute(select(ProposalSection).where(
        ProposalSection.id == section_id,
        ProposalSection.proposal_id == proposal_id
    ))
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(404, "Section not found")

    section.allowed_roles = data.allowed_roles
    await db.commit()
    return {"id": section_id, "allowed_roles": section.allowed_roles}


class SectionCreate(BaseModel):
    title: str


class SectionRename(BaseModel):
    title: str


@router.post("/{proposal_id}/sections", status_code=201)
async def create_section(
    proposal_id: int,
    data: SectionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER]))
):
    # Verify proposal exists and user has access
    result = await db.execute(select(Proposal).where(
        Proposal.id == proposal_id,
        Proposal.institution_id == current_user.primary_institution_id
    ))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(404, "Proposal not found")
    
    if proposal.status != ProposalStatus.DRAFT:
        raise HTTPException(400, "Cannot add sections to non-draft proposals")
    
    # Get max section_order
    result = await db.execute(
        select(ProposalSection)
        .where(ProposalSection.proposal_id == proposal_id)
        .order_by(ProposalSection.section_order.desc())
        .limit(1)
    )
    last_section = result.scalar_one_or_none()
    next_order = (last_section.section_order + 1) if last_section else 0
    
    # Create new section
    section = ProposalSection(
        proposal_id=proposal_id,
        title=data.title,
        section_type="custom",
        content_html="",
        word_count=0,
        section_order=next_order,
        last_edited_by_id=current_user.id
    )
    db.add(section)
    await db.commit()
    await db.refresh(section)
    return {"id": section.id, "title": section.title}


@router.put("/{proposal_id}/sections/{section_id}/rename")
async def rename_section(
    proposal_id: int,
    section_id: int,
    data: SectionRename,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER]))
):
    # Verify proposal exists and user has access
    result = await db.execute(select(Proposal).where(
        Proposal.id == proposal_id,
        Proposal.institution_id == current_user.primary_institution_id
    ))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(404, "Proposal not found")
    
    if proposal.status != ProposalStatus.DRAFT:
        raise HTTPException(400, "Cannot rename sections in non-draft proposals")
    
    # Get section
    result = await db.execute(select(ProposalSection).where(
        ProposalSection.id == section_id,
        ProposalSection.proposal_id == proposal_id
    ))
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(404, "Section not found")
    
    section.title = data.title
    await db.commit()
    return {"id": section.id, "title": section.title}


@router.delete("/{proposal_id}/sections/{section_id}")
async def delete_section(
    proposal_id: int,
    section_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER]))
):
    # Verify proposal exists and user has access
    result = await db.execute(select(Proposal).where(
        Proposal.id == proposal_id,
        Proposal.institution_id == current_user.primary_institution_id
    ))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(404, "Proposal not found")
    
    if proposal.status != ProposalStatus.DRAFT:
        raise HTTPException(400, "Cannot delete sections from non-draft proposals")
    
    # Get section
    result = await db.execute(select(ProposalSection).where(
        ProposalSection.id == section_id,
        ProposalSection.proposal_id == proposal_id
    ))
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(404, "Section not found")
    
    await db.delete(section)
    await db.commit()
    return {"message": "Section deleted"}


class SectionReorder(BaseModel):
    section_ids: List[int]


@router.put("/{proposal_id}/sections/reorder")
async def reorder_sections(
    proposal_id: int,
    data: SectionReorder,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER]))
):
    # Verify proposal exists and user has access
    result = await db.execute(select(Proposal).where(
        Proposal.id == proposal_id,
        Proposal.institution_id == current_user.primary_institution_id
    ))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(404, "Proposal not found")
    
    if proposal.status != ProposalStatus.DRAFT:
        raise HTTPException(400, "Cannot reorder sections in non-draft proposals")
    
    # Update section_order for each section
    for index, section_id in enumerate(data.section_ids):
        result = await db.execute(select(ProposalSection).where(
            ProposalSection.id == section_id,
            ProposalSection.proposal_id == proposal_id
        ))
        section = result.scalar_one_or_none()
        if section:
            section.section_order = index
    
    await db.commit()
    return {"message": "Sections reordered"}


@router.post("/{proposal_id}/documents", status_code=201)
async def upload_document(
    proposal_id: int,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER]))
):
    result = await db.execute(select(Proposal).where(
        Proposal.id == proposal_id,
        Proposal.institution_id == current_user.primary_institution_id
    ))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(404, "Proposal not found")

    file_info = await save_upload(file, subfolder="documents")
    doc = ProposalDocument(
        proposal_id=proposal_id,
        document_type=document_type,
        uploaded_by_id=current_user.id,
        **file_info,
    )
    db.add(doc)
    await db.commit()
    return {"id": doc.id, "filename": file_info["original_filename"]}


@router.patch("/{proposal_id}/status")
async def transition_proposal_status(
    proposal_id: int,
    target_status: ProposalStatus,
    notes: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Proposal).where(
        Proposal.id == proposal_id,
    ))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(404, "Proposal not found")

    is_lead_pi = proposal.lead_pi_id == current_user.id

    # Determine which transition set to use
    from services.workflow import RESEARCHER_TRANSITIONS, ADMIN_TRANSITIONS
    if is_lead_pi:
        allowed = RESEARCHER_TRANSITIONS.get(proposal.status, [])
        if target_status not in allowed:
            raise HTTPException(400, f"You can only submit or re-submit proposals in {proposal.status} status")
    else:
        # Must be admin/grant officer
        from routes.auth import get_user_roles
        user_roles_result = await db.execute(
            text("SELECT role FROM user_roles WHERE user_id = :uid"),
            {"uid": current_user.id}
        )
        user_roles = [r[0] for r in user_roles_result.fetchall()]
        admin_roles = {"grant_officer", "research_admin", "institutional_lead", "system_admin"}
        if not any(r in admin_roles for r in user_roles) and not current_user.is_institution_admin and not current_user.is_global_admin:
            raise HTTPException(403, "Only the lead PI or grant staff can change proposal status")
        allowed = ADMIN_TRANSITIONS.get(proposal.status, [])
        if target_status not in allowed:
            raise HTTPException(400, f"Cannot transition from '{proposal.status}' to '{target_status}'")

    proposal.status = target_status
    now_ts = datetime.now(timezone.utc)
    if target_status == ProposalStatus.SUBMITTED:
        proposal.submitted_at = now_ts

    # Update review_step if column exists
    try:
        from services.workflow import STAGE_LABELS
        step, stage_name = STAGE_LABELS.get(target_status, (0, ''))
        if hasattr(proposal, 'review_step'):
            proposal.review_step = step
        if hasattr(proposal, 'review_stage_name'):
            proposal.review_stage_name = stage_name
        if hasattr(proposal, 'stage_notes') and notes:
            proposal.stage_notes = notes
    except Exception:
        pass

    # Create initial stage-0 history entry when first submitted
    if target_status == ProposalStatus.SUBMITTED:
        existing_h = await db.execute(
            select(ProposalStageHistory).where(ProposalStageHistory.proposal_id == proposal.id)
        )
        if not existing_h.scalar_one_or_none():
            db.add(ProposalStageHistory(
                proposal_id=proposal.id,
                stage_step=0,
                stage_name="Received",
                entered_at=now_ts,
                intended_days=STAGE_INTENDED_DAYS.get(0, 3),
                entered_by_id=current_user.id,
            ))

    await db.commit()

    # Send notifications
    if target_status == ProposalStatus.RETURNED and not is_lead_pi:
        await create_notification(
            db, proposal.lead_pi_id,
            title="Proposal returned for revision",
            message=f'Your proposal "{proposal.title}" has been returned for revision. {notes or ""}',
            entity_type="proposal", entity_id=proposal_id
        )
    elif target_status == ProposalStatus.SUBMITTED and is_lead_pi:
        await create_notification(
            db, proposal.lead_pi_id,
            title="Proposal submitted",
            message=f'Your proposal "{proposal.title}" has been submitted successfully and is awaiting review.',
            entity_type="proposal", entity_id=proposal_id
        )
    elif target_status in (ProposalStatus.AWARDED, ProposalStatus.DECLINED):
        await create_notification(
            db, proposal.lead_pi_id,
            title=f'Proposal {"awarded" if target_status == ProposalStatus.AWARDED else "not awarded"}',
            message=f'Decision on "{proposal.title}": {target_status.value}. {notes or ""}',
            entity_type="proposal", entity_id=proposal_id
        )

    return {"id": proposal_id, "status": target_status, "notes": notes}


@router.delete("/{proposal_id}")
async def delete_proposal(
    proposal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER]))
):
    """Delete a proposal (only if in DRAFT status)"""
    result = await db.execute(select(Proposal).where(
        Proposal.id == proposal_id,
        Proposal.institution_id == current_user.primary_institution_id
    ))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(404, "Proposal not found")
    
    # Only allow deletion of DRAFT proposals
    if proposal.status != ProposalStatus.DRAFT:
        raise HTTPException(400, "Can only delete proposals in DRAFT status")
    
    # Check if user is the lead PI or has permission
    if proposal.lead_pi_id != current_user.id:
        # Check if user has GRANT_OFFICER role
        if ResearchRole.GRANT_OFFICER not in [r.role for r in current_user.research_roles]:
            raise HTTPException(403, "Only the lead PI or grant officers can delete proposals")
    
    await db.delete(proposal)
    await db.commit()
    return {"message": "Proposal deleted successfully"}


@router.post("/{proposal_id}/collaborators", status_code=201)
async def add_collaborator(
    proposal_id: int,
    user_id: int,
    role: str = "co_investigator",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    """Add a collaborator to a proposal"""
    result = await db.execute(select(Proposal).where(
        Proposal.id == proposal_id,
        Proposal.lead_pi_id == current_user.id
    ))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(404, "Proposal not found or you're not the lead PI")
    
    # Check if user exists
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    
    # Check if already a collaborator
    existing = await db.execute(select(ProposalCollaborator).where(
        ProposalCollaborator.proposal_id == proposal_id,
        ProposalCollaborator.user_id == user_id
    ))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "User is already a collaborator")
    
    collaborator = ProposalCollaborator(
        proposal_id=proposal_id,
        user_id=user_id,
        role=role
    )
    db.add(collaborator)
    await db.commit()
    
    await create_notification(
        db, user_id,
        title="Added to proposal",
        message=f'You have been added as {role} to proposal "{proposal.title}"',
        entity_type="proposal", entity_id=proposal_id
    )
    
    return {"id": collaborator.id, "user_id": user_id, "role": role}


@router.delete("/{proposal_id}/collaborators/{collaborator_id}")
async def remove_collaborator(
    proposal_id: int,
    collaborator_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    """Remove a collaborator from a proposal"""
    result = await db.execute(select(Proposal).where(
        Proposal.id == proposal_id,
        Proposal.lead_pi_id == current_user.id
    ))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(404, "Proposal not found or you're not the lead PI")
    
    collaborator = await db.get(ProposalCollaborator, collaborator_id)
    if not collaborator or collaborator.proposal_id != proposal_id:
        raise HTTPException(404, "Collaborator not found")
    
    await db.delete(collaborator)
    await db.commit()
    return {"message": "Collaborator removed"}


@router.get("/{proposal_id}/completion")
async def get_proposal_completion(
    proposal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER
    ]))
):
    """Get proposal completion percentage"""
    result = await db.execute(
        select(Proposal).options(
            selectinload(Proposal.sections),
            selectinload(Proposal.documents)
        ).where(
            Proposal.id == proposal_id,
            Proposal.institution_id == current_user.primary_institution_id
        )
    )
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(404, "Proposal not found")
    
    total_sections = len(proposal.sections)
    completed_sections = sum(1 for s in proposal.sections if s.word_count > 50)
    
    required_docs = ["cv", "budget", "support_letter"]
    uploaded_doc_types = {d.document_type for d in proposal.documents}
    completed_docs = sum(1 for dt in required_docs if dt in uploaded_doc_types)
    
    section_pct = (completed_sections / total_sections * 100) if total_sections > 0 else 0
    doc_pct = (completed_docs / len(required_docs) * 100) if required_docs else 0
    overall_pct = (section_pct * 0.7 + doc_pct * 0.3)
    
    return {
        "overall_percentage": round(overall_pct, 1),
        "sections_completed": completed_sections,
        "sections_total": total_sections,
        "documents_completed": completed_docs,
        "documents_required": len(required_docs),
        "missing_documents": [dt for dt in required_docs if dt not in uploaded_doc_types]
    }


# ─── Admin Workflow Endpoints ──────────────────────────────────

WORKFLOW_STAGES = [
    {"step": 0, "key": "received",    "label": "Received",              "status": "submitted"},
    {"step": 1, "key": "eligibility", "label": "Step 1/5: Eligibility Review", "status": "internal_review"},
    {"step": 2, "key": "technical",   "label": "Step 2/5: Technical Review",   "status": "internal_review"},
    {"step": 3, "key": "budget",      "label": "Step 3/5: Budget Review",      "status": "under_review"},
    {"step": 4, "key": "panel",       "label": "Step 4/5: Panel Review",       "status": "under_review"},
    {"step": 5, "key": "final",       "label": "Step 5/5: Final Approval",     "status": "under_review"},
]


@router.get("/{proposal_id}/workflow")
async def get_proposal_workflow(
    proposal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Proposal).options(selectinload(Proposal.lead_pi)).where(Proposal.id == proposal_id)
    )
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(404, "Proposal not found")

    return {
        "id": proposal.id,
        "status": proposal.status,
        "review_step": getattr(proposal, "review_step", 0) or 0,
        "review_stage_name": getattr(proposal, "review_stage_name", None),
        "stage_notes": getattr(proposal, "stage_notes", None),
        "stages": WORKFLOW_STAGES,
    }


class WorkflowAdvanceRequest(BaseModel):
    action: str            # "advance" | "return" | "decline"
    notes: Optional[str] = None


@router.post("/{proposal_id}/workflow/advance")
async def advance_proposal_workflow(
    proposal_id: int,
    body: WorkflowAdvanceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin-only: advance, return, or decline a proposal through the workflow."""
    # Role check — must be admin/grant staff
    is_admin = current_user.is_institution_admin or current_user.is_global_admin
    if not is_admin:
        roles_res = await db.execute(
            text("SELECT role FROM user_roles WHERE user_id = :uid"),
            {"uid": current_user.id}
        )
        user_roles = [r[0] for r in roles_res.fetchall()]
        admin_roles = {"grant_officer", "research_admin", "institutional_lead", "system_admin"}
        if not any(r in admin_roles for r in user_roles):
            raise HTTPException(403, "Only grant staff can advance proposals")

    result = await db.execute(select(Proposal).where(Proposal.id == proposal_id))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(404, "Proposal not found")

    current_step = getattr(proposal, "review_step", 0) or 0
    action = body.action
    notes = body.notes

    if action == "advance":
        if current_step >= 5:
            # Step 5 advance → award
            proposal.status = ProposalStatus.AWARDED
            new_step = 5
            new_stage = "Awarded"
        else:
            new_step = current_step + 1
            stage_info = next((s for s in WORKFLOW_STAGES if s["step"] == new_step), None)
            new_stage = stage_info["label"] if stage_info else f"Step {new_step}"
            # Update status based on step
            if new_step <= 1:
                proposal.status = ProposalStatus.SUBMITTED
            elif new_step <= 2:
                proposal.status = ProposalStatus.INTERNAL_REVIEW
            else:
                proposal.status = ProposalStatus.UNDER_REVIEW

    elif action == "return":
        proposal.status = ProposalStatus.RETURNED
        new_step = 0
        new_stage = "Returned for Revision"

    elif action == "decline":
        proposal.status = ProposalStatus.DECLINED
        new_step = 0
        new_stage = "Not Awarded"

    else:
        raise HTTPException(400, f"Unknown action: {action}")

    # Record stage history: exit current stage, enter new stage
    now = datetime.now(timezone.utc)

    # Close out the current active stage entry
    active_hist_result = await db.execute(
        select(ProposalStageHistory).where(
            ProposalStageHistory.proposal_id == proposal_id,
            ProposalStageHistory.exited_at == None,
        )
    )
    active_hist = active_hist_result.scalar_one_or_none()
    if active_hist:
        active_hist.exited_at = now

    # Only create a new history entry for advance (not return/decline)
    if action == "advance":
        db.add(ProposalStageHistory(
            proposal_id=proposal_id,
            stage_step=new_step,
            stage_name=new_stage,
            entered_at=now,
            intended_days=STAGE_INTENDED_DAYS.get(new_step, 7),
            entered_by_id=current_user.id,
        ))

    proposal.review_step = new_step
    proposal.review_stage_name = new_stage
    if notes:
        proposal.stage_notes = notes

    await db.commit()

    # Notify lead PI
    action_labels = {"advance": "advanced to", "return": "returned from", "decline": "declined at"}
    await create_notification(
        db, proposal.lead_pi_id,
        title=f"Proposal status update: {new_stage}",
        message=f'Your proposal "{proposal.title}" has been {action_labels.get(action, "updated to")} "{new_stage}". {notes or ""}',
        entity_type="proposal", entity_id=proposal_id
    )

    return {"id": proposal_id, "review_step": new_step, "review_stage_name": new_stage, "status": proposal.status}


# ─── Stage History ──────────────────────────────────────────────

@router.get("/{proposal_id}/stage-history")
async def get_stage_history(
    proposal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProposalStageHistory)
        .options(selectinload(ProposalStageHistory.entered_by))
        .where(ProposalStageHistory.proposal_id == proposal_id)
        .order_by(ProposalStageHistory.stage_step)
    )
    history = result.scalars().all()
    assigns = await db.execute(
        select(ProposalStageAssignment)
        .options(selectinload(ProposalStageAssignment.reviewer))
        .where(
            ProposalStageAssignment.proposal_id == proposal_id,
            ProposalStageAssignment.status == "active",
        )
    )
    assignments = assigns.scalars().all()
    assign_map = {a.stage_step: {
        "id": a.id, "stage_step": a.stage_step, "stage_name": a.stage_name,
        "reviewer": {"id": a.reviewer.id, "name": a.reviewer.name, "email": a.reviewer.email} if a.reviewer else None,
        "assigned_at": a.assigned_at.isoformat() if a.assigned_at else None,
        "notes": a.notes, "status": a.status,
    } for a in assignments}

    out = []
    for h in history:
        out.append({
            "id": h.id, "stage_step": h.stage_step, "stage_name": h.stage_name,
            "entered_at": h.entered_at.isoformat() if h.entered_at else None,
            "intended_days": h.intended_days,
            "exited_at": h.exited_at.isoformat() if h.exited_at else None,
            "entered_by": {"id": h.entered_by.id, "name": h.entered_by.name, "email": h.entered_by.email} if h.entered_by else None,
            "assignment": assign_map.get(h.stage_step),
        })
    return {"history": out, "assignments": list(assign_map.values())}


# ─── Stage Reviewer Assignment ──────────────────────────────────

class AssignReviewerBody(BaseModel):
    reviewer_id: int
    stage_step: int
    stage_name: Optional[str] = None
    notes: Optional[str] = None


@router.post("/{proposal_id}/stage-reviewers")
async def assign_stage_reviewer(
    proposal_id: int,
    body: AssignReviewerBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Assign a reviewer to a specific review stage of a proposal."""
    is_admin = current_user.is_institution_admin or current_user.is_global_admin
    if not is_admin:
        roles_res = await db.execute(text("SELECT role FROM user_roles WHERE user_id = :uid"), {"uid": current_user.id})
        user_roles = [r[0] for r in roles_res.fetchall()]
        if not any(r in {"grant_officer", "research_admin", "institutional_lead", "system_admin"} for r in user_roles):
            raise HTTPException(403, "Only grant staff can assign reviewers")

    proposal = await db.get(Proposal, proposal_id)
    if not proposal:
        raise HTTPException(404, "Proposal not found")

    reviewer = await db.get(User, body.reviewer_id)
    if not reviewer:
        raise HTTPException(404, "Reviewer not found")

    # Remove any existing assignment for this stage
    existing = await db.execute(
        select(ProposalStageAssignment).where(
            ProposalStageAssignment.proposal_id == proposal_id,
            ProposalStageAssignment.stage_step == body.stage_step,
            ProposalStageAssignment.status == "active",
        )
    )
    for old in existing.scalars().all():
        old.status = "removed"

    stage_name = body.stage_name or f"Stage {body.stage_step}"
    assignment = ProposalStageAssignment(
        proposal_id=proposal_id,
        stage_step=body.stage_step,
        stage_name=stage_name,
        reviewer_id=body.reviewer_id,
        assigned_by_id=current_user.id,
        notes=body.notes,
        status="active",
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)

    # Notify reviewer
    await create_notification(
        db, body.reviewer_id,
        title=f"Review assignment: {stage_name}",
        message=f'You have been assigned to review "{proposal.title}" at the {stage_name} stage.',
        entity_type="proposal", entity_id=proposal_id,
    )

    return {
        "id": assignment.id, "stage_step": body.stage_step, "stage_name": stage_name,
        "reviewer_id": body.reviewer_id, "reviewer_name": reviewer.name,
    }


@router.delete("/{proposal_id}/stage-reviewers/{assignment_id}")
async def remove_stage_reviewer(
    proposal_id: int,
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = await db.get(ProposalStageAssignment, assignment_id)
    if not assignment or assignment.proposal_id != proposal_id:
        raise HTTPException(404, "Assignment not found")
    assignment.status = "removed"
    await db.commit()
    return {"message": "Reviewer removed"}


# ─── Available Reviewers ─────────────────────────────────────────

@router.get("/reviewers/available")
async def list_available_reviewers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return users who can act as reviewers (grant_officer, external_reviewer, etc.).
    If no reviewers with reviewer roles are found, defaults to current user."""
    reviewer_roles = ("grant_officer", "research_admin", "institutional_lead",
                      "external_reviewer", "ethics_reviewer")
    result = await db.execute(
        text("""
            SELECT DISTINCT u.id, u.name, u.email,
                string_agg(ur.role, ', ') AS roles
            FROM users u
            JOIN user_roles ur ON ur.user_id = u.id
            WHERE ur.role = ANY(:roles)
              AND u.primary_institution_id = :inst_id
            GROUP BY u.id, u.name, u.email
            ORDER BY u.name
        """),
        {"roles": list(reviewer_roles), "inst_id": current_user.primary_institution_id},
    )
    rows = result.fetchall()
    reviewers = [{"id": r[0], "name": r[1], "email": r[2], "roles": r[3]} for r in rows]
    
    # If no reviewers found, default to current user
    if not reviewers:
        # Get current user's roles
        roles_result = await db.execute(
            text("SELECT string_agg(role, ', ') FROM user_roles WHERE user_id = :uid"),
            {"uid": current_user.id}
        )
        user_roles = roles_result.scalar() or "admin_staff"
        reviewers = [{
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "roles": user_roles
        }]
    
    return reviewers


# ─── Document Preview ──────────────────────────────────────────

@router.get("/{proposal_id}/documents/{doc_id}/preview")
async def preview_document(
    proposal_id: int,
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Serve a document file inline for in-browser preview."""
    result = await db.execute(
        select(ProposalDocument).where(
            ProposalDocument.id == doc_id,
            ProposalDocument.proposal_id == proposal_id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Document not found")

    from services.file_upload import get_file_path, UPLOAD_DIR
    path = os.path.join(UPLOAD_DIR, "documents", doc.stored_filename)
    if not os.path.exists(path):
        raise HTTPException(404, "File not found on disk")

    media_type = getattr(doc, "mime_type", None) or "application/octet-stream"
    return FastAPIFileResponse(
        path=path,
        media_type=media_type,
        filename=getattr(doc, "original_filename", doc.stored_filename),
        headers={"Content-Disposition": f'inline; filename="{getattr(doc, "original_filename", doc.stored_filename)}"'},
    )
