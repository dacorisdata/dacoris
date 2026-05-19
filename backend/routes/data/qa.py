from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime
import json

from database import get_db
from models import (
    QARule, QAResult, QARuleAction, QAResultStatus,
    FormSubmission, QAStatus, Dataset, CaptureForm,
    User, ResearchRole,
)
from auth import require_roles

router = APIRouter(prefix="/api/data/qa", tags=["data-qa"])


# ──── Schemas ────────────────────────────────────────────────────────────────
class QARuleCreate(BaseModel):
    dataset_id: str
    rule_type: str  # missing_value, duplicate, range, format, consistency
    field_name: str
    operator: Optional[str] = None
    threshold: Optional[str] = None
    action: str = "flag"

class QARuleOut(BaseModel):
    id: str
    dataset_id: str
    rule_type: str
    field_name: str
    operator: Optional[str]
    threshold: Optional[str]
    action: str
    is_active: bool
    created_at: Any

    class Config:
        from_attributes = True

class QAResultOut(BaseModel):
    id: str
    submission_id: str
    rule_id: str
    rule_type: Optional[str] = None
    field_name: Optional[str] = None
    status: str
    details: Optional[str]
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[Any] = None
    created_at: Any

    class Config:
        from_attributes = True


# ──── QA Rules CRUD ──────────────────────────────────────────────────────────

@router.post("/rules", status_code=201)
async def create_qa_rule(
    payload: QARuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.DATA_STEWARD]))
):
    ds = await db.get(Dataset, payload.dataset_id)
    if not ds or ds.institution_id != current_user.primary_institution_id:
        raise HTTPException(404, "Dataset not found")

    rule = QARule(
        dataset_id=payload.dataset_id,
        rule_type=payload.rule_type,
        field_name=payload.field_name,
        operator=payload.operator,
        threshold=payload.threshold,
        action=payload.action,
        created_by_id=current_user.id,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.get("/rules/{dataset_id}", response_model=List[QARuleOut])
async def list_qa_rules(
    dataset_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.DATA_STEWARD, ResearchRole.DATA_ENGINEER
    ]))
):
    result = await db.execute(
        select(QARule).where(QARule.dataset_id == dataset_id)
        .order_by(QARule.created_at.desc())
    )
    return result.scalars().all()


@router.delete("/rules/{rule_id}")
async def delete_qa_rule(
    rule_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.DATA_STEWARD]))
):
    rule = await db.get(QARule, rule_id)
    if not rule:
        raise HTTPException(404, "Rule not found")
    await db.delete(rule)
    await db.commit()
    return {"deleted": True}


# ──── Run QA Checks ──────────────────────────────────────────────────────────

def _check_rule(rule: QARule, data: dict) -> Optional[dict]:
    """Run a single QA rule against a submission's data."""
    field = rule.field_name
    value = data.get(field)

    if rule.rule_type == "missing_value":
        if value is None or (isinstance(value, str) and value.strip() == ""):
            return {"status": "failed", "details": f"Missing value for field '{field}'"}
        return {"status": "passed", "details": None}

    if rule.rule_type == "range":
        try:
            num_val = float(value) if value is not None else None
        except (ValueError, TypeError):
            return {"status": "failed", "details": f"Non-numeric value '{value}' for field '{field}'"}
        if num_val is not None and rule.threshold:
            parts = rule.threshold.split(",")
            if rule.operator == "between" and len(parts) == 2:
                lo, hi = float(parts[0]), float(parts[1])
                if not (lo <= num_val <= hi):
                    return {"status": "failed", "details": f"Value {num_val} outside range [{lo},{hi}] for '{field}'"}
            elif rule.operator == "gt" and num_val <= float(parts[0]):
                return {"status": "failed", "details": f"Value {num_val} not > {parts[0]} for '{field}'"}
            elif rule.operator == "lt" and num_val >= float(parts[0]):
                return {"status": "failed", "details": f"Value {num_val} not < {parts[0]} for '{field}'"}
        return {"status": "passed", "details": None}

    if rule.rule_type == "format":
        import re
        if value and rule.threshold:
            if not re.match(rule.threshold, str(value)):
                return {"status": "failed", "details": f"Value '{value}' doesn't match pattern '{rule.threshold}' for '{field}'"}
        return {"status": "passed", "details": None}

    # Default: pass if we don't know the rule type
    return {"status": "passed", "details": None}


