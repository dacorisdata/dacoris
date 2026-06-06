from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, date, timezone
from io import BytesIO
import secrets

from database import get_db
from models import (
    User, Institution,
    TrainingProgram, TrainingProgramStatus, TrainingProgramLevel, TrainingDeliveryMode,
    TrainingModule, TrainingMaterial,
    TrainingEnrollment, TrainingEnrollmentStatus,
    TrainingAttendance, TrainingAttendanceStatus,
    TrainingCertificate,
    UserSkill, SkillProficiency,
    TrainingNeedsAssessment, TrainingNeedsStatus,
    CPDRecord, CPDActivityType,
)
from auth import get_current_user
from services.training_defaults import ensure_default_programs
from services.training_attendance import (
    sync_enrollment_progress,
    serialize_attendance,
    attendance_summary_for_enrollment,
    program_session_count,
)
from services.training_certificate_pdf import generate_certificate_pdf

router = APIRouter(prefix="/api/training", tags=["training"])

TRAINING_ADMIN_ROLES = {
    "INSTITUTIONAL_LEADERSHIP", "ADMIN_STAFF", "GRANT_MANAGER",
    "DATA_STEWARD", "ETHICS_COMMITTEE_MEMBER",
}

SKILL_CATALOG = [
    {"name": "Research Methods", "category": "Research"},
    {"name": "Qualitative Analysis", "category": "Research"},
    {"name": "Quantitative Analysis", "category": "Research"},
    {"name": "Statistical Analysis (R)", "category": "Data Analysis"},
    {"name": "Statistical Analysis (Python)", "category": "Data Analysis"},
    {"name": "Data Visualization", "category": "Data Analysis"},
    {"name": "Scientific Writing", "category": "Writing"},
    {"name": "Grant Proposal Writing", "category": "Writing"},
    {"name": "Research Ethics", "category": "Compliance"},
    {"name": "Data Management", "category": "Compliance"},
    {"name": "Postgraduate Supervision", "category": "Leadership"},
    {"name": "Project Management", "category": "Leadership"},
    {"name": "Open Science Practices", "category": "Digital Skills"},
    {"name": "Bibliometrics", "category": "Research"},
    {"name": "Systematic Reviews", "category": "Research"},
]

def _user_role(user: User) -> str:
    if user.primary_account_type:
        return user.primary_account_type.value
    return ""


def _is_training_admin(user: User) -> bool:
    if user.is_global_admin or user.is_institution_admin:
        return True
    return _user_role(user) in TRAINING_ADMIN_ROLES


def _require_institution(user: User) -> str:
    if not user.primary_institution_id:
        raise HTTPException(status_code=400, detail="User must belong to an institution")
    return user.primary_institution_id


def _enum_val(val) -> str:
    return val.value if hasattr(val, "value") else val


def _cert_number(year: int) -> str:
    return f"CERT-TRN-{year}-{secrets.token_hex(4).upper()}"


def _verification_code() -> str:
    return secrets.token_urlsafe(12)


# ─── Pydantic schemas ───────────────────────────────────────────────────────

class ProgramCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    level: str = "beginner"
    delivery_mode: str = "online"
    cpd_hours: float = 0
    duration_hours: Optional[float] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    max_enrollments: Optional[int] = None
    instructor_name: Optional[str] = None
    prerequisites: Optional[List[str]] = None
    learning_outcomes: Optional[List[str]] = None
    certification_awarded: bool = True
    enrollment_type: str = "open"
    session_count: int = 5


class ProgramUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    level: Optional[str] = None
    delivery_mode: Optional[str] = None
    cpd_hours: Optional[float] = None
    duration_hours: Optional[float] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    max_enrollments: Optional[int] = None
    instructor_name: Optional[str] = None
    prerequisites: Optional[List[str]] = None
    learning_outcomes: Optional[List[str]] = None
    certification_awarded: Optional[bool] = None
    enrollment_type: Optional[str] = None
    session_count: Optional[int] = None
    status: Optional[str] = None


class EnrollmentCreate(BaseModel):
    program_id: str
    user_id: Optional[str] = None


class EnrollmentUpdate(BaseModel):
    status: Optional[str] = None
    progress_percentage: Optional[float] = None
    final_grade: Optional[str] = None


class AttendanceMark(BaseModel):
    session_number: int = Field(..., ge=1)
    attendance_date: date


class AttendanceReject(BaseModel):
    manager_notes: Optional[str] = None


class SkillCreate(BaseModel):
    skill_name: str
    category: Optional[str] = None
    proficiency_level: str = "beginner"
    years_experience: Optional[float] = None
    last_used_date: Optional[date] = None
    notes: Optional[str] = None


class SkillUpdate(BaseModel):
    skill_name: Optional[str] = None
    category: Optional[str] = None
    proficiency_level: Optional[str] = None
    years_experience: Optional[float] = None
    last_used_date: Optional[date] = None
    notes: Optional[str] = None


class NeedsAssessmentCreate(BaseModel):
    career_stage: Optional[str] = None
    research_areas: Optional[List[str]] = None
    desired_skills: Optional[List[str]] = None
    current_challenges: Optional[str] = None
    preferred_formats: Optional[List[str]] = None
    available_hours_per_month: Optional[int] = None


class NeedsAssessmentReview(BaseModel):
    status: str
    admin_notes: Optional[str] = None


