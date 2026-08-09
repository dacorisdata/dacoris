from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, date, timedelta, timezone
from pathlib import Path
import pandas as pd
import io
import httpx

from database import get_db
from models import (
    GrantOpportunity, User, Proposal, OpportunityCategory, OpportunityCategories,
    InstitutionCategory, OpportunityResearcherRecommendation, PrimaryAccountType, UserStatus,
)
from auth import require_roles, ResearchRole, get_current_user
from services.opportunity_import import OpportunityImportService

router = APIRouter(prefix="/api/grants/opportunities", tags=["opportunities"])

# Live-synced source for the simplified researcher-facing opportunities register.
# Replacing this file (same path/name) is enough to update the Discover page --
# no manual re-import step required. Only re-parsed when the file's mtime changes.
_SIMPLE_OPPS_FILE = Path(__file__).parent.parent.parent / "data" / "opportunities_.xlsx"
_simple_sync_state: Dict[str, Optional[float]] = {"mtime": None}


async def _maybe_sync_simple_opportunities(db: AsyncSession) -> None:
    try:
        if not _SIMPLE_OPPS_FILE.exists():
            return
        mtime = _SIMPLE_OPPS_FILE.stat().st_mtime
        if _simple_sync_state["mtime"] == mtime:
            return
        created, updated, errors = await OpportunityImportService.sync_simple_opportunities(
            db, str(_SIMPLE_OPPS_FILE)
        )
        if errors:
            print(f"[WARN] simple opportunities sync had {len(errors)} row errors: {errors[:5]}")
        print(f"[INFO] simple opportunities sync: {created} created, {updated} updated")
        _simple_sync_state["mtime"] = mtime
    except Exception as e:
        # Never let a bad source file break the Discover page
        print(f"[WARN] Failed to sync simple opportunities excel: {e}")


class OpportunityCreate(BaseModel):
    title: str
    sponsor: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    geography: Optional[str] = None
    applicant_type: Optional[str] = None
    funding_type: Optional[str] = None
    amount_min: Optional[float] = None
    amount_max: Optional[float] = None
    currency: str = "KES"
    open_date: Optional[datetime] = None
    deadline: Optional[datetime] = None


class CategoryBrief(BaseModel):
    id: Optional[str] = None
    name: str
    slug: Optional[str] = None
    color: Optional[str] = "#3B82F6"


class OpportunityApplicationOut(BaseModel):
    id: str
    title: str
    status: str
    submitted_at: Optional[datetime] = None
    created_at: datetime
    lead_pi_name: Optional[str] = None
    lead_pi_email: Optional[str] = None


class ColleagueApplicationBrief(BaseModel):
    user_id: str
    name: str
    status: str


class RecommendedResearcherBrief(BaseModel):
    user_id: str
    name: str
    email: Optional[str] = None
    note: Optional[str] = None
    recommended_by_name: Optional[str] = None
    recommended_at: Optional[datetime] = None


class OpportunityOut(BaseModel):
    id: str
    title: str
    sponsor: Optional[str]
    description: Optional[str]
    category: Optional[str]
    geography: Optional[str]
    applicant_type: Optional[str]
    funding_type: Optional[str]
    amount_min: Optional[float]
    amount_max: Optional[float]
    currency: str
    deadline: Optional[date]
    status: str
    is_curated: bool
    created_at: datetime
    categories: List[CategoryBrief] = []
    application_count: int = 0
    application_url: Optional[str] = None
    colleague_applications: List[ColleagueApplicationBrief] = []
    colleague_count: int = 0
    staff_recommended: bool = False
    staff_recommendation_note: Optional[str] = None
    recommended_by_name: Optional[str] = None
    recommended_researchers: List[RecommendedResearcherBrief] = []

    class Config:
        from_attributes = True


class OpportunityDetailOut(OpportunityOut):
    eligibility: Optional[str] = None
    criteria: Optional[str] = None
    contact_email: Optional[str] = None
    source_system: Optional[str] = None


class RecommendationCreate(BaseModel):
    researcher_id: str
    note: Optional[str] = None


class RecommendationBulkCreate(BaseModel):
    researcher_ids: Optional[List[str]] = None
    recommend_all: bool = False
    note: Optional[str] = None


class InstitutionResearcherBrief(BaseModel):
    id: str
    name: Optional[str] = None
    email: str
    department: Optional[str] = None
    expertise_keywords: Optional[str] = None


_RECOMMENDER_ACCOUNT_TYPES = {
    PrimaryAccountType.DIRECTOR_RESEARCH,
    PrimaryAccountType.RESEARCH_ADMINISTRATOR,
}
_RECOMMENDER_ROLES = {
    ResearchRole.DIRECTOR_RESEARCH,
    ResearchRole.RESEARCH_ADMIN,
    ResearchRole.INSTITUTIONAL_LEAD,
}


def _can_recommend_researchers(user: User) -> bool:
    if user.is_global_admin or user.is_institution_admin:
        return True
    return user.primary_account_type in _RECOMMENDER_ACCOUNT_TYPES


async def _load_institution_researchers(
    db: AsyncSession,
    institution_id: str,
    q: Optional[str] = None,
    limit: int = 200,
) -> List[User]:
    query = select(User).where(
        User.primary_institution_id == institution_id,
        User.status == UserStatus.ACTIVE,
    )
    if q:
        pattern = f"%{q.lower()}%"
        query = query.where(
            or_(
                func.lower(User.name).like(pattern),
                func.lower(User.email).like(pattern),
                func.lower(User.department).like(pattern),
                func.lower(User.expertise_keywords).like(pattern),
            )
        )
    result = await db.execute(query.order_by(User.name).limit(limit))
    return list(result.scalars().all())


