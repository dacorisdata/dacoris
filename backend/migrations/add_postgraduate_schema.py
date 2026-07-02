"""
Apply postgraduate schema changes (staff_id column + PG tables).
Run: docker exec dacoris-backend python migrations/add_postgraduate_schema.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from database import engine, init_db


async def migrate():
    async with engine.begin() as conn:
        await conn.execute(text("""
            ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_id VARCHAR(50)
        """))
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_users_staff_id ON users (staff_id)
        """))
        for value in (
            "POSTGRADUATE_STUDENT", "SUPERVISOR", "EXTERNAL_SUPERVISOR",
            "PG_COORDINATOR", "HEAD_OF_PG_STUDIES",
        ):
            await conn.execute(text(
                f"ALTER TYPE primaryaccounttype ADD VALUE IF NOT EXISTS '{value}'"
            ))
        for value in (
            "postgraduate_student", "supervisor", "external_supervisor",
            "pg_coordinator", "head_of_pg_studies",
        ):
            await conn.execute(text(
                f"ALTER TYPE researchrole ADD VALUE IF NOT EXISTS '{value}'"
            ))
    await init_db()
    print("Postgraduate schema migration complete")


if __name__ == "__main__":
    asyncio.run(migrate())