class CPDCreate(BaseModel):
    title: str
    description: Optional[str] = None
    activity_type: str = "other"
    cpd_hours: float
    activity_date: date
    provider: Optional[str] = None


# ─── Serializers ────────────────────────────────────────────────────────────

def _serialize_program(
    p: TrainingProgram,
    enrollment_count: int = 0,
    module_count: int = 0,
    material_count: int = 0,
) -> dict:
    return {
        "id": p.id,
        "institution_id": p.institution_id,
        "title": p.title,
        "description": p.description,
        "category": p.category,
        "level": _enum_val(p.level),
        "delivery_mode": _enum_val(p.delivery_mode),
        "cpd_hours": p.cpd_hours,
        "duration_hours": p.duration_hours,
        "status": _enum_val(p.status),
        "start_date": p.start_date.isoformat() if p.start_date else None,
        "end_date": p.end_date.isoformat() if p.end_date else None,
        "max_enrollments": p.max_enrollments,
        "instructor_name": p.instructor_name,
        "prerequisites": p.prerequisites or [],
        "learning_outcomes": p.learning_outcomes or [],
        "certification_awarded": p.certification_awarded,
        "enrollment_type": p.enrollment_type,
        "session_count": program_session_count(p),
        "enrollment_count": enrollment_count,
        "module_count": module_count,
        "material_count": material_count,
        "has_materials": material_count > 0,
        "is_system_default": bool(p.is_system_default),
        "created_at": p.created_at,
        "created_by_name": p.created_by.name if p.created_by else None,
    }


async def _serialize_enrollment(db: AsyncSession, e: TrainingEnrollment, include_attendance: bool = False) -> dict:
    summary = await attendance_summary_for_enrollment(db, e)
    data = {
        "id": e.id,
        "program_id": e.program_id,
        "program_title": e.program.title if e.program else None,
        "program_category": e.program.category if e.program else None,
        "cpd_hours": e.program.cpd_hours if e.program else 0,
        "user_id": e.user_id,
        "user_name": e.user.name if e.user else None,
        "user_email": e.user.email if e.user else None,
        "status": _enum_val(e.status),
        "progress_percentage": e.progress_percentage or 0,
        "enrolled_at": e.enrolled_at,
        "completed_at": e.completed_at,
        "final_grade": e.final_grade,
        "has_certificate": e.certificate is not None,
        "certificate_id": e.certificate.id if e.certificate else None,
        "attendance_summary": summary,
    }
    if include_attendance:
        att_result = await db.execute(
            select(TrainingAttendance)
            .options(
                selectinload(TrainingAttendance.marked_by),
                selectinload(TrainingAttendance.confirmed_by),
            )
            .where(TrainingAttendance.enrollment_id == e.id)
            .order_by(TrainingAttendance.session_number)
        )
        data["attendance"] = [serialize_attendance(r) for r in att_result.scalars().all()]
    return data


async def _load_enrollment(db: AsyncSession, enrollment_id: str) -> TrainingEnrollment:
    result = await db.execute(
        select(TrainingEnrollment)
        .options(
            selectinload(TrainingEnrollment.program),
            selectinload(TrainingEnrollment.user),
            selectinload(TrainingEnrollment.certificate),
        )
        .where(TrainingEnrollment.id == enrollment_id)
    )
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    return enrollment


def _serialize_certificate(c: TrainingCertificate) -> dict:
    return {
        "id": c.id,
        "certificate_number": c.certificate_number,
        "verification_code": c.verification_code,
        "issue_date": c.issue_date,
        "cpd_hours_awarded": c.cpd_hours_awarded,
        "recipient_name": c.recipient_name,
        "program_title": c.program_title,
        "program_id": c.program_id,
        "user_id": c.user_id,
    }


def _serialize_skill(s: UserSkill) -> dict:
    return {
        "id": s.id,
        "skill_name": s.skill_name,
        "category": s.category,
        "proficiency_level": _enum_val(s.proficiency_level),
        "years_experience": s.years_experience,
        "last_used_date": s.last_used_date.isoformat() if s.last_used_date else None,
        "verified": s.verified,
        "notes": s.notes,
        "created_at": s.created_at,
    }


def _serialize_needs(n: TrainingNeedsAssessment) -> dict:
    return {
        "id": n.id,
        "user_id": n.user_id,
        "user_name": n.user.name if n.user else None,
        "user_email": n.user.email if n.user else None,
        "career_stage": n.career_stage,
        "research_areas": n.research_areas or [],
        "desired_skills": n.desired_skills or [],
        "current_challenges": n.current_challenges,
        "preferred_formats": n.preferred_formats or [],
        "available_hours_per_month": n.available_hours_per_month,
        "status": _enum_val(n.status),
        "admin_notes": n.admin_notes,
        "reviewed_by_name": n.reviewed_by.name if n.reviewed_by else None,
        "reviewed_at": n.reviewed_at,
        "created_at": n.created_at,
    }


def _serialize_cpd(r: CPDRecord) -> dict:
    return {
        "id": r.id,
        "title": r.title,
        "description": r.description,
        "activity_type": _enum_val(r.activity_type),
        "cpd_hours": r.cpd_hours,
        "activity_date": r.activity_date.isoformat() if r.activity_date else None,
        "provider": r.provider,
        "verified": r.verified,
        "enrollment_id": r.enrollment_id,
        "created_at": r.created_at,
    }


