"""Add proposal document requirements and fix section_order values."""
import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from database import engine


async def upgrade():
    async with engine.begin() as conn:
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS proposal_document_requirements (
                id VARCHAR PRIMARY KEY,
                proposal_id VARCHAR NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
                label VARCHAR(300) NOT NULL,
                item_order INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))

        await conn.execute(text("""
            ALTER TABLE proposal_documents
            ADD COLUMN IF NOT EXISTS requirement_id VARCHAR
            REFERENCES proposal_document_requirements(id) ON DELETE CASCADE
        """))

        # Rename legacy "order" column if present, otherwise ensure section_order exists
        await conn.execute(text("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'proposal_sections' AND column_name = 'order'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'proposal_sections' AND column_name = 'section_order'
                ) THEN
                    ALTER TABLE proposal_sections RENAME COLUMN "order" TO section_order;
                END IF;
            END $$;
        """))

        await conn.execute(text("""
            ALTER TABLE proposal_sections
            ADD COLUMN IF NOT EXISTS section_order INTEGER DEFAULT 0
        """))

        await conn.execute(text("""
            UPDATE proposal_sections ps
            SET section_order = subquery.row_num - 1
            FROM (
                SELECT id, ROW_NUMBER() OVER (
                    PARTITION BY proposal_id
                    ORDER BY section_order, id
                ) AS row_num
                FROM proposal_sections
            ) AS subquery
            WHERE ps.id = subquery.id
        """))

        print("Added proposal_document_requirements table")
        print("Normalized proposal_sections.section_order values")


async def downgrade():
    async with engine.begin() as conn:
        await conn.execute(text(
            "ALTER TABLE proposal_documents DROP COLUMN IF EXISTS requirement_id"
        ))
        await conn.execute(text(
            "DROP TABLE IF EXISTS proposal_document_requirements"
        ))
        print("Removed proposal document requirements")


if __name__ == "__main__":
    print("Running migration: add_proposal_document_requirements")
    asyncio.run(upgrade())
    print("Migration completed successfully!")
