from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel, field_validator
from datetime import datetime
import json

from database import get_db
from models import User, Manuscript, ManuscriptCoAuthor, ManuscriptCitation, Publication, PublicationLibrary, NotificationType, NotificationPriority, ManuscriptComment, ManuscriptReviewer, ResearchProject, ProjectMember
from auth import get_current_user
from services.notification_service import NotificationService
from services.citation_service import (
    format_inline_citation,
    format_bibliography_entry,
    generate_bibliography,
    generate_citation_key
)
from services.collaborator_matcher import suggest_coauthors, coauthor_profile_snapshot

router = APIRouter(prefix="/api/manuscripts", tags=["manuscripts"])


# ═══════════════════════════════════════════════════════════════════════════
# PYDANTIC SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class CoAuthorCreate(BaseModel):
    given_name: str
    family_name: str
    email: Optional[str] = None
    orcid: Optional[str] = None
    author_order: int
    role: Optional[str] = 'author'


class CoAuthorResponse(BaseModel):
    id: str
    given_name: str
    family_name: str
    email: Optional[str]
    orcid: Optional[str]
    status: str
    role: str = 'author'
    author_order: int
    invited_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class CoAuthorUpdate(BaseModel):
    role: Optional[str] = None


class CitationCreate(BaseModel):
    publication_id: str
    citation_style: Optional[str] = 'APA'


class CitationResponse(BaseModel):
    id: str
    manuscript_id: str
    publication_id: str
    citation_key: str
    order: int
    citation_style: str
    created_at: datetime
    publication: Optional[dict] = None
    
    class Config:
        from_attributes = True
    
    @field_validator('publication', mode='before')
    @classmethod
    def validate_publication(cls, v):
        if v is None:
            return None
        if isinstance(v, dict):
            return v
        # Convert ORM object to dict
        if hasattr(v, '__dict__'):
            return {
                'id': str(v.id),
                'title': v.title,
                'authors': v.authors,
                'year': v.year,
                'journal': v.journal,
                'doi': v.doi
            }
        return v


class CitationReorder(BaseModel):
    citation_orders: List[dict]  # [{"citation_id": "...", "order": 1}, ...]


class CreatorResponse(BaseModel):
    id: str
    name: Optional[str]
    email: str
    orcid_id: Optional[str]

    class Config:
        from_attributes = True


class ProjectSummary(BaseModel):
    id: str
    title: str
    project_code: Optional[str] = None

    class Config:
        from_attributes = True


class ManuscriptCreate(BaseModel):
    title: str
    short_description: Optional[str] = None
    department: Optional[str] = None
    keywords: Optional[str] = None  # JSON string array
    project_id: Optional[str] = None
    co_authors: List[CoAuthorCreate] = []


class ManuscriptUpdate(BaseModel):
    title: Optional[str] = None
    short_description: Optional[str] = None
    department: Optional[str] = None
    keywords: Optional[str] = None
    project_id: Optional[str] = None
    content: Optional[str] = None
    abstract: Optional[str] = None
    status: Optional[str] = None


class ManuscriptResponse(BaseModel):
    id: str
    title: str
    short_description: Optional[str]
    department: Optional[str]
    keywords: Optional[str]
    content: Optional[str]
    abstract: Optional[str]
    status: str
    version: int
    project_id: Optional[str] = None
    project: Optional[ProjectSummary] = None
    created_at: datetime
    updated_at: Optional[datetime]
    creator: Optional[CreatorResponse] = None
    co_authors: List[CoAuthorResponse]
    
    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════════════════════
# MANUSCRIPT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

_MANUSCRIPT_OPTS = (
    selectinload(Manuscript.co_authors),
    selectinload(Manuscript.user),
    selectinload(Manuscript.project),
)


async def _validate_project_access(project_id: str, user: User, db: AsyncSession) -> ResearchProject:
    result = await db.execute(
        select(ResearchProject).where(ResearchProject.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.institution_id != user.primary_institution_id:
        raise HTTPException(status_code=403, detail="Project not in your institution")
    if project.pi_id == user.id:
        return project
    member_result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user.id,
            ProjectMember.status == "accepted",
        )
    )
    if member_result.scalar_one_or_none():
        return project
    raise HTTPException(status_code=403, detail="You don't have access to this project")

