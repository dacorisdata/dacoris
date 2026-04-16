from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from database import get_db
from routes.auth import get_current_user
from models import User, UserStatus, PrimaryAccountType
from services.notification_service import NotificationService

router = APIRouter(prefix="/api/institution-admin/pending-users", tags=["institution-admin"])

class PendingUserResponse(BaseModel):
    id: int
    email: str
    name: str
    department: Optional[str]
    job_title: Optional[str]
    phone: Optional[str]
    primary_account_type: str
    status: str
    email_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class ApproveUserRequest(BaseModel):
    user_id: int
    roles: Optional[List[str]] = None

class RejectUserRequest(BaseModel):
    user_id: int
    reason: Optional[str] = None

class AssignRoleRequest(BaseModel):
    user_id: int
    role: str

@router.get("/", response_model=List[PendingUserResponse])
async def get_pending_users(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all pending user registrations for the institution"""
    
    # Check if user is institution admin
    if not current_user.is_institution_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only institution administrators can view pending users"
        )
    
    # Get pending users from the same institution
    result = await db.execute(
        select(User).where(
            and_(
                User.primary_institution_id == current_user.primary_institution_id,
                User.status == UserStatus.PENDING
            )
        ).order_by(User.created_at.desc())
    )
    
    pending_users = result.scalars().all()
    
    return [
        PendingUserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            department=user.department,
            job_title=user.job_title,
            phone=user.phone,
            primary_account_type=user.primary_account_type,
            status=user.status,
            email_verified=user.email_verified,
            created_at=user.created_at
        )
        for user in pending_users
    ]

@router.get("/{user_id}", response_model=PendingUserResponse)
async def get_pending_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get details of a specific pending user"""
    
    if not current_user.is_institution_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only institution administrators can view pending users"
        )
    
    result = await db.execute(
        select(User).where(
            and_(
                User.id == user_id,
                User.primary_institution_id == current_user.primary_institution_id,
                User.status == UserStatus.PENDING
            )
        )
    )
    
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pending user not found"
        )
    
    return PendingUserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        department=user.department,
        job_title=user.job_title,
        phone=user.phone,
        primary_account_type=user.primary_account_type,
        status=user.status,
        email_verified=user.email_verified,
        created_at=user.created_at
    )

@router.post("/approve")
async def approve_user(
    request: ApproveUserRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Approve a pending user registration"""
    
    if not current_user.is_institution_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only institution administrators can approve users"
        )
    
    # Get the user to approve
    result = await db.execute(
        select(User).where(
            and_(
                User.id == request.user_id,
                User.primary_institution_id == current_user.primary_institution_id,
                User.status == UserStatus.PENDING
            )
        )
    )
    
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pending user not found"
        )
    
    # Check if email is verified
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must verify their email before approval"
        )
    
    # Update user status
    user.status = UserStatus.ACTIVE
    
    # Set as institution admin if they're admin staff
    if user.primary_account_type == PrimaryAccountType.ADMIN_STAFF:
        user.is_institution_admin = True
    
    await db.commit()
    await db.refresh(user)
    
    # Send notification to user
    await NotificationService.notify_account_approved(
        db=db,
        user_id=user.id,
        approved_by_name=current_user.name
    )
    
    return {
        "success": True,
        "message": f"User {user.name} has been approved",
        "user_id": user.id
    }

@router.post("/reject")
async def reject_user(
    request: RejectUserRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Reject a pending user registration"""
    
    if not current_user.is_institution_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only institution administrators can reject users"
        )
    
    # Get the user to reject
    result = await db.execute(
        select(User).where(
            and_(
                User.id == request.user_id,
                User.primary_institution_id == current_user.primary_institution_id,
                User.status == UserStatus.PENDING
            )
        )
    )
    
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pending user not found"
        )
    
    # Send notification to user before deleting
    await NotificationService.notify_account_rejected(
        db=db,
        user_id=user.id,
        reason=request.reason
    )
    
    # Delete the user
    await db.delete(user)
    await db.commit()
    
    return {
        "success": True,
        "message": f"User registration for {user.email} has been rejected"
    }

@router.post("/assign-role")
async def assign_role(
    request: AssignRoleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Assign a role to a user"""
    
    if not current_user.is_institution_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only institution administrators can assign roles"
        )
    
    # Get the user
    result = await db.execute(
        select(User).where(
            and_(
                User.id == request.user_id,
                User.primary_institution_id == current_user.primary_institution_id
            )
        )
    )
    
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Validate role
    try:
        role_enum = PrimaryAccountType(request.role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role: {request.role}"
        )
    
    # Assign role
    user.primary_account_type = role_enum
    await db.commit()
    await db.refresh(user)
    
    # Send notification to user
    await NotificationService.notify_role_assigned(
        db=db,
        user_id=user.id,
        role_name=request.role,
        assigned_by_name=current_user.name
    )
    
    return {
        "success": True,
        "message": f"Role {request.role} assigned to {user.name}",
        "user_id": user.id
    }
