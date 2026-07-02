from __future__ import annotations

import re
from typing import Iterable, Optional, Set

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Institution, PgStudentProfile, User
from services.external_systems.excel_is_reader import ExcelISRepository, get_excel_repository
from services.external_systems.schemas import SISStudent


def _domain_root(domain: str) -> str:
    parts = domain.lower().strip().split(".")
    if len(parts) >= 2:
        return parts[-2]
    return domain.lower().strip()


def _institution_domain_roots(institution: Institution) -> Set[str]:
    roots = {_domain_root(institution.domain)} if institution.domain else set()
    for verified in institution.verified_domains or []:
        roots.add(_domain_root(str(verified)))
    return {r for r in roots if r}


def _domains_equivalent(
    left: str,
    right: str,
    institution: Institution,
) -> bool:
    left = left.lower().strip()
    right = right.lower().strip()
    if left == right:
        return True
    if _domain_root(left) == _domain_root(right):
        return True
    roots = _institution_domain_roots(institution)
    left_root = _domain_root(left)
    right_root = _domain_root(right)
    return left_root in roots and right_root in roots


def _split_email(email: str) -> tuple[str, str]:
    local, _, domain = email.lower().strip().partition("@")
    return local, domain


def _emails_match(user_email: str, student_email: str, institution: Institution) -> bool:
    if not user_email or not student_email:
        return False
    if user_email.lower().strip() == student_email.lower().strip():
        return True

    user_local, user_domain = _split_email(user_email)
    student_local, student_domain = _split_email(student_email)
    if not user_domain or not student_domain:
        return False
    if not _domains_equivalent(user_domain, student_domain, institution):
        return False
    if user_local == student_local:
        return True

    user_parts = user_local.split(".")
    student_parts = student_local.split(".")
    if len(user_parts) >= 2 and len(student_parts) >= 2 and user_parts[-1] == student_parts[-1]:
        user_first, student_first = user_parts[0], student_parts[0]
        if user_first == student_first:
            return True
        if len(user_first) == 1 and student_first.startswith(user_first):
            return True
        if len(student_first) == 1 and user_first.startswith(student_first):
            return True
        if user_first.startswith(student_first) or student_first.startswith(user_first):
            return True
    return False


def _normalize_orcid(value: str) -> str:
    return re.sub(r"[^0-9Xx]", "", value or "").upper()


def _names_match(user_name: str, student: SISStudent) -> bool:
    if not user_name:
        return False
    candidates = [student.full_name, f"{student.first_name} {student.last_name}".strip()]
    user_parts = user_name.lower().split()
    if len(user_parts) < 2:
        return False
    user_last = user_parts[-1]
    user_first = user_parts[0]

    for candidate in candidates:
        if not candidate:
            continue
        cand_parts = candidate.lower().split()
        if len(cand_parts) < 2:
            continue
        if cand_parts[-1] != user_last:
            continue
        cand_first = cand_parts[0]
        if user_first == cand_first:
            return True
        if user_first.startswith(cand_first) or cand_first.startswith(user_first):
            return True
        if len(user_first) == 1 and cand_first.startswith(user_first):
            return True
        if len(cand_first) == 1 and user_first.startswith(cand_first):
            return True
    return False


def _find_student_match(
    user: User,
    students: Iterable[SISStudent],
    institution: Institution,
) -> Optional[SISStudent]:
    students = list(students)
    for student in students:
        if _emails_match(user.email, student.email, institution):
            return student

    if user.orcid_id:
        user_orcid = _normalize_orcid(user.orcid_id)
        for student in students:
            if user_orcid and user_orcid == _normalize_orcid(student.orcid_placeholder):
                return student

    for student in students:
        if _names_match(user.name, student):
            return student

    return None


async def resolve_student_id_for_user(
    db: AsyncSession,
    user: User,
    institution: Institution,
    repo: Optional[ExcelISRepository] = None,
    *,
    commit: bool = False,
) -> Optional[str]:
    result = await db.execute(
        select(PgStudentProfile).where(
            PgStudentProfile.institution_id == institution.id,
            PgStudentProfile.user_id == user.id,
        )
    )
    profile = result.scalar_one_or_none()
    if profile:
        return profile.student_id

    repo = repo or get_excel_repository()
    students = repo.get_students(institution.name, institution.domain)
    student = _find_student_match(user, students, institution)
    if not student:
        return None

    db.add(
        PgStudentProfile(
            institution_id=institution.id,
            student_id=student.student_id,
            user_id=user.id,
            orcid=student.orcid_placeholder or user.orcid_id,
        )
    )
    if commit:
        await db.commit()
    else:
        await db.flush()
    return student.student_id
