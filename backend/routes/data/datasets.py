from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime

from database import get_db
from models import (
    Dataset, DatasetVersion, DatasetStatus, AccessLevel,
    CaptureForm, FormSubmission, QAStatus,
    User, ResearchRole,
)
from auth import require_roles

router = APIRouter(prefix="/api/data/datasets", tags=["data-datasets"])


# ──── Schemas ────────────────────────────────────────────────────────────────
class DatasetCreate(BaseModel):
    title: str
    description: Optional[str] = None
    project_id: Optional[str] = None
    source_form_id: Optional[str] = None
    access_level: str = "restricted"

class DatasetUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    access_level: Optional[str] = None

class DatasetOut(BaseModel):
    id: str
    title: str
    description: Optional[str]
    project_id: Optional[str]
    project_title: Optional[str] = None
    source_form_id: Optional[str]
    source_form_title: Optional[str] = None
    status: str
    access_level: str
    record_count: int
    current_version: int
    created_by_name: Optional[str] = None
    created_at: Any
    updated_at: Any = None

    class Config:
        from_attributes = True


_DATASET_LOAD = [
    selectinload(Dataset.project),
    selectinload(Dataset.source_form),
    selectinload(Dataset.created_by),
    selectinload(Dataset.versions),
]


def _enrich(ds: Dataset) -> dict:
    return {
        "id": ds.id,
        "title": ds.title,
        "description": ds.description,
        "project_id": ds.project_id,
        "project_title": ds.project.title if ds.project else None,
        "source_form_id": ds.source_form_id,
        "source_form_title": ds.source_form.title if ds.source_form else None,
        "status": ds.status.value if hasattr(ds.status, "value") else ds.status,
        "access_level": ds.access_level.value if hasattr(ds.access_level, "value") else ds.access_level,
        "record_count": ds.record_count or 0,
        "current_version": ds.current_version or 1,
        "created_by_name": ds.created_by.full_name if ds.created_by and hasattr(ds.created_by, "full_name") else (ds.created_by.name if ds.created_by else None),
        "created_at": ds.created_at,
        "updated_at": ds.updated_at,
        "version_count": len(ds.versions) if ds.versions else 0,
    }


# ──── Routes ────────────────────────────────────────────────────────────────

@router.post("", response_model=DatasetOut, status_code=201)
async def create_dataset(
    payload: DatasetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.DATA_STEWARD, ResearchRole.PRINCIPAL_INVESTIGATOR
    ]))
):
    ds = Dataset(
        title=payload.title,
        description=payload.description,
        project_id=payload.project_id,
        source_form_id=payload.source_form_id,
        institution_id=current_user.primary_institution_id,
        access_level=payload.access_level,
        created_by_id=current_user.id,
    )
    db.add(ds)
    await db.commit()

    # Create initial version
    v1 = DatasetVersion(
        dataset_id=ds.id, version_number=1, row_count=0,
        change_summary="Initial dataset creation",
        created_by_id=current_user.id,
    )
    db.add(v1)
    await db.commit()

    # Re-fetch with relationships
    result = await db.execute(
        select(Dataset).options(*_DATASET_LOAD).where(Dataset.id == ds.id)
    )
    return _enrich(result.scalar_one())


@router.get("", response_model=List[DatasetOut])
async def list_datasets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.DATA_STEWARD, ResearchRole.PRINCIPAL_INVESTIGATOR,
        ResearchRole.DATA_ENGINEER, ResearchRole.INSTITUTIONAL_LEAD,
        ResearchRole.GRANT_OFFICER,
    ]))
):
    from models import PrimaryAccountType
    
    q = (
        select(Dataset)
        .options(*_DATASET_LOAD)
        .where(Dataset.institution_id == current_user.primary_institution_id)
        .order_by(Dataset.created_at.desc())
    )
    # Researchers only see their own datasets
    if current_user.primary_account_type == PrimaryAccountType.RESEARCHER:
        q = q.where(Dataset.created_by_id == current_user.id)
    result = await db.execute(q)
    return [_enrich(ds) for ds in result.scalars().all()]


@router.get("/{dataset_id}", response_model=DatasetOut)
async def get_dataset(
    dataset_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.DATA_STEWARD, ResearchRole.PRINCIPAL_INVESTIGATOR,
        ResearchRole.DATA_ENGINEER,
    ]))
):
    result = await db.execute(
        select(Dataset).options(*_DATASET_LOAD).where(Dataset.id == dataset_id)
    )
    ds = result.scalar_one_or_none()
    if not ds or ds.institution_id != current_user.primary_institution_id:
        raise HTTPException(404, "Dataset not found")
    return _enrich(ds)


@router.patch("/{dataset_id}", response_model=DatasetOut)
async def update_dataset(
    dataset_id: str,
    payload: DatasetUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.DATA_STEWARD, ResearchRole.PRINCIPAL_INVESTIGATOR
    ]))
):
    ds = await db.get(Dataset, dataset_id)
    if not ds or ds.institution_id != current_user.primary_institution_id:
        raise HTTPException(404, "Dataset not found")
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(ds, field, value)
    await db.commit()

    result = await db.execute(
        select(Dataset).options(*_DATASET_LOAD).where(Dataset.id == dataset_id)
    )
    return _enrich(result.scalar_one())


@router.post("/{dataset_id}/promote-submissions")
async def promote_submissions(
    dataset_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.DATA_STEWARD]))
):
    """Promote all passed QA submissions from the linked form into the dataset."""
    ds = await db.get(Dataset, dataset_id)
    if not ds or ds.institution_id != current_user.primary_institution_id:
        raise HTTPException(404, "Dataset not found")
    if not ds.source_form_id:
        raise HTTPException(400, "Dataset has no linked capture form")

    # Count passed submissions
    result = await db.execute(
        select(func.count(FormSubmission.id)).where(
            and_(
                FormSubmission.form_id == ds.source_form_id,
                FormSubmission.qa_status == QAStatus.PASSED,
            )
        )
    )
    passed_count = result.scalar() or 0
    if passed_count == 0:
        raise HTTPException(400, "No passed submissions to promote")

    # Bump version
    new_version = (ds.current_version or 1) + 1
    ds.current_version = new_version
    ds.record_count = (ds.record_count or 0) + passed_count
    ds.status = DatasetStatus.ACTIVE

    version = DatasetVersion(
        dataset_id=ds.id, version_number=new_version,
        row_count=passed_count,
        change_summary=f"Promoted {passed_count} QA-passed submissions",
        created_by_id=current_user.id,
    )
    db.add(version)
    await db.commit()

    return {"promoted": passed_count, "new_version": new_version, "total_records": ds.record_count}


@router.get("/{dataset_id}/versions")
async def list_versions(
    dataset_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.DATA_STEWARD, ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.DATA_ENGINEER
    ]))
):
    result = await db.execute(
        select(DatasetVersion)
        .options(selectinload(DatasetVersion.created_by))
        .where(DatasetVersion.dataset_id == dataset_id)
        .order_by(DatasetVersion.version_number.desc())
    )
    versions = result.scalars().all()
    return [
        {
            "id": v.id, "version_number": v.version_number,
            "row_count": v.row_count, "checksum": v.checksum,
            "change_summary": v.change_summary,
            "created_by_name": v.created_by.name if v.created_by else None,
            "created_at": v.created_at,
        }
        for v in versions
    ]
