from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import json
import httpx

from database import get_db
from models import User, PublicationLibrary, Publication
from auth import get_current_user

router = APIRouter(prefix="/api/publications", tags=["publications"])


# ═══════════════════════════════════════════════════════════════════════════
# PYDANTIC SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class LibraryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[int] = None
    is_folder: bool = False
    is_default: bool = False


class LibraryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    parent_id: Optional[int]
    is_folder: bool
    is_default: bool
    publication_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class LibraryUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[int] = None


class PublicationCreate(BaseModel):
    library_id: int
    title: str
    authors: str
    journal: Optional[str] = None
    year: Optional[int] = None
    doi: Optional[str] = None
    pmid: Optional[str] = None
    source: Optional[str] = None
    source_id: Optional[str] = None
    abstract: Optional[str] = None
    publication_type: Optional[str] = None
    language: Optional[str] = None
    country: Optional[str] = None
    keywords: Optional[str] = None  # JSON string
    citation_count: int = 0
    starred: bool = False
    tags: Optional[str] = None  # JSON string
    notes: Optional[str] = None


class PublicationUpdate(BaseModel):
    starred: Optional[bool] = None
    tags: Optional[str] = None
    notes: Optional[str] = None
    library_id: Optional[int] = None


class PublicationResponse(BaseModel):
    id: int
    library_id: int
    title: str
    authors: str
    journal: Optional[str]
    year: Optional[int]
    doi: Optional[str]
    pmid: Optional[str]
    source: Optional[str]
    abstract: Optional[str]
    publication_type: Optional[str]
    citation_count: int
    starred: bool
    tags: Optional[str]
    notes: Optional[str]
    ai_summary: Optional[str]
    ai_summary_generated_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


class AISummaryRequest(BaseModel):
    publication_id: int


class PubMedSearchRequest(BaseModel):
    query: str
    max_results: int = 20


