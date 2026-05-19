"""
Migration: Create all MoU & Partnerships tables (Module 7)
Run with: python migrations/add_mou_tables.py
"""

import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
if DATABASE_URL.startswith("postgresql+asyncpg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")


def run_migration():
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        # --- Enums ---
        print("Creating enums...")
        for enum_name, values in [
            ("moustatus",        ["DRAFT","INTERNAL_REVIEW","LEGAL_REVIEW","EXEC_APPROVAL","PENDING_SIGNING","ACTIVE","MID_TERM_REVIEW","PENDING_RENEWAL","SUSPENDED","EXPIRED","CLOSED","ARCHIVED"]),
            ("moutype",          ["GENERAL_COLLABORATION","ACADEMIC_EXCHANGE","RESEARCH_PARTNERSHIP","DATA_SHARING","JOINT_DEGREE","CLINICAL","INDUSTRY","CONSORTIUM","CO_FUNDING"]),
            ("mouconfidentiality",["PUBLIC","INTERNAL","RESTRICTED","CONFIDENTIAL"]),
            ("mouriskrating",    ["LOW","MEDIUM","HIGH"]),
            ("moupartnertype",   ["UNIVERSITY","RESEARCH_INSTITUTE","GOVERNMENT","NGO","HOSPITAL","INDUSTRY","FUNDER","INTERNATIONAL_ORG"]),
            ("moupartnertier",   ["STRATEGIC","ACTIVE","DORMANT"]),
            ("mouparticipantrole",["LEAD","CO_SIGNATORY","BENEFICIARY","OBSERVER"]),
            ("mouapprovalstage_type",["INTERNAL_REVIEW","LEGAL_REVIEW","EXEC_APPROVAL","SIGNING"]),
            ("mouapprovalstage_status",["PENDING","IN_PROGRESS","APPROVED","RETURNED","SKIPPED"]),
            ("mouactivitytype",  ["JOINT_TRAINING","RESEARCH_PROJECT","STUDENT_EXCHANGE","PUBLICATION","GRANT_APPLICATION","TECHNOLOGY_TRANSFER","POLICY_BRIEF","EVENT_WORKSHOP","CONSULTANCY","EQUIPMENT_SHARING","OTHER"]),
            ("mouactivitystatus",["PLANNED","IN_PROGRESS","DELAYED","EVIDENCE_SUBMITTED","VERIFIED","COMPLETED","CANCELLED"]),
            ("mouversiontype",   ["ORIGINAL","AMENDMENT","RENEWAL","ADDENDUM"]),
            ("moucommunicationtype",["EMAIL","MEETING","CALL","SITE_VISIT","REPORT","OTHER"]),
            ("moubudgetstatus",  ["DRAFT","APPROVED","ACTIVE","CLOSED"]),
            ("moucompliancestatus",["PENDING","COMPLIANT","NON_COMPLIANT","WAIVED"]),
        ]:
            vals = ", ".join(f"'{v}'" for v in values)
            cursor.execute(f"""
                DO $$ BEGIN
                    CREATE TYPE {enum_name} AS ENUM ({vals});
                EXCEPTION WHEN duplicate_object THEN NULL;
                END $$;
            """)

        # Update primaryaccounttype and researchrole enums if needed
        for enum_name, new_vals in [
            ("primaryaccounttype", ["MOU_ADMIN","LEGAL_OFFICER","PARTNERSHIP_COORDINATOR","EXTERNAL_PARTNER"]),
            ("researchrole",       ["mou_admin","legal_officer","partnership_coordinator","external_partner"]),
        ]:
            for val in new_vals:
                cursor.execute(f"""
                    DO $$ BEGIN
                        ALTER TYPE {enum_name} ADD VALUE IF NOT EXISTS '{val}';
                    EXCEPTION WHEN others THEN NULL;
                    END $$;
                """)

        # --- mous ---
        print("Creating mous table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS mous (
                id SERIAL PRIMARY KEY,
                institution_id INTEGER NOT NULL REFERENCES institutions(id),
                mou_number VARCHAR(50) UNIQUE,
                title VARCHAR(500) NOT NULL,
                mou_type moutype NOT NULL,
                status moustatus NOT NULL DEFAULT 'DRAFT',
                thematic_area TEXT,
                lead_department VARCHAR(200),
                coordinator_id INTEGER REFERENCES users(id),
                legal_officer_id INTEGER REFERENCES users(id),
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
                parent_mou_id INTEGER REFERENCES mous(id),
                created_by_id INTEGER NOT NULL REFERENCES users(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE
            );
        """)

        print("Creating mou_versions table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS mou_versions (
                id SERIAL PRIMARY KEY,
                mou_id INTEGER NOT NULL REFERENCES mous(id) ON DELETE CASCADE,
                version_number INTEGER NOT NULL DEFAULT 1,
                document_path VARCHAR(500),
                document_checksum VARCHAR(64),
                version_type mouversiontype DEFAULT 'ORIGINAL',
                change_summary TEXT,
                uploaded_by_id INTEGER REFERENCES users(id),
                uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)

        print("Creating mou_partners table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS mou_partners (
                id SERIAL PRIMARY KEY,
                institution_id INTEGER NOT NULL REFERENCES institutions(id),
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
        """)

        print("Creating mou_partner_contacts table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS mou_partner_contacts (
                id SERIAL PRIMARY KEY,
                partner_id INTEGER NOT NULL REFERENCES mou_partners(id) ON DELETE CASCADE,
                mou_id INTEGER REFERENCES mous(id),
                full_name VARCHAR(200) NOT NULL,
                title VARCHAR(100),
                email VARCHAR(200),
                phone VARCHAR(50),
                orcid_id VARCHAR(100),
                is_primary BOOLEAN DEFAULT FALSE,
                role_at_partner VARCHAR(200)
            );
        """)

        print("Creating mou_participants table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS mou_participants (
                id SERIAL PRIMARY KEY,
                mou_id INTEGER NOT NULL REFERENCES mous(id) ON DELETE CASCADE,
                partner_id INTEGER NOT NULL REFERENCES mou_partners(id),
                role mouparticipantrole DEFAULT 'CO_SIGNATORY',
                signatory_name VARCHAR(200),
                signatory_title VARCHAR(200),
                signed_date DATE
            );
        """)

        print("Creating mou_communications table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS mou_communications (
                id SERIAL PRIMARY KEY,
                mou_id INTEGER NOT NULL REFERENCES mous(id) ON DELETE CASCADE,
                partner_id INTEGER REFERENCES mou_partners(id),
                communication_type moucommunicationtype DEFAULT 'OTHER',
                date DATE,
                summary TEXT,
                outcome TEXT,
                next_action TEXT,
                logged_by_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)

        print("Creating mou_approval_stages table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS mou_approval_stages (
                id SERIAL PRIMARY KEY,
                mou_id INTEGER NOT NULL REFERENCES mous(id) ON DELETE CASCADE,
                stage_type mouapprovalstage_type NOT NULL,
                stage_order INTEGER NOT NULL DEFAULT 1,
                assigned_to_id INTEGER REFERENCES users(id),
                status mouapprovalstage_status DEFAULT 'PENDING',
                comments TEXT,
                decided_at TIMESTAMP WITH TIME ZONE,
                decided_by_id INTEGER REFERENCES users(id),
                sla_days INTEGER,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)

        print("Creating mou_activities table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS mou_activities (
                id SERIAL PRIMARY KEY,
                mou_id INTEGER NOT NULL REFERENCES mous(id) ON DELETE CASCADE,
                title VARCHAR(300) NOT NULL,
                description TEXT,
                activity_type mouactivitytype DEFAULT 'OTHER',
                assigned_to_id INTEGER REFERENCES users(id),
                planned_start_date DATE,
                planned_end_date DATE,
                status mouactivitystatus DEFAULT 'PLANNED',
                completion_percentage INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE
            );
        """)

        print("Creating mou_budgets table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS mou_budgets (
                id SERIAL PRIMARY KEY,
                mou_id INTEGER NOT NULL REFERENCES mous(id) ON DELETE CASCADE,
                description TEXT,
                currency VARCHAR(3) DEFAULT 'KES',
                committed_by_institution FLOAT DEFAULT 0,
                committed_by_partner FLOAT DEFAULT 0,
                total_budget FLOAT DEFAULT 0,
                status moubudgetstatus DEFAULT 'DRAFT',
                approved_by_id INTEGER REFERENCES users(id),
                approved_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)

        print("Creating mou_compliance_items table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS mou_compliance_items (
                id SERIAL PRIMARY KEY,
                mou_id INTEGER NOT NULL REFERENCES mous(id) ON DELETE CASCADE,
                check_type VARCHAR(200) NOT NULL,
                required BOOLEAN DEFAULT TRUE,
                status moucompliancestatus DEFAULT 'PENDING',
                notes TEXT,
                verified_by_id INTEGER REFERENCES users(id),
                verified_at TIMESTAMP WITH TIME ZONE
            );
        """)

        # Indexes
        print("Creating indexes...")
        for idx_sql in [
            "CREATE INDEX IF NOT EXISTS idx_mous_institution_id ON mous(institution_id);",
            "CREATE INDEX IF NOT EXISTS idx_mous_status ON mous(status);",
            "CREATE INDEX IF NOT EXISTS idx_mou_partners_institution_id ON mou_partners(institution_id);",
            "CREATE INDEX IF NOT EXISTS idx_mou_activities_mou_id ON mou_activities(mou_id);",
            "CREATE INDEX IF NOT EXISTS idx_mou_approval_stages_mou_id ON mou_approval_stages(mou_id);",
        ]:
            cursor.execute(idx_sql)

        conn.commit()
        print("\n✅ MoU tables migration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    run_migration()
