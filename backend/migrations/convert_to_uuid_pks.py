"""
Migration script to convert all Integer primary keys to UUID strings.
This is a comprehensive migration that affects ALL tables in the database.

IMPORTANT: 
- Backup your database before running this migration
- This migration is irreversible
- Run in development environment first
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text, MetaData, inspect
from sqlalchemy.orm import sessionmaker
import uuid
from datetime import datetime

# Database connection
# For remote DB via SSH tunnel, use: postgresql://postgres:PASSWORD@localhost:15432/dacoris
# Replace asyncpg with psycopg2 for sync operations
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://dacoris_user:dacoris_pass@localhost:5432/dacoris_db")

# Convert asyncpg to psycopg2 if needed
if "asyncpg" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

print(f"Connecting to database...")
print(f"Connection string: {DATABASE_URL.split('@')[0]}@***")  # Hide password

# Create engine with connection pooling disabled and statement timeout
engine = create_engine(
    DATABASE_URL,
    poolclass=None,  # Disable connection pooling
    connect_args={
        "options": "-c statement_timeout=300000"  # 5 minute timeout per statement
    }
)
Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)

def generate_uuid():
    """Generate UUID string"""
    return str(uuid.uuid4())

# Mapping of old integer IDs to new UUID strings
id_mappings = {}

def get_new_id(table_name, old_id):
    """Get or create UUID for an old integer ID"""
    if old_id is None:
        return None
    key = f"{table_name}_{old_id}"
    if key not in id_mappings:
        id_mappings[key] = generate_uuid()
    return id_mappings[key]

# Define all tables and their foreign key relationships in dependency order
TABLES_IN_ORDER = [
    # Core tables (no dependencies)
    ("institutions", []),
    
    # Users depends on institutions
    ("users", [
        ("primary_institution_id", "institutions"),
        ("invited_by_id", "users")
    ]),
    
    # user_roles junction table
    ("user_roles", [
        ("user_id", "users"),
        ("assigned_by", "users")
    ]),
    
    # ORCID profiles
    ("orcid_profiles", [
        ("user_id", "users"),
        ("institution_id", "institutions")
    ]),
    
    # Grant opportunities
    ("opportunity_categories", []),
    
    ("grant_opportunities", [
        ("created_by_id", "users")
    ]),
    
    ("opportunity_bookmarks", [
        ("opportunity_id", "grant_opportunities"),
        ("user_id", "users")
    ]),
    
    ("opportunity_category_assignments", [
        ("opportunity_id", "grant_opportunities"),
        ("category_id", "opportunity_categories"),
        ("assigned_by", "users")
    ]),
    
    ("institution_categories", [
        ("institution_id", "institutions"),
        ("category_id", "opportunity_categories"),
        ("assigned_by", "users")
    ]),
    
    # Proposals
    ("proposals", [
        ("opportunity_id", "grant_opportunities"),
        ("institution_id", "institutions"),
        ("lead_pi_id", "users")
    ]),
    
    ("proposal_sections", [
        ("proposal_id", "proposals"),
        ("last_edited_by_id", "users")
    ]),
    
    ("proposal_section_versions", [
        ("section_id", "proposal_sections"),
        ("saved_by_id", "users")
    ]),
    
    ("proposal_documents", [
        ("proposal_id", "proposals"),
        ("uploaded_by_id", "users")
    ]),
    
    ("proposal_collaborators", [
        ("proposal_id", "proposals"),
        ("user_id", "users")
    ]),
    
    ("proposal_reviews", [
        ("proposal_id", "proposals"),
        ("reviewer_id", "users")
    ]),
    
    ("proposal_stage_history", [
        ("proposal_id", "proposals"),
        ("entered_by_id", "users")
    ]),
    
    ("proposal_stage_assignments", [
        ("proposal_id", "proposals"),
        ("reviewer_id", "users"),
        ("assigned_by_id", "users")
    ]),
    
    # Awards
    ("awards", [
        ("proposal_id", "proposals"),
        ("institution_id", "institutions"),
        ("issued_by_id", "users")
    ]),
    
    ("budget_lines", [
        ("award_id", "awards")
    ]),
    
    # Research projects
    ("research_projects", [
        ("institution_id", "institutions"),
        ("award_id", "awards"),
        ("pi_id", "users")
    ]),
    
    ("ethics_applications", [
        ("project_id", "research_projects"),
        ("institution_id", "institutions"),
        ("submitted_by_id", "users")
    ]),
    
    ("ethics_documents", [
        ("ethics_application_id", "ethics_applications"),
        ("uploaded_by_id", "users")
    ]),
    
    ("capture_forms", [
        ("project_id", "research_projects"),
        ("institution_id", "institutions"),
        ("created_by_id", "users")
    ]),
    
    ("form_submissions", [
        ("form_id", "capture_forms"),
        ("submitted_by_id", "users")
    ]),
    
    ("data_import_requests", [
        ("project_id", "research_projects"),
        ("requester_id", "users"),
        ("approved_by_id", "users")
    ]),
    
    # Datasets
    ("datasets", [
        ("project_id", "research_projects"),
        ("institution_id", "institutions"),
        ("source_form_id", "capture_forms"),
        ("created_by_id", "users")
    ]),
    
    ("dataset_versions", [
        ("dataset_id", "datasets"),
        ("created_by_id", "users")
    ]),
    
    ("qa_rules", [
        ("dataset_id", "datasets"),
        ("created_by_id", "users")
    ]),
    
    ("qa_results", [
        ("submission_id", "form_submissions"),
        ("rule_id", "qa_rules"),
        ("reviewed_by_id", "users")
    ]),
    
    ("data_transformations", [
        ("dataset_id", "datasets"),
        ("applied_by_id", "users")
    ]),
    
    # Notifications
    ("email_verifications", []),
    
    ("notifications", [
        ("recipient_id", "users")
    ]),
    
    # Scholarly works
    ("scholarly_works", []),
    
    ("work_authors", [
        ("work_id", "scholarly_works"),
        ("user_id", "users")
    ]),
    
    ("work_institutions", [
        ("work_id", "scholarly_works"),
        ("institution_id", "institutions")
    ]),
    
    ("work_funders", [
        ("work_id", "scholarly_works")
    ]),
    
    # Project management
    ("project_members", [
        ("project_id", "research_projects"),
        ("user_id", "users")
    ]),
    
    ("project_milestones", [
        ("project_id", "research_projects"),
        ("assigned_to_id", "users")
    ]),
    
    ("project_tasks", [
        ("milestone_id", "project_milestones"),
        ("assigned_to_id", "users")
    ]),
    
    ("project_documents", [
        ("project_id", "research_projects"),
        ("uploaded_by_id", "users")
    ]),
    
    ("research_outputs", [
        ("institution_id", "institutions"),
        ("project_id", "research_projects"),
        ("created_by_id", "users"),
        ("last_edited_by_id", "users")
    ]),
    
    # Publications
    ("publication_libraries", [
        ("user_id", "users"),
        ("parent_id", "publication_libraries")
    ]),
    
    ("publications", [
        ("library_id", "publication_libraries")
    ]),
    
    # Manuscripts
    ("manuscripts", [
        ("user_id", "users")
    ]),
    
    ("manuscript_co_authors", [
        ("manuscript_id", "manuscripts")
    ]),
    
    # Data sources
    ("data_sources", [
        ("institution_id", "institutions"),
        ("researcher_id", "users")
    ]),
    
    # MoU tables
    ("mou_partners", [
        ("institution_id", "institutions")
    ]),
    
    ("mous", [
        ("institution_id", "institutions"),
        ("coordinator_id", "users"),
        ("legal_officer_id", "users"),
        ("parent_mou_id", "mous"),
        ("created_by_id", "users")
    ]),
    
    ("mou_partner_contacts", [
        ("partner_id", "mou_partners"),
        ("mou_id", "mous")
    ]),
    
    ("mou_participants", [
        ("mou_id", "mous"),
        ("partner_id", "mou_partners")
    ]),
    
    ("mou_communications", [
        ("mou_id", "mous"),
        ("partner_id", "mou_partners"),
        ("logged_by_id", "users")
    ]),
    
    ("mou_approval_stages", [
        ("mou_id", "mous"),
        ("assigned_to_id", "users"),
        ("decided_by_id", "users")
    ]),
    
    ("mou_activities", [
        ("mou_id", "mous"),
        ("assigned_to_id", "users")
    ]),
    
    ("mou_versions", [
        ("mou_id", "mous"),
        ("uploaded_by_id", "users")
    ]),
    
    ("mou_budgets", [
        ("mou_id", "mous"),
        ("approved_by_id", "users")
    ]),
    
    ("mou_compliance_items", [
        ("mou_id", "mous"),
        ("verified_by_id", "users")
    ]),
]

def migrate_table(session, table_name, foreign_keys):
    """Migrate a single table from Integer IDs to UUID strings"""
    print(f"\n{'='*60}")
    print(f"Migrating table: {table_name}")
    print(f"{'='*60}")
    
    # Check if table exists
    inspector = inspect(engine)
    if table_name not in inspector.get_table_names():
        print(f"[SKIP] Table {table_name} does not exist, skipping...")
        return
    
    # Get current data
    result = session.execute(text(f"SELECT * FROM {table_name}"))
    rows = result.fetchall()
    columns = result.keys()
    
    if not rows:
        print(f"[OK] Table {table_name} is empty, skipping data migration...")
        # Still need to alter the table structure
        alter_table_structure(session, table_name, foreign_keys)
        return
    
    print(f"Found {len(rows)} rows to migrate")
    
    # Create temporary table with UUID structure
    temp_table = f"{table_name}_uuid_temp"
    
    # Drop temp table if exists
    session.execute(text(f"DROP TABLE IF EXISTS {temp_table} CASCADE"))
    session.commit()
    
    # Create temp table with same structure but UUID IDs
    create_temp_table(session, table_name, temp_table, columns, foreign_keys)
    
    # Migrate data to temp table
    migrate_data(session, table_name, temp_table, rows, columns, foreign_keys)
    
    # Swap tables
    swap_tables(session, table_name, temp_table)
    
    print(f"[OK] Successfully migrated {table_name}")

def create_temp_table(session, original_table, temp_table, columns, foreign_keys):
    """Create temporary table with UUID structure"""
    # Get original table structure
    inspector = inspect(engine)
    original_columns = inspector.get_columns(original_table)
    pk_constraint = inspector.get_pk_constraint(original_table)
    
    # Build CREATE TABLE statement
    col_defs = []
    for col in original_columns:
        col_name = col['name']
        col_type = str(col['type'])
        
        # Convert Integer to String for ID columns
        if col_name == 'id':
            col_type = 'VARCHAR(36)'
        elif col_name.endswith('_id') or col_name in [fk[0] for fk in foreign_keys]:
            col_type = 'VARCHAR(36)'
        
        nullable = "" if col['nullable'] else " NOT NULL"
        col_defs.append(f"{col_name} {col_type}{nullable}")
    
    # Add primary key constraint (handle composite keys for junction tables)
    if pk_constraint and pk_constraint.get('constrained_columns'):
        pk_cols = ', '.join(pk_constraint['constrained_columns'])
        col_defs.append(f"PRIMARY KEY ({pk_cols})")
    else:
        # Default to 'id' if no PK constraint found
        col_defs.append(f"PRIMARY KEY (id)")
    
    create_sql = f"CREATE TABLE {temp_table} ({', '.join(col_defs)})"
    session.execute(text(create_sql))
    session.commit()

def migrate_data(session, original_table, temp_table, rows, columns, foreign_keys):
    """Migrate data from original to temp table with UUID conversion"""
    fk_map = {fk[0]: fk[1] for fk in foreign_keys}
    
    for row in rows:
        row_dict = dict(zip(columns, row))
        
        # Convert ID to UUID
        old_id = row_dict['id']
        new_id = get_new_id(original_table, old_id)
        row_dict['id'] = new_id
        
        # Convert foreign keys to UUIDs
        for col_name, ref_table in fk_map.items():
            if col_name in row_dict and row_dict[col_name] is not None:
                old_fk = row_dict[col_name]
                row_dict[col_name] = get_new_id(ref_table, old_fk)
        
        # Insert into temp table
        cols = ', '.join(row_dict.keys())
        placeholders = ', '.join([f":{k}" for k in row_dict.keys()])
        insert_sql = f"INSERT INTO {temp_table} ({cols}) VALUES ({placeholders})"
        session.execute(text(insert_sql), row_dict)
    
    session.commit()

def alter_table_structure(session, table_name, foreign_keys):
    """Alter table structure to use VARCHAR for ID columns"""
    print(f"Altering table structure for {table_name}...")
    
    try:
        inspector = inspect(engine)
        
        # First, find and drop ALL foreign keys that reference this table from OTHER tables
        all_tables = inspector.get_table_names()
        for other_table in all_tables:
            if other_table == table_name:
                continue
            other_fks = inspector.get_foreign_keys(other_table)
            for fk in other_fks:
                if fk.get('referred_table') == table_name:
                    fk_name = fk['name']
                    if fk_name:
                        print(f"  Dropping child FK: {other_table}.{fk_name}")
                        session.execute(text(f"ALTER TABLE {other_table} DROP CONSTRAINT IF EXISTS {fk_name}"))
                        session.commit()
        
        # Drop foreign key constraints on this table
        fks = inspector.get_foreign_keys(table_name)
        for fk in fks:
            fk_name = fk['name']
            if fk_name:
                print(f"  Dropping FK constraint: {fk_name}")
                session.execute(text(f"ALTER TABLE {table_name} DROP CONSTRAINT IF EXISTS {fk_name}"))
                session.commit()
        
        # Check if table has an 'id' column (junction tables may not)
        columns = inspector.get_columns(table_name)
        has_id_column = any(col['name'] == 'id' for col in columns)
        
        # Alter ID column only if it exists
        if has_id_column:
            print(f"  Altering id column to VARCHAR(36)")
            session.execute(text(f"ALTER TABLE {table_name} ALTER COLUMN id TYPE VARCHAR(36)"))
            session.commit()
        
        # Alter foreign key columns
        for fk_col, ref_table in foreign_keys:
            print(f"  Altering {fk_col} column to VARCHAR(36)")
            session.execute(text(f"ALTER TABLE {table_name} ALTER COLUMN {fk_col} TYPE VARCHAR(36)"))
            session.commit()
        
        print(f"  [OK] Table structure altered")
        
    except Exception as e:
        print(f"  [ERROR] Failed to alter table structure: {e}")
        session.rollback()
        raise

def swap_tables(session, original_table, temp_table):
    """Swap original table with temp table"""
    backup_table = f"{original_table}_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    # Rename original to backup
    session.execute(text(f"ALTER TABLE {original_table} RENAME TO {backup_table}"))
    
    # Rename temp to original
    session.execute(text(f"ALTER TABLE {temp_table} RENAME TO {original_table}"))
    
    session.commit()
    
    print(f"[OK] Original table backed up as {backup_table}")

def main():
    print("="*60)
    print("UUID PRIMARY KEY MIGRATION")
    print("="*60)
    print("\n[WARNING] This migration will convert ALL Integer PKs to UUIDs")
    print("[WARNING] Make sure you have a database backup!")
    print("\nPress ENTER to continue or Ctrl+C to cancel...")
    input()
    
    session = Session()
    
    try:
        print("\nStarting migration...")
        
        for table_name, foreign_keys in TABLES_IN_ORDER:
            try:
                migrate_table(session, table_name, foreign_keys)
            except Exception as e:
                print(f"[ERROR] Error migrating {table_name}: {e}")
                session.rollback()
                raise
        
        print("\n" + "="*60)
        print("[SUCCESS] MIGRATION COMPLETED SUCCESSFULLY")
        print("="*60)
        print(f"\nMigrated {len(TABLES_IN_ORDER)} tables")
        print(f"Total ID mappings created: {len(id_mappings)}")
        
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        session.rollback()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    main()
