"""
Create the demo account that can switch between researcher-facing roles.
Usage (from /backend): python create_demo_user.py
"""
import asyncio

from sqlalchemy import select
from database import async_session_maker
from models import User, AccountType, UserStatus, Institution, PrimaryAccountType
from auth import get_password_hash

DEMO_EMAIL = "demo@dacoris.com"
DEMO_PASSWORD = "Demo@dacoris1"
DEMO_NAME = "Demo User"
DEMO_ORCID_ID = "0009-0001-0000-0001"


async def create_demo_user():
    async with async_session_maker() as db:
        result = await db.execute(
            select(Institution).where(Institution.name == "Ascension Dynamics")
        )
        inst = result.scalar_one_or_none()
        if not inst:
            result = await db.execute(
                select(Institution).where(Institution.domain == "ascensiondynamics.com")
            )
            inst = result.scalar_one_or_none()

        if not inst:
            print("[INFO] Creating institution: Ascension Dynamics")
            inst = Institution(
                name="Ascension Dynamics",
                domain="ascensiondynamics.com",
                verified_domains="ascensiondynamics.com",
                is_active=True,
            )
            db.add(inst)
            await db.flush()
            print("[OK] Institution created")
        else:
            print(f"[INFO] Using institution: {inst.name}")

        result = await db.execute(select(User).where(User.email == DEMO_EMAIL))
        user = result.scalar_one_or_none()
        password_hash = get_password_hash(DEMO_PASSWORD)

        if user:
            print(f"[WARN] User {DEMO_EMAIL} already exists — updating")
            user.name = DEMO_NAME
            user.password_hash = password_hash
            user.primary_account_type = PrimaryAccountType.RESEARCHER
            user.job_title = "Researcher"
            user.status = UserStatus.ACTIVE
            user.email_verified = True
            user.primary_institution_id = inst.id
            user.orcid_id = DEMO_ORCID_ID
            user.account_type = AccountType.ORCID
        else:
            user = User(
                email=DEMO_EMAIL,
                name=DEMO_NAME,
                password_hash=password_hash,
                account_type=AccountType.ORCID,
                status=UserStatus.ACTIVE,
                primary_institution_id=inst.id,
                primary_account_type=PrimaryAccountType.RESEARCHER,
                job_title="Researcher",
                department="Research Office",
                orcid_id=DEMO_ORCID_ID,
                email_verified=True,
                is_global_admin=False,
                is_institution_admin=False,
            )
            db.add(user)
            print("[OK] Demo user created")

        await db.commit()

        print("\n" + "=" * 60)
        print("[OK] Demo account ready for role switching")
        print("=" * 60)
        print(f"Email:    {DEMO_EMAIL}")
        print(f"Password: {DEMO_PASSWORD}")
        print(f"ORCID:    {DEMO_ORCID_ID}")
        print("Roles:    Researcher, Research Manager, Supervisor, Reviewer")
        print("=" * 60 + "\n")


if __name__ == "__main__":
    asyncio.run(create_demo_user())
