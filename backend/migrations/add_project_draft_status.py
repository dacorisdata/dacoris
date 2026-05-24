"""Add draft status to research project workflow."""
import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from database import engine


async def upgrade():
    async with engine.begin() as conn:
        for value in ("draft", "DRAFT"):
            await conn.execute(text(f"""
                DO $$ BEGIN
                    ALTER TYPE projectstatus ADD VALUE IF NOT EXISTS '{value}';
                EXCEPTION WHEN others THEN NULL;
                END $$;
            """))
        print("Added draft to projectstatus enum")


if __name__ == "__main__":
    print("Running migration: add_project_draft_status")
    asyncio.run(upgrade())
    print("Migration completed successfully!")
