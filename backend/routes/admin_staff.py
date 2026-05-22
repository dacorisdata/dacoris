"""
Admin Staff Analytics Routes
Provides institutional metrics and overview data for admin staff dashboards
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from typing import Optional
from datetime import datetime, timedelta

from database import get_db
from models import (
    User, Proposal, ProposalStatus, ResearchProject, ProjectStatus,
    EthicsApplication, EthicsStatus, EthicsDocument, Award, AwardStatus
)
from routes.auth import get_current_user

router = APIRouter(prefix="/api/admin-staff", tags=["admin-staff"])


@router.get("/analytics/overview")
async def get_institutional_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive institutional metrics for the admin staff overview dashboard
    Returns stats on proposals, projects, submissions for review, and success rates
    """
    
    # Check user has an institution
    if not current_user.primary_institution_id:
        raise HTTPException(status_code=403, detail="User must be associated with an institution")
    
    institution_id = current_user.primary_institution_id
    
    # ============ PROPOSAL METRICS ============
    # Total proposals
    total_proposals_result = await db.execute(
        select(func.count(Proposal.id)).where(
            Proposal.institution_id == institution_id
        )
    )
    total_proposals = total_proposals_result.scalar() or 0
    
    # Proposals by status
    proposals_by_status_result = await db.execute(
        select(
            Proposal.status,
            func.count(Proposal.id)
        ).where(
            Proposal.institution_id == institution_id
        ).group_by(Proposal.status)
    )
    proposals_by_status = {row[0].value: row[1] for row in proposals_by_status_result}
    
    # Draft proposals
    draft_proposals = proposals_by_status.get('draft', 0)
    
    # Proposals in review (internal_review, submitted, under_review)
    proposals_in_review = (
        proposals_by_status.get('internal_review', 0) +
        proposals_by_status.get('submitted', 0) +
        proposals_by_status.get('under_review', 0)
    )
    
    # Awarded proposals
    awarded_proposals = proposals_by_status.get('awarded', 0)
    
    # Declined proposals
    declined_proposals = proposals_by_status.get('declined', 0)
    
    # Calculate success rate (awarded / submitted proposals)
    submitted_proposals = total_proposals - draft_proposals
    success_rate = (awarded_proposals / submitted_proposals * 100) if submitted_proposals > 0 else 0
    
    # ============ PROJECT METRICS ============
    # Total projects
    total_projects_result = await db.execute(
        select(func.count(ResearchProject.id)).where(
            ResearchProject.institution_id == institution_id
        )
    )
    total_projects = total_projects_result.scalar() or 0
    
    # Active projects
    active_projects_result = await db.execute(
        select(func.count(ResearchProject.id)).where(
            and_(
                ResearchProject.institution_id == institution_id,
                ResearchProject.status == ProjectStatus.ACTIVE
            )
        )
    )
    active_projects = active_projects_result.scalar() or 0
    
    # Proposed projects (pending approval)
    proposed_projects_result = await db.execute(
        select(func.count(ResearchProject.id)).where(
            and_(
                ResearchProject.institution_id == institution_id,
                ResearchProject.status == ProjectStatus.PROPOSED
            )
        )
    )
    proposed_projects = proposed_projects_result.scalar() or 0
    
    # Completed projects
    completed_projects_result = await db.execute(
        select(func.count(ResearchProject.id)).where(
            and_(
                ResearchProject.institution_id == institution_id,
                ResearchProject.status == ProjectStatus.COMPLETED
            )
        )
    )
    completed_projects = completed_projects_result.scalar() or 0
    
    # ============ ETHICS APPLICATIONS METRICS ============
    # Total ethics applications
    total_ethics_result = await db.execute(
        select(func.count(EthicsApplication.id)).where(
            EthicsApplication.institution_id == institution_id
        )
    )
    total_ethics = total_ethics_result.scalar() or 0
    
    # Ethics applications pending review
    ethics_pending_result = await db.execute(
        select(func.count(EthicsApplication.id)).where(
            and_(
                EthicsApplication.institution_id == institution_id,
                or_(
                    EthicsApplication.status == EthicsStatus.SUBMITTED,
                    EthicsApplication.status == EthicsStatus.UNDER_REVIEW
                )
            )
        )
    )
    ethics_pending = ethics_pending_result.scalar() or 0
    
    # Approved ethics applications
    ethics_approved_result = await db.execute(
        select(func.count(EthicsApplication.id)).where(
            and_(
                EthicsApplication.institution_id == institution_id,
                or_(
                    EthicsApplication.status == EthicsStatus.APPROVED,
                    EthicsApplication.status == EthicsStatus.APPROVED_WITH_MODS
                )
            )
        )
    )
    ethics_approved = ethics_approved_result.scalar() or 0
    
    # ============ DATA MANAGEMENT PLANS ============
    # Count DMPs as ethics documents with type 'data_management_plan'
    dmps_result = await db.execute(
        select(func.count(EthicsDocument.id)).where(
            and_(
                EthicsDocument.document_type == 'data_management_plan',
                EthicsDocument.ethics_application_id.in_(
                    select(EthicsApplication.id).where(
                        EthicsApplication.institution_id == institution_id
                    )
                )
            )
        )
    )
    total_dmps = dmps_result.scalar() or 0
    
    # Pending DMP reviews (associated with pending ethics applications)
    dmps_pending_result = await db.execute(
        select(func.count(EthicsDocument.id)).where(
            and_(
                EthicsDocument.document_type == 'data_management_plan',
                EthicsDocument.ethics_application_id.in_(
                    select(EthicsApplication.id).where(
                        and_(
                            EthicsApplication.institution_id == institution_id,
                            or_(
                                EthicsApplication.status == EthicsStatus.SUBMITTED,
                                EthicsApplication.status == EthicsStatus.UNDER_REVIEW
                            )
                        )
                    )
                )
            )
        )
    )
    dmps_pending = dmps_pending_result.scalar() or 0
    
    # ============ AWARDS & FUNDING ============
    # Total awards
    awards_result = await db.execute(
        select(func.count(Award.id)).where(
            Award.proposal_id.in_(
                select(Proposal.id).where(
                    Proposal.institution_id == institution_id
                )
            )
        )
    )
    total_awards = awards_result.scalar() or 0
    
    # Active awards
    active_awards_result = await db.execute(
        select(func.count(Award.id)).where(
            and_(
                Award.status == AwardStatus.ACTIVE,
                Award.proposal_id.in_(
                    select(Proposal.id).where(
                        Proposal.institution_id == institution_id
                    )
                )
            )
        )
    )
    active_awards = active_awards_result.scalar() or 0
    
    # Total awarded amount
    total_awarded_amount_result = await db.execute(
        select(func.sum(Award.total_amount)).where(
            Award.proposal_id.in_(
                select(Proposal.id).where(
                    Proposal.institution_id == institution_id
                )
            )
        )
    )
    total_awarded_amount = total_awarded_amount_result.scalar() or 0
    
    # ============ SUBMISSIONS FOR REVIEW ============
    total_submissions_for_review = (
        proposals_in_review +
        proposed_projects +
        ethics_pending +
        dmps_pending
    )
    
    # ============ RECENT ACTIVITY (Last 30 days) ============
    thirty_days_ago = datetime.now() - timedelta(days=30)
    
    # Recent proposals
    recent_proposals_result = await db.execute(
        select(func.count(Proposal.id)).where(
            and_(
                Proposal.institution_id == institution_id,
                Proposal.created_at >= thirty_days_ago
            )
        )
    )
    recent_proposals = recent_proposals_result.scalar() or 0
    
    # Recent projects
    recent_projects_result = await db.execute(
        select(func.count(ResearchProject.id)).where(
            and_(
                ResearchProject.institution_id == institution_id,
                ResearchProject.created_at >= thirty_days_ago
            )
        )
    )
    recent_projects = recent_projects_result.scalar() or 0
    
    # Recent ethics applications
    recent_ethics_result = await db.execute(
        select(func.count(EthicsApplication.id)).where(
            and_(
                EthicsApplication.institution_id == institution_id,
                EthicsApplication.created_at >= thirty_days_ago
            )
        )
    )
    recent_ethics = recent_ethics_result.scalar() or 0
    
    return {
        "proposals": {
            "total": total_proposals,
            "draft": draft_proposals,
            "in_review": proposals_in_review,
            "awarded": awarded_proposals,
            "declined": declined_proposals,
            "success_rate": round(success_rate, 2),
            "by_status": proposals_by_status
        },
        "projects": {
            "total": total_projects,
            "active": active_projects,
            "proposed": proposed_projects,
            "completed": completed_projects
        },
        "ethics": {
            "total": total_ethics,
            "pending_review": ethics_pending,
            "approved": ethics_approved
        },
        "dmps": {
            "total": total_dmps,
            "pending_review": dmps_pending
        },
        "awards": {
            "total": total_awards,
            "active": active_awards,
            "total_amount": float(total_awarded_amount) if total_awarded_amount else 0
        },
        "submissions_for_review": {
            "total": total_submissions_for_review,
            "proposals": proposals_in_review,
            "projects": proposed_projects,
            "ethics": ethics_pending,
            "dmps": dmps_pending
        },
        "recent_activity": {
            "proposals": recent_proposals,
            "projects": recent_projects,
            "ethics": recent_ethics
        }
    }


