"""
Create a global admin user
Usage: python create_admin.py
"""
import asyncio
from sqlalchemy import select
from database import async_session_maker
from models import User, AccountType, UserStatus, Institution
from auth import get_password_hash

async def create_admin():
    async with async_session_maker() as db:
        # Get the Ascension Dynamics institution
        result = await db.execute(
            select(Institution).where(Institution.domain == "ascensiondynamics.com")
        )
        inst = result.scalar_one_or_none()
        
        if not inst:
            print("[ERROR] Institution 'ascensiondynamics.com' not found. Please run seed.py first to create the institution.")
            return
        
        # Check if admin already exists
        admin_email = "admin@ascensiondynamics.com"
        result = await db.execute(
            select(User).where(User.email == admin_email)
        )
        existing_admin = result.scalar_one_or_none()
        
        if existing_admin:
            print(f"[WARN] Admin user {admin_email} already exists")
            print(f"[INFO] Email: {admin_email}")
            print(f"[INFO] Password: Demo@12345")
            print(f"[INFO] Is Global Admin: {existing_admin.is_global_admin}")
            return
        
        # Create global admin
        admin = User(
            email=admin_email,
            name="Global Admin",
            password_hash=get_password_hash("Demo@12345"),
            account_type=AccountType.ORCID,
            status=UserStatus.ACTIVE,
            primary_institution_id=inst.id,
            is_global_admin=True,
            email_verified=True,
        )
        
        db.add(admin)
        await db.commit()
        
        print("[OK] Global admin created successfully!")
        print(f"[INFO] Email: {admin_email}")
        print(f"[INFO] Password: Demo@12345")
        print(f"[INFO] You can now login at http://localhost/login")

if __name__ == "__main__":
    asyncio.run(create_admin())
