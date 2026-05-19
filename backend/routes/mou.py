from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, date
import json

from database import get_db
from models import (
    User, Institution,
    Mou, MouStatus, MouType, MouConfidentiality, MouRiskRating,
    MouPartner, MouPartnerType, MouPartnerTier,
    MouPartnerContact,
    MouParticipant, MouParticipantRole,
    MouCommunication, MouCommunicationType,
    MouApprovalStage, MouApprovalStageType, MouApprovalStageStatus,
    MouActivity, MouActivityType, MouActivityStatus,
    MouVersion, MouVersionType,
    MouBudget, MouBudgetStatus,
    MouComplianceItem, MouComplianceStatus,
)
from auth import get_current_user

router = APIRouter(prefix="/api/mou", tags=["mou"])

MOU_ROLES = {"MOU_ADMIN", "LEGAL_OFFICER", "PARTNERSHIP_COORDINATOR",
             "INSTITUTIONAL_LEADERSHIP", "FINANCE_OFFICER", "ADMIN_STAFF",
             "GRANT_MANAGER", "RESEARCHER"}


def _check_access(current_user: User):
    if current_user.is_global_admin or current_user.is_institution_admin:
        return
    role = current_user.primary_account_type.value if current_user.primary_account_type else ""
    if role not in MOU_ROLES:
        raise HTTPException(status_code=403, detail="Insufficient permissions for MoU module")


def _auto_mou_number(institution_id: str, year: int, seq: int) -> str:
    return f"MOU-{year}-{institution_id:03d}-{seq:04d}"


# ═══════════════════════════════════════════════════════════════════════════
# PYDANTIC SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class MouCreate(BaseModel):
    title: str
    mou_type: str
    thematic_area: Optional[str] = None
    lead_department: Optional[str] = None
    scope_objectives: Optional[str] = None
    obligations_institution: Optional[str] = None
    obligations_partner: Optional[str] = None
    governing_law: Optional[str] = None
    confidentiality_level: Optional[str] = "INTERNAL"
    effective_date: Optional[date] = None
    expiry_date: Optional[date] = None
    duration_years: Optional[float] = None
    auto_renew: bool = False
    renewal_notice_days: int = 90
    financial_commitment: bool = False
    ip_clauses: bool = False
    data_sharing: bool = False
    coordinator_id: Optional[str] = None
    legal_officer_id: Optional[str] = None
    risk_rating: Optional[str] = None


class MouUpdate(BaseModel):
    title: Optional[str] = None
    mou_type: Optional[str] = None
    thematic_area: Optional[str] = None
    lead_department: Optional[str] = None
    scope_objectives: Optional[str] = None
    obligations_institution: Optional[str] = None
    obligations_partner: Optional[str] = None
    governing_law: Optional[str] = None
    confidentiality_level: Optional[str] = None
    effective_date: Optional[date] = None
    expiry_date: Optional[date] = None
    signed_date: Optional[date] = None
    duration_years: Optional[float] = None
    auto_renew: Optional[bool] = None
    renewal_notice_days: Optional[int] = None
    financial_commitment: Optional[bool] = None
    ip_clauses: Optional[bool] = None
    data_sharing: Optional[bool] = None
    coordinator_id: Optional[str] = None
    legal_officer_id: Optional[str] = None
    risk_rating: Optional[str] = None


class PartnerCreate(BaseModel):
    organisation_name: str
    organisation_type: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    website: Optional[str] = None
    accreditation_status: Optional[str] = None
    notes: Optional[str] = None


class PartnerUpdate(BaseModel):
    organisation_name: Optional[str] = None
    organisation_type: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    website: Optional[str] = None
    accreditation_status: Optional[str] = None
    partnership_tier: Optional[str] = None
    notes: Optional[str] = None


class ContactCreate(BaseModel):
    full_name: str
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    orcid_id: Optional[str] = None
    is_primary: bool = False
    role_at_partner: Optional[str] = None
    mou_id: Optional[str] = None


class ParticipantCreate(BaseModel):
    partner_id: str
    role: Optional[str] = "CO_SIGNATORY"
    signatory_name: Optional[str] = None
    signatory_title: Optional[str] = None
    signed_date: Optional[date] = None


