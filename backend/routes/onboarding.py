from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import User, Institution, UserStatus, ResearchRole, user_roles
from auth import get_current_user

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])

class InstitutionOption(BaseModel):
    id: int
    name: str
    domain: str
    
    class Config:
        from_attributes = True

class InstitutionSelection(BaseModel):
    institution_id: int

class OnboardingStatus(BaseModel):
    is_complete: bool
    has_institution: bool
    has_roles: bool
    status: str
    user_id: int
    email: str
    name: Optional[str]

@router.get("/institutions", response_model=List[InstitutionOption])
async def get_available_institutions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of available institutions for onboarding"""
    result = await db.execute(
        select(Institution).where(Institution.is_active == True)
    )
    institutions = result.scalars().all()
    return institutions

@router.post("/select-institution")
async def select_institution(
    selection: InstitutionSelection,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Select institution during onboarding"""
    # Verify institution exists
    result = await db.execute(
        select(Institution).where(Institution.id == selection.institution_id)
    )
    institution = result.scalar_one_or_none()
    
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )
    
    if not institution.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Institution is not active"
        )
    
    # Update user's institution
    current_user.primary_institution_id = institution.id
    
    # Check if email domain matches institution
    if current_user.email and "@" in current_user.email:
        email_domain = current_user.email.split("@")[1].lower()
        institution_domains = [institution.domain.lower()]
        
        if institution.verified_domains:
            institution_domains.extend([d.strip().lower() for d in institution.verified_domains.split(",")])
        
        if email_domain in institution_domains:
            # Auto-approve if domain matches
            current_user.status = UserStatus.ACTIVE
        else:
            # Require approval if domain doesn't match
            current_user.status = UserStatus.PENDING
    else:
        current_user.status = UserStatus.PENDING
    
    await db.commit()
    
    return {
        "message": "Institution selected successfully",
        "status": current_user.status.value,
        "requires_approval": current_user.status == UserStatus.PENDING
    }

@router.get("/status", response_model=OnboardingStatus)
async def get_onboarding_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current onboarding status"""
    # Check if user has roles
    result = await db.execute(
        select(user_roles.c.role).where(user_roles.c.user_id == current_user.id)
    )
    roles = result.fetchall()
    has_roles = len(roles) > 0
    
    has_institution = current_user.primary_institution_id is not None
    is_complete = has_institution and (current_user.status == UserStatus.ACTIVE)
    
    return OnboardingStatus(
        is_complete=is_complete,
        has_institution=has_institution,
        has_roles=has_roles,
        status=current_user.status.value,
        user_id=current_user.id,
        email=current_user.email,
        name=current_user.name
    )

@router.post("/complete")
async def complete_onboarding(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark onboarding as complete (for active users)"""
    if not current_user.primary_institution_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select an institution first"
        )
    
    if current_user.status == UserStatus.PENDING:
        return {
            "message": "Your account is pending approval from your institution admin",
            "status": "pending"
        }
    
    return {
        "message": "Onboarding complete",
        "status": "active"
    }
