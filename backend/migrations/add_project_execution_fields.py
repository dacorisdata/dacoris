"""Add document links to milestones/deliverables and payment requests for project execution."""
import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from database import engine


async def upgrade():
    async with engine.begin() as conn:
        statements = [
            """
            ALTER TABLE project_documents
            ADD COLUMN IF NOT EXISTS milestone_id VARCHAR REFERENCES project_milestones(id) ON DELETE SET NULL
            """,
            """
            ALTER TABLE project_documents
            ADD COLUMN IF NOT EXISTS deliverable_id VARCHAR REFERENCES project_deliverables(id) ON DELETE SET NULL
            """,
            """
            CREATE TABLE IF NOT EXISTS project_payment_requests (
                id VARCHAR PRIMARY KEY,
                project_id VARCHAR NOT NULL REFERENCES research_projects(id) ON DELETE CASCADE,
                budget_line_id VARCHAR REFERENCES project_budget_lines(id) ON DELETE SET NULL,
                amount INTEGER NOT NULL,
                currency VARCHAR(10) DEFAULT 'KES',
                purpose VARCHAR(500) NOT NULL,
                justification TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                requested_by_id VARCHAR REFERENCES users(id),
                reviewed_by_id VARCHAR REFERENCES users(id),
                reviewed_at TIMESTAMPTZ,
                review_notes TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ
            )
            """,
            "CREATE INDEX IF NOT EXISTS idx_project_documents_milestone_id ON project_documents(milestone_id)",
            "CREATE INDEX IF NOT EXISTS idx_project_documents_deliverable_id ON project_documents(deliverable_id)",
            "CREATE INDEX IF NOT EXISTS idx_project_payment_requests_project_id ON project_payment_requests(project_id)",
        ]
        for stmt in statements:
            await conn.execute(text(stmt))
        print("Added project execution fields (document links + payment requests)")


if __name__ == "__main__":
    print("Running migration: add_project_execution_fields")
    asyncio.run(upgrade())
    print("Migration completed successfully!")
