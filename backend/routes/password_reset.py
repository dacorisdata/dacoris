"""
Password reset endpoints — request a reset link by email, validate the
token from that link, and set a new password.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone

from database import get_db
from models import User
from services.email_service import EmailService
import sys
sys.path.append('..')
from auth import get_password_hash

router = APIRouter(prefix="/api/auth", tags=["authentication"])

# Generic message returned regardless of whether the email exists, so we
# never reveal which addresses have accounts.
GENERIC_FORGOT_PASSWORD_MESSAGE = (
    "If an account exists for that email address, a password reset link has been sent."
)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str


class ValidateResetTokenResponse(BaseModel):
    valid: bool
    email: str | None = None


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ResetPasswordResponse(BaseModel):
    success: bool
    message: str


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    request: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Request a password reset email. Always returns a generic success
    message so we don't leak whether an email address has an account.
    """
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()

    # Only send a reset link for accounts that actually log in with a
    # password (ORCID-only researcher accounts have no password_hash).
    if user and user.password_hash:
        try:
            token = await EmailService.create_password_reset_token(user, db)
            await EmailService.send_password_reset_email(user.email, token)
        except Exception as e:
            # Don't leak internal errors to the client — log and still
            # return the generic message.
            print(f"Error creating/sending password reset for {request.email}: {e}")

    return ForgotPasswordResponse(message=GENERIC_FORGOT_PASSWORD_MESSAGE)


@router.get("/reset-password/validate", response_model=ValidateResetTokenResponse)
async def validate_reset_token(token: str, db: AsyncSession = Depends(get_db)):
    """Check whether a reset token is still valid, so the frontend can show
    an 'invalid or expired link' state before the user fills out the form."""
    reset_token = await EmailService.get_valid_reset_token(token, db)

    if not reset_token:
        return ValidateResetTokenResponse(valid=False)

    return ValidateResetTokenResponse(valid=True, email=reset_token.email)


@router.post("/reset-password", response_model=ResetPasswordResponse)
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Set a new password using a valid reset token."""
    if len(request.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long",
        )

    reset_token = await EmailService.get_valid_reset_token(request.token, db)

    if not reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link is invalid or has expired. Please request a new one.",
        )

    result = await db.execute(select(User).where(User.id == reset_token.user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link is invalid or has expired. Please request a new one.",
        )

    user.password_hash = get_password_hash(request.new_password)
    reset_token.used = True
    reset_token.used_at = datetime.now(timezone.utc)

    await db.commit()

    return ResetPasswordResponse(success=True, message="Your password has been reset successfully.")
