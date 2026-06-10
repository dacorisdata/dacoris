"""
Admin Staff Analytics Routes
Provides institutional metrics and overview data for admin staff dashboards
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import datetime, timedelta

from database import get_db
from models import (
    User, Proposal, ProposalStatus, ResearchProject, ProjectStatus,
    EthicsApplication, EthicsStatus, EthicsDocument, Award, AwardStatus,
    ProjectMilestone, ReviewerAssignment, ReviewType,
    Manuscript, ResearchOutput, DataImport, DataImportStatus,
)
from routes.auth import get_current_user
from routes.research.lakehouse_imports import (
    _PROVENANCE_PROJECT_OPTS,
    _serialize_provenance,
    _series_where,
)

router = APIRouter(prefix="/api/admin-staff", tags=["admin-staff"])

PROPOSAL_STATUS_COLORS = {
    "draft": "#64748b",
    "internal_review": "#f59e0b",
    "returned": "#f97316",
    "submitted": "#3b82f6",
    "under_review": "#0ea5e9",
    "awarded": "#10b981",
    "declined": "#ef4444",
}

PROJECT_STATUS_COLORS = {
    "draft": "#64748b",
    "proposed": "#f59e0b",
    "active": "#10b981",
    "suspended": "#ef4444",
    "completed": "#0ea5e9",
}

ETHICS_STATUS_COLORS = {
    "draft": "#64748b",
    "submitted": "#3b82f6",
    "under_review": "#0ea5e9",
    "approved": "#10b981",
    "approved_with_modifications": "#22c55e",
    "rejected": "#ef4444",
    "deferred": "#f59e0b",
}

OUTPUT_STATUS_COLORS = {
    "draft": "#64748b",
    "in_review": "#f59e0b",
    "published": "#10b981",
    "submitted": "#3b82f6",
}

DEPARTMENT_PALETTE = [
    "#16a699", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6",
    "#ef4444", "#06b6d4", "#ec4899", "#0b3c5d", "#64748b",
]

REVIEW_PROPOSAL_STATUSES = (
    ProposalStatus.SUBMITTED,
    ProposalStatus.INTERNAL_REVIEW,
    ProposalStatus.UNDER_REVIEW,
    ProposalStatus.RETURNED,
)

REVIEW_ETHICS_STATUSES = (
    EthicsStatus.SUBMITTED,
    EthicsStatus.UNDER_REVIEW,
    EthicsStatus.DEFERRED,
)


def _chart_rows(counts: dict, color_map: dict) -> list:
    return [
        {"key": k, "label": k.replace("_", " ").title(), "count": v, "color": color_map.get(k, "#64748b")}
        for k, v in sorted(counts.items(), key=lambda item: item[1], reverse=True)
        if v > 0
    ]


def _department_rows(counts: dict, limit: int = 10) -> list:
    sorted_items = sorted(counts.items(), key=lambda item: item[1], reverse=True)[:limit]
    return [
        {
            "key": name,
            "label": name,
            "count": count,
            "color": DEPARTMENT_PALETTE[i % len(DEPARTMENT_PALETTE)],
        }
        for i, (name, count) in enumerate(sorted_items)
        if count > 0 and name
    ]


def _month_labels(months_back: int = 12) -> list:
    now = datetime.now()
    labels = []
    for i in range(months_back - 1, -1, -1):
        month = now.month - i
        year = now.year
        while month <= 0:
            month += 12
            year -= 1
        labels.append(f"{year}-{month:02d}")
    return labels


def _month_key(dt: datetime) -> Optional[str]:
    if not dt:
        return None
    return f"{dt.year}-{dt.month:02d}"


async def _load_pending_submissions(db: AsyncSession, institution_id: str) -> list:
    items = []

    proposals_result = await db.execute(
        select(Proposal)
        .where(
            Proposal.institution_id == institution_id,
            Proposal.status.in_(REVIEW_PROPOSAL_STATUSES),
        )
        .order_by(Proposal.submitted_at.desc().nullslast(), Proposal.created_at.desc())
        .limit(10)
    )
    for proposal in proposals_result.scalars().all():
        status = proposal.status.value if hasattr(proposal.status, "value") else proposal.status
        items.append({
            "id": proposal.id,
            "type": "proposal",
            "type_label": "Grant Proposal",
            "title": proposal.title,
            "status": status,
            "submitted_at": proposal.submitted_at or proposal.created_at,
        })

    projects_result = await db.execute(
        select(ResearchProject)
        .where(
            ResearchProject.institution_id == institution_id,
            ResearchProject.status == ProjectStatus.PROPOSED,
        )
        .order_by(ResearchProject.created_at.desc())
        .limit(10)
    )
    for project in projects_result.scalars().all():
        status = project.status.value if hasattr(project.status, "value") else project.status
        items.append({
            "id": project.id,
            "type": "project",
            "type_label": "Project Setup",
            "title": project.title,
            "status": status,
            "submitted_at": project.created_at,
        })

    ethics_result = await db.execute(
        select(EthicsApplication)
        .where(
            EthicsApplication.institution_id == institution_id,
            EthicsApplication.status.in_(REVIEW_ETHICS_STATUSES),
            EthicsApplication.application_type != "existing_clearance",
        )
        .order_by(EthicsApplication.submitted_at.desc().nullslast(), EthicsApplication.created_at.desc())
        .limit(10)
    )
    for app in ethics_result.scalars().all():
        status = app.status.value if hasattr(app.status, "value") else app.status
        items.append({
            "id": app.id,
            "type": "ethics",
            "type_label": "Ethics Application",
            "title": app.title,
            "status": status,
            "submitted_at": app.submitted_at or app.created_at,
        })

    items.sort(
        key=lambda item: item["submitted_at"] or datetime.min,
        reverse=True,
    )
    return items[:20]


async def _load_due_tasks(db: AsyncSession, institution_id: str) -> list:
    now = datetime.now()
    horizon = now + timedelta(days=30)
    result = await db.execute(
        select(ProjectMilestone, ResearchProject)
        .join(ResearchProject, ProjectMilestone.project_id == ResearchProject.id)
        .where(
            ResearchProject.institution_id == institution_id,
            ProjectMilestone.status != "completed",
            ProjectMilestone.due_date.isnot(None),
            ProjectMilestone.due_date <= horizon,
        )
        .order_by(ProjectMilestone.due_date.asc())
        .limit(20)
    )
    tasks = []
    for milestone, project in result.all():
        due = milestone.due_date
        due_naive = due.replace(tzinfo=None) if due and due.tzinfo else due
        now_naive = now.replace(tzinfo=None) if now.tzinfo else now
        tasks.append({
            "id": milestone.id,
            "project_id": project.id,
            "project_title": project.title,
            "title": milestone.title,
            "due_date": due,
            "status": milestone.status,
            "priority": milestone.priority,
            "is_overdue": bool(due_naive and due_naive < now_naive),
        })
    return tasks


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

    pending_submissions = await _load_pending_submissions(db, institution_id)
    due_tasks = await _load_due_tasks(db, institution_id)

    projects_by_status_result = await db.execute(
        select(ResearchProject.status, func.count(ResearchProject.id))
        .where(ResearchProject.institution_id == institution_id)
        .group_by(ResearchProject.status)
    )
    projects_by_status = {
        (row[0].value if hasattr(row[0], "value") else row[0]): row[1]
        for row in projects_by_status_result
    }

    return {
        "institution_name": current_user.institution.name if current_user.institution else None,
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
        },
        "charts": {
            "proposals_by_status": _chart_rows(proposals_by_status, PROPOSAL_STATUS_COLORS),
            "projects_by_status": _chart_rows(projects_by_status, PROJECT_STATUS_COLORS),
            "submissions_by_type": [
                {"key": "proposals", "label": "Grant Proposals", "count": proposals_in_review, "color": "#16a699"},
                {"key": "projects", "label": "Project Setups", "count": proposed_projects, "color": "#3b82f6"},
                {"key": "ethics", "label": "Ethics Applications", "count": ethics_pending, "color": "#10b981"},
                {"key": "dmps", "label": "Data Management Plans", "count": dmps_pending, "color": "#0ea5e9"},
            ],
        },
        "pending_submissions": pending_submissions,
        "due_tasks": due_tasks,
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


@router.get("/analytics/reports")
async def get_institutional_reports(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Comprehensive institutional reports for leadership dashboards.
    Covers departments, projects, proposals, ethics compliance, and publications.
    """
    if not current_user.primary_institution_id:
        raise HTTPException(status_code=403, detail="User must be associated with an institution")

    institution_id = current_user.primary_institution_id
    month_labels = _month_labels(12)
    twelve_months_ago = datetime.now() - timedelta(days=365)

    # ── Department activity (projects + researchers) ───────────────────────
    dept_projects_result = await db.execute(
        select(ResearchProject.department, func.count(ResearchProject.id))
        .where(
            ResearchProject.institution_id == institution_id,
            ResearchProject.department.isnot(None),
            ResearchProject.department != "",
        )
        .group_by(ResearchProject.department)
    )
    dept_counts: dict = {}
    for dept, count in dept_projects_result:
        key = (dept or "Unassigned").strip()
        dept_counts[key] = dept_counts.get(key, 0) + count

    dept_users_result = await db.execute(
        select(User.department, func.count(User.id))
        .where(
            User.primary_institution_id == institution_id,
            User.department.isnot(None),
            User.department != "",
        )
        .group_by(User.department)
    )
    for dept, count in dept_users_result:
        key = (dept or "Unassigned").strip()
        dept_counts[key] = dept_counts.get(key, 0) + count

    # ── Proposals by status & monthly trend ──────────────────────────────────
    proposals_by_status_result = await db.execute(
        select(Proposal.status, func.count(Proposal.id))
        .where(Proposal.institution_id == institution_id)
        .group_by(Proposal.status)
    )
    proposals_by_status = {
        (row[0].value if hasattr(row[0], "value") else row[0]): row[1]
        for row in proposals_by_status_result
    }
    total_proposals = sum(proposals_by_status.values())
    awarded = proposals_by_status.get("awarded", 0)
    submitted_total = total_proposals - proposals_by_status.get("draft", 0)
    proposal_success_rate = round((awarded / submitted_total * 100), 1) if submitted_total > 0 else 0

    proposals_monthly_result = await db.execute(
        select(Proposal.created_at)
        .where(
            Proposal.institution_id == institution_id,
            Proposal.created_at >= twelve_months_ago,
        )
    )
    proposal_month_counts = {label: 0 for label in month_labels}
    for (created_at,) in proposals_monthly_result:
        key = _month_key(created_at)
        if key in proposal_month_counts:
            proposal_month_counts[key] += 1

    # ── Projects by status & key active projects ─────────────────────────────
    projects_by_status_result = await db.execute(
        select(ResearchProject.status, func.count(ResearchProject.id))
        .where(ResearchProject.institution_id == institution_id)
        .group_by(ResearchProject.status)
    )
    projects_by_status = {
        (row[0].value if hasattr(row[0], "value") else row[0]): row[1]
        for row in projects_by_status_result
    }
    total_projects = sum(projects_by_status.values())

    key_projects_result = await db.execute(
        select(ResearchProject)
        .where(
            ResearchProject.institution_id == institution_id,
            ResearchProject.status.in_([ProjectStatus.ACTIVE, ProjectStatus.PROPOSED]),
        )
        .order_by(ResearchProject.updated_at.desc().nullslast(), ResearchProject.created_at.desc())
        .limit(8)
    )
    key_projects = []
    for project in key_projects_result.scalars().all():
        status = project.status.value if hasattr(project.status, "value") else project.status
        key_projects.append({
            "id": project.id,
            "title": project.title,
            "department": project.department or "Unassigned",
            "status": status,
            "start_date": project.start_date.isoformat() if project.start_date else None,
            "end_date": project.end_date.isoformat() if project.end_date else None,
            "research_area": project.research_area,
        })

    projects_monthly_result = await db.execute(
        select(ResearchProject.created_at)
        .where(
            ResearchProject.institution_id == institution_id,
            ResearchProject.created_at >= twelve_months_ago,
        )
    )
    project_month_counts = {label: 0 for label in month_labels}
    for (created_at,) in projects_monthly_result:
        key = _month_key(created_at)
        if key in project_month_counts:
            project_month_counts[key] += 1

    # ── Ethics compliance ────────────────────────────────────────────────────
    ethics_by_status_result = await db.execute(
        select(EthicsApplication.status, func.count(EthicsApplication.id))
        .where(EthicsApplication.institution_id == institution_id)
        .group_by(EthicsApplication.status)
    )
    ethics_by_status = {
        (row[0].value if hasattr(row[0], "value") else row[0]): row[1]
        for row in ethics_by_status_result
    }
    total_ethics = sum(ethics_by_status.values())
    ethics_approved = (
        ethics_by_status.get("approved", 0)
        + ethics_by_status.get("approved_with_modifications", 0)
    )
    ethics_decided = ethics_approved + ethics_by_status.get("rejected", 0)
    ethics_approval_rate = round((ethics_approved / ethics_decided * 100), 1) if ethics_decided > 0 else 0
    ethics_pending = (
        ethics_by_status.get("submitted", 0)
        + ethics_by_status.get("under_review", 0)
        + ethics_by_status.get("deferred", 0)
    )

    ethics_monthly_result = await db.execute(
        select(EthicsApplication.created_at)
        .where(
            EthicsApplication.institution_id == institution_id,
            EthicsApplication.created_at >= twelve_months_ago,
        )
    )
    ethics_month_counts = {label: 0 for label in month_labels}
    for (created_at,) in ethics_monthly_result:
        key = _month_key(created_at)
        if key in ethics_month_counts:
            ethics_month_counts[key] += 1

    expiry_horizon = datetime.now() + timedelta(days=90)
    expiring_ethics_result = await db.execute(
        select(func.count(EthicsApplication.id))
        .where(
            EthicsApplication.institution_id == institution_id,
            EthicsApplication.status.in_([
                EthicsStatus.APPROVED,
                EthicsStatus.APPROVED_WITH_MODS,
            ]),
            EthicsApplication.approved_until.isnot(None),
            EthicsApplication.approved_until <= expiry_horizon,
        )
    )
    ethics_expiring_soon = expiring_ethics_result.scalar() or 0

    # ── Publications & manuscripts ───────────────────────────────────────────
    outputs_by_status_result = await db.execute(
        select(ResearchOutput.status, func.count(ResearchOutput.id))
        .where(ResearchOutput.institution_id == institution_id)
        .group_by(ResearchOutput.status)
    )
    outputs_by_status = {row[0]: row[1] for row in outputs_by_status_result}

    manuscripts_result = await db.execute(
        select(Manuscript.status, func.count(Manuscript.id))
        .join(User, Manuscript.user_id == User.id)
        .where(User.primary_institution_id == institution_id)
        .group_by(Manuscript.status)
    )
    manuscripts_by_status = {row[0]: row[1] for row in manuscripts_result}

    combined_publications: dict = {}
    for status, count in outputs_by_status.items():
        combined_publications[status] = combined_publications.get(status, 0) + count
    for status, count in manuscripts_by_status.items():
        combined_publications[status] = combined_publications.get(status, 0) + count

    total_publications = sum(combined_publications.values())
    published_count = combined_publications.get("published", 0)

    publications_monthly_result = await db.execute(
        select(ResearchOutput.created_at)
        .where(
            ResearchOutput.institution_id == institution_id,
            ResearchOutput.created_at >= twelve_months_ago,
        )
    )
    publication_month_counts = {label: 0 for label in month_labels}
    for (created_at,) in publications_monthly_result:
        key = _month_key(created_at)
        if key in publication_month_counts:
            publication_month_counts[key] += 1

    manuscripts_monthly_result = await db.execute(
        select(Manuscript.created_at)
        .join(User, Manuscript.user_id == User.id)
        .where(
            User.primary_institution_id == institution_id,
            Manuscript.created_at >= twelve_months_ago,
        )
    )
    for (created_at,) in manuscripts_monthly_result:
        key = _month_key(created_at)
        if key in publication_month_counts:
            publication_month_counts[key] += 1

    dept_manuscripts_result = await db.execute(
        select(Manuscript.department, func.count(Manuscript.id))
        .join(User, Manuscript.user_id == User.id)
        .where(
            User.primary_institution_id == institution_id,
            Manuscript.department.isnot(None),
            Manuscript.department != "",
        )
        .group_by(Manuscript.department)
    )
    for dept, count in dept_manuscripts_result:
        key = (dept or "Unassigned").strip()
        dept_counts[key] = dept_counts.get(key, 0) + count

    # ── Awards summary ───────────────────────────────────────────────────────
    total_awarded_amount_result = await db.execute(
        select(func.sum(Award.total_amount)).where(
            Award.proposal_id.in_(
                select(Proposal.id).where(Proposal.institution_id == institution_id)
            )
        )
    )
    total_awarded_amount = total_awarded_amount_result.scalar() or 0

    active_awards_result = await db.execute(
        select(func.count(Award.id)).where(
            and_(
                Award.status == AwardStatus.ACTIVE,
                Award.proposal_id.in_(
                    select(Proposal.id).where(Proposal.institution_id == institution_id)
                ),
            )
        )
    )
    active_awards = active_awards_result.scalar() or 0

    monthly_trend = [
        {
            "month": label,
            "label": datetime.strptime(label, "%Y-%m").strftime("%b %Y"),
            "proposals": proposal_month_counts[label],
            "projects": project_month_counts[label],
            "ethics": ethics_month_counts[label],
            "publications": publication_month_counts[label],
        }
        for label in month_labels
    ]

    portfolio_mix = [
        {"key": "proposals", "label": "Grant Proposals", "count": total_proposals, "color": "#16a699"},
        {"key": "projects", "label": "Research Projects", "count": total_projects, "color": "#3b82f6"},
        {"key": "ethics", "label": "Ethics Applications", "count": total_ethics, "color": "#10b981"},
        {"key": "publications", "label": "Publications & Manuscripts", "count": total_publications, "color": "#8b5cf6"},
    ]

    return {
        "institution_name": current_user.institution.name if current_user.institution else None,
        "generated_at": datetime.now().isoformat(),
        "summary": {
            "total_proposals": total_proposals,
            "proposal_success_rate": proposal_success_rate,
            "total_projects": total_projects,
            "active_projects": projects_by_status.get("active", 0),
            "total_ethics": total_ethics,
            "ethics_approval_rate": ethics_approval_rate,
            "ethics_pending": ethics_pending,
            "ethics_expiring_soon": ethics_expiring_soon,
            "total_publications": total_publications,
            "published_outputs": published_count,
            "active_awards": active_awards,
            "total_funding": float(total_awarded_amount) if total_awarded_amount else 0,
        },
        "departments": _department_rows(dept_counts),
        "key_projects": key_projects,
        "charts": {
            "proposals_by_status": _chart_rows(proposals_by_status, PROPOSAL_STATUS_COLORS),
            "projects_by_status": _chart_rows(projects_by_status, PROJECT_STATUS_COLORS),
            "ethics_by_status": _chart_rows(ethics_by_status, ETHICS_STATUS_COLORS),
            "publications_by_status": _chart_rows(combined_publications, OUTPUT_STATUS_COLORS),
            "portfolio_mix": [item for item in portfolio_mix if item["count"] > 0],
            "monthly_trend": monthly_trend,
        },
    }


