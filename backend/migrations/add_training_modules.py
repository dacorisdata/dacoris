"""
Migration: Add training modules and materials tables
Run: python migrations/add_training_modules.py
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
            CREATE TABLE IF NOT EXISTS training_modules (
                id VARCHAR PRIMARY KEY,
                program_id VARCHAR NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
                title VARCHAR(300) NOT NULL,
                description TEXT,
                sort_order INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ
            );
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_training_modules_program_id
            ON training_modules(program_id);
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS training_materials (
                id VARCHAR PRIMARY KEY,
                program_id VARCHAR NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
                module_id VARCHAR REFERENCES training_modules(id) ON DELETE CASCADE,
                title VARCHAR(300) NOT NULL,
                original_filename VARCHAR(500) NOT NULL,
                stored_filename VARCHAR(500) NOT NULL,
                file_size_bytes INTEGER DEFAULT 0,
                mime_type VARCHAR(120),
                uploaded_by_id VARCHAR REFERENCES users(id),
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_training_materials_program_id
            ON training_materials(program_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_training_materials_module_id
            ON training_materials(module_id);
        """)
        conn.commit()
        print("Training modules and materials tables created.")
    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    run_migration()
