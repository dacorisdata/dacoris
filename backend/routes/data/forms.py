from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import csv
import io
import json

from database import get_db
from models import CaptureForm, FormSubmission, QAStatus, User
from auth import require_roles, ResearchRole

router = APIRouter(prefix="/api/data/forms", tags=["data-forms"])


class FormCreate(BaseModel):
    title: str
    description: Optional[str] = None
    project_id: Optional[str] = None
    source_system: str = "internal"
    external_form_id: Optional[str] = None
    external_endpoint: Optional[str] = None
    form_schema: Dict[str, Any] = {"fields": []}


class SubmissionCreate(BaseModel):
    data: Dict[str, Any]


class FormOut(BaseModel):
    id: str
    title: str
    description: Optional[str]
    source_system: str
    external_form_id: Optional[str]
    is_active: bool
    created_at: Any

    class Config:
        from_attributes = True


@router.post("", response_model=FormOut, status_code=201)
async def create_form(
    data: FormCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.DATA_STEWARD, ResearchRole.PRINCIPAL_INVESTIGATOR
    ]))
):
    form_schema_str = json.dumps(data.form_schema)
    form = CaptureForm(
        institution_id=current_user.primary_institution_id,
        created_by_id=current_user.id,
        title=data.title,
        description=data.description,
        project_id=data.project_id,
        source_system=data.source_system,
        external_form_id=data.external_form_id,
        external_endpoint=data.external_endpoint,
        form_schema=form_schema_str
    )
    db.add(form)
    await db.commit()
    await db.refresh(form)
    return form


@router.get("", response_model=List[FormOut])
async def list_forms(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.DATA_STEWARD,
        ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.DATA_ENGINEER
    ]))
):
    result = await db.execute(
        select(CaptureForm).where(
            CaptureForm.institution_id == current_user.primary_institution_id
        )
    )
    return result.scalars().all()


@router.get("/enriched")
async def list_forms_enriched(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.DATA_STEWARD, ResearchRole.PRINCIPAL_INVESTIGATOR,
        ResearchRole.DATA_ENGINEER, ResearchRole.INSTITUTIONAL_LEAD,
    ]))
):
    """List forms with submission counts and project info."""
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(CaptureForm)
        .options(
            selectinload(CaptureForm.project),
            selectinload(CaptureForm.created_by),
            selectinload(CaptureForm.submissions),
        )
        .where(CaptureForm.institution_id == current_user.primary_institution_id)
        .order_by(CaptureForm.created_at.desc())
    )
    forms = result.scalars().all()
    return [
        {
            "id": f.id, "title": f.title, "description": f.description,
            "source_system": f.source_system,
            "external_form_id": f.external_form_id,
            "is_active": f.is_active,
            "project_title": f.project.title if f.project else None,
            "project_id": f.project_id,
            "created_by_name": f.created_by.name if f.created_by else None,
            "created_at": f.created_at,
            "submission_count": len(f.submissions) if f.submissions else 0,
            "qa_stats": {
                "staged": sum(1 for s in (f.submissions or []) if s.qa_status == QAStatus.STAGED),
                "passed": sum(1 for s in (f.submissions or []) if s.qa_status == QAStatus.PASSED),
                "failed": sum(1 for s in (f.submissions or []) if s.qa_status == QAStatus.FAILED),
                "quarantined": sum(1 for s in (f.submissions or []) if s.qa_status == QAStatus.QUARANTINED),
            },
        }
        for f in forms
    ]


@router.get("/all-submissions")
async def list_all_submissions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.DATA_STEWARD, ResearchRole.DATA_ENGINEER,
        ResearchRole.INSTITUTIONAL_LEAD,
    ]))
):
    """List all submissions across all forms for the institution."""
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(FormSubmission)
        .join(CaptureForm, FormSubmission.form_id == CaptureForm.id)
        .options(selectinload(FormSubmission.form), selectinload(FormSubmission.submitted_by))
        .where(CaptureForm.institution_id == current_user.primary_institution_id)
        .order_by(FormSubmission.submitted_at.desc())
        .limit(500)
    )
    submissions = result.scalars().all()
    return [
        {
            "id": s.id,
            "form_id": s.form_id,
            "form_title": s.form.title if s.form else None,
            "submitted_by_name": s.submitted_by.name if s.submitted_by else None,
            "source_system": s.source_system,
            "qa_status": s.qa_status.value if hasattr(s.qa_status, "value") else s.qa_status,
            "submitted_at": s.submitted_at,
        }
        for s in submissions
    ]


@router.get("/{form_id}")
async def get_form(
    form_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.DATA_STEWARD, ResearchRole.PRINCIPAL_INVESTIGATOR
    ]))
):
    form = await db.get(CaptureForm, form_id)
    if not form or form.institution_id != current_user.primary_institution_id:
        raise HTTPException(404, "Form not found")
    return form


@router.post("/{form_id}/submissions", status_code=201)
async def submit_data(
    form_id: str,
    data: SubmissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.DATA_STEWARD
    ]))
):
    form = await db.get(CaptureForm, form_id)
    if not form or form.institution_id != current_user.primary_institution_id:
        raise HTTPException(404, "Form not found")

    submission = FormSubmission(
        form_id=form_id,
        data=json.dumps(data.data),
        submitted_by_id=current_user.id,
        source_system="internal",
    )
    db.add(submission)
    await db.commit()
    return {"id": submission.id, "status": "staged"}


@router.post("/{form_id}/upload-csv", status_code=201)
async def upload_csv(
    form_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.DATA_STEWARD]))
):
    form = await db.get(CaptureForm, form_id)
    if not form or form.institution_id != current_user.primary_institution_id:
        raise HTTPException(404, "Form not found")

    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8")))
    created = 0
    for row in reader:
        submission = FormSubmission(
            form_id=form_id,
            data=json.dumps(dict(row)),
            submitted_by_id=current_user.id,
            source_system="csv_upload",
        )
        db.add(submission)
        created += 1

    await db.commit()
    return {"created": created}


@router.get("/{form_id}/submissions")
async def list_submissions(
    form_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.DATA_STEWARD, ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.DATA_ENGINEER
    ]))
):
    result = await db.execute(
        select(FormSubmission).where(FormSubmission.form_id == form_id)
        .order_by(FormSubmission.submitted_at.desc())
    )
    submissions = result.scalars().all()
    return {
        "total": len(submissions),
        "staged": sum(1 for s in submissions if s.qa_status == QAStatus.STAGED),
        "passed": sum(1 for s in submissions if s.qa_status == QAStatus.PASSED),
        "failed": sum(1 for s in submissions if s.qa_status == QAStatus.FAILED),
        "quarantined": sum(1 for s in submissions if s.qa_status == QAStatus.QUARANTINED),
        "submissions": [
            {
                "id": s.id, "form_id": s.form_id,
                "data": json.loads(s.data) if isinstance(s.data, str) else s.data,
                "submitted_by_id": s.submitted_by_id,
                "source_system": s.source_system,
                "qa_status": s.qa_status.value if hasattr(s.qa_status, "value") else s.qa_status,
                "submitted_at": s.submitted_at,
            }
            for s in submissions
        ],
    }


