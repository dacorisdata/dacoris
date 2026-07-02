from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Institution, PgStaffProfile, User
from services.external_systems.excel_is_reader import ExcelISRepository, get_excel_repository


async def resolve_staff_id_for_user(
    db: AsyncSession,
    user: User,
    institution: Institution,
    repo: Optional[ExcelISRepository] = None,
) -> Optional[str]:
    if user.staff_id:
        return user.staff_id

    result = await db.execute(
        select(PgStaffProfile).where(PgStaffProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if profile:
        if not user.staff_id:
            user.staff_id = profile.staff_id
        return profile.staff_id

    repo = repo or get_excel_repository()
    staff = repo.get_staff(email=user.email, institution_name=institution.name)
    if not staff:
        return None

    user.staff_id = staff.staff_id
    db.add(
        PgStaffProfile(
            institution_id=institution.id,
            user_id=user.id,
            staff_id=staff.staff_id,
        )
    )
    return staff.staff_id
