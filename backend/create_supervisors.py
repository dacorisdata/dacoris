"""
Create postgraduate supervisor accounts for Ascension Dynamics.
Usage: python create_supervisors.py
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
)
from auth import get_password_hash
from services.external_systems.excel_is_reader import get_excel_repository

PASSWORD = "@Waxmangme86"

ACCOUNTS = [
    {
        "email": "mary.waithaka@ascensiondynamics.co",
        "name": "Mary Waithaka",
        "job_title": "Lead Supervisor",
    },
    {
        "email": "elizabeth.auma@ascensiondynamics.co",
        "name": "Elizabeth Auma",
        "job_title": "Co-Supervisor",
    },
]


async def create_supervisors():
    repo = get_excel_repository()
    async with async_session_maker() as db:
        result = await db.execute(
            select(Institution).where(Institution.name == "Ascension Dynamics")
        )
        inst = result.scalar_one_or_none()
        if not inst:
            print("[ERROR] Institution 'Ascension Dynamics' not found.")
            return

        print(f"[INFO] Institution: {inst.name} (domain={inst.domain})")

        for acct in ACCOUNTS:
            email = acct["email"]
            result = await db.execute(select(User).where(User.email == email))
            existing = result.scalar_one_or_none()
            if existing:
                print(f"[WARN] User {email} already exists")
                continue

            staff = repo.get_staff(email=email, institution_name=inst.name)
            if not staff:
                print(f"[ERROR] No HR staff record for {email}")
                continue

            user = User(
                email=email,
                name=acct["name"],
                password_hash=get_password_hash(PASSWORD),
                account_type=AccountType.ORCID,
                status=UserStatus.ACTIVE,
                primary_institution_id=inst.id,
                primary_account_type=PrimaryAccountType.SUPERVISOR,
                department=staff.department or "Information Systems",
                job_title=acct["job_title"],
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
            print(f"[OK] Created supervisor: {email} (staff_id={staff.staff_id})")

        await db.commit()
        print("\n" + "=" * 60)
        print("[OK] Supervisor accounts ready")
        print("=" * 60)
        for acct in ACCOUNTS:
            print(f"  {acct['email']}  /  {PASSWORD}")
        print("=" * 60 + "\n")


if __name__ == "__main__":
    asyncio.run(create_supervisors())
