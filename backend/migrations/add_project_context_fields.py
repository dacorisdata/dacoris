"""Add project context fields to research_projects."""
import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from database import engine


async def upgrade():
    async with engine.begin() as conn:
        statements = [
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS project_code VARCHAR(50)",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS short_title VARCHAR(50)",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS research_area VARCHAR(200)",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS lead_institution VARCHAR(300)",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS department VARCHAR(300)",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS involves_animal_subjects BOOLEAN DEFAULT FALSE",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS involves_sensitive_data BOOLEAN DEFAULT FALSE",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS is_clinical_trial BOOLEAN DEFAULT FALSE",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS uses_hazardous_materials BOOLEAN DEFAULT FALSE",
        ]
        for stmt in statements:
            await conn.execute(text(stmt))

        await conn.execute(text("""
            UPDATE research_projects
            SET project_code = CONCAT('PRJ-', EXTRACT(YEAR FROM created_at)::int, '-', UPPER(SUBSTRING(id, 1, 8)))
            WHERE project_code IS NULL OR project_code = ''
        """))

        print("Added project context fields to research_projects")


if __name__ == "__main__":
    print("Running migration: add_project_context_fields")
    asyncio.run(upgrade())
    print("Migration completed successfully!")