# ─── Reviewer Management ─────────────────────────────────────────────────────

@router.get("/reviewers")
async def list_reviewers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all reviewers with their assignment statistics."""
    from sqlalchemy import text
    from sqlalchemy.orm import selectinload
    
    # Get all reviewers with their assignment counts
    result = await db.execute(
        text("""
            SELECT 
                u.id,
                u.name,
                u.email,
                u.expertise_keywords,
                u.primary_account_type,
                u.created_at,
                array_agg(DISTINCT ur.role::text) FILTER (WHERE ur.role IS NOT NULL) as roles,
                COUNT(DISTINCT CASE WHEN ra.review_type = 'proposal' THEN ra.id END) as proposal_count,
                COUNT(DISTINCT CASE WHEN ra.review_type = 'project' THEN ra.id END) as project_count,
                COUNT(DISTINCT CASE WHEN ra.review_type = 'ethics' THEN ra.id END) as ethics_count,
                COUNT(DISTINCT ra.id) as total_assignments,
                MAX(ra.assigned_at) as last_assignment_date
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN reviewer_assignments ra ON u.id = ra.reviewer_id
            WHERE u.primary_institution_id = :inst_id
              AND u.status = 'active'
              AND (ur.role IN ('external_reviewer', 'ethics_reviewer', 'grant_officer', 'ethics_chair')
                   OR u.primary_account_type IN ('EXTERNAL_REVIEWER', 'ETHICS_COMMITTEE_MEMBER'))
            GROUP BY u.id, u.name, u.email, u.expertise_keywords, u.primary_account_type, u.created_at
            ORDER BY total_assignments DESC, u.name
        """),
        {"inst_id": current_user.primary_institution_id}
    )
    
    reviewers = []
    for row in result:
        reviewers.append({
            "id": row[0],
            "name": row[1],
            "email": row[2],
            "expertise": row[3],
            "account_type": row[4],
            "joined_at": row[5].isoformat() if row[5] else None,
            "roles": row[6] if row[6] else [],
            "proposal_reviews": row[7] or 0,
            "project_reviews": row[8] or 0,
            "ethics_reviews": row[9] or 0,
            "total_reviews": row[10] or 0,
            "last_assignment": row[11].isoformat() if row[11] else None,
        })
    
    return reviewers


@router.get("/reviewers/{reviewer_id}")
async def get_reviewer_profile(
    reviewer_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed reviewer profile with assignment history."""
    from sqlalchemy.orm import selectinload
    
    # Get reviewer
    reviewer = await db.get(User, reviewer_id)
    if not reviewer or reviewer.primary_institution_id != current_user.primary_institution_id:
        raise HTTPException(404, "Reviewer not found")
    
    # Get all assignments
    result = await db.execute(
        select(ReviewerAssignment)
        .where(ReviewerAssignment.reviewer_id == reviewer_id)
        .options(selectinload(ReviewerAssignment.assigned_by))
        .order_by(ReviewerAssignment.assigned_at.desc())
    )
    assignments = result.scalars().all()
    
    # Get roles
    from sqlalchemy import text
    roles_result = await db.execute(
        text("SELECT role FROM user_roles WHERE user_id = :uid"),
        {"uid": reviewer_id}
    )
    roles = [r[0] for r in roles_result]
    
    # Group assignments by type
    proposal_assignments = []
    project_assignments = []
    ethics_assignments = []
    
    for assignment in assignments:
        assignment_data = {
            "id": assignment.id,
            "entity_id": assignment.entity_id,
            "entity_title": assignment.entity_title,
            "assigned_at": assignment.assigned_at.isoformat() if assignment.assigned_at else None,
            "assigned_by": assignment.assigned_by.name if assignment.assigned_by else None,
            "status": assignment.status.value if assignment.status else None,
            "started_at": assignment.started_at.isoformat() if assignment.started_at else None,
            "submitted_at": assignment.submitted_at.isoformat() if assignment.submitted_at else None,
            "notes": assignment.notes,
        }
        
        if assignment.review_type == ReviewType.PROPOSAL:
            proposal_assignments.append(assignment_data)
        elif assignment.review_type == ReviewType.PROJECT:
            project_assignments.append(assignment_data)
        elif assignment.review_type == ReviewType.ETHICS:
            ethics_assignments.append(assignment_data)
    
    return {
        "id": reviewer.id,
        "name": reviewer.name,
        "email": reviewer.email,
        "expertise": reviewer.expertise_keywords,
        "account_type": reviewer.primary_account_type.value if reviewer.primary_account_type else None,
        "joined_at": reviewer.created_at.isoformat() if reviewer.created_at else None,
        "roles": roles,
        "proposal_assignments": proposal_assignments,
        "project_assignments": project_assignments,
        "ethics_assignments": ethics_assignments,
        "total_assignments": len(assignments),
    }


