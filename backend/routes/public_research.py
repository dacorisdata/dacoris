from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date

from database import get_db
from models import GrantOpportunity, Institution, User

router = APIRouter(prefix="/api/public/research", tags=["public-research"])


# ==================== RESPONSE MODELS ====================

class InstitutionPublic(BaseModel):
    id: int
    name: str
    domain: Optional[str]
    
    class Config:
        from_attributes = True


class FunderPublic(BaseModel):
    id: int
    name: str
    total_opportunities: int
    total_funding: Optional[float]
    currency: str


class ProjectPublic(BaseModel):
    id: int
    title: str
    description: Optional[str]
    institution_name: Optional[str]
    start_date: Optional[date]
    status: str
    funding_amount: Optional[float]
    currency: Optional[str]


class PublicationPublic(BaseModel):
    id: int
    title: str
    authors: Optional[str]
    publication_date: Optional[date]
    journal: Optional[str]
    doi: Optional[str]
    institution_name: Optional[str]


class OpportunityPublic(BaseModel):
    id: int
    title: str
    sponsor: Optional[str]
    description: Optional[str]
    category: Optional[str]
    funding_type: Optional[str]
    amount_min: Optional[float]
    amount_max: Optional[float]
    currency: str
    deadline: Optional[date]
    status: str
    
    class Config:
        from_attributes = True


class ResearchStatsPublic(BaseModel):
    total_institutions: int
    total_opportunities: int
    total_funding_value: float
    total_projects: int
    total_publications: int
    active_researchers: int


# ==================== ENDPOINTS ====================

@router.get("/stats", response_model=ResearchStatsPublic)
async def get_research_stats(db: AsyncSession = Depends(get_db)):
    """Get public research statistics - FAIR: Findable"""
    
    # Count institutions
    inst_count = await db.execute(select(func.count(Institution.id)))
    total_institutions = inst_count.scalar() or 0
    
    # Count opportunities
    opp_count = await db.execute(select(func.count(GrantOpportunity.id)))
    total_opportunities = opp_count.scalar() or 0
    
    # Sum funding
    funding_sum = await db.execute(
        select(func.sum(GrantOpportunity.amount_max)).where(
            GrantOpportunity.status == 'open'
        )
    )
    total_funding = funding_sum.scalar() or 0.0
    
    # Count active users (researchers)
    user_count = await db.execute(
        select(func.count(User.id)).where(
            and_(
                User.status == 'active',
                User.is_global_admin == False,
                User.is_institution_admin == False
            )
        )
    )
    active_researchers = user_count.scalar() or 0
    
    return {
        "total_institutions": total_institutions,
        "total_opportunities": total_opportunities,
        "total_funding_value": total_funding,
        "total_projects": 0,  # TODO: Implement when projects module is ready
        "total_publications": 0,  # TODO: Implement when publications module is ready
        "active_researchers": active_researchers
    }


@router.get("/institutions", response_model=List[InstitutionPublic])
async def list_public_institutions(
    search: Optional[str] = None,
    limit: int = Query(50, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """List all institutions - FAIR: Findable, Accessible"""
    query = select(Institution).where(Institution.is_active == True)
    
    if search:
        query = query.where(Institution.name.ilike(f'%{search}%'))
    
    query = query.order_by(Institution.name).limit(limit).offset(offset)
    result = await db.execute(query)
    institutions = result.scalars().all()
    
    return institutions


@router.get("/opportunities", response_model=List[OpportunityPublic])
async def list_public_opportunities(
    status: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """List public grant opportunities - FAIR: Findable, Accessible, Interoperable"""
    query = select(GrantOpportunity).where(GrantOpportunity.status == 'open')
    
    if status:
        query = query.where(GrantOpportunity.status == status)
    if category:
        query = query.where(GrantOpportunity.category.ilike(f'%{category}%'))
    if search:
        query = query.where(
            or_(
                GrantOpportunity.title.ilike(f'%{search}%'),
                GrantOpportunity.description.ilike(f'%{search}%'),
                GrantOpportunity.sponsor.ilike(f'%{search}%')
            )
        )
    
    query = query.order_by(GrantOpportunity.deadline.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    opportunities = result.scalars().all()
    
    return opportunities


@router.get("/funders", response_model=List[FunderPublic])
async def list_public_funders(
    limit: int = Query(20, le=50),
    db: AsyncSession = Depends(get_db)
):
    """List funders/sponsors with their statistics - FAIR: Findable, Reusable"""
    # Group by sponsor and aggregate
    query = select(
        GrantOpportunity.sponsor,
        func.count(GrantOpportunity.id).label('total_opportunities'),
        func.sum(GrantOpportunity.amount_max).label('total_funding'),
        GrantOpportunity.currency
    ).where(
        GrantOpportunity.sponsor.isnot(None)
    ).group_by(
        GrantOpportunity.sponsor,
        GrantOpportunity.currency
    ).order_by(
        func.count(GrantOpportunity.id).desc()
    ).limit(limit)
    
    result = await db.execute(query)
    funders_data = result.all()
    
    funders = []
    for idx, (sponsor, count, funding, currency) in enumerate(funders_data, 1):
        funders.append({
            "id": idx,
            "name": sponsor,
            "total_opportunities": count,
            "total_funding": funding or 0.0,
            "currency": currency or "USD"
        })
    
    return funders


@router.get("/opportunities/{opportunity_id}", response_model=OpportunityPublic)
async def get_public_opportunity(
    opportunity_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get single opportunity details - FAIR: Accessible, Interoperable"""
    result = await db.execute(
        select(GrantOpportunity).where(GrantOpportunity.id == opportunity_id)
    )
    opportunity = result.scalar_one_or_none()
    
    if not opportunity:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Opportunity not found")
    
    return opportunity


@router.get("/categories")
async def list_categories(db: AsyncSession = Depends(get_db)):
    """List all unique categories - FAIR: Findable"""
    result = await db.execute(
        select(GrantOpportunity.category)
        .where(GrantOpportunity.category.isnot(None))
        .distinct()
        .order_by(GrantOpportunity.category)
    )
    categories = [cat for (cat,) in result.all() if cat]
    return {"categories": categories}


# TODO: Add these endpoints when modules are implemented
# @router.get("/projects", response_model=List[ProjectPublic])
# @router.get("/publications", response_model=List[PublicationPublic])
# @router.get("/projects/{project_id}", response_model=ProjectPublic)
# @router.get("/publications/{publication_id}", response_model=PublicationPublic)
