from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import os, uuid, shutil

from database import get_db
from models import (ResearchProject, ProjectStatus, ProjectMember,
                    ProjectMilestone, ProjectTask, ProjectDocument,
                    User, EthicsApplication)
from auth import require_roles, ResearchRole
from services.notifications import create_notification

router = APIRouter(prefix="/api/research/projects", tags=["research-projects"])

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/tmp/uploads/projects")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ─── Pydantic schemas ─────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None
    project_type: str = "funded"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    involves_human_subjects: bool = False


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    involves_human_subjects: Optional[bool] = None


class MemberInvite(BaseModel):
    email: str
    name: Optional[str] = None
    role: str = "co_investigator"


class MilestoneCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: str = "medium"
    assigned_to_id: Optional[int] = None


class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    completed_at: Optional[datetime] = None


class TaskCreate(BaseModel):
    title: str
    due_date: Optional[datetime] = None
    priority: str = "medium"
    assigned_to_id: Optional[int] = None


class MemberOut(BaseModel):
    id: int
    role: str
    status: str
    invited_email: Optional[str]
    invited_name: Optional[str]
    invited_at: datetime
    joined_at: Optional[datetime]
    user_name: Optional[str] = None
    user_id: Optional[int] = None

    class Config:
        from_attributes = True


class MilestoneOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    due_date: Optional[datetime]
    completed_at: Optional[datetime]
    status: str
    priority: str
    assigned_to_id: Optional[int]
    assigned_to_name: Optional[str] = None
    task_count: int = 0
    done_count: int = 0

    class Config:
        from_attributes = True


class DocumentOut(BaseModel):
    id: int
    document_type: Optional[str]
    original_filename: Optional[str]
    file_size_bytes: Optional[int]
    mime_type: Optional[str]
    uploaded_at: datetime
    uploaded_by_name: Optional[str] = None

    class Config:
        from_attributes = True


class EthicsBasic(BaseModel):
    id: int
    title: Optional[str]
    status: str
    application_type: str
    submitted_at: Optional[datetime]
    approved_until: Optional[datetime]

    class Config:
        from_attributes = True


class ProjectOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    project_type: str
    status: str
    involves_human_subjects: bool
    award_id: Optional[int]
    pi_id: int
    pi_name: Optional[str] = None
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    created_at: datetime
    member_count: int = 0
    milestone_count: int = 0
    done_milestone_count: int = 0
    ethics_status: Optional[str] = None

    class Config:
        from_attributes = True


# ─── load helpers ─────────────────────────────────────────────────────────────

_PROJECT_OPTS = [
    selectinload(ResearchProject.pi),
    selectinload(ResearchProject.members).selectinload(ProjectMember.user),
    selectinload(ResearchProject.milestones).selectinload(ProjectMilestone.tasks),
    selectinload(ResearchProject.milestones).selectinload(ProjectMilestone.assigned_to),
    selectinload(ResearchProject.project_documents).selectinload(ProjectDocument.uploaded_by),
    selectinload(ResearchProject.ethics_applications),
]


def _serialize_project(p: ResearchProject) -> dict:
    latest_ethics = None
    if p.ethics_applications:
        latest_ethics = sorted(p.ethics_applications, key=lambda e: e.created_at, reverse=True)[0]
    return {
        "id": p.id,
        "title": p.title,
        "description": p.description,
        "project_type": p.project_type,
        "status": p.status.value if hasattr(p.status, "value") else p.status,
        "involves_human_subjects": p.involves_human_subjects,
        "award_id": p.award_id,
        "pi_id": p.pi_id,
        "pi_name": p.pi.name if p.pi else None,
        "start_date": p.start_date,
        "end_date": p.end_date,
        "created_at": p.created_at,
        "member_count": len(p.members) if p.members else 0,
        "milestone_count": len(p.milestones) if p.milestones else 0,
        "done_milestone_count": sum(1 for m in (p.milestones or []) if m.status == "completed"),
        "ethics_status": (latest_ethics.status.value
                          if latest_ethics and hasattr(latest_ethics.status, "value")
                          else (latest_ethics.status if latest_ethics else None)),
    }


# ─── LIST ─────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[ProjectOut])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.PRINCIPAL_INVESTIGATOR,
        ResearchRole.INSTITUTIONAL_LEAD, ResearchRole.DATA_STEWARD,
        ResearchRole.GRANT_OFFICER,
    ]))
):
    q = select(ResearchProject).options(*_PROJECT_OPTS).where(
        ResearchProject.institution_id == current_user.primary_institution_id
    )
    if current_user.role == ResearchRole.PRINCIPAL_INVESTIGATOR:
        q = q.where(ResearchProject.pi_id == current_user.id)
    result = await db.execute(q.order_by(ResearchProject.created_at.desc()))
    return [_serialize_project(p) for p in result.scalars().all()]


