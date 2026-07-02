from sqlalchemy import select
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_active_user
from database import get_db
from models import Institution, PgAuditLog, User
from routes.postgraduate.deps import require_pg_admin

router = APIRouter(prefix="/api/postgraduate/audit", tags=["postgraduate-audit"])


@router.get("")
async def list_audit_log(
    ctx: tuple[User, Institution] = Depends(require_pg_admin),
    db: AsyncSession = Depends(get_db),
    student_id: str | None = None,
):
    _, institution = ctx
    query = select(PgAuditLog).where(PgAuditLog.institution_id == institution.id)
    if student_id:
        query = query.where(PgAuditLog.student_id == student_id)
    result = await db.execute(query.order_by(PgAuditLog.created_at.desc()).limit(200))
    entries = result.scalars().all()
    return {
        "entries": [
            {
                "id": e.id,
                "entity_type": e.entity_type,
                "entity_id": e.entity_id,
                "student_id": e.student_id,
                "action": e.action,
                "actor_role": e.actor_role,
                "reason": e.reason,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in entries
        ]
    }
