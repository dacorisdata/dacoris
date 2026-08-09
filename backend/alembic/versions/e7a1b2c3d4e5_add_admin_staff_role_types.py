"""add admin staff role types

Revision ID: e7a1b2c3d4e5
Revises: a1b2c3d4e5f6
Create Date: 2026-08-09 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = "e7a1b2c3d4e5"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    for value in (
        "RESEARCHER",
        "ADMIN_STAFF",
        "DVC_RESEARCH",
        "DIRECTOR_RESEARCH",
        "RESEARCH_ADMINISTRATOR",
        "LIBRARIAN",
        "MOU_ADMIN",
        "LEGAL_OFFICER",
        "PARTNERSHIP_COORDINATOR",
        "EXTERNAL_PARTNER",
    ):
        op.execute(
            f"ALTER TYPE primaryaccounttype ADD VALUE IF NOT EXISTS '{value}'"
        )

    for value in (
        "dvc_research",
        "director_research",
        "librarian",
    ):
        op.execute(f"ALTER TYPE researchrole ADD VALUE IF NOT EXISTS '{value}'")


def downgrade() -> None:
    pass
