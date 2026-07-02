"""
Migrate institution_type (single) to institution_type_assignments (many)
Run: docker exec dacoris-backend python migrate_institution_types_many.py
"""
import asyncio

from sqlalchemy import text
from database import async_session_maker


async def migrate():
    async with async_session_maker() as db:
        try:
            await db.execute(text("""
                CREATE TABLE IF NOT EXISTS institution_type_assignments (
                    id VARCHAR PRIMARY KEY,
                    institution_id VARCHAR NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
                    institution_type institutiontype NOT NULL,
                    assigned_at TIMESTAMPTZ DEFAULT NOW(),
                    CONSTRAINT unique_institution_type_assignment UNIQUE (institution_id, institution_type)
                )
            """))
            await db.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_institution_type_assignments_institution_id
                ON institution_type_assignments (institution_id)
            """))

            result = await db.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'institutions' AND column_name = 'institution_type'
            """))
            has_legacy_column = result.scalar_one_or_none()

            if has_legacy_column:
                await db.execute(text("""
                    INSERT INTO institution_type_assignments (id, institution_id, institution_type)
                    SELECT
                        gen_random_uuid()::text,
                        i.id,
                        i.institution_type
                    FROM institutions i
                    WHERE i.institution_type IS NOT NULL
                    ON CONFLICT (institution_id, institution_type) DO NOTHING
                """))
                await db.execute(text("ALTER TABLE institutions DROP COLUMN institution_type"))

            await db.commit()
            print("Successfully migrated institution types to many-to-many assignments")

        except Exception as e:
            print(f"Error: {e}")
            await db.rollback()


if __name__ == "__main__":
    asyncio.run(migrate())