async def _get_existing_recommendation_user_ids(
    db: AsyncSession,
    opp_id: str,
) -> set:
    result = await db.execute(
        select(OpportunityResearcherRecommendation.researcher_id).where(
            OpportunityResearcherRecommendation.opportunity_id == opp_id,
        )
    )
    return {row[0] for row in result.all()}


async def _create_opportunity_recommendations(
    db: AsyncSession,
    opp_id: str,
    researcher_ids: List[str],
    institution_id: str,
    recommended_by: User,
    note: Optional[str] = None,
) -> dict:
    """Create recommendations for researchers not already tagged. Returns counts."""
    if not researcher_ids:
        return {"created": 0, "skipped": 0, "failures": []}

    existing = await _get_existing_recommendation_user_ids(db, opp_id)
    note_text = (note or "").strip() or None
    created = 0
    skipped = 0
    failures = []

    for researcher_id in researcher_ids:
        if researcher_id in existing:
            skipped += 1
            continue
        researcher = await db.get(User, researcher_id)
        if not researcher or researcher.primary_institution_id != institution_id:
            failures.append(f"{researcher_id}: not found at institution")
            continue
        if researcher.status != UserStatus.ACTIVE:
            failures.append(f"{researcher.name or researcher.email}: not active")
            continue

        db.add(OpportunityResearcherRecommendation(
            opportunity_id=opp_id,
            researcher_id=researcher_id,
            recommended_by_id=recommended_by.id,
            institution_id=institution_id,
            note=note_text,
        ))
        existing.add(researcher_id)
        created += 1

    if created:
        await db.commit()
    return {"created": created, "skipped": skipped, "failures": failures}


async def _fetch_colleague_applications(
    db: AsyncSession,
    opportunity_ids: List[str],
    institution_id: Optional[str],
    exclude_user_id: Optional[str],
) -> Dict[str, List[ColleagueApplicationBrief]]:
    if not opportunity_ids or not institution_id:
        return {oid: [] for oid in opportunity_ids}

    query = (
        select(Proposal.opportunity_id, Proposal.status, User.id, User.name)
        .join(User, User.id == Proposal.lead_pi_id)
        .where(
            Proposal.opportunity_id.in_(opportunity_ids),
            Proposal.institution_id == institution_id,
        )
    )
    if exclude_user_id:
        query = query.where(Proposal.lead_pi_id != exclude_user_id)

    result = await db.execute(query)
    mapping: Dict[str, List[ColleagueApplicationBrief]] = {oid: [] for oid in opportunity_ids}
    for opp_id, status_val, user_id, name in result.all():
        status_str = status_val.value if hasattr(status_val, 'value') else str(status_val or 'draft')
        mapping.setdefault(opp_id, []).append(ColleagueApplicationBrief(
            user_id=user_id,
            name=name or "Researcher",
            status=status_str.lower(),
        ))
    return mapping


async def _fetch_staff_recommendations_for_user(
    db: AsyncSession,
    opportunity_ids: List[str],
    researcher_id: str,
    institution_id: Optional[str],
) -> Dict[str, OpportunityResearcherRecommendation]:
    if not opportunity_ids or not researcher_id:
        return {}

    query = (
        select(OpportunityResearcherRecommendation)
        .options(selectinload(OpportunityResearcherRecommendation.recommended_by))
        .where(
            OpportunityResearcherRecommendation.opportunity_id.in_(opportunity_ids),
            OpportunityResearcherRecommendation.researcher_id == researcher_id,
        )
    )
    if institution_id:
        query = query.where(OpportunityResearcherRecommendation.institution_id == institution_id)

    result = await db.execute(query)
    return {rec.opportunity_id: rec for rec in result.scalars().all()}


async def _fetch_recommended_researchers_by_opportunity(
    db: AsyncSession,
    opportunity_ids: List[str],
    institution_id: Optional[str],
) -> Dict[str, List[RecommendedResearcherBrief]]:
    if not opportunity_ids or not institution_id:
        return {oid: [] for oid in opportunity_ids}

    result = await db.execute(
        select(OpportunityResearcherRecommendation)
        .options(
            selectinload(OpportunityResearcherRecommendation.researcher),
            selectinload(OpportunityResearcherRecommendation.recommended_by),
        )
        .where(
            OpportunityResearcherRecommendation.opportunity_id.in_(opportunity_ids),
            OpportunityResearcherRecommendation.institution_id == institution_id,
        )
        .order_by(OpportunityResearcherRecommendation.created_at.desc())
    )
    mapping: Dict[str, List[RecommendedResearcherBrief]] = {oid: [] for oid in opportunity_ids}
    for rec in result.scalars().all():
        mapping.setdefault(rec.opportunity_id, []).append(RecommendedResearcherBrief(
            user_id=rec.researcher_id,
            name=rec.researcher.name if rec.researcher else "Researcher",
            email=rec.researcher.email if rec.researcher else None,
            note=rec.note,
            recommended_by_name=rec.recommended_by.name if rec.recommended_by else None,
            recommended_at=rec.created_at,
        ))
    return mapping


