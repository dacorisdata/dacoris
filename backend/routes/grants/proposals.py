from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response, Query
from fastapi.responses import FileResponse as FastAPIFileResponse
import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, or_, func
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta

from database import get_db
from models import (Proposal, ProposalSection, ProposalSectionVersion, ProposalDocument,
                    ProposalDocumentRequirement, ProposalCollaborator, ProposalStatus, GrantOpportunity, User, UserStatus,
                    ProposalStageHistory, ProposalStageAssignment, STAGE_INTENDED_DAYS, Award, BudgetLine,
                    PrimaryAccountType, ResearchRole, user_roles, ReviewerAssignment, ReviewType,
                    ReviewerAssignmentStatus, NotificationType, ProposalReview, ReviewStatus,
                    ResearchProject, ProjectStatus)
from auth import require_roles, ResearchRole, get_current_user
from services.workflow import can_transition_proposal
from services.notifications import create_notification
from services.file_upload import save_upload
from services.reviewer_onboarding import get_or_create_reviewer_user
from services.collaborator_matcher import suggest_collaborators, researcher_profile_snapshot
from services.email_service import EmailService

router = APIRouter(prefix="/api/grants/proposals", tags=["proposals"])

DEFAULT_INVITE_RESPONSE_DAYS = int(os.getenv("INVITE_RESPONSE_DAYS", "7"))


def _invite_due_from_now(days: Optional[int] = None) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=days if days is not None else DEFAULT_INVITE_RESPONSE_DAYS)

# Account types that can see all institutional proposals (including drafts)
_INSTITUTION_PROPOSAL_VIEWERS = {
    PrimaryAccountType.ADMIN_STAFF,
    PrimaryAccountType.GRANT_MANAGER,
    PrimaryAccountType.INSTITUTIONAL_LEADERSHIP,
    PrimaryAccountType.DIRECTOR_RESEARCH,
    PrimaryAccountType.DVC_RESEARCH,
    PrimaryAccountType.RESEARCH_ADMINISTRATOR,
}

# Only Director Research and Research Administrator may assign stage reviewers
_REVIEWER_ASSIGNER_ACCOUNT_TYPES = {
    PrimaryAccountType.DIRECTOR_RESEARCH,
    PrimaryAccountType.RESEARCH_ADMINISTRATOR,
}
_REVIEWER_ASSIGNER_ROLES = {
    ResearchRole.DIRECTOR_RESEARCH.value,
    ResearchRole.RESEARCH_ADMIN.value,
    "DIRECTOR_RESEARCH",
    "RESEARCH_ADMIN",
    "RESEARCH_ADMINISTRATOR",
}


def _can_view_all_institution_proposals(user: User) -> bool:
    if user.is_global_admin or user.is_institution_admin:
        return True
    return user.primary_account_type in _INSTITUTION_PROPOSAL_VIEWERS


async def _can_assign_stage_reviewers(db: AsyncSession, user: User) -> bool:
    """Director Research / Research Administrator (or platform admins)."""
    if user.is_institution_admin or user.is_global_admin:
        return True
    if user.primary_account_type in _REVIEWER_ASSIGNER_ACCOUNT_TYPES:
        return True
    roles_res = await db.execute(
        text("SELECT role::text FROM user_roles WHERE user_id = :uid"),
        {"uid": user.id},
    )
    role_names = {str(r[0]).lower() for r in roles_res.fetchall()}
    allowed = {str(r).lower() for r in _REVIEWER_ASSIGNER_ROLES}
    return bool(role_names & allowed)


async def _is_proposal_pi_or_collaborator(db: AsyncSession, proposal: Proposal, user: User) -> bool:
    if proposal.lead_pi_id == user.id:
        return True
    result = await db.execute(
        select(ProposalCollaborator).where(
            ProposalCollaborator.proposal_id == proposal.id,
            ProposalCollaborator.user_id == user.id,
            ProposalCollaborator.status == "accepted",
        ).limit(1)
    )
    return result.scalar_one_or_none() is not None


def _post_approval_statuses():
    return {
        ProposalStatus.APPROVED,
        ProposalStatus.APPLYING,
        ProposalStatus.AWARDED,
        ProposalStatus.FUNDING_UNSUCCESSFUL,
    }


async def _all_active_reviews_submitted(db: AsyncSession, proposal_id: str) -> bool:
    """True when every active section/stage assignment has a submitted review."""
    assigns = await db.execute(
        select(ProposalStageAssignment).where(
            ProposalStageAssignment.proposal_id == proposal_id,
            ProposalStageAssignment.status == "active",
        )
    )
    active = assigns.scalars().all()
    if not active:
        return False
    for assignment in active:
        review_q = select(ProposalReview).where(
            ProposalReview.proposal_id == proposal_id,
            ProposalReview.reviewer_id == assignment.reviewer_id,
            ProposalReview.status == ReviewStatus.SUBMITTED,
        )
        if assignment.section_id:
            review_q = review_q.where(ProposalReview.section_id == assignment.section_id)
        review_result = await db.execute(review_q)
        if not review_result.scalar_one_or_none():
            return False
    return True


async def _require_proposal_workspace_access(
    db: AsyncSession,
    proposal: Proposal,
    user: User,
) -> None:
    """Lead PI, accepted collaborators, or institution viewers may open/work a proposal.
    Pending invitees must accept before they can access the workspace.
    """
    if _can_view_all_institution_proposals(user):
        return
    if proposal.lead_pi_id == user.id:
        return

    result = await db.execute(
        select(ProposalCollaborator.status).where(
            ProposalCollaborator.proposal_id == proposal.id,
            ProposalCollaborator.user_id == user.id,
        ).limit(1)
    )
    status = result.scalar_one_or_none()
    if status == "accepted":
        return
    if status == "pending":
        raise HTTPException(
            403,
            "Accept the collaboration invitation before working on this proposal",
        )
    raise HTTPException(403, "You do not have access to this proposal")


async def _resolve_collab_invite_notifications(
    db: AsyncSession,
    user_id: str,
    proposal_id: str,
    collaborator_id: str,
) -> None:
    """Mark invite notifications for this collaboration as read so they leave the actionable list."""
    from models import Notification

    link = f"/researcher/grants/proposals/{proposal_id}/collab/{collaborator_id}"
    result = await db.execute(
        select(Notification).where(
            Notification.recipient_id == user_id,
            Notification.action_url == link,
            Notification.is_read == False,
        )
    )
    now = datetime.now(timezone.utc)
    for n in result.scalars().all():
        n.is_read = True
        n.read_at = now


async def _notify_director_research_new_proposal(
    db: AsyncSession,
    proposal: Proposal,
    creator: User,
) -> None:
    """In-app notify Director Research users when a new proposal is created."""
    if not proposal.institution_id:
        return

    director_ids = select(user_roles.c.user_id).where(
        user_roles.c.role == ResearchRole.DIRECTOR_RESEARCH
    )
    result = await db.execute(
        select(User).where(
            User.primary_institution_id == proposal.institution_id,
            User.status == UserStatus.ACTIVE,
            User.id != creator.id,
            or_(
                User.primary_account_type == PrimaryAccountType.DIRECTOR_RESEARCH,
                User.id.in_(director_ids),
            ),
        )
    )
    directors = result.scalars().all()
    for director in directors:
        await create_notification(
            db,
            director.id,
            title="New Proposal Created",
            message=f"{creator.name} created a new proposal: '{proposal.title}'",
            entity_type="proposal",
            entity_id=proposal.id,
            link=f"/admin-staff/grants/proposals/{proposal.id}",
            notification_type=NotificationType.PROPOSAL_SUBMITTED,
        )


async def _normalize_section_orders(db: AsyncSession, proposal_id: str, sections: Optional[list] = None) -> None:
    """Ensure sections have unique sequential order (fixes legacy rows with duplicate order)."""
    if sections is None:
        result = await db.execute(
            select(ProposalSection)
            .where(ProposalSection.proposal_id == proposal_id)
            .order_by(ProposalSection.section_order, ProposalSection.id)
        )
        sections = list(result.scalars().all())
    else:
        sections = sorted(sections, key=lambda s: (s.section_order, s.id))

    changed = False
    for index, section in enumerate(sections):
        if section.section_order != index:
            section.section_order = index
            changed = True
    if changed:
        await db.commit()


def _sort_sections(sections: list) -> None:
    sections.sort(key=lambda s: (s.section_order, s.id))


class CollaboratorInvite(BaseModel):
    orcid: Optional[str] = None
    user_id: Optional[str] = None  # For Dacoris users
    name: str
    email: Optional[str] = None
    affiliation: Optional[str] = None
    role: str = "Co-Investigator"


class ProposalCreate(BaseModel):
    opportunity_id: str
    title: str
    collaborators: Optional[List[CollaboratorInvite]] = []


class OpportunityBasic(BaseModel):
    id: str
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
    id: str
    name: str
    email: str

    class Config:
        from_attributes = True


class CollaboratorOut(BaseModel):
    id: str
    role: str
    status: str
    user_id: Optional[str] = None
    invited_email: Optional[str] = None
    invited_orcid: Optional[str] = None
    invited_name: Optional[str] = None
    invited_affiliation: Optional[str] = None
    invited_at: Optional[datetime] = None
    invite_due_at: Optional[datetime] = None
    user: Optional[UserBasic] = None

    class Config:
        from_attributes = True


