"""add institution logo_filename

Revision ID: n7o8p9q0r106
Revises: m6n7o8p9q005
Create Date: 2026-09-08 23:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "n7o8p9q0r106"
down_revision: Union[str, Sequence[str], None] = "m6n7o8p9q005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("institutions", sa.Column("logo_filename", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("institutions", "logo_filename")
