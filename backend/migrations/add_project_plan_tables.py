"""Add project teams and deliverables for project plan step."""
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
            CREATE TABLE IF NOT EXISTS project_teams (
                id VARCHAR PRIMARY KEY,
                project_id VARCHAR NOT NULL REFERENCES research_projects(id) ON DELETE CASCADE,
                name VARCHAR(200) NOT NULL,
                created_by_id VARCHAR REFERENCES users(id),
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS project_team_members (
                id VARCHAR PRIMARY KEY,
                team_id VARCHAR NOT NULL REFERENCES project_teams(id) ON DELETE CASCADE,
                user_id VARCHAR REFERENCES users(id),
                project_member_id VARCHAR REFERENCES project_members(id),
                display_name VARCHAR(200) NOT NULL,
                role_label VARCHAR(100)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS project_deliverables (
                id VARCHAR PRIMARY KEY,
                project_id VARCHAR NOT NULL REFERENCES research_projects(id) ON DELETE CASCADE,
                name VARCHAR(500) NOT NULL,
                deliverable_type VARCHAR(100),
                description TEXT,
                due_date TIMESTAMPTZ,
                status VARCHAR(50) DEFAULT 'pending',
                milestone_id VARCHAR REFERENCES project_milestones(id) ON DELETE SET NULL,
                assignee_kind VARCHAR(20),
                assignee_user_id VARCHAR REFERENCES users(id),
                assignee_member_id VARCHAR REFERENCES project_members(id),
                assignee_team_id VARCHAR REFERENCES project_teams(id),
                responsible_label VARCHAR(500),
                item_order INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
            """,
            "CREATE INDEX IF NOT EXISTS idx_project_teams_project_id ON project_teams(project_id)",
            "CREATE INDEX IF NOT EXISTS idx_project_deliverables_project_id ON project_deliverables(project_id)",
        ]
        for stmt in statements:
            await conn.execute(text(stmt))
        print("Added project plan tables (teams, team members, deliverables)")


if __name__ == "__main__":
    print("Running migration: add_project_plan_tables")
    asyncio.run(upgrade())
    print("Migration completed successfully!")
