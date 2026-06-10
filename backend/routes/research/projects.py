from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, insert
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime, timezone
import os, uuid, shutil, json, tempfile

from database import get_db
from models import (ResearchProject, ProjectStatus, ProjectMember,
                    ProjectMilestone, ProjectTask, ProjectDocument,
                    ProjectTeam, ProjectTeamMember, ProjectDeliverable,
                    ProjectBudgetLine,
                    User, EthicsApplication, PrimaryAccountType, ReviewerAssignment,
                    ReviewType, ReviewerAssignmentStatus, UserStatus, user_roles)
from auth import require_roles, ResearchRole
from services.notifications import create_notification
from services.file_upload import save_upload
from services.reviewer_onboarding import get_or_create_reviewer_user
from services.dmp_document_parser import parse_dmp_fields

router = APIRouter(prefix="/api/research/projects", tags=["research-projects"])

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/tmp/uploads/projects")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ─── Pydantic schemas ─────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None
    project_type: str = "contract_research"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    involves_human_subjects: bool = False
    involves_animal_subjects: bool = False
    involves_sensitive_data: bool = False
    is_clinical_trial: bool = False
    uses_hazardous_materials: bool = False
    short_title: Optional[str] = None
    research_area: Optional[str] = None
    lead_institution: Optional[str] = None
    department: Optional[str] = None


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    project_type: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    involves_human_subjects: Optional[bool] = None
    involves_animal_subjects: Optional[bool] = None
    involves_sensitive_data: Optional[bool] = None
    is_clinical_trial: Optional[bool] = None
    uses_hazardous_materials: Optional[bool] = None
    short_title: Optional[str] = None
    research_area: Optional[str] = None
    lead_institution: Optional[str] = None
    department: Optional[str] = None
    pi_full_name: Optional[str] = None
    pi_academic_title: Optional[str] = None
    pi_email: Optional[str] = None
    pi_phone: Optional[str] = None
    pi_orcid: Optional[str] = None
    pi_staff_id: Optional[str] = None
    project_abstract: Optional[str] = None
    background_rationale: Optional[str] = None
    problem_statement: Optional[str] = None
    research_methodology: Optional[str] = None
    research_design: Optional[str] = None
    target_population: Optional[str] = None
    research_keywords: Optional[List[str]] = None
    research_objectives: Optional[List[dict]] = None
    dmp_entry_mode: Optional[str] = None
    dmp_types_of_data: Optional[str] = None
    dmp_estimated_volume: Optional[str] = None
    dmp_data_formats: Optional[str] = None
    dmp_primary_storage: Optional[str] = None
    dmp_backup_procedure: Optional[str] = None
    dmp_access_controls: Optional[str] = None
    dmp_retention_period: Optional[str] = None
    dmp_sharing_plan: Optional[str] = None
    dmp_repository: Optional[str] = None
    dmp_plan_title: Optional[str] = None
    dmp_linked_document_id: Optional[str] = None
    financial_overhead_rate: Optional[str] = None
    financial_notes: Optional[str] = None
    reporting_currency: Optional[str] = None
    conflict_of_interest: Optional[str] = None
    declaration_responses: Optional[dict] = None
    declaration_date: Optional[datetime] = None


class BudgetLineCreate(BaseModel):
    category: str
    description: Optional[str] = None
    amount: int = 0


class BudgetLineUpdate(BaseModel):
    category: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[int] = None


