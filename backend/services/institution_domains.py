from typing import Optional, Set

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Institution, User


def extract_email_domain(email: str) -> Optional[str]:
    if not email or "@" not in email:
        return None
    return email.split("@", 1)[1].strip().lower()


def get_institution_email_domains(institution: Institution) -> Set[str]:
    domains: Set[str] = set()
    if institution.domain and institution.domain.strip():
        domains.add(institution.domain.strip().lower())
    if institution.verified_domains and institution.verified_domains.strip():
        for part in institution.verified_domains.split(","):
            domain = part.strip().lower()
            if domain:
                domains.add(domain)
    return domains


def email_belongs_to_institution(email: str, institution: Institution) -> bool:
    email_domain = extract_email_domain(email)
    if not email_domain:
        return False
    return email_domain in get_institution_email_domains(institution)


def user_email_domain_filter(user_model, domains: Set[str]):
    if not domains:
        return user_model.id.is_(None)
    domain_expr = func.lower(func.split_part(user_model.email, "@", 2))
    return domain_expr.in_(list(domains))


async def find_institution_by_email_domain(db: AsyncSession, email: str) -> Optional[Institution]:
    email_domain = extract_email_domain(email)
    if not email_domain:
        return None

    result = await db.execute(
        select(Institution).where(func.lower(Institution.domain) == email_domain)
    )
    institution = result.scalar_one_or_none()
    if institution:
        return institution

    result = await db.execute(select(Institution))
    for inst in result.scalars().all():
        if email_domain in get_institution_email_domains(inst):
            return inst
    return None


async def get_admin_institution(db: AsyncSession, admin_user: User) -> Institution:
    institution: Optional[Institution] = None

    if admin_user.primary_institution_id:
        result = await db.execute(
            select(Institution).where(Institution.id == admin_user.primary_institution_id)
        )
        institution = result.scalar_one_or_none()

    if not institution:
        institution = await find_institution_by_email_domain(db, admin_user.email)

    if not institution:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Institution admin must be associated with an institution",
        )

    return institution


def ensure_user_in_institution(user: User, institution: Institution) -> None:
    if not email_belongs_to_institution(user.email, institution):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot manage users from other institutions",
        )
