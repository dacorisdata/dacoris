"""Allow ethics applications without a linked research project."""
import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from database import engine


async def upgrade():
    async with engine.begin() as conn:
        await conn.execute(text(
            "ALTER TABLE ethics_applications ALTER COLUMN project_id DROP NOT NULL"
        ))
        print("Made ethics_applications.project_id optional")


if __name__ == "__main__":
    print("Running migration: add_ethics_optional_project")
    asyncio.run(upgrade())
    print("Migration completed successfully!")
