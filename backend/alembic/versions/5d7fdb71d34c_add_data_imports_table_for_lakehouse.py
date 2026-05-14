"""add_data_imports_table_for_lakehouse

Revision ID: 5d7fdb71d34c
Revises: 1a7e7ab085c6
Create Date: 2026-05-09 21:39:12.051588

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5d7fdb71d34c'
down_revision: Union[str, Sequence[str], None] = '1a7e7ab085c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create enum types
    op.execute("""
        CREATE TYPE dataimportstatus AS ENUM (
            'pending', 'queued', 'ingesting', 'ingested', 'failed'
        )
    """)
    
    op.execute("""
        CREATE TYPE datasourcetype AS ENUM (
            'url', 'file_upload', 'kobo_collect', 'google_sheets', 'excel', 'api_feed'
        )
    """)
    
    # Create data_imports table
    op.create_table(
        'data_imports',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('institution_id', sa.Integer(), sa.ForeignKey('institutions.id'), nullable=False),
        sa.Column('researcher_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('project_id', sa.Integer(), sa.ForeignKey('research_projects.id'), nullable=True),
        sa.Column('source_url', sa.Text(), nullable=True),
        sa.Column('source_type', sa.Enum('url', 'file_upload', 'kobo_collect', 'google_sheets', 'excel', 'api_feed', name='datasourcetype'), nullable=False),
        sa.Column('source_tag', sa.String(100), nullable=False),
        sa.Column('file_name', sa.String(255), nullable=True),
        sa.Column('file_format', sa.String(20), nullable=True),
        sa.Column('file_size_bytes', sa.Integer(), nullable=True),
        sa.Column('ingest_status', sa.Enum('pending', 'queued', 'ingesting', 'ingested', 'failed', name='dataimportstatus'), nullable=False, server_default='pending'),
        sa.Column('bronze_path', sa.Text(), nullable=True),
        sa.Column('bronze_bucket', sa.String(100), nullable=True),
        sa.Column('ingest_triggered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ingest_completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('record_count', sa.Integer(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.Column('priority', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('retry_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_retry_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('file_size_estimate', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now(), nullable=True)
    )
    
    # Create indexes
    op.create_index('idx_data_imports_institution', 'data_imports', ['institution_id'])
    op.create_index('idx_data_imports_researcher', 'data_imports', ['researcher_id'])
    op.create_index('idx_data_imports_project', 'data_imports', ['project_id'])
    op.create_index('idx_data_imports_status', 'data_imports', ['ingest_status'])
    op.create_index('idx_data_imports_created_at', 'data_imports', ['created_at'])
    op.create_index('idx_data_imports_priority_status', 'data_imports', ['priority', 'ingest_status', 'created_at'])


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes
    op.drop_index('idx_data_imports_priority_status', 'data_imports')
    op.drop_index('idx_data_imports_created_at', 'data_imports')
    op.drop_index('idx_data_imports_status', 'data_imports')
    op.drop_index('idx_data_imports_project', 'data_imports')
    op.drop_index('idx_data_imports_researcher', 'data_imports')
    op.drop_index('idx_data_imports_institution', 'data_imports')
    
    # Drop table
    op.drop_table('data_imports')
    
    # Drop enum types
    op.execute('DROP TYPE IF EXISTS dataimportstatus')
    op.execute('DROP TYPE IF EXISTS datasourcetype')
