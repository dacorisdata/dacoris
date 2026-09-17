"""
Create institutions plus researcher/student and staff accounts from
data/DACORIS_IS_v2.xlsx (see services/external_systems/excel_is_reader.py).

Usage: python create_accounts_from_excel.py
Run from the backend/ directory with the virtualenv active, or inside the
backend container.
"""
import asyncio

from sqlalchemy import select
from database import async_session_maker
from models import (
    User,
    AccountType,
    UserStatus,
    Institution,
    InstitutionType,
    InstitutionTypeAssignment,
    PrimaryAccountType,
    PgStaffProfile,
    PgStudentProfile,
    user_roles,
)
from auth import get_password_hash
from account_types import get_default_roles
from services.external_systems.excel_is_reader import get_excel_repository

PASSWORD = "Demo@12345"

STAFF_ROLE_TO_ACCOUNT_TYPE = {
    "Lead Supervisor": PrimaryAccountType.SUPERVISOR,
    "Co-Supervisor": PrimaryAccountType.SUPERVISOR,
    "Head of Postgraduate Studies": PrimaryAccountType.HEAD_OF_PG_STUDIES,
    "Postgraduate Coordinator": PrimaryAccountType.PG_COORDINATOR,
    "Ethics Officer": PrimaryAccountType.ETHICS_COMMITTEE_MEMBER,
    "Finance Officer": PrimaryAccountType.FINANCE_OFFICER,
    "Library / Repository Officer": PrimaryAccountType.LIBRARIAN,
    "ICT Administrator": PrimaryAccountType.ADMIN_STAFF,
}

UNIVERSITY_MARKERS = ("university", "universite", "college")


def _institution_type_for(name: str) -> InstitutionType:
    lowered = (name or "").lower()
    if any(marker in lowered for marker in UNIVERSITY_MARKERS):
        return InstitutionType.UNIVERSITY
    return InstitutionType.OTHER


def _institutions_from_repo(repo):
    found = {}
    for student in repo.get_students():
        name = (student.institution or "").strip()
        if not name:
            continue
        domain = (student.domain or "").strip().lower()
        current = found.get(name.lower())
        if current is None:
            found[name.lower()] = {"name": name, "domain": domain}
        elif domain and not current["domain"]:
            current["domain"] = domain
    for staff in repo.get_staff_list():
        name = (staff.institution or "").strip()
        if not name:
            continue
        found.setdefault(name.lower(), {"name": name, "domain": ""})
    return sorted(found.values(), key=lambda item: item["name"].lower())


async def _assign_default_roles(db, user, primary_type):
    roles = get_default_roles(primary_type)
    if not roles:
        return
    await db.execute(user_roles.delete().where(user_roles.c.user_id == user.id))
    for role in roles:
        await db.execute(
            user_roles.insert().values(user_id=user.id, role=role, assigned_by=None)
        )


async def get_or_create_institution(db, name: str, domain: str) -> Institution:
    result = await db.execute(select(Institution).where(Institution.name == name))
    inst = result.scalar_one_or_none()
    if not inst and domain:
        result = await db.execute(select(Institution).where(Institution.domain == domain))
        inst = result.scalar_one_or_none()

    if inst:
        print(f"[INFO] Using institution: {inst.name}")
    else:
        if not domain:
            raise ValueError(f"Cannot create institution '{name}' without a domain in the Excel file")
        inst = Institution(
            name=name,
            domain=domain,
            verified_domains=domain,
            is_active=True,
        )
        db.add(inst)
        await db.flush()
        print(f"[OK] Created institution: {name} ({domain})")

    inst_type = _institution_type_for(name)
    existing_type = await db.execute(
        select(InstitutionTypeAssignment).where(
            InstitutionTypeAssignment.institution_id == inst.id,
            InstitutionTypeAssignment.institution_type == inst_type,
        )
    )
    if not existing_type.scalar_one_or_none():
        db.add(
            InstitutionTypeAssignment(
                institution_id=inst.id,
                institution_type=inst_type,
            )
        )
    return inst


