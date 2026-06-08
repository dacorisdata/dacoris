"""
Reviewer portal API — invitations, registration, and assignment management.
"""

import secrets
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, EmailStr

from database import get_db
from models import (
    User, Institution, Proposal, ProposalReview, ResearchProject,
    EthicsApplication, ReviewType, ReviewerAssignmentStatus,
    ReviewerAssignment, PrimaryAccountType, AccountType, UserStatus,
    ResearchRole, user_roles, ReviewStatus,
)
from auth import (
    get_current_active_user, get_password_hash, create_access_token,
    create_refresh_token, ACCESS_TOKEN_EXPIRE_MINUTES, require_roles,
)
from services.email_service import EmailService
from services.notifications import create_notification
from account_types import get_default_roles

router = APIRouter(prefix="/api/reviewer", tags=["reviewer"])


# ─── Request / response schemas ───────────────────────────────────────────────

class InviteReviewerRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    review_type: str  # proposal | project | ethics
    entity_id: str
    notes: Optional[str] = None


class ReviewerRegisterRequest(BaseModel):
    token: str
    name: str
    password: str


class SubmitAssignmentReviewRequest(BaseModel):
    has_coi: bool = False
    coi_reason: Optional[str] = None
    scores: Optional[dict] = None
    overall_score: Optional[float] = None
    recommendation: Optional[str] = None
    narrative_feedback: Optional[str] = None
    decision: Optional[str] = None
    decision_notes: Optional[str] = None


def _serialize_assignment(a: ReviewerAssignment) -> dict:
    return {
        "id": a.id,
        "review_type": a.review_type.value if a.review_type else None,
        "entity_id": a.entity_id,
        "entity_review_id": a.entity_review_id,
        "entity_title": a.entity_title,
        "status": a.status.value if a.status else None,
        "invited_email": a.invited_email,
        "invited_name": a.invited_name,
        "assigned_at": a.assigned_at.isoformat() if a.assigned_at else None,
        "started_at": a.started_at.isoformat() if a.started_at else None,
        "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
        "notes": a.notes,
        "institution_id": a.institution_id,
        "invitation_token": a.invitation_token,
    }


async def _get_entity_title(db: AsyncSession, review_type: str, entity_id: str) -> str:
    if review_type == "proposal":
        p = await db.get(Proposal, entity_id)
        return p.title if p else f"Proposal {entity_id[:8]}"
    if review_type == "project":
        p = await db.get(ResearchProject, entity_id)
        return p.title if p else f"Project {entity_id[:8]}"
    if review_type == "ethics":
        e = await db.get(EthicsApplication, entity_id)
        return e.title if e else f"Ethics Application {entity_id[:8]}"
    return "Review Assignment"


async def _find_or_create_reviewer_user(
    db: AsyncSession,
    email: str,
    name: Optional[str],
    institution_id: str,
    invited_by_id: str,
    create_if_missing: bool = False,
    signup_token: Optional[str] = None,
) -> Optional[User]:
    result = await db.execute(
        select(User).where(
            User.email == email,
            User.primary_institution_id == institution_id,
        )
    )
    user = result.scalar_one_or_none()
    if user:
        return user

    if not create_if_missing:
        return None

    user = User(
        email=email,
        name=name or email.split("@")[0],
        password_hash=None,
        account_type=AccountType.INSTITUTION_ADMIN,
        status=UserStatus.PENDING,
        primary_account_type=PrimaryAccountType.EXTERNAL_REVIEWER,
        primary_institution_id=institution_id,
        is_guest=True,
        invited_by_id=invited_by_id,
        invitation_context=signup_token,
        email_verified=False,
    )
    db.add(user)
    await db.flush()

    for role in get_default_roles(PrimaryAccountType.EXTERNAL_REVIEWER):
        await db.execute(
            user_roles.insert().values(
                user_id=user.id, role=role, assigned_by=invited_by_id
            )
        )
    return user


def _require_reviewer(user: User):
    if user.primary_account_type != PrimaryAccountType.EXTERNAL_REVIEWER:
        if not user.is_global_admin:
            raise HTTPException(403, "Reviewer access only")


