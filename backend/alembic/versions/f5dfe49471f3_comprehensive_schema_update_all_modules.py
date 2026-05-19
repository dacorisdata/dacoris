"""comprehensive_schema_update_all_modules

Revision ID: f5dfe49471f3
Revises: 5d7fdb71d34c
Create Date: 2026-05-19 18:18:13.728370

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f5dfe49471f3'
down_revision: Union[str, Sequence[str], None] = '5d7fdb71d34c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - comprehensive update for all modules."""
    
    # Create enum types if they don't exist
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE moutype AS ENUM (
                'GENERAL_COLLABORATION', 'ACADEMIC_EXCHANGE', 'RESEARCH_PARTNERSHIP',
                'DATA_SHARING', 'JOINT_DEGREE', 'CLINICAL', 'INDUSTRY', 'CONSORTIUM', 'CO_FUNDING'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE moustatus AS ENUM (
                'DRAFT', 'INTERNAL_REVIEW', 'LEGAL_REVIEW', 'EXEC_APPROVAL',
                'PENDING_SIGNING', 'ACTIVE', 'MID_TERM_REVIEW', 'PENDING_RENEWAL',
                'SUSPENDED', 'EXPIRED', 'CLOSED', 'ARCHIVED'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE mouconfidentiality AS ENUM ('PUBLIC', 'INTERNAL', 'RESTRICTED', 'CONFIDENTIAL');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE mouriskrating AS ENUM ('LOW', 'MEDIUM', 'HIGH');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE moupartnertype AS ENUM (
                'UNIVERSITY', 'RESEARCH_INSTITUTE', 'GOVERNMENT', 'NGO',
                'HOSPITAL', 'INDUSTRY', 'FUNDER', 'INTERNATIONAL_ORG'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE moupartnertier AS ENUM ('STRATEGIC', 'ACTIVE', 'DORMANT');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE mouparticipantrole AS ENUM ('LEAD', 'CO_SIGNATORY', 'BENEFICIARY', 'OBSERVER');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE mouapprovalstagetype AS ENUM ('INTERNAL_REVIEW', 'LEGAL_REVIEW', 'EXEC_APPROVAL', 'SIGNING');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE mouapprovalstagestatus AS ENUM ('PENDING', 'IN_PROGRESS', 'APPROVED', 'RETURNED', 'SKIPPED');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE mouactivitytype AS ENUM (
                'JOINT_TRAINING', 'RESEARCH_PROJECT', 'STUDENT_EXCHANGE', 'PUBLICATION',
                'GRANT_APPLICATION', 'TECHNOLOGY_TRANSFER', 'POLICY_BRIEF', 'EVENT_WORKSHOP',
                'CONSULTANCY', 'EQUIPMENT_SHARING', 'OTHER'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE mouactivitystatus AS ENUM (
                'PLANNED', 'IN_PROGRESS', 'DELAYED', 'EVIDENCE_SUBMITTED', 'VERIFIED', 'COMPLETED', 'CANCELLED'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE mouversiontype AS ENUM ('ORIGINAL', 'AMENDMENT', 'RENEWAL', 'ADDENDUM');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE moucommunicationtype AS ENUM ('EMAIL', 'MEETING', 'CALL', 'SITE_VISIT', 'REPORT', 'OTHER');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE moubudgetstatus AS ENUM ('DRAFT', 'APPROVED', 'ACTIVE', 'CLOSED');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE moucompliancestatus AS ENUM ('PENDING', 'COMPLIANT', 'NON_COMPLIANT', 'WAIVED');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Create MoU Partners table
    op.execute("""
        CREATE TABLE IF NOT EXISTS mou_partners (
            id VARCHAR PRIMARY KEY,
            institution_id VARCHAR NOT NULL REFERENCES institutions(id),
            organisation_name VARCHAR(300) NOT NULL,
            organisation_type moupartnertype,
            country VARCHAR(5),
            region VARCHAR(100),
            city VARCHAR(100),
            website VARCHAR(300),
            accreditation_status VARCHAR(100),
            partnership_tier moupartnertier DEFAULT 'ACTIVE',
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE
        );
        CREATE INDEX IF NOT EXISTS ix_mou_partners_id ON mou_partners(id);
        CREATE INDEX IF NOT EXISTS ix_mou_partners_institution_id ON mou_partners(institution_id);
    """)
    
    # Create MoUs table
    op.execute("""
        CREATE TABLE IF NOT EXISTS mous (
            id VARCHAR PRIMARY KEY,
            institution_id VARCHAR NOT NULL REFERENCES institutions(id),
            mou_number VARCHAR(50) UNIQUE,
            title VARCHAR(500) NOT NULL,
            mou_type moutype NOT NULL,
            status moustatus NOT NULL DEFAULT 'DRAFT',
            thematic_area TEXT,
            lead_department VARCHAR(200),
            coordinator_id VARCHAR REFERENCES users(id),
            legal_officer_id VARCHAR REFERENCES users(id),
            scope_objectives TEXT,
            obligations_institution TEXT,
            obligations_partner TEXT,
            governing_law VARCHAR(100),
            confidentiality_level mouconfidentiality DEFAULT 'INTERNAL',
            effective_date DATE,
            expiry_date DATE,
            signed_date DATE,
            duration_years FLOAT,
            auto_renew BOOLEAN DEFAULT FALSE,
            renewal_notice_days INTEGER DEFAULT 90,
            risk_rating mouriskrating,
            financial_commitment BOOLEAN DEFAULT FALSE,
            ip_clauses BOOLEAN DEFAULT FALSE,
            data_sharing BOOLEAN DEFAULT FALSE,
            parent_mou_id VARCHAR REFERENCES mous(id),
            created_by_id VARCHAR NOT NULL REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE
        );
        CREATE INDEX IF NOT EXISTS ix_mous_id ON mous(id);
        CREATE INDEX IF NOT EXISTS ix_mous_institution_id ON mous(institution_id);
        CREATE INDEX IF NOT EXISTS ix_mous_status ON mous(status);
    """)
    
    # Create MoU Partner Contacts table
    op.execute("""
        CREATE TABLE IF NOT EXISTS mou_partner_contacts (
            id VARCHAR PRIMARY KEY,
            partner_id VARCHAR NOT NULL REFERENCES mou_partners(id),
            mou_id VARCHAR REFERENCES mous(id),
            full_name VARCHAR(200) NOT NULL,
            title VARCHAR(100),
            email VARCHAR(200),
            phone VARCHAR(50),
            orcid_id VARCHAR(100),
            is_primary BOOLEAN DEFAULT FALSE,
            role_at_partner VARCHAR(200)
        );
        CREATE INDEX IF NOT EXISTS ix_mou_partner_contacts_id ON mou_partner_contacts(id);
        CREATE INDEX IF NOT EXISTS ix_mou_partner_contacts_partner_id ON mou_partner_contacts(partner_id);
    """)
    
    # Create MoU Participants table
    op.execute("""
        CREATE TABLE IF NOT EXISTS mou_participants (
            id VARCHAR PRIMARY KEY,
            mou_id VARCHAR NOT NULL REFERENCES mous(id),
            partner_id VARCHAR NOT NULL REFERENCES mou_partners(id),
            role mouparticipantrole DEFAULT 'CO_SIGNATORY',
            signatory_name VARCHAR(200),
            signatory_title VARCHAR(200),
            signed_date DATE
        );
        CREATE INDEX IF NOT EXISTS ix_mou_participants_id ON mou_participants(id);
        CREATE INDEX IF NOT EXISTS ix_mou_participants_mou_id ON mou_participants(mou_id);
    """)
    
    # Create MoU Communications table
    op.execute("""
        CREATE TABLE IF NOT EXISTS mou_communications (
            id VARCHAR PRIMARY KEY,
            mou_id VARCHAR NOT NULL REFERENCES mous(id),
            partner_id VARCHAR REFERENCES mou_partners(id),
            communication_type moucommunicationtype DEFAULT 'OTHER',
            date DATE,
            summary TEXT,
            outcome TEXT,
            next_action TEXT,
            logged_by_id VARCHAR REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS ix_mou_communications_id ON mou_communications(id);
        CREATE INDEX IF NOT EXISTS ix_mou_communications_mou_id ON mou_communications(mou_id);
    """)
    
    # Create MoU Approval Stages table
    op.execute("""
        CREATE TABLE IF NOT EXISTS mou_approval_stages (
            id VARCHAR PRIMARY KEY,
            mou_id VARCHAR NOT NULL REFERENCES mous(id),
            stage_type mouapprovalstagetype NOT NULL,
            stage_order INTEGER NOT NULL DEFAULT 1,
            assigned_to_id VARCHAR REFERENCES users(id),
            status mouapprovalstagestatus DEFAULT 'PENDING',
            comments TEXT,
            decided_at TIMESTAMP WITH TIME ZONE,
            decided_by_id VARCHAR REFERENCES users(id),
            sla_days INTEGER,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS ix_mou_approval_stages_id ON mou_approval_stages(id);
        CREATE INDEX IF NOT EXISTS ix_mou_approval_stages_mou_id ON mou_approval_stages(mou_id);
    """)
    
    # Create MoU Activities table
    op.execute("""
        CREATE TABLE IF NOT EXISTS mou_activities (
            id VARCHAR PRIMARY KEY,
            mou_id VARCHAR NOT NULL REFERENCES mous(id),
            title VARCHAR(300) NOT NULL,
            description TEXT,
            activity_type mouactivitytype DEFAULT 'OTHER',
            assigned_to_id VARCHAR REFERENCES users(id),
            planned_start_date DATE,
            planned_end_date DATE,
            status mouactivitystatus DEFAULT 'PLANNED',
            completion_percentage INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE
        );
        CREATE INDEX IF NOT EXISTS ix_mou_activities_id ON mou_activities(id);
        CREATE INDEX IF NOT EXISTS ix_mou_activities_mou_id ON mou_activities(mou_id);
    """)
    
    # Create MoU Versions table
    op.execute("""
        CREATE TABLE IF NOT EXISTS mou_versions (
            id VARCHAR PRIMARY KEY,
            mou_id VARCHAR NOT NULL REFERENCES mous(id),
            version_number INTEGER NOT NULL DEFAULT 1,
            document_path VARCHAR(500),
            document_checksum VARCHAR(64),
            version_type mouversiontype DEFAULT 'ORIGINAL',
            change_summary TEXT,
            uploaded_by_id VARCHAR REFERENCES users(id),
            uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS ix_mou_versions_id ON mou_versions(id);
        CREATE INDEX IF NOT EXISTS ix_mou_versions_mou_id ON mou_versions(mou_id);
    """)
    
    # Create MoU Budgets table
    op.execute("""
        CREATE TABLE IF NOT EXISTS mou_budgets (
            id VARCHAR PRIMARY KEY,
            mou_id VARCHAR NOT NULL REFERENCES mous(id),
            description TEXT,
            currency VARCHAR(3) DEFAULT 'KES',
            committed_by_institution FLOAT DEFAULT 0,
            committed_by_partner FLOAT DEFAULT 0,
            total_budget FLOAT DEFAULT 0,
            status moubudgetstatus DEFAULT 'DRAFT',
            approved_by_id VARCHAR REFERENCES users(id),
            approved_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS ix_mou_budgets_id ON mou_budgets(id);
        CREATE INDEX IF NOT EXISTS ix_mou_budgets_mou_id ON mou_budgets(mou_id);
    """)
    
    # Create MoU Compliance Items table
    op.execute("""
        CREATE TABLE IF NOT EXISTS mou_compliance_items (
            id VARCHAR PRIMARY KEY,
            mou_id VARCHAR NOT NULL REFERENCES mous(id),
            check_type VARCHAR(200) NOT NULL,
            required BOOLEAN DEFAULT TRUE,
            status moucompliancestatus DEFAULT 'PENDING',
            notes TEXT,
            verified_by_id VARCHAR REFERENCES users(id),
            verified_at TIMESTAMP WITH TIME ZONE
        );
        CREATE INDEX IF NOT EXISTS ix_mou_compliance_items_id ON mou_compliance_items(id);
        CREATE INDEX IF NOT EXISTS ix_mou_compliance_items_mou_id ON mou_compliance_items(mou_id);
    """)
    
    # Create Publication Libraries table (if not exists)
    op.execute("""
        CREATE TABLE IF NOT EXISTS publication_libraries (
            id VARCHAR PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            user_id VARCHAR NOT NULL REFERENCES users(id),
            parent_id VARCHAR REFERENCES publication_libraries(id),
            is_folder BOOLEAN DEFAULT FALSE,
            is_default BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE
        );
        CREATE INDEX IF NOT EXISTS ix_publication_libraries_id ON publication_libraries(id);
    """)
    
    # Create Publications table (if not exists)
    op.execute("""
        CREATE TABLE IF NOT EXISTS publications (
            id VARCHAR PRIMARY KEY,
            library_id VARCHAR NOT NULL REFERENCES publication_libraries(id),
            title TEXT NOT NULL,
            authors TEXT NOT NULL,
            journal VARCHAR(500),
            year INTEGER,
            doi VARCHAR(255),
            pmid VARCHAR(50),
            source VARCHAR(50),
            source_id VARCHAR(255),
            abstract TEXT,
            publication_type VARCHAR(100),
            language VARCHAR(50),
            country VARCHAR(100),
            keywords TEXT,
            citation_count INTEGER DEFAULT 0,
            starred BOOLEAN DEFAULT FALSE,
            tags TEXT,
            notes TEXT,
            ai_summary TEXT,
            ai_summary_generated_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE
        );
        CREATE INDEX IF NOT EXISTS ix_publications_id ON publications(id);
        CREATE INDEX IF NOT EXISTS ix_publications_doi ON publications(doi);
        CREATE INDEX IF NOT EXISTS ix_publications_pmid ON publications(pmid);
    """)
    
    # Create Manuscripts table (if not exists)
    op.execute("""
        CREATE TABLE IF NOT EXISTS manuscripts (
            id VARCHAR PRIMARY KEY,
            title VARCHAR(500) NOT NULL,
            short_description TEXT,
            department VARCHAR(255),
            keywords TEXT,
            user_id VARCHAR NOT NULL REFERENCES users(id),
            content TEXT,
            abstract TEXT,
            status VARCHAR(50) DEFAULT 'draft',
            version INTEGER DEFAULT 1,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE
        );
        CREATE INDEX IF NOT EXISTS ix_manuscripts_id ON manuscripts(id);
    """)
    
    # Create Manuscript Co-Authors table (if not exists)
    op.execute("""
        CREATE TABLE IF NOT EXISTS manuscript_co_authors (
            id VARCHAR PRIMARY KEY,
            manuscript_id VARCHAR NOT NULL REFERENCES manuscripts(id),
            given_name VARCHAR(255) NOT NULL,
            family_name VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            orcid VARCHAR(50),
            role VARCHAR(50) DEFAULT 'author',
            status VARCHAR(50) DEFAULT 'invited',
            invited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            responded_at TIMESTAMP WITH TIME ZONE,
            author_order INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS ix_manuscript_co_authors_id ON manuscript_co_authors(id);
    """)
    
    # Create Data Sources table (if not exists)
    op.execute("""
        CREATE TABLE IF NOT EXISTS data_sources (
            id VARCHAR PRIMARY KEY,
            institution_id VARCHAR NOT NULL REFERENCES institutions(id),
            researcher_id VARCHAR NOT NULL REFERENCES users(id),
            name VARCHAR(255) NOT NULL,
            source_type VARCHAR(50) NOT NULL,
            url TEXT,
            api_key TEXT,
            asset_uid VARCHAR(100),
            description TEXT,
            is_active BOOLEAN DEFAULT TRUE NOT NULL,
            record_count INTEGER,
            last_sync TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE
        );
        CREATE INDEX IF NOT EXISTS ix_data_sources_institution_id ON data_sources(institution_id);
        CREATE INDEX IF NOT EXISTS ix_data_sources_researcher_id ON data_sources(researcher_id);
        CREATE INDEX IF NOT EXISTS ix_data_sources_created_at ON data_sources(created_at);
    """)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop tables in reverse order
    op.execute("DROP TABLE IF EXISTS mou_compliance_items CASCADE")
    op.execute("DROP TABLE IF EXISTS mou_budgets CASCADE")
    op.execute("DROP TABLE IF EXISTS mou_versions CASCADE")
    op.execute("DROP TABLE IF EXISTS mou_activities CASCADE")
    op.execute("DROP TABLE IF EXISTS mou_approval_stages CASCADE")
    op.execute("DROP TABLE IF EXISTS mou_communications CASCADE")
    op.execute("DROP TABLE IF EXISTS mou_participants CASCADE")
    op.execute("DROP TABLE IF EXISTS mou_partner_contacts CASCADE")
    op.execute("DROP TABLE IF EXISTS mous CASCADE")
    op.execute("DROP TABLE IF EXISTS mou_partners CASCADE")
    op.execute("DROP TABLE IF EXISTS manuscript_co_authors CASCADE")
    op.execute("DROP TABLE IF EXISTS manuscripts CASCADE")
    op.execute("DROP TABLE IF EXISTS publications CASCADE")
    op.execute("DROP TABLE IF EXISTS publication_libraries CASCADE")
    op.execute("DROP TABLE IF EXISTS data_sources CASCADE")
    
    # Drop enum types
    op.execute("DROP TYPE IF EXISTS moucompliancestatus CASCADE")
    op.execute("DROP TYPE IF EXISTS moubudgetstatus CASCADE")
    op.execute("DROP TYPE IF EXISTS moucommunicationtype CASCADE")
    op.execute("DROP TYPE IF EXISTS mouversiontype CASCADE")
    op.execute("DROP TYPE IF EXISTS mouactivitystatus CASCADE")
    op.execute("DROP TYPE IF EXISTS mouactivitytype CASCADE")
    op.execute("DROP TYPE IF EXISTS mouapprovalstagestatus CASCADE")
    op.execute("DROP TYPE IF EXISTS mouapprovalstagetype CASCADE")
    op.execute("DROP TYPE IF EXISTS mouparticipantrole CASCADE")
    op.execute("DROP TYPE IF EXISTS moupartnertier CASCADE")
    op.execute("DROP TYPE IF EXISTS moupartnertype CASCADE")
    op.execute("DROP TYPE IF EXISTS mouriskrating CASCADE")
    op.execute("DROP TYPE IF EXISTS mouconfidentiality CASCADE")
    op.execute("DROP TYPE IF EXISTS moustatus CASCADE")
    op.execute("DROP TYPE IF EXISTS moutype CASCADE")
