"""
Create a researcher account with ORCID
Usage: python create_researcher.py
"""
import asyncio
from sqlalchemy import select
from database import async_session_maker
from models import User, AccountType, UserStatus, Institution
from auth import get_password_hash

async def create_researcher():
    async with async_session_maker() as db:
        # Get the Ascension Dynamics institution (search by name)
        result = await db.execute(
            select(Institution).where(Institution.name == "Ascension Dynamics")
        )
        inst = result.scalar_one_or_none()
        
        if not inst:
            # Try by domain
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
            print(f"[INFO] Using existing institution: {inst.name}")
        
        # Check if user already exists
        email = "s.gaita@ascensiondynamics.co"
        result = await db.execute(
            select(User).where(User.email == email)
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print(f"[WARN] User {email} already exists")
            print(f"[INFO] Email: {existing_user.email}")
            print(f"[INFO] ORCID ID: {existing_user.orcid_id}")
            print(f"[INFO] Status: {existing_user.status}")
            print(f"[INFO] Account Type: {existing_user.account_type}")
            return
        
        # Create researcher account
        researcher = User(
            email=email,
            name="S. Gaita",
            password_hash=get_password_hash("@Waxmangme86"),
            account_type=AccountType.ORCID,
            status=UserStatus.ACTIVE,
            primary_institution_id=inst.id,
            orcid_id="0009-0009-4810-6393",
            email_verified=True,
            is_global_admin=False,
            is_institution_admin=False,
        )
        
        db.add(researcher)
        await db.commit()
        
        print("\n" + "="*60)
        print("[OK] Researcher account created successfully!")
        print("="*60)
        print(f"Email: {email}")
        print(f"Password: @Waxmangme86")
        print(f"ORCID ID: 0009-0009-4810-6393")
        print(f"Status: ACTIVE")
        print(f"Email Verified: True")
        print(f"Institution: {inst.name}")
        print("="*60 + "\n")

if __name__ == "__main__":
    asyncio.run(create_researcher())