@router.post("/run/{dataset_id}")
async def run_qa_checks(
    dataset_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.DATA_STEWARD]))
):
    """Run all active QA rules against staged submissions for a dataset's source form."""
    ds = await db.get(Dataset, dataset_id)
    if not ds or ds.institution_id != current_user.primary_institution_id:
        raise HTTPException(404, "Dataset not found")
    if not ds.source_form_id:
        raise HTTPException(400, "Dataset has no linked capture form")

    # Get active rules
    rules_result = await db.execute(
        select(QARule).where(and_(QARule.dataset_id == dataset_id, QARule.is_active == True))
    )
    rules = rules_result.scalars().all()
    if not rules:
        return {"message": "No active QA rules configured", "processed": 0}

    # Get staged submissions
    subs_result = await db.execute(
        select(FormSubmission).where(and_(
            FormSubmission.form_id == ds.source_form_id,
            FormSubmission.qa_status == QAStatus.STAGED,
        ))
    )
    submissions = subs_result.scalars().all()

    processed = 0
    passed_count = 0
    failed_count = 0

    for sub in submissions:
        try:
            data = json.loads(sub.data) if isinstance(sub.data, str) else sub.data
        except (json.JSONDecodeError, TypeError):
            data = {}

        sub_failed = False
        sub_rejected = False

        for rule in rules:
            check = _check_rule(rule, data)
            if check:
                qa_result = QAResult(
                    submission_id=sub.id,
                    rule_id=rule.id,
                    status=check["status"],
                    details=check["details"],
                )
                db.add(qa_result)

                if check["status"] == "failed":
                    sub_failed = True
                    if rule.action == QARuleAction.REJECT.value or rule.action == QARuleAction.REJECT:
                        sub_rejected = True

        if sub_rejected:
            sub.qa_status = QAStatus.QUARANTINED
            failed_count += 1
        elif sub_failed:
            sub.qa_status = QAStatus.FAILED
            failed_count += 1
        else:
            sub.qa_status = QAStatus.PASSED
            passed_count += 1

        processed += 1

    await db.commit()
    return {
        "processed": processed,
        "passed": passed_count,
        "failed": failed_count,
        "rules_applied": len(rules),
    }


# ──── QA Results ─────────────────────────────────────────────────────────────

@router.get("/results/{submission_id}", response_model=List[QAResultOut])
async def get_submission_qa_results(
    submission_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.DATA_STEWARD, ResearchRole.DATA_ENGINEER
    ]))
):
    result = await db.execute(
        select(QAResult)
        .options(selectinload(QAResult.rule), selectinload(QAResult.reviewed_by))
        .where(QAResult.submission_id == submission_id)
        .order_by(QAResult.created_at.desc())
    )
    results = result.scalars().all()
    return [
        {
            "id": r.id, "submission_id": r.submission_id, "rule_id": r.rule_id,
            "rule_type": r.rule.rule_type if r.rule else None,
            "field_name": r.rule.field_name if r.rule else None,
            "status": r.status.value if hasattr(r.status, "value") else r.status,
            "details": r.details,
            "reviewed_by_name": r.reviewed_by.name if r.reviewed_by else None,
            "reviewed_at": r.reviewed_at,
            "created_at": r.created_at,
        }
        for r in results
    ]


@router.post("/results/{result_id}/override")
async def override_qa_result(
    result_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.DATA_STEWARD]))
):
    """Override a failed QA result (manual approval with audit trail)."""
    qa_result = await db.get(QAResult, result_id)
    if not qa_result:
        raise HTTPException(404, "QA result not found")

    qa_result.status = QAResultStatus.PASSED
    qa_result.reviewed_by_id = current_user.id
    qa_result.reviewed_at = datetime.utcnow()
    qa_result.details = (qa_result.details or "") + f" [OVERRIDDEN by {current_user.name} at {datetime.utcnow().isoformat()}]"
    await db.commit()
    return {"overridden": True}


# ──── Submission QA Status Updates ───────────────────────────────────────────

@router.patch("/submissions/{submission_id}/status")
async def update_submission_qa_status(
    submission_id: str,
    target_status: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.DATA_STEWARD]))
):
    """Manually update a submission's QA status."""
    valid = [s.value for s in QAStatus]
    if target_status not in valid:
        raise HTTPException(400, f"Invalid status. Must be one of: {valid}")

    sub = await db.get(FormSubmission, submission_id)
    if not sub:
        raise HTTPException(404, "Submission not found")

    sub.qa_status = target_status
    await db.commit()
    return {"id": sub.id, "qa_status": target_status}


# ──── QA Dashboard Stats ─────────────────────────────────────────────────────

@router.get("/dashboard/{dataset_id}")
async def qa_dashboard(
    dataset_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.DATA_STEWARD, ResearchRole.DATA_ENGINEER,
        ResearchRole.INSTITUTIONAL_LEAD,
    ]))
):
    """Get QA pipeline stats for a dataset."""
    ds = await db.get(Dataset, dataset_id)
    if not ds or ds.institution_id != current_user.primary_institution_id:
        raise HTTPException(404, "Dataset not found")
    if not ds.source_form_id:
        return {"total": 0, "staged": 0, "passed": 0, "failed": 0, "quarantined": 0}

    counts = {}
    for status in QAStatus:
        result = await db.execute(
            select(func.count(FormSubmission.id)).where(and_(
                FormSubmission.form_id == ds.source_form_id,
                FormSubmission.qa_status == status,
            ))
        )
        counts[status.value] = result.scalar() or 0

    total = sum(counts.values())
    return {"total": total, **counts}
