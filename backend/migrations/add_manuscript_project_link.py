"""Add optional project_id link to manuscripts."""
import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from database import engine


async def upgrade():
    async with engine.begin() as conn:
        await conn.execute(text(
            "ALTER TABLE manuscripts ADD COLUMN IF NOT EXISTS project_id VARCHAR REFERENCES research_projects(id)"
        ))
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_manuscripts_project_id ON manuscripts(project_id)"
        ))
        print("Added manuscripts.project_id column")


if __name__ == "__main__":
    print("Running migration: add_manuscript_project_link")
    asyncio.run(upgrade())
    print("Migration completed successfully!")
