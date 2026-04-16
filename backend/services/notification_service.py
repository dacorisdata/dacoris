from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from models import Notification, NotificationType, NotificationPriority, User, UserStatus

class NotificationService:
    """Service for managing notifications"""
    
    @staticmethod
    async def create_notification(
        db: AsyncSession,
        recipient_id: int,
        type: NotificationType,
        title: str,
        message: str,
        priority: NotificationPriority = NotificationPriority.MEDIUM,
        action_url: Optional[str] = None,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[int] = None,
        expires_in_days: Optional[int] = None
    ) -> Notification:
        """Create a new notification"""
        
        expires_at = None
        if expires_in_days:
            expires_at = datetime.now(timezone.utc) + timedelta(days=expires_in_days)
        
        notification = Notification(
            recipient_id=recipient_id,
            type=type,
            priority=priority,
            title=title,
            message=message,
            action_url=action_url,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
            expires_at=expires_at
        )
        
        db.add(notification)
        await db.commit()
        await db.refresh(notification)
        
        return notification
    
    @staticmethod
    async def notify_admins_new_registration(
        db: AsyncSession,
        institution_id: int,
        new_user_id: int,
        new_user_name: str,
        new_user_email: str
    ):
        """Notify institution admins about new registration"""
        
        # Get all institution admins
        result = await db.execute(
            select(User).where(
                and_(
                    User.primary_institution_id == institution_id,
                    User.is_institution_admin == True,
                    User.status == UserStatus.ACTIVE
                )
            )
        )
        admins = result.scalars().all()
        
        # Create notification for each admin
        for admin in admins:
            await NotificationService.create_notification(
                db=db,
                recipient_id=admin.id,
                type=NotificationType.NEW_REGISTRATION,
                title="New Account Registration",
                message=f"{new_user_name} ({new_user_email}) has registered and is pending approval.",
                priority=NotificationPriority.HIGH,
                action_url=f"/institution-admin/pending-users",
                related_entity_type="user",
                related_entity_id=new_user_id,
                expires_in_days=30
            )
    
    @staticmethod
    async def notify_account_approved(
        db: AsyncSession,
        user_id: int,
        approved_by_name: str
    ):
        """Notify user that their account has been approved"""
        
        await NotificationService.create_notification(
            db=db,
            recipient_id=user_id,
            type=NotificationType.ACCOUNT_APPROVED,
            title="Account Approved",
            message=f"Your account has been approved by {approved_by_name}. You can now log in and access the platform.",
            priority=NotificationPriority.HIGH,
            action_url="/login"
        )
    
    @staticmethod
    async def notify_account_rejected(
        db: AsyncSession,
        user_id: int,
        reason: Optional[str] = None
    ):
        """Notify user that their account has been rejected"""
        
        message = "Your account registration has been rejected."
        if reason:
            message += f" Reason: {reason}"
        
        await NotificationService.create_notification(
            db=db,
            recipient_id=user_id,
            type=NotificationType.ACCOUNT_REJECTED,
            title="Account Registration Rejected",
            message=message,
            priority=NotificationPriority.HIGH
        )
    
    @staticmethod
    async def notify_role_assigned(
        db: AsyncSession,
        user_id: int,
        role_name: str,
        assigned_by_name: str
    ):
        """Notify user that a role has been assigned"""
        
        await NotificationService.create_notification(
            db=db,
            recipient_id=user_id,
            type=NotificationType.ROLE_ASSIGNED,
            title="New Role Assigned",
            message=f"You have been assigned the role of {role_name} by {assigned_by_name}.",
            priority=NotificationPriority.MEDIUM,
            action_url="/profile"
        )
    
    @staticmethod
    async def get_user_notifications(
        db: AsyncSession,
        user_id: int,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Notification]:
        """Get notifications for a user"""
        
        query = select(Notification).where(Notification.recipient_id == user_id)
        
        if unread_only:
            query = query.where(Notification.is_read == False)
        
        # Filter out expired notifications
        query = query.where(
            or_(
                Notification.expires_at == None,
                Notification.expires_at > datetime.now(timezone.utc)
            )
        )
        
        query = query.order_by(Notification.created_at.desc()).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def get_unread_count(db: AsyncSession, user_id: int) -> int:
        """Get count of unread notifications for a user"""
        
        result = await db.execute(
            select(func.count(Notification.id)).where(
                and_(
                    Notification.recipient_id == user_id,
                    Notification.is_read == False,
                    or_(
                        Notification.expires_at == None,
                        Notification.expires_at > datetime.now(timezone.utc)
                    )
                )
            )
        )
        return result.scalar()
    
    @staticmethod
    async def mark_as_read(
        db: AsyncSession,
        notification_id: int,
        user_id: int
    ) -> bool:
        """Mark a notification as read"""
        
        result = await db.execute(
            select(Notification).where(
                and_(
                    Notification.id == notification_id,
                    Notification.recipient_id == user_id
                )
            )
        )
        notification = result.scalar_one_or_none()
        
        if notification and not notification.is_read:
            notification.is_read = True
            notification.read_at = datetime.now(timezone.utc)
            await db.commit()
            return True
        
        return False
    
    @staticmethod
    async def mark_all_as_read(db: AsyncSession, user_id: int) -> int:
        """Mark all notifications as read for a user"""
        
        result = await db.execute(
            select(Notification).where(
                and_(
                    Notification.recipient_id == user_id,
                    Notification.is_read == False
                )
            )
        )
        notifications = result.scalars().all()
        
        count = 0
        for notification in notifications:
            notification.is_read = True
            notification.read_at = datetime.now(timezone.utc)
            count += 1
        
        await db.commit()
        return count
    
    @staticmethod
    async def delete_notification(
        db: AsyncSession,
        notification_id: int,
        user_id: int
    ) -> bool:
        """Delete a notification"""
        
        result = await db.execute(
            select(Notification).where(
                and_(
                    Notification.id == notification_id,
                    Notification.recipient_id == user_id
                )
            )
        )
        notification = result.scalar_one_or_none()
        
        if notification:
            await db.delete(notification)
            await db.commit()
            return True
        
        return False
