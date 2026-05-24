"""Add PI profile fields to research_projects."""
import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from database import engine


async def upgrade():
    async with engine.begin() as conn:
        statements = [
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS pi_full_name VARCHAR(300)",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS pi_academic_title VARCHAR(50)",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS pi_email VARCHAR(200)",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS pi_phone VARCHAR(50)",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS pi_orcid VARCHAR(100)",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS pi_staff_id VARCHAR(100)",
        ]
        for stmt in statements:
            await conn.execute(text(stmt))
        print("Added PI profile fields to research_projects")


if __name__ == "__main__":
    print("Running migration: add_project_pi_fields")
    asyncio.run(upgrade())
    print("Migration completed successfully!")
