"""add uppercase research role labels for new leadership roles

Revision ID: f8b2c3d4e5f6
Revises: e7a1b2c3d4e5
Create Date: 2026-08-09 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = "f8b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "e7a1b2c3d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    for value in ("DVC_RESEARCH", "DIRECTOR_RESEARCH", "LIBRARIAN"):
        op.execute(
            f"ALTER TYPE researchrole ADD VALUE IF NOT EXISTS '{value}'"
        )


def downgrade() -> None:
    pass
