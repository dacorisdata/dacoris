from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import json

from database import get_db
from models import User, Manuscript, ManuscriptCoAuthor, ManuscriptCitation, Publication, PublicationLibrary, NotificationType, NotificationPriority
from auth import get_current_user
from services.notification_service import NotificationService
from services.citation_service import (
    format_inline_citation,
    format_bibliography_entry,
    generate_bibliography,
    generate_citation_key
)

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


class CitationReorder(BaseModel):
    citation_orders: List[dict]  # [{"citation_id": "...", "order": 1}, ...]


class CreatorResponse(BaseModel):
    id: str
    name: Optional[str]
    email: str
    orcid_id: Optional[str]

    class Config:
        from_attributes = True


class ManuscriptCreate(BaseModel):
    title: str
    short_description: Optional[str] = None
    department: Optional[str] = None
    keywords: Optional[str] = None  # JSON string array
    co_authors: List[CoAuthorCreate] = []


class ManuscriptUpdate(BaseModel):
    title: Optional[str] = None
    short_description: Optional[str] = None
    department: Optional[str] = None
    keywords: Optional[str] = None
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
    created_at: datetime
    updated_at: Optional[datetime]
    creator: Optional[CreatorResponse] = None
    co_authors: List[CoAuthorResponse]
    
    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════════════════════
# MANUSCRIPT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("", response_model=ManuscriptResponse)
async def create_manuscript(
    manuscript: ManuscriptCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new manuscript with co-authors"""
    new_manuscript = Manuscript(
        title=manuscript.title,
        short_description=manuscript.short_description,
        department=manuscript.department,
        keywords=manuscript.keywords,
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
        select(Manuscript).options(
            selectinload(Manuscript.co_authors),
            selectinload(Manuscript.user)
        ).where(
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


@router.get("", response_model=List[ManuscriptResponse])
async def get_manuscripts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all manuscripts for current user"""
    result = await db.execute(
        select(Manuscript).options(
            selectinload(Manuscript.co_authors),
            selectinload(Manuscript.user)
        ).where(
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
        select(Manuscript).options(
            selectinload(Manuscript.co_authors),
            selectinload(Manuscript.user)
        ).where(
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
    
    # Update fields
    for field, value in update.dict(exclude_unset=True).items():
        setattr(manuscript, field, value)
    
    await db.commit()
    
    # Reload with co_authors eagerly loaded
    result = await db.execute(
        select(Manuscript).options(
            selectinload(Manuscript.co_authors),
            selectinload(Manuscript.user)
        ).where(
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
    max_citation = max_order_result.scalar_one_or_none()
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
