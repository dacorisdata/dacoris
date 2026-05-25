from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from pydantic import BaseModel
from typing import Optional, List

from database import get_db
from models import (
    User, ResearchProject, UserStatus, PrimaryAccountType,
    ProjectMember, Proposal, ProposalCollaborator,
    Manuscript, ManuscriptCoAuthor,
    PublicationLibrary, Publication,
)
from auth import require_roles, ResearchRole

router = APIRouter(prefix="/api/research/directory", tags=["research-directory"])


class ResearchEngagement(BaseModel):
    id: str
    kind: str
    title: str
    role: str
    status: str
    context: Optional[str] = None


class ResearcherOut(BaseModel):
    id: str
    name: Optional[str]
    email: str
    job_title: Optional[str]
    department: Optional[str]
    orcid_id: Optional[str]
    expertise_keywords: Optional[str]
    primary_account_type: Optional[str]
    status: str
    projects_count: int = 0
    collaborations_count: int = 0
    publications_count: int = 0
    engagements: List[ResearchEngagement] = []

    class Config:
        from_attributes = True


def _enum_val(value) -> str:
    if value is None:
        return ""
    return value.value if hasattr(value, "value") else str(value)


def _role_label(raw: Optional[str], default: str) -> str:
    if not raw:
        return default
    return raw.replace("_", " ").title()


async def _load_engagements(
    db: AsyncSession,
    institution_id: str,
    users: list[User],
) -> dict[str, list[dict]]:
    if not users:
        return {}

    user_ids = [u.id for u in users]
    email_map = {u.email.lower(): u.id for u in users if u.email}
    orcid_map = {u.orcid_id: u.id for u in users if u.orcid_id}
    by_user: dict[str, list[dict]] = {uid: [] for uid in user_ids}

    def add(uid: str, item: dict) -> None:
        if uid in by_user:
            by_user[uid].append(item)

    # Projects as PI
    pi_result = await db.execute(
        select(ResearchProject).where(
            ResearchProject.institution_id == institution_id,
            ResearchProject.pi_id.in_(user_ids),
        )
    )
    for project in pi_result.scalars().all():
        add(project.pi_id, {
            "id": project.id,
            "kind": "project_pi",
            "title": project.title,
            "role": "Principal Investigator",
            "status": _enum_val(project.status),
            "context": project.project_code or project.research_area,
        })

    # Projects as team member / collaborator
    member_result = await db.execute(
        select(ProjectMember, ResearchProject)
        .join(ResearchProject, ProjectMember.project_id == ResearchProject.id)
        .where(
            ResearchProject.institution_id == institution_id,
            ProjectMember.user_id.in_(user_ids),
            ProjectMember.status.in_(["accepted", "pending"]),
        )
    )
    for member, project in member_result.all():
        if member.user_id == project.pi_id:
            continue
        add(member.user_id, {
            "id": project.id,
            "kind": "project_member",
            "title": project.title,
            "role": _role_label(member.role, "Project Collaborator"),
            "status": _enum_val(project.status),
            "context": member.status,
        })

    # Grant proposals as lead PI
    proposal_pi_result = await db.execute(
        select(Proposal).where(
            Proposal.institution_id == institution_id,
            Proposal.lead_pi_id.in_(user_ids),
        )
    )
    for proposal in proposal_pi_result.scalars().all():
        add(proposal.lead_pi_id, {
            "id": proposal.id,
            "kind": "proposal_pi",
            "title": proposal.title,
            "role": "Lead PI",
            "status": _enum_val(proposal.status),
            "context": "Grant proposal",
        })

    # Grant proposal collaborators
    collab_result = await db.execute(
        select(ProposalCollaborator, Proposal)
        .join(Proposal, ProposalCollaborator.proposal_id == Proposal.id)
        .where(
            Proposal.institution_id == institution_id,
            ProposalCollaborator.user_id.in_(user_ids),
            ProposalCollaborator.status.in_(["accepted", "pending"]),
        )
    )
    for collab, proposal in collab_result.all():
        if collab.user_id == proposal.lead_pi_id:
            continue
        add(collab.user_id, {
            "id": proposal.id,
            "kind": "proposal_collaborator",
            "title": proposal.title,
            "role": _role_label(collab.role, "Proposal Collaborator"),
            "status": _enum_val(proposal.status),
            "context": collab.status,
        })

    # Manuscripts owned
    manuscript_result = await db.execute(
        select(Manuscript).where(Manuscript.user_id.in_(user_ids))
    )
    for manuscript in manuscript_result.scalars().all():
        add(manuscript.user_id, {
            "id": manuscript.id,
            "kind": "manuscript",
            "title": manuscript.title,
            "role": "Lead Author",
            "status": manuscript.status or "draft",
            "context": manuscript.department,
        })

    # Manuscript co-authorship (matched by email or ORCID)
    coauthor_filters = []
    if email_map:
        coauthor_filters.append(func.lower(ManuscriptCoAuthor.email).in_(list(email_map.keys())))
    if orcid_map:
        coauthor_filters.append(ManuscriptCoAuthor.orcid.in_(list(orcid_map.keys())))
    if coauthor_filters:
        coauthor_result = await db.execute(
            select(ManuscriptCoAuthor, Manuscript)
            .join(Manuscript, ManuscriptCoAuthor.manuscript_id == Manuscript.id)
            .where(or_(*coauthor_filters))
        )
        for coauthor, manuscript in coauthor_result.all():
            uid = None
            if coauthor.email and coauthor.email.lower() in email_map:
                uid = email_map[coauthor.email.lower()]
            elif coauthor.orcid and coauthor.orcid in orcid_map:
                uid = orcid_map[coauthor.orcid]
            if not uid or manuscript.user_id == uid:
                continue
            add(uid, {
                "id": manuscript.id,
                "kind": "manuscript_coauthor",
                "title": manuscript.title,
                "role": _role_label(coauthor.role, "Co-Author"),
                "status": coauthor.status or "invited",
                "context": f"Manuscript · order {coauthor.author_order}",
            })

    # Publications in personal libraries
    publication_result = await db.execute(
        select(Publication, PublicationLibrary)
        .join(PublicationLibrary, Publication.library_id == PublicationLibrary.id)
        .where(PublicationLibrary.user_id.in_(user_ids))
        .order_by(Publication.year.desc().nullslast(), Publication.created_at.desc())
    )
    pub_counts: dict[str, int] = {uid: 0 for uid in user_ids}
    for publication, library in publication_result.all():
        pub_counts[library.user_id] = pub_counts.get(library.user_id, 0) + 1
        if pub_counts[library.user_id] <= 8:
            add(library.user_id, {
                "id": publication.id,
                "kind": "publication",
                "title": publication.title,
                "role": "Author",
                "status": publication.publication_type or "publication",
                "context": publication.journal or publication.source,
            })

    # Sort engagements: projects first, then proposals, manuscripts, publications
    kind_order = {
        "project_pi": 0,
        "project_member": 1,
        "proposal_pi": 2,
        "proposal_collaborator": 3,
        "manuscript": 4,
        "manuscript_coauthor": 5,
        "publication": 6,
    }
    for uid in by_user:
        by_user[uid].sort(key=lambda e: (kind_order.get(e["kind"], 99), e["title"].lower()))

    return by_user, pub_counts