class MemberInvite(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    given_name: Optional[str] = None
    family_name: Optional[str] = None
    affiliation: Optional[str] = None
    orcid: Optional[str] = None
    user_id: Optional[str] = None
    role: str = "co_investigator"


class MilestoneCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: str = "planned"
    priority: str = "medium"
    assigned_to_id: Optional[str] = None


class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    completed_at: Optional[datetime] = None


class TeamMemberInput(BaseModel):
    user_id: Optional[str] = None
    project_member_id: Optional[str] = None
    display_name: str
    role_label: Optional[str] = None


class TeamCreate(BaseModel):
    name: str
    members: List[TeamMemberInput]


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    members: Optional[List[TeamMemberInput]] = None


class DeliverableCreate(BaseModel):
    name: str
    deliverable_type: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: str = "pending"
    milestone_id: Optional[str] = None
    assignee_kind: Optional[str] = None
    assignee_user_id: Optional[str] = None
    assignee_member_id: Optional[str] = None
    assignee_team_id: Optional[str] = None


class DeliverableUpdate(BaseModel):
    name: Optional[str] = None
    deliverable_type: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None
    milestone_id: Optional[str] = None
    assignee_kind: Optional[str] = None
    assignee_user_id: Optional[str] = None
    assignee_member_id: Optional[str] = None
    assignee_team_id: Optional[str] = None


class TaskCreate(BaseModel):
    title: str
    due_date: Optional[datetime] = None
    priority: str = "medium"
    assigned_to_id: Optional[str] = None


class MemberOut(BaseModel):
    id: str
    role: str
    status: str
    invited_email: Optional[str]
    invited_name: Optional[str]
    invited_at: datetime
    joined_at: Optional[datetime]
    user_name: Optional[str] = None
    user_id: Optional[str] = None

    class Config:
        from_attributes = True


class MilestoneOut(BaseModel):
    id: str
    title: str
    description: Optional[str]
    due_date: Optional[datetime]
    completed_at: Optional[datetime]
    status: str
    priority: str
    assigned_to_id: Optional[str]
    assigned_to_name: Optional[str] = None
    task_count: int = 0
    done_count: int = 0

    class Config:
        from_attributes = True


class DocumentOut(BaseModel):
    id: str
    document_type: Optional[str]
    original_filename: Optional[str]
    file_size_bytes: Optional[int]
    mime_type: Optional[str]
    uploaded_at: datetime
    uploaded_by_name: Optional[str] = None

    class Config:
        from_attributes = True


class EthicsBasic(BaseModel):
    id: str
    title: Optional[str]
    status: str
    application_type: str
    submitted_at: Optional[datetime]
    approved_until: Optional[datetime]

    class Config:
        from_attributes = True


class ProjectOut(BaseModel):
    id: str
    title: str
    description: Optional[str]
    project_type: str
    project_code: Optional[str] = None
    status: str
    involves_human_subjects: bool
    award_id: Optional[str]
    award_number: Optional[str] = None
    funder_name: Optional[str] = None
    total_amount: Optional[int] = None
    currency: Optional[str] = None
    pi_id: str
    pi_name: Optional[str] = None
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    created_at: datetime
    member_count: int = 0
    milestone_count: int = 0
    done_milestone_count: int = 0
    ethics_status: Optional[str] = None
    research_area: Optional[str] = None

    class Config:
        from_attributes = True


# ─── load helpers ─────────────────────────────────────────────────────────────

_PROJECT_OPTS = [
    selectinload(ResearchProject.pi),
    selectinload(ResearchProject.award),
    selectinload(ResearchProject.members).selectinload(ProjectMember.user),
    selectinload(ResearchProject.milestones).selectinload(ProjectMilestone.tasks),
    selectinload(ResearchProject.milestones).selectinload(ProjectMilestone.assigned_to),
    selectinload(ResearchProject.teams).selectinload(ProjectTeam.members),
    selectinload(ResearchProject.deliverables).selectinload(ProjectDeliverable.milestone),
    selectinload(ResearchProject.deliverables).selectinload(ProjectDeliverable.assignee_user),
    selectinload(ResearchProject.deliverables).selectinload(ProjectDeliverable.assignee_member),
    selectinload(ResearchProject.deliverables).selectinload(ProjectDeliverable.assignee_team).selectinload(ProjectTeam.members),
    selectinload(ResearchProject.budget_lines),
    selectinload(ResearchProject.project_documents).selectinload(ProjectDocument.uploaded_by),
    selectinload(ResearchProject.ethics_applications),
]


def _serialize_team_member(m: ProjectTeamMember) -> dict:
    return {
        "id": m.id,
        "user_id": m.user_id,
        "project_member_id": m.project_member_id,
        "display_name": m.display_name,
        "role_label": m.role_label,
    }


def _serialize_team(t: ProjectTeam) -> dict:
    return {
        "id": t.id,
        "name": t.name,
        "created_at": t.created_at,
        "members": [_serialize_team_member(m) for m in (t.members or [])],
    }


def _resolve_deliverable_label(d: ProjectDeliverable) -> Optional[str]:
    if d.responsible_label:
        return d.responsible_label
    if d.assignee_kind == "team" and d.assignee_team:
        member_names = ", ".join(m.display_name for m in (d.assignee_team.members or []))
        return f"{d.assignee_team.name} ({member_names})" if member_names else d.assignee_team.name
    if d.assignee_user:
        return d.assignee_user.name
    if d.assignee_member:
        return d.assignee_member.user.name if d.assignee_member.user else (
            d.assignee_member.invited_name or d.assignee_member.invited_email
        )
    return None


def _serialize_deliverable(d: ProjectDeliverable) -> dict:
    return {
        "id": d.id,
        "name": d.name,
        "deliverable_type": d.deliverable_type,
        "description": d.description,
        "due_date": d.due_date,
        "status": d.status,
        "milestone_id": d.milestone_id,
        "assignee_kind": d.assignee_kind,
        "assignee_user_id": d.assignee_user_id,
        "assignee_member_id": d.assignee_member_id,
        "assignee_team_id": d.assignee_team_id,
        "responsible_label": _resolve_deliverable_label(d),
        "item_order": d.item_order,
        "created_at": d.created_at,
    }


async def _ensure_project_editable(project: ResearchProject) -> None:
    status = project.status.value if hasattr(project.status, "value") else project.status
    if status != ProjectStatus.DRAFT.value:
        raise HTTPException(
            status_code=403,
            detail="This project has been submitted and can no longer be edited.",
        )


async def _ensure_project_owner(db: AsyncSession, project_id: str, user_id: str) -> ResearchProject:
    result = await db.execute(select(ResearchProject).where(ResearchProject.id == project_id))
    project = result.scalar_one_or_none()
    if not project or project.pi_id != user_id:
        raise HTTPException(404, "Project not found or access denied")
    return project


async def _ensure_project_owner_editable(db: AsyncSession, project_id: str, user_id: str) -> ResearchProject:
    project = await _ensure_project_owner(db, project_id, user_id)
    await _ensure_project_editable(project)
    return project


async def _compute_responsible_label(
    db: AsyncSession,
    assignee_kind: Optional[str],
    assignee_user_id: Optional[str],
    assignee_member_id: Optional[str],
    assignee_team_id: Optional[str],
) -> Optional[str]:
    if assignee_kind == "team" and assignee_team_id:
        result = await db.execute(
            select(ProjectTeam)
            .where(ProjectTeam.id == assignee_team_id)
            .options(selectinload(ProjectTeam.members))
        )
        team = result.scalar_one_or_none()
        if not team:
            return None
        member_names = ", ".join(m.display_name for m in (team.members or []))
        return f"{team.name} ({member_names})" if member_names else team.name
    if assignee_user_id:
        result = await db.execute(select(User).where(User.id == assignee_user_id))
        user = result.scalar_one_or_none()
        return user.name if user else None
    if assignee_member_id:
        result = await db.execute(
            select(ProjectMember)
            .where(ProjectMember.id == assignee_member_id)
            .options(selectinload(ProjectMember.user))
        )
        member = result.scalar_one_or_none()
        if not member:
            return None
        return member.user.name if member.user else (member.invited_name or member.invited_email)
    return None


def _parse_json_list(value, default=None):
    if default is None:
        default = []
    if value is None:
        return default
    if isinstance(value, list):
        return value
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else default
    except (TypeError, json.JSONDecodeError):
        return default


def _parse_json_dict(value, default=None):
    if default is None:
        default = {}
    if value is None:
        return default
    if isinstance(value, dict):
        return value
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, dict) else default
    except (TypeError, json.JSONDecodeError):
        return default


