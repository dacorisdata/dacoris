"""
One-time script: assign all admin-staff ResearchRoles + set primary_account_type
for a target user email.

Usage (from the /backend directory):
    python -m scripts.assign_admin_roles
or
    python scripts/assign_admin_roles.py
"""

import asyncio
import os
import sys

# Make sure the backend package root is on the path when run directly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

TARGET_EMAIL = "steveggaita@gmail.com"
TARGET_PAT   = "INSTITUTIONAL_LEADERSHIP"
ADMIN_ROLES  = [
    "grant_officer", "research_admin", "finance_officer",
    "ethics_reviewer", "ethics_chair", "data_steward",
    "data_engineer", "institutional_lead", "system_admin",
    "external_reviewer", "external_funder",
]

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://user:password@localhost:5432/dacoris"
)


async def main():
    engine = create_async_engine(DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        # 1. Find user using only stable columns
        row = (await conn.execute(
            text("SELECT id, name, status FROM users WHERE email = :email"),
            {"email": TARGET_EMAIL},
        )).fetchone()

        if not row:
            print(f"[ERROR] User '{TARGET_EMAIL}' not found in the database.")
            return

        user_id, name, status = row
        print(f"[OK]  Found user: id={user_id}  name={name}  status={status}")

        # 2. Activate if pending
        if status == "pending":
            await conn.execute(
                text("UPDATE users SET status = 'active' WHERE id = :uid"),
                {"uid": user_id},
            )
            print("[OK]  Status updated → active")

        # 3. Set primary_account_type
        await conn.execute(
            text("UPDATE users SET primary_account_type = :pat WHERE id = :uid"),
            {"pat": TARGET_PAT, "uid": user_id},
        )
        print(f"[OK]  primary_account_type → {TARGET_PAT}")

        # 4. Clear existing roles
        await conn.execute(
            text("DELETE FROM user_roles WHERE user_id = :uid"),
            {"uid": user_id},
        )
        print("[OK]  Cleared existing roles")

        # 5. Insert all admin roles
        for role in ADMIN_ROLES:
            await conn.execute(
                text("INSERT INTO user_roles (user_id, role) VALUES (:uid, :role) ON CONFLICT DO NOTHING"),
                {"uid": user_id, "role": role},
            )
        print(f"[OK]  Assigned {len(ADMIN_ROLES)} roles:")
        for r in ADMIN_ROLES:
            print(f"       • {r}")

    await engine.dispose()
    print(f"\n[DONE] All changes committed for {TARGET_EMAIL}")


if __name__ == "__main__":
    asyncio.run(main())
