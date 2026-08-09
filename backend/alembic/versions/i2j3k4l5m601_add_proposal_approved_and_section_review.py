"""Add approved/applying statuses and section-based reviewer assignments

Revision ID: i2j3k4l5m601
Revises: h1d5e6f7a802
Create Date: 2026-08-09
"""
from alembic import op
import sqlalchemy as sa

revision = "i2j3k4l5m601"
down_revision = "h1d5e6f7a802"
branch_labels = None
depends_on = None


def upgrade():
    # Extend proposal status enum (Postgres stores enum member names; app uses lowercase values)
    for value in ("approved", "applying", "funding_unsuccessful"):
        op.execute(f"ALTER TYPE proposalstatus ADD VALUE IF NOT EXISTS '{value}'")

    op.add_column(
        "proposal_stage_assignments",
        sa.Column("section_id", sa.String(), sa.ForeignKey("proposal_sections.id"), nullable=True),
    )
    op.add_column(
        "proposal_reviews",
        sa.Column("section_id", sa.String(), sa.ForeignKey("proposal_sections.id"), nullable=True),
    )

    # Allow same reviewer on different sections concurrently
    op.drop_constraint("uq_proposal_stage_reviewer", "proposal_stage_assignments", type_="unique")
    op.create_unique_constraint(
        "uq_proposal_section_reviewer",
        "proposal_stage_assignments",
        ["proposal_id", "section_id", "reviewer_id"],
    )


def downgrade():
    op.drop_constraint("uq_proposal_section_reviewer", "proposal_stage_assignments", type_="unique")
    op.create_unique_constraint(
        "uq_proposal_stage_reviewer",
        "proposal_stage_assignments",
        ["proposal_id", "stage_step", "reviewer_id"],
    )
    op.drop_column("proposal_reviews", "section_id")
    op.drop_column("proposal_stage_assignments", "section_id")
