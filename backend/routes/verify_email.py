"""
Email verification endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr

from database import get_db
from services.email_service import EmailService

router = APIRouter(prefix="/api/verification", tags=["verification"])


class SendVerificationRequest(BaseModel):
    email: EmailStr


class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str


class VerificationResponse(BaseModel):
    success: bool
    message: str


@router.post("/send", response_model=VerificationResponse)
async def send_verification_code(
    request: SendVerificationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Send a verification code to the provided email address
    """
    try:
        # Create verification record and get code
        verification_code = await EmailService.create_verification(request.email, db)
        
        # Send email
        email_sent = await EmailService.send_verification_email(request.email, verification_code)
        
        if not email_sent:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send verification email. Please check SMTP configuration."
            )
        
        return VerificationResponse(
            success=True,
            message=f"Verification code sent to {request.email}. Please check your inbox."
        )
    except Exception as e:
        print(f"Error sending verification code: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send verification code: {str(e)}"
        )


@router.post("/verify", response_model=VerificationResponse)
async def verify_email_code(
    request: VerifyCodeRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Verify an email address using the provided code
    """
    try:
        is_valid = await EmailService.verify_code(request.email, request.code, db)
        
        if not is_valid:
            return VerificationResponse(
                success=False,
                message="Invalid or expired verification code. Please request a new code."
            )
        
        return VerificationResponse(
            success=True,
            message="Email verified successfully!"
        )
    except Exception as e:
        print(f"Error verifying code: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify code: {str(e)}"
        )
