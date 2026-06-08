"""repair_data_import_versioning

Revision ID: c9d5e3a2b104
Revises: b8c4e2f1a903
Create Date: 2026-06-08 18:00:00.000000

Re-number import versions by series (researcher + source_tag + source_type + project)
ordered by created_at, and mark only the newest as current.
"""
from typing import Sequence, Union

from alembic import op


revision: str = 'c9d5e3a2b104'
down_revision: Union[str, Sequence[str], None] = 'b8c4e2f1a903'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        WITH series AS (
          SELECT
            id,
            researcher_id,
            source_tag,
            lower(source_type::text) AS st,
            COALESCE(project_id, '') AS pid,
            created_at,
            ROW_NUMBER() OVER (
              PARTITION BY researcher_id, source_tag, lower(source_type::text), COALESCE(project_id, '')
              ORDER BY created_at ASC
            ) AS vn,
            COUNT(*) OVER (
              PARTITION BY researcher_id, source_tag, lower(source_type::text), COALESCE(project_id, '')
            ) AS cnt
          FROM data_imports
        )
        UPDATE data_imports di SET
          version_number = series.vn,
          is_current_version = (series.vn = series.cnt),
          dataset_key = series.researcher_id || ':' || series.source_tag || ':' || series.st || ':' || series.pid
        FROM series
        WHERE di.id = series.id
    """)


def downgrade() -> None:
    pass
