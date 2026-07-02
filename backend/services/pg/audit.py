from __future__ import annotations

from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from models import PgAuditLog, User


async def log_pg_action(
    db: AsyncSession,
    *,
    institution_id: str,
    entity_type: str,
    entity_id: str,
    action: str,
    actor: Optional[User] = None,
    student_id: Optional[str] = None,
    previous_value: Optional[str] = None,
    new_value: Optional[str] = None,
    reason: Optional[str] = None,
) -> PgAuditLog:
    entry = PgAuditLog(
        institution_id=institution_id,
        entity_type=entity_type,
        entity_id=entity_id,
        student_id=student_id,
        action=action,
        actor_user_id=actor.id if actor else None,
        actor_role=actor.primary_account_type.value if actor and actor.primary_account_type else None,
        previous_value=previous_value,
        new_value=new_value,
        reason=reason,
    )
    db.add(entry)
    return entry
