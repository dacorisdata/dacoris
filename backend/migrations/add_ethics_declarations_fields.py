"""Add conflict of interest and declaration fields to research_projects."""
import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from database import engine


async def upgrade():
    async with engine.begin() as conn:
        statements = [
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS conflict_of_interest TEXT",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS declaration_responses TEXT",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS declaration_date TIMESTAMPTZ",
        ]
        for stmt in statements:
            await conn.execute(text(stmt))
        print("Added ethics COI and declaration fields to research_projects")


if __name__ == "__main__":
    print("Running migration: add_ethics_declarations_fields")
    asyncio.run(upgrade())
    print("Migration completed successfully!")
