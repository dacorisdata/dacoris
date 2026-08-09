"""add invite_due_at to proposal_collaborators

Revision ID: h1d5e6f7a802
Revises: g9c4d5e6f701
Create Date: 2026-08-09 16:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "h1d5e6f7a802"
down_revision: Union[str, Sequence[str], None] = "g9c4d5e6f701"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "proposal_collaborators",
        sa.Column("invite_due_at", sa.DateTime(timezone=True), nullable=True),
    )
    # Backfill: due 7 days after invite for pending rows
    op.execute(
        """
        UPDATE proposal_collaborators
        SET invite_due_at = COALESCE(invited_at, NOW()) + INTERVAL '7 days'
        WHERE invite_due_at IS NULL
          AND LOWER(COALESCE(status, 'pending')) = 'pending'
        """
    )


def downgrade() -> None:
    op.drop_column("proposal_collaborators", "invite_due_at")