class SectionSummary(BaseModel):
    id: str
    title: str
    word_count: int
    section_order: int
    content_html: Optional[str] = None
    section_type: Optional[str] = None

    class Config:
        from_attributes = True


class DocumentRequirementOut(BaseModel):
    id: str
    label: str
    item_order: int
    document: Optional[dict] = None

    class Config:
        from_attributes = True


class StageHistoryOut(BaseModel):
    id: str
    stage_step: int
    stage_name: Optional[str]
    entered_at: Optional[datetime]
    intended_days: Optional[int]
    exited_at: Optional[datetime]
    entered_by: Optional[UserBasic] = None

    class Config:
        from_attributes = True


class StageAssignmentOut(BaseModel):
    id: str
    stage_step: int
    stage_name: Optional[str]
    section_id: Optional[str] = None
    section_title: Optional[str] = None
    reviewer: Optional[UserBasic]
    assigned_at: Optional[datetime]
    notes: Optional[str]
    status: Optional[str]

    class Config:
        from_attributes = True


class AwardBasic(BaseModel):
    id: str
    award_number: Optional[str] = None
    total_amount: float
    currency: str
    funder_name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    conditions: Optional[str] = None
    issued_at: Optional[datetime] = None
    status: Optional[str] = None

    class Config:
        from_attributes = True


class ProposalOut(BaseModel):
    id: str
    title: str
    status: str
    opportunity_id: str
    lead_pi_id: str
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
    award: Optional[AwardBasic] = None

    class Config:
        from_attributes = True


class SectionUpdate(BaseModel):
    content_html: str
    word_count: Optional[int] = 0


class SectionReorder(BaseModel):
    section_ids: List[str]


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

    existing = await db.execute(
        select(Proposal).where(
            Proposal.opportunity_id == data.opportunity_id,
            Proposal.lead_pi_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "You have already applied for this opportunity")

    # Pre-resolve collaborators and require an email for every invitee
    resolved_collabs = []
    if data.collaborators:
        for collab in data.collaborators:
            user = None
            invite_email = (collab.email or "").strip().lower() or None

            if collab.user_id:
                user = await db.get(User, collab.user_id)
            if not user and collab.orcid:
                result = await db.execute(
                    select(User).where(User.orcid_id == collab.orcid)
                )
                user = result.scalar_one_or_none()
            if not user and invite_email:
                result = await db.execute(
                    select(User).where(func.lower(User.email) == invite_email)
                )
                user = result.scalar_one_or_none()

            if user and not invite_email:
                invite_email = (user.email or "").strip().lower() or None

            if not invite_email:
                raise HTTPException(
                    400,
                    f"Email is required for collaborator '{collab.name}' so the invitation can be sent",
                )

            resolved_collabs.append((collab, user, invite_email))

    proposal = Proposal(
        opportunity_id=data.opportunity_id,
        institution_id=current_user.primary_institution_id,
        lead_pi_id=current_user.id,
        title=data.title,
    )
    db.add(proposal)
    await db.flush()

    # Persist collaborators + in-app notifications first; send emails after commit
    import secrets
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    pending_emails = []  # list of async call specs after commit

    if resolved_collabs:
        for collab, user, invite_email in resolved_collabs:
            if user:
                due_at = _invite_due_from_now()
                new_collab = ProposalCollaborator(
                    proposal_id=proposal.id,
                    user_id=user.id,
                    role=collab.role,
                    status="pending",
                    invited_email=invite_email,
                    invited_name=collab.name,
                    invited_orcid=collab.orcid,
                    invited_affiliation=collab.affiliation,
                    invite_due_at=due_at,
                )
                db.add(new_collab)
                await db.flush()

                await create_notification(
                    db, user.id,
                    title="Proposal Collaboration Invite",
                    message=f"{current_user.name} invited you to collaborate on '{data.title}' as {collab.role}",
                    entity_type="proposal",
                    entity_id=proposal.id,
                    link=f"/researcher/grants/proposals/{proposal.id}/collab/{new_collab.id}",
                    notification_type=NotificationType.PROPOSAL_INVITATION,
                )

                pending_emails.append({
                    "kind": "registered",
                    "email": user.email or invite_email,
                    "role": collab.role,
                    "proposal_url": f"{frontend_url}/researcher/grants/proposals/{proposal.id}",
                })
            else:
                invitation_token = secrets.token_urlsafe(32)
                registration_url = f"{frontend_url}/register?invitation={invitation_token}"
                due_at = _invite_due_from_now()

                db.add(ProposalCollaborator(
                    proposal_id=proposal.id,
                    user_id=None,
                    role=collab.role,
                    status="pending",
                    invited_email=invite_email,
                    invited_orcid=collab.orcid,
                    invited_name=collab.name,
                    invited_affiliation=collab.affiliation,
                    invitation_token=invitation_token,
                    invite_due_at=due_at,
                ))

                pending_emails.append({
                    "kind": "unregistered",
                    "email": invite_email,
                    "role": collab.role,
                    "invitation_token": invitation_token,
                    "proposal_url": registration_url,
                })

    await _notify_director_research_new_proposal(db, proposal, current_user)
    await db.commit()

    # Send invite emails after commit so SMTP failures cannot roll back the proposal
    for job in pending_emails:
        try:
            if job["kind"] == "registered":
                sent = await EmailService.send_collaboration_invite_email(
                    email=job["email"],
                    inviter_name=current_user.name,
                    proposal_title=data.title,
                    role=job["role"],
                    proposal_url=job["proposal_url"],
                )
                print(f"Invite email to {job['email']}: {'ok' if sent else 'FAILED'}")
            else:
                account_sent = await EmailService.send_account_creation_invite_email(
                    email=job["email"],
                    inviter_name=current_user.name,
                    invitation_token=job["invitation_token"],
                )
                collab_sent = await EmailService.send_collaboration_invite_email(
                    email=job["email"],
                    inviter_name=current_user.name,
                    proposal_title=data.title,
                    role=job["role"],
                    proposal_url=job["proposal_url"],
                )
                print(
                    f"New-user invite emails to {job['email']}: "
                    f"account={'ok' if account_sent else 'FAILED'}, "
                    f"collab={'ok' if collab_sent else 'FAILED'}"
                )
        except Exception as e:
            print(f"Failed to send invite email(s) to {job.get('email')}: {e}")

    # Reload with relationships eagerly loaded
    result = await db.execute(
        select(Proposal).where(Proposal.id == proposal.id).options(
            selectinload(Proposal.opportunity),
            selectinload(Proposal.collaborators).selectinload(ProposalCollaborator.user),
            selectinload(Proposal.lead_pi),
            selectinload(Proposal.sections),
            selectinload(Proposal.stage_history).selectinload(ProposalStageHistory.entered_by),
            selectinload(Proposal.stage_assignments).selectinload(ProposalStageAssignment.reviewer),
            selectinload(Proposal.award),
        )
    )
    return result.scalar_one()


@router.get("", response_model=List[ProposalOut])
async def list_proposals(
    opportunity_id: Optional[str] = Query(None, description="Filter by grant opportunity"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER,
        ResearchRole.INSTITUTIONAL_LEAD
    ]))
):
    # Admin-staff portal roles (Director Research, Research Admin, etc.) see all
    # institutional proposals including drafts. Researchers only see their own /
    # accepted collaborations (pending invitees must accept first).
    if _can_view_all_institution_proposals(current_user):
        query = select(Proposal).where(
            Proposal.institution_id == current_user.primary_institution_id
        )
    else:
        query = select(Proposal).where(
            or_(
                Proposal.lead_pi_id == current_user.id,
                Proposal.id.in_(
                    select(ProposalCollaborator.proposal_id).where(
                        ProposalCollaborator.user_id == current_user.id,
                        ProposalCollaborator.status == "accepted",
                    )
                )
            )
        )

    if opportunity_id:
        query = query.where(Proposal.opportunity_id == opportunity_id)
    
    query = query.options(
        selectinload(Proposal.opportunity),
        selectinload(Proposal.collaborators).selectinload(ProposalCollaborator.user),
        selectinload(Proposal.lead_pi),
        selectinload(Proposal.sections),
        selectinload(Proposal.stage_history).selectinload(ProposalStageHistory.entered_by),
        selectinload(Proposal.stage_assignments).selectinload(ProposalStageAssignment.reviewer),
        selectinload(Proposal.award),
    )
    result = await db.execute(query.order_by(Proposal.created_at.desc()))
    return result.scalars().all()


class PendingInviteOut(BaseModel):
    collaborator_id: str
    proposal_id: str
    proposal_title: str
    proposal_status: str
    role: str
    status: str
    invited_at: Optional[datetime] = None
    invite_due_at: Optional[datetime] = None
    lead_pi_name: Optional[str] = None
    opportunity_title: Optional[str] = None