class CommunicationCreate(BaseModel):
    partner_id: Optional[str] = None
    communication_type: str = "OTHER"
    date: Optional[date] = None
    summary: Optional[str] = None
    outcome: Optional[str] = None
    next_action: Optional[str] = None


class WorkflowAction(BaseModel):
    comments: Optional[str] = None
    assigned_to_id: Optional[str] = None
    signed_date: Optional[date] = None
    signatory_name: Optional[str] = None
    signatory_title: Optional[str] = None


class ActivityCreate(BaseModel):
    title: str
    description: Optional[str] = None
    activity_type: str = "OTHER"
    assigned_to_id: Optional[str] = None
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None


class ActivityUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    activity_type: Optional[str] = None
    assigned_to_id: Optional[str] = None
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    status: Optional[str] = None
    completion_percentage: Optional[int] = None


class BudgetCreate(BaseModel):
    description: Optional[str] = None
    currency: str = "KES"
    committed_by_institution: float = 0
    committed_by_partner: float = 0
    total_budget: float = 0


class ComplianceUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
# MoU CRUD
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/", status_code=201)
async def create_mou(
    payload: MouCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_access(current_user)
    if not current_user.primary_institution_id:
        raise HTTPException(400, "User has no institution assigned")

    count_res = await db.execute(
        select(func.count()).select_from(Mou).where(Mou.institution_id == current_user.primary_institution_id)
    )
    seq = (count_res.scalar() or 0) + 1
    year = datetime.utcnow().year
    mou_number = _auto_mou_number(current_user.primary_institution_id, year, seq)

    mou = Mou(
        institution_id=current_user.primary_institution_id,
        mou_number=mou_number,
        created_by_id=current_user.id,
        **{k: v for k, v in payload.dict(exclude_none=True).items()
           if hasattr(Mou, k)}
    )
    db.add(mou)
    await db.commit()
    await db.refresh(mou)
    return _mou_dict(mou)


@router.get("/")
async def list_mous(
    status: Optional[str] = Query(None),
    mou_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_access(current_user)
    q = select(Mou).where(Mou.institution_id == current_user.primary_institution_id)
    if status:
        q = q.where(Mou.status == status)
    if mou_type:
        q = q.where(Mou.mou_type == mou_type)
    if search:
        q = q.where(or_(
            Mou.title.ilike(f"%{search}%"),
            Mou.mou_number.ilike(f"%{search}%"),
        ))
    q = q.order_by(Mou.created_at.desc())
    result = await db.execute(q)
    mous = result.scalars().all()
    return [_mou_dict(m) for m in mous]


@router.get("/analytics/dashboard")
async def mou_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_access(current_user)
    inst = current_user.primary_institution_id
    if not inst:
        return {}

    async def count_status(s):
        r = await db.execute(
            select(func.count()).select_from(Mou).where(
                and_(Mou.institution_id == inst, Mou.status == s)
            )
        )
        return r.scalar() or 0

    active = await count_status(MouStatus.ACTIVE)
    draft = await count_status(MouStatus.DRAFT)
    pending = await count_status(MouStatus.PENDING_SIGNING)
    expired = await count_status(MouStatus.EXPIRED)
    pending_renewal = await count_status(MouStatus.PENDING_RENEWAL)
    total_r = await db.execute(
        select(func.count()).select_from(Mou).where(Mou.institution_id == inst)
    )
    total = total_r.scalar() or 0

    partners_r = await db.execute(
        select(func.count()).select_from(MouPartner).where(MouPartner.institution_id == inst)
    )
    partners = partners_r.scalar() or 0

    act_r = await db.execute(
        select(func.count()).select_from(MouActivity).join(Mou).where(Mou.institution_id == inst)
    )
    activities = act_r.scalar() or 0

    completed_act_r = await db.execute(
        select(func.count()).select_from(MouActivity).join(Mou).where(
            and_(Mou.institution_id == inst, MouActivity.status == MouActivityStatus.COMPLETED)
        )
    )
    completed_activities = completed_act_r.scalar() or 0

    return {
        "total": total,
        "active": active,
        "draft": draft,
        "pending_signing": pending,
        "expired": expired,
        "pending_renewal": pending_renewal,
        "total_partners": partners,
        "total_activities": activities,
        "completed_activities": completed_activities,
        "completion_rate": round((completed_activities / activities * 100) if activities > 0 else 0, 1),
    }


@router.get("/analytics/by-type")
async def mou_by_type(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_access(current_user)
    inst = current_user.primary_institution_id
    r = await db.execute(
        select(Mou.mou_type, func.count().label("count"))
        .where(Mou.institution_id == inst)
        .group_by(Mou.mou_type)
    )
    return [{"type": row[0], "count": row[1]} for row in r.all()]


@router.get("/analytics/by-status")
async def mou_by_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_access(current_user)
    inst = current_user.primary_institution_id
    r = await db.execute(
        select(Mou.status, func.count().label("count"))
        .where(Mou.institution_id == inst)
        .group_by(Mou.status)
    )
    return [{"status": row[0], "count": row[1]} for row in r.all()]


@router.get("/{mou_id}")
async def get_mou(
    mou_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_access(current_user)
    mou = await _get_mou_or_404(mou_id, current_user, db)
    result = _mou_dict(mou)
    result["participants"] = [_participant_dict(p) for p in mou.participants]
    result["approval_stages"] = [_stage_dict(s) for s in sorted(mou.approval_stages, key=lambda x: x.stage_order)]
    result["activities"] = [_activity_dict(a) for a in mou.activities]
    result["versions"] = [_version_dict(v) for v in mou.versions]
    result["compliance_items"] = [_compliance_dict(c) for c in mou.compliance_items]
    return result


@router.put("/{mou_id}")
async def update_mou(
    mou_id: str,
    payload: MouUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_access(current_user)
    mou = await _get_mou_or_404(mou_id, current_user, db)
    if mou.status not in (MouStatus.DRAFT, MouStatus.INTERNAL_REVIEW):
        raise HTTPException(400, "MoU can only be edited in DRAFT or INTERNAL_REVIEW status")
    for field, value in payload.dict(exclude_none=True).items():
        if hasattr(mou, field):
            setattr(mou, field, value)
    await db.commit()
    await db.refresh(mou)
    return _mou_dict(mou)


@router.delete("/{mou_id}", status_code=204)
async def delete_mou(
    mou_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_access(current_user)
    mou = await _get_mou_or_404(mou_id, current_user, db)
    if mou.status != MouStatus.DRAFT:
        raise HTTPException(400, "Only DRAFT MoUs can be deleted")
    await db.delete(mou)
    await db.commit()


# ═══════════════════════════════════════════════════════════════════════════
# WORKFLOW
# ═══════════════════════════════════════════════════════════════════════════

VALID_TRANSITIONS = {
    MouStatus.DRAFT:           [MouStatus.INTERNAL_REVIEW, MouStatus.CLOSED],
    MouStatus.INTERNAL_REVIEW: [MouStatus.DRAFT, MouStatus.LEGAL_REVIEW, MouStatus.CLOSED],
    MouStatus.LEGAL_REVIEW:    [MouStatus.DRAFT, MouStatus.EXEC_APPROVAL],
    MouStatus.EXEC_APPROVAL:   [MouStatus.LEGAL_REVIEW, MouStatus.PENDING_SIGNING, MouStatus.CLOSED],
    MouStatus.PENDING_SIGNING: [MouStatus.ACTIVE, MouStatus.DRAFT],
    MouStatus.ACTIVE:          [MouStatus.MID_TERM_REVIEW, MouStatus.PENDING_RENEWAL, MouStatus.SUSPENDED, MouStatus.CLOSED, MouStatus.EXPIRED],
    MouStatus.MID_TERM_REVIEW: [MouStatus.ACTIVE, MouStatus.SUSPENDED],
    MouStatus.PENDING_RENEWAL: [MouStatus.DRAFT, MouStatus.CLOSED, MouStatus.EXPIRED],
    MouStatus.SUSPENDED:       [MouStatus.ACTIVE, MouStatus.CLOSED],
    MouStatus.EXPIRED:         [MouStatus.ARCHIVED, MouStatus.DRAFT],
    MouStatus.CLOSED:          [MouStatus.ARCHIVED],
    MouStatus.ARCHIVED:        [],
}


@router.post("/{mou_id}/workflow/submit")
async def workflow_submit(
    mou_id: str,
    payload: WorkflowAction = WorkflowAction(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mou = await _get_mou_or_404(mou_id, current_user, db)
    _transition(mou, MouStatus.INTERNAL_REVIEW)
    stage = MouApprovalStage(
        mou_id=mou.id,
        stage_type=MouApprovalStageType.INTERNAL_REVIEW,
        stage_order=1,
        assigned_to_id=payload.assigned_to_id,
        status=MouApprovalStageStatus.PENDING,
        sla_days=5,
    )
    db.add(stage)
    await db.commit()
    return {"status": mou.status}


@router.post("/{mou_id}/workflow/approve")
async def workflow_approve(
    mou_id: str,
    payload: WorkflowAction = WorkflowAction(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mou = await _get_mou_or_404(mou_id, current_user, db)
    next_map = {
        MouStatus.INTERNAL_REVIEW: MouStatus.LEGAL_REVIEW,
        MouStatus.LEGAL_REVIEW:    MouStatus.EXEC_APPROVAL,
        MouStatus.EXEC_APPROVAL:   MouStatus.PENDING_SIGNING,
    }
    if mou.status not in next_map:
        raise HTTPException(400, f"Cannot approve from status {mou.status}")
    next_status = next_map[mou.status]
    _transition(mou, next_status)
    await _close_current_stage(mou_id, MouApprovalStageStatus.APPROVED, current_user.id, payload.comments, db)
    await db.commit()
    return {"status": mou.status}


@router.post("/{mou_id}/workflow/return")
async def workflow_return(
    mou_id: str,
    payload: WorkflowAction = WorkflowAction(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mou = await _get_mou_or_404(mou_id, current_user, db)
    _transition(mou, MouStatus.DRAFT)
    await _close_current_stage(mou_id, MouApprovalStageStatus.RETURNED, current_user.id, payload.comments, db)
    await db.commit()
    return {"status": mou.status}


@router.post("/{mou_id}/workflow/sign")
async def workflow_sign(
    mou_id: str,
    payload: WorkflowAction = WorkflowAction(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mou = await _get_mou_or_404(mou_id, current_user, db)
    _transition(mou, MouStatus.ACTIVE)
    if payload.signed_date:
        mou.signed_date = payload.signed_date
    stage = MouApprovalStage(
        mou_id=mou.id,
        stage_type=MouApprovalStageType.SIGNING,
        stage_order=4,
        status=MouApprovalStageStatus.APPROVED,
        comments=f"Signed by {payload.signatory_name or 'unknown'} ({payload.signatory_title or ''})",
        decided_at=datetime.utcnow(),
        decided_by_id=current_user.id,
    )
    db.add(stage)
    await db.commit()
    return {"status": mou.status}


@router.post("/{mou_id}/workflow/close")
async def workflow_close(
    mou_id: str,
    payload: WorkflowAction = WorkflowAction(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mou = await _get_mou_or_404(mou_id, current_user, db)
    _transition(mou, MouStatus.CLOSED)
    await db.commit()
    return {"status": mou.status}


@router.post("/{mou_id}/workflow/suspend")
async def workflow_suspend(
    mou_id: str,
    payload: WorkflowAction = WorkflowAction(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mou = await _get_mou_or_404(mou_id, current_user, db)
    _transition(mou, MouStatus.SUSPENDED)
    await db.commit()
    return {"status": mou.status}


@router.get("/{mou_id}/workflow/history")
async def workflow_history(
    mou_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_access(current_user)
    r = await db.execute(
        select(MouApprovalStage)
        .options(
            selectinload(MouApprovalStage.assigned_to),
            selectinload(MouApprovalStage.decided_by),
        )
        .where(MouApprovalStage.mou_id == mou_id)
        .order_by(MouApprovalStage.created_at)
    )
    stages = r.scalars().all()
    return [_stage_dict(s) for s in stages]


# ═══════════════════════════════════════════════════════════════════════════
# PARTNERS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/partners/", status_code=201)
async def create_partner(
    payload: PartnerCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_access(current_user)
    partner = MouPartner(
        institution_id=current_user.primary_institution_id,
        **payload.dict(exclude_none=True),
    )
    db.add(partner)
    await db.commit()
    await db.refresh(partner)
    return _partner_dict(partner)


@router.get("/partners/")
async def list_partners(
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_access(current_user)
    q = select(MouPartner).options(selectinload(MouPartner.contacts)).where(
        MouPartner.institution_id == current_user.primary_institution_id
    )
    if search:
        q = q.where(MouPartner.organisation_name.ilike(f"%{search}%"))
    q = q.order_by(MouPartner.organisation_name)
    r = await db.execute(q)
    partners = r.scalars().all()
    return [_partner_dict(p) for p in partners]


@router.get("/partners/{partner_id}")
async def get_partner(
    partner_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_access(current_user)
    r = await db.execute(
        select(MouPartner).options(selectinload(MouPartner.contacts)).where(
            and_(MouPartner.id == partner_id,
                 MouPartner.institution_id == current_user.primary_institution_id)
        )
    )
    partner = r.scalar_one_or_none()
    if not partner:
        raise HTTPException(404, "Partner not found")
    result = _partner_dict(partner)
    result["contacts"] = [_contact_dict(c) for c in partner.contacts]
    return result


@router.put("/partners/{partner_id}")
async def update_partner(
    partner_id: str,
    payload: PartnerUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_access(current_user)
    r = await db.execute(
        select(MouPartner).where(
            and_(MouPartner.id == partner_id,
                 MouPartner.institution_id == current_user.primary_institution_id)
        )
    )
    partner = r.scalar_one_or_none()
    if not partner:
        raise HTTPException(404, "Partner not found")
    for f, v in payload.dict(exclude_none=True).items():
        if hasattr(partner, f):
            setattr(partner, f, v)
    await db.commit()
    await db.refresh(partner)
    return _partner_dict(partner)


@router.post("/partners/{partner_id}/contacts", status_code=201)
async def add_contact(
    partner_id: str,
    payload: ContactCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_access(current_user)
    contact = MouPartnerContact(partner_id=partner_id, **payload.dict(exclude_none=True))
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return _contact_dict(contact)


# ═══════════════════════════════════════════════════════════════════════════
# PARTICIPANTS (partner linked to MoU)
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/{mou_id}/participants", status_code=201)
async def add_participant(
    mou_id: str,
    payload: ParticipantCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_access(current_user)
    await _get_mou_or_404(mou_id, current_user, db)
    p = MouParticipant(mou_id=mou_id, **payload.dict(exclude_none=True))
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return {"id": p.id, "mou_id": p.mou_id, "partner_id": p.partner_id, "role": p.role}


@router.delete("/{mou_id}/participants/{partner_id}", status_code=204)
async def remove_participant(
    mou_id: str,
    partner_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_access(current_user)
    r = await db.execute(
        select(MouParticipant).where(
            and_(MouParticipant.mou_id == mou_id, MouParticipant.partner_id == partner_id)
        )
    )
    p = r.scalar_one_or_none()
    if p:
        await db.delete(p)
        await db.commit()


# ═══════════════════════════════════════════════════════════════════════════
# COMMUNICATIONS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/{mou_id}/communications", status_code=201)
async def log_communication(
    mou_id: str,
    payload: CommunicationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_access(current_user)
    await _get_mou_or_404(mou_id, current_user, db)
    c = MouCommunication(mou_id=mou_id, logged_by_id=current_user.id, **payload.dict(exclude_none=True))
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return {"id": c.id, "mou_id": c.mou_id, "summary": c.summary, "date": str(c.date)}


@router.get("/{mou_id}/communications")
async def list_communications(
    mou_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_access(current_user)
    r = await db.execute(
        select(MouCommunication).where(MouCommunication.mou_id == mou_id).order_by(MouCommunication.created_at.desc())
    )
    return [{"id": c.id, "type": c.communication_type, "date": str(c.date), "summary": c.summary,
             "outcome": c.outcome, "next_action": c.next_action} for c in r.scalars().all()]


# ═══════════════════════════════════════════════════════════════════════════
# ACTIVITIES
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/{mou_id}/activities", status_code=201)
async def create_activity(
    mou_id: str,
    payload: ActivityCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_access(current_user)
    await _get_mou_or_404(mou_id, current_user, db)
    a = MouActivity(mou_id=mou_id, **payload.dict(exclude_none=True))
    db.add(a)
    await db.commit()
    await db.refresh(a)
    return _activity_dict(a)


@router.get("/{mou_id}/activities")
async def list_activities(
    mou_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_access(current_user)
    r = await db.execute(
        select(MouActivity).where(MouActivity.mou_id == mou_id).order_by(MouActivity.created_at)
    )
    return [_activity_dict(a) for a in r.scalars().all()]


@router.put("/{mou_id}/activities/{activity_id}")
async def update_activity(
    mou_id: str,
    activity_id: str,
    payload: ActivityUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_access(current_user)
    r = await db.execute(
        select(MouActivity).where(and_(MouActivity.id == activity_id, MouActivity.mou_id == mou_id))
    )
    a = r.scalar_one_or_none()
    if not a:
        raise HTTPException(404, "Activity not found")
    for f, v in payload.dict(exclude_none=True).items():
        if hasattr(a, f):
            setattr(a, f, v)
    await db.commit()
    await db.refresh(a)
    return _activity_dict(a)


# ═══════════════════════════════════════════════════════════════════════════
# BUDGET
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/{mou_id}/budget", status_code=201)
async def create_budget(
    mou_id: str,
    payload: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_access(current_user)
    await _get_mou_or_404(mou_id, current_user, db)
    b = MouBudget(mou_id=mou_id, **payload.dict())
    db.add(b)
    await db.commit()
    await db.refresh(b)
    return _budget_dict(b)


@router.get("/{mou_id}/budget")
async def get_budget(
    mou_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_access(current_user)
    r = await db.execute(select(MouBudget).where(MouBudget.mou_id == mou_id))
    return [_budget_dict(b) for b in r.scalars().all()]


# ═══════════════════════════════════════════════════════════════════════════
# COMPLIANCE
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/{mou_id}/compliance")
async def get_compliance(
    mou_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_access(current_user)
    r = await db.execute(select(MouComplianceItem).where(MouComplianceItem.mou_id == mou_id))
    return [_compliance_dict(c) for c in r.scalars().all()]


@router.put("/{mou_id}/compliance/{item_id}")
async def update_compliance(
    mou_id: str,
    item_id: str,
    payload: ComplianceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_access(current_user)
    r = await db.execute(
        select(MouComplianceItem).where(
            and_(MouComplianceItem.id == item_id, MouComplianceItem.mou_id == mou_id)
        )
    )
    item = r.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Compliance item not found")
    item.status = payload.status
    if payload.notes:
        item.notes = payload.notes
    item.verified_by_id = current_user.id
    item.verified_at = datetime.utcnow()
    await db.commit()
    return _compliance_dict(item)


# ═══════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════

async def _get_mou_or_404(mou_id: str, current_user: User, db: AsyncSession) -> Mou:
    _check_access(current_user)
    r = await db.execute(
        select(Mou)
        .options(
            selectinload(Mou.participants).selectinload(MouParticipant.partner),
            selectinload(Mou.approval_stages),
            selectinload(Mou.activities),
            selectinload(Mou.versions),
            selectinload(Mou.compliance_items),
        )
        .where(and_(Mou.id == mou_id, Mou.institution_id == current_user.primary_institution_id))
    )
    mou = r.scalar_one_or_none()
    if not mou:
        raise HTTPException(404, "MoU not found")
    return mou


def _transition(mou: Mou, target: MouStatus):
    allowed = VALID_TRANSITIONS.get(mou.status, [])
    if target not in allowed:
        raise HTTPException(400, f"Cannot transition from {mou.status} to {target}")
    mou.status = target


async def _close_current_stage(mou_id: str, result: MouApprovalStageStatus, actor_id: str, comments, db):
    r = await db.execute(
        select(MouApprovalStage).where(
            and_(
                MouApprovalStage.mou_id == mou_id,
                MouApprovalStage.status.in_([MouApprovalStageStatus.PENDING, MouApprovalStageStatus.IN_PROGRESS])
            )
        ).order_by(MouApprovalStage.stage_order.desc()).limit(1)
    )
    stage = r.scalar_one_or_none()
    if stage:
        stage.status = result
        stage.decided_at = datetime.utcnow()
        stage.decided_by_id = actor_id
        if comments:
            stage.comments = comments


def _mou_dict(m: Mou) -> dict:
    return {
        "id": m.id,
        "mou_number": m.mou_number,
        "title": m.title,
        "mou_type": m.mou_type,
        "status": m.status,
        "thematic_area": m.thematic_area,
        "lead_department": m.lead_department,
        "scope_objectives": m.scope_objectives,
        "obligations_institution": m.obligations_institution,
        "obligations_partner": m.obligations_partner,
        "governing_law": m.governing_law,
        "confidentiality_level": m.confidentiality_level,
        "effective_date": str(m.effective_date) if m.effective_date else None,
        "expiry_date": str(m.expiry_date) if m.expiry_date else None,
        "signed_date": str(m.signed_date) if m.signed_date else None,
        "duration_years": m.duration_years,
        "auto_renew": m.auto_renew,
        "renewal_notice_days": m.renewal_notice_days,
        "financial_commitment": m.financial_commitment,
        "ip_clauses": m.ip_clauses,
        "data_sharing": m.data_sharing,
        "risk_rating": m.risk_rating,
        "coordinator_id": m.coordinator_id,
        "legal_officer_id": m.legal_officer_id,
        "parent_mou_id": m.parent_mou_id,
        "created_by_id": m.created_by_id,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "updated_at": m.updated_at.isoformat() if m.updated_at else None,
    }


def _partner_dict(p: MouPartner) -> dict:
    return {
        "id": p.id,
        "organisation_name": p.organisation_name,
        "organisation_type": p.organisation_type,
        "country": p.country,
        "region": p.region,
        "city": p.city,
        "website": p.website,
        "accreditation_status": p.accreditation_status,
        "partnership_tier": p.partnership_tier,
        "notes": p.notes,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


def _contact_dict(c: MouPartnerContact) -> dict:
    return {
        "id": c.id,
        "partner_id": c.partner_id,
        "full_name": c.full_name,
        "title": c.title,
        "email": c.email,
        "phone": c.phone,
        "orcid_id": c.orcid_id,
        "is_primary": c.is_primary,
        "role_at_partner": c.role_at_partner,
    }


def _participant_dict(p: MouParticipant) -> dict:
    return {
        "id": p.id,
        "mou_id": p.mou_id,
        "partner_id": p.partner_id,
        "partner_name": p.partner.organisation_name if p.partner else None,
        "partner_country": p.partner.country if p.partner else None,
        "partner_type": p.partner.organisation_type if p.partner else None,
        "role": p.role,
        "signatory_name": p.signatory_name,
        "signatory_title": p.signatory_title,
        "signed_date": str(p.signed_date) if p.signed_date else None,
    }


def _stage_dict(s: MouApprovalStage) -> dict:
    return {
        "id": s.id,
        "stage_type": s.stage_type,
        "stage_order": s.stage_order,
        "status": s.status,
        "comments": s.comments,
        "assigned_to_id": s.assigned_to_id,
        "decided_at": s.decided_at.isoformat() if s.decided_at else None,
        "decided_by_id": s.decided_by_id,
        "sla_days": s.sla_days,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


def _activity_dict(a: MouActivity) -> dict:
    return {
        "id": a.id,
        "mou_id": a.mou_id,
        "title": a.title,
        "description": a.description,
        "activity_type": a.activity_type,
        "assigned_to_id": a.assigned_to_id,
        "planned_start_date": str(a.planned_start_date) if a.planned_start_date else None,
        "planned_end_date": str(a.planned_end_date) if a.planned_end_date else None,
        "status": a.status,
        "completion_percentage": a.completion_percentage,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


def _version_dict(v: MouVersion) -> dict:
    return {
        "id": v.id,
        "version_number": v.version_number,
        "version_type": v.version_type,
        "document_path": v.document_path,
        "change_summary": v.change_summary,
        "uploaded_at": v.uploaded_at.isoformat() if v.uploaded_at else None,
    }


def _budget_dict(b: MouBudget) -> dict:
    return {
        "id": b.id,
        "description": b.description,
        "currency": b.currency,
        "committed_by_institution": b.committed_by_institution,
        "committed_by_partner": b.committed_by_partner,
        "total_budget": b.total_budget,
        "status": b.status,
        "approved_at": b.approved_at.isoformat() if b.approved_at else None,
    }


def _compliance_dict(c: MouComplianceItem) -> dict:
    return {
        "id": c.id,
        "check_type": c.check_type,
        "required": c.required,
        "status": c.status,
        "notes": c.notes,
        "verified_by_id": c.verified_by_id,
        "verified_at": c.verified_at.isoformat() if c.verified_at else None,
    }
