"""
Grant Opportunity Matcher — API endpoint.
GET /api/grants/match  →  ranked opportunities for the authenticated researcher.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user
from database import get_db
from models import User
from services.grant_matcher import MatchResult, match_grants

router = APIRouter(prefix="/api/grants", tags=["grant-matching"])


# ── Response schema ───────────────────────────────────────────────────────────

class MatchedOpportunityOut(BaseModel):
    opportunity_id: str
    title: str
    sponsor: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    deadline: Optional[str] = None
    amount_min: Optional[float] = None
    amount_max: Optional[float] = None
    currency: Optional[str] = None
    description: Optional[str] = None
    eligibility: Optional[str] = None
    score: float
    reasons: List[str]
    match_explanation: Optional[str] = None


class MatchResponse(BaseModel):
    matches: List[MatchedOpportunityOut]
    total_candidates: int
    ai_enhanced: bool
    signals_used: List[str]


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.get("/match", response_model=MatchResponse)
async def get_matched_opportunities(
    limit: int = Query(default=3, ge=1, le=25, description="Max opportunities to return"),
    include_upcoming: bool = Query(default=False, description="Include upcoming (not yet open) opportunities"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns grant opportunities ranked by relevance to the authenticated researcher.

    Scoring uses TF-IDF overlap across the researcher's expertise keywords,
    department, ORCID data, publications, skills, and training research areas.

    If OPENAI_API_KEY is configured, the top 20 keyword-scored candidates are
    re-ranked and explained by GPT-4o-mini, making this a lightweight agentic
    matching pipeline.
    """
    if current_user.is_global_admin or current_user.is_institution_admin:
        raise HTTPException(status_code=403, detail="This endpoint is for researchers only.")

    result = await match_grants(
        user=current_user,
        db=db,
        limit=limit,
        include_upcoming=include_upcoming,
    )

    return MatchResponse(
        matches=[
            MatchedOpportunityOut(
                opportunity_id=m.opportunity_id,
                title=m.title,
                sponsor=m.sponsor,
                category=m.category,
                status=m.status,
                deadline=m.deadline,
                amount_min=m.amount_min,
                amount_max=m.amount_max,
                currency=m.currency,
                description=m.description,
                eligibility=m.eligibility,
                score=m.score,
                reasons=m.reasons,
                match_explanation=m.match_explanation,
            )
            for m in result["matches"]
        ],
        total_candidates=result["total_candidates"],
        ai_enhanced=result["ai_enhanced"],
        signals_used=result["signals_used"],
    )
