"""Scope proposal assignment unique indexes to active rows only

Revision ID: l5m6n7o8p904
Revises: k4l5m6n7o803
Create Date: 2026-08-09
"""
from alembic import op

revision = "l5m6n7o8p904"
down_revision = "k4l5m6n7o803"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("DROP INDEX IF EXISTS uq_proposal_section_reviewer")
    op.execute("DROP INDEX IF EXISTS uq_proposal_stage_reviewer")

    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_proposal_section_reviewer
        ON proposal_stage_assignments (proposal_id, section_id, reviewer_id)
        WHERE section_id IS NOT NULL AND status = 'active'
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_proposal_stage_reviewer
        ON proposal_stage_assignments (proposal_id, stage_step, reviewer_id)
        WHERE section_id IS NULL AND status = 'active'
        """
    )


def downgrade():
    op.execute("DROP INDEX IF EXISTS uq_proposal_section_reviewer")
    op.execute("DROP INDEX IF EXISTS uq_proposal_stage_reviewer")

    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_proposal_section_reviewer
        ON proposal_stage_assignments (proposal_id, section_id, reviewer_id)
        WHERE section_id IS NOT NULL
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_proposal_stage_reviewer
        ON proposal_stage_assignments (proposal_id, stage_step, reviewer_id)
        WHERE section_id IS NULL
        """
    )
