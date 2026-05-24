from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import os, uuid, shutil

from database import get_db
from models import (EthicsApplication, EthicsStatus, EthicsDocument,
                    ResearchProject, User)
from auth import require_roles, ResearchRole
from services.workflow import can_transition_ethics
from services.ethics_certificate_parser import (
    extract_text_from_file, parse_certificate_fields, build_certificate_notes,
)
from services.notifications import create_notification

router = APIRouter(prefix="/api/research/ethics", tags=["ethics"])

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/tmp/uploads/ethics")
os.makedirs(UPLOAD_DIR, exist_ok=True)

_ETHICS_LOAD = [
    selectinload(EthicsApplication.project),
    selectinload(EthicsApplication.submitted_by),
    selectinload(EthicsApplication.documents).selectinload(EthicsDocument.uploaded_by),
]

ETHICS_STAGES = [
    "submitted", "screened", "assigned", "under_review", "decision", "final_approval"
]


class EthicsCreate(BaseModel):
    project_id: str
    application_type: str = "full_review"
    title: str
    lay_summary: Optional[str] = None
    methodology: Optional[str] = None
    risk_assessment: Optional[str] = None
    data_handling: Optional[str] = None


class EthicsOut(BaseModel):
    id: str
    project_id: str
    application_type: str
    status: str
    title: Optional[str]
    submitted_at: Optional[datetime]
    approved_until: Optional[datetime]
    created_at: datetime
    project_title: Optional[str] = None
    stage_index: int = 0
    document_count: int = 0

    class Config:
        from_attributes = True


def _ethics_ref(app: EthicsApplication) -> str:
    year = app.created_at.year if app.created_at else datetime.now(timezone.utc).year
    suffix = (app.id or "")[:8].upper()
    if app.application_type == "existing_clearance":
        return f"ETHICS-CERT-{year}-{suffix}"
    return f"ETHICS-APP-{year}-{suffix}"


def _serialize_ethics(app: EthicsApplication) -> dict:
    status_val = app.status.value if hasattr(app.status, "value") else app.status
    stage_idx = ETHICS_STAGES.index(status_val) if status_val in ETHICS_STAGES else 0
    return {
        "id": app.id,
        "ref": _ethics_ref(app),
        "project_id": app.project_id,
        "application_type": app.application_type,
        "status": status_val,
        "title": app.title,
        "lay_summary": app.lay_summary,
        "methodology": app.methodology,
        "risk_assessment": app.risk_assessment,
        "data_handling": app.data_handling,
        "submitted_at": app.submitted_at,
        "approved_until": app.approved_until,
        "decision_notes": app.decision_notes,
        "created_at": app.created_at,
        "project_title": app.project.title if app.project else None,
        "submitted_by_name": app.submitted_by.name if app.submitted_by else None,
        "pi": app.submitted_by.name if app.submitted_by else None,
        "stage_index": stage_idx,
        "document_count": len(app.documents) if app.documents else 0,
        "is_certificate": app.application_type == "existing_clearance",
        "documents": [
            {
                "id": d.id, "document_type": d.document_type,
                "original_filename": d.original_filename,
                "file_size_bytes": d.file_size_bytes,
                "uploaded_at": d.uploaded_at,
                "uploaded_by_name": d.uploaded_by.name if d.uploaded_by else None,
            }
            for d in (app.documents or [])
        ],
    }


@router.get("/my")
async def list_my_applications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    result = await db.execute(
        select(EthicsApplication)
        .where(EthicsApplication.submitted_by_id == current_user.id)
        .options(*_ETHICS_LOAD)
        .order_by(EthicsApplication.created_at.desc())
    )
    return [_serialize_ethics(a) for a in result.scalars().all()]


async def _load_user_projects(db: AsyncSession, user: User) -> list[ResearchProject]:
    result = await db.execute(
        select(ResearchProject).where(
            ResearchProject.institution_id == user.primary_institution_id
        )
    )
    return list(result.scalars().all())