@router.get("", response_model=List[ResearcherOut])
async def list_researchers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.GRANT_OFFICER,
        ResearchRole.INSTITUTIONAL_LEAD,
        ResearchRole.DATA_STEWARD,
        ResearchRole.PRINCIPAL_INVESTIGATOR,
    ]))
):
    """List institution researchers with projects, collaborations, and co-authorship activity."""
    if not current_user.primary_institution_id:
        raise HTTPException(400, "User must be associated with an institution")

    institution_id = current_user.primary_institution_id

    result = await db.execute(
        select(User)
        .where(
            User.primary_institution_id == institution_id,
            User.status.in_([UserStatus.ACTIVE, UserStatus.PENDING]),
            User.primary_account_type == PrimaryAccountType.RESEARCHER,
        )
        .order_by(User.name)
    )
    users = result.scalars().all()

    engagements_by_user, pub_counts = await _load_engagements(db, institution_id, users)

    enriched = []
    for user in users:
        engagements = engagements_by_user.get(user.id, [])
        project_ids = {
            e["id"] for e in engagements
            if e["kind"] in ("project_pi", "project_member")
        }
        collaboration_count = sum(
            1 for e in engagements
            if e["kind"] in ("project_member", "proposal_collaborator", "manuscript_coauthor")
        )

        enriched.append({
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "job_title": user.job_title,
            "department": user.department,
            "orcid_id": user.orcid_id,
            "expertise_keywords": user.expertise_keywords,
            "primary_account_type": user.primary_account_type.value if user.primary_account_type else None,
            "status": user.status.value if user.status else "active",
            "projects_count": len(project_ids),
            "collaborations_count": collaboration_count,
            "publications_count": pub_counts.get(user.id, 0),
            "engagements": engagements,
        })

    return enriched