# ─── Institutional Data Imports ──────────────────────────────────────────────

_IMPORT_LIST_OPTS = [
    selectinload(DataImport.researcher),
    selectinload(DataImport.project).selectinload(ResearchProject.award).selectinload(Award.proposal),
]


def _subject_label(project: Optional[ResearchProject]) -> str:
    if not project:
        return "—"
    parts = []
    if project.involves_human_subjects:
        parts.append("Human subjects")
    if project.involves_animal_subjects:
        parts.append("Animal subjects")
    return ", ".join(parts) if parts else "No human/animal subjects"


def _serialize_import_summary(data_import: DataImport) -> dict:
    researcher = data_import.researcher
    project = data_import.project
    proposal = project.award.proposal if project and project.award else None
    status_val = (
        data_import.ingest_status.value
        if hasattr(data_import.ingest_status, "value")
        else str(data_import.ingest_status)
    )
    source_type = (
        data_import.source_type.value
        if hasattr(data_import.source_type, "value")
        else str(data_import.source_type)
    )
    return {
        "id": data_import.id,
        "source_tag": data_import.source_tag,
        "source_type": source_type,
        "file_name": data_import.file_name,
        "file_format": data_import.file_format,
        "record_count": data_import.record_count,
        "ingest_status": status_val,
        "version_number": data_import.version_number or 1,
        "is_current_version": data_import.is_current_version,
        "created_at": data_import.created_at.isoformat() if data_import.created_at else None,
        "ingest_completed_at": (
            data_import.ingest_completed_at.isoformat() if data_import.ingest_completed_at else None
        ),
        "researcher_id": data_import.researcher_id,
        "researcher_name": researcher.name if researcher else None,
        "researcher_email": researcher.email if researcher else None,
        "project_id": data_import.project_id,
        "project_title": project.title if project else None,
        "project_status": (
            project.status.value if project and hasattr(project.status, "value") else (
                str(project.status) if project else None
            )
        ),
        "subject": _subject_label(project),
        "proposal_id": proposal.id if proposal else None,
        "proposal_title": proposal.title if proposal else None,
        "proposal_status": (
            proposal.status.value if proposal and hasattr(proposal.status, "value") else (
                str(proposal.status) if proposal else None
            )
        ),
    }