# ─── CREATE ───────────────────────────────────────────────────────────────────

@router.post("", status_code=201)
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

    result = await db.execute(
        select(ResearchProject).where(ResearchProject.id == project.id).options(*_PROJECT_OPTS)
    )
    return _serialize_project(result.scalar_one())


# ─── GET ONE ──────────────────────────────────────────────────────────────────

@router.get("/{project_id}")
async def get_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.ETHICS_REVIEWER,
        ResearchRole.DATA_STEWARD, ResearchRole.GRANT_OFFICER,
    ]))
):
    result = await db.execute(
        select(ResearchProject).where(ResearchProject.id == project_id).options(*_PROJECT_OPTS)
    )
    project = result.scalar_one_or_none()
    if not project or project.institution_id != current_user.primary_institution_id:
        raise HTTPException(404, "Project not found")

    data = _serialize_project(project)
    data["members"] = [
        {
            "id": m.id, "role": m.role, "status": m.status,
            "invited_email": m.invited_email, "invited_name": m.invited_name,
            "invited_at": m.invited_at, "joined_at": m.joined_at,
            "user_id": m.user_id,
            "user_name": m.user.name if m.user else m.invited_name,
        }
        for m in (project.members or [])
    ]
    data["milestones"] = [
        {
            "id": m.id, "title": m.title, "description": m.description,
            "due_date": m.due_date, "completed_at": m.completed_at,
            "status": m.status, "priority": m.priority,
            "assigned_to_id": m.assigned_to_id,
            "assigned_to_name": m.assigned_to.name if m.assigned_to else None,
            "task_count": len(m.tasks) if m.tasks else 0,
            "done_count": sum(1 for t in (m.tasks or []) if t.status == "done"),
        }
        for m in sorted(project.milestones or [], key=lambda x: (x.due_date or datetime.max.replace(tzinfo=timezone.utc)))
    ]
    data["documents"] = [
        {
            "id": d.id, "document_type": d.document_type,
            "original_filename": d.original_filename,
            "file_size_bytes": d.file_size_bytes,
            "mime_type": d.mime_type, "uploaded_at": d.uploaded_at,
            "uploaded_by_name": d.uploaded_by.name if d.uploaded_by else None,
        }
        for d in (project.project_documents or [])
    ]
    data["ethics_applications"] = [
        {
            "id": e.id, "title": e.title,
            "status": e.status.value if hasattr(e.status, "value") else e.status,
            "application_type": e.application_type,
            "submitted_at": e.submitted_at, "approved_until": e.approved_until,
        }
        for e in (project.ethics_applications or [])
    ]
    return data


# ─── UPDATE PROJECT ───────────────────────────────────────────────────────────

@router.patch("/{project_id}")
async def update_project(
    project_id: int,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    result = await db.execute(select(ResearchProject).where(ResearchProject.id == project_id))
    project = result.scalar_one_or_none()
    if not project or project.pi_id != current_user.id:
        raise HTTPException(404, "Project not found or access denied")
    for field, value in data.model_dump(exclude_unset=True).items():
        if field == "status" and value:
            setattr(project, field, ProjectStatus(value))
        elif value is not None:
            setattr(project, field, value)
    await db.commit()
    return {"id": project_id, "updated": True}


# ─── MEMBERS ──────────────────────────────────────────────────────────────────

@router.get("/{project_id}/members")
async def list_members(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR,
                                                 ResearchRole.GRANT_OFFICER]))
):
    result = await db.execute(
        select(ProjectMember)
        .where(ProjectMember.project_id == project_id)
        .options(selectinload(ProjectMember.user))
    )
    members = result.scalars().all()
    return [
        {
            "id": m.id, "role": m.role, "status": m.status,
            "invited_email": m.invited_email,
            "user_name": m.user.name if m.user else m.invited_name,
            "user_id": m.user_id, "invited_at": m.invited_at,
        }
        for m in members
    ]


