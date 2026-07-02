from __future__ import annotations

from typing import List

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from auth import get_current_active_user
from database import get_db
from models import Institution, InstitutionType, PrimaryAccountType, User
from services.institution_types import institution_types_as_strings

PG_ADMIN_ROLES = {
    PrimaryAccountType.ADMIN_STAFF,
    PrimaryAccountType.INSTITUTIONAL_LEADERSHIP,
    PrimaryAccountType.PG_COORDINATOR,
    PrimaryAccountType.HEAD_OF_PG_STUDIES,
}

SUPERVISOR_ROLES = {
    PrimaryAccountType.SUPERVISOR,
    PrimaryAccountType.EXTERNAL_SUPERVISOR,
}

PG_STUDENT_ROLES = {
    PrimaryAccountType.POSTGRADUATE_STUDENT,
    PrimaryAccountType.RESEARCHER,
}


async def get_user_institution(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Institution:
    if not current_user.primary_institution_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No institution associated with user")
    result = await db.execute(
        select(Institution)
        .options(selectinload(Institution.type_assignments))
        .where(Institution.id == current_user.primary_institution_id)
    )
    institution = result.scalar_one_or_none()
    if not institution:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Institution not found")
    return institution


def institution_is_university(institution: Institution) -> bool:
    types = institution_types_as_strings(institution)
    return InstitutionType.UNIVERSITY.value in types


async def require_university_institution(
    institution: Institution = Depends(get_user_institution),
) -> Institution:
    if not institution_is_university(institution):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Postgraduate module is only available for university institutions",
        )
    return institution


def is_pg_admin(user: User) -> bool:
    return bool(
        user.is_institution_admin
        or user.primary_account_type in PG_ADMIN_ROLES
    )


def is_supervisor(user: User) -> bool:
    return user.primary_account_type in SUPERVISOR_ROLES


def is_pg_student(user: User) -> bool:
    return user.primary_account_type in PG_STUDENT_ROLES


async def require_pg_admin(
    current_user: User = Depends(get_current_active_user),
    institution: Institution = Depends(require_university_institution),
) -> tuple[User, Institution]:
    if not is_pg_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="PG admin access required")
    return current_user, institution


async def require_supervisor(
    current_user: User = Depends(get_current_active_user),
    institution: Institution = Depends(require_university_institution),
) -> tuple[User, Institution]:
    if not (is_supervisor(current_user) or is_pg_admin(current_user)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Supervisor access required")
    return current_user, institution