@router.get("/data-imports")
async def list_institutional_data_imports(
    status_filter: Optional[str] = Query(None, description="Comma-separated ingest statuses"),
    search: Optional[str] = Query(None, description="Search dataset, researcher, or project"),
    latest_only: bool = Query(True, description="Show only current version per dataset series"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all lakehouse data imports for the admin staff member's institution."""
    inst_id = current_user.primary_institution_id
    if not inst_id:
        raise HTTPException(403, "No institution associated with your account")

    where_clauses = [DataImport.institution_id == inst_id]

    if latest_only:
        where_clauses.append(DataImport.is_current_version == True)

    if status_filter:
        valid_statuses = []
        for s in status_filter.split(","):
            s = s.strip()
            if not s:
                continue
            try:
                valid_statuses.append(DataImportStatus[s.upper()])
            except KeyError:
                try:
                    valid_statuses.append(DataImportStatus(s))
                except ValueError:
                    pass
        if len(valid_statuses) == 1:
            where_clauses.append(DataImport.ingest_status == valid_statuses[0])
        elif valid_statuses:
            where_clauses.append(DataImport.ingest_status.in_(valid_statuses))

    if search and search.strip():
        q = f"%{search.strip()}%"
        where_clauses.append(
            or_(
                DataImport.source_tag.ilike(q),
                DataImport.file_name.ilike(q),
                DataImport.description.ilike(q),
                User.name.ilike(q),
                User.email.ilike(q),
                ResearchProject.title.ilike(q),
            )
        )

    base_filter = and_(*where_clauses)
    count_q = (
        select(func.count(DataImport.id))
        .outerjoin(User, DataImport.researcher_id == User.id)
        .outerjoin(ResearchProject, DataImport.project_id == ResearchProject.id)
        .where(base_filter)
    )
    total = (await db.execute(count_q)).scalar() or 0

    offset = (page - 1) * page_size
    list_q = (
        select(DataImport)
        .outerjoin(User, DataImport.researcher_id == User.id)
        .outerjoin(ResearchProject, DataImport.project_id == ResearchProject.id)
        .options(*_IMPORT_LIST_OPTS)
        .where(base_filter)
        .order_by(desc(DataImport.created_at))
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(list_q)
    imports = result.scalars().unique().all()

    return {
        "imports": [_serialize_import_summary(imp) for imp in imports],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/data-imports/{import_id}")
async def get_institutional_data_import(
    import_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Full import detail with project and proposal lineage for admin staff."""
    inst_id = current_user.primary_institution_id
    if not inst_id:
        raise HTTPException(403, "No institution associated with your account")

    query = (
        select(DataImport)
        .options(
            selectinload(DataImport.institution),
            selectinload(DataImport.researcher),
            selectinload(DataImport.project).options(*_PROVENANCE_PROJECT_OPTS),
        )
        .where(
            and_(
                DataImport.id == import_id,
                DataImport.institution_id == inst_id,
            )
        )
    )
    result = await db.execute(query)
    data_import = result.scalar_one_or_none()
    if not data_import:
        raise HTTPException(404, "Dataset not found")

    versions = []
    versions_q = (
        select(DataImport)
        .where(
            and_(
                _series_where(
                    data_import.researcher_id,
                    data_import.source_tag,
                    data_import.source_type,
                    data_import.project_id,
                ),
                DataImport.ingest_status == DataImportStatus.INGESTED,
            )
        )
        .order_by(desc(DataImport.version_number))
    )
    versions_result = await db.execute(versions_q)
    versions = list(versions_result.scalars().all())

    payload = _serialize_provenance(data_import, versions)
    if data_import.project:
        payload["subject"] = _subject_label(data_import.project)
    return payload
