"""add_data_import_versioning

Revision ID: b8c4e2f1a903
Revises: f5dfe49471f3
Create Date: 2026-06-08 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b8c4e2f1a903'
down_revision: Union[str, Sequence[str], None] = 'f5dfe49471f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('data_imports', sa.Column('dataset_key', sa.String(255), nullable=True))
    op.add_column('data_imports', sa.Column('version_number', sa.Integer(), nullable=False, server_default='1'))
    op.add_column('data_imports', sa.Column('is_current_version', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('data_imports', sa.Column('supersedes_id', sa.String(36), sa.ForeignKey('data_imports.id'), nullable=True))

    op.create_index('idx_data_imports_dataset_key', 'data_imports', ['dataset_key', 'researcher_id'])

    op.execute("""
        UPDATE data_imports SET
          dataset_key = researcher_id || ':' || source_tag || ':' || source_type::text || ':' || COALESCE(project_id, '')
    """)

    op.execute("""
        WITH ranked AS (
          SELECT id,
                 ROW_NUMBER() OVER (
                   PARTITION BY dataset_key, researcher_id ORDER BY created_at ASC
                 ) AS rn,
                 COUNT(*) OVER (PARTITION BY dataset_key, researcher_id) AS cnt
          FROM data_imports
        )
        UPDATE data_imports di SET
          version_number = ranked.rn,
          is_current_version = (ranked.rn = ranked.cnt)
        FROM ranked
        WHERE di.id = ranked.id
    """)


def downgrade() -> None:
    op.drop_index('idx_data_imports_dataset_key', table_name='data_imports')
    op.drop_column('data_imports', 'supersedes_id')
    op.drop_column('data_imports', 'is_current_version')
    op.drop_column('data_imports', 'version_number')
    op.drop_column('data_imports', 'dataset_key')
