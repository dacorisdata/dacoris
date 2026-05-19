"""
Prototype notification service — stores in-app notifications.
Logs to console (no email in prototype).
"""
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from models import Notification, NotificationType, NotificationPriority

logger = logging.getLogger("dacoris.notifications")

async def create_notification(
    db: AsyncSession,
    user_id: int,
    title: str,
    message: str,
    entity_type: str = None,
    entity_id: int = None,
    link: str = None,
    notification_type: NotificationType = NotificationType.SYSTEM_ANNOUNCEMENT,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
):
    notification = Notification(
        recipient_id=user_id,
        type=notification_type,
        priority=priority,
        title=title,
        message=message,
        action_url=link,
        related_entity_type=entity_type,
        related_entity_id=entity_id,
    )
    db.add(notification)
    # Note: Caller is responsible for committing the transaction
    logger.info(f"[NOTIFY] user={user_id} | {title}")
    return notification