def _serialize_project(p: ResearchProject) -> dict:
    latest_ethics = None
    if p.ethics_applications:
        latest_ethics = sorted(p.ethics_applications, key=lambda e: e.created_at, reverse=True)[0]
    year = p.created_at.year if p.created_at else datetime.now().year
    project_code = p.project_code or f"PRJ-{year}-{p.id[:8].upper()}"
    award = p.award
    return {
        "id": p.id,
        "title": p.title,
        "description": p.description,
        "project_type": p.project_type,
        "project_code": project_code,
        "short_title": p.short_title,
        "research_area": p.research_area,
        "lead_institution": p.lead_institution,
        "department": p.department,
        "pi_full_name": p.pi_full_name,
        "pi_academic_title": p.pi_academic_title,
        "pi_email": p.pi_email,
        "pi_phone": p.pi_phone,
        "pi_orcid": p.pi_orcid or (p.pi.orcid_id if p.pi else None),
        "pi_staff_id": p.pi_staff_id,
        "project_abstract": p.project_abstract,
        "background_rationale": p.background_rationale,
        "problem_statement": p.problem_statement,
        "research_methodology": p.research_methodology,
        "research_design": p.research_design,
        "target_population": p.target_population,
        "research_keywords": _parse_json_list(getattr(p, "research_keywords", None)),
        "research_objectives": _parse_json_list(getattr(p, "research_objectives", None)),
        "dmp_entry_mode": getattr(p, "dmp_entry_mode", None) or "upload",
        "dmp_types_of_data": getattr(p, "dmp_types_of_data", None),
        "dmp_estimated_volume": getattr(p, "dmp_estimated_volume", None),
        "dmp_data_formats": getattr(p, "dmp_data_formats", None),
        "dmp_primary_storage": getattr(p, "dmp_primary_storage", None),
        "dmp_backup_procedure": getattr(p, "dmp_backup_procedure", None),
        "dmp_access_controls": getattr(p, "dmp_access_controls", None),
        "dmp_retention_period": getattr(p, "dmp_retention_period", None),
        "dmp_sharing_plan": getattr(p, "dmp_sharing_plan", None),
        "dmp_repository": getattr(p, "dmp_repository", None),
        "dmp_plan_title": getattr(p, "dmp_plan_title", None),
        "dmp_linked_document_id": getattr(p, "dmp_linked_document_id", None),
        "financial_overhead_rate": getattr(p, "financial_overhead_rate", None),
        "financial_notes": getattr(p, "financial_notes", None),
        "reporting_currency": getattr(p, "reporting_currency", None) or "KES",
        "conflict_of_interest": getattr(p, "conflict_of_interest", None),
        "declaration_responses": _parse_json_dict(getattr(p, "declaration_responses", None)),
        "declaration_date": getattr(p, "declaration_date", None),
        "status": p.status.value if hasattr(p.status, "value") else p.status,
        "involves_human_subjects": p.involves_human_subjects,
        "involves_animal_subjects": getattr(p, "involves_animal_subjects", False),
        "involves_sensitive_data": getattr(p, "involves_sensitive_data", False),
        "is_clinical_trial": getattr(p, "is_clinical_trial", False),
        "uses_hazardous_materials": getattr(p, "uses_hazardous_materials", False),
        "award_id": p.award_id,
        "award_number": award.award_number if award else None,
        "funder_name": award.funder_name if award else None,
        "total_amount": award.total_amount if award else None,
        "currency": (award.currency if award else None) or getattr(p, "reporting_currency", None) or "KES",
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


async def _generate_project_code(db: AsyncSession, institution_id: str) -> str:
    year = datetime.now().year
    result = await db.execute(
        select(func.count())
        .select_from(ResearchProject)
        .where(
            ResearchProject.institution_id == institution_id,
            ResearchProject.created_at >= datetime(year, 1, 1, tzinfo=timezone.utc),
        )
    )
    count = (result.scalar() or 0) + 1
    return f"PRJ-{year}-{count:03d}"


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
    # For researchers (non-admin users), only show their own projects
    if current_user.primary_account_type == PrimaryAccountType.RESEARCHER and not current_user.is_global_admin and not current_user.is_institution_admin:
        q = q.where(ResearchProject.pi_id == current_user.id)
    result = await db.execute(q.order_by(ResearchProject.created_at.desc()))
    return [_serialize_project(p) for p in result.scalars().all()]


@router.get("/my/dmp-documents")
async def list_my_dmp_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    result = await db.execute(
        select(ResearchProject)
        .where(ResearchProject.pi_id == current_user.id)
        .options(
            selectinload(ResearchProject.project_documents),
            selectinload(ResearchProject.pi),
            selectinload(ResearchProject.award),
        )
        .order_by(ResearchProject.created_at.desc())
    )

    def dmp_status(project: ResearchProject) -> str:
        status = project.status.value if hasattr(project.status, "value") else project.status
        if status == ProjectStatus.DRAFT.value:
            return "draft"
        if status == ProjectStatus.PROPOSED.value:
            return "submitted"
        if status in (ProjectStatus.ACTIVE.value, ProjectStatus.COMPLETED.value):
            return "approved"
        return "draft"

    documents = []
    for project in result.scalars().all():
        for doc in (project.project_documents or []):
            if doc.document_type != "data_management_plan":
                continue
            uploaded_at = doc.uploaded_at
            ref_suffix = uploaded_at.strftime("%Y") if uploaded_at else "0000"
            documents.append({
                "id": doc.id,
                "ref": f"DMP-{ref_suffix}-{doc.id[:6].upper()}",
                "title": project.dmp_plan_title or f"Data Management Plan — {project.title}",
                "original_filename": doc.original_filename,
                "uploaded_at": uploaded_at,
                "project_id": project.id,
                "project_title": project.title,
                "pi": project.pi.name if project.pi else (project.pi_full_name or current_user.name),
                "data_steward": project.pi_full_name or (project.pi.name if project.pi else current_user.name),
                "funder": project.award.funder_name if project.award else None,
                "repository": project.dmp_repository,
                "data_volume": project.dmp_estimated_volume,
                "status": dmp_status(project),
                "file_size_bytes": doc.file_size_bytes,
            })

    documents.sort(
        key=lambda item: item["uploaded_at"] or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    return documents


def _apply_parsed_dmp_fields(project: ResearchProject, parsed: dict, overrides: dict) -> None:
    project.dmp_entry_mode = "upload"
    project.dmp_plan_title = overrides.get("plan_title") or parsed.get("plan_title")
    for field, attr in (
        ("types_of_data", "dmp_types_of_data"),
        ("estimated_volume", "dmp_estimated_volume"),
        ("data_formats", "dmp_data_formats"),
        ("repository", "dmp_repository"),
        ("retention_period", "dmp_retention_period"),
        ("primary_storage", "dmp_primary_storage"),
    ):
        value = overrides.get(field) or parsed.get(field)
        if value:
            setattr(project, attr, value)


async def _parse_uploaded_dmp_file(file: UploadFile, project_title: Optional[str] = None) -> tuple[dict, str]:
    suffix = os.path.splitext(file.filename or "")[1] or ".bin"
    content = await file.read()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    parsed = parse_dmp_fields(tmp_path, file.content_type, file.filename, project_title)
    return parsed, tmp_path


@router.post("/dmp/parse-preview")
async def parse_dmp_preview(
    file: UploadFile = File(...),
    project_id: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR])),
):
    project_title = None
    if project_id:
        result = await db.execute(select(ResearchProject).where(
            ResearchProject.id == project_id,
            ResearchProject.pi_id == current_user.id,
        ))
        project = result.scalar_one_or_none()
        if project:
            project_title = project.title

    parsed, tmp_path = await _parse_uploaded_dmp_file(file, project_title)
    os.unlink(tmp_path)
    return parsed


