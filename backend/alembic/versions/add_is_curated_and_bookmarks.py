"""add is_curated and bookmarks

Revision ID: add_is_curated_bookmarks
Revises: 
Create Date: 2026-04-17

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_is_curated_bookmarks'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add is_curated column to grant_opportunities
    op.add_column('grant_opportunities', 
        sa.Column('is_curated', sa.Boolean(), nullable=False, server_default='false')
    )
    op.create_index('ix_grant_opportunities_is_curated', 'grant_opportunities', ['is_curated'])
    
    # Create opportunity_bookmarks table
    op.create_table('opportunity_bookmarks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('opportunity_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['opportunity_id'], ['grant_opportunities.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('opportunity_id', 'user_id', name='unique_user_opportunity_bookmark')
    )
    op.create_index('ix_opportunity_bookmarks_id', 'opportunity_bookmarks', ['id'])


def downgrade():
    # Drop opportunity_bookmarks table
    op.drop_index('ix_opportunity_bookmarks_id', table_name='opportunity_bookmarks')
    op.drop_table('opportunity_bookmarks')
    
    # Remove is_curated column
    op.drop_index('ix_grant_opportunities_is_curated', table_name='grant_opportunities')
    op.drop_column('grant_opportunities', 'is_curated')
