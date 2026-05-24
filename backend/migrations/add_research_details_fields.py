"""Add structured research details fields to research_projects."""
import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from database import engine


async def upgrade():
    async with engine.begin() as conn:
        statements = [
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS project_abstract TEXT",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS background_rationale TEXT",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS problem_statement TEXT",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS research_methodology TEXT",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS research_design VARCHAR(100)",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS target_population VARCHAR(500)",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS research_keywords TEXT",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS research_objectives TEXT",
        ]
        for stmt in statements:
            await conn.execute(text(stmt))
        print("Added research details fields to research_projects")


if __name__ == "__main__":
    print("Running migration: add_research_details_fields")
    asyncio.run(upgrade())
    print("Migration completed successfully!")