@router.get("/invitations", response_model=List[PendingInviteOut])
async def list_pending_invitations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List collaboration invites the current user has not yet accepted or declined."""
    email = (current_user.email or "").strip().lower()
    conditions = [
        ProposalCollaborator.user_id == current_user.id,
    ]
    if email:
        conditions.append(func.lower(ProposalCollaborator.invited_email) == email)

    result = await db.execute(
        select(ProposalCollaborator)
        .options(
            selectinload(ProposalCollaborator.proposal).selectinload(Proposal.opportunity),
            selectinload(ProposalCollaborator.proposal).selectinload(Proposal.lead_pi),
        )
        .where(
            ProposalCollaborator.status == "pending",
            or_(*conditions),
        )
        .order_by(ProposalCollaborator.invited_at.desc().nullslast())
    )
    collabs = result.scalars().all()
    out = []
    for c in collabs:
        proposal = c.proposal
        if not proposal:
            continue
        out.append(PendingInviteOut(
            collaborator_id=c.id,
            proposal_id=proposal.id,
            proposal_title=proposal.title,
            proposal_status=proposal.status.value if hasattr(proposal.status, "value") else str(proposal.status),
            role=c.role,
            status=c.status,
            invited_at=c.invited_at,
            invite_due_at=c.invite_due_at,
            lead_pi_name=proposal.lead_pi.name if proposal.lead_pi else None,
            opportunity_title=proposal.opportunity.title if proposal.opportunity else None,
        ))
    return out


@router.get("/{proposal_id}")
async def get_proposal(
    proposal_id: str,
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
            selectinload(Proposal.document_requirements).selectinload(ProposalDocumentRequirement.document),
            selectinload(Proposal.collaborators).selectinload(ProposalCollaborator.user),
            selectinload(Proposal.lead_pi),
            selectinload(Proposal.reviews),
            selectinload(Proposal.stage_history).selectinload(ProposalStageHistory.entered_by),
            selectinload(Proposal.stage_assignments).selectinload(ProposalStageAssignment.reviewer),
            selectinload(Proposal.award),
        )
        .where(
            Proposal.id == proposal_id,
            Proposal.institution_id == current_user.primary_institution_id
        )
    )
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(404, "Proposal not found")

    await _require_proposal_workspace_access(db, proposal, current_user)

    await _normalize_section_orders(db, proposal_id, proposal.sections)

    # Sort sections by section_order (stable tie-breaker on id)
    if proposal.sections:
        _sort_sections(proposal.sections)

    if proposal.document_requirements:
        proposal.document_requirements.sort(key=lambda r: (r.item_order, r.id))

    return proposal


@router.put("/{proposal_id}/sections/reorder")
async def reorder_sections(
    proposal_id: str,
    data: SectionReorder,
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

    await _require_proposal_workspace_access(db, proposal, current_user)

    if proposal.status != ProposalStatus.DRAFT:
        raise HTTPException(400, "Cannot reorder sections in non-draft proposals")

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


@router.put("/{proposal_id}/sections/{section_id}")
async def update_section(
    proposal_id: str,
    section_id: str,
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
    if not proposal_obj:
        raise HTTPException(404, "Proposal not found")
    await _require_proposal_workspace_access(db, proposal_obj, current_user)
    is_lead_pi = proposal_obj.lead_pi_id == current_user.id
    
    if section.allowed_roles and not is_lead_pi:
        allowed = [r.strip() for r in section.allowed_roles.split(",") if r.strip()]
        # Get user roles from the user_roles table
        from sqlalchemy import text
        roles_result = await db.execute(
            text("SELECT role::text FROM user_roles WHERE user_id = :user_id"),
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
    proposal_id: str,
    section_id: str,
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
    proposal_id: str,
    section_id: str,
    version_id: str,
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
    proposal_id: str,
    section_id: str,
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
    proposal_id: str,
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

    result = await db.execute(
        select(ProposalSection).where(ProposalSection.proposal_id == proposal_id)
    )
    existing_sections = result.scalars().all()
    next_order = len(existing_sections)
    
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
    proposal_id: str,
    section_id: str,
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
    proposal_id: str,
    section_id: str,
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


@router.post("/{proposal_id}/documents", status_code=201)
async def upload_document(
    proposal_id: str,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    requirement_id: Optional[str] = Form(None),
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

    if proposal.status == ProposalStatus.DRAFT:
        pass
    elif proposal.status in _post_approval_statuses():
        if not await _is_proposal_pi_or_collaborator(db, proposal, current_user):
            raise HTTPException(403, "Only the lead PI or accepted team members can upload funding documents")
        if not requirement_id:
            document_type = document_type or "funding_award"
    else:
        raise HTTPException(400, "Cannot upload documents while proposal is under institutional review")

    requirement = None
    if requirement_id:
        req_result = await db.execute(select(ProposalDocumentRequirement).where(
            ProposalDocumentRequirement.id == requirement_id,
            ProposalDocumentRequirement.proposal_id == proposal_id,
        ))
        requirement = req_result.scalar_one_or_none()
        if not requirement:
            raise HTTPException(404, "Document requirement not found")

        existing_doc_result = await db.execute(
            select(ProposalDocument).where(ProposalDocument.requirement_id == requirement_id)
        )
        existing_doc = existing_doc_result.scalar_one_or_none()
        if existing_doc:
            await db.delete(existing_doc)
            await db.flush()

    file_info = await save_upload(file, subfolder="documents")
    doc = ProposalDocument(
        proposal_id=proposal_id,
        requirement_id=requirement_id,
        document_type=document_type or (requirement.label if requirement else "other"),
        uploaded_by_id=current_user.id,
        **file_info,
    )
    db.add(doc)
    await db.commit()
    return {"id": doc.id, "filename": file_info["original_filename"]}


class DocumentRequirementCreate(BaseModel):
    label: str


class DocumentRequirementReorder(BaseModel):
    requirement_ids: List[str]


@router.post("/{proposal_id}/document-requirements", status_code=201)
async def create_document_requirement(
    proposal_id: str,
    data: DocumentRequirementCreate,
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
    if proposal.status != ProposalStatus.DRAFT:
        raise HTTPException(400, "Cannot modify document requirements on non-draft proposals")

    label = data.label.strip()
    if not label:
        raise HTTPException(400, "Document label is required")

    existing = await db.execute(
        select(ProposalDocumentRequirement).where(ProposalDocumentRequirement.proposal_id == proposal_id)
    )
    next_order = len(existing.scalars().all())

    requirement = ProposalDocumentRequirement(
        proposal_id=proposal_id,
        label=label,
        item_order=next_order,
    )
    db.add(requirement)
    await db.commit()
    await db.refresh(requirement)
    return {"id": requirement.id, "label": requirement.label, "item_order": requirement.item_order}


@router.delete("/{proposal_id}/document-requirements/{requirement_id}")
async def delete_document_requirement(
    proposal_id: str,
    requirement_id: str,
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
    if proposal.status != ProposalStatus.DRAFT:
        raise HTTPException(400, "Cannot modify document requirements on non-draft proposals")

    req_result = await db.execute(select(ProposalDocumentRequirement).where(
        ProposalDocumentRequirement.id == requirement_id,
        ProposalDocumentRequirement.proposal_id == proposal_id,
    ))
    requirement = req_result.scalar_one_or_none()
    if not requirement:
        raise HTTPException(404, "Document requirement not found")

    await db.delete(requirement)
    await db.commit()

    remaining = await db.execute(
        select(ProposalDocumentRequirement)
        .where(ProposalDocumentRequirement.proposal_id == proposal_id)
        .order_by(ProposalDocumentRequirement.item_order, ProposalDocumentRequirement.id)
    )
    for index, item in enumerate(remaining.scalars().all()):
        item.item_order = index
    await db.commit()
    return {"message": "Document requirement deleted"}


@router.put("/{proposal_id}/document-requirements/reorder")
async def reorder_document_requirements(
    proposal_id: str,
    data: DocumentRequirementReorder,
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
    if proposal.status != ProposalStatus.DRAFT:
        raise HTTPException(400, "Cannot modify document requirements on non-draft proposals")

    for index, requirement_id in enumerate(data.requirement_ids):
        req_result = await db.execute(select(ProposalDocumentRequirement).where(
            ProposalDocumentRequirement.id == requirement_id,
            ProposalDocumentRequirement.proposal_id == proposal_id,
        ))
        requirement = req_result.scalar_one_or_none()
        if requirement:
            requirement.item_order = index

    await db.commit()
    return {"message": "Document requirements reordered"}


@router.patch("/{proposal_id}/status")
async def transition_proposal_status(
    proposal_id: str,
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
            text("SELECT role::text FROM user_roles WHERE user_id = :uid"),
            {"uid": current_user.id}
        )
        user_roles = [r[0] for r in user_roles_result.fetchall()]
        admin_roles = {"GRANT_OFFICER", "RESEARCH_ADMIN", "INSTITUTIONAL_LEAD", "SYSTEM_ADMIN"}
        if not any(r in admin_roles for r in user_roles) and not current_user.is_institution_admin and not current_user.is_global_admin:
            raise HTTPException(403, "Only the lead PI, grant staff, or institution admins can change proposal status")
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
    elif target_status in (ProposalStatus.AWARDED, ProposalStatus.DECLINED, ProposalStatus.APPROVED):
        titles = {
            ProposalStatus.AWARDED: "Proposal funding confirmed",
            ProposalStatus.DECLINED: "Proposal not approved",
            ProposalStatus.APPROVED: "Proposal institutionally approved",
        }
        await create_notification(
            db, proposal.lead_pi_id,
            title=titles.get(target_status, "Proposal status update"),
            message=f'Update on "{proposal.title}": {target_status.value}. {notes or ""}',
            entity_type="proposal", entity_id=proposal_id
        )
    elif target_status in (ProposalStatus.APPLYING, ProposalStatus.FUNDING_UNSUCCESSFUL):
        await create_notification(
            db, proposal.lead_pi_id,
            title="Funding application update",
            message=f'"{proposal.title}" status updated to {target_status.value}. {notes or ""}',
            entity_type="proposal", entity_id=proposal_id
        )

    return {"id": proposal_id, "status": target_status, "notes": notes}


@router.put("/{proposal_id}/title")
async def update_proposal_title(
    proposal_id: str,
    title: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER]))
):
    """Update proposal title (only if in DRAFT status)"""
    result = await db.execute(select(Proposal).where(
        Proposal.id == proposal_id,
        Proposal.institution_id == current_user.primary_institution_id
    ))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(404, "Proposal not found")
    
    # Only allow editing of DRAFT proposals
    if proposal.status != ProposalStatus.DRAFT:
        raise HTTPException(400, "Can only edit proposals in DRAFT status")
    
    # Check if user is the lead PI or has permission
    if proposal.lead_pi_id != current_user.id:
        # Check if user has GRANT_OFFICER role
        if ResearchRole.GRANT_OFFICER not in [r.role for r in current_user.research_roles]:
            raise HTTPException(403, "Only the lead PI or grant officers can edit proposals")
    
    proposal.title = title.strip()
    await db.commit()
    return {"id": proposal_id, "title": proposal.title}


@router.delete("/{proposal_id}")
async def delete_proposal(
    proposal_id: str,
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
    proposal_id: str,
    data: CollaboratorInvite,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    """Add a collaborator to a proposal and send invite email + in-app notification."""
    import secrets

    result = await db.execute(select(Proposal).where(
        Proposal.id == proposal_id,
        Proposal.lead_pi_id == current_user.id
    ))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(404, "Proposal not found or you're not the lead PI")

    user = None
    invite_email = (data.email or "").strip().lower() or None

    if data.user_id:
        user = await db.get(User, data.user_id)
    if not user and data.orcid:
        result = await db.execute(select(User).where(User.orcid_id == data.orcid))
        user = result.scalar_one_or_none()
    if not user and invite_email:
        result = await db.execute(select(User).where(func.lower(User.email) == invite_email))
        user = result.scalar_one_or_none()

    if user and not invite_email:
        invite_email = (user.email or "").strip().lower() or None

    if not invite_email:
        raise HTTPException(
            400,
            f"Email is required for collaborator '{data.name}' so the invitation can be sent",
        )

    dup_query = select(ProposalCollaborator).where(ProposalCollaborator.proposal_id == proposal_id)
    if user:
        dup_query = dup_query.where(
            or_(
                ProposalCollaborator.user_id == user.id,
                func.lower(ProposalCollaborator.invited_email) == invite_email,
            )
        )
    else:
        dup_query = dup_query.where(func.lower(ProposalCollaborator.invited_email) == invite_email)

    existing = await db.execute(dup_query)
    if existing.scalar_one_or_none():
        raise HTTPException(400, "This person is already a collaborator or has a pending invitation")

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    due_at = _invite_due_from_now()

    if user:
        collaborator = ProposalCollaborator(
            proposal_id=proposal_id,
            user_id=user.id,
            role=data.role,
            status="pending",
            invited_email=invite_email,
            invited_name=data.name,
            invited_orcid=data.orcid,
            invited_affiliation=data.affiliation,
            invite_due_at=due_at,
        )
        db.add(collaborator)
        await db.flush()

        await create_notification(
            db, user.id,
            title="Proposal Collaboration Invite",
            message=f'{current_user.name} invited you to collaborate on "{proposal.title}" as {data.role}',
            entity_type="proposal",
            entity_id=proposal_id,
            link=f"/researcher/grants/proposals/{proposal_id}/collab/{collaborator.id}",
            notification_type=NotificationType.PROPOSAL_INVITATION,
        )
        await db.commit()

        try:
            sent = await EmailService.send_collaboration_invite_email(
                email=user.email or invite_email,
                inviter_name=current_user.name,
                proposal_title=proposal.title,
                role=data.role,
                proposal_url=f"{frontend_url}/researcher/grants/proposals/{proposal_id}",
            )
            print(f"Invite email to {user.email or invite_email}: {'ok' if sent else 'FAILED'}")
        except Exception as e:
            print(f"Failed to send invite email to {user.email or invite_email}: {e}")

        return {"id": collaborator.id, "user_id": user.id, "role": data.role, "status": "pending"}

    invitation_token = secrets.token_urlsafe(32)
    registration_url = f"{frontend_url}/register?invitation={invitation_token}"

    collaborator = ProposalCollaborator(
        proposal_id=proposal_id,
        user_id=None,
        role=data.role,
        status="pending",
        invited_email=invite_email,
        invited_orcid=data.orcid,
        invited_name=data.name,
        invited_affiliation=data.affiliation,
        invitation_token=invitation_token,
        invite_due_at=due_at,
    )
    db.add(collaborator)
    await db.commit()

    try:
        account_sent = await EmailService.send_account_creation_invite_email(
            email=invite_email,
            inviter_name=current_user.name,
            invitation_token=invitation_token,
        )
        collab_sent = await EmailService.send_collaboration_invite_email(
            email=invite_email,
            inviter_name=current_user.name,
            proposal_title=proposal.title,
            role=data.role,
            proposal_url=registration_url,
        )
        print(
            f"New-user invite emails to {invite_email}: "
            f"account={'ok' if account_sent else 'FAILED'}, "
            f"collab={'ok' if collab_sent else 'FAILED'}"
        )
    except Exception as e:
        print(f"Failed to send invite email(s) to {invite_email}: {e}")

    return {
        "id": collaborator.id,
        "user_id": None,
        "role": data.role,
        "status": "pending",
        "invited_email": invite_email,
    }


@router.post("/{proposal_id}/collaborators/{collaborator_id}/accept")
async def accept_collaboration_invite(
    proposal_id: str,
    collaborator_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Accept a collaboration invitation"""
    # Get the collaborator record
    collab = await db.get(ProposalCollaborator, collaborator_id)
    if not collab or collab.proposal_id != proposal_id:
        raise HTTPException(404, "Collaboration invitation not found")
    
    # Verify user is the intended recipient
    if collab.user_id and collab.user_id != current_user.id:
        raise HTTPException(403, "This invitation is not for you")
    
    if not collab.user_id and collab.invited_email != current_user.email:
        raise HTTPException(403, "This invitation is not for you")
    
    # Get proposal details
    proposal = await db.get(Proposal, proposal_id)
    if not proposal:
        raise HTTPException(404, "Proposal not found")
    
    # Update collaborator status
    collab.status = "accepted"
    collab.user_id = current_user.id
    collab.responded_at = datetime.now(timezone.utc)

    await _resolve_collab_invite_notifications(
        db, current_user.id, proposal_id, collaborator_id
    )
    
    # Notify the lead PI
    await create_notification(
        db, proposal.lead_pi_id,
        title="Collaboration Invite Accepted",
        message=f"{current_user.name} accepted your invitation to collaborate on '{proposal.title}'",
        link=f"/researcher/grants/proposals/{proposal.id}"
    )
    
    await db.commit()
    
    return {"message": "Invitation accepted", "status": "accepted", "proposal_id": proposal_id}


