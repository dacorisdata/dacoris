"""
Create the University of Embu institution plus researcher/student and
supervisor accounts, sourced from the HR_Staff / SIS_Students rows in
data/DACORIS_IS_v2.xlsx.

Usage: python create_university_of_embu.py

Prefer create_accounts_from_excel.py to load every institution in the workbook.
"""
import asyncio

from sqlalchemy import select
from database import async_session_maker
from models import (
    User,
    AccountType,
    UserStatus,
    Institution,
    PrimaryAccountType,
    PgStaffProfile,
    PgStudentProfile,
)
from auth import get_password_hash
from services.external_systems.excel_is_reader import get_excel_repository

INSTITUTION_NAME = "University of Embu"
INSTITUTION_DOMAIN = "embuni.ac.ke"

# Demo password for every account this script creates (same convention as seed.py)
PASSWORD = "Demo@12345"

STAFF_ROLE_TO_ACCOUNT_TYPE = {
    "Lead Supervisor": PrimaryAccountType.SUPERVISOR,
    "Co-Supervisor": PrimaryAccountType.SUPERVISOR,
    "Head of Postgraduate Studies": PrimaryAccountType.HEAD_OF_PG_STUDIES,
    "Postgraduate Coordinator": PrimaryAccountType.PG_COORDINATOR,
}


async def get_or_create_institution(db) -> Institution:
    result = await db.execute(
        select(Institution).where(Institution.name == INSTITUTION_NAME)
    )
    inst = result.scalar_one_or_none()
    if inst:
        print(f"[WARN] Institution '{INSTITUTION_NAME}' already exists, using existing institution")
        return inst

    inst = Institution(
        name=INSTITUTION_NAME,
        domain=INSTITUTION_DOMAIN,
        verified_domains=INSTITUTION_DOMAIN,
        is_active=True,
    )
    db.add(inst)
    await db.flush()
    print(f"[OK] Created institution: {INSTITUTION_NAME}")
    return inst


async def create_students(db, inst: Institution, repo):
    students = repo.get_students(institution_name=INSTITUTION_NAME)
    if not students:
        print(f"[WARN] No SIS_Students rows found for '{INSTITUTION_NAME}' in the Excel workbook")
        return

    for student in students:
        result = await db.execute(select(User).where(User.email == student.email))
        existing = result.scalar_one_or_none()
        if existing:
            print(f"[WARN] User {student.email} already exists, skipping")
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
            email_verified=True,
            is_global_admin=False,
            is_institution_admin=False,
        )
        db.add(user)
        await db.flush()

        db.add(
            PgStudentProfile(
                institution_id=inst.id,
                student_id=student.student_id,
                user_id=user.id,
                orcid=student.orcid_placeholder or None,
            )
        )
        print(f"[OK] Created student: {student.email} ({student.student_id}) - {student.full_name}")


async def create_staff(db, inst: Institution, repo):
    staff_list = repo.get_staff_list(institution_name=INSTITUTION_NAME)
    if not staff_list:
        print(f"[WARN] No HR_Staff rows found for '{INSTITUTION_NAME}' in the Excel workbook")
        return

    for staff in staff_list:
        result = await db.execute(select(User).where(User.email == staff.email))
        existing = result.scalar_one_or_none()
        if existing:
            print(f"[WARN] User {staff.email} already exists, skipping")
            continue

        account_type = STAFF_ROLE_TO_ACCOUNT_TYPE.get(staff.role, PrimaryAccountType.ADMIN_STAFF)

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

        db.add(
            PgStaffProfile(
                institution_id=inst.id,
                user_id=user.id,
                staff_id=staff.staff_id,
            )
        )
        print(f"[OK] Created staff: {staff.email} ({staff.staff_id}) - {staff.full_name} [{staff.role}]")


async def main():
    repo = get_excel_repository()
    async with async_session_maker() as db:
        inst = await get_or_create_institution(db)
        await create_staff(db, inst, repo)
        await create_students(db, inst, repo)
        await db.commit()

    print("\n" + "=" * 60)
    print(f"[OK] {INSTITUTION_NAME} accounts ready (password: {PASSWORD} for all)")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
