from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, EmailStr
from datetime import timedelta, datetime
import httpx
import os

from database import get_db
from models import User, AccountType, UserStatus, PrimaryAccountType
from typing import Optional, List
import sys
sys.path.append('..')
from auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    ADMIN_SESSION_EXPIRE_MINUTES,
    get_current_user,
    get_current_active_user
)

router = APIRouter(prefix="/api/auth", tags=["authentication"])

ORCID_CLIENT_ID = os.getenv("ORCID_CLIENT_ID")
ORCID_CLIENT_SECRET = os.getenv("ORCID_CLIENT_SECRET")
ORCID_REDIRECT_URI = os.getenv("ORCID_REDIRECT_URI", "http://localhost:8000/api/auth/orcid/callback")
ORCID_SANDBOX_MODE = os.getenv("ORCID_SANDBOX_MODE", "false").lower() == "true"
ORCID_AUTHORIZE_URL = "https://sandbox.orcid.org/oauth/authorize" if ORCID_SANDBOX_MODE else "https://orcid.org/oauth/authorize"
ORCID_TOKEN_URL = "https://sandbox.orcid.org/oauth/token" if ORCID_SANDBOX_MODE else "https://orcid.org/oauth/token"
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

class UserRegister(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    is_global_admin: bool
    is_institution_admin: bool
    account_type: str
    status: str
    institution_id: int | None = None
    primary_account_type: str | None = None
    department: str | None = None
    job_title: str | None = None
    phone: str | None = None
    expertise_keywords: str | None = None
    orcid_id: str | None = None
    email_verified: bool = False
    primary_institution_id: int | None = None
    institution_name: str | None = None

    class Config:
        from_attributes = True


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None
    phone: Optional[str] = None
    expertise_keywords: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserRegister, db: AsyncSession = Depends(get_db)):
    """Register endpoint - deprecated for researchers, use ORCID instead"""
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Please use ORCID authentication to register as a researcher"
    )

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """Login endpoint - for admin accounts only"""
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    
    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if account is active
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    await db.commit()
    
    # Create token with extended expiry for admins
    is_admin = user.is_global_admin or user.is_institution_admin
    access_token_expires = timedelta(minutes=ADMIN_SESSION_EXPIRE_MINUTES if is_admin else ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "user_id": user.id,
            "account_type": user.account_type.value,
            "institution_id": user.primary_institution_id,
            "is_global_admin": user.is_global_admin,
            "is_institution_admin": user.is_institution_admin
        }, 
        expires_delta=access_token_expires,
        is_admin=is_admin
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    # Eagerly load institution to get the name
    result = await db.execute(
        select(User).options(selectinload(User.institution)).where(User.id == current_user.id)
    )
    user_with_institution = result.scalar_one()
    
    # Convert to dict and add institution_name
    user_dict = {
        "id": user_with_institution.id,
        "email": user_with_institution.email,
        "name": user_with_institution.name,
        "is_global_admin": user_with_institution.is_global_admin,
        "is_institution_admin": user_with_institution.is_institution_admin,
        "account_type": user_with_institution.account_type.value,
        "status": user_with_institution.status.value,
        "institution_id": user_with_institution.primary_institution_id,
        "primary_account_type": user_with_institution.primary_account_type.value if user_with_institution.primary_account_type else None,
        "department": user_with_institution.department,
        "job_title": user_with_institution.job_title,
        "phone": user_with_institution.phone,
        "expertise_keywords": user_with_institution.expertise_keywords,
        "orcid_id": user_with_institution.orcid_id,
        "email_verified": user_with_institution.email_verified,
        "primary_institution_id": user_with_institution.primary_institution_id,
        "institution_name": user_with_institution.institution.name if user_with_institution.institution else None
    }
    
    return user_dict


@router.put("/me", response_model=UserResponse)
async def update_profile(
    profile: ProfileUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Update the current user's profile"""
    if profile.name is not None:
        current_user.name = profile.name
    if profile.department is not None:
        current_user.department = profile.department
    if profile.job_title is not None:
        current_user.job_title = profile.job_title
    if profile.phone is not None:
        current_user.phone = profile.phone
    if profile.expertise_keywords is not None:
        current_user.expertise_keywords = profile.expertise_keywords
    await db.commit()
    await db.refresh(current_user)
    return current_user