class FundingAreaSummary(BaseModel):
    category_id: Optional[str] = None
    category_name: str
    color: str = "#3B82F6"
    opportunity_count: int = 0
    open_count: int = 0
    application_count: int = 0
    total_funding_min: float = 0
    total_funding_max: float = 0
    currencies: List[str] = []


def _legacy_category_briefs(category: Optional[str]) -> List[CategoryBrief]:
    if not category:
        return []
    return [
        CategoryBrief(name=part.strip())
        for part in category.split(",")
        if part.strip()
    ]


def _resolve_opportunity_categories(
    opp: GrantOpportunity,
    assigned: List[OpportunityCategory],
) -> List[CategoryBrief]:
    if assigned:
        return [
            CategoryBrief(id=c.id, name=c.name, slug=c.slug, color=c.color or "#3B82F6")
            for c in assigned
        ]
    return _legacy_category_briefs(opp.category)


async def _fetch_opportunity_categories(
    db: AsyncSession,
    opportunity_ids: List[str],
) -> Dict[str, List[OpportunityCategory]]:
    if not opportunity_ids:
        return {}

    result = await db.execute(
        select(OpportunityCategories.opportunity_id, OpportunityCategory)
        .join(OpportunityCategory, OpportunityCategories.category_id == OpportunityCategory.id)
        .where(OpportunityCategories.opportunity_id.in_(opportunity_ids))
    )
    mapping: Dict[str, List[OpportunityCategory]] = {oid: [] for oid in opportunity_ids}
    for opp_id, category in result.all():
        mapping.setdefault(opp_id, []).append(category)
    return mapping


async def _fetch_application_counts(
    db: AsyncSession,
    opportunity_ids: List[str],
    institution_id: Optional[str] = None,
) -> Dict[str, int]:
    if not opportunity_ids:
        return {}

    query = (
        select(Proposal.opportunity_id, func.count(Proposal.id))
        .where(Proposal.opportunity_id.in_(opportunity_ids))
        .group_by(Proposal.opportunity_id)
    )
    if institution_id:
        query = query.where(Proposal.institution_id == institution_id)

    result = await db.execute(query)
    return {opp_id: count for opp_id, count in result.all()}


async def _query_visible_opportunities(
    db: AsyncSession,
    current_user: User,
    status: Optional[str] = None,
    curated_only: bool = False,
) -> List[GrantOpportunity]:
    """Return opportunities visible to the current user."""
    is_global_or_inst_admin = current_user.is_global_admin or current_user.is_institution_admin

    if is_global_or_inst_admin:
        query = select(GrantOpportunity)
    else:
        # Opportunities with no category assigned at all (e.g. rows synced from the
        # simplified researcher-facing register, which carries no category data) are
        # treated as institution-agnostic and shown to every researcher.
        uncategorized = ~GrantOpportunity.category_assignments.any()

        if not current_user.primary_institution_id:
            query = select(GrantOpportunity).where(uncategorized)
        else:
            inst_categories_result = await db.execute(
                select(InstitutionCategory.category_id).where(
                    InstitutionCategory.institution_id == current_user.primary_institution_id
                )
            )
            institution_category_ids = [row[0] for row in inst_categories_result.fetchall()]

            if institution_category_ids:
                matched_ids = select(OpportunityCategories.opportunity_id).where(
                    OpportunityCategories.category_id.in_(institution_category_ids)
                )
                query = select(GrantOpportunity).where(
                    or_(GrantOpportunity.id.in_(matched_ids), uncategorized)
                )
            else:
                query = select(GrantOpportunity).where(uncategorized)

    if status:
        query = query.where(GrantOpportunity.status == status)
    if curated_only:
        query = query.where(GrantOpportunity.is_curated == True)

    result = await db.execute(query.order_by(GrantOpportunity.deadline))
    return list(result.scalars().all())


def _serialize_opportunity(
    opp: GrantOpportunity,
    categories: List[CategoryBrief],
    application_count: int = 0,
    include_details: bool = False,
    colleague_applications: Optional[List[ColleagueApplicationBrief]] = None,
    staff_recommendation: Optional[OpportunityResearcherRecommendation] = None,
    recommended_researchers: Optional[List[RecommendedResearcherBrief]] = None,
) -> dict:
    colleagues = colleague_applications or []
    recs = recommended_researchers or []
    payload = {
        "id": opp.id,
        "title": opp.title,
        "sponsor": opp.sponsor,
        "description": opp.description,
        "category": opp.category,
        "geography": opp.geography,
        "applicant_type": opp.applicant_type,
        "funding_type": opp.funding_type,
        "amount_min": opp.amount_min,
        "amount_max": opp.amount_max,
        "currency": opp.currency,
        "deadline": opp.deadline,
        "status": opp.status,
        "is_curated": opp.is_curated,
        "created_at": opp.created_at,
        "categories": categories,
        "application_count": application_count,
        "application_url": opp.application_url,
        "colleague_applications": colleagues,
        "colleague_count": len(colleagues),
        "staff_recommended": staff_recommendation is not None,
        "staff_recommendation_note": staff_recommendation.note if staff_recommendation else None,
        "recommended_by_name": (
            staff_recommendation.recommended_by.name
            if staff_recommendation and staff_recommendation.recommended_by
            else None
        ),
        "recommended_researchers": recs,
    }
    if include_details:
        payload.update({
            "eligibility": opp.eligibility,
            "criteria": opp.criteria,
            "contact_email": opp.contact_email,
            "source_system": opp.source_system,
        })
    return payload


