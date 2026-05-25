"""Add dmp_plan_title to research_projects."""
import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from database import engine


async def upgrade():
    async with engine.begin() as conn:
        await conn.execute(text(
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS dmp_plan_title VARCHAR(500)"
        ))
        print("Added dmp_plan_title to research_projects")


if __name__ == "__main__":
    print("Running migration: add_dmp_plan_title")
    asyncio.run(upgrade())
    print("Migration completed successfully!")