async def _issue_certificate(db: AsyncSession, enrollment: TrainingEnrollment) -> TrainingCertificate:
    if enrollment.certificate:
        return enrollment.certificate

    year = datetime.now(timezone.utc).year
    cert = TrainingCertificate(
        enrollment_id=enrollment.id,
        user_id=enrollment.user_id,
        program_id=enrollment.program_id,
        certificate_number=_cert_number(year),
        verification_code=_verification_code(),
        cpd_hours_awarded=enrollment.program.cpd_hours if enrollment.program else 0,
        recipient_name=enrollment.user.name if enrollment.user else None,
        program_title=enrollment.program.title if enrollment.program else None,
    )
    db.add(cert)
    await db.flush()

    cpd = CPDRecord(
        user_id=enrollment.user_id,
        title=enrollment.program.title if enrollment.program else "Training Course",
        description=f"Certificate awarded for completing {enrollment.program.title}" if enrollment.program else None,
        activity_type=CPDActivityType.COURSE,
        cpd_hours=enrollment.program.cpd_hours if enrollment.program else 0,
        activity_date=date.today(),
        provider="DACORIS Training",
        enrollment_id=enrollment.id,
        verified=True,
    )
    db.add(cpd)
    return cert


# ─── Stats ──────────────────────────────────────────────────────────────────

@router.get("/stats/admin")
async def admin_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not _is_training_admin(current_user):
        raise HTTPException(status_code=403, detail="Training admin access required")
    inst_id = _require_institution(current_user)

    programs = (await db.execute(
        select(func.count(TrainingProgram.id)).where(TrainingProgram.institution_id == inst_id)
    )).scalar() or 0

    published = (await db.execute(
        select(func.count(TrainingProgram.id)).where(
            and_(TrainingProgram.institution_id == inst_id,
                 TrainingProgram.status == TrainingProgramStatus.PUBLISHED)
        )
    )).scalar() or 0

    enrollments = (await db.execute(
        select(func.count(TrainingEnrollment.id))
        .join(TrainingProgram)
        .where(TrainingProgram.institution_id == inst_id)
    )).scalar() or 0

    active = (await db.execute(
        select(func.count(TrainingEnrollment.id))
        .join(TrainingProgram)
        .where(and_(
            TrainingProgram.institution_id == inst_id,
            TrainingEnrollment.status == TrainingEnrollmentStatus.ACTIVE,
        ))
    )).scalar() or 0

    completed = (await db.execute(
        select(func.count(TrainingEnrollment.id))
        .join(TrainingProgram)
        .where(and_(
            TrainingProgram.institution_id == inst_id,
            TrainingEnrollment.status == TrainingEnrollmentStatus.COMPLETED,
        ))
    )).scalar() or 0

    pending_needs = (await db.execute(
        select(func.count(TrainingNeedsAssessment.id)).where(
            and_(TrainingNeedsAssessment.institution_id == inst_id,
                 TrainingNeedsAssessment.status == TrainingNeedsStatus.SUBMITTED)
        )
    )).scalar() or 0

    total_cpd = (await db.execute(
        select(func.coalesce(func.sum(CPDRecord.cpd_hours), 0))
        .join(User, CPDRecord.user_id == User.id)
        .where(User.primary_institution_id == inst_id)
    )).scalar() or 0

    return {
        "total_programs": programs,
        "published_programs": published,
        "total_enrollments": enrollments,
        "active_enrollments": active,
        "completed_enrollments": completed,
        "pending_needs_assessments": pending_needs,
        "total_cpd_hours": float(total_cpd),
    }


@router.get("/stats/learner")
async def learner_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = current_user.id

    enrollments = (await db.execute(
        select(func.count(TrainingEnrollment.id)).where(TrainingEnrollment.user_id == user_id)
    )).scalar() or 0

    active = (await db.execute(
        select(func.count(TrainingEnrollment.id)).where(
            and_(TrainingEnrollment.user_id == user_id,
                 TrainingEnrollment.status == TrainingEnrollmentStatus.ACTIVE)
        )
    )).scalar() or 0

    completed = (await db.execute(
        select(func.count(TrainingEnrollment.id)).where(
            and_(TrainingEnrollment.user_id == user_id,
                 TrainingEnrollment.status == TrainingEnrollmentStatus.COMPLETED)
        )
    )).scalar() or 0

    certificates = (await db.execute(
        select(func.count(TrainingCertificate.id)).where(TrainingCertificate.user_id == user_id)
    )).scalar() or 0

    cpd_hours = (await db.execute(
        select(func.coalesce(func.sum(CPDRecord.cpd_hours), 0)).where(CPDRecord.user_id == user_id)
    )).scalar() or 0

    skills = (await db.execute(
        select(func.count(UserSkill.id)).where(UserSkill.user_id == user_id)
    )).scalar() or 0

    return {
        "total_enrollments": enrollments,
        "active_enrollments": active,
        "completed_enrollments": completed,
        "certificates": certificates,
        "cpd_hours": float(cpd_hours),
        "skills_count": skills,
    }


# ─── Programs ───────────────────────────────────────────────────────────────

