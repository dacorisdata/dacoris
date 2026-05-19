"""
Rollback UUID migration by restoring from backup tables.
This script restores the most recent backup tables created during migration.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://dacoris_user:dacoris_pass@localhost:5432/dacoris_db")

if "asyncpg" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

print(f"Connecting to database...")
print(f"Connection string: {DATABASE_URL.split('@')[0]}@***")

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

def get_backup_tables(session):
    """Find all backup tables created during migration"""
    inspector = inspect(engine)
    all_tables = inspector.get_table_names()
    
    backup_tables = [t for t in all_tables if '_backup_' in t]
    return sorted(backup_tables, reverse=True)  # Most recent first

def restore_table(session, backup_table):
    """Restore a table from its backup"""
    # Extract original table name
    original_table = backup_table.split('_backup_')[0]
    
    print(f"\nRestoring {original_table} from {backup_table}...")
    
    # Drop current table
    session.execute(text(f"DROP TABLE IF EXISTS {original_table} CASCADE"))
    
    # Rename backup to original
    session.execute(text(f"ALTER TABLE {backup_table} RENAME TO {original_table}"))
    
    session.commit()
    print(f"[OK] Restored {original_table}")

def main():
    print("="*60)
    print("UUID MIGRATION ROLLBACK")
    print("="*60)
    
    session = Session()
    
    try:
        # Find backup tables
        backup_tables = get_backup_tables(session)
        
        if not backup_tables:
            print("\n[INFO] No backup tables found. Nothing to rollback.")
            return
        
        print(f"\nFound {len(backup_tables)} backup tables:")
        for table in backup_tables:
            print(f"  - {table}")
        
        print("\n[WARNING] This will restore all tables from their backups!")
        print("[WARNING] Any changes made after the migration will be lost!")
        response = input("\nContinue? (yes/no): ")
        
        if response.lower() != 'yes':
            print("Rollback cancelled.")
            return
        
        # Restore each table
        for backup_table in backup_tables:
            restore_table(session, backup_table)
        
        print("\n" + "="*60)
        print("[SUCCESS] Rollback completed successfully")
        print("="*60)
        print(f"\nRestored {len(backup_tables)} tables")
        
    except Exception as e:
        print(f"\n[ERROR] Rollback failed: {e}")
        session.rollback()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    main()
