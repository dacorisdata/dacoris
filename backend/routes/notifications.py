from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from database import get_db
from routes.auth import get_current_user
from models import User, Notification
from services.notification_service import NotificationService

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

class NotificationResponse(BaseModel):
    id: int
    type: str
    priority: str
    title: str
    message: str
    action_url: Optional[str]
    related_entity_type: Optional[str]
    related_entity_id: Optional[int]
    is_read: bool
    read_at: Optional[datetime]
    created_at: datetime
    expires_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class UnreadCountResponse(BaseModel):
    count: int

class MarkAsReadRequest(BaseModel):
    notification_id: int

@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get notifications for the current user"""
    
    notifications = await NotificationService.get_user_notifications(
        db=db,
        user_id=current_user.id,
        unread_only=unread_only,
        limit=limit
    )
    
    return [
        NotificationResponse(
            id=n.id,
            type=n.type,
            priority=n.priority,
            title=n.title,
            message=n.message,
            action_url=n.action_url,
            related_entity_type=n.related_entity_type,
            related_entity_id=n.related_entity_id,
            is_read=n.is_read,
            read_at=n.read_at,
            created_at=n.created_at,
            expires_at=n.expires_at
        )
        for n in notifications
    ]

@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get count of unread notifications"""
    
    count = await NotificationService.get_unread_count(
        db=db,
        user_id=current_user.id
    )
    
    return UnreadCountResponse(count=count)

@router.post("/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark a notification as read"""
    
    success = await NotificationService.mark_as_read(
        db=db,
        notification_id=notification_id,
        user_id=current_user.id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    return {"success": True, "message": "Notification marked as read"}

@router.post("/mark-all-read")
async def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark all notifications as read"""
    
    count = await NotificationService.mark_all_as_read(
        db=db,
        user_id=current_user.id
    )
    
    return {"success": True, "message": f"{count} notifications marked as read", "count": count}

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a notification"""
    
    success = await NotificationService.delete_notification(
        db=db,
        notification_id=notification_id,
        user_id=current_user.id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    return {"success": True, "message": "Notification deleted"}