@router.get("/programs")
async def list_programs(
    status: Optional[str] = Query(None),
    published_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    inst_id = _require_institution(current_user)
    is_admin = _is_training_admin(current_user)

    await ensure_default_programs(db, inst_id, current_user.id)

    q = (
        select(TrainingProgram)
        .options(selectinload(TrainingProgram.created_by))
        .where(TrainingProgram.institution_id == inst_id)
        .order_by(TrainingProgram.is_system_default.desc(), TrainingProgram.title.asc())
    )

    if published_only or not is_admin:
        q = q.where(TrainingProgram.status == TrainingProgramStatus.PUBLISHED)
    elif status:
        try:
            q = q.where(TrainingProgram.status == TrainingProgramStatus(status))
        except ValueError:
            pass

    result = await db.execute(q)
    programs = result.scalars().all()

    enroll_counts = {}
    module_counts = {}
    material_counts = {}
    if programs:
        ids = [p.id for p in programs]
        count_rows = await db.execute(
            select(TrainingEnrollment.program_id, func.count(TrainingEnrollment.id))
            .where(TrainingEnrollment.program_id.in_(ids))
            .group_by(TrainingEnrollment.program_id)
        )
        enroll_counts = {row[0]: row[1] for row in count_rows.all()}

        mod_rows = await db.execute(
            select(TrainingModule.program_id, func.count(TrainingModule.id))
            .where(TrainingModule.program_id.in_(ids))
            .group_by(TrainingModule.program_id)
        )
        module_counts = {row[0]: row[1] for row in mod_rows.all()}

        mat_rows = await db.execute(
            select(TrainingMaterial.program_id, func.count(TrainingMaterial.id))
            .where(TrainingMaterial.program_id.in_(ids))
            .group_by(TrainingMaterial.program_id)
        )
        material_counts = {row[0]: row[1] for row in mat_rows.all()}

    return [
        _serialize_program(
            p,
            enroll_counts.get(p.id, 0),
            module_counts.get(p.id, 0),
            material_counts.get(p.id, 0),
        )
        for p in programs
    ]


@router.post("/programs")
async def create_program(
    body: ProgramCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not _is_training_admin(current_user):
        raise HTTPException(status_code=403, detail="Training admin access required")
    inst_id = _require_institution(current_user)

    prog = TrainingProgram(
        institution_id=inst_id,
        created_by_id=current_user.id,
        title=body.title,
        description=body.description,
        category=body.category,
        level=TrainingProgramLevel(body.level),
        delivery_mode=TrainingDeliveryMode(body.delivery_mode),
        cpd_hours=body.cpd_hours,
        duration_hours=body.duration_hours,
        start_date=body.start_date,
        end_date=body.end_date,
        max_enrollments=body.max_enrollments,
        instructor_name=body.instructor_name,
        prerequisites=body.prerequisites,
        learning_outcomes=body.learning_outcomes,
        certification_awarded=body.certification_awarded,
        enrollment_type=body.enrollment_type,
        session_count=max(1, body.session_count),
        status=TrainingProgramStatus.DRAFT,
        is_system_default=False,
    )
    db.add(prog)
    await db.commit()
    await db.refresh(prog, ["created_by"])
    return _serialize_program(prog)


@router.get("/programs/{program_id}")
async def get_program(
    program_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    inst_id = _require_institution(current_user)
    result = await db.execute(
        select(TrainingProgram)
        .options(selectinload(TrainingProgram.created_by))
        .where(and_(TrainingProgram.id == program_id, TrainingProgram.institution_id == inst_id))
    )
    prog = result.scalar_one_or_none()
    if not prog:
        raise HTTPException(status_code=404, detail="Program not found")
    if prog.status != TrainingProgramStatus.PUBLISHED and not _is_training_admin(current_user):
        raise HTTPException(status_code=403, detail="Program not available")

    count = (await db.execute(
        select(func.count(TrainingEnrollment.id)).where(TrainingEnrollment.program_id == program_id)
    )).scalar() or 0
    return _serialize_program(prog, count)


@router.put("/programs/{program_id}")
async def update_program(
    program_id: str,
    body: ProgramUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not _is_training_admin(current_user):
        raise HTTPException(status_code=403, detail="Training admin access required")
    inst_id = _require_institution(current_user)

    result = await db.execute(
        select(TrainingProgram).where(
            and_(TrainingProgram.id == program_id, TrainingProgram.institution_id == inst_id)
        )
    )
    prog = result.scalar_one_or_none()
    if not prog:
        raise HTTPException(status_code=404, detail="Program not found")

    if prog.is_system_default and body.title is not None and body.title != prog.title:
        raise HTTPException(
            status_code=400,
            detail="Core platform programmes cannot be renamed. Create a custom programme instead.",
        )

    updates = body.model_dump(exclude_unset=True)
    for key, val in updates.items():
        if key == "level" and val:
            setattr(prog, key, TrainingProgramLevel(val))
        elif key == "delivery_mode" and val:
            setattr(prog, key, TrainingDeliveryMode(val))
        elif key == "status" and val:
            setattr(prog, key, TrainingProgramStatus(val))
        else:
            setattr(prog, key, val)

    await db.commit()
    await db.refresh(prog, ["created_by"])
    return _serialize_program(prog)


@router.delete("/programs/{program_id}")
async def delete_program(
    program_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not _is_training_admin(current_user):
        raise HTTPException(status_code=403, detail="Training admin access required")
    inst_id = _require_institution(current_user)

    result = await db.execute(
        select(TrainingProgram).where(
            and_(TrainingProgram.id == program_id, TrainingProgram.institution_id == inst_id)
        )
    )
    prog = result.scalar_one_or_none()
    if not prog:
        raise HTTPException(status_code=404, detail="Program not found")

    if prog.is_system_default:
        raise HTTPException(
            status_code=400,
            detail="Core platform programmes cannot be deleted. You may archive them or add custom programmes.",
        )

    await db.delete(prog)
    await db.commit()
    return {"ok": True}


# ─── Enrollments ────────────────────────────────────────────────────────────

@router.get("/enrollments")
async def list_enrollments(
    program_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not _is_training_admin(current_user):
        raise HTTPException(status_code=403, detail="Training admin access required")
    inst_id = _require_institution(current_user)

    q = (
        select(TrainingEnrollment)
        .options(
            selectinload(TrainingEnrollment.program),
            selectinload(TrainingEnrollment.user),
            selectinload(TrainingEnrollment.certificate),
            selectinload(TrainingEnrollment.attendance_records).selectinload(TrainingAttendance.marked_by),
            selectinload(TrainingEnrollment.attendance_records).selectinload(TrainingAttendance.confirmed_by),
        )
        .join(TrainingProgram)
        .where(TrainingProgram.institution_id == inst_id)
        .order_by(TrainingEnrollment.enrolled_at.desc())
    )
    if program_id:
        q = q.where(TrainingEnrollment.program_id == program_id)
    if status:
        try:
            q = q.where(TrainingEnrollment.status == TrainingEnrollmentStatus(status))
        except ValueError:
            pass

    result = await db.execute(q)
    enrollments = result.scalars().all()
    return [await _serialize_enrollment(db, e, include_attendance=True) for e in enrollments]


@router.get("/enrollments/my")
async def my_enrollments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TrainingEnrollment)
        .options(
            selectinload(TrainingEnrollment.program),
            selectinload(TrainingEnrollment.user),
            selectinload(TrainingEnrollment.certificate),
            selectinload(TrainingEnrollment.attendance_records).selectinload(TrainingAttendance.marked_by),
            selectinload(TrainingEnrollment.attendance_records).selectinload(TrainingAttendance.confirmed_by),
        )
        .where(TrainingEnrollment.user_id == current_user.id)
        .order_by(TrainingEnrollment.enrolled_at.desc())
    )
    enrollments = result.scalars().all()
    return [await _serialize_enrollment(db, e, include_attendance=True) for e in enrollments]


@router.post("/enrollments")
async def create_enrollment(
    body: EnrollmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    inst_id = _require_institution(current_user)
    is_admin = _is_training_admin(current_user)
    target_user_id = body.user_id if (body.user_id and is_admin) else current_user.id

    prog_result = await db.execute(
        select(TrainingProgram).where(
            and_(TrainingProgram.id == body.program_id, TrainingProgram.institution_id == inst_id)
        )
    )
    prog = prog_result.scalar_one_or_none()
    if not prog:
        raise HTTPException(status_code=404, detail="Program not found")
    if prog.status != TrainingProgramStatus.PUBLISHED and not is_admin:
        raise HTTPException(status_code=400, detail="Program is not open for enrollment")

    if prog.max_enrollments:
        count = (await db.execute(
            select(func.count(TrainingEnrollment.id)).where(
                and_(
                    TrainingEnrollment.program_id == prog.id,
                    TrainingEnrollment.status.in_([
                        TrainingEnrollmentStatus.ACTIVE,
                        TrainingEnrollmentStatus.COMPLETED,
                    ]),
                )
            )
        )).scalar() or 0
        if count >= prog.max_enrollments:
            raise HTTPException(status_code=400, detail="Program is full")

    existing = await db.execute(
        select(TrainingEnrollment).where(
            and_(TrainingEnrollment.program_id == prog.id, TrainingEnrollment.user_id == target_user_id)
        )
    )
    prior = existing.scalar_one_or_none()
    if prior:
        if prior.status == TrainingEnrollmentStatus.DROPPED:
            prior.status = TrainingEnrollmentStatus.ACTIVE
            prior.progress_percentage = 0
            prior.completed_at = None
            prior.enrolled_at = datetime.now(timezone.utc)
            await db.commit()
            prior = await _load_enrollment(db, prior.id)
            return await _serialize_enrollment(db, prior, include_attendance=True)
        raise HTTPException(status_code=400, detail="Already enrolled in this program")

    enrollment = TrainingEnrollment(
        program_id=prog.id,
        user_id=target_user_id,
        enrolled_by_id=current_user.id if target_user_id != current_user.id else None,
        status=TrainingEnrollmentStatus.ACTIVE,
    )
    db.add(enrollment)
    await db.commit()
    enrollment = await _load_enrollment(db, enrollment.id)
    return await _serialize_enrollment(db, enrollment, include_attendance=True)


@router.patch("/enrollments/{enrollment_id}")
async def update_enrollment(
    enrollment_id: str,
    body: EnrollmentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    is_admin = _is_training_admin(current_user)
    result = await db.execute(
        select(TrainingEnrollment)
        .options(
            selectinload(TrainingEnrollment.program),
            selectinload(TrainingEnrollment.user),
            selectinload(TrainingEnrollment.certificate),
        )
        .where(TrainingEnrollment.id == enrollment_id)
    )
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    if not is_admin and enrollment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if body.progress_percentage is not None:
        if not is_admin:
            raise HTTPException(
                status_code=400,
                detail="Progress is calculated from confirmed attendance records",
            )
        enrollment.progress_percentage = min(100, max(0, body.progress_percentage))

    if body.final_grade is not None and is_admin:
        enrollment.final_grade = body.final_grade

    if body.status:
        try:
            new_status = TrainingEnrollmentStatus(body.status)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid enrollment status")

        learner_self_service = {
            TrainingEnrollmentStatus.DROPPED,
            TrainingEnrollmentStatus.SUSPENDED,
        }
        if not is_admin:
            if new_status not in learner_self_service:
                raise HTTPException(
                    status_code=400,
                    detail="You can only cancel or suspend your enrollment",
                )
            if enrollment.status != TrainingEnrollmentStatus.ACTIVE:
                raise HTTPException(
                    status_code=400,
                    detail="Only active enrollments can be cancelled or suspended",
                )
        else:
            if enrollment.status == TrainingEnrollmentStatus.COMPLETED and new_status != TrainingEnrollmentStatus.COMPLETED:
                raise HTTPException(status_code=400, detail="Completed enrollments cannot be changed")

        prior_status = enrollment.status
        enrollment.status = new_status
        if new_status == TrainingEnrollmentStatus.COMPLETED:
            enrollment.completed_at = datetime.now(timezone.utc)
            enrollment.progress_percentage = 100
            if enrollment.program and enrollment.program.certification_awarded:
                await _issue_certificate(db, enrollment)
        elif new_status in (TrainingEnrollmentStatus.DROPPED, TrainingEnrollmentStatus.SUSPENDED):
            enrollment.completed_at = None
        elif new_status == TrainingEnrollmentStatus.ACTIVE and is_admin and prior_status in (
            TrainingEnrollmentStatus.SUSPENDED,
            TrainingEnrollmentStatus.DROPPED,
        ):
            enrollment.completed_at = None

    await db.commit()
    enrollment = await _load_enrollment(db, enrollment.id)
    return await _serialize_enrollment(db, enrollment, include_attendance=True)


async def _get_enrollment_for_user(
    db: AsyncSession, enrollment_id: str, user: User, admin_ok: bool = False,
) -> TrainingEnrollment:
    result = await db.execute(
        select(TrainingEnrollment)
        .options(
            selectinload(TrainingEnrollment.program),
            selectinload(TrainingEnrollment.user),
            selectinload(TrainingEnrollment.certificate),
            selectinload(TrainingEnrollment.attendance_records),
        )
        .where(TrainingEnrollment.id == enrollment_id)
    )
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    is_admin = _is_training_admin(user)
    if enrollment.user_id != user.id and not (admin_ok and is_admin):
        raise HTTPException(status_code=403, detail="Not authorized")
    if admin_ok and is_admin:
        inst_id = _require_institution(user)
        if enrollment.program and enrollment.program.institution_id != inst_id:
            raise HTTPException(status_code=403, detail="Enrollment not in your institution")
    return enrollment


@router.get("/enrollments/{enrollment_id}/attendance")
async def list_attendance(
    enrollment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    is_admin = _is_training_admin(current_user)
    enrollment = await _get_enrollment_for_user(db, enrollment_id, current_user, admin_ok=True)
    if not is_admin and enrollment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    records = sorted(enrollment.attendance_records or [], key=lambda r: r.session_number)
    return [serialize_attendance(r) for r in records]


@router.post("/enrollments/{enrollment_id}/attendance")
async def mark_attendance(
    enrollment_id: str,
    body: AttendanceMark,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    enrollment = await _get_enrollment_for_user(db, enrollment_id, current_user, admin_ok=False)
    if enrollment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the enrolled learner can mark attendance")
    if enrollment.status != TrainingEnrollmentStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Enrollment is not active")

    total = program_session_count(enrollment.program)
    if body.session_number > total:
        raise HTTPException(status_code=400, detail=f"Session number must be between 1 and {total}")

    existing = next(
        (r for r in (enrollment.attendance_records or []) if r.session_number == body.session_number),
        None,
    )
    if existing and existing.status != TrainingAttendanceStatus.REJECTED:
        raise HTTPException(status_code=400, detail="Attendance already submitted for this session")
    if existing and existing.status == TrainingAttendanceStatus.REJECTED:
        existing.attendance_date = body.attendance_date
        existing.status = TrainingAttendanceStatus.PENDING
        existing.marked_by_id = current_user.id
        existing.marked_at = datetime.now(timezone.utc)
        existing.confirmed_by_id = None
        existing.confirmed_at = None
        existing.manager_notes = None
        record = existing
    else:
        record = TrainingAttendance(
            enrollment_id=enrollment.id,
            session_number=body.session_number,
            attendance_date=body.attendance_date,
            status=TrainingAttendanceStatus.PENDING,
            marked_by_id=current_user.id,
        )
        db.add(record)

    await db.commit()
    await db.refresh(record, ["marked_by"])
    return serialize_attendance(record)


@router.get("/attendance/pending")
async def list_pending_attendance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not _is_training_admin(current_user):
        raise HTTPException(status_code=403, detail="Training admin access required")
    inst_id = _require_institution(current_user)

    result = await db.execute(
        select(TrainingAttendance)
        .options(
            selectinload(TrainingAttendance.enrollment).selectinload(TrainingEnrollment.program),
            selectinload(TrainingAttendance.enrollment).selectinload(TrainingEnrollment.user),
            selectinload(TrainingAttendance.marked_by),
        )
        .join(TrainingEnrollment)
        .join(TrainingProgram)
        .where(
            and_(
                TrainingProgram.institution_id == inst_id,
                TrainingAttendance.status == TrainingAttendanceStatus.PENDING,
            )
        )
        .order_by(TrainingAttendance.marked_at.desc())
    )
    records = result.scalars().all()
    return [
        {
            **serialize_attendance(r),
            "learner_name": r.enrollment.user.name if r.enrollment and r.enrollment.user else None,
            "program_title": r.enrollment.program.title if r.enrollment and r.enrollment.program else None,
            "enrollment_id": r.enrollment_id,
        }
        for r in records
    ]


@router.patch("/attendance/{attendance_id}/confirm")
async def confirm_attendance(
    attendance_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not _is_training_admin(current_user):
        raise HTTPException(status_code=403, detail="Training admin access required")
    inst_id = _require_institution(current_user)

    result = await db.execute(
        select(TrainingAttendance)
        .options(
            selectinload(TrainingAttendance.enrollment).selectinload(TrainingEnrollment.program),
            selectinload(TrainingAttendance.enrollment).selectinload(TrainingEnrollment.certificate),
            selectinload(TrainingAttendance.marked_by),
        )
        .where(TrainingAttendance.id == attendance_id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    if record.enrollment.program.institution_id != inst_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if record.status != TrainingAttendanceStatus.PENDING:
        raise HTTPException(status_code=400, detail="Attendance is not pending confirmation")

    record.status = TrainingAttendanceStatus.CONFIRMED
    record.confirmed_by_id = current_user.id
    record.confirmed_at = datetime.now(timezone.utc)
    await sync_enrollment_progress(db, record.enrollment, _issue_certificate)
    await db.commit()
    await db.refresh(record, ["marked_by", "confirmed_by"])
    return serialize_attendance(record)


@router.patch("/attendance/{attendance_id}/reject")
async def reject_attendance(
    attendance_id: str,
    body: AttendanceReject,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not _is_training_admin(current_user):
        raise HTTPException(status_code=403, detail="Training admin access required")
    inst_id = _require_institution(current_user)

    result = await db.execute(
        select(TrainingAttendance)
        .options(
            selectinload(TrainingAttendance.enrollment).selectinload(TrainingEnrollment.program),
            selectinload(TrainingAttendance.marked_by),
        )
        .where(TrainingAttendance.id == attendance_id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    if record.enrollment.program.institution_id != inst_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if record.status != TrainingAttendanceStatus.PENDING:
        raise HTTPException(status_code=400, detail="Attendance is not pending confirmation")

    record.status = TrainingAttendanceStatus.REJECTED
    record.confirmed_by_id = current_user.id
    record.confirmed_at = datetime.now(timezone.utc)
    record.manager_notes = body.manager_notes
    await sync_enrollment_progress(db, record.enrollment, _issue_certificate)
    await db.commit()
    await db.refresh(record, ["marked_by", "confirmed_by"])
    return serialize_attendance(record)


# ─── Certificates ───────────────────────────────────────────────────────────

@router.get("/certificates/my")
async def my_certificates(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TrainingCertificate)
        .where(TrainingCertificate.user_id == current_user.id)
        .order_by(TrainingCertificate.issue_date.desc())
    )
    return [_serialize_certificate(c) for c in result.scalars().all()]


@router.get("/certificates/verify/{code}")
async def verify_certificate(
    code: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TrainingCertificate).where(TrainingCertificate.verification_code == code)
    )
    cert = result.scalar_one_or_none()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    return {
        "valid": True,
        "certificate_number": cert.certificate_number,
        "recipient_name": cert.recipient_name,
        "program_title": cert.program_title,
        "issue_date": cert.issue_date,
        "cpd_hours_awarded": cert.cpd_hours_awarded,
    }


@router.get("/certificates/{certificate_id}/pdf")
async def download_certificate_pdf(
    certificate_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TrainingCertificate)
        .options(
            selectinload(TrainingCertificate.user),
            selectinload(TrainingCertificate.program).selectinload(TrainingProgram.institution),
        )
        .where(TrainingCertificate.id == certificate_id)
    )
    cert = result.scalar_one_or_none()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    is_owner = cert.user_id == current_user.id
    is_admin = _is_training_admin(current_user)
    if not is_owner and not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    if is_admin and not is_owner:
        inst_id = _require_institution(current_user)
        if cert.program and cert.program.institution_id != inst_id:
            raise HTTPException(status_code=403, detail="Certificate not in your institution")

    institution_name = "DACORIS"
    if cert.program and cert.program.institution:
        institution_name = cert.program.institution.name

    pdf_bytes = generate_certificate_pdf(
        recipient_name=cert.recipient_name or (cert.user.name if cert.user else ""),
        program_title=cert.program_title or "",
        certificate_number=cert.certificate_number,
        verification_code=cert.verification_code,
        cpd_hours=cert.cpd_hours_awarded or 0,
        issue_date=cert.issue_date,
        institution_name=institution_name,
    )
    filename = f"{cert.certificate_number}.pdf".replace(" ", "_")
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ─── Skills ─────────────────────────────────────────────────────────────────

@router.get("/skills/catalog")
async def skills_catalog():
    return SKILL_CATALOG


@router.get("/skills/my")
async def my_skills(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserSkill)
        .where(UserSkill.user_id == current_user.id)
        .order_by(UserSkill.category, UserSkill.skill_name)
    )
    return [_serialize_skill(s) for s in result.scalars().all()]


@router.post("/skills")
async def add_skill(
    body: SkillCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    skill = UserSkill(
        user_id=current_user.id,
        skill_name=body.skill_name,
        category=body.category,
        proficiency_level=SkillProficiency(body.proficiency_level),
        years_experience=body.years_experience,
        last_used_date=body.last_used_date,
        notes=body.notes,
    )
    db.add(skill)
    await db.commit()
    await db.refresh(skill)
    return _serialize_skill(skill)


@router.put("/skills/{skill_id}")
async def update_skill(
    skill_id: str,
    body: SkillUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserSkill).where(and_(UserSkill.id == skill_id, UserSkill.user_id == current_user.id))
    )
    skill = result.scalar_one_or_none()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    updates = body.model_dump(exclude_unset=True)
    for key, val in updates.items():
        if key == "proficiency_level" and val:
            setattr(skill, key, SkillProficiency(val))
        else:
            setattr(skill, key, val)

    await db.commit()
    await db.refresh(skill)
    return _serialize_skill(skill)


@router.delete("/skills/{skill_id}")
async def delete_skill(
    skill_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserSkill).where(and_(UserSkill.id == skill_id, UserSkill.user_id == current_user.id))
    )
    skill = result.scalar_one_or_none()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    await db.delete(skill)
    await db.commit()
    return {"ok": True}


# ─── Training Needs Assessment ──────────────────────────────────────────────

@router.get("/needs-assessment/my")
async def my_needs_assessment(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TrainingNeedsAssessment)
        .options(selectinload(TrainingNeedsAssessment.reviewed_by))
        .where(TrainingNeedsAssessment.user_id == current_user.id)
        .order_by(TrainingNeedsAssessment.created_at.desc())
        .limit(1)
    )
    assessment = result.scalar_one_or_none()
    return _serialize_needs(assessment) if assessment else None


@router.post("/needs-assessment")
async def submit_needs_assessment(
    body: NeedsAssessmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    inst_id = _require_institution(current_user)
    assessment = TrainingNeedsAssessment(
        user_id=current_user.id,
        institution_id=inst_id,
        career_stage=body.career_stage,
        research_areas=body.research_areas,
        desired_skills=body.desired_skills,
        current_challenges=body.current_challenges,
        preferred_formats=body.preferred_formats,
        available_hours_per_month=body.available_hours_per_month,
        status=TrainingNeedsStatus.SUBMITTED,
    )
    db.add(assessment)
    await db.commit()
    await db.refresh(assessment, ["user", "reviewed_by"])
    return _serialize_needs(assessment)


@router.get("/needs-assessments")
async def list_needs_assessments(
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not _is_training_admin(current_user):
        raise HTTPException(status_code=403, detail="Training admin access required")
    inst_id = _require_institution(current_user)

    q = (
        select(TrainingNeedsAssessment)
        .options(
            selectinload(TrainingNeedsAssessment.user),
            selectinload(TrainingNeedsAssessment.reviewed_by),
        )
        .where(TrainingNeedsAssessment.institution_id == inst_id)
        .order_by(TrainingNeedsAssessment.created_at.desc())
    )
    if status:
        try:
            q = q.where(TrainingNeedsAssessment.status == TrainingNeedsStatus(status))
        except ValueError:
            pass

    result = await db.execute(q)
    return [_serialize_needs(n) for n in result.scalars().all()]


@router.patch("/needs-assessments/{assessment_id}")
async def review_needs_assessment(
    assessment_id: str,
    body: NeedsAssessmentReview,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not _is_training_admin(current_user):
        raise HTTPException(status_code=403, detail="Training admin access required")
    inst_id = _require_institution(current_user)

    result = await db.execute(
        select(TrainingNeedsAssessment)
        .options(
            selectinload(TrainingNeedsAssessment.user),
            selectinload(TrainingNeedsAssessment.reviewed_by),
        )
        .where(and_(
            TrainingNeedsAssessment.id == assessment_id,
            TrainingNeedsAssessment.institution_id == inst_id,
        ))
    )
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    assessment.status = TrainingNeedsStatus(body.status)
    assessment.admin_notes = body.admin_notes
    assessment.reviewed_by_id = current_user.id
    assessment.reviewed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(assessment, ["user", "reviewed_by"])
    return _serialize_needs(assessment)


# ─── CPD ────────────────────────────────────────────────────────────────────

@router.get("/cpd/my")
async def my_cpd(
    year: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(CPDRecord).where(CPDRecord.user_id == current_user.id).order_by(CPDRecord.activity_date.desc())
    result = await db.execute(q)
    records = result.scalars().all()

    total = sum(r.cpd_hours for r in records)
    by_year = {}
    by_type = {}
    for r in records:
        y = r.activity_date.year if r.activity_date else 0
        if year and y != year:
            continue
        by_year[y] = by_year.get(y, 0) + r.cpd_hours
        t = _enum_val(r.activity_type)
        by_type[t] = by_type.get(t, 0) + r.cpd_hours

    filtered = records if not year else [r for r in records if r.activity_date and r.activity_date.year == year]

    return {
        "total_hours": total,
        "by_year": by_year,
        "by_type": by_type,
        "records": [_serialize_cpd(r) for r in filtered],
    }


@router.post("/cpd")
async def add_cpd_record(
    body: CPDCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    record = CPDRecord(
        user_id=current_user.id,
        title=body.title,
        description=body.description,
        activity_type=CPDActivityType(body.activity_type),
        cpd_hours=body.cpd_hours,
        activity_date=body.activity_date,
        provider=body.provider,
        verified=False,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return _serialize_cpd(record)
