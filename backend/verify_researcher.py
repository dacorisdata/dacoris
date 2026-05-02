import asyncio
from sqlalchemy import select
from database import async_session_maker
from models import User

async def verify():
    async with async_session_maker() as db:
        result = await db.execute(
            select(User).where(User.email == "s.gaita@ascensiondynamics.co")
        )
        user = result.scalar_one_or_none()
        
        if user:
            print(f"✓ User found: {user.email}")
            print(f"  Name: {user.name}")
            print(f"  ORCID ID: {user.orcid_id}")
            print(f"  Account Type: {user.account_type}")
            print(f"  Status: {user.status}")
            print(f"  Email Verified: {user.email_verified}")
            print(f"  Institution ID: {user.primary_institution_id}")
            print(f"  Has Password: {bool(user.password_hash)}")
        else:
            print("✗ User not found")

asyncio.run(verify())
