"""Add uppercase proposal status enum values for SQLAlchemy compatibility

Revision ID: m6n7o8p9q005
Revises: l5m6n7o8p904
Create Date: 2026-08-09
"""
from alembic import op

revision = "m6n7o8p9q005"
down_revision = "l5m6n7o8p904"
branch_labels = None
depends_on = None


def upgrade():
    # SQLAlchemy sends enum member names (APPROVED); legacy rows use uppercase too.
    for value in ("APPROVED", "APPLYING", "FUNDING_UNSUCCESSFUL"):
        op.execute(f"ALTER TYPE proposalstatus ADD VALUE IF NOT EXISTS '{value}'")


def downgrade():
    pass