@router.get("", response_model=List[OpportunityOut])
async def list_opportunities(
    status: Optional[str] = Query(None),
    curated_only: Optional[bool] = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List grant opportunities from database.
    - Global/Institution admins see all opportunities
    - Admin-staff and researchers see only opportunities matching their institution's categories
      (plus any uncategorized opportunities, which are visible to everyone)
    """
    await _maybe_sync_simple_opportunities(db)
    opportunities = await _query_visible_opportunities(db, current_user, status, curated_only)
    if not opportunities:
        return []

    opp_ids = [o.id for o in opportunities]
    category_map = await _fetch_opportunity_categories(db, opp_ids)
    app_counts = await _fetch_application_counts(
        db, opp_ids, institution_id=current_user.primary_institution_id
    )
    colleague_map = await _fetch_colleague_applications(
        db, opp_ids, current_user.primary_institution_id, exclude_user_id=current_user.id,
    )
    user_recs = await _fetch_staff_recommendations_for_user(
        db, opp_ids, current_user.id, current_user.primary_institution_id,
    )
    recommended_map = {}
    if _can_recommend_researchers(current_user):
        recommended_map = await _fetch_recommended_researchers_by_opportunity(
            db, opp_ids, current_user.primary_institution_id,
        )

    return [
        _serialize_opportunity(
            opp,
            _resolve_opportunity_categories(opp, category_map.get(opp.id, [])),
            app_counts.get(opp.id, 0),
            colleague_applications=colleague_map.get(opp.id, []),
            staff_recommendation=user_recs.get(opp.id),
            recommended_researchers=recommended_map.get(opp.id, []),
        )
        for opp in opportunities
    ]


@router.post("", response_model=OpportunityOut, status_code=201)
async def create_opportunity(
    data: OpportunityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.GRANT_OFFICER, ResearchRole.SYSTEM_ADMIN
    ]))
):
    opp = GrantOpportunity(
        created_by_id=current_user.id,
        **data.model_dump()
    )
    db.add(opp)
    await db.commit()
    await db.refresh(opp)
    return opp


@router.get("/from-excel-source")
async def get_opportunities_from_excel(
    current_user: User = Depends(get_current_user)
):
    """Fetch opportunities from Excel file without persisting to database"""
    try:
        from pathlib import Path
        import traceback
        
        excel_path = Path(__file__).parent.parent.parent / "data" / "opportunities.xlsx"
        
        if not excel_path.exists():
            print(f"Excel file not found at: {excel_path}")
            return []
        
        opportunities = OpportunityImportService.parse_dacoris_excel_file(str(excel_path))
        
        result = []
        for idx, opp in enumerate(opportunities, 1):
            result.append({
                "id": idx,
                "title": opp.get("title"),
                "sponsor": opp.get("sponsor"),
                "description": opp.get("description"),
                "category": opp.get("category"),
                "geography": opp.get("geography"),
                "applicant_type": opp.get("applicant_type"),
                "funding_type": opp.get("funding_type"),
                "amount_min": opp.get("amount_min"),
                "amount_max": opp.get("amount_max"),
                "currency": opp.get("currency", "KES"),
                "deadline": opp.get("deadline").isoformat() if opp.get("deadline") else None,
                "eligibility": opp.get("eligibility"),
                "criteria": opp.get("criteria"),
                "application_url": opp.get("application_url"),
                "contact_email": opp.get("contact_email"),
                "source_system": opp.get("source_system", "excel_import"),
                "source_id": opp.get("source_id"),
                "status": opp.get("status", "open"),
                "created_at": datetime.now().isoformat()
            })
        
        return result
        
    except Exception as e:
        import traceback
        print(f"[ERROR] Error reading Excel file: {e}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read opportunities: {str(e)}"
        )


@router.get("/funding-by-area", response_model=List[FundingAreaSummary])
async def get_funding_by_area(
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregate funding information by research funding area for reporting."""
    opportunities = await _query_visible_opportunities(db, current_user, status=status)
    if not opportunities:
        return []

    opp_ids = [o.id for o in opportunities]
    category_map = await _fetch_opportunity_categories(db, opp_ids)
    app_counts = await _fetch_application_counts(
        db, opp_ids, institution_id=current_user.primary_institution_id
    )

    summaries: Dict[str, FundingAreaSummary] = {}

    for opp in opportunities:
        categories = _resolve_opportunity_categories(opp, category_map.get(opp.id, []))
        if not categories:
            categories = [CategoryBrief(name="Uncategorized")]

        for cat in categories:
            key = cat.id or cat.name
            if key not in summaries:
                summaries[key] = FundingAreaSummary(
                    category_id=cat.id,
                    category_name=cat.name,
                    color=cat.color or "#3B82F6",
                )

            summary = summaries[key]
            summary.opportunity_count += 1
            if opp.status == "open":
                summary.open_count += 1
            summary.application_count += app_counts.get(opp.id, 0)
            if opp.amount_min:
                summary.total_funding_min += opp.amount_min
            if opp.amount_max:
                summary.total_funding_max += opp.amount_max
            elif opp.amount_min:
                summary.total_funding_max += opp.amount_min
            if opp.currency and opp.currency not in summary.currencies:
                summary.currencies.append(opp.currency)

    return sorted(summaries.values(), key=lambda s: s.opportunity_count, reverse=True)


@router.get("/institution-researchers", response_model=List[InstitutionResearcherBrief])
async def search_institution_researchers(
    q: Optional[str] = Query(None),
    limit: int = Query(200, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List or search researchers at the current user's institution (for opportunity tagging)."""
    if not _can_recommend_researchers(current_user):
        raise HTTPException(403, "You do not have permission to tag researchers to opportunities")
    if not current_user.primary_institution_id:
        return []

    users = await _load_institution_researchers(
        db, current_user.primary_institution_id, q=q, limit=limit,
    )
    return [
        InstitutionResearcherBrief(
            id=u.id,
            name=u.name,
            email=u.email,
            department=u.department,
            expertise_keywords=u.expertise_keywords,
        )
        for u in users
    ]


@router.get("/{opp_id}", response_model=OpportunityDetailOut)
async def get_opportunity(
    opp_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(GrantOpportunity).where(GrantOpportunity.id == opp_id)
    )
    opp = result.scalar_one_or_none()
    if not opp:
        raise HTTPException(404, "Opportunity not found")

    category_map = await _fetch_opportunity_categories(db, [opp_id])
    app_counts = await _fetch_application_counts(
        db, [opp_id], institution_id=current_user.primary_institution_id
    )
    colleague_map = await _fetch_colleague_applications(
        db, [opp_id], current_user.primary_institution_id, exclude_user_id=current_user.id,
    )
    user_recs = await _fetch_staff_recommendations_for_user(
        db, [opp_id], current_user.id, current_user.primary_institution_id,
    )
    recommended_map = {}
    if _can_recommend_researchers(current_user):
        recommended_map = await _fetch_recommended_researchers_by_opportunity(
            db, [opp_id], current_user.primary_institution_id,
        )

    return _serialize_opportunity(
        opp,
        _resolve_opportunity_categories(opp, category_map.get(opp_id, [])),
        app_counts.get(opp_id, 0),
        include_details=True,
        colleague_applications=colleague_map.get(opp_id, []),
        staff_recommendation=user_recs.get(opp_id),
        recommended_researchers=recommended_map.get(opp_id, []),
    )


@router.get("/{opp_id}/applications", response_model=List[OpportunityApplicationOut])
async def get_opportunity_applications(
    opp_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List institutional applications (proposals) for a grant opportunity."""
    from sqlalchemy.orm import selectinload

    result = await db.execute(select(GrantOpportunity).where(GrantOpportunity.id == opp_id))
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Opportunity not found")

    query = (
        select(Proposal)
        .options(selectinload(Proposal.lead_pi))
        .where(Proposal.opportunity_id == opp_id)
    )
    if current_user.primary_institution_id:
        query = query.where(Proposal.institution_id == current_user.primary_institution_id)

    proposals_result = await db.execute(query.order_by(Proposal.created_at.desc()))
    proposals = proposals_result.scalars().all()

    return [
        {
            "id": p.id,
            "title": p.title,
            "status": p.status.value if hasattr(p.status, "value") else str(p.status),
            "submitted_at": p.submitted_at,
            "created_at": p.created_at,
            "lead_pi_name": p.lead_pi.name if p.lead_pi else None,
            "lead_pi_email": p.lead_pi.email if p.lead_pi else None,
        }
        for p in proposals
    ]


@router.get("/{opp_id}/recommendations", response_model=List[RecommendedResearcherBrief])
async def list_opportunity_recommendations(
    opp_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _can_recommend_researchers(current_user):
        raise HTTPException(403, "You do not have permission to view recommendations")
    result = await db.execute(select(GrantOpportunity).where(GrantOpportunity.id == opp_id))
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Opportunity not found")

    rec_map = await _fetch_recommended_researchers_by_opportunity(
        db, [opp_id], current_user.primary_institution_id,
    )
    return rec_map.get(opp_id, [])


@router.post("/{opp_id}/recommendations", status_code=201)
async def recommend_researcher_to_opportunity(
    opp_id: str,
    data: RecommendationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _can_recommend_researchers(current_user):
        raise HTTPException(403, "You do not have permission to tag researchers to opportunities")
    if not current_user.primary_institution_id:
        raise HTTPException(400, "Your account is not linked to an institution")

    opp_result = await db.execute(select(GrantOpportunity).where(GrantOpportunity.id == opp_id))
    if not opp_result.scalar_one_or_none():
        raise HTTPException(404, "Opportunity not found")

    researcher = await db.get(User, data.researcher_id)
    if not researcher or researcher.primary_institution_id != current_user.primary_institution_id:
        raise HTTPException(404, "Researcher not found at your institution")

    existing = await _get_existing_recommendation_user_ids(db, opp_id)
    if data.researcher_id in existing:
        raise HTTPException(400, "This researcher is already recommended for this opportunity")

    result = await _create_opportunity_recommendations(
        db, opp_id, [data.researcher_id], current_user.primary_institution_id, current_user, data.note,
    )
    if result["created"] == 0:
        raise HTTPException(400, "Could not create recommendation")

    rec_result = await db.execute(
        select(OpportunityResearcherRecommendation).where(
            OpportunityResearcherRecommendation.opportunity_id == opp_id,
            OpportunityResearcherRecommendation.researcher_id == data.researcher_id,
        )
    )
    rec = rec_result.scalar_one()

    return {
        "id": rec.id,
        "researcher_id": rec.researcher_id,
        "note": rec.note,
        "recommended_by_name": current_user.name,
    }


@router.post("/{opp_id}/recommendations/bulk", status_code=201)
async def recommend_researchers_bulk(
    opp_id: str,
    data: RecommendationBulkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Recommend an opportunity to specific researchers or all institution researchers."""
    if not _can_recommend_researchers(current_user):
        raise HTTPException(403, "You do not have permission to tag researchers to opportunities")
    if not current_user.primary_institution_id:
        raise HTTPException(400, "Your account is not linked to an institution")

    opp_result = await db.execute(select(GrantOpportunity).where(GrantOpportunity.id == opp_id))
    if not opp_result.scalar_one_or_none():
        raise HTTPException(404, "Opportunity not found")

    if data.recommend_all:
        users = await _load_institution_researchers(
            db, current_user.primary_institution_id, limit=500,
        )
        researcher_ids = [u.id for u in users if u.id != current_user.id]
    elif data.researcher_ids:
        researcher_ids = list(dict.fromkeys(data.researcher_ids))
    else:
        raise HTTPException(400, "Provide researcher_ids or set recommend_all to true")

    result = await _create_opportunity_recommendations(
        db,
        opp_id,
        researcher_ids,
        current_user.primary_institution_id,
        current_user,
        data.note,
    )

    if result["created"] == 0 and not result["skipped"]:
        detail = result["failures"][0] if result["failures"] else "No researchers were recommended"
        raise HTTPException(400, detail)

    return {
        "created": result["created"],
        "skipped": result["skipped"],
        "failures": result["failures"],
        "recommended_by_name": current_user.name,
    }


@router.delete("/{opp_id}/recommendations/{researcher_id}")
async def remove_opportunity_recommendation(
    opp_id: str,
    researcher_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _can_recommend_researchers(current_user):
        raise HTTPException(403, "You do not have permission to remove recommendations")

    result = await db.execute(
        select(OpportunityResearcherRecommendation).where(
            OpportunityResearcherRecommendation.opportunity_id == opp_id,
            OpportunityResearcherRecommendation.researcher_id == researcher_id,
            OpportunityResearcherRecommendation.institution_id == current_user.primary_institution_id,
        )
    )
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(404, "Recommendation not found")

    await db.delete(rec)
    await db.commit()
    return {"message": "Recommendation removed"}


@router.patch("/{opp_id}/status")
async def update_opportunity_status(
    opp_id: str,
    status: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.GRANT_OFFICER]))
):
    result = await db.execute(select(GrantOpportunity).where(
        GrantOpportunity.id == opp_id,
    ))
    opp = result.scalar_one_or_none()
    if not opp:
        raise HTTPException(404, "Opportunity not found")
    opp.status = status
    await db.commit()
    return {"id": opp_id, "status": status}


@router.delete("/{opp_id}")
async def delete_opportunity(
    opp_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a grant opportunity"""
    result = await db.execute(
        select(GrantOpportunity).where(GrantOpportunity.id == opp_id)
    )
    opp = result.scalar_one_or_none()
    if not opp:
        raise HTTPException(404, "Opportunity not found")
    
    await db.delete(opp)
    await db.commit()
    return {"success": True, "message": "Opportunity deleted successfully"}


# ==================== HELPER FUNCTIONS ====================

def parse_date(date_value):
    """Convert various date formats to Python date object"""
    if not date_value:
        return None
    if isinstance(date_value, date):
        return date_value
    if isinstance(date_value, datetime):
        return date_value.date()
    if isinstance(date_value, str):
        try:
            return datetime.strptime(date_value, '%Y-%m-%d').date()
        except ValueError:
            try:
                return datetime.strptime(date_value, '%Y/%m/%d').date()
            except ValueError:
                return None
    return None


# ==================== IMPORT ENDPOINTS ====================

@router.post("/import/excel")
async def import_from_excel(
    file: UploadFile = File(...),
    skip_duplicates: bool = Query(True, description="Skip duplicate opportunities"),
    update_existing: bool = Query(False, description="Update existing opportunities"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Import grant opportunities from Excel file with deduplication"""
    try:
        # Save uploaded file temporarily
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp_file:
            contents = await file.read()
            tmp_file.write(contents)
            tmp_file_path = tmp_file.name
        
        try:
            # Parse Excel file
            opportunities = OpportunityImportService.parse_excel_file(tmp_file_path)
            
            if not opportunities:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No valid opportunities found in file"
                )
            
            # Import opportunities
            created, skipped, errors = await OpportunityImportService.import_opportunities(
                db=db,
                opportunities=opportunities,
                created_by_id=current_user.id,
                institution_id=current_user.primary_institution_id,
                skip_duplicates=skip_duplicates,
                update_existing=update_existing
            )
            
            return {
                "success": True,
                "created_count": created,
                "skipped_count": skipped,
                "total_rows": len(opportunities),
                "errors": errors if errors else None
            }
            
        finally:
            # Clean up temp file
            os.unlink(tmp_file_path)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process Excel file: {str(e)}"
        )


class ExternalAPIImportRequest(BaseModel):
    api_url: str


@router.post("/import/api")
async def import_from_external_api(
    request: ExternalAPIImportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Import grant opportunities from external API"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(request.api_url)
            response.raise_for_status()
            external_data = response.json()
            
            if not isinstance(external_data, list):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="External API must return a list of opportunities"
                )
            
            imported_count = 0
            errors = []
            
            for item in external_data:
                try:
                    title = item.get('title') or item.get('name')
                    
                    # Check if opportunity already exists
                    existing = await db.execute(
                        select(GrantOpportunity).where(
                            GrantOpportunity.title == title,
                        )
                    )
                    if existing.scalar_one_or_none():
                        errors.append(f"Opportunity '{title}' already exists - skipped")
                        continue
                    
                    deadline_str = item.get('deadline') or item.get('closing_date')
                    opp_data = {
                        "title": title,
                        "sponsor": item.get('sponsor') or item.get('funder') or item.get('organization'),
                        "description": item.get('description') or item.get('summary'),
                        "category": item.get('category') or item.get('focus_area'),
                        "funding_type": item.get('funding_type') or item.get('type'),
                        "currency": item.get('currency', 'USD'),
                        "amount_min": item.get('amount_min') or item.get('min_award'),
                        "amount_max": item.get('amount_max') or item.get('max_award'),
                        "deadline": parse_date(deadline_str),
                        "eligibility": item.get('eligibility') or item.get('requirements'),
                        "application_url": item.get('application_url') or item.get('url'),
                        "contact_email": item.get('contact_email') or item.get('email'),
                        "status": "open",
                    }
                    
                    db_opp = GrantOpportunity(
                        **opp_data,
                        created_by_id=current_user.id,
                    )
                    db.add(db_opp)
                    imported_count += 1
                    
                except Exception as e:
                    errors.append(f"Item '{item.get('title', 'Unknown')}': {str(e)}")
            
            await db.commit()
            
            return {
                "success": True,
                "imported_count": imported_count,
                "total_items": len(external_data),
                "errors": errors if errors else None
            }
            
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch from external API: {str(e)}"
        )


