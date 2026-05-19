"""Add role column to manuscript_co_authors table"""
import asyncio
from sqlalchemy import text
from database import engine


async def upgrade():
    async with engine.begin() as conn:
        await conn.execute(text(
            "ALTER TABLE manuscript_co_authors ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'author'"
        ))
        print("✅ Added 'role' column to manuscript_co_authors table")


async def downgrade():
    async with engine.begin() as conn:
        await conn.execute(text(
            "ALTER TABLE manuscript_co_authors DROP COLUMN IF EXISTS role"
        ))
        print("✅ Removed 'role' column from manuscript_co_authors table")


if __name__ == "__main__":
    print("Running migration: add_co_author_role")
    asyncio.run(upgrade())
    print("Migration completed successfully!")
