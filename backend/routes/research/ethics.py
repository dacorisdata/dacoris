from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import os, uuid, shutil

from database import get_db
from models import (EthicsApplication, EthicsStatus, EthicsDocument,
                    ResearchProject, User, ReviewerAssignment, ReviewType,
                    ReviewerAssignmentStatus, PrimaryAccountType, UserStatus, user_roles)
from auth import require_roles, ResearchRole
from services.workflow import can_transition_ethics
from services.ethics_certificate_parser import (
    extract_text_from_file, parse_certificate_fields, build_certificate_notes,
)
from services.notifications import create_notification
from services.reviewer_onboarding import get_or_create_reviewer_user

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


REVIEW_QUEUE_STATUSES = (
    EthicsStatus.SUBMITTED,
    EthicsStatus.UNDER_REVIEW,
    EthicsStatus.DEFERRED,
)

STAGE_LABELS = {
    "submitted": "Initial Submission",
    "screened": "Administrative Screening",
    "assigned": "Reviewer Assignment",
    "under_review": "Committee Review",
    "decision": "Decision Pending",
    "final_approval": "Final Approval",
    "deferred": "Deferred — Awaiting Resubmission",
    "approved": "Approved",
    "approved_with_modifications": "Approved with Modifications",
    "rejected": "Rejected",
    "draft": "Draft",
}


def _infer_risk_level(app: EthicsApplication, project: Optional[ResearchProject]) -> str:
    if project:
        if getattr(project, "is_clinical_trial", False):
            return "High"
        if getattr(project, "involves_human_subjects", False):
            return "High"
        if getattr(project, "involves_sensitive_data", False) or getattr(project, "involves_animal_subjects", False):
            return "Medium"
    risk = (app.risk_assessment or "").lower()
    if any(word in risk for word in ("high", "serious", "significant", "major")):
        return "High"
    if any(word in risk for word in ("medium", "moderate")):
        return "Medium"
    return "Low"


def _serialize_review(app: EthicsApplication) -> dict:
    data = _serialize_ethics(app)
    project = app.project
    status_val = data["status"]
    data.update({
        "application_title": app.title,
        "pi_name": data.get("submitted_by_name") or data.get("pi"),
        "institution": (
            (project.lead_institution if project else None)
            or (app.submitted_by.department if app.submitted_by else None)
        ),
        "risk_level": _infer_risk_level(app, project),
        "assigned_at": app.submitted_at or app.created_at,
        "stage_name": STAGE_LABELS.get(status_val, status_val.replace("_", " ").title()),
        "study_type": getattr(project, "research_design", None) if project else None,
        "participant_details": getattr(project, "target_population", None) if project else None,
        "consent_process": app.data_handling,
        "risks": app.risk_assessment,
        "benefits": app.lay_summary,
        "methodology_summary": app.methodology,
        "participants": getattr(project, "target_population", None) if project else None,
    })
    return data


def _serialize_reviewer_assignment(a: ReviewerAssignment) -> dict:
    return {
        "id": a.id,
        "reviewer_id": a.reviewer_id,
        "reviewer_name": a.reviewer.name if a.reviewer else a.invited_name,
        "reviewer_email": a.reviewer.email if a.reviewer else a.invited_email,
        "status": a.status.value if hasattr(a.status, "value") else a.status,
        "notes": a.notes,
        "assigned_at": a.assigned_at,
    }


async def _load_reviewer_assignments(
    db: AsyncSession, review_type: ReviewType, entity_ids: list
) -> dict:
    """Fetch active (non-declined) reviewer assignments keyed by entity_id."""
    if not entity_ids:
        return {}
    result = await db.execute(
        select(ReviewerAssignment)
        .where(
            ReviewerAssignment.review_type == review_type,
            ReviewerAssignment.entity_id.in_(entity_ids),
            ReviewerAssignment.status != ReviewerAssignmentStatus.DECLINED,
        )
        .options(selectinload(ReviewerAssignment.reviewer))
        .order_by(ReviewerAssignment.assigned_at.desc())
    )
    by_entity: dict = {}
    for a in result.scalars().all():
        by_entity.setdefault(a.entity_id, []).append(_serialize_reviewer_assignment(a))
    return by_entity