@router.get("/template/excel")
async def download_excel_template():
    """Download Excel template for batch import"""
    template_data = {
        'title': ['Sample Grant Opportunity'],
        'sponsor': ['Example Foundation'],
        'description': ['Description of the grant opportunity'],
        'category': ['Health'],
        'funding_type': ['Research Grant'],
        'currency': ['KES'],
        'amount_min': [100000],
        'amount_max': [500000],
        'deadline': ['2024-12-31'],
        'eligibility': ['Universities and research institutions'],
        'application_url': ['https://example.org/apply'],
        'contact_email': ['grants@example.org'],
        'status': ['open']
    }
    
    df = pd.DataFrame(template_data)
    output = io.BytesIO()
    
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Opportunities')
        worksheet = writer.sheets['Opportunities']
        for idx, col in enumerate(df.columns):
            max_length = max(df[col].astype(str).apply(len).max(), len(col)) + 2
            worksheet.column_dimensions[chr(65 + idx)].width = min(max_length, 50)
    
    output.seek(0)
    
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        io.BytesIO(output.getvalue()),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=grant_opportunities_template.xlsx"}
    )


# ==================== MOCK EXTERNAL API ====================

@router.get("/mock/external-opportunities")
async def mock_external_api():
    """Mock external grant opportunities API for testing"""
    return [
        {
            "title": "Global Health Innovation Fund 2024",
            "sponsor": "Wellcome Trust",
            "description": "Supporting innovative research to address major health challenges in low- and middle-income countries. Focus areas include infectious diseases, maternal health, and health systems strengthening.",
            "category": "Health",
            "funding_type": "Research Grant",
            "currency": "GBP",
            "amount_min": 100000,
            "amount_max": 500000,
            "deadline": "2024-09-30",
            "eligibility": "Universities, research institutions, and NGOs in Africa and Asia",
            "application_url": "https://wellcome.org/grant-funding/schemes/global-health-innovation-fund",
            "contact_email": "grants@wellcome.org"
        },
        {
            "title": "Agricultural Transformation Initiative",
            "sponsor": "Bill & Melinda Gates Foundation",
            "description": "Grants to support smallholder farmers through improved agricultural practices, market access, and climate-resilient crops.",
            "category": "Agriculture",
            "funding_type": "Development Grant",
            "currency": "USD",
            "amount_min": 250000,
            "amount_max": 2000000,
            "deadline": "2024-11-15",
            "eligibility": "NGOs, research organizations, and agricultural institutions in Sub-Saharan Africa",
            "application_url": "https://www.gatesfoundation.org/how-we-work/general-information/grant-opportunities",
            "contact_email": "agriculture@gatesfoundation.org"
        },
        {
            "title": "Climate Resilience Research Program",
            "sponsor": "African Development Bank",
            "description": "Research grants focused on climate adaptation strategies, renewable energy, and sustainable water management in African contexts.",
            "category": "Environment",
            "funding_type": "Research Grant",
            "currency": "USD",
            "amount_min": 150000,
            "amount_max": 800000,
            "deadline": "2024-10-20",
            "eligibility": "African universities and research centers",
            "application_url": "https://www.afdb.org/en/topics-and-sectors/initiatives-partnerships/climate-resilience",
            "contact_email": "climate@afdb.org"
        },
        {
            "title": "Digital Innovation for Development",
            "sponsor": "USAID",
            "description": "Supporting technology-driven solutions for development challenges including education, healthcare delivery, and financial inclusion.",
            "category": "Technology",
            "funding_type": "Innovation Grant",
            "currency": "USD",
            "amount_min": 50000,
            "amount_max": 300000,
            "deadline": "2024-08-31",
            "eligibility": "Tech startups, NGOs, and research institutions in USAID partner countries",
            "application_url": "https://www.usaid.gov/digital-development",
            "contact_email": "innovation@usaid.gov"
        },
        {
            "title": "Women in STEM Leadership Fellowship",
            "sponsor": "L'Oréal-UNESCO For Women in Science",
            "description": "Fellowships for outstanding women scientists in Africa pursuing research in life sciences, physical sciences, mathematics, or computer science.",
            "category": "STEM",
            "funding_type": "Fellowship",
            "currency": "EUR",
            "amount_min": 15000,
            "amount_max": 15000,
            "deadline": "2024-07-15",
            "eligibility": "Women scientists with PhD in African countries",
            "application_url": "https://www.forwomeninscience.com/",
            "contact_email": "fwis@unesco.org"
        },
        {
            "title": "Tuberculosis Research Initiative - East Africa",
            "sponsor": "EDCTP (European & Developing Countries Clinical Trials Partnership)",
            "description": "Clinical trials and implementation research on tuberculosis prevention, diagnosis, and treatment in East African settings.",
            "category": "Health",
            "funding_type": "Clinical Research Grant",
            "currency": "EUR",
            "amount_min": 500000,
            "amount_max": 3000000,
            "deadline": "2024-12-01",
            "eligibility": "Research consortia led by African institutions with European partners",
            "application_url": "https://www.edctp.org/call/tuberculosis-research-initiative/",
            "contact_email": "tb.research@edctp.org"
        }
    ]


