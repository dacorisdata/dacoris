from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import User, Institution, AccountType, UserStatus, ResearchRole, PrimaryAccountType, user_roles
from auth import require_institution_admin

router = APIRouter(prefix="/api/institution-admin", tags=["institution-admin"])

class UserApproval(BaseModel):
    status: str  # "active" or "suspended"

class RoleAssignment(BaseModel):
    roles: List[str]
    primary_account_type: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    name: Optional[str]
    account_type: str
    status: str
    orcid_id: Optional[str]
    created_at: datetime
    last_login: Optional[datetime] = None
    primary_account_type: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None
    roles: Optional[List[str]] = None
    
    class Config:
        from_attributes = True

class InstitutionSettings(BaseModel):
    orcid_client_id: Optional[str] = None
    orcid_client_secret: Optional[str] = None
    orcid_redirect_uri: Optional[str] = None
    verified_domains: Optional[str] = None

class InstitutionStats(BaseModel):
    total_users: int
    active_users: int
    pending_users: int
    users_by_role: dict

@router.get("/stats")
async def get_institution_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin)
):
    """Get institution statistics"""
    if not current_user.primary_institution_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Institution admin must be associated with an institution"
        )
    
    # Total users
    total_result = await db.execute(
        select(func.count(User.id))
        .where(User.primary_institution_id == current_user.primary_institution_id)
    )
    total_users = total_result.scalar()
    
    # Active users
    active_result = await db.execute(
        select(func.count(User.id))
        .where(
            User.primary_institution_id == current_user.primary_institution_id,
            User.status == UserStatus.ACTIVE
        )
    )
    active_users = active_result.scalar()
    
    # Pending users
    pending_result = await db.execute(
        select(func.count(User.id))
        .where(
            User.primary_institution_id == current_user.primary_institution_id,
            User.status == UserStatus.PENDING
        )
    )
    pending_users = pending_result.scalar()
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "pending_users": pending_users
    }

@router.get("/users", response_model=List[UserResponse])
async def list_institution_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin)
):
    """List all users in the institution"""
    if not current_user.primary_institution_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Institution admin must be associated with an institution"
        )
    
    result = await db.execute(
        select(User)
        .where(User.primary_institution_id == current_user.primary_institution_id)
        .offset(skip)
        .limit(limit)
    )
    users = result.scalars().all()

    # Attach roles to each user
    enriched = []
    for u in users:
        roles_result = await db.execute(
            select(user_roles.c.role).where(user_roles.c.user_id == u.id)
        )
        role_list = [r[0].value for r in roles_result.fetchall()]
        user_dict = {
            "id": u.id, "email": u.email, "name": u.name,
            "account_type": u.account_type.value if u.account_type else None,
            "status": u.status.value if u.status else None,
            "orcid_id": u.orcid_id, "created_at": u.created_at,
            "last_login": u.last_login,
            "primary_account_type": u.primary_account_type.value if u.primary_account_type else None,
            "department": u.department, "job_title": u.job_title,
            "roles": role_list,
        }
        enriched.append(user_dict)
    return enriched

@router.get("/users/pending", response_model=List[UserResponse])
async def list_pending_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin)
):
    """List pending users awaiting approval"""
    if not current_user.primary_institution_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Institution admin must be associated with an institution"
        )
    
    result = await db.execute(
        select(User)
        .where(
            User.primary_institution_id == current_user.primary_institution_id,
            User.status == UserStatus.PENDING
        )
    )
    users = result.scalars().all()
    return users

@router.post("/users/{user_id}/approve")
async def approve_user(
    user_id: int,
    approval: UserApproval,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin)
):
    """Approve or reject a pending user"""
    if not current_user.primary_institution_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Institution admin must be associated with an institution"
        )
    
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify user belongs to same institution
    if user.primary_institution_id != current_user.primary_institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot manage users from other institutions"
        )
    
    # Update status
    if approval.status == "active":
        user.status = UserStatus.ACTIVE
    elif approval.status == "suspended":
        user.status = UserStatus.SUSPENDED
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Use 'active' or 'suspended'"
        )
    
    await db.commit()
    
    return {"message": f"User {approval.status} successfully"}

@router.post("/users/{user_id}/reject")
async def reject_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin)
):
    """Reject a pending user"""
    if not current_user.primary_institution_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Institution admin must be associated with an institution"
        )
    
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify user belongs to same institution
    if user.primary_institution_id != current_user.primary_institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot manage users from other institutions"
        )
    
    # Update status to suspended
    user.status = UserStatus.SUSPENDED
    
    await db.commit()
    
    return {"message": "User rejected successfully"}