@router.post("/{project_id}/dmp-upload", status_code=201)
async def upload_dmp_document(
    project_id: str,
    file: UploadFile = File(...),
    plan_title: Optional[str] = Form(None),
    types_of_data: Optional[str] = Form(None),
    estimated_volume: Optional[str] = Form(None),
    data_formats: Optional[str] = Form(None),
    repository: Optional[str] = Form(None),
    retention_period: Optional[str] = Form(None),
    primary_storage: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR])),
):
    result = await db.execute(select(ResearchProject).where(ResearchProject.id == project_id))
    project = result.scalar_one_or_none()
    if not project or project.pi_id != current_user.id:
        raise HTTPException(404, "Project not found")
    if project.institution_id != current_user.primary_institution_id:
        raise HTTPException(404, "Project not found")

    parsed, tmp_path = await _parse_uploaded_dmp_file(file, project.title)
    try:
        overrides = {
            "plan_title": plan_title,
            "types_of_data": types_of_data,
            "estimated_volume": estimated_volume,
            "data_formats": data_formats,
            "repository": repository,
            "retention_period": retention_period,
            "primary_storage": primary_storage,
        }
        _apply_parsed_dmp_fields(project, parsed, overrides)

        existing_docs = await db.execute(select(ProjectDocument).where(
            ProjectDocument.project_id == project_id,
            ProjectDocument.document_type == "data_management_plan",
        ))
        for old_doc in existing_docs.scalars().all():
            await db.delete(old_doc)
        await db.flush()

        await file.seek(0)
        file_info = await save_upload(file, subfolder="projects")
        doc = ProjectDocument(
            project_id=project_id,
            document_type="data_management_plan",
            uploaded_by_id=current_user.id,
            **file_info,
        )
        db.add(doc)
        await db.flush()
        project.dmp_linked_document_id = doc.id
        await db.commit()
        await db.refresh(doc)

        return {
            "id": doc.id,
            "original_filename": doc.original_filename,
            "project_id": project_id,
            "metadata": {
                "plan_title": project.dmp_plan_title,
                "types_of_data": project.dmp_types_of_data,
                "estimated_volume": project.dmp_estimated_volume,
                "data_formats": project.dmp_data_formats,
                "repository": project.dmp_repository,
                "retention_period": project.dmp_retention_period,
                "primary_storage": project.dmp_primary_storage,
                "text_extracted": parsed.get("text_extracted", False),
            },
        }
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


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
    project.project_code = await _generate_project_code(db, current_user.primary_institution_id)
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
    project_id: str,
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
    data["teams"] = [_serialize_team(t) for t in (project.teams or [])]
    data["deliverables"] = [
        _serialize_deliverable(d)
        for d in sorted(project.deliverables or [], key=lambda x: (x.item_order, x.created_at or datetime.min.replace(tzinfo=timezone.utc)))
    ]
    data["budget_lines"] = [
        {
            "id": bl.id,
            "category": bl.category,
            "description": bl.description,
            "amount": bl.amount,
            "spent_to_date": bl.spent_to_date,
            "item_order": bl.item_order,
        }
        for bl in sorted(project.budget_lines or [], key=lambda x: (x.item_order, x.created_at or datetime.min.replace(tzinfo=timezone.utc)))
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
    project_id: str,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    result = await db.execute(select(ResearchProject).where(ResearchProject.id == project_id))
    project = result.scalar_one_or_none()
    if not project or project.pi_id != current_user.id:
        raise HTTPException(404, "Project not found or access denied")

    update_data = data.model_dump(exclude_unset=True)
    current_status = project.status.value if hasattr(project.status, "value") else project.status
    new_status = update_data.get("status")

    if current_status != ProjectStatus.DRAFT.value:
        raise HTTPException(403, "This project has been submitted and can no longer be edited.")

    if new_status and new_status not in (ProjectStatus.DRAFT.value, ProjectStatus.PROPOSED.value):
        raise HTTPException(400, "Invalid project status transition")

    for field, value in update_data.items():
        if field == "status" and value:
            setattr(project, field, ProjectStatus(value))
        elif field in ("research_keywords", "research_objectives"):
            setattr(project, field, json.dumps(value) if value is not None else None)
        elif field == "declaration_responses":
            setattr(project, field, json.dumps(value) if value is not None else None)
        elif field.startswith("involves_") or field.startswith("is_") or field.startswith("uses_"):
            setattr(project, field, value)
        elif field.startswith("pi_"):
            setattr(project, field, value if value != "" else None)
        elif value is not None:
            setattr(project, field, value)
    if any(
        f in data.model_dump(exclude_unset=True)
        for f in ("project_abstract", "background_rationale", "problem_statement", "research_methodology")
    ):
        project.description = " ".join(filter(None, [
            project.project_abstract,
            project.background_rationale,
            project.problem_statement,
            project.research_methodology,
        ])) or project.description
    await db.commit()
    return {"id": project_id, "updated": True}


# ─── MEMBERS ──────────────────────────────────────────────────────────────────

@router.get("/{project_id}/members")
async def list_members(
    project_id: str,
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
    project_id: str,
    data: MemberInvite,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    from services.email_service import EmailService

    result = await db.execute(select(ResearchProject).where(ResearchProject.id == project_id))
    project = result.scalar_one_or_none()
    if not project or project.pi_id != current_user.id:
        raise HTTPException(404, "Project not found or access denied")
    await _ensure_project_editable(project)

    name = data.name
    if not name and (data.given_name or data.family_name):
        name = f"{data.given_name or ''} {data.family_name or ''}".strip()

    user = None
    if data.user_id:
        user = await db.get(User, data.user_id)
        if not user or user.primary_institution_id != current_user.primary_institution_id:
            raise HTTPException(400, "Researcher not found in your institution")
    elif data.orcid:
        user_result = await db.execute(select(User).where(User.orcid_id == data.orcid))
        user = user_result.scalar_one_or_none()
    elif data.email:
        user_result = await db.execute(
            select(User).where(
                User.email == data.email,
                User.primary_institution_id == current_user.primary_institution_id,
            )
        )
        user = user_result.scalar_one_or_none()

    email = (data.email or (user.email if user else None) or "").strip().lower()
    if not email:
        raise HTTPException(400, "Email is required so the invitee can be notified")

    if user and user.id == project.pi_id:
        raise HTTPException(400, "The principal investigator is already on this project")

    dup_q = select(ProjectMember).where(ProjectMember.project_id == project_id)
    if user:
        dup_q = dup_q.where(ProjectMember.user_id == user.id)
    else:
        dup_q = dup_q.where(ProjectMember.invited_email == email)
    dup_result = await db.execute(dup_q)
    if dup_result.scalar_one_or_none():
        raise HTTPException(400, "This person has already been invited to the project")

    member = ProjectMember(
        project_id=project_id,
        user_id=user.id if user else None,
        role=data.role,
        status="accepted" if user else "pending",
        invited_email=email,
        invited_name=name or (user.name if user else email),
        joined_at=datetime.now(timezone.utc) if user else None,
    )
    db.add(member)
    await db.flush()

    project_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/researcher/projects/{project_id}"
    role_label = data.role.replace("_", " ").title()

    if user:
        await create_notification(
            db, user.id,
            title="Project Team Invitation",
            message=f"{current_user.name} invited you to join '{project.title}' as {role_label}",
            entity_type="project", entity_id=project_id,
            link=f"/researcher/projects/{project_id}",
        )
        try:
            await EmailService.send_collaboration_invite_email(
                email=user.email,
                inviter_name=current_user.name or "A colleague",
                proposal_title=project.title,
                role=role_label,
                proposal_url=project_url,
            )
        except Exception as e:
            print(f"Failed to send project invite email to {user.email}: {e}")
    else:
        try:
            await EmailService.send_collaboration_invite_email(
                email=email,
                inviter_name=current_user.name or "A colleague",
                proposal_title=project.title,
                role=role_label,
                proposal_url=project_url,
            )
        except Exception as e:
            print(f"Failed to send project invite email to {email}: {e}")

    await db.commit()
    return {"id": member.id, "status": member.status}


@router.delete("/{project_id}/members/{member_id}", status_code=204)
async def remove_member(
    project_id: str,
    member_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    await _ensure_project_owner_editable(db, project_id, current_user.id)
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
    project_id: str,
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
    project_id: str,
    data: MilestoneCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    await _ensure_project_owner_editable(db, project_id, current_user.id)

    payload = data.model_dump()
    if not payload.get("status"):
        payload["status"] = "planned"
    milestone = ProjectMilestone(project_id=project_id, **payload)
    db.add(milestone)
    await db.commit()
    await db.refresh(milestone)
    return {"id": milestone.id, "title": milestone.title, "status": milestone.status}


@router.patch("/{project_id}/milestones/{milestone_id}")
async def update_milestone(
    project_id: str,
    milestone_id: str,
    data: MilestoneUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    await _ensure_project_owner_editable(db, project_id, current_user.id)
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


@router.delete("/{project_id}/milestones/{milestone_id}")
async def delete_milestone(
    project_id: str,
    milestone_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    await _ensure_project_owner_editable(db, project_id, current_user.id)
    result = await db.execute(
        select(ProjectMilestone).where(
            ProjectMilestone.id == milestone_id,
            ProjectMilestone.project_id == project_id,
        )
    )
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise HTTPException(404, "Milestone not found")
    await db.delete(milestone)
    await db.commit()
    return {"deleted": True}


@router.post("/{project_id}/milestones/{milestone_id}/tasks", status_code=201)
async def add_task(
    project_id: str,
    milestone_id: str,
    data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    task = ProjectTask(milestone_id=milestone_id, **data.model_dump())
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return {"id": task.id, "title": task.title}


# ─── PROJECT TEAMS ────────────────────────────────────────────────────────────

@router.get("/{project_id}/teams")
async def list_teams(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER,
    ]))
):
    result = await db.execute(
        select(ProjectTeam)
        .where(ProjectTeam.project_id == project_id)
        .options(selectinload(ProjectTeam.members))
        .order_by(ProjectTeam.created_at)
    )
    return [_serialize_team(t) for t in result.scalars().all()]


@router.post("/{project_id}/teams", status_code=201)
async def create_team(
    project_id: str,
    data: TeamCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    await _ensure_project_owner_editable(db, project_id, current_user.id)
    if not data.name.strip():
        raise HTTPException(400, "Team name is required")
    if not data.members:
        raise HTTPException(400, "Select at least one team member")

    team = ProjectTeam(
        project_id=project_id,
        name=data.name.strip(),
        created_by_id=current_user.id,
    )
    db.add(team)
    await db.flush()

    for member in data.members:
        db.add(ProjectTeamMember(
            team_id=team.id,
            user_id=member.user_id,
            project_member_id=member.project_member_id,
            display_name=member.display_name,
            role_label=member.role_label,
        ))
    await db.commit()
    await db.refresh(team)

    result = await db.execute(
        select(ProjectTeam)
        .where(ProjectTeam.id == team.id)
        .options(selectinload(ProjectTeam.members))
    )
    return _serialize_team(result.scalar_one())


@router.patch("/{project_id}/teams/{team_id}")
async def update_team(
    project_id: str,
    team_id: str,
    data: TeamUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    await _ensure_project_owner_editable(db, project_id, current_user.id)
    result = await db.execute(
        select(ProjectTeam)
        .where(ProjectTeam.id == team_id, ProjectTeam.project_id == project_id)
        .options(selectinload(ProjectTeam.members))
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(404, "Team not found")

    if data.name is not None:
        team.name = data.name.strip()
    if data.members is not None:
        for existing in list(team.members or []):
            await db.delete(existing)
        await db.flush()
        for member in data.members:
            db.add(ProjectTeamMember(
                team_id=team.id,
                user_id=member.user_id,
                project_member_id=member.project_member_id,
                display_name=member.display_name,
                role_label=member.role_label,
            ))
    await db.commit()

    result = await db.execute(
        select(ProjectTeam)
        .where(ProjectTeam.id == team_id)
        .options(selectinload(ProjectTeam.members))
    )
    return _serialize_team(result.scalar_one())


@router.delete("/{project_id}/teams/{team_id}")
async def delete_team(
    project_id: str,
    team_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    await _ensure_project_owner_editable(db, project_id, current_user.id)
    result = await db.execute(
        select(ProjectTeam).where(ProjectTeam.id == team_id, ProjectTeam.project_id == project_id)
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(404, "Team not found")
    await db.delete(team)
    await db.commit()
    return {"deleted": True}


# ─── DELIVERABLES ─────────────────────────────────────────────────────────────

@router.get("/{project_id}/deliverables")
async def list_deliverables(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER,
    ]))
):
    result = await db.execute(
        select(ProjectDeliverable)
        .where(ProjectDeliverable.project_id == project_id)
        .options(
            selectinload(ProjectDeliverable.milestone),
            selectinload(ProjectDeliverable.assignee_user),
            selectinload(ProjectDeliverable.assignee_member).selectinload(ProjectMember.user),
            selectinload(ProjectDeliverable.assignee_team).selectinload(ProjectTeam.members),
        )
        .order_by(ProjectDeliverable.item_order, ProjectDeliverable.created_at)
    )
    return [_serialize_deliverable(d) for d in result.scalars().all()]


@router.post("/{project_id}/deliverables", status_code=201)
async def create_deliverable(
    project_id: str,
    data: DeliverableCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    await _ensure_project_owner_editable(db, project_id, current_user.id)
    if not data.name.strip():
        raise HTTPException(400, "Deliverable name is required")

    payload = data.model_dump()
    payload["name"] = data.name.strip()
    payload["responsible_label"] = await _compute_responsible_label(
        db,
        payload.get("assignee_kind"),
        payload.get("assignee_user_id"),
        payload.get("assignee_member_id"),
        payload.get("assignee_team_id"),
    )

    count_result = await db.execute(
        select(func.count()).select_from(ProjectDeliverable).where(ProjectDeliverable.project_id == project_id)
    )
    payload["item_order"] = count_result.scalar() or 0

    deliverable = ProjectDeliverable(project_id=project_id, **payload)
    db.add(deliverable)
    await db.commit()
    await db.refresh(deliverable)

    result = await db.execute(
        select(ProjectDeliverable)
        .where(ProjectDeliverable.id == deliverable.id)
        .options(
            selectinload(ProjectDeliverable.milestone),
            selectinload(ProjectDeliverable.assignee_user),
            selectinload(ProjectDeliverable.assignee_member).selectinload(ProjectMember.user),
            selectinload(ProjectDeliverable.assignee_team).selectinload(ProjectTeam.members),
        )
    )
    return _serialize_deliverable(result.scalar_one())


@router.patch("/{project_id}/deliverables/{deliverable_id}")
async def update_deliverable(
    project_id: str,
    deliverable_id: str,
    data: DeliverableUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    await _ensure_project_owner_editable(db, project_id, current_user.id)
    result = await db.execute(
        select(ProjectDeliverable).where(
            ProjectDeliverable.id == deliverable_id,
            ProjectDeliverable.project_id == project_id,
        )
    )
    deliverable = result.scalar_one_or_none()
    if not deliverable:
        raise HTTPException(404, "Deliverable not found")

    updates = data.model_dump(exclude_unset=True)
    if "name" in updates and updates["name"] is not None:
        updates["name"] = updates["name"].strip()

    assignee_fields = {"assignee_kind", "assignee_user_id", "assignee_member_id", "assignee_team_id"}
    for field, value in updates.items():
        setattr(deliverable, field, value)

    if assignee_fields.intersection(updates.keys()):
        deliverable.responsible_label = await _compute_responsible_label(
            db,
            deliverable.assignee_kind,
            deliverable.assignee_user_id,
            deliverable.assignee_member_id,
            deliverable.assignee_team_id,
        )

    await db.commit()
    return {"id": deliverable_id, "updated": True}


@router.delete("/{project_id}/deliverables/{deliverable_id}")
async def delete_deliverable(
    project_id: str,
    deliverable_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    await _ensure_project_owner_editable(db, project_id, current_user.id)
    result = await db.execute(
        select(ProjectDeliverable).where(
            ProjectDeliverable.id == deliverable_id,
            ProjectDeliverable.project_id == project_id,
        )
    )
    deliverable = result.scalar_one_or_none()
    if not deliverable:
        raise HTTPException(404, "Deliverable not found")
    await db.delete(deliverable)
    await db.commit()
    return {"deleted": True}


# ─── BUDGET LINES ─────────────────────────────────────────────────────────────

@router.post("/{project_id}/budget-lines", status_code=201)
async def create_budget_line(
    project_id: str,
    data: BudgetLineCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    await _ensure_project_owner_editable(db, project_id, current_user.id)
    if not data.category.strip():
        raise HTTPException(400, "Category is required")

    count_result = await db.execute(
        select(func.count()).select_from(ProjectBudgetLine).where(ProjectBudgetLine.project_id == project_id)
    )
    line = ProjectBudgetLine(
        project_id=project_id,
        category=data.category.strip(),
        description=data.description,
        amount=data.amount or 0,
        item_order=count_result.scalar() or 0,
    )
    db.add(line)
    await db.commit()
    await db.refresh(line)
    return {
        "id": line.id,
        "category": line.category,
        "description": line.description,
        "amount": line.amount,
        "spent_to_date": line.spent_to_date,
        "item_order": line.item_order,
    }


@router.patch("/{project_id}/budget-lines/{line_id}")
async def update_budget_line(
    project_id: str,
    line_id: str,
    data: BudgetLineUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    await _ensure_project_owner_editable(db, project_id, current_user.id)
    result = await db.execute(
        select(ProjectBudgetLine).where(
            ProjectBudgetLine.id == line_id,
            ProjectBudgetLine.project_id == project_id,
        )
    )
    line = result.scalar_one_or_none()
    if not line:
        raise HTTPException(404, "Budget line not found")

    updates = data.model_dump(exclude_unset=True)
    if "category" in updates and updates["category"] is not None:
        updates["category"] = updates["category"].strip()
    for field, value in updates.items():
        setattr(line, field, value)
    await db.commit()
    return {"id": line_id, "updated": True}


@router.delete("/{project_id}/budget-lines/{line_id}")
async def delete_budget_line(
    project_id: str,
    line_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    await _ensure_project_owner_editable(db, project_id, current_user.id)
    result = await db.execute(
        select(ProjectBudgetLine).where(
            ProjectBudgetLine.id == line_id,
            ProjectBudgetLine.project_id == project_id,
        )
    )
    line = result.scalar_one_or_none()
    if not line:
        raise HTTPException(404, "Budget line not found")
    await db.delete(line)
    await db.commit()
    return {"deleted": True}


# ─── DOCUMENTS ────────────────────────────────────────────────────────────────

@router.get("/{project_id}/documents")
async def list_documents(
    project_id: str,
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
    project_id: str,
    document_type: str = Form("general"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    result = await db.execute(select(ResearchProject).where(ResearchProject.id == project_id))
    project = result.scalar_one_or_none()
    if not project or project.pi_id != current_user.id:
        raise HTTPException(404, "Project not found")
    if project.institution_id != current_user.primary_institution_id:
        raise HTTPException(404, "Project not found")

    file_info = await save_upload(file, subfolder="projects")
    doc = ProjectDocument(
        project_id=project_id,
        document_type=document_type,
        uploaded_by_id=current_user.id,
        **file_info,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return {"id": doc.id, "original_filename": doc.original_filename}


# ─── Reviewer Assignment ─────────────────────────────────────────────────────

class AssignProjectReviewerBody(BaseModel):
    reviewer_id: Optional[str] = None
    new_reviewer_email: Optional[str] = None
    new_reviewer_name: Optional[str] = None
    new_reviewer_expertise: Optional[list[str]] = None
    notes: Optional[str] = None


@router.post("/{project_id}/assign-reviewer")
async def assign_project_reviewer(
    project_id: str,
    body: AssignProjectReviewerBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.GRANT_OFFICER, ResearchRole.INSTITUTIONAL_LEAD,
        ResearchRole.RESEARCH_ADMIN, ResearchRole.SYSTEM_ADMIN
    ]))
):
    """Assign a reviewer to a research project."""
    project = await db.get(ResearchProject, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    
    # Determine reviewer - either existing or create new
    reviewer = None
    is_new_reviewer = False
    needs_signup = False
    signup_token = None
    
    if body.reviewer_id:
        reviewer = await db.get(User, body.reviewer_id)
        if not reviewer:
            raise HTTPException(404, "Reviewer not found")
        needs_signup = not reviewer.password_hash
    elif body.new_reviewer_email:
        reviewer, needs_signup, signup_token = await get_or_create_reviewer_user(
            db,
            email=body.new_reviewer_email,
            name=body.new_reviewer_name,
            institution_id=current_user.primary_institution_id,
            invited_by_id=current_user.id,
            role=ResearchRole.EXTERNAL_REVIEWER,
            expertise=body.new_reviewer_expertise,
        )
        is_new_reviewer = needs_signup
    else:
        raise HTTPException(400, "Either reviewer_id or new_reviewer_email must be provided")

    if needs_signup and not signup_token:
        import secrets
        signup_token = secrets.token_urlsafe(32)
    
    # Create reviewer assignment
    assignment = ReviewerAssignment(
        institution_id=current_user.primary_institution_id,
        reviewer_id=reviewer.id,
        invited_email=reviewer.email,
        invited_name=reviewer.name,
        review_type=ReviewType.PROJECT,
        entity_id=project_id,
        entity_title=project.title,
        assigned_by_id=current_user.id,
        status=ReviewerAssignmentStatus.PENDING_SIGNUP if needs_signup else ReviewerAssignmentStatus.ASSIGNED,
        signup_token=signup_token if needs_signup else None,
        notes=body.notes,
    )
    db.add(assignment)
    
    if not needs_signup:
        await create_notification(
            db, reviewer.id,
            title="Project review assignment",
            message=f'You have been assigned to review the project: "{project.title}".',
            entity_type="project", entity_id=project_id,
        )
    
    await db.commit()
    await db.refresh(assignment)
    
    from services.email_service import EmailService
    
    token = assignment.signup_token if needs_signup else assignment.invitation_token
    await EmailService.send_review_assignment_email(
        email=reviewer.email,
        reviewer_name=reviewer.name,
        review_type="project",
        entity_title=project.title,
        inviter_name=current_user.name or current_user.email,
        invitation_token=token,
        has_account=not needs_signup,
    )
    
    return {
        "reviewer_id": reviewer.id,
        "reviewer_name": reviewer.name,
        "reviewer_email": reviewer.email,
        "is_new_reviewer": is_new_reviewer,
    }


@router.get("/reviewers/available")
async def list_available_project_reviewers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.GRANT_OFFICER, ResearchRole.INSTITUTIONAL_LEAD,
        ResearchRole.RESEARCH_ADMIN, ResearchRole.SYSTEM_ADMIN
    ]))
):
    """List available reviewers for project review."""
    from sqlalchemy import text
    result = await db.execute(
        text("""
            SELECT DISTINCT u.id, u.name, u.email, array_agg(DISTINCT ur.role::text) as roles
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            WHERE u.primary_institution_id = :inst_id
              AND u.status = 'active'
              AND (ur.role IN ('external_reviewer', 'ethics_reviewer', 'grant_officer', 'research_admin')
                   OR u.primary_account_type IN ('EXTERNAL_REVIEWER', 'ETHICS_COMMITTEE_MEMBER'))
            GROUP BY u.id, u.name, u.email
            ORDER BY u.name
        """),
        {"inst_id": current_user.primary_institution_id}
    )
    reviewers = []
    for row in result:
        reviewers.append({
            "id": row[0],
            "name": row[1],
            "email": row[2],
            "roles": ', '.join(row[3]) if row[3] else 'Reviewer',
        })
    
    if not reviewers:
        reviewers.append({
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "roles": "You (fallback)",
        })
    
    return reviewers