# ==================== CURATION ENDPOINTS ====================

@router.patch("/{opportunity_id}/curate")
async def toggle_curation(
    opportunity_id: str,
    curate: bool = Query(..., description="True to publish, False to unpublish"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Toggle curation status (publish/unpublish to researchers)"""
    result = await db.execute(
        select(GrantOpportunity).where(GrantOpportunity.id == opportunity_id)
    )
    opportunity = result.scalar_one_or_none()
    
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    
    opportunity.is_curated = curate
    await db.commit()
    await db.refresh(opportunity)
    
    return {
        "id": opportunity.id,
        "title": opportunity.title,
        "is_curated": opportunity.is_curated,
        "message": f"Opportunity {'published' if curate else 'unpublished'} successfully"
    }


@router.post("/bulk-curate")
async def bulk_curate_opportunities(
    opportunity_ids: List[str],
    curate: bool = Query(..., description="True to publish, False to unpublish"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bulk publish/unpublish opportunities"""
    from sqlalchemy import update
    
    stmt = (
        update(GrantOpportunity)
        .where(GrantOpportunity.id.in_(opportunity_ids))
        .values(is_curated=curate)
    )
    
    result = await db.execute(stmt)
    await db.commit()
    
    return {
        "updated_count": result.rowcount,
        "is_curated": curate,
        "message": f"{result.rowcount} opportunities {'published' if curate else 'unpublished'}"
    }


# ==================== BOOKMARK ENDPOINTS ====================

@router.post("/{opportunity_id}/bookmark")
async def bookmark_opportunity(
    opportunity_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bookmark an opportunity (save for later)"""
    from models import OpportunityBookmark
    
    # Check if opportunity exists
    result = await db.execute(
        select(GrantOpportunity).where(GrantOpportunity.id == opportunity_id)
    )
    opportunity = result.scalar_one_or_none()
    
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    
    # Check if already bookmarked
    existing = await db.execute(
        select(OpportunityBookmark).where(
            OpportunityBookmark.opportunity_id == opportunity_id,
            OpportunityBookmark.user_id == current_user.id
        )
    )
    
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Opportunity already bookmarked")
    
    # Create bookmark
    bookmark = OpportunityBookmark(
        opportunity_id=opportunity_id,
        user_id=current_user.id
    )
    db.add(bookmark)
    await db.commit()
    
    return {"message": "Opportunity bookmarked successfully", "opportunity_id": opportunity_id}


@router.delete("/{opportunity_id}/bookmark")
async def remove_bookmark(
    opportunity_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove bookmark from an opportunity"""
    from models import OpportunityBookmark
    
    result = await db.execute(
        select(OpportunityBookmark).where(
            OpportunityBookmark.opportunity_id == opportunity_id,
            OpportunityBookmark.user_id == current_user.id
        )
    )
    bookmark = result.scalar_one_or_none()
    
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    
    await db.delete(bookmark)
    await db.commit()
    
    return {"message": "Bookmark removed successfully", "opportunity_id": opportunity_id}


@router.get("/bookmarks/my")
async def get_my_bookmarks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all bookmarked opportunities for current user"""
    from models import OpportunityBookmark
    
    result = await db.execute(
        select(GrantOpportunity)
        .join(OpportunityBookmark)
        .where(OpportunityBookmark.user_id == current_user.id)
        .order_by(OpportunityBookmark.created_at.desc())
    )
    
    opportunities = result.scalars().all()
    
    return [
        {
            "id": opp.id,
            "title": opp.title,
            "sponsor": opp.sponsor,
            "deadline": opp.deadline,
            "status": opp.status,
            "is_curated": opp.is_curated
        }
        for opp in opportunities
    ]
