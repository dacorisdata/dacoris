from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import User, Institution, AccountType, UserStatus, OrcidProfile
from auth import require_global_admin, get_password_hash

router = APIRouter(prefix="/api/global-admin", tags=["global-admin"])

class InstitutionCreate(BaseModel):
    name: str
    domain: str
    verified_domains: Optional[str] = None
    orcid_client_id: Optional[str] = None
    orcid_client_secret: Optional[str] = None
    orcid_redirect_uri: Optional[str] = None

class InstitutionResponse(BaseModel):
    id: int
    name: str
    domain: str
    verified_domains: Optional[str]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class InstitutionAdminCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    institution_id: int

class UserSummary(BaseModel):
    id: int
    email: str
    name: Optional[str]
    account_type: str
    status: str
    institution_id: Optional[int] = None
    is_global_admin: bool
    is_institution_admin: bool
    orcid_id: Optional[str] = None
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        populate_by_name = True
        
    @classmethod
    def model_validate(cls, obj):
        # Map primary_institution_id to institution_id
        if hasattr(obj, 'primary_institution_id'):
            data = {
                'id': obj.id,
                'email': obj.email,
                'name': obj.name,
                'account_type': obj.account_type.value if hasattr(obj.account_type, 'value') else obj.account_type,
                'status': obj.status.value if hasattr(obj.status, 'value') else obj.status,
                'institution_id': obj.primary_institution_id,
                'is_global_admin': obj.is_global_admin,
                'is_institution_admin': obj.is_institution_admin,
                'orcid_id': obj.orcid_id,
                'created_at': obj.created_at,
                'last_login': obj.last_login,
            }
            return cls(**data)
        return super().model_validate(obj)

class PlatformStats(BaseModel):
    total_institutions: int
    total_users: int
    active_users: int
    pending_users: int
    total_orcid_users: int

@router.get("/institutions", response_model=List[InstitutionResponse])
async def list_institutions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """List all institutions"""
    result = await db.execute(select(Institution))
    institutions = result.scalars().all()
    return institutions

@router.post("/institutions", response_model=InstitutionResponse)
async def create_institution(
    institution_data: InstitutionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Create a new institution"""
    # Check if domain already exists
    result = await db.execute(
        select(Institution).where(Institution.domain == institution_data.domain)
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Institution with domain {institution_data.domain} already exists"
        )
    
    institution = Institution(
        name=institution_data.name,
        domain=institution_data.domain,
        verified_domains=institution_data.verified_domains,
        orcid_client_id=institution_data.orcid_client_id,
        orcid_client_secret=institution_data.orcid_client_secret,
        orcid_redirect_uri=institution_data.orcid_redirect_uri,
        is_active=True
    )
    
    db.add(institution)
    await db.commit()
    await db.refresh(institution)
    
    return institution

@router.get("/institutions/{institution_id}", response_model=InstitutionResponse)
async def get_institution(
    institution_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Get institution details"""
    result = await db.execute(
        select(Institution).where(Institution.id == institution_id)
    )
    institution = result.scalar_one_or_none()
    
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )
    
    return institution

@router.put("/institutions/{institution_id}", response_model=InstitutionResponse)
async def update_institution(
    institution_id: int,
    institution_data: InstitutionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Update institution details"""
    result = await db.execute(
        select(Institution).where(Institution.id == institution_id)
    )
    institution = result.scalar_one_or_none()
    
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )
    
    institution.name = institution_data.name
    institution.domain = institution_data.domain
    institution.verified_domains = institution_data.verified_domains
    institution.orcid_client_id = institution_data.orcid_client_id
    institution.orcid_client_secret = institution_data.orcid_client_secret
    institution.orcid_redirect_uri = institution_data.orcid_redirect_uri
    
    await db.commit()
    await db.refresh(institution)
    
    return institution

@router.post("/institutions/{institution_id}/toggle-status")
async def toggle_institution_status(
    institution_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Activate or deactivate an institution"""
    result = await db.execute(
        select(Institution).where(Institution.id == institution_id)
    )
    institution = result.scalar_one_or_none()
    
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )
    
    institution.is_active = not institution.is_active
    await db.commit()
    
    return {"message": f"Institution {'activated' if institution.is_active else 'deactivated'} successfully"}

@router.post("/institutions/{institution_id}/admin", response_model=UserSummary)
async def create_institution_admin(
    institution_id: int,
    admin_data: InstitutionAdminCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Create an institution admin account"""
    # Verify institution exists
    result = await db.execute(
        select(Institution).where(Institution.id == institution_id)
    )
    institution = result.scalar_one_or_none()
    
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )
    
    # Check if user already exists
    result = await db.execute(
        select(User).where(
            User.email == admin_data.email,
            User.primary_institution_id == institution_id
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists for this institution"
        )
    
    # Create institution admin
    password_hash = get_password_hash(admin_data.password)
    
    admin = User(
        email=admin_data.email,
        name=admin_data.name,
        password_hash=password_hash,
        account_type=AccountType.INSTITUTION_ADMIN,
        status=UserStatus.ACTIVE,
        primary_institution_id=institution_id,
        is_institution_admin=True,
        is_global_admin=False
    )
    
    db.add(admin)
    await db.commit()
    await db.refresh(admin)
    
    return admin

@router.get("/users", response_model=List[UserSummary])
async def list_all_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """List all users across all institutions"""
    result = await db.execute(
        select(User).offset(skip).limit(limit)
    )
    users = result.scalars().all()
    return users

@router.get("/analytics", response_model=PlatformStats)
async def get_platform_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Get platform-wide analytics"""
    # Total institutions
    inst_result = await db.execute(select(func.count(Institution.id)))
    total_institutions = inst_result.scalar()
    
    # Total users
    user_result = await db.execute(select(func.count(User.id)))
    total_users = user_result.scalar()
    
    # Active users
    active_result = await db.execute(
        select(func.count(User.id)).where(User.status == UserStatus.ACTIVE)
    )
    active_users = active_result.scalar()
    
    # Pending users
    pending_result = await db.execute(
        select(func.count(User.id)).where(User.status == UserStatus.PENDING)
    )
    pending_users = pending_result.scalar()
    
    # ORCID users
    orcid_result = await db.execute(
        select(func.count(User.id)).where(User.account_type == AccountType.ORCID)
    )
    total_orcid_users = orcid_result.scalar()
    
    return PlatformStats(
        total_institutions=total_institutions,
        total_users=total_users,
        active_users=active_users,
        pending_users=pending_users,
        total_orcid_users=total_orcid_users
    )

@router.get("/institutions/{institution_id}/users", response_model=List[UserSummary])
async def get_institution_users(
    institution_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Get all users for a specific institution"""
    result = await db.execute(
        select(User).where(User.primary_institution_id == institution_id)
    )
    users = result.scalars().all()
    return users