async def _ensure_student_profile(db, user, inst, student):
    result = await db.execute(
        select(PgStudentProfile).where(PgStudentProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if profile:
        if profile.student_id != student.student_id:
            profile.student_id = student.student_id
        if student.orcid_placeholder:
            profile.orcid = student.orcid_placeholder
        return
    db.add(
        PgStudentProfile(
            institution_id=inst.id,
            student_id=student.student_id,
            user_id=user.id,
            orcid=student.orcid_placeholder or None,
        )
    )


async def _ensure_staff_profile(db, user, inst, staff):
    if not user.staff_id:
        user.staff_id = staff.staff_id
    result = await db.execute(
        select(PgStaffProfile).where(PgStaffProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if profile:
        if profile.staff_id != staff.staff_id:
            profile.staff_id = staff.staff_id
        return
    db.add(
        PgStaffProfile(
            institution_id=inst.id,
            user_id=user.id,
            staff_id=staff.staff_id,
        )
    )


async def create_students(db, inst: Institution, repo):
    students = repo.get_students(institution_name=inst.name)
    if not students:
        print(f"[WARN] No SIS_Students rows found for '{inst.name}'")
        return 0

    created = 0
    for student in students:
        if not student.email:
            print(f"[WARN] Skipping student {student.student_id}: missing email")
            continue
        result = await db.execute(select(User).where(User.email == student.email))
        existing = result.scalar_one_or_none()
        if existing:
            await _ensure_student_profile(db, existing, inst, student)
            print(f"[INFO] User {student.email} already exists, linked student profile")
            continue

        user = User(
            email=student.email,
            name=student.full_name,
            password_hash=get_password_hash(PASSWORD),
            account_type=AccountType.ORCID,
            status=UserStatus.ACTIVE,
            primary_institution_id=inst.id,
            primary_account_type=PrimaryAccountType.POSTGRADUATE_STUDENT,
            department=student.department or None,
            job_title=student.degree_level or None,
            staff_id=None,
            orcid_id=None,
            email_verified=True,
            is_global_admin=False,
            is_institution_admin=False,
        )
        db.add(user)
        await db.flush()
        await _assign_default_roles(db, user, PrimaryAccountType.POSTGRADUATE_STUDENT)
        await _ensure_student_profile(db, user, inst, student)
        created += 1
        print(f"[OK] Created student: {student.email} ({student.student_id}) - {student.full_name}")
    return created


async def create_staff(db, inst: Institution, repo):
    staff_list = repo.get_staff_list(institution_name=inst.name)
    if not staff_list:
        print(f"[WARN] No HR_Staff rows found for '{inst.name}'")
        return 0

    created = 0
    for staff in staff_list:
        if not staff.email:
            print(f"[WARN] Skipping staff {staff.staff_id}: missing email")
            continue
        result = await db.execute(select(User).where(User.email == staff.email))
        existing = result.scalar_one_or_none()
        account_type = STAFF_ROLE_TO_ACCOUNT_TYPE.get(staff.role, PrimaryAccountType.ADMIN_STAFF)
        if existing:
            await _ensure_staff_profile(db, existing, inst, staff)
            print(f"[INFO] User {staff.email} already exists, linked staff profile")
            continue

        user = User(
            email=staff.email,
            name=staff.full_name,
            password_hash=get_password_hash(PASSWORD),
            account_type=AccountType.ORCID,
            status=UserStatus.ACTIVE,
            primary_institution_id=inst.id,
            primary_account_type=account_type,
            department=staff.department or None,
            job_title=staff.role or None,
            staff_id=staff.staff_id,
            email_verified=True,
            is_global_admin=False,
            is_institution_admin=False,
        )
        db.add(user)
        await db.flush()
        await _assign_default_roles(db, user, account_type)
        await _ensure_staff_profile(db, user, inst, staff)
        created += 1
        print(f"[OK] Created staff: {staff.email} ({staff.staff_id}) - {staff.full_name} [{staff.role}]")
    return created


async def main():
    repo = get_excel_repository()
    print(f"[INFO] Excel: {repo.excel_path}")
    print(f"[INFO] Students={len(repo._students)} staff={len(repo._staff)} journeys={len(repo._journeys)}")

    created_students = 0
    created_staff = 0
    async with async_session_maker() as db:
        for item in _institutions_from_repo(repo):
            print("\n" + "-" * 60)
            inst = await get_or_create_institution(db, item["name"], item["domain"])
            created_staff += await create_staff(db, inst, repo)
            created_students += await create_students(db, inst, repo)
        await db.commit()

    print("\n" + "=" * 60)
    print(f"[OK] Excel accounts ready (password: {PASSWORD} for newly created users)")
    print(f"[OK] Created {created_staff} staff and {created_students} students")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