@router.post("", response_model=ManuscriptResponse)
async def create_manuscript(
    manuscript: ManuscriptCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new manuscript with co-authors"""
    if manuscript.project_id:
        await _validate_project_access(manuscript.project_id, current_user, db)

    new_manuscript = Manuscript(
        title=manuscript.title,
        short_description=manuscript.short_description,
        department=manuscript.department,
        keywords=manuscript.keywords,
        project_id=manuscript.project_id,
        user_id=current_user.id
    )
    db.add(new_manuscript)
    await db.flush()  # Get the manuscript ID
    
    # Add co-authors
    for co_author_data in manuscript.co_authors:
        co_author = ManuscriptCoAuthor(
            manuscript_id=new_manuscript.id,
            given_name=co_author_data.given_name,
            family_name=co_author_data.family_name,
            email=co_author_data.email,
            orcid=co_author_data.orcid,
            role=co_author_data.role or 'author',
            author_order=co_author_data.author_order
        )
        db.add(co_author)
    
    await db.commit()
    
    # Reload manuscript with co_authors eagerly loaded
    result = await db.execute(
        select(Manuscript).options(*_MANUSCRIPT_OPTS).where(
            Manuscript.id == new_manuscript.id
        )
    )
    new_manuscript = result.scalar_one()

    # Send in-app notifications to co-authors who have matching accounts
    for ca in new_manuscript.co_authors:
        if ca.email:
            ur = await db.execute(select(User).where(User.email == ca.email))
            invited_user = ur.scalar_one_or_none()
            if invited_user:
                await NotificationService.create_notification(
                    db=db,
                    recipient_id=invited_user.id,
                    type=NotificationType.SYSTEM_ANNOUNCEMENT,
                    title="Co-Author Invitation",
                    message=f"You have been invited as a co-author on '{new_manuscript.title}' by {new_manuscript.user.name or new_manuscript.user.email}.",
                    priority=NotificationPriority.MEDIUM,
                    action_url="/researcher/manuscripts",
                    related_entity_type="manuscript",
                    related_entity_id=new_manuscript.id,
                    expires_in_days=60
                )

    return new_manuscript


@router.get("/co-authors/suggest")
async def suggest_manuscript_coauthors(
    title: Optional[str] = Query(None, description="Manuscript title"),
    description: Optional[str] = Query(None, description="Short description / abstract"),
    keywords: Optional[str] = Query(None, description="Keywords (comma-separated or JSON array)"),
    department: Optional[str] = Query(None, description="Department or field"),
    exclude_user_ids: Optional[str] = Query(None, description="Comma-separated user IDs to exclude"),
    limit: int = Query(default=6, ge=1, le=15),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Suggest institution co-authors based on manuscript topic, specialty, and past works."""
    excluded = [x.strip() for x in (exclude_user_ids or "").split(",") if x.strip()]
    result = await suggest_coauthors(
        current_user=current_user,
        db=db,
        title=title,
        description=description,
        keywords=keywords,
        department=department,
        exclude_user_ids=excluded,
        limit=limit,
    )
    return {
        "suggestions": [
            {
                "user_id": s.user_id,
                "name": s.name,
                "email": s.email,
                "department": s.department,
                "job_title": s.job_title,
                "orcid": s.orcid,
                "expertise_keywords": s.expertise_keywords,
                "skills": s.skills,
                "research_areas": s.research_areas,
                "score": s.score,
                "reasons": s.reasons,
                "match_explanation": s.match_explanation,
            }
            for s in result["suggestions"]
        ],
        "total_candidates": result["total_candidates"],
        "ai_enhanced": result["ai_enhanced"],
        "context_summary": result["context_summary"],
    }


@router.get("/co-authors/{user_id}/profile-snapshot")
async def get_coauthor_profile_snapshot(
    user_id: str,
    title: Optional[str] = Query(None),
    description: Optional[str] = Query(None),
    keywords: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Profile snapshot for reviewing a suggested co-author before inviting."""
    if not current_user.primary_institution_id:
        raise HTTPException(400, "User must be associated with an institution")

    snapshot = await coauthor_profile_snapshot(
        user_id=user_id,
        db=db,
        title=title,
        description=description,
        keywords=keywords,
        department=department,
    )
    if not snapshot:
        raise HTTPException(404, "Researcher not found")

    target = await db.get(User, user_id)
    if target.primary_institution_id != current_user.primary_institution_id:
        raise HTTPException(403, "Researcher is not in your institution")

    return snapshot


@router.get("", response_model=List[ManuscriptResponse])
async def get_manuscripts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all manuscripts for current user"""
    result = await db.execute(
        select(Manuscript).options(*_MANUSCRIPT_OPTS).where(
            Manuscript.user_id == current_user.id
        ).order_by(Manuscript.updated_at.desc())
    )
    manuscripts = result.scalars().all()
    
    return manuscripts


@router.get("/{manuscript_id}", response_model=ManuscriptResponse)
async def get_manuscript(
    manuscript_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific manuscript"""
    result = await db.execute(
        select(Manuscript).options(*_MANUSCRIPT_OPTS).where(
            Manuscript.id == manuscript_id,
            Manuscript.user_id == current_user.id
        )
    )
    manuscript = result.scalar_one_or_none()
    
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")
    
    return manuscript


@router.patch("/{manuscript_id}", response_model=ManuscriptResponse)
async def update_manuscript(
    manuscript_id: str,
    update: ManuscriptUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a manuscript"""
    result = await db.execute(
        select(Manuscript).where(
            Manuscript.id == manuscript_id,
            Manuscript.user_id == current_user.id
        )
    )
    manuscript = result.scalar_one_or_none()
    
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")
    
    update_data = update.dict(exclude_unset=True)
    if "project_id" in update_data and update_data["project_id"]:
        await _validate_project_access(update_data["project_id"], current_user, db)

    # Update fields
    for field, value in update_data.items():
        setattr(manuscript, field, value)
    
    await db.commit()
    
    # Reload with co_authors eagerly loaded
    result = await db.execute(
        select(Manuscript).options(*_MANUSCRIPT_OPTS).where(
            Manuscript.id == manuscript_id
        )
    )
    manuscript = result.scalar_one()

    return manuscript


@router.delete("/{manuscript_id}")
async def delete_manuscript(
    manuscript_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a manuscript"""
    result = await db.execute(
        select(Manuscript).where(
            Manuscript.id == manuscript_id,
            Manuscript.user_id == current_user.id
        )
    )
    manuscript = result.scalar_one_or_none()
    
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")
    
    await db.delete(manuscript)
    await db.commit()
    
    return {"message": "Manuscript deleted successfully"}


# ═══════════════════════════════════════════════════════════════════════════
# CO-AUTHOR ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/{manuscript_id}/co-authors", response_model=CoAuthorResponse)
async def add_co_author(
    manuscript_id: str,
    co_author: CoAuthorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a co-author to a manuscript"""
    result = await db.execute(
        select(Manuscript).where(
            Manuscript.id == manuscript_id,
            Manuscript.user_id == current_user.id
        )
    )
    manuscript = result.scalar_one_or_none()
    
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")
    
    new_co_author = ManuscriptCoAuthor(
        manuscript_id=manuscript_id,
        given_name=co_author.given_name,
        family_name=co_author.family_name,
        email=co_author.email,
        orcid=co_author.orcid,
        role=co_author.role or 'author',
        author_order=co_author.author_order
    )
    db.add(new_co_author)
    await db.commit()
    await db.refresh(new_co_author)

    # Send in-app notification if invited user has an account
    if new_co_author.email:
        ur = await db.execute(select(User).where(User.email == new_co_author.email))
        invited_user = ur.scalar_one_or_none()
        if invited_user:
            ms_res = await db.execute(select(Manuscript).where(Manuscript.id == manuscript_id))
            ms = ms_res.scalar_one()
            await NotificationService.create_notification(
                db=db,
                recipient_id=invited_user.id,
                type=NotificationType.SYSTEM_ANNOUNCEMENT,
                title="Co-Author Invitation",
                message=f"You have been invited as a co-author on '{ms.title}'.",
                priority=NotificationPriority.MEDIUM,
                action_url="/researcher/manuscripts",
                related_entity_type="manuscript",
                related_entity_id=manuscript_id,
                expires_in_days=60
            )

    return new_co_author


@router.patch("/{manuscript_id}/co-authors/{co_author_id}", response_model=CoAuthorResponse)
async def update_co_author(
    manuscript_id: str,
    co_author_id: str,
    payload: CoAuthorUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a co-author's role"""
    result = await db.execute(
        select(ManuscriptCoAuthor).where(
            ManuscriptCoAuthor.id == co_author_id,
            ManuscriptCoAuthor.manuscript_id == manuscript_id
        )
    )
    co_author = result.scalar_one_or_none()
    if not co_author:
        raise HTTPException(status_code=404, detail="Co-author not found")
    if payload.role is not None:
        co_author.role = payload.role
    await db.commit()
    await db.refresh(co_author)
    return co_author


@router.delete("/{manuscript_id}/co-authors/{co_author_id}")
async def remove_co_author(
    manuscript_id: str,
    co_author_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a co-author from a manuscript"""
    result = await db.execute(
        select(Manuscript).where(
            Manuscript.id == manuscript_id,
            Manuscript.user_id == current_user.id
        )
    )
    manuscript = result.scalar_one_or_none()
    
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")
    
    co_result = await db.execute(
        select(ManuscriptCoAuthor).where(
            ManuscriptCoAuthor.id == co_author_id,
            ManuscriptCoAuthor.manuscript_id == manuscript_id
        )
    )
    co_author = co_result.scalar_one_or_none()
    
    if not co_author:
        raise HTTPException(status_code=404, detail="Co-author not found")
    
    await db.delete(co_author)
    await db.commit()
    
    return {"message": "Co-author removed successfully"}


# ═══════════════════════════════════════════════════════════════════════════
# CITATION ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/{manuscript_id}/citations", response_model=CitationResponse)
async def add_citation(
    manuscript_id: str,
    citation: CitationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a citation to a manuscript"""
    # Verify manuscript belongs to user
    result = await db.execute(
        select(Manuscript).where(
            Manuscript.id == manuscript_id,
            Manuscript.user_id == current_user.id
        )
    )
    manuscript = result.scalar_one_or_none()
    
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")
    
    # Verify publication exists and belongs to user
    pub_result = await db.execute(
        select(Publication).join(PublicationLibrary).where(
            Publication.id == citation.publication_id,
            PublicationLibrary.user_id == current_user.id
        )
    )
    publication = pub_result.scalar_one_or_none()
    
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")
    
    # Check if citation already exists
    existing = await db.execute(
        select(ManuscriptCitation).where(
            ManuscriptCitation.manuscript_id == manuscript_id,
            ManuscriptCitation.publication_id == citation.publication_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Citation already exists")
    
    # Get existing citation keys to avoid duplicates
    existing_citations = await db.execute(
        select(ManuscriptCitation).where(
            ManuscriptCitation.manuscript_id == manuscript_id
        )
    )
    existing_keys = [c.citation_key for c in existing_citations.scalars().all()]
    
    # Generate unique citation key
    citation_key = generate_citation_key(
        publication.authors or "Unknown",
        publication.year or 0,
        existing_keys
    )
    
    # Get next order number
    max_order_result = await db.execute(
        select(ManuscriptCitation).where(
            ManuscriptCitation.manuscript_id == manuscript_id
        ).order_by(ManuscriptCitation.order.desc())
    )
    max_citation = max_order_result.scalars().first()
    next_order = (max_citation.order + 1) if max_citation else 1
    
    # Create citation
    new_citation = ManuscriptCitation(
        manuscript_id=manuscript_id,
        publication_id=citation.publication_id,
        citation_key=citation_key,
        order=next_order,
        citation_style=citation.citation_style or 'APA'
    )
    db.add(new_citation)
    await db.commit()
    await db.refresh(new_citation)
    
    # Attach publication data
    response = CitationResponse.from_orm(new_citation)
    response.publication = {
        'id': publication.id,
        'title': publication.title,
        'authors': publication.authors,
        'year': publication.year,
        'journal': publication.journal,
        'doi': publication.doi
    }
    
    return response


@router.get("/{manuscript_id}/citations", response_model=List[CitationResponse])
async def get_citations(
    manuscript_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all citations for a manuscript"""
    # Verify manuscript belongs to user
    result = await db.execute(
        select(Manuscript).where(
            Manuscript.id == manuscript_id,
            Manuscript.user_id == current_user.id
        )
    )
    manuscript = result.scalar_one_or_none()
    
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")
    
    # Get citations with publications
    citations_result = await db.execute(
        select(ManuscriptCitation).where(
            ManuscriptCitation.manuscript_id == manuscript_id
        ).order_by(ManuscriptCitation.order)
    )
    citations = citations_result.scalars().all()
    
    # Fetch publications
    responses = []
    for citation in citations:
        pub_result = await db.execute(
            select(Publication).where(Publication.id == citation.publication_id)
        )
        publication = pub_result.scalar_one_or_none()
        
        response = CitationResponse.from_orm(citation)
        if publication:
            response.publication = {
                'id': publication.id,
                'title': publication.title,
                'authors': publication.authors,
                'year': publication.year,
                'journal': publication.journal,
                'doi': publication.doi
            }
        responses.append(response)
    
    return responses


@router.delete("/{manuscript_id}/citations/{citation_id}")
async def delete_citation(
    manuscript_id: str,
    citation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a citation from a manuscript"""
    # Verify manuscript belongs to user
    result = await db.execute(
        select(Manuscript).where(
            Manuscript.id == manuscript_id,
            Manuscript.user_id == current_user.id
        )
    )
    manuscript = result.scalar_one_or_none()
    
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")
    
    # Get citation
    citation_result = await db.execute(
        select(ManuscriptCitation).where(
            ManuscriptCitation.id == citation_id,
            ManuscriptCitation.manuscript_id == manuscript_id
        )
    )
    citation = citation_result.scalar_one_or_none()
    
    if not citation:
        raise HTTPException(status_code=404, detail="Citation not found")
    
    await db.delete(citation)
    await db.commit()
    
    return {"message": "Citation deleted successfully"}


@router.patch("/{manuscript_id}/citations/reorder")
async def reorder_citations(
    manuscript_id: str,
    reorder: CitationReorder,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reorder citations in a manuscript"""
    # Verify manuscript belongs to user
    result = await db.execute(
        select(Manuscript).where(
            Manuscript.id == manuscript_id,
            Manuscript.user_id == current_user.id
        )
    )
    manuscript = result.scalar_one_or_none()
    
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")
    
    # Update citation orders
    for item in reorder.citation_orders:
        citation_id = item.get('citation_id')
        new_order = item.get('order')
        
        if citation_id and new_order is not None:
            await db.execute(
                update(ManuscriptCitation)
                .where(
                    ManuscriptCitation.id == citation_id,
                    ManuscriptCitation.manuscript_id == manuscript_id
                )
                .values(order=new_order)
            )
    
    await db.commit()
    
    return {"message": "Citations reordered successfully"}


@router.get("/{manuscript_id}/bibliography")
async def get_bibliography(
    manuscript_id: str,
    style: Optional[str] = 'APA',
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate formatted bibliography for a manuscript"""
    # Verify manuscript belongs to user
    result = await db.execute(
        select(Manuscript).where(
            Manuscript.id == manuscript_id,
            Manuscript.user_id == current_user.id
        )
    )
    manuscript = result.scalar_one_or_none()
    
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")
    
    # Get citations with publications
    citations_result = await db.execute(
        select(ManuscriptCitation).where(
            ManuscriptCitation.manuscript_id == manuscript_id
        ).order_by(ManuscriptCitation.order)
    )
    citations = citations_result.scalars().all()
    
    # Build citation data with publications
    citation_data = []
    for citation in citations:
        pub_result = await db.execute(
            select(Publication).where(Publication.id == citation.publication_id)
        )
        publication = pub_result.scalar_one_or_none()
        
        if publication:
            citation_data.append({
                'order': citation.order,
                'citation_key': citation.citation_key,
                'publication': {
                    'title': publication.title,
                    'authors': publication.authors,
                    'year': publication.year,
                    'journal': publication.journal,
                    'doi': publication.doi
                }
            })
    
    # Generate bibliography HTML
    bibliography_html = generate_bibliography(citation_data, style or 'APA')
    
    return {
        'html': bibliography_html,
        'style': style,
        'citation_count': len(citation_data)
    }


# ═══════════════════════════════════════════════════════════════════════════
# COMMENT SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class UserBasic(BaseModel):
    id: str
    name: Optional[str]
    email: str
    
    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    content: str
    quoted_text: Optional[str] = None
    selection_start: Optional[int] = None
    selection_end: Optional[int] = None
    parent_comment_id: Optional[str] = None


class CommentUpdate(BaseModel):
    content: Optional[str] = None
    is_resolved: Optional[bool] = None


class CommentResponse(BaseModel):
    id: str
    manuscript_id: str
    user_id: str
    parent_comment_id: Optional[str]
    content: str
    quoted_text: Optional[str]
    selection_start: Optional[int]
    selection_end: Optional[int]
    is_resolved: bool
    resolved_by_id: Optional[str]
    resolved_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]
    user: UserBasic
    replies_count: int = 0
    
    class Config:
        from_attributes = True


class ReviewerCreate(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None
    name: str


class ReviewerResponse(BaseModel):
    id: str
    manuscript_id: str
    user_id: Optional[str]
    email: Optional[str]
    name: str
    status: str
    invited_at: datetime
    responded_at: Optional[datetime]
    
    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════════════════════
# COMMENT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

async def check_manuscript_access(manuscript_id: str, user: User, db: AsyncSession):
    """Check if user has access to manuscript (owner, co-author, or reviewer)"""
    result = await db.execute(
        select(Manuscript).options(
            selectinload(Manuscript.co_authors),
            selectinload(Manuscript.reviewers)
        ).where(Manuscript.id == manuscript_id)
    )
    manuscript = result.scalar_one_or_none()
    
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")
    
    # Check if user is owner
    if manuscript.user_id == user.id:
        return manuscript
    
    # Check if user is co-author
    for co_author in manuscript.co_authors:
        if co_author.email == user.email:
            return manuscript
    
    # Check if user is reviewer
    for reviewer in manuscript.reviewers:
        if reviewer.user_id == user.id or reviewer.email == user.email:
            return manuscript
    
    raise HTTPException(status_code=403, detail="You don't have access to this manuscript")


@router.post("/{manuscript_id}/comments", response_model=CommentResponse)
async def create_comment(
    manuscript_id: str,
    comment_data: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new comment on a manuscript"""
    # Check access
    manuscript = await check_manuscript_access(manuscript_id, current_user, db)
    
    # If parent_comment_id is provided, verify it exists
    if comment_data.parent_comment_id:
        parent_result = await db.execute(
            select(ManuscriptComment).where(
                ManuscriptComment.id == comment_data.parent_comment_id,
                ManuscriptComment.manuscript_id == manuscript_id
            )
        )
        if not parent_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Parent comment not found")
    
    # Create comment
    comment = ManuscriptComment(
        manuscript_id=manuscript_id,
        user_id=current_user.id,
        content=comment_data.content,
        quoted_text=comment_data.quoted_text,
        selection_start=comment_data.selection_start,
        selection_end=comment_data.selection_end,
        parent_comment_id=comment_data.parent_comment_id
    )
    
    db.add(comment)
    await db.commit()
    
    # Reload with user relationship
    result = await db.execute(
        select(ManuscriptComment).options(
            selectinload(ManuscriptComment.user)
        ).where(ManuscriptComment.id == comment.id)
    )
    comment = result.scalar_one()
    
    # Count replies
    replies_result = await db.execute(
        select(ManuscriptComment).where(
            ManuscriptComment.parent_comment_id == comment.id
        )
    )
    replies_count = len(replies_result.scalars().all())
    
    # Send notification if it's a reply
    if comment_data.parent_comment_id:
        parent_result = await db.execute(
            select(ManuscriptComment).where(
                ManuscriptComment.id == comment_data.parent_comment_id
            )
        )
        parent_comment = parent_result.scalar_one()
        
        if parent_comment.user_id != current_user.id:
            notification_service = NotificationService(db)
            await notification_service.create_notification(
                user_id=parent_comment.user_id,
                type=NotificationType.COMMENT_ADDED,
                priority=NotificationPriority.MEDIUM,
                title="New reply to your comment",
                message=f"{current_user.name or current_user.email} replied to your comment on {manuscript.title}",
                link=f"/researcher/manuscripts/{manuscript_id}/editor"
            )
    
    return CommentResponse(
        id=comment.id,
        manuscript_id=comment.manuscript_id,
        user_id=comment.user_id,
        parent_comment_id=comment.parent_comment_id,
        content=comment.content,
        quoted_text=comment.quoted_text,
        selection_start=comment.selection_start,
        selection_end=comment.selection_end,
        is_resolved=comment.is_resolved,
        resolved_by_id=comment.resolved_by_id,
        resolved_at=comment.resolved_at,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        user=UserBasic(
            id=comment.user.id,
            name=comment.user.name,
            email=comment.user.email
        ),
        replies_count=replies_count
    )


@router.get("/{manuscript_id}/comments", response_model=List[CommentResponse])
async def get_comments(
    manuscript_id: str,
    resolved: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all comments for a manuscript"""
    # Check access
    await check_manuscript_access(manuscript_id, current_user, db)
    
    # Build query
    query = select(ManuscriptComment).options(
        selectinload(ManuscriptComment.user)
    ).where(ManuscriptComment.manuscript_id == manuscript_id)
    
    if resolved is not None:
        query = query.where(ManuscriptComment.is_resolved == resolved)
    
    result = await db.execute(query.order_by(ManuscriptComment.created_at))
    comments = result.scalars().all()
    
    # Count replies for each comment
    response_comments = []
    for comment in comments:
        replies_result = await db.execute(
            select(ManuscriptComment).where(
                ManuscriptComment.parent_comment_id == comment.id
            )
        )
        replies_count = len(replies_result.scalars().all())
        
        response_comments.append(CommentResponse(
            id=comment.id,
            manuscript_id=comment.manuscript_id,
            user_id=comment.user_id,
            parent_comment_id=comment.parent_comment_id,
            content=comment.content,
            quoted_text=comment.quoted_text,
            selection_start=comment.selection_start,
            selection_end=comment.selection_end,
            is_resolved=comment.is_resolved,
            resolved_by_id=comment.resolved_by_id,
            resolved_at=comment.resolved_at,
            created_at=comment.created_at,
            updated_at=comment.updated_at,
            user=UserBasic(
                id=comment.user.id,
                name=comment.user.name,
                email=comment.user.email
            ),
            replies_count=replies_count
        ))
    
    return response_comments


@router.patch("/{manuscript_id}/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(
    manuscript_id: str,
    comment_id: str,
    update_data: CommentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a comment"""
    # Check access
    await check_manuscript_access(manuscript_id, current_user, db)
    
    # Get comment
    result = await db.execute(
        select(ManuscriptComment).options(
            selectinload(ManuscriptComment.user)
        ).where(
            ManuscriptComment.id == comment_id,
            ManuscriptComment.manuscript_id == manuscript_id
        )
    )
    comment = result.scalar_one_or_none()
    
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Only comment author can update content
    if update_data.content is not None and comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own comments")
    
    # Update fields
    if update_data.content is not None:
        comment.content = update_data.content
    
    if update_data.is_resolved is not None:
        comment.is_resolved = update_data.is_resolved
        if update_data.is_resolved:
            comment.resolved_by_id = current_user.id
            comment.resolved_at = datetime.utcnow()
        else:
            comment.resolved_by_id = None
            comment.resolved_at = None
    
    await db.commit()
    await db.refresh(comment)
    
    # Count replies
    replies_result = await db.execute(
        select(ManuscriptComment).where(
            ManuscriptComment.parent_comment_id == comment.id
        )
    )
    replies_count = len(replies_result.scalars().all())
    
    return CommentResponse(
        id=comment.id,
        manuscript_id=comment.manuscript_id,
        user_id=comment.user_id,
        parent_comment_id=comment.parent_comment_id,
        content=comment.content,
        quoted_text=comment.quoted_text,
        selection_start=comment.selection_start,
        selection_end=comment.selection_end,
        is_resolved=comment.is_resolved,
        resolved_by_id=comment.resolved_by_id,
        resolved_at=comment.resolved_at,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        user=UserBasic(
            id=comment.user.id,
            name=comment.user.name,
            email=comment.user.email
        ),
        replies_count=replies_count
    )


@router.delete("/{manuscript_id}/comments/{comment_id}")
async def delete_comment(
    manuscript_id: str,
    comment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a comment"""
    # Check access
    manuscript = await check_manuscript_access(manuscript_id, current_user, db)
    
    # Get comment
    result = await db.execute(
        select(ManuscriptComment).where(
            ManuscriptComment.id == comment_id,
            ManuscriptComment.manuscript_id == manuscript_id
        )
    )
    comment = result.scalar_one_or_none()
    
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Only comment author or manuscript owner can delete
    if comment.user_id != current_user.id and manuscript.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own comments or comments on your manuscript")
    
    await db.delete(comment)
    await db.commit()
    
    return {"message": "Comment deleted successfully"}


@router.post("/{manuscript_id}/comments/{comment_id}/resolve")
async def toggle_resolve_comment(
    manuscript_id: str,
    comment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Toggle resolve status of a comment"""
    # Check access
    await check_manuscript_access(manuscript_id, current_user, db)
    
    # Get comment
    result = await db.execute(
        select(ManuscriptComment).where(
            ManuscriptComment.id == comment_id,
            ManuscriptComment.manuscript_id == manuscript_id
        )
    )
    comment = result.scalar_one_or_none()
    
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Toggle resolution
    comment.is_resolved = not comment.is_resolved
    if comment.is_resolved:
        comment.resolved_by_id = current_user.id
        comment.resolved_at = datetime.utcnow()
    else:
        comment.resolved_by_id = None
        comment.resolved_at = None
    
    await db.commit()
    
    return {
        "message": "Comment resolved" if comment.is_resolved else "Comment reopened",
        "is_resolved": comment.is_resolved
    }


# ═══════════════════════════════════════════════════════════════════════════
# REVIEWER ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/{manuscript_id}/reviewers", response_model=ReviewerResponse)
async def invite_reviewer(
    manuscript_id: str,
    reviewer_data: ReviewerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Invite a reviewer to a manuscript"""
    # Get manuscript and check ownership
    result = await db.execute(
        select(Manuscript).where(
            Manuscript.id == manuscript_id,
            Manuscript.user_id == current_user.id
        )
    )
    manuscript = result.scalar_one_or_none()
    
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found or you don't have permission")
    
    # Create reviewer
    reviewer = ManuscriptReviewer(
        manuscript_id=manuscript_id,
        user_id=reviewer_data.user_id,
        email=reviewer_data.email,
        name=reviewer_data.name
    )
    
    db.add(reviewer)
    await db.commit()
    await db.refresh(reviewer)
    
    return ReviewerResponse(
        id=reviewer.id,
        manuscript_id=reviewer.manuscript_id,
        user_id=reviewer.user_id,
        email=reviewer.email,
        name=reviewer.name,
        status=reviewer.status,
        invited_at=reviewer.invited_at,
        responded_at=reviewer.responded_at
    )


@router.get("/{manuscript_id}/reviewers", response_model=List[ReviewerResponse])
async def get_reviewers(
    manuscript_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all reviewers for a manuscript"""
    # Check access
    await check_manuscript_access(manuscript_id, current_user, db)
    
    result = await db.execute(
        select(ManuscriptReviewer).where(
            ManuscriptReviewer.manuscript_id == manuscript_id
        )
    )
    reviewers = result.scalars().all()
    
    return [ReviewerResponse(
        id=r.id,
        manuscript_id=r.manuscript_id,
        user_id=r.user_id,
        email=r.email,
        name=r.name,
        status=r.status,
        invited_at=r.invited_at,
        responded_at=r.responded_at
    ) for r in reviewers]


@router.delete("/{manuscript_id}/reviewers/{reviewer_id}")
async def remove_reviewer(
    manuscript_id: str,
    reviewer_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a reviewer from a manuscript"""
    # Get manuscript and check ownership
    result = await db.execute(
        select(Manuscript).where(
            Manuscript.id == manuscript_id,
            Manuscript.user_id == current_user.id
        )
    )
    manuscript = result.scalar_one_or_none()
    
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found or you don't have permission")
    
    # Get reviewer
    result = await db.execute(
        select(ManuscriptReviewer).where(
            ManuscriptReviewer.id == reviewer_id,
            ManuscriptReviewer.manuscript_id == manuscript_id
        )
    )
    reviewer = result.scalar_one_or_none()
    
    if not reviewer:
        raise HTTPException(status_code=404, detail="Reviewer not found")
    
    await db.delete(reviewer)
    await db.commit()
    
    return {"message": "Reviewer removed successfully"}
