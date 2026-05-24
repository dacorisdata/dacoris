"""Add project budget lines and financial notes fields."""
import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from database import engine


async def upgrade():
    async with engine.begin() as conn:
        statements = [
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS financial_overhead_rate VARCHAR(100)",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS financial_notes TEXT",
            "ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS reporting_currency VARCHAR(10) DEFAULT 'KES'",
            """
            CREATE TABLE IF NOT EXISTS project_budget_lines (
                id VARCHAR PRIMARY KEY,
                project_id VARCHAR NOT NULL REFERENCES research_projects(id) ON DELETE CASCADE,
                category VARCHAR(200) NOT NULL,
                description VARCHAR(500),
                amount INTEGER DEFAULT 0,
                spent_to_date INTEGER DEFAULT 0,
                item_order INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
            """,
            "CREATE INDEX IF NOT EXISTS idx_project_budget_lines_project_id ON project_budget_lines(project_id)",
        ]
        for stmt in statements:
            await conn.execute(text(stmt))
        print("Added project financial fields and budget lines table")


if __name__ == "__main__":
    print("Running migration: add_project_financial_fields")
    asyncio.run(upgrade())
    print("Migration completed successfully!")
