"""merge_multiple_heads

Revision ID: 1a7e7ab085c6
Revises: a5a4a1fe7ebe, add_account_types_v1, add_is_curated_bookmarks, add_primary_admin_id
Create Date: 2026-05-09 21:39:05.377192

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1a7e7ab085c6'
down_revision: Union[str, Sequence[str], None] = ('a5a4a1fe7ebe', 'add_account_types_v1', 'add_is_curated_bookmarks', 'add_primary_admin_id')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
