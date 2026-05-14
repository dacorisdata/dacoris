from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import json

from database import get_db
from models import User, Manuscript, ManuscriptCoAuthor
from auth import get_current_user

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


class CoAuthorResponse(BaseModel):
    id: int
    given_name: str
    family_name: str
    email: Optional[str]
    orcid: Optional[str]
    status: str
    author_order: int
    invited_at: datetime
    
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
    id: int
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
            author_order=co_author_data.author_order
        )
        db.add(co_author)
    
    await db.commit()
    
    # Reload manuscript with co_authors eagerly loaded
    result = await db.execute(
        select(Manuscript).options(selectinload(Manuscript.co_authors)).where(
            Manuscript.id == new_manuscript.id
        )
    )
    new_manuscript = result.scalar_one()
    
    # TODO: Send email notifications to co-authors
    
    return new_manuscript


@router.get("", response_model=List[ManuscriptResponse])
async def get_manuscripts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all manuscripts for current user"""
    result = await db.execute(
        select(Manuscript).options(selectinload(Manuscript.co_authors)).where(
            Manuscript.user_id == current_user.id
        ).order_by(Manuscript.updated_at.desc())
    )
    manuscripts = result.scalars().all()
    
    return manuscripts


@router.get("/{manuscript_id}", response_model=ManuscriptResponse)
async def get_manuscript(
    manuscript_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific manuscript"""
    result = await db.execute(
        select(Manuscript).options(selectinload(Manuscript.co_authors)).where(
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
    manuscript_id: int,
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
        select(Manuscript).options(selectinload(Manuscript.co_authors)).where(
            Manuscript.id == manuscript_id
        )
    )
    manuscript = result.scalar_one()
    
    return manuscript


@router.delete("/{manuscript_id}")
async def delete_manuscript(
    manuscript_id: int,
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
    manuscript_id: int,
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
        author_order=co_author.author_order
    )
    db.add(new_co_author)
    await db.commit()
    await db.refresh(new_co_author)
    
    # TODO: Send email notification
    
    return new_co_author


@router.delete("/{manuscript_id}/co-authors/{co_author_id}")
async def remove_co_author(
    manuscript_id: int,
    co_author_id: int,
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