@router.post("/{proposal_id}/collaborators/{collaborator_id}/decline")
async def decline_collaboration_invite(
    proposal_id: str,
    collaborator_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Decline a collaboration invitation"""
    # Get the collaborator record
    collab = await db.get(ProposalCollaborator, collaborator_id)
    if not collab or collab.proposal_id != proposal_id:
        raise HTTPException(404, "Collaboration invitation not found")
    
    # Verify user is the intended recipient
    if collab.user_id and collab.user_id != current_user.id:
        raise HTTPException(403, "This invitation is not for you")
    
    if not collab.user_id and collab.invited_email != current_user.email:
        raise HTTPException(403, "This invitation is not for you")
    
    # Get proposal details
    proposal = await db.get(Proposal, proposal_id)
    if not proposal:
        raise HTTPException(404, "Proposal not found")
    
    # Update collaborator status
    collab.status = "declined"
    collab.responded_at = datetime.now(timezone.utc)

    await _resolve_collab_invite_notifications(
        db, current_user.id, proposal_id, collaborator_id
    )
    
    # Notify the lead PI
    await create_notification(
        db, proposal.lead_pi_id,
        title="Collaboration Invite Declined",
        message=f"{current_user.name} declined your invitation to collaborate on '{proposal.title}'",
        link=f"/researcher/grants/proposals/{proposal.id}"
    )
    
    await db.commit()
    
    return {"message": "Invitation declined", "status": "declined"}


@router.post("/invitations/link")
async def link_invitation_after_signup(
    invitation_token: str = Query(..., description="Invitation token from email"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Link invitation to user account after signup — also claims other pending invites for this email."""
    from services.proposal_invites import claim_pending_proposal_invites

    claimed = await claim_pending_proposal_invites(
        db, current_user, invitation_token=invitation_token
    )
    if not claimed:
        raise HTTPException(404, "Invitation not found or already claimed")

    first = claimed[0]
    return {
        "message": "Invitation linked to your account",
        "proposal_id": first["proposal_id"],
        "proposal_title": first["proposal_title"],
        "role": first["role"],
        "claimed": claimed,
    }


@router.post("/invitations/claim")
async def claim_pending_invitations(
    invitation_token: Optional[str] = Query(None, description="Optional invitation token from email"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Claim any pending proposal invites for the current user's email.
    Called after login / registration so invites sent before account creation appear as notifications.
    """
    from services.proposal_invites import claim_pending_proposal_invites

    claimed = await claim_pending_proposal_invites(
        db, current_user, invitation_token=invitation_token
    )
    return {"message": "Pending invitations claimed", "count": len(claimed), "claimed": claimed}


@router.delete("/{proposal_id}/collaborators/{collaborator_id}")
async def remove_collaborator(
    proposal_id: str,
    collaborator_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    """Remove a collaborator / withdraw invite and email the invitee."""
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

    invitee_user = await db.get(User, collaborator.user_id) if collaborator.user_id else None
    invite_email = (
        (collaborator.invited_email or "").strip()
        or ((invitee_user.email or "").strip() if invitee_user else "")
    )
    role = collaborator.role or "Collaborator"
    was_pending = (collaborator.status or "").lower() == "pending"

    if invitee_user and was_pending:
        await create_notification(
            db,
            invitee_user.id,
            title="Proposal Invitation Withdrawn",
            message=f'{current_user.name} withdrew your invitation to "{proposal.title}"',
            entity_type="proposal",
            entity_id=proposal_id,
            link=f"/researcher/grants/proposals",
            notification_type=NotificationType.PROPOSAL_INVITATION,
        )

    await db.delete(collaborator)
    await db.commit()

    if invite_email and was_pending:
        try:
            sent = await EmailService.send_collaboration_invite_cancelled_email(
                email=invite_email,
                inviter_name=current_user.name or "A colleague",
                proposal_title=proposal.title,
                role=role,
            )
            print(f"Cancel invite email to {invite_email}: {'ok' if sent else 'FAILED'}")
        except Exception as e:
            print(f"Failed to send cancel invite email to {invite_email}: {e}")

    return {"message": "Collaborator removed", "email_notified": bool(invite_email and was_pending)}


@router.post("/{proposal_id}/collaborators/{collaborator_id}/remind")
async def remind_collaborator(
    proposal_id: str,
    collaborator_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    """Resend invitation email for a pending collaborator invite."""
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

    if (collaborator.status or "").lower() != "pending":
        raise HTTPException(400, "Reminders can only be sent for pending invitations")

    invitee_user = await db.get(User, collaborator.user_id) if collaborator.user_id else None
    invite_email = (
        (collaborator.invited_email or "").strip()
        or ((invitee_user.email or "").strip() if invitee_user else "")
    )
    if not invite_email:
        raise HTTPException(400, "No email address on this invitation")

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    role = collaborator.role or "Collaborator"
    # Extend response due date when a reminder is sent
    collaborator.invite_due_at = _invite_due_from_now()

    if invitee_user:
        proposal_url = f"{frontend_url}/researcher/grants/proposals/{proposal_id}"
        await create_notification(
            db,
            invitee_user.id,
            title="Proposal Collaboration Invite Reminder",
            message=f"{current_user.name} reminded you to respond to the invitation for '{proposal.title}' as {role}",
            entity_type="proposal",
            entity_id=proposal_id,
            link=f"/researcher/grants/proposals/{proposal_id}/collab/{collaborator.id}",
            notification_type=NotificationType.PROPOSAL_INVITATION,
        )
        await db.commit()
        try:
            sent = await EmailService.send_collaboration_invite_email(
                email=invite_email,
                inviter_name=current_user.name or "A colleague",
                proposal_title=proposal.title,
                role=role,
                proposal_url=proposal_url,
            )
            print(f"Reminder invite email to {invite_email}: {'ok' if sent else 'FAILED'}")
            if not sent:
                raise HTTPException(502, "Failed to send reminder email")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Failed to send reminder email to {invite_email}: {e}")
            raise HTTPException(502, "Failed to send reminder email")
    else:
        import secrets
        if not collaborator.invitation_token:
            collaborator.invitation_token = secrets.token_urlsafe(32)
        await db.commit()
        registration_url = f"{frontend_url}/register?invitation={collaborator.invitation_token}"
        try:
            account_sent = await EmailService.send_account_creation_invite_email(
                email=invite_email,
                inviter_name=current_user.name or "A colleague",
                invitation_token=collaborator.invitation_token,
            )
            collab_sent = await EmailService.send_collaboration_invite_email(
                email=invite_email,
                inviter_name=current_user.name or "A colleague",
                proposal_title=proposal.title,
                role=role,
                proposal_url=registration_url,
            )
            print(
                f"Reminder new-user emails to {invite_email}: "
                f"account={'ok' if account_sent else 'FAILED'}, "
                f"collab={'ok' if collab_sent else 'FAILED'}"
            )
            if not (account_sent or collab_sent):
                raise HTTPException(502, "Failed to send reminder email")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Failed to send reminder emails to {invite_email}: {e}")
            raise HTTPException(502, "Failed to send reminder email")

    return {
        "message": "Reminder sent",
        "email": invite_email,
        "invite_due_at": collaborator.invite_due_at.isoformat() if collaborator.invite_due_at else None,
    }


@router.get("/{proposal_id}/completion")
async def get_proposal_completion(
    proposal_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER
    ]))
):
    """Get proposal completion percentage"""
    result = await db.execute(
        select(Proposal).options(
            selectinload(Proposal.sections),
            selectinload(Proposal.documents),
            selectinload(Proposal.document_requirements),
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

    section_pct = (completed_sections / total_sections * 100) if total_sections > 0 else 0
    overall_pct = section_pct

    return {
        "overall_percentage": round(overall_pct, 1),
        "sections_completed": completed_sections,
        "sections_total": total_sections,
        "documents_completed": len(proposal.documents),
        "documents_required": len(proposal.document_requirements or []),
        "missing_documents": []
    }


# ─── Admin Workflow Endpoints ──────────────────────────────────

WORKFLOW_STAGES = [
    {"step": 0, "key": "received",  "label": "Received",                 "status": "submitted"},
    {"step": 1, "key": "review",    "label": "Concurrent Section Review", "status": "under_review"},
    {"step": 2, "key": "approved",  "label": "Institutionally Approved",  "status": "approved"},
]


@router.get("/{proposal_id}/workflow")
async def get_proposal_workflow(
    proposal_id: str,
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
    action: str            # "advance" | "approve" | "return" | "decline"
    notes: Optional[str] = None


@router.post("/{proposal_id}/workflow/advance")
async def advance_proposal_workflow(
    proposal_id: str,
    body: WorkflowAdvanceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin-only: advance, return, or decline a proposal through the workflow."""
    # Role check — must be admin/grant staff
    is_admin = current_user.is_institution_admin or current_user.is_global_admin
    if not is_admin:
        roles_res = await db.execute(
            text("SELECT role::text FROM user_roles WHERE user_id = :uid"),
            {"uid": current_user.id}
        )
        user_roles = [r[0] for r in roles_res.fetchall()]
        admin_roles = {"GRANT_OFFICER", "RESEARCH_ADMIN", "INSTITUTIONAL_LEAD", "SYSTEM_ADMIN"}
        if not any(r in admin_roles for r in user_roles):
            raise HTTPException(403, "Only grant staff or institution admins can advance proposals")

    result = await db.execute(select(Proposal).where(Proposal.id == proposal_id))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(404, "Proposal not found")

    current_step = getattr(proposal, "review_step", 0) or 0
    action = body.action
    notes = body.notes

    if action in ("advance", "approve"):
        if action == "advance":
            # Move from Received into concurrent section review
            if current_step >= 1:
                raise HTTPException(400, "Use approve once all section reviews are submitted")
            new_step = 1
            new_stage = "Concurrent Section Review"
            proposal.status = ProposalStatus.UNDER_REVIEW
        else:
            # Institutional approval — requires all assigned section reviews
            if not await _all_active_reviews_submitted(db, proposal_id):
                raise HTTPException(
                    400,
                    "All assigned section reviewers must submit their reviews before approving.",
                )
            proposal.status = ProposalStatus.APPROVED
            new_step = 2
            new_stage = "Institutionally Approved"

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

    # Only create a new history entry for advance/approve (not return/decline)
    if action in ("advance", "approve"):
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
    action_labels = {"advance": "moved to", "approve": "approved at", "return": "returned from", "decline": "declined at"}
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
    proposal_id: str,
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
    reviewer_id: Optional[str] = None
    stage_steps: list[int] = []
    section_ids: list[str] = []
    stage_name: Optional[str] = None
    notes: Optional[str] = None
    new_reviewer_email: Optional[str] = None
    new_reviewer_name: Optional[str] = None
    new_reviewer_expertise: Optional[list[str]] = None


async def _find_stage_assignment(
    db: AsyncSession,
    proposal_id: str,
    reviewer_id: str,
    *,
    stage_step: int,
    section_id: Optional[str],
):
    q = select(ProposalStageAssignment).where(
        ProposalStageAssignment.proposal_id == proposal_id,
        ProposalStageAssignment.reviewer_id == reviewer_id,
    )
    if section_id:
        q = q.where(ProposalStageAssignment.section_id == section_id)
    else:
        q = q.where(
            ProposalStageAssignment.stage_step == stage_step,
            ProposalStageAssignment.section_id.is_(None),
        )
    return (await db.execute(q)).scalars().first()


async def _ensure_proposal_review_and_portal(
    db: AsyncSession,
    *,
    proposal: Proposal,
    reviewer: User,
    target: dict,
    current_user: User,
    needs_signup: bool,
    signup_token: Optional[str],
    notes: Optional[str],
):
    review_q = select(ProposalReview).where(
        ProposalReview.proposal_id == proposal.id,
        ProposalReview.reviewer_id == reviewer.id,
    )
    if target["section_id"]:
        review_q = review_q.where(ProposalReview.section_id == target["section_id"])
    else:
        review_q = review_q.where(ProposalReview.section_id.is_(None))
    proposal_review = (await db.execute(review_q)).scalars().first()
    if not proposal_review:
        proposal_review = ProposalReview(
            proposal_id=proposal.id,
            reviewer_id=reviewer.id,
            section_id=target["section_id"],
        )
        db.add(proposal_review)
        await db.flush()

    portal_exists = await db.execute(
        select(ReviewerAssignment).where(
            ReviewerAssignment.review_type == ReviewType.PROPOSAL,
            ReviewerAssignment.entity_review_id == proposal_review.id,
            ReviewerAssignment.status.notin_([ReviewerAssignmentStatus.DECLINED]),
        )
    )
    if not portal_exists.scalars().first():
        db.add(ReviewerAssignment(
            institution_id=current_user.primary_institution_id,
            reviewer_id=reviewer.id,
            invited_email=reviewer.email,
            invited_name=reviewer.name,
            review_type=ReviewType.PROPOSAL,
            entity_id=proposal.id,
            entity_review_id=proposal_review.id,
            entity_title=proposal.title,
            assigned_by_id=current_user.id,
            status=ReviewerAssignmentStatus.PENDING_SIGNUP if needs_signup else ReviewerAssignmentStatus.ASSIGNED,
            signup_token=signup_token if needs_signup else None,
            notes=notes or target["stage_name"],
        ))


async def _create_or_reactivate_assignment(
    db: AsyncSession,
    *,
    proposal: Proposal,
    reviewer: User,
    target: dict,
    current_user: User,
    body: AssignReviewerBody,
    needs_signup: bool,
    signup_token: Optional[str],
) -> Optional[ProposalStageAssignment]:
    existing = await _find_stage_assignment(
        db, proposal.id, reviewer.id,
        stage_step=target["stage_step"],
        section_id=target["section_id"],
    )
    if existing:
        if existing.status == "active":
            return None
        if existing.status == "removed":
            existing.status = "active"
            existing.notes = body.notes or existing.notes
            existing.assigned_by_id = current_user.id
            existing.stage_name = target["stage_name"]
            await _ensure_proposal_review_and_portal(
                db,
                proposal=proposal,
                reviewer=reviewer,
                target=target,
                current_user=current_user,
                needs_signup=needs_signup,
                signup_token=signup_token,
                notes=body.notes,
            )
            return existing

    assignment = ProposalStageAssignment(
        proposal_id=proposal.id,
        stage_step=target["stage_step"],
        stage_name=target["stage_name"],
        section_id=target["section_id"],
        reviewer_id=reviewer.id,
        assigned_by_id=current_user.id,
        notes=body.notes,
        status="active",
    )
    db.add(assignment)
    await _ensure_proposal_review_and_portal(
        db,
        proposal=proposal,
        reviewer=reviewer,
        target=target,
        current_user=current_user,
        needs_signup=needs_signup,
        signup_token=signup_token,
        notes=body.notes,
    )
    return assignment


@router.post("/{proposal_id}/stage-reviewers")
async def assign_stage_reviewer(
    proposal_id: str,
    body: AssignReviewerBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Assign a reviewer to multiple review stages of a proposal. Can create new reviewers."""
    if not await _can_assign_stage_reviewers(db, current_user):
        raise HTTPException(
            403,
            "Only Director of Research or Research Administrator can assign reviewers",
        )

    proposal = await db.get(Proposal, proposal_id)
    if not proposal:
        raise HTTPException(404, "Proposal not found")

    # Determine reviewer - either existing or create new
    reviewer = None
    is_new_reviewer = False
    needs_signup = False
    signup_token = None
    
    if body.reviewer_id:
        # Use existing reviewer
        reviewer = await db.get(User, body.reviewer_id)
        if not reviewer:
            raise HTTPException(404, "Reviewer not found")
        needs_signup = not reviewer.password_hash
    elif body.new_reviewer_email:
        reviewer, needs_signup, signup_token = await get_or_create_reviewer_user(
            db,
            email=body.new_reviewer_email,
            name=body.new_reviewer_name,
            institution_id=current_user.primary_institution_id,
            invited_by_id=current_user.id,
            role=ResearchRole.EXTERNAL_REVIEWER,
            expertise=body.new_reviewer_expertise,
        )
        is_new_reviewer = needs_signup
    else:
        raise HTTPException(400, "Either reviewer_id or new_reviewer_email must be provided")

    if needs_signup and not signup_token:
        import secrets
        signup_token = secrets.token_urlsafe(32)

    # Build assignment targets: section-based (preferred) or legacy stage steps
    assignment_targets = []
    if body.section_ids:
        sections_result = await db.execute(
            select(ProposalSection).where(
                ProposalSection.proposal_id == proposal_id,
                ProposalSection.id.in_(body.section_ids),
            )
        )
        sections = {s.id: s for s in sections_result.scalars().all()}
        for section_id in body.section_ids:
            section = sections.get(section_id)
            if not section:
                continue
            assignment_targets.append({
                "stage_step": 1,
                "stage_name": section.title,
                "section_id": section.id,
            })
    elif body.stage_steps:
        for stage_step in body.stage_steps:
            assignment_targets.append({
                "stage_step": stage_step,
                "stage_name": body.stage_name or f"Stage {stage_step}",
                "section_id": None,
            })
    else:
        raise HTTPException(400, "Provide section_ids or stage_steps for reviewer assignment")

    assignments = []
    stage_names = []

    try:
        for target in assignment_targets:
            assignment = await _create_or_reactivate_assignment(
                db,
                proposal=proposal,
                reviewer=reviewer,
                target=target,
                current_user=current_user,
                body=body,
                needs_signup=needs_signup,
                signup_token=signup_token,
            )
            if not assignment:
                continue
            stage_names.append(target["stage_name"])
            assignments.append(assignment)

        if not assignments:
            raise HTTPException(
                400,
                "This reviewer is already assigned to the selected section(s) or stage(s). "
                "Choose different stages or pick another reviewer.",
            )

        # Enter concurrent review phase when reviewers are assigned
        if proposal.status in (ProposalStatus.SUBMITTED, ProposalStatus.INTERNAL_REVIEW):
            proposal.status = ProposalStatus.UNDER_REVIEW
            if not proposal.review_step or proposal.review_step < 1:
                proposal.review_step = 1
            if not proposal.review_stage_name:
                proposal.review_stage_name = "Concurrent Section Review"

        stages_text = ", ".join(stage_names) if len(stage_names) > 1 else stage_names[0]

        if not needs_signup:
            await create_notification(
                db, reviewer.id,
                title=f"Review assignment: {stages_text}",
                message=f'You have been assigned to review "{proposal.title}" at the following stage(s): {stages_text}.',
                entity_type="proposal", entity_id=proposal_id,
            )

        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            400,
            "Could not assign reviewer — a conflicting assignment already exists. "
            "Try removing the old assignment first or choose different stages.",
        )

    # Send emails after commit (don't fail assignment if email fails)
    try:
        await EmailService.send_reviewer_assignment_email(
            email=reviewer.email,
            reviewer_name=reviewer.name,
            proposal_title=proposal.title,
            stages=stage_names,
            inviter_name=current_user.name,
            proposal_id=proposal_id,
            register_token=signup_token if needs_signup else None,
        )
    except Exception:
        pass

    return {
        "reviewer_id": reviewer.id,
        "reviewer_name": reviewer.name,
        "reviewer_email": reviewer.email,
        "is_new_reviewer": is_new_reviewer,
        "assignments": [
            {
                "stage_step": a.stage_step,
                "stage_name": a.stage_name,
                "section_id": a.section_id,
            }
            for a in assignments
        ],
    }


@router.delete("/{proposal_id}/stage-reviewers/{assignment_id}")
async def remove_stage_reviewer(
    proposal_id: str,
    assignment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a reviewer assignment from a proposal stage or section."""
    if not await _can_assign_stage_reviewers(db, current_user):
        raise HTTPException(
            403,
            "Only Director of Research or Research Administrator can remove reviewers",
        )

    assignment = await db.get(ProposalStageAssignment, assignment_id)
    if not assignment or assignment.proposal_id != proposal_id:
        raise HTTPException(404, "Assignment not found")
    if assignment.status != "active":
        raise HTTPException(400, "Assignment is already removed")

    review_q = select(ProposalReview).where(
        ProposalReview.proposal_id == proposal_id,
        ProposalReview.reviewer_id == assignment.reviewer_id,
        ProposalReview.status == ReviewStatus.SUBMITTED,
    )
    if assignment.section_id:
        review_q = review_q.where(ProposalReview.section_id == assignment.section_id)
    else:
        review_q = review_q.where(ProposalReview.section_id.is_(None))
    submitted = await db.execute(review_q)
    if submitted.scalars().first():
        raise HTTPException(400, "Cannot remove — reviewer has already submitted their review")

    assignment.status = "removed"

    proposal_review_q = select(ProposalReview).where(
        ProposalReview.proposal_id == proposal_id,
        ProposalReview.reviewer_id == assignment.reviewer_id,
    )
    if assignment.section_id:
        proposal_review_q = proposal_review_q.where(
            ProposalReview.section_id == assignment.section_id
        )
    else:
        proposal_review_q = proposal_review_q.where(ProposalReview.section_id.is_(None))
    proposal_review = (await db.execute(proposal_review_q)).scalars().first()

    if proposal_review:
        portal_q = select(ReviewerAssignment).where(
            ReviewerAssignment.review_type == ReviewType.PROPOSAL,
            ReviewerAssignment.entity_review_id == proposal_review.id,
            ReviewerAssignment.status.notin_([
                ReviewerAssignmentStatus.DECLINED,
                ReviewerAssignmentStatus.SUBMITTED,
            ]),
        )
        for portal in (await db.execute(portal_q)).scalars().all():
            portal.status = ReviewerAssignmentStatus.DECLINED

    await db.commit()
    return {"message": "Reviewer removed", "assignment_id": assignment_id}


class UpdateAssignmentBody(BaseModel):
    stage_step: Optional[int] = None
    section_id: Optional[str] = None
    stage_name: Optional[str] = None
    notes: Optional[str] = None
    section_ids: Optional[list[str]] = None
    stage_steps: Optional[list[int]] = None


class SyncReviewerAssignmentsBody(BaseModel):
    section_ids: list[str] = []
    stage_steps: list[int] = []
    notes: Optional[str] = None


def _target_key(section_id: Optional[str], stage_step: int) -> str:
    return f"section:{section_id}" if section_id else f"stage:{stage_step}"


@router.put("/{proposal_id}/stage-reviewers/reviewer/{reviewer_id}")
async def sync_reviewer_assignments(
    proposal_id: str,
    reviewer_id: str,
    body: SyncReviewerAssignmentsBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Replace a reviewer's stage/section assignments with the provided set."""
    if not await _can_assign_stage_reviewers(db, current_user):
        raise HTTPException(
            403,
            "Only Director of Research or Research Administrator can update reviewer assignments",
        )

    proposal = await db.get(Proposal, proposal_id)
    if not proposal:
        raise HTTPException(404, "Proposal not found")
    reviewer = await db.get(User, reviewer_id)
    if not reviewer:
        raise HTTPException(404, "Reviewer not found")

    assignment_targets = []
    if body.section_ids:
        sections_result = await db.execute(
            select(ProposalSection).where(
                ProposalSection.proposal_id == proposal_id,
                ProposalSection.id.in_(body.section_ids),
            )
        )
        sections = {s.id: s for s in sections_result.scalars().all()}
        for section_id in body.section_ids:
            section = sections.get(section_id)
            if not section:
                continue
            assignment_targets.append({
                "stage_step": 1,
                "stage_name": section.title,
                "section_id": section.id,
            })
    elif body.stage_steps:
        for stage_step in body.stage_steps:
            assignment_targets.append({
                "stage_step": stage_step,
                "stage_name": f"Stage {stage_step}",
                "section_id": None,
            })
    else:
        raise HTTPException(400, "Provide section_ids or stage_steps")

    desired_keys = {
        _target_key(t["section_id"], t["stage_step"]) for t in assignment_targets
    }

    active_result = await db.execute(
        select(ProposalStageAssignment).where(
            ProposalStageAssignment.proposal_id == proposal_id,
            ProposalStageAssignment.reviewer_id == reviewer_id,
            ProposalStageAssignment.status == "active",
        )
    )
    active_assignments = active_result.scalars().all()

    needs_signup = not reviewer.password_hash
    signup_token = None
    if needs_signup:
        import secrets
        signup_token = secrets.token_urlsafe(32)

    assign_body = AssignReviewerBody(notes=body.notes)
    updated = []

    try:
        for assignment in active_assignments:
            key = _target_key(assignment.section_id, assignment.stage_step)
            if key in desired_keys:
                updated.append(assignment)
                continue

            review_q = select(ProposalReview).where(
                ProposalReview.proposal_id == proposal_id,
                ProposalReview.reviewer_id == reviewer_id,
                ProposalReview.status == ReviewStatus.SUBMITTED,
            )
            if assignment.section_id:
                review_q = review_q.where(ProposalReview.section_id == assignment.section_id)
            else:
                review_q = review_q.where(ProposalReview.section_id.is_(None))
            if (await db.execute(review_q)).scalars().first():
                raise HTTPException(
                    400,
                    "Cannot remove a section/stage that already has a submitted review",
                )
            assignment.status = "removed"

        existing_keys = {
            _target_key(a.section_id, a.stage_step) for a in updated
        }
        for target in assignment_targets:
            key = _target_key(target["section_id"], target["stage_step"])
            if key in existing_keys:
                continue
            created = await _create_or_reactivate_assignment(
                db,
                proposal=proposal,
                reviewer=reviewer,
                target=target,
                current_user=current_user,
                body=assign_body,
                needs_signup=needs_signup,
                signup_token=signup_token,
            )
            if created:
                updated.append(created)
                existing_keys.add(key)

        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(400, "Could not update assignments due to a conflict")

    return {
        "reviewer_id": reviewer.id,
        "assignments": [
            {
                "id": a.id,
                "stage_step": a.stage_step,
                "stage_name": a.stage_name,
                "section_id": a.section_id,
                "status": a.status,
            }
            for a in updated
        ],
    }


@router.patch("/{proposal_id}/stage-reviewers/{assignment_id}")
async def update_stage_reviewer(
    proposal_id: str,
    assignment_id: str,
    body: UpdateAssignmentBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update assignments for a reviewer — supports multi section/stage sync."""
    if not await _can_assign_stage_reviewers(db, current_user):
        raise HTTPException(
            403,
            "Only Director of Research or Research Administrator can update reviewer assignments",
        )

    assignment = await db.get(ProposalStageAssignment, assignment_id)
    if not assignment or assignment.proposal_id != proposal_id:
        raise HTTPException(404, "Assignment not found")
    if assignment.status != "active":
        raise HTTPException(400, "Cannot update a removed assignment")

    if body.section_ids is not None or body.stage_steps is not None:
        sync_body = SyncReviewerAssignmentsBody(
            section_ids=body.section_ids or [],
            stage_steps=body.stage_steps or [],
            notes=body.notes,
        )
        return await sync_reviewer_assignments(
            proposal_id, assignment.reviewer_id, sync_body, db, current_user
        )

    review_q = select(ProposalReview).where(
        ProposalReview.proposal_id == proposal_id,
        ProposalReview.reviewer_id == assignment.reviewer_id,
        ProposalReview.status == ReviewStatus.SUBMITTED,
    )
    if assignment.section_id:
        review_q = review_q.where(ProposalReview.section_id == assignment.section_id)
    else:
        review_q = review_q.where(ProposalReview.section_id.is_(None))
    if (await db.execute(review_q)).scalars().first():
        raise HTTPException(400, "Cannot update — reviewer has already submitted their review")

    new_section_id = body.section_id if body.section_id is not None else assignment.section_id
    new_stage_step = body.stage_step if body.stage_step is not None else assignment.stage_step

    if body.section_id is not None:
        if body.section_id:
            section = await db.get(ProposalSection, body.section_id)
            if not section or section.proposal_id != proposal_id:
                raise HTTPException(404, "Section not found")
            new_stage_step = 1
            if body.stage_name:
                assignment.stage_name = body.stage_name
            else:
                assignment.stage_name = section.title
        else:
            new_section_id = None

    if body.stage_step is not None and not new_section_id:
        new_stage_step = body.stage_step
        if body.stage_name:
            assignment.stage_name = body.stage_name
        else:
            assignment.stage_name = f"Stage {body.stage_step}"

    dup_q = select(ProposalStageAssignment).where(
        ProposalStageAssignment.proposal_id == proposal_id,
        ProposalStageAssignment.reviewer_id == assignment.reviewer_id,
        ProposalStageAssignment.status == "active",
        ProposalStageAssignment.id != assignment_id,
    )
    if new_section_id:
        dup_q = dup_q.where(ProposalStageAssignment.section_id == new_section_id)
    else:
        dup_q = dup_q.where(
            ProposalStageAssignment.stage_step == new_stage_step,
            ProposalStageAssignment.section_id.is_(None),
        )
    if (await db.execute(dup_q)).scalars().first():
        raise HTTPException(
            400,
            "This reviewer is already assigned to the selected section or stage",
        )

    assignment.section_id = new_section_id
    assignment.stage_step = new_stage_step
    if body.notes is not None:
        assignment.notes = body.notes

    await db.commit()
    await db.refresh(assignment)

    return {
        "id": assignment.id,
        "stage_step": assignment.stage_step,
        "stage_name": assignment.stage_name,
        "section_id": assignment.section_id,
        "notes": assignment.notes,
        "status": assignment.status,
    }


# ─── Available Reviewers ─────────────────────────────────────────

@router.get("/reviewers/available")
async def list_available_reviewers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return users who can act as reviewers (grant_officer, external_reviewer, etc.).
    If no reviewers with reviewer roles are found, defaults to current user."""
    # ResearchRole enum values are lowercase; include uppercase aliases for legacy rows
    reviewer_roles = (
        "grant_officer", "GRANT_OFFICER",
        "research_admin", "RESEARCH_ADMIN",
        "institutional_lead", "INSTITUTIONAL_LEAD",
        "external_reviewer", "EXTERNAL_REVIEWER",
        "ethics_reviewer", "ETHICS_REVIEWER",
        "director_research", "DIRECTOR_RESEARCH",
    )
    result = await db.execute(
        text("""
            SELECT DISTINCT u.id, u.name, u.email,
                string_agg(ur.role::text, ', ') AS roles
            FROM users u
            JOIN user_roles ur ON ur.user_id = u.id
            WHERE ur.role::text = ANY(:roles)
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
            text("SELECT string_agg(role::text, ', ') FROM user_roles WHERE user_id = :uid"),
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


@router.get("/collaborators/suggest")
async def suggest_proposal_collaborators(
    opportunity_id: Optional[str] = Query(None, description="Grant opportunity ID for context"),
    proposal_title: Optional[str] = Query(None, description="Working proposal title for context"),
    exclude_user_ids: Optional[str] = Query(None, description="Comma-separated user IDs to exclude"),
    limit: int = Query(default=6, ge=1, le=15),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Suggest institution researchers who could strengthen a proposal team."""
    excluded = [x.strip() for x in (exclude_user_ids or "").split(",") if x.strip()]
    result = await suggest_collaborators(
        current_user=current_user,
        db=db,
        opportunity_id=opportunity_id,
        proposal_title=proposal_title,
        exclude_user_ids=excluded,
        limit=limit,
    )
    return {
        "suggestions": [
            {
                "user_id": s.user_id,
                "name": s.name,
                "email": s.email,
                "department": s.department,
                "job_title": s.job_title,
                "orcid": s.orcid,
                "expertise_keywords": s.expertise_keywords,
                "skills": s.skills,
                "research_areas": s.research_areas,
                "score": s.score,
                "reasons": s.reasons,
                "match_explanation": s.match_explanation,
            }
            for s in result["suggestions"]
        ],
        "total_candidates": result["total_candidates"],
        "ai_enhanced": result["ai_enhanced"],
        "context_summary": result["context_summary"],
    }


@router.get("/collaborators/{user_id}/profile-snapshot")
async def get_collaborator_profile_snapshot(
    user_id: str,
    opportunity_id: Optional[str] = Query(None),
    proposal_title: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Profile snapshot for reviewing a suggested collaborator before inviting."""
    if not current_user.primary_institution_id:
        raise HTTPException(400, "User must be associated with an institution")

    snapshot = await researcher_profile_snapshot(
        user_id=user_id,
        db=db,
        opportunity_id=opportunity_id,
        proposal_title=proposal_title,
    )
    if not snapshot:
        raise HTTPException(404, "Researcher not found")

    target = await db.get(User, user_id)
    if target.primary_institution_id != current_user.primary_institution_id:
        raise HTTPException(403, "Researcher is not in your institution")

    return snapshot


@router.get("/collaborators/search")
async def search_institutional_collaborators(
    query: str = Query(..., min_length=2, description="Search query (name, email, or department)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Search for potential collaborators within the current user's institution"""
    # Search users in the same institution
    result = await db.execute(
        select(User).where(
            User.primary_institution_id == current_user.primary_institution_id,
            User.status == UserStatus.ACTIVE,
            User.id != current_user.id,  # Exclude current user
            or_(
                User.name.ilike(f"%{query}%"),
                User.email.ilike(f"%{query}%"),
                User.department.ilike(f"%{query}%")
            )
        ).limit(20)
    )
    users = result.scalars().all()
    
    return [{
        "user_id": u.id,
        "name": u.name,
        "email": u.email,
        "department": u.department,
        "job_title": u.job_title,
        "orcid": u.orcid_id,
        "affiliation": u.department or "",
        "source": "dacoris"
    } for u in users]


# ─── Document Preview ──────────────────────────────────────────

@router.get("/{proposal_id}/documents/{doc_id}/preview")
async def preview_document(
    proposal_id: str,
    doc_id: str,
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


# ─── PI funding tracking (post-approval) ─────────────────────────

class PiFundingStatusUpdate(BaseModel):
    status: str  # applying | awarded | funding_unsuccessful
    total_amount: Optional[float] = None
    currency: str = "KES"
    funder_name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    conditions: Optional[str] = None
    notes: Optional[str] = None


@router.patch("/{proposal_id}/funding-status")
async def update_pi_funding_status(
    proposal_id: str,
    body: PiFundingStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lead PI updates external funder application status and award details after institutional approval."""
    result = await db.execute(
        select(Proposal)
        .options(selectinload(Proposal.award), selectinload(Proposal.opportunity))
        .where(
            Proposal.id == proposal_id,
            Proposal.institution_id == current_user.primary_institution_id,
        )
    )
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(404, "Proposal not found")
    if proposal.lead_pi_id != current_user.id:
        raise HTTPException(403, "Only the lead PI can update external funding status")

    try:
        target = ProposalStatus(body.status)
    except ValueError:
        raise HTTPException(400, f"Invalid status: {body.status}")

    allowed_from = {
        ProposalStatus.APPROVED: {ProposalStatus.APPLYING},
        ProposalStatus.APPLYING: {ProposalStatus.AWARDED, ProposalStatus.FUNDING_UNSUCCESSFUL},
    }
    if target not in allowed_from.get(proposal.status, set()):
        raise HTTPException(
            400,
            f"Cannot transition from '{proposal.status.value}' to '{target.value}'",
        )

    if target == ProposalStatus.AWARDED:
        if body.total_amount is None or body.total_amount <= 0:
            raise HTTPException(400, "Award amount is required when marking as awarded")
        funder = body.funder_name or (proposal.opportunity.sponsor if proposal.opportunity else None)
        if proposal.award:
            proposal.award.total_amount = int(body.total_amount)
            proposal.award.currency = body.currency
            proposal.award.funder_name = funder
            proposal.award.start_date = body.start_date
            proposal.award.end_date = body.end_date
            if body.conditions:
                proposal.award.conditions = body.conditions
            proposal.award.issued_by_id = current_user.id
        else:
            import uuid as _uuid
            award = Award(
                proposal_id=proposal.id,
                institution_id=proposal.institution_id,
                award_number=f"AWD-{datetime.now().year}-{_uuid.uuid4().hex[:6].upper()}",
                funder_name=funder,
                total_amount=int(body.total_amount),
                currency=body.currency,
                start_date=body.start_date,
                end_date=body.end_date,
                conditions=body.conditions,
                issued_by_id=current_user.id,
            )
            db.add(award)
            await db.flush()
            project = ResearchProject(
                institution_id=proposal.institution_id,
                award_id=award.id,
                pi_id=proposal.lead_pi_id,
                title=proposal.title,
                description=f"Created from external funder award on proposal {proposal.id}",
                project_type="funded",
                status=ProjectStatus.DRAFT,
                start_date=body.start_date,
                end_date=body.end_date,
            )
            db.add(project)

    proposal.status = target
    from services.workflow import STAGE_LABELS
    step, stage_name = STAGE_LABELS.get(target, (proposal.review_step or 2, target.value))
    proposal.review_step = step
    proposal.review_stage_name = stage_name
    if body.notes:
        proposal.stage_notes = body.notes

    await db.commit()
    return {"id": proposal_id, "status": target.value, "review_stage_name": proposal.review_stage_name}


# ─── Proposal Export ───────────────────────────────────────────

@router.get("/{proposal_id}/export")
async def export_proposal_document(
    proposal_id: str,
    format: str = Query("pdf", pattern="^(pdf|docx|word|doc)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER,
        ResearchRole.INSTITUTIONAL_LEAD
    ])),
):
    """Download the full proposal as PDF or Word."""
    from fastapi.responses import Response
    from services.proposal_export import ExportProposal, ExportSection, export_proposal

    result = await db.execute(
        select(Proposal)
        .options(
            selectinload(Proposal.sections),
        )
        .where(
            Proposal.id == proposal_id,
            Proposal.institution_id == current_user.primary_institution_id,
        )
    )
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(404, "Proposal not found")

    if proposal.sections:
        _sort_sections(proposal.sections)

    export_data = ExportProposal(
        title=proposal.title,
        sections=[
            ExportSection(
                title=section.title,
                content_html=section.content_html or "",
                word_count=section.word_count or 0,
            )
            for section in (proposal.sections or [])
        ],
    )

    try:
        content, filename, media_type = export_proposal(export_data, format)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(500, f"Failed to generate export: {exc}") from exc

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
