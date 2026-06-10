"""Shared helpers for inviting reviewers who set their own password via /reviewer/register."""

import secrets
from typing import Optional, Tuple

from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from models import (
    User,
    UserStatus,
    PrimaryAccountType,
    ResearchRole,
    AccountType,
    user_roles,
)


async def get_or_create_reviewer_user(
    db: AsyncSession,
    email: str,
    name: Optional[str],
    institution_id: str,
    invited_by_id: str,
    role: ResearchRole,
    expertise: Optional[list[str]] = None,
    primary_account_type: PrimaryAccountType = PrimaryAccountType.EXTERNAL_REVIEWER,
) -> Tuple[User, bool, Optional[str]]:
    """
    Find or create a reviewer pending account.

    Returns (user, needs_signup, signup_token).
    needs_signup is True when the reviewer must visit /reviewer/register to choose a password.
    """
    email = email.lower().strip()
    result = await db.execute(
        select(User).where(
            User.email == email,
            User.primary_institution_id == institution_id,
        )
    )
    user = result.scalar_one_or_none()

    if user and user.password_hash:
        return user, False, None

    signup_token = secrets.token_urlsafe(32)

    if user and not user.password_hash:
        return user, True, signup_token

    user = User(
        email=email,
        name=name or email.split("@")[0],
        password_hash=None,
        account_type=AccountType.ORCID,
        status=UserStatus.PENDING,
        email_verified=False,
        primary_account_type=primary_account_type,
        expertise_keywords=", ".join(expertise) if expertise else None,
        primary_institution_id=institution_id,
        is_guest=True,
        invited_by_id=invited_by_id,
    )
    db.add(user)
    await db.flush()
    await db.execute(
        insert(user_roles).values(
            user_id=user.id,
            role=role,
            assigned_by=invited_by_id,
        )
    )
    return user, True, signup_token
