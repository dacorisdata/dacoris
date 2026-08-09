"""add departments table

Revision ID: g9c4d5e6f701
Revises: f8b2c3d4e5f6
Create Date: 2026-08-09 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "g9c4d5e6f701"
down_revision: Union[str, Sequence[str], None] = "f8b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    institution_type_enum = postgresql.ENUM(
        "university",
        "hospital",
        "research_institute",
        "government",
        "ngo",
        "industry",
        "funder",
        "international_org",
        "other",
        name="institutiontype",
        create_type=False,
    )

    op.create_table(
        "departments",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("institution_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("institution_type", institution_type_enum, nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["institution_id"], ["institutions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("institution_id", "name", name="unique_department_name_per_institution"),
    )
    op.create_index("ix_departments_institution_id", "departments", ["institution_id"])


def downgrade() -> None:
    op.drop_index("ix_departments_institution_id", table_name="departments")
    op.drop_table("departments")
