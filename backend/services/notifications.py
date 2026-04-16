"""
Prototype notification service — stores in-app notifications.
Logs to console (no email in prototype).
"""
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from models import Notification

logger = logging.getLogger("dacoris.notifications")

async def create_notification(
    db: AsyncSession,
    user_id: int,
    title: str,
    message: str,
    entity_type: str = None,
    entity_id: int = None,
):
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.add(notification)
    await db.commit()
    logger.info(f"[NOTIFY] user={user_id} | {title}")
    return notification