# ─── Public invitation endpoints ───────────────────────────────────────────────

@router.get("/invitation/{token}")
async def get_invitation(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Get invitation details from signup or assignment token."""
    result = await db.execute(
        select(ReviewerAssignment).where(
            or_(
                ReviewerAssignment.signup_token == token,
                ReviewerAssignment.invitation_token == token,
            )
        )
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(404, "Invitation not found or expired")

    inst = await db.get(Institution, assignment.institution_id)
    is_signup = assignment.signup_token == token and not assignment.reviewer_id

    return {
        "email": assignment.invited_email,
        "name": assignment.invited_name,
        "institution_name": inst.name if inst else None,
        "review_type": assignment.review_type.value,
        "entity_title": assignment.entity_title,
        "is_signup": is_signup,
        "status": assignment.status.value,
    }


@router.post("/register")
async def register_reviewer(
    data: ReviewerRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Complete reviewer account setup from email invitation."""
    result = await db.execute(
        select(ReviewerAssignment).where(
            or_(
                ReviewerAssignment.signup_token == data.token,
                ReviewerAssignment.invitation_token == data.token,
            )
        )
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(404, "Invalid or expired invitation token")

    existing = await db.execute(
        select(User).where(
            User.email == assignment.invited_email,
            User.primary_institution_id == assignment.institution_id,
        )
    )
    user = existing.scalar_one_or_none()

    if user and user.password_hash:
        raise HTTPException(400, "An account already exists for this email. Please log in.")

    if not user:
        user = User(
            email=assignment.invited_email,
            name=data.name,
            password_hash=get_password_hash(data.password),
            account_type=AccountType.INSTITUTION_ADMIN,
            status=UserStatus.ACTIVE,
            primary_account_type=PrimaryAccountType.EXTERNAL_REVIEWER,
            primary_institution_id=assignment.institution_id,
            is_guest=True,
            invited_by_id=assignment.assigned_by_id,
            email_verified=True,
        )
        db.add(user)
        await db.flush()
        for role in get_default_roles(PrimaryAccountType.EXTERNAL_REVIEWER):
            await db.execute(
                user_roles.insert().values(
                    user_id=user.id, role=role, assigned_by=assignment.assigned_by_id
                )
            )
    else:
        user.name = data.name
        user.password_hash = get_password_hash(data.password)
        user.status = UserStatus.ACTIVE
        user.email_verified = True
        user.primary_account_type = PrimaryAccountType.EXTERNAL_REVIEWER

    assignment.reviewer_id = user.id
    if assignment.status == ReviewerAssignmentStatus.PENDING_SIGNUP:
        assignment.status = ReviewerAssignmentStatus.ASSIGNED

    pending = (await db.execute(
        select(ReviewerAssignment).where(
            ReviewerAssignment.invited_email == assignment.invited_email,
            ReviewerAssignment.institution_id == assignment.institution_id,
            ReviewerAssignment.reviewer_id.is_(None),
        )
    )).scalars().all()
    for p in pending:
        p.reviewer_id = user.id
        if p.status == ReviewerAssignmentStatus.PENDING_SIGNUP:
            p.status = ReviewerAssignmentStatus.ASSIGNED

    await db.commit()
    await db.refresh(user)

    token_data = {
        "user_id": user.id,
        "account_type": user.account_type.value,
        "institution_id": user.primary_institution_id,
        "is_global_admin": user.is_global_admin,
        "is_institution_admin": user.is_institution_admin,
    }
    access_token = create_access_token(data=token_data, is_admin=False)
    refresh_token = create_refresh_token(data=token_data)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user_id": user.id,
        "assignment_id": assignment.id,
    }


# ─── Staff: invite reviewer ────────────────────────────────────────────────────

@router.post("/invite")
async def invite_reviewer(
    data: InviteReviewerRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.GRANT_OFFICER,
        ResearchRole.RESEARCH_ADMIN,
        ResearchRole.ETHICS_REVIEWER,
        ResearchRole.ETHICS_CHAIR,
        ResearchRole.INSTITUTIONAL_LEAD,
    ])),
):
    """Assign a reviewer by email — sends signup email if needed, then assignment email."""
    try:
        review_type = ReviewType(data.review_type)
    except ValueError:
        raise HTTPException(400, "review_type must be proposal, project, or ethics")

    institution_id = current_user.primary_institution_id
    if not institution_id:
        raise HTTPException(400, "You must belong to an institution")

    entity_title = await _get_entity_title(db, data.review_type, data.entity_id)

    existing_user = await _find_or_create_reviewer_user(
        db, data.email, data.name, institution_id, current_user.id, create_if_missing=False
    )

    signup_token = None
    status = ReviewerAssignmentStatus.ASSIGNED
    if not existing_user:
        signup_token = secrets.token_urlsafe(32)
        status = ReviewerAssignmentStatus.PENDING_SIGNUP

    entity_review_id = None
    if review_type == ReviewType.PROPOSAL and existing_user:
        review = ProposalReview(
            proposal_id=data.entity_id,
            reviewer_id=existing_user.id,
        )
        db.add(review)
        await db.flush()
        entity_review_id = review.id

    assignment = ReviewerAssignment(
        institution_id=institution_id,
        reviewer_id=existing_user.id if existing_user else None,
        invited_email=data.email.lower(),
        invited_name=data.name,
        review_type=review_type,
        entity_id=data.entity_id,
        entity_review_id=entity_review_id,
        entity_title=entity_title,
        signup_token=signup_token,
        status=status,
        assigned_by_id=current_user.id,
        notes=data.notes,
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)

    inst = await db.get(Institution, institution_id)
    inviter_name = current_user.name or current_user.email

    if not existing_user and signup_token:
        await EmailService.send_reviewer_signup_email(
            email=data.email,
            inviter_name=inviter_name,
            institution_name=inst.name if inst else "your institution",
            signup_token=signup_token,
        )

    await EmailService.send_review_assignment_email(
        email=data.email,
        reviewer_name=data.name or "",
        review_type=data.review_type,
        entity_title=entity_title,
        inviter_name=inviter_name,
        invitation_token=assignment.invitation_token,
        has_account=existing_user is not None,
    )

    if existing_user:
        await create_notification(
            db, existing_user.id,
            title="New review assignment",
            message=f'You have been assigned to review: "{entity_title}"',
            entity_type=data.review_type,
            entity_id=data.entity_id,
        )

    return {"message": "Reviewer invited", "assignment_id": assignment.id}