# ═══════════════════════════════════════════════════════════════════════════
# LIBRARY ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/libraries", response_model=LibraryResponse)
async def create_library(
    library: LibraryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new publication library"""
    # If this is set as default, unset other defaults
    if library.is_default:
        await db.execute(
            update(PublicationLibrary)
            .where(
                PublicationLibrary.user_id == current_user.id,
                PublicationLibrary.is_default == True
            )
            .values(is_default=False)
        )
    
    new_library = PublicationLibrary(
        name=library.name,
        description=library.description,
        user_id=current_user.id,
        parent_id=library.parent_id,
        is_folder=library.is_folder,
        is_default=library.is_default
    )
    db.add(new_library)
    await db.flush()  # Flush to get the ID before commit
    await db.commit()
    await db.refresh(new_library)
    
    # Ensure we have the values
    if new_library.id is None or new_library.created_at is None:
        # Re-query to get fresh data
        result = await db.execute(
            select(PublicationLibrary)
            .where(PublicationLibrary.user_id == current_user.id)
            .order_by(PublicationLibrary.id.desc())
        )
        new_library = result.scalar_one_or_none()
    
    # Return LibraryResponse compatible dict
    return LibraryResponse(
        id=new_library.id,
        name=new_library.name,
        description=new_library.description,
        parent_id=new_library.parent_id,
        is_folder=new_library.is_folder,
        is_default=new_library.is_default,
        publication_count=0,
        created_at=new_library.created_at
    )


@router.get("/libraries", response_model=List[LibraryResponse])
async def get_libraries(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all libraries for current user"""
    result_libs = await db.execute(
        select(PublicationLibrary).where(PublicationLibrary.user_id == current_user.id)
    )
    libraries = result_libs.scalars().all()
    
    result = []
    for lib in libraries:
        pub_result = await db.execute(
            select(Publication).where(Publication.library_id == lib.id)
        )
        pub_count = len(pub_result.scalars().all())
        result.append(LibraryResponse(
            id=lib.id,
            name=lib.name,
            description=lib.description,
            parent_id=lib.parent_id,
            is_folder=lib.is_folder,
            is_default=lib.is_default,
            publication_count=pub_count,
            created_at=lib.created_at
        ))
    
    return result


@router.patch("/libraries/{library_id}", response_model=LibraryResponse)
async def update_library(
    library_id: int,
    update: LibraryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update library name or move to different parent"""
    result = await db.execute(
        select(PublicationLibrary).where(
            PublicationLibrary.id == library_id,
            PublicationLibrary.user_id == current_user.id
        )
    )
    library = result.scalar_one_or_none()
    
    if not library:
        raise HTTPException(status_code=404, detail="Library not found")
    
    if update.name is not None:
        library.name = update.name
    
    if update.parent_id is not None:
        # Verify parent belongs to user and prevent circular reference
        if update.parent_id != library_id:
            parent_result = await db.execute(
                select(PublicationLibrary).where(
                    PublicationLibrary.id == update.parent_id,
                    PublicationLibrary.user_id == current_user.id
                )
            )
            parent = parent_result.scalar_one_or_none()
            if parent:
                library.parent_id = update.parent_id
    elif 'parent_id' in update.dict(exclude_unset=True):
        # Explicitly set to None (move to root)
        library.parent_id = None
    
    await db.commit()
    await db.refresh(library)
    
    pub_result = await db.execute(
        select(Publication).where(Publication.library_id == library.id)
    )
    pub_count = len(pub_result.scalars().all())
    
    return LibraryResponse(
        id=library.id,
        name=library.name,
        description=library.description,
        parent_id=library.parent_id,
        is_folder=library.is_folder,
        is_default=library.is_default,
        publication_count=pub_count,
        created_at=library.created_at
    )


@router.delete("/libraries/{library_id}")
async def delete_library(
    library_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a library and all its publications and children"""
    result = await db.execute(
        select(PublicationLibrary).where(
            PublicationLibrary.id == library_id,
            PublicationLibrary.user_id == current_user.id
        )
    )
    library = result.scalar_one_or_none()
    
    if not library:
        raise HTTPException(status_code=404, detail="Library not found")
    
    # Delete the library (cascade will handle children and publications)
    await db.delete(library)
    await db.commit()
    
    return {"message": "Library deleted successfully"}


# ═══════════════════════════════════════════════════════════════════════════
# PUBLICATION ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("", response_model=PublicationResponse)
async def create_publication(
    publication: PublicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Import a publication to a library"""
    # Verify library belongs to user
    result = await db.execute(
        select(PublicationLibrary).where(
            PublicationLibrary.id == publication.library_id,
            PublicationLibrary.user_id == current_user.id
        )
    )
    library = result.scalar_one_or_none()
    
    if not library:
        raise HTTPException(status_code=404, detail="Library not found")
    
    # Check for duplicates (same DOI or PMID)
    if publication.doi:
        result = await db.execute(
            select(Publication).where(
                Publication.library_id == publication.library_id,
                Publication.doi == publication.doi
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=400, detail="Publication already exists in this library")
    
    if publication.pmid:
        result = await db.execute(
            select(Publication).where(
                Publication.library_id == publication.library_id,
                Publication.pmid == publication.pmid
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=400, detail="Publication already exists in this library")
    
    new_pub = Publication(**publication.dict())
    db.add(new_pub)
    await db.commit()
    await db.refresh(new_pub)
    
    return new_pub


@router.get("", response_model=List[PublicationResponse])
async def get_publications(
    library_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all publications for current user, optionally filtered by library"""
    stmt = select(Publication).join(PublicationLibrary).where(
        PublicationLibrary.user_id == current_user.id
    )
    
    if library_id:
        stmt = stmt.where(Publication.library_id == library_id)
    
    stmt = stmt.order_by(Publication.created_at.desc())
    result = await db.execute(stmt)
    publications = result.scalars().all()
    return publications


@router.get("/{publication_id}", response_model=PublicationResponse)
async def get_publication(
    publication_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific publication"""
    result = await db.execute(
        select(Publication).join(PublicationLibrary).where(
            Publication.id == publication_id,
            PublicationLibrary.user_id == current_user.id
        )
    )
    publication = result.scalar_one_or_none()
    
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")
    
    return publication


@router.patch("/{publication_id}", response_model=PublicationResponse)
async def update_publication(
    publication_id: int,
    update: PublicationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update publication metadata (star, tags, notes, move to different library)"""
    result = await db.execute(
        select(Publication).join(PublicationLibrary).where(
            Publication.id == publication_id,
            PublicationLibrary.user_id == current_user.id
        )
    )
    publication = result.scalar_one_or_none()
    
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")
    
    # If moving to different library, verify it belongs to user
    if update.library_id and update.library_id != publication.library_id:
        lib_result = await db.execute(
            select(PublicationLibrary).where(
                PublicationLibrary.id == update.library_id,
                PublicationLibrary.user_id == current_user.id
            )
        )
        new_library = lib_result.scalar_one_or_none()
        if not new_library:
            raise HTTPException(status_code=404, detail="Target library not found")
    
    for key, value in update.dict(exclude_unset=True).items():
        setattr(publication, key, value)
    
    await db.commit()
    await db.refresh(publication)
    
    return publication


@router.delete("/{publication_id}")
async def delete_publication(
    publication_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a publication"""
    result = await db.execute(
        select(Publication).join(PublicationLibrary).where(
            Publication.id == publication_id,
            PublicationLibrary.user_id == current_user.id
        )
    )
    publication = result.scalar_one_or_none()
    
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")
    
    await db.delete(publication)
    await db.commit()
    
    return {"message": "Publication deleted successfully"}


# ═══════════════════════════════════════════════════════════════════════════
# AI SUMMARY ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/{publication_id}/ai-summary")
async def generate_ai_summary(
    publication_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate AI summary for a publication"""
    result = await db.execute(
        select(Publication).join(PublicationLibrary).where(
            Publication.id == publication_id,
            PublicationLibrary.user_id == current_user.id
        )
    )
    publication = result.scalar_one_or_none()
    
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")
    
    # TODO: Integrate with actual AI service (OpenAI, Claude, etc.)
    # For now, generate a mock summary
    summary = f"""This {publication.source or 'publication'} titled "{publication.title}" presents research findings published in {publication.journal or 'a scientific journal'} ({publication.year or 'year unknown'}). The study contributes to the field through novel methodologies and significant results. Key findings include innovative approaches and potential implications for future research directions in this domain."""
    
    publication.ai_summary = summary
    publication.ai_summary_generated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(publication)
    
    return {
        "publication_id": publication.id,
        "summary": summary,
        "generated_at": publication.ai_summary_generated_at
    }


# ═══════════════════════════════════════════════════════════════════════════
# PUBMED SEARCH ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/search/pubmed")
async def search_pubmed(request: PubMedSearchRequest):
    """Search PubMed and return results"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Search for IDs
            search_url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
            search_params = {
                "db": "pubmed",
                "term": request.query,
                "retmode": "json",
                "retmax": request.max_results
            }
            search_response = await client.get(search_url, params=search_params)
            search_data = search_response.json()
            
            ids = search_data.get("esearchresult", {}).get("idlist", [])
            
            if not ids:
                return {"results": [], "count": 0}
            
            # Fetch summaries
            summary_url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
            summary_params = {
                "db": "pubmed",
                "id": ",".join(ids),
                "retmode": "json"
            }
            summary_response = await client.get(summary_url, params=summary_params)
            summary_data = summary_response.json()
            
            results = []
            for pmid in ids:
                article = summary_data.get("result", {}).get(pmid, {})
                if not article or pmid == "uids":
                    continue
                
                authors_list = article.get("authors", [])
                authors_str = ", ".join([a.get("name", "") for a in authors_list[:3]])
                if len(authors_list) > 3:
                    authors_str += ", et al."
                
                # Extract DOI
                doi = ""
                for article_id in article.get("articleids", []):
                    if article_id.get("idtype") == "doi":
                        doi = article_id.get("value", "")
                        break
                
                results.append({
                    "id": f"pubmed_{pmid}",
                    "pmid": pmid,
                    "title": article.get("title", ""),
                    "authors": authors_str or "Unknown",
                    "journal": article.get("fulljournalname") or article.get("source", "Unknown"),
                    "year": article.get("pubdate", "").split()[0] if article.get("pubdate") else None,
                    "doi": doi,
                    "source": "PubMed",
                    "abstract": ""
                })
            
            return {
                "results": results,
                "count": len(results)
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PubMed search failed: {str(e)}")