@router.post("/{project_id}/members", status_code=201)
async def invite_member(
    project_id: int,
    data: MemberInvite,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    result = await db.execute(select(ResearchProject).where(ResearchProject.id == project_id))
    project = result.scalar_one_or_none()
    if not project or project.pi_id != current_user.id:
        raise HTTPException(404, "Project not found or access denied")

    user_result = await db.execute(select(User).where(User.email == data.email))
    existing_user = user_result.scalar_one_or_none()

    member = ProjectMember(
        project_id=project_id,
        user_id=existing_user.id if existing_user else None,
        role=data.role,
        status="accepted" if existing_user else "pending",
        invited_email=data.email,
        invited_name=data.name or (existing_user.name if existing_user else data.email),
        joined_at=datetime.now(timezone.utc) if existing_user else None,
    )
    db.add(member)
    await db.flush()

    if existing_user:
        await create_notification(
            db, existing_user.id,
            title="Project Collaboration Invite",
            message=f"{current_user.name} invited you to collaborate on '{project.title}'",
            entity_type="project", entity_id=project_id,
        )
    await db.commit()
    return {"id": member.id, "status": member.status}


@router.delete("/{project_id}/members/{member_id}", status_code=204)
async def remove_member(
    project_id: int,
    member_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.id == member_id,
            ProjectMember.project_id == project_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(404, "Member not found")
    await db.delete(member)
    await db.commit()


# ─── MILESTONES ───────────────────────────────────────────────────────────────

@router.get("/{project_id}/milestones")
async def list_milestones(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER,
    ]))
):
    result = await db.execute(
        select(ProjectMilestone)
        .where(ProjectMilestone.project_id == project_id)
        .options(selectinload(ProjectMilestone.tasks),
                 selectinload(ProjectMilestone.assigned_to))
        .order_by(ProjectMilestone.due_date)
    )
    milestones = result.scalars().all()
    return [
        {
            "id": m.id, "title": m.title, "description": m.description,
            "due_date": m.due_date, "completed_at": m.completed_at,
            "status": m.status, "priority": m.priority,
            "assigned_to_id": m.assigned_to_id,
            "assigned_to_name": m.assigned_to.name if m.assigned_to else None,
            "task_count": len(m.tasks) if m.tasks else 0,
            "done_count": sum(1 for t in (m.tasks or []) if t.status == "done"),
            "tasks": [
                {"id": t.id, "title": t.title, "status": t.status,
                 "priority": t.priority, "due_date": t.due_date}
                for t in (m.tasks or [])
            ],
        }
        for m in milestones
    ]


@router.post("/{project_id}/milestones", status_code=201)
async def create_milestone(
    project_id: int,
    data: MilestoneCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    result = await db.execute(select(ResearchProject).where(ResearchProject.id == project_id))
    project = result.scalar_one_or_none()
    if not project or project.pi_id != current_user.id:
        raise HTTPException(404, "Project not found or access denied")

    milestone = ProjectMilestone(project_id=project_id, **data.model_dump())
    db.add(milestone)
    await db.commit()
    await db.refresh(milestone)
    return {"id": milestone.id, "title": milestone.title, "status": milestone.status}


@router.patch("/{project_id}/milestones/{milestone_id}")
async def update_milestone(
    project_id: int,
    milestone_id: int,
    data: MilestoneUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    result = await db.execute(
        select(ProjectMilestone).where(
            ProjectMilestone.id == milestone_id,
            ProjectMilestone.project_id == project_id,
        )
    )
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise HTTPException(404, "Milestone not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(milestone, field, value)
    if data.status == "completed" and not milestone.completed_at:
        milestone.completed_at = datetime.now(timezone.utc)
    await db.commit()
    return {"id": milestone_id, "updated": True}


@router.post("/{project_id}/milestones/{milestone_id}/tasks", status_code=201)
async def add_task(
    project_id: int,
    milestone_id: int,
    data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    task = ProjectTask(milestone_id=milestone_id, **data.model_dump())
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return {"id": task.id, "title": task.title}


# ─── DOCUMENTS ────────────────────────────────────────────────────────────────

@router.get("/{project_id}/documents")
async def list_documents(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER,
        ResearchRole.DATA_STEWARD,
    ]))
):
    result = await db.execute(
        select(ProjectDocument)
        .where(ProjectDocument.project_id == project_id)
        .options(selectinload(ProjectDocument.uploaded_by))
        .order_by(ProjectDocument.uploaded_at.desc())
    )
    docs = result.scalars().all()
    return [
        {
            "id": d.id, "document_type": d.document_type,
            "original_filename": d.original_filename,
            "file_size_bytes": d.file_size_bytes,
            "mime_type": d.mime_type, "uploaded_at": d.uploaded_at,
            "uploaded_by_name": d.uploaded_by.name if d.uploaded_by else None,
        }
        for d in docs
    ]


@router.post("/{project_id}/documents", status_code=201)
async def upload_document(
    project_id: int,
    document_type: str = Form("general"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    result = await db.execute(select(ResearchProject).where(ResearchProject.id == project_id))
    project = result.scalar_one_or_none()
    if not project or project.institution_id != current_user.primary_institution_id:
        raise HTTPException(404, "Project not found")

    ext = os.path.splitext(file.filename or "")[1]
    stored = f"{uuid.uuid4().hex}{ext}"
    dest = os.path.join(UPLOAD_DIR, stored)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    size = os.path.getsize(dest)

    doc = ProjectDocument(
        project_id=project_id,
        document_type=document_type,
        original_filename=file.filename,
        stored_filename=stored,
        file_size_bytes=size,
        mime_type=file.content_type,
        uploaded_by_id=current_user.id,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return {"id": doc.id, "original_filename": doc.original_filename}