@router.post("/users/{user_id}/roles")
async def assign_roles(
    user_id: int,
    role_data: RoleAssignment,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin)
):
    """Assign roles to a user"""
    if not current_user.primary_institution_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Institution admin must be associated with an institution"
        )
    
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify user belongs to same institution
    if user.primary_institution_id != current_user.primary_institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot manage users from other institutions"
        )
    
    # Delete existing roles
    await db.execute(
        user_roles.delete().where(user_roles.c.user_id == user_id)
    )
    
    # Add new roles
    for role_str in role_data.roles:
        try:
            role = ResearchRole(role_str)
            await db.execute(
                user_roles.insert().values(
                    user_id=user_id,
                    role=role,
                    assigned_by=current_user.id
                )
            )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role: {role_str}"
            )
    
    # Update primary_account_type if provided
    if role_data.primary_account_type:
        try:
            user.primary_account_type = PrimaryAccountType(role_data.primary_account_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid primary_account_type: {role_data.primary_account_type}"
            )

    await db.commit()
    
    return {"message": "Roles assigned successfully", "roles": role_data.roles}

@router.get("/users/{user_id}/roles")
async def get_user_roles(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin)
):
    """Get roles for a user"""
    if not current_user.primary_institution_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Institution admin must be associated with an institution"
        )
    
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify user belongs to same institution
    if user.primary_institution_id != current_user.primary_institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot view users from other institutions"
        )
    
    # Get roles
    result = await db.execute(
        select(user_roles.c.role).where(user_roles.c.user_id == user_id)
    )
    roles = [row[0].value for row in result.fetchall()]
    
    return {"user_id": user_id, "roles": roles}

@router.get("/roles")
async def list_roles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin)
):
    """List all available roles"""
    # Return the available research roles
    roles = [
        {"id": 1, "name": "Principal Investigator", "description": "Lead researcher on projects", "user_count": 0},
        {"id": 2, "name": "Co-Investigator", "description": "Collaborating researcher", "user_count": 0},
        {"id": 3, "name": "Postdoctoral Researcher", "description": "Postdoctoral research fellow", "user_count": 0},
        {"id": 4, "name": "PhD Student", "description": "Doctoral student", "user_count": 0},
        {"id": 5, "name": "Research Assistant", "description": "Research support staff", "user_count": 0},
    ]
    return roles

@router.post("/roles")
async def create_role(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin)
):
    """Create a new role (placeholder - roles are predefined)"""
    return {"message": "Roles are predefined in the system"}

@router.get("/settings")
async def get_institution_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin)
):
    """Get institution settings"""
    if not current_user.primary_institution_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Institution admin must be associated with an institution"
        )
    
    result = await db.execute(
        select(Institution).where(Institution.id == current_user.primary_institution_id)
    )
    institution = result.scalar_one_or_none()
    
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )
    
    return {
        "id": institution.id,
        "name": institution.name,
        "domain": institution.domain,
        "verified_domains": institution.verified_domains,
        "orcid_client_id": institution.orcid_client_id,
        "orcid_redirect_uri": institution.orcid_redirect_uri,
        "is_active": institution.is_active
    }

@router.put("/settings")
async def update_institution_settings(
    settings: InstitutionSettings,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin)
):
    """Update institution settings"""
    if not current_user.primary_institution_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Institution admin must be associated with an institution"
        )
    
    result = await db.execute(
        select(Institution).where(Institution.id == current_user.primary_institution_id)
    )
    institution = result.scalar_one_or_none()
    
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )
    
    # Update settings
    if settings.orcid_client_id is not None:
        institution.orcid_client_id = settings.orcid_client_id
    if settings.orcid_client_secret is not None:
        institution.orcid_client_secret = settings.orcid_client_secret
    if settings.orcid_redirect_uri is not None:
        institution.orcid_redirect_uri = settings.orcid_redirect_uri
    if settings.verified_domains is not None:
        institution.verified_domains = settings.verified_domains
    
    await db.commit()
    
    return {"message": "Settings updated successfully"}

@router.get("/analytics", response_model=InstitutionStats)
async def get_institution_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin)
):
    """Get institution analytics"""
    if not current_user.primary_institution_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Institution admin must be associated with an institution"
        )
    
    # Total users
    total_result = await db.execute(
        select(func.count(User.id))
        .where(User.primary_institution_id == current_user.primary_institution_id)
    )
    total_users = total_result.scalar()
    
    # Active users
    active_result = await db.execute(
        select(func.count(User.id))
        .where(
            User.primary_institution_id == current_user.primary_institution_id,
            User.status == UserStatus.ACTIVE
        )
    )
    active_users = active_result.scalar()
    
    # Pending users
    pending_result = await db.execute(
        select(func.count(User.id))
        .where(
            User.primary_institution_id == current_user.primary_institution_id,
            User.status == UserStatus.PENDING
        )
    )
    pending_users = pending_result.scalar()
    
    # Users by role
    role_result = await db.execute(
        select(user_roles.c.role, func.count(user_roles.c.user_id))
        .join(User, User.id == user_roles.c.user_id)
        .where(User.primary_institution_id == current_user.primary_institution_id)
        .group_by(user_roles.c.role)
    )
    
    users_by_role = {row[0].value: row[1] for row in role_result.fetchall()}
    
    return InstitutionStats(
        total_users=total_users,
        active_users=active_users,
        pending_users=pending_users,
        users_by_role=users_by_role
    )