@router.post("/certificates/analyze")
async def analyze_certificate(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR])),
):
    """Extract suggested certificate metadata from an uploaded file."""
    ext = os.path.splitext(file.filename or "")[1]
    stored = f"analyze_{uuid.uuid4().hex}{ext}"
    dest = os.path.join(UPLOAD_DIR, stored)
    try:
        with open(dest, "wb") as f:
            shutil.copyfileobj(file.file, f)

        text = extract_text_from_file(dest, file.content_type, file.filename)
        projects = await _load_user_projects(db, current_user)
        project_payload = [{"id": p.id, "title": p.title} for p in projects]
        parsed = parse_certificate_fields(text, file.filename, project_payload)
        return parsed
    finally:
        if os.path.isfile(dest):
            os.remove(dest)


@router.post("/certificates", status_code=201)
async def upload_existing_certificate(
    file: UploadFile = File(...),
    project_id: Optional[str] = Form(None),
    title: Optional[str] = Form(None),
    issuing_body: Optional[str] = Form(None),
    approved_until: Optional[str] = Form(None),
    approval_date: Optional[str] = Form(None),
    protocol_id: Optional[str] = Form(None),
    principal_investigator: Optional[str] = Form(None),
    review_type: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR])),
):
    """Register an externally issued ethics approval certificate."""
    project = None
    if project_id and project_id.strip():
        project = await db.get(ResearchProject, project_id.strip())
        if not project or project.institution_id != current_user.primary_institution_id:
            raise HTTPException(404, "Project not found")

    ext = os.path.splitext(file.filename or "")[1]
    stored = f"{uuid.uuid4().hex}{ext}"
    dest = os.path.join(UPLOAD_DIR, stored)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    size = os.path.getsize(dest)

    text = extract_text_from_file(dest, file.content_type, file.filename)
    projects = await _load_user_projects(db, current_user)
    parsed = parse_certificate_fields(
        text, file.filename, [{"id": p.id, "title": p.title} for p in projects]
    )

    title = (title or "").strip() or parsed.get("title")
    issuing_body = (issuing_body or "").strip() or parsed.get("issuing_body")
    protocol_id = (protocol_id or "").strip() or parsed.get("protocol_id")
    principal_investigator = (principal_investigator or "").strip() or parsed.get("principal_investigator")
    review_type = (review_type or "").strip() or parsed.get("review_type")
    approval_date = (approval_date or "").strip() or parsed.get("approval_date")

    expiry = None
    expiry_raw = (approved_until or "").strip() or parsed.get("approved_until")
    if expiry_raw:
        try:
            expiry = datetime.fromisoformat(expiry_raw.replace("Z", "+00:00"))
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=timezone.utc)
        except ValueError:
            raise HTTPException(400, "Invalid approved_until date format")

    if not project and parsed.get("suggested_project_id"):
        project = await db.get(ResearchProject, parsed["suggested_project_id"])

    stem = os.path.splitext(file.filename or "certificate")[0].replace("_", " ").replace("-", " ").strip()
    cert_title = title or (
        f"Ethics Certificate — {project.title}" if project else f"Ethics Certificate — {stem.title() or 'Upload'}"
    )
    notes = build_certificate_notes({
        "issuing_body": issuing_body,
        "protocol_id": protocol_id,
        "principal_investigator": principal_investigator,
        "approval_date": approval_date,
        "review_type": review_type,
        "entity_approved": parsed.get("entity_approved"),
    })

    app = EthicsApplication(
        institution_id=current_user.primary_institution_id,
        submitted_by_id=current_user.id,
        project_id=project.id if project else None,
        application_type="existing_clearance",
        status=EthicsStatus.APPROVED,
        title=cert_title,
        decision_notes=notes,
        submitted_at=datetime.now(timezone.utc),
        approved_until=expiry,
    )
    db.add(app)
    await db.flush()

    doc = EthicsDocument(
        ethics_application_id=app.id,
        document_type="ethics_clearance_certificate",
        original_filename=file.filename or stored,
        stored_filename=stored,
        file_path=dest,
        file_size_bytes=size,
        mime_type=file.content_type or "application/octet-stream",
        uploaded_by_id=current_user.id,
    )
    db.add(doc)
    await db.commit()

    result = await db.execute(
        select(EthicsApplication).where(EthicsApplication.id == app.id).options(*_ETHICS_LOAD)
    )
    return _serialize_ethics(result.scalar_one())


