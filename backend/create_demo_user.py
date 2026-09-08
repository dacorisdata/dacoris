"""
Create demo accounts that can switch between researcher-facing roles.
Usage (from /backend): python create_demo_user.py
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
    user_roles,
)
from auth import get_password_hash
from account_types import get_default_roles

DEMO_ACCOUNTS = [
    {
        "email": "demo@kibu.ac.ke",
        "password": "Demo@dacoris1",
        "name": "KIBU Demo User",
        "orcid_id": "0009-0001-0000-0002",
        "institution_name": "Kibabii University",
        "institution_domain": "kibu.ac.ke",
        "institution_type": InstitutionType.UNIVERSITY,
    },
    {
        "email": "demo@dacoris.com",
        "password": "Demo@dacoris1",
        "name": "Demo User",
        "orcid_id": "0009-0001-0000-0001",
        "institution_name": "Ascension Dynamics",
        "institution_domain": "ascensiondynamics.com",
        "institution_type": None,
    },
]


async def _get_or_create_institution(db, name, domain, institution_type=None):
    result = await db.execute(select(Institution).where(Institution.domain == domain))
    inst = result.scalar_one_or_none()
    if not inst:
        result = await db.execute(select(Institution).where(Institution.name == name))
        inst = result.scalar_one_or_none()

    if not inst:
        print(f"[INFO] Creating institution: {name}")
        inst = Institution(
            name=name,
            domain=domain,
            verified_domains=domain,
            is_active=True,
        )
        db.add(inst)
        await db.flush()
        print("[OK] Institution created")
    else:
        print(f"[INFO] Using institution: {inst.name}")

    if institution_type:
        existing_type = await db.execute(
            select(InstitutionTypeAssignment).where(
                InstitutionTypeAssignment.institution_id == inst.id,
                InstitutionTypeAssignment.institution_type == institution_type,
            )
        )
        if not existing_type.scalar_one_or_none():
            db.add(
                InstitutionTypeAssignment(
                    institution_id=inst.id,
                    institution_type=institution_type,
                )
            )

    return inst


async def _assign_default_roles(db, user, primary_type):
    await db.execute(user_roles.delete().where(user_roles.c.user_id == user.id))
    for role in get_default_roles(primary_type):
        await db.execute(
            user_roles.insert().values(user_id=user.id, role=role, assigned_by=None)
        )


async def create_demo_user():
    async with async_session_maker() as db:
        for account in DEMO_ACCOUNTS:
            inst = await _get_or_create_institution(
                db,
                account["institution_name"],
                account["institution_domain"],
                account["institution_type"],
            )

            result = await db.execute(select(User).where(User.email == account["email"]))
            user = result.scalar_one_or_none()
            primary_type = PrimaryAccountType.RESEARCHER

            if user:
                print(f"[WARN] User {account['email']} already exists — activating for role switching")
                user.status = UserStatus.ACTIVE
                user.email_verified = True
                if not user.primary_institution_id:
                    user.primary_institution_id = inst.id
                if not user.primary_account_type:
                    user.primary_account_type = primary_type
                    user.job_title = user.job_title or "Researcher"
                    await _assign_default_roles(db, user, primary_type)
            else:
                user = User(
                    email=account["email"],
                    name=account["name"],
                    password_hash=get_password_hash(account["password"]),
                    account_type=AccountType.ORCID,
                    status=UserStatus.ACTIVE,
                    primary_institution_id=inst.id,
                    primary_account_type=primary_type,
                    job_title="Researcher",
                    department="Research Office",
                    orcid_id=account["orcid_id"],
                    email_verified=True,
                    is_global_admin=False,
                    is_institution_admin=False,
                )
                db.add(user)
                await db.flush()
                await _assign_default_roles(db, user, primary_type)
                print(f"[OK] Demo user created: {account['email']}")

        await db.commit()

        print("\n" + "=" * 60)
        print("[OK] Demo accounts ready for role switching")
        print("=" * 60)
        for account in DEMO_ACCOUNTS:
            print(f"Email:    {account['email']}")
            print(f"Password: {account['password']}")
            print("Roles:    Researcher, Admin Staff (Director Research), Admin Staff (Supervisor), Reviewer")
            print("-" * 60)
        print()


if __name__ == "__main__":
    asyncio.run(create_demo_user())
