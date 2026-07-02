"""
Add institution_type column to institutions table
Run this script to add the missing column
"""
import asyncio
from sqlalchemy import text
from database import async_session_maker

INSTITUTION_TYPE_ENUM = """
    CREATE TYPE institutiontype AS ENUM (
        'university', 'hospital', 'research_institute', 'government',
        'ngo', 'industry', 'funder', 'international_org', 'other'
    )
"""


async def add_institution_type_column():
    async with async_session_maker() as db:
        try:
            result = await db.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='institutions' AND column_name='institution_type'
            """))
            exists = result.scalar_one_or_none()

            if exists:
                print("Column 'institution_type' already exists")
                return

            await db.execute(text("""
                DO $$ BEGIN
                    CREATE TYPE institutiontype AS ENUM (
                        'university', 'hospital', 'research_institute', 'government',
                        'ngo', 'industry', 'funder', 'international_org', 'other'
                    );
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;
            """))

            await db.execute(text("""
                ALTER TABLE institutions
                ADD COLUMN institution_type institutiontype NULL
            """))
            await db.commit()

            print("Successfully added 'institution_type' column to institutions table")

        except Exception as e:
            print(f"Error: {e}")
            await db.rollback()


if __name__ == "__main__":
    asyncio.run(add_institution_type_column())
