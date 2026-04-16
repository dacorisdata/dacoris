"""
Email domain verification endpoint for registration
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr

from database import get_db
from services.orcid_sync import OrcidSyncService

router = APIRouter(prefix="/api/registration", tags=["registration"])


class EmailVerificationRequest(BaseModel):
    email: EmailStr


class EmailVerificationResponse(BaseModel):
    valid: bool
    institution_id: int | None = None
    institution_name: str | None = None
    message: str


@router.post("/verify-email", response_model=EmailVerificationResponse)
async def verify_email_domain(
    request: EmailVerificationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Verify if an email domain matches a registered institution
    Returns institution details if domain is verified
    """
    institution = await OrcidSyncService.verify_email_domain(request.email, db)
    
    if institution:
        return EmailVerificationResponse(
            valid=True,
            institution_id=institution.id,
            institution_name=institution.name,
            message=f"Email domain verified for {institution.name}"
        )
    else:
        return EmailVerificationResponse(
            valid=False,
            message="Email domain not recognized. Please use your institutional email address."
        )
