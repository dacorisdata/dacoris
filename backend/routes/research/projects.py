from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from database import get_db
from models import ResearchProject, ProjectStatus, User
from auth import require_roles, ResearchRole

router = APIRouter(prefix="/api/research/projects", tags=["research-projects"])


class ProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None
    project_type: str = "independent"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    involves_human_subjects: bool = False


class ProjectOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    project_type: str
    status: str
    involves_human_subjects: bool
    award_id: Optional[int]
    pi_id: int
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=List[ProjectOut])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.PRINCIPAL_INVESTIGATOR,
        ResearchRole.INSTITUTIONAL_LEAD, ResearchRole.DATA_STEWARD
    ]))
):
    query = select(ResearchProject).where(
        ResearchProject.institution_id == current_user.primary_institution_id
    )
    result = await db.execute(query.order_by(ResearchProject.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=ProjectOut, status_code=201)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    project = ResearchProject(
        institution_id=current_user.primary_institution_id,
        pi_id=current_user.id,
        status=ProjectStatus.ACTIVE,
        **data.model_dump()
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.PRINCIPAL_INVESTIGATOR,
        ResearchRole.ETHICS_REVIEWER, ResearchRole.DATA_STEWARD
    ]))
):
    project = await db.get(ResearchProject, project_id)
    if not project or project.institution_id != current_user.primary_institution_id:
        raise HTTPException(404, "Project not found")
    return project
