"""Fix proposal stage assignment unique constraints for stage vs section mode

Revision ID: k4l5m6n7o803
Revises: j3k4l5m6n702
Create Date: 2026-08-09
"""
from alembic import op

revision = "k4l5m6n7o803"
down_revision = "j3k4l5m6n702"
branch_labels = None
depends_on = None


def upgrade():
    # Drop the overly broad constraint that blocks multiple stage assignments
    # when section_id is NULL (legacy stage-step mode).
    op.execute(
        "ALTER TABLE proposal_stage_assignments "
        "DROP CONSTRAINT IF EXISTS uq_proposal_section_reviewer"
    )
    op.execute(
        "DROP INDEX IF EXISTS uq_proposal_section_reviewer"
    )

    # Section-based: one reviewer per section
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_proposal_section_reviewer
        ON proposal_stage_assignments (proposal_id, section_id, reviewer_id)
        WHERE section_id IS NOT NULL
        """
    )

    # Stage-step mode: one reviewer per stage (section_id IS NULL)
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_proposal_stage_reviewer
        ON proposal_stage_assignments (proposal_id, stage_step, reviewer_id)
        WHERE section_id IS NULL
        """
    )


def downgrade():
    op.execute("DROP INDEX IF EXISTS uq_proposal_stage_reviewer")
    op.execute("DROP INDEX IF EXISTS uq_proposal_section_reviewer")
    op.create_unique_constraint(
        "uq_proposal_section_reviewer",
        "proposal_stage_assignments",
        ["proposal_id", "section_id", "reviewer_id"],
    )
