from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime, timezone

from database import get_db
from models import ProposalReview, Proposal, ReviewStatus, ProposalStatus, User
from auth import require_roles, ResearchRole
from services.notifications import create_notification

router = APIRouter(prefix="/api/grants/reviews", tags=["reviews"])


class AssignReviewerRequest(BaseModel):
    reviewer_id: int


class SubmitReviewRequest(BaseModel):
    has_coi: bool
    coi_reason: Optional[str] = None
    scores: Optional[Dict[str, float]] = {}
    overall_score: Optional[float] = None
    recommendation: Optional[str] = None
    narrative_feedback: Optional[str] = None


@router.post("/proposals/{proposal_id}/assign")
async def assign_reviewer(
    proposal_id: int,
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
    await create_notification(
        db, data.reviewer_id,
        title="Review assignment",
        message=f'You have been assigned to review: "{proposal.title}"',
        entity_type="proposal", entity_id=proposal_id
    )
    return {"message": "Reviewer assigned", "review_id": review.id}


@router.post("/{review_id}/submit")
async def submit_review(
    review_id: int,
    data: SubmitReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.ETHICS_REVIEWER, ResearchRole.GRANT_OFFICER
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
    proposal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.GRANT_OFFICER]))
):
    result = await db.execute(
        select(ProposalReview).where(ProposalReview.proposal_id == proposal_id)
    )
    reviews = result.scalars().all()
    return reviews
