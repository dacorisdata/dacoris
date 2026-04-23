from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import json

from database import get_db
from models import ResearchOutput, ResearchProject, User
from auth import require_roles, ResearchRole

router = APIRouter(prefix="/api/research/outputs", tags=["research-outputs"])

# In-memory presence store: {output_id: {user_id: last_seen_timestamp}}
_presence: dict[int, dict[int, dict]] = {}
_PRESENCE_TTL = 30  # seconds


class OutputCreate(BaseModel):
    title: str
    output_type: str = "journal_article"
    project_id: Optional[int] = None
    abstract: Optional[str] = None
    doi: Optional[str] = None
    year: Optional[int] = None
    journal_name: Optional[str] = None


class OutputUpdate(BaseModel):
    title: Optional[str] = None
    abstract: Optional[str] = None
    content_tiptap: Optional[str] = None
    doi: Optional[str] = None
    year: Optional[int] = None
    journal_name: Optional[str] = None
    status: Optional[str] = None
    output_type: Optional[str] = None


class OutputOut(BaseModel):
    id: int
    title: str
    output_type: str
    project_id: Optional[int]
    abstract: Optional[str]
    doi: Optional[str]
    year: Optional[int]
    journal_name: Optional[str]
    status: str
    version: int
    created_by_id: int
    created_by_name: Optional[str] = None
    last_edited_by_id: Optional[int]
    last_edited_by_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime]
    project_title: Optional[str] = None

    class Config:
        from_attributes = True


_OUTPUT_OPTS = [
    selectinload(ResearchOutput.created_by),
    selectinload(ResearchOutput.last_edited_by),
    selectinload(ResearchOutput.project),
]


def _serialize_output(o: ResearchOutput) -> dict:
    return {
        "id": o.id,
        "title": o.title,
        "output_type": o.output_type,
        "project_id": o.project_id,
        "abstract": o.abstract,
        "doi": o.doi,
        "year": o.year,
        "journal_name": o.journal_name,
        "status": o.status,
        "version": o.version,
        "created_by_id": o.created_by_id,
        "created_by_name": o.created_by.name if o.created_by else None,
        "last_edited_by_id": o.last_edited_by_id,
        "last_edited_by_name": o.last_edited_by.name if o.last_edited_by else None,
        "created_at": o.created_at,
        "updated_at": o.updated_at,
        "project_title": o.project.title if o.project else None,
    }


@router.get("", response_model=List[OutputOut])
async def list_outputs(
    project_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER,
        ResearchRole.INSTITUTIONAL_LEAD,
    ]))
):
    q = select(ResearchOutput).options(*_OUTPUT_OPTS).where(
        ResearchOutput.institution_id == current_user.primary_institution_id
    )
    if project_id:
        q = q.where(ResearchOutput.project_id == project_id)
    if current_user.role == ResearchRole.PRINCIPAL_INVESTIGATOR:
        q = q.where(ResearchOutput.created_by_id == current_user.id)
    result = await db.execute(q.order_by(ResearchOutput.updated_at.desc().nullsfirst(),
                                          ResearchOutput.created_at.desc()))
    return [_serialize_output(o) for o in result.scalars().all()]


@router.post("", status_code=201)
async def create_output(
    data: OutputCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    output = ResearchOutput(
        institution_id=current_user.primary_institution_id,
        created_by_id=current_user.id,
        last_edited_by_id=current_user.id,
        content_tiptap=json.dumps({"type": "doc", "content": []}),
        **data.model_dump()
    )
    db.add(output)
    await db.commit()
    await db.refresh(output)

    result = await db.execute(
        select(ResearchOutput).where(ResearchOutput.id == output.id).options(*_OUTPUT_OPTS)
    )
    return _serialize_output(result.scalar_one())


@router.get("/{output_id}")
async def get_output(
    output_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER,
        ResearchRole.INSTITUTIONAL_LEAD,
    ]))
):
    result = await db.execute(
        select(ResearchOutput).where(ResearchOutput.id == output_id).options(*_OUTPUT_OPTS)
    )
    output = result.scalar_one_or_none()
    if not output or output.institution_id != current_user.primary_institution_id:
        raise HTTPException(404, "Output not found")
    data = _serialize_output(output)
    data["content_tiptap"] = output.content_tiptap or json.dumps({"type": "doc", "content": []})
    return data


@router.patch("/{output_id}")
async def update_output(
    output_id: int,
    data: OutputUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    result = await db.execute(select(ResearchOutput).where(ResearchOutput.id == output_id))
    output = result.scalar_one_or_none()
    if not output or output.institution_id != current_user.primary_institution_id:
        raise HTTPException(404, "Output not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(output, field, value)
    output.last_edited_by_id = current_user.id
    output.version = (output.version or 1) + 1
    await db.commit()
    return {"id": output_id, "version": output.version, "updated_at": datetime.now(timezone.utc)}


@router.delete("/{output_id}", status_code=204)
async def delete_output(
    output_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    result = await db.execute(select(ResearchOutput).where(ResearchOutput.id == output_id))
    output = result.scalar_one_or_none()
    if not output or output.created_by_id != current_user.id:
        raise HTTPException(404, "Output not found or access denied")
    await db.delete(output)
    await db.commit()


# ─── Presence (collaborative awareness) ──────────────────────────────────────

@router.post("/{output_id}/presence")
async def register_presence(
    output_id: int,
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    now = datetime.now(timezone.utc).timestamp()
    if output_id not in _presence:
        _presence[output_id] = {}
    _presence[output_id][current_user.id] = {
        "user_id": current_user.id,
        "name": current_user.name,
        "last_seen": now,
    }
    # prune stale entries
    _presence[output_id] = {
        uid: info for uid, info in _presence[output_id].items()
        if now - info["last_seen"] < _PRESENCE_TTL
    }
    return {"registered": True}


@router.get("/{output_id}/presence")
async def get_presence(
    output_id: int,
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    now = datetime.now(timezone.utc).timestamp()
    active = [
        info for info in (_presence.get(output_id) or {}).values()
        if now - info["last_seen"] < _PRESENCE_TTL
        and info["user_id"] != current_user.id
    ]
    return {"collaborators": active}