@router.get("/analytics/proposals")
async def get_proposal_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed proposal analytics with breakdown by status and time periods"""
    
    if not current_user.primary_institution_id:
        raise HTTPException(status_code=403, detail="User must be associated with an institution")
    
    institution_id = current_user.primary_institution_id
    
    # Get all proposals with lead PI info
    proposals_result = await db.execute(
        select(Proposal).where(
            Proposal.institution_id == institution_id
        ).order_by(Proposal.created_at.desc()).limit(50)
    )
    proposals = proposals_result.scalars().all()
    
    return {
        "recent_proposals": [
            {
                "id": p.id,
                "title": p.title,
                "status": p.status.value,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "submitted_at": p.submitted_at.isoformat() if p.submitted_at else None,
                "lead_pi_id": p.lead_pi_id
            }
            for p in proposals
        ]
    }


@router.get("/analytics/projects")
async def get_project_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed project analytics"""
    
    if not current_user.primary_institution_id:
        raise HTTPException(status_code=403, detail="User must be associated with an institution")
    
    institution_id = current_user.primary_institution_id
    
    # Get recent projects
    projects_result = await db.execute(
        select(ResearchProject).where(
            ResearchProject.institution_id == institution_id
        ).order_by(ResearchProject.created_at.desc()).limit(50)
    )
    projects = projects_result.scalars().all()
    
    return {
        "recent_projects": [
            {
                "id": p.id,
                "title": p.title,
                "status": p.status.value,
                "start_date": p.start_date.isoformat() if p.start_date else None,
                "end_date": p.end_date.isoformat() if p.end_date else None,
                "pi_id": p.pi_id
            }
            for p in projects
        ]
    }
