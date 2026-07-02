"""add postgraduate module schema

Revision ID: d4e8f2a1b901
Revises: c9d5e3a2b104
Create Date: 2026-07-02 05:20:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = "d4e8f2a1b901"
down_revision: Union[str, Sequence[str], None] = "c9d5e3a2b104"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PG_TABLES = (
    "pg_student_profiles",
    "pg_staff_profiles",
    "pg_stage_definitions",
    "pg_student_stage_status",
    "pg_requirement_packs",
    "pg_requirement_items",
    "pg_supervisor_reports",
    "pg_progress_reports",
    "pg_proposal_records",
    "pg_defense_records",
    "pg_intervention_cases",
    "pg_supervisor_assignments",
    "pg_graduation_clearance",
    "pg_audit_log",
)


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_id VARCHAR(50)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_staff_id ON users (staff_id)")

    for value in (
        "POSTGRADUATE_STUDENT",
        "SUPERVISOR",
        "EXTERNAL_SUPERVISOR",
        "PG_COORDINATOR",
        "HEAD_OF_PG_STUDIES",
    ):
        op.execute(
            f"ALTER TYPE primaryaccounttype ADD VALUE IF NOT EXISTS '{value}'"
        )

    for value in (
        "postgraduate_student",
        "supervisor",
        "external_supervisor",
        "pg_coordinator",
        "head_of_pg_studies",
    ):
        op.execute(f"ALTER TYPE researchrole ADD VALUE IF NOT EXISTS '{value}'")

    bind = op.get_bind()

    from models import Base

    tables = [
        Base.metadata.tables[name]
        for name in PG_TABLES
        if name in Base.metadata.tables
    ]
    if tables:
        Base.metadata.create_all(bind, tables=tables)


def downgrade() -> None:
    for table in reversed(PG_TABLES):
        op.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS staff_id")
