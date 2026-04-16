"""add account types and user fields

Revision ID: add_account_types_v1
Revises: 9f11c4ed00f4
Create Date: 2026-03-17 15:55:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_account_types_v1'
down_revision = '9f11c4ed00f4'
branch_labels = None
depends_on = None


def upgrade():
    # Create PrimaryAccountType enum
    primary_account_type_enum = postgresql.ENUM(
        'researcher', 'grant_manager', 'finance_officer', 
        'ethics_committee_member', 'data_steward', 'data_engineer',
        'institutional_leadership', 'external_reviewer', 
        'guest_collaborator', 'external_funder',
        name='primaryaccounttype'
    )
    primary_account_type_enum.create(op.get_bind())
    
    # Update ResearchRole enum with new values
    op.execute("ALTER TYPE researchrole ADD VALUE IF NOT EXISTS 'researcher'")
    op.execute("ALTER TYPE researchrole ADD VALUE IF NOT EXISTS 'co_investigator'")
    op.execute("ALTER TYPE researchrole ADD VALUE IF NOT EXISTS 'research_admin'")
    op.execute("ALTER TYPE researchrole ADD VALUE IF NOT EXISTS 'finance_officer'")
    op.execute("ALTER TYPE researchrole ADD VALUE IF NOT EXISTS 'ethics_chair'")
    op.execute("ALTER TYPE researchrole ADD VALUE IF NOT EXISTS 'external_reviewer'")
    op.execute("ALTER TYPE researchrole ADD VALUE IF NOT EXISTS 'guest_collaborator'")
    op.execute("ALTER TYPE researchrole ADD VALUE IF NOT EXISTS 'external_funder'")
    op.execute("ALTER TYPE researchrole ADD VALUE IF NOT EXISTS 'applicant'")
    
    # Add new columns to users table
    op.add_column('users', sa.Column('primary_account_type', 
                                      sa.Enum('researcher', 'grant_manager', 'finance_officer', 
                                              'ethics_committee_member', 'data_steward', 'data_engineer',
                                              'institutional_leadership', 'external_reviewer', 
                                              'guest_collaborator', 'external_funder',
                                              name='primaryaccounttype'), 
                                      nullable=True))
    op.add_column('users', sa.Column('department', sa.String(length=200), nullable=True))
    op.add_column('users', sa.Column('job_title', sa.String(length=200), nullable=True))
    op.add_column('users', sa.Column('phone', sa.String(length=50), nullable=True))
    op.add_column('users', sa.Column('expertise_keywords', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('is_guest', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('access_expires_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('invited_by_id', sa.Integer(), nullable=True))
    op.add_column('users', sa.Column('invitation_context', sa.Text(), nullable=True))
    
    # Add foreign key constraint for invited_by_id
    op.create_foreign_key('fk_users_invited_by', 'users', 'users', ['invited_by_id'], ['id'])


def downgrade():
    # Remove foreign key constraint
    op.drop_constraint('fk_users_invited_by', 'users', type_='foreignkey')
    
    # Remove columns
    op.drop_column('users', 'invitation_context')
    op.drop_column('users', 'invited_by_id')
    op.drop_column('users', 'access_expires_at')
    op.drop_column('users', 'is_guest')
    op.drop_column('users', 'expertise_keywords')
    op.drop_column('users', 'phone')
    op.drop_column('users', 'job_title')
    op.drop_column('users', 'department')
    op.drop_column('users', 'primary_account_type')
    
    # Drop PrimaryAccountType enum
    op.execute('DROP TYPE primaryaccounttype')
