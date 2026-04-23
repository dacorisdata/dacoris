from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from database import get_db
from models import (Award, AwardStatus, BudgetLine, Proposal, ProposalStatus,
                    ResearchProject, ProjectStatus, User,
                    ProposalCollaborator, GrantOpportunity)
from auth import require_roles, ResearchRole
from services.notifications import create_notification

router = APIRouter(prefix="/api/grants/awards", tags=["awards"])


class AwardCreate(BaseModel):
    proposal_id: int
    funder_name: Optional[str] = None
    total_amount: float
    currency: str = "KES"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    conditions: Optional[str] = None


class BudgetLineCreate(BaseModel):
    category: str
    description: Optional[str] = None
    amount: float


class BudgetLineSummary(BaseModel):
    id: int
    category: str
    description: Optional[str] = None
    amount: float
    spent_to_date: float = 0

    class Config:
        from_attributes = True


class AwardOut(BaseModel):
    id: int
    award_number: str
    proposal_id: int
    funder_name: Optional[str] = None
    total_amount: float
    currency: str
    status: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    conditions: Optional[str] = None
    issued_at: datetime
    proposal_title: Optional[str] = None
    opportunity_title: Optional[str] = None
    opportunity_sponsor: Optional[str] = None
    project_id: Optional[int] = None
    budget_lines: List[BudgetLineSummary] = []

    class Config:
        from_attributes = True


def _enrich(award: Award) -> dict:
    """Serialize an Award ORM object with nested proposal + project data."""
    return {
        "id": award.id,
        "award_number": award.award_number or f"AWD-{award.id}",
        "proposal_id": award.proposal_id,
        "funder_name": award.funder_name,
        "total_amount": award.total_amount,
        "currency": award.currency,
        "status": award.status.value if hasattr(award.status, "value") else award.status,
        "start_date": award.start_date,
        "end_date": award.end_date,
        "conditions": award.conditions,
        "issued_at": award.issued_at,
        "proposal_title": award.proposal.title if award.proposal else None,
        "opportunity_title": (award.proposal.opportunity.title
                              if award.proposal and award.proposal.opportunity else None),
        "opportunity_sponsor": (award.proposal.opportunity.sponsor
                                if award.proposal and award.proposal.opportunity else None),
        "project_id": award.research_project.id if award.research_project else None,
        "budget_lines": [
            {
                "id": bl.id,
                "category": bl.category,
                "description": bl.description,
                "amount": bl.amount,
                "spent_to_date": bl.spent_to_date or 0,
            }
            for bl in (award.budget_lines or [])
        ],
    }


_AWARD_LOAD_OPTIONS = [
    selectinload(Award.proposal).selectinload(Proposal.opportunity),
    selectinload(Award.budget_lines),
    selectinload(Award.research_project),
]


@router.get("", response_model=List[AwardOut])
async def list_awards(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.GRANT_OFFICER, ResearchRole.PRINCIPAL_INVESTIGATOR,
        ResearchRole.INSTITUTIONAL_LEAD
    ]))
):
    q = select(Award).options(*_AWARD_LOAD_OPTIONS).where(
        Award.institution_id == current_user.primary_institution_id
    )
    if current_user.role == ResearchRole.PRINCIPAL_INVESTIGATOR:
        q = (
            select(Award)
            .join(Proposal, Award.proposal_id == Proposal.id)
            .where(Proposal.lead_pi_id == current_user.id)
            .options(*_AWARD_LOAD_OPTIONS)
        )
    result = await db.execute(q.order_by(Award.issued_at.desc()))
    return [_enrich(a) for a in result.scalars().all()]


@router.post("", response_model=AwardOut, status_code=201)
async def issue_award(
    data: AwardCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.GRANT_OFFICER]))
):
    proposal = await db.get(Proposal, data.proposal_id)
    if not proposal or proposal.institution_id != current_user.primary_institution_id:
        raise HTTPException(404, "Proposal not found")
    if proposal.status not in [ProposalStatus.UNDER_REVIEW, ProposalStatus.SUBMITTED]:
        raise HTTPException(400, f"Proposal in status {proposal.status} cannot be awarded")

    award = Award(
        proposal_id=data.proposal_id,
        institution_id=current_user.primary_institution_id,
        award_number=f"AWD-{datetime.now().year}-{uuid.uuid4().hex[:6].upper()}",
        issued_by_id=current_user.id,
        **data.model_dump(exclude={"proposal_id"})
    )
    db.add(award)
    await db.flush()

    proposal.status = ProposalStatus.AWARDED

    project = ResearchProject(
        institution_id=current_user.primary_institution_id,
        award_id=award.id,
        pi_id=proposal.lead_pi_id,
        title=proposal.title,
        description=f"Auto-created from award {award.award_number}",
        project_type="funded",
        status=ProjectStatus.ACTIVE,
        start_date=data.start_date,
        end_date=data.end_date,
    )
    db.add(project)

    await db.commit()
    await db.refresh(award)

    await create_notification(
        db, proposal.lead_pi_id,
        title="🎉 Award issued",
        message=f'Your proposal "{proposal.title}" has been awarded ({award.award_number}).',
        entity_type="award", entity_id=award.id
    )

    return _enrich(award)


@router.get("/{award_id}", response_model=AwardOut)
async def get_award(
    award_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.GRANT_OFFICER, ResearchRole.PRINCIPAL_INVESTIGATOR,
        ResearchRole.INSTITUTIONAL_LEAD
    ]))
):
    result = await db.execute(
        select(Award).where(Award.id == award_id).options(*_AWARD_LOAD_OPTIONS)
    )
    award = result.scalar_one_or_none()
    if not award or award.institution_id != current_user.primary_institution_id:
        raise HTTPException(404, "Award not found")
    return _enrich(award)


@router.post("/{award_id}/budget", status_code=201)
async def add_budget_lines(
    award_id: int,
    lines: List[BudgetLineCreate],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.GRANT_OFFICER]))
):
    award = await db.get(Award, award_id)
    if not award or award.institution_id != current_user.primary_institution_id:
        raise HTTPException(404, "Award not found")

    created = []
    for line_data in lines:
        line = BudgetLine(award_id=award_id, **line_data.model_dump())
        db.add(line)
        created.append(line)
    await db.commit()
    return {"created": len(created)}


@router.get("/{award_id}/budget")
async def get_budget(
    award_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.GRANT_OFFICER,
        ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.INSTITUTIONAL_LEAD
    ]))
):
    result = await db.execute(
        select(BudgetLine).where(BudgetLine.award_id == award_id)
    )
    lines = result.scalars().all()
    total_budget = sum(l.amount for l in lines)
    total_spent = sum(l.spent_to_date for l in lines)
    return {
        "award_id": award_id,
        "total_budget": total_budget,
        "total_spent": total_spent,
        "remaining": total_budget - total_spent,
        "lines": lines,
    }
