"""
Migration: Create qualitative_data table (KII / FGD imports).

Files are stored on local disk (UPLOAD_DIR/qualitative_data) — this table only tracks
metadata, mirroring the ethics-document pattern rather than the MinIO Bronze lakehouse
pipeline used by DataImport.

Run with: python migrations/add_qualitative_data.py
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from database import engine


async def upgrade():
    async with engine.begin() as conn:
        await conn.execute(text("""
            DO $$ BEGIN
                CREATE TYPE qualitativedatatype AS ENUM ('kii', 'fgd', 'other');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;
        """))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS qualitative_data (
                id VARCHAR PRIMARY KEY,
                institution_id VARCHAR NOT NULL REFERENCES institutions(id),
                researcher_id VARCHAR NOT NULL REFERENCES users(id),
                project_id VARCHAR REFERENCES research_projects(id),
                data_type qualitativedatatype NOT NULL,
                title VARCHAR(500) NOT NULL,
                description TEXT,
                date_conducted TIMESTAMPTZ,
                location VARCHAR(255),
                language VARCHAR(100),
                original_filename VARCHAR(255),
                stored_filename VARCHAR(255),
                file_path TEXT,
                file_format VARCHAR(20),
                file_size_bytes INTEGER,
                mime_type VARCHAR(150),
                created_by_id VARCHAR REFERENCES users(id),
                created_at TIMESTAMPTZ DEFAULT now(),
                updated_at TIMESTAMPTZ
            )
        """))

        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_qualitative_data_institution_id ON qualitative_data(institution_id)"
        ))
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_qualitative_data_researcher_id ON qualitative_data(researcher_id)"
        ))
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_qualitative_data_project_id ON qualitative_data(project_id)"
        ))
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_qualitative_data_created_at ON qualitative_data(created_at)"
        ))

        print("Created qualitative_data table")


if __name__ == "__main__":
    print("Running migration: add_qualitative_data")
    asyncio.run(upgrade())
    print("Migration completed successfully!")