# ─── Reviewer portal endpoints ─────────────────────────────────────────────────

@router.get("/assignments/my")
async def list_my_assignments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """All assignments for the logged-in reviewer."""
    _require_reviewer(current_user)
    result = await db.execute(
        select(ReviewerAssignment)
        .where(ReviewerAssignment.reviewer_id == current_user.id)
        .order_by(ReviewerAssignment.assigned_at.desc())
    )
    return [_serialize_assignment(a) for a in result.scalars().all()]


@router.get("/assignments/new")
async def list_new_assignments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Pending and in-progress assignments."""
    _require_reviewer(current_user)
    result = await db.execute(
        select(ReviewerAssignment)
        .where(
            ReviewerAssignment.reviewer_id == current_user.id,
            ReviewerAssignment.status.in_([
                ReviewerAssignmentStatus.ASSIGNED,
                ReviewerAssignmentStatus.IN_PROGRESS,
            ]),
        )
        .order_by(ReviewerAssignment.assigned_at.desc())
    )
    return [_serialize_assignment(a) for a in result.scalars().all()]


@router.get("/assignments/{assignment_id}")
async def get_assignment(
    assignment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    _require_reviewer(current_user)
    assignment = await db.get(ReviewerAssignment, assignment_id)
    if not assignment or assignment.reviewer_id != current_user.id:
        raise HTTPException(404, "Assignment not found")

    detail = _serialize_assignment(assignment)
    detail["entity"] = None

    if assignment.review_type == ReviewType.PROPOSAL:
        proposal = await db.get(Proposal, assignment.entity_id)
        if proposal:
            detail["entity"] = {
                "id": proposal.id,
                "title": proposal.title,
                "status": proposal.status.value if proposal.status else None,
            }
    elif assignment.review_type == ReviewType.PROJECT:
        project = await db.get(ResearchProject, assignment.entity_id)
        if project:
            detail["entity"] = {
                "id": project.id,
                "title": project.title,
                "description": project.description,
                "status": project.status.value if project.status else None,
                "project_abstract": project.project_abstract,
            }
    elif assignment.review_type == ReviewType.ETHICS:
        app = await db.get(EthicsApplication, assignment.entity_id)
        if app:
            detail["entity"] = {
                "id": app.id,
                "title": app.title,
                "application_type": app.application_type,
                "status": app.status.value if app.status else None,
                "lay_summary": app.lay_summary,
                "methodology": app.methodology,
                "risk_assessment": app.risk_assessment,
            }

    if assignment.entity_review_id:
        review = await db.get(ProposalReview, assignment.entity_review_id)
        if review:
            detail["review"] = {
                "id": review.id,
                "status": review.status.value if review.status else None,
                "has_coi": review.has_coi,
                "coi_reason": review.coi_reason,
                "scores": review.scores,
                "overall_score": review.overall_score,
                "recommendation": review.recommendation,
                "narrative_feedback": review.narrative_feedback,
            }

    return detail


@router.post("/assignments/{assignment_id}/start")
async def start_assignment(
    assignment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    _require_reviewer(current_user)
    assignment = await db.get(ReviewerAssignment, assignment_id)
    if not assignment or assignment.reviewer_id != current_user.id:
        raise HTTPException(404, "Assignment not found")
    if assignment.status == ReviewerAssignmentStatus.SUBMITTED:
        raise HTTPException(400, "Review already submitted")

    assignment.status = ReviewerAssignmentStatus.IN_PROGRESS
    assignment.started_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "Review started"}


@router.post("/assignments/{assignment_id}/submit")
async def submit_assignment_review(
    assignment_id: str,
    data: SubmitAssignmentReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    _require_reviewer(current_user)
    assignment = await db.get(ReviewerAssignment, assignment_id)
    if not assignment or assignment.reviewer_id != current_user.id:
        raise HTTPException(404, "Assignment not found")
    if assignment.status == ReviewerAssignmentStatus.SUBMITTED:
        raise HTTPException(400, "Review already submitted")

    now = datetime.now(timezone.utc)

    if assignment.review_type == ReviewType.PROPOSAL and assignment.entity_review_id:
        review = await db.get(ProposalReview, assignment.entity_review_id)
        if review:
            review.has_coi = data.has_coi
            review.coi_reason = data.coi_reason
            review.scores = str(data.scores or {})
            review.overall_score = int(data.overall_score) if data.overall_score else None
            review.recommendation = data.recommendation
            review.narrative_feedback = data.narrative_feedback
            review.status = ReviewStatus.SUBMITTED
            review.submitted_at = now

    assignment.status = ReviewerAssignmentStatus.SUBMITTED
    assignment.submitted_at = now
    await db.commit()
    return {"message": "Review submitted successfully"}


# Also expose GET /grants/reviews/my for backward compatibility
reviews_compat_router = APIRouter(prefix="/api/grants/reviews", tags=["reviews"])


@reviews_compat_router.get("/my")
async def list_my_grant_reviews_compat(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Backward-compatible endpoint used by admin-staff/reviews page."""
    result = await db.execute(
        select(ReviewerAssignment)
        .where(
            ReviewerAssignment.reviewer_id == current_user.id,
            ReviewerAssignment.review_type == ReviewType.PROPOSAL,
        )
        .order_by(ReviewerAssignment.assigned_at.desc())
    )
    assignments = result.scalars().all()
    return [
        {
            "id": a.id,
            "proposal_id": a.entity_id,
            "proposal_title": a.entity_title,
            "status": a.status.value,
            "assigned_at": a.assigned_at.isoformat() if a.assigned_at else None,
            "stage_name": a.notes,
        }
        for a in assignments
    ]