async def _get_institution_ethics_app(
    db: AsyncSession,
    app_id: str,
    institution_id: str,
) -> EthicsApplication:
    result = await db.execute(
        select(EthicsApplication)
        .where(
            EthicsApplication.id == app_id,
            EthicsApplication.institution_id == institution_id,
        )
        .options(*_ETHICS_LOAD)
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(404, "Ethics application not found")
    return app


@router.get("/reviews/my")
async def list_my_ethics_reviews(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.ETHICS_REVIEWER,
        ResearchRole.ETHICS_CHAIR,
        ResearchRole.INSTITUTIONAL_LEAD,
        ResearchRole.GRANT_OFFICER,
    ]))
):
    """Ethics applications awaiting committee review at the user's institution."""
    if not current_user.primary_institution_id:
        raise HTTPException(400, "User must be associated with an institution")

    result = await db.execute(
        select(EthicsApplication)
        .where(
            EthicsApplication.institution_id == current_user.primary_institution_id,
            EthicsApplication.status.in_(REVIEW_QUEUE_STATUSES),
            EthicsApplication.application_type != "existing_clearance",
        )
        .options(*_ETHICS_LOAD)
        .order_by(EthicsApplication.submitted_at.desc().nullslast(), EthicsApplication.created_at.desc())
    )
    apps = result.scalars().all()
    assignments_by_app = await _load_reviewer_assignments(
        db, ReviewType.ETHICS, [a.id for a in apps]
    )
    serialized = []
    for a in apps:
        data = _serialize_review(a)
        data["reviewer_assignments"] = assignments_by_app.get(a.id, [])
        serialized.append(data)
    return serialized


@router.get("/reviews/{app_id}")
async def get_ethics_review(
    app_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.ETHICS_REVIEWER,
        ResearchRole.ETHICS_CHAIR,
        ResearchRole.INSTITUTIONAL_LEAD,
        ResearchRole.GRANT_OFFICER,
    ]))
):
    if not current_user.primary_institution_id:
        raise HTTPException(400, "User must be associated with an institution")
    app = await _get_institution_ethics_app(db, app_id, current_user.primary_institution_id)
    data = _serialize_review(app)
    assignments_by_app = await _load_reviewer_assignments(db, ReviewType.ETHICS, [app.id])
    data["reviewer_assignments"] = assignments_by_app.get(app.id, [])
    return data


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


# ─── Reviewer Assignment ─────────────────────────────────────────────────────

class AssignEthicsReviewerBody(BaseModel):
    reviewer_id: Optional[str] = None
    new_reviewer_email: Optional[str] = None
    new_reviewer_name: Optional[str] = None
    new_reviewer_expertise: Optional[list[str]] = None
    notes: Optional[str] = None


@router.post("/{application_id}/assign-reviewer")
async def assign_ethics_reviewer(
    application_id: str,
    body: AssignEthicsReviewerBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.ETHICS_CHAIR, ResearchRole.ETHICS_REVIEWER,
        ResearchRole.INSTITUTIONAL_LEAD, ResearchRole.SYSTEM_ADMIN
    ]))
):
    """Assign a reviewer to an ethics application."""
    app = await db.get(EthicsApplication, application_id)
    if not app:
        raise HTTPException(404, "Ethics application not found")
    
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
            role=ResearchRole.ETHICS_REVIEWER,
            expertise=body.new_reviewer_expertise,
        )
        is_new_reviewer = needs_signup
    else:
        raise HTTPException(400, "Either reviewer_id or new_reviewer_email must be provided")

    if needs_signup and not signup_token:
        import secrets
        signup_token = secrets.token_urlsafe(32)
    
    assignment = ReviewerAssignment(
        institution_id=current_user.primary_institution_id,
        reviewer_id=reviewer.id,
        invited_email=reviewer.email,
        invited_name=reviewer.name,
        review_type=ReviewType.ETHICS,
        entity_id=application_id,
        entity_title=app.title,
        assigned_by_id=current_user.id,
        status=ReviewerAssignmentStatus.PENDING_SIGNUP if needs_signup else ReviewerAssignmentStatus.ASSIGNED,
        signup_token=signup_token if needs_signup else None,
        notes=body.notes,
    )
    db.add(assignment)
    
    if not needs_signup:
        await create_notification(
            db, reviewer.id,
            title="Ethics review assignment",
            message=f'You have been assigned to review the ethics application: "{app.title}".',
            entity_type="ethics", entity_id=application_id,
        )
    
    await db.commit()
    await db.refresh(assignment)
    
    from services.email_service import EmailService
    
    token = assignment.signup_token if needs_signup else assignment.invitation_token
    await EmailService.send_review_assignment_email(
        email=reviewer.email,
        reviewer_name=reviewer.name,
        review_type="ethics",
        entity_title=app.title,
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
async def list_available_ethics_reviewers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.ETHICS_CHAIR, ResearchRole.ETHICS_REVIEWER,
        ResearchRole.INSTITUTIONAL_LEAD, ResearchRole.SYSTEM_ADMIN
    ]))
):
    """List available reviewers for ethics review."""
    from sqlalchemy import text
    result = await db.execute(
        text("""
            SELECT DISTINCT u.id, u.name, u.email, array_agg(DISTINCT ur.role::text) as roles
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            WHERE u.primary_institution_id = :inst_id
              AND u.status = 'active'
              AND (ur.role IN ('external_reviewer', 'ethics_reviewer', 'ethics_chair')
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
