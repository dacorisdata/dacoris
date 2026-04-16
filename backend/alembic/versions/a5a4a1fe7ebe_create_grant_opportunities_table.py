"""create_grant_opportunities_table

Revision ID: a5a4a1fe7ebe
Revises: add_account_types_v1
Create Date: 2026-04-08 21:11:18.102329

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a5a4a1fe7ebe'
down_revision: Union[str, Sequence[str], None] = '9f11c4ed00f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add missing columns to existing grant_opportunities table
    op.add_column('grant_opportunities', sa.Column('eligibility', sa.Text(), nullable=True))
    op.add_column('grant_opportunities', sa.Column('criteria', sa.Text(), nullable=True))
    op.add_column('grant_opportunities', sa.Column('application_url', sa.String(length=500), nullable=True))
    op.add_column('grant_opportunities', sa.Column('contact_email', sa.String(length=200), nullable=True))
    
    # Change amount columns from Integer to Float
    op.alter_column('grant_opportunities', 'amount_min',
               existing_type=sa.INTEGER(),
               type_=sa.Float(),
               existing_nullable=True)
    op.alter_column('grant_opportunities', 'amount_max',
               existing_type=sa.INTEGER(),
               type_=sa.Float(),
               existing_nullable=True)
    
    # Change deadline from DateTime to Date
    op.alter_column('grant_opportunities', 'deadline',
               existing_type=sa.DateTime(timezone=True),
               type_=sa.Date(),
               existing_nullable=True)
    
    # Make institution_id nullable
    op.alter_column('grant_opportunities', 'institution_id',
               existing_type=sa.INTEGER(),
               nullable=True)
    
    # Make created_by_id not nullable
    op.alter_column('grant_opportunities', 'created_by_id',
               existing_type=sa.INTEGER(),
               nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('grant_opportunities', 'created_by_id',
               existing_type=sa.INTEGER(),
               nullable=True)
    op.alter_column('grant_opportunities', 'institution_id',
               existing_type=sa.INTEGER(),
               nullable=False)
    op.alter_column('grant_opportunities', 'deadline',
               existing_type=sa.Date(),
               type_=sa.DateTime(timezone=True),
               existing_nullable=True)
    op.alter_column('grant_opportunities', 'amount_max',
               existing_type=sa.Float(),
               type_=sa.INTEGER(),
               existing_nullable=True)
    op.alter_column('grant_opportunities', 'amount_min',
               existing_type=sa.Float(),
               type_=sa.INTEGER(),
               existing_nullable=True)
    op.drop_column('grant_opportunities', 'contact_email')
    op.drop_column('grant_opportunities', 'application_url')
    op.drop_column('grant_opportunities', 'criteria')
    op.drop_column('grant_opportunities', 'eligibility')
