from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime, timezone

from database import get_db
from models import ProposalReview, Proposal, ReviewStatus, ProposalStatus, User, ReviewerAssignment, ReviewType, ReviewerAssignmentStatus
from auth import require_roles, ResearchRole
from services.notifications import create_notification
from services.email_service import EmailService

router = APIRouter(prefix="/api/grants/reviews", tags=["reviews"])


class AssignReviewerRequest(BaseModel):
    reviewer_id: str


class SubmitReviewRequest(BaseModel):
    has_coi: bool
    coi_reason: Optional[str] = None
    scores: Optional[Dict[str, float]] = {}
    overall_score: Optional[float] = None
    recommendation: Optional[str] = None
    narrative_feedback: Optional[str] = None


@router.post("/proposals/{proposal_id}/assign")
async def assign_reviewer(
    proposal_id: str,
    data: AssignReviewerRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.GRANT_OFFICER]))
):
    proposal = await db.get(Proposal, proposal_id)
    if not proposal or proposal.institution_id != current_user.primary_institution_id:
        raise HTTPException(404, "Proposal not found")

    existing = await db.execute(select(ProposalReview).where(
        ProposalReview.proposal_id == proposal_id,
        ProposalReview.reviewer_id == data.reviewer_id
    ))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Reviewer already assigned")

    review = ProposalReview(
        proposal_id=proposal_id,
        reviewer_id=data.reviewer_id,
    )
    db.add(review)

    if proposal.status == ProposalStatus.SUBMITTED:
        proposal.status = ProposalStatus.UNDER_REVIEW

    await db.commit()
    await db.refresh(review)

    reviewer = await db.get(User, data.reviewer_id)
    if reviewer:
        assignment = ReviewerAssignment(
            institution_id=proposal.institution_id,
            reviewer_id=data.reviewer_id,
            invited_email=reviewer.email,
            invited_name=reviewer.name,
            review_type=ReviewType.PROPOSAL,
            entity_id=proposal_id,
            entity_review_id=review.id,
            entity_title=proposal.title,
            status=ReviewerAssignmentStatus.ASSIGNED,
            assigned_by_id=current_user.id,
        )
        db.add(assignment)
        await db.commit()

        inviter_name = current_user.name or current_user.email
        await EmailService.send_review_assignment_email(
            email=reviewer.email,
            reviewer_name=reviewer.name or "",
            review_type="proposal",
            entity_title=proposal.title,
            inviter_name=inviter_name,
            invitation_token=assignment.invitation_token,
            has_account=True,
        )

    await create_notification(
        db, data.reviewer_id,
        title="Review assignment",
        message=f'You have been assigned to review: "{proposal.title}"',
        entity_type="proposal", entity_id=proposal_id
    )
    return {"message": "Reviewer assigned", "review_id": review.id}


@router.post("/{review_id}/submit")
async def submit_review(
    review_id: str,
    data: SubmitReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.ETHICS_REVIEWER, ResearchRole.GRANT_OFFICER,
        ResearchRole.EXTERNAL_REVIEWER,
    ]))
):
    review = await db.get(ProposalReview, review_id)
    if not review or review.reviewer_id != current_user.id:
        raise HTTPException(403, "Not your review")

    review.has_coi = data.has_coi
    review.coi_reason = data.coi_reason
    review.scores = str(data.scores)
    review.overall_score = int(data.overall_score) if data.overall_score else None
    review.recommendation = data.recommendation
    review.narrative_feedback = data.narrative_feedback
    review.status = ReviewStatus.SUBMITTED
    review.submitted_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "Review submitted"}


@router.get("/proposals/{proposal_id}")
async def get_proposal_reviews(
    proposal_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.GRANT_OFFICER]))
):
    result = await db.execute(
        select(ProposalReview).where(ProposalReview.proposal_id == proposal_id)
    )
    reviews = result.scalars().all()
    return reviews
