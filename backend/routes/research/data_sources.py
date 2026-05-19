from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import User, DataSource
from auth import get_current_user

router = APIRouter(prefix="/api/research/data-sources", tags=["data-sources"])

# ──── Schemas ────────────────────────────────────────────────────────────────

class DataSourceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    source_type: str = Field(...)          # kobo_collect | google_sheets | excel
    url: Optional[str] = None
    api_key: Optional[str] = None
    asset_uid: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True

class DataSourceUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    api_key: Optional[str] = None
    asset_uid: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class DataSourceResponse(BaseModel):
    id: str
    institution_id: str
    researcher_id: str
    name: str
    source_type: str
    url: Optional[str]
    api_key: Optional[str]
    asset_uid: Optional[str]
    description: Optional[str]
    is_active: bool
    record_count: Optional[int]
    last_sync: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class DataSourceListResponse(BaseModel):
    sources: List[DataSourceResponse]
    total: int

# ──── Routes ─────────────────────────────────────────────────────────────────

@router.get("", response_model=DataSourceListResponse)
async def list_data_sources(
    source_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    where = [DataSource.researcher_id == current_user.id]
    if source_type:
        where.append(DataSource.source_type == source_type)
    if is_active is not None:
        where.append(DataSource.is_active == is_active)

    count_q = select(func.count(DataSource.id)).where(and_(*where))
    total = (await db.execute(count_q)).scalar()

    q = (
        select(DataSource)
        .where(and_(*where))
        .order_by(desc(DataSource.created_at))
    )
    result = await db.execute(q)
    sources = result.scalars().all()

    return {"sources": sources, "total": total}


@router.post("", response_model=DataSourceResponse, status_code=status.HTTP_201_CREATED)
async def create_data_source(
    payload: DataSourceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    source = DataSource(
        institution_id=current_user.primary_institution_id,
        researcher_id=current_user.id,
        name=payload.name,
        source_type=payload.source_type,
        url=payload.url,
        api_key=payload.api_key,
        asset_uid=payload.asset_uid,
        description=payload.description,
        is_active=payload.is_active,
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)
    return source


@router.put("/{source_id}", response_model=DataSourceResponse)
async def update_data_source(
    source_id: str,
    payload: DataSourceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = select(DataSource).where(
        and_(DataSource.id == source_id, DataSource.researcher_id == current_user.id)
    )
    source = (await db.execute(q)).scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data source not found")

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(source, field, val)

    await db.commit()
    await db.refresh(source)
    return source


@router.post("/{source_id}/sync", response_model=DataSourceResponse)
async def sync_data_source(
    source_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a source as synced now (actual ingestion handled by worker)."""
    q = select(DataSource).where(
        and_(DataSource.id == source_id, DataSource.researcher_id == current_user.id)
    )
    source = (await db.execute(q)).scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data source not found")

    source.last_sync = datetime.utcnow()
    await db.commit()
    await db.refresh(source)
    return source


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_data_source(
    source_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = select(DataSource).where(
        and_(DataSource.id == source_id, DataSource.researcher_id == current_user.id)
    )
    source = (await db.execute(q)).scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data source not found")

    await db.delete(source)
    await db.commit()
    return None
