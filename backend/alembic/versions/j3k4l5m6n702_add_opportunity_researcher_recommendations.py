"""add opportunity researcher recommendations

Revision ID: j3k4l5m6n702
Revises: i2j3k4l5m601
Create Date: 2026-08-09
"""
from alembic import op
import sqlalchemy as sa

revision = "j3k4l5m6n702"
down_revision = "i2j3k4l5m601"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "opportunity_researcher_recommendations",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("opportunity_id", sa.String(), nullable=False),
        sa.Column("researcher_id", sa.String(), nullable=False),
        sa.Column("recommended_by_id", sa.String(), nullable=False),
        sa.Column("institution_id", sa.String(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["opportunity_id"], ["grant_opportunities.id"]),
        sa.ForeignKeyConstraint(["researcher_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["recommended_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["institution_id"], ["institutions.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "opportunity_id", "researcher_id",
            name="unique_opportunity_researcher_recommendation",
        ),
    )
    op.create_index(
        "ix_opportunity_researcher_recommendations_opportunity_id",
        "opportunity_researcher_recommendations",
        ["opportunity_id"],
    )
    op.create_index(
        "ix_opportunity_researcher_recommendations_researcher_id",
        "opportunity_researcher_recommendations",
        ["researcher_id"],
    )
    op.create_index(
        "ix_opportunity_researcher_recommendations_institution_id",
        "opportunity_researcher_recommendations",
        ["institution_id"],
    )


def downgrade():
    op.drop_index("ix_opportunity_researcher_recommendations_institution_id", table_name="opportunity_researcher_recommendations")
    op.drop_index("ix_opportunity_researcher_recommendations_researcher_id", table_name="opportunity_researcher_recommendations")
    op.drop_index("ix_opportunity_researcher_recommendations_opportunity_id", table_name="opportunity_researcher_recommendations")
    op.drop_table("opportunity_researcher_recommendations")