@router.get("/documents/{doc_id}/download")
async def download_ethics_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR])),
):
    result = await db.execute(
        select(EthicsDocument)
        .where(EthicsDocument.id == doc_id)
        .options(selectinload(EthicsDocument.ethics_application))
    )
    doc = result.scalar_one_or_none()
    if not doc or not doc.ethics_application:
        raise HTTPException(404, "Document not found")
    if doc.ethics_application.institution_id != current_user.primary_institution_id:
        raise HTTPException(403, "Access denied")
    if doc.ethics_application.submitted_by_id != current_user.id:
        raise HTTPException(403, "Access denied")

    path = doc.file_path if doc.file_path and os.path.isfile(doc.file_path) else os.path.join(UPLOAD_DIR, doc.stored_filename)
    if not os.path.isfile(path):
        raise HTTPException(404, "File not found on server")

    return FileResponse(
        path,
        filename=doc.original_filename,
        media_type=doc.mime_type or "application/octet-stream",
    )


@router.post("", status_code=201)
async def submit_ethics_application(
    data: EthicsCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    project = await db.get(ResearchProject, data.project_id)
    if not project or project.institution_id != current_user.primary_institution_id:
        raise HTTPException(404, "Project not found")

    app = EthicsApplication(
        institution_id=current_user.primary_institution_id,
        submitted_by_id=current_user.id,
        status=EthicsStatus.SUBMITTED,
        submitted_at=datetime.now(timezone.utc),
        **data.model_dump()
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)

    result = await db.execute(
        select(EthicsApplication).where(EthicsApplication.id == app.id).options(*_ETHICS_LOAD)
    )
    return _serialize_ethics(result.scalar_one())


@router.get("/project/{project_id}")
async def get_project_ethics(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.ETHICS_REVIEWER
    ]))
):
    result = await db.execute(
        select(EthicsApplication)
        .where(EthicsApplication.project_id == project_id)
        .options(*_ETHICS_LOAD)
        .order_by(EthicsApplication.created_at.desc())
    )
    return [_serialize_ethics(a) for a in result.scalars().all()]


@router.post("/{app_id}/documents", status_code=201)
async def upload_ethics_document(
    app_id: str,
    document_type: str = Form("protocol"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    result = await db.execute(select(EthicsApplication).where(EthicsApplication.id == app_id))
    app = result.scalar_one_or_none()
    if not app or app.institution_id != current_user.primary_institution_id:
        raise HTTPException(404, "Application not found")

    ext = os.path.splitext(file.filename or "")[1]
    stored = f"{uuid.uuid4().hex}{ext}"
    dest = os.path.join(UPLOAD_DIR, stored)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    doc = EthicsDocument(
        ethics_application_id=app_id,
        document_type=document_type,
        original_filename=file.filename or stored,
        stored_filename=stored,
        file_path=dest,
        file_size_bytes=os.path.getsize(dest),
        mime_type=file.content_type or "application/octet-stream",
        uploaded_by_id=current_user.id,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return {"id": doc.id, "original_filename": doc.original_filename}


@router.patch("/{app_id}/decision")
async def update_ethics_decision(
    app_id: str,
    target_status: EthicsStatus,
    decision_notes: Optional[str] = None,
    approved_until: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.ETHICS_REVIEWER
    ]))
):
    app = await db.get(EthicsApplication, app_id)
    if not app or app.institution_id != current_user.primary_institution_id:
        raise HTTPException(404, "Application not found")

    if not can_transition_ethics(app.status, target_status):
        raise HTTPException(400, f"Cannot move from {app.status} to {target_status}")

    app.status = target_status
    app.decision_notes = decision_notes
    if approved_until:
        app.approved_until = approved_until

    await db.commit()

    await create_notification(
        db, app.submitted_by_id,
        title=f"Ethics application: {target_status.value.replace('_', ' ').title()}",
        message=f'Your ethics application "{app.title}" has a new decision: {target_status.value}',
        entity_type="ethics", entity_id=app_id
    )
    return {"id": app_id, "status": target_status}
