"""add primary_admin_id to institutions

Revision ID: add_primary_admin_id
Revises: 9f11c4ed00f4
Create Date: 2026-04-30 12:36:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_primary_admin_id'
down_revision = '9f11c4ed00f4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add primary_admin_id column to institutions table
    op.add_column('institutions', sa.Column('primary_admin_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_institutions_primary_admin_id', 'institutions', 'users', ['primary_admin_id'], ['id'])


def downgrade() -> None:
    # Remove the foreign key and column
    op.drop_constraint('fk_institutions_primary_admin_id', 'institutions', type_='foreignkey')
    op.drop_column('institutions', 'primary_admin_id')
