"""Add structured DMP fields to research_projects."""
import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from database import engine


async def upgrade():
    async with engine.begin() as conn:
        statements = [
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS dmp_entry_mode VARCHAR(20) DEFAULT 'upload'",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS dmp_types_of_data TEXT",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS dmp_estimated_volume VARCHAR(200)",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS dmp_data_formats VARCHAR(500)",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS dmp_primary_storage VARCHAR(200)",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS dmp_backup_procedure TEXT",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS dmp_access_controls TEXT",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS dmp_retention_period VARCHAR(100)",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS dmp_sharing_plan TEXT",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS dmp_repository VARCHAR(300)",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS dmp_linked_document_id VARCHAR REFERENCES project_documents(id)",
        ]
        for stmt in statements:
            await conn.execute(text(stmt))
        print("Added DMP fields to research_projects")


if __name__ == "__main__":
    print("Running migration: add_dmp_fields")
    asyncio.run(upgrade())
    print("Migration completed successfully!")
