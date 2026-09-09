"""
Migration: Add original_filename to mou_versions for uploaded agreement documents.
Run: python migrations/add_mou_version_original_filename.py
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
        cursor.execute("""
            ALTER TABLE mou_versions
            ADD COLUMN IF NOT EXISTS original_filename VARCHAR(300);
        """)
        conn.commit()
        print("Added original_filename column to mou_versions.")
    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    run_migration()
