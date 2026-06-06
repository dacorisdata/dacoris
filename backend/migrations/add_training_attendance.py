"""
Migration: Add training attendance tracking and session_count on programmes
Run: python migrations/add_training_attendance.py
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
            ALTER TABLE training_programs
            ADD COLUMN IF NOT EXISTS session_count INTEGER NOT NULL DEFAULT 5;
        """)
        cursor.execute("""
            DO $$ BEGIN
                CREATE TYPE trainingattendancestatus AS ENUM ('pending', 'confirmed', 'rejected');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS training_attendance (
                id VARCHAR PRIMARY KEY,
                enrollment_id VARCHAR NOT NULL REFERENCES training_enrollments(id) ON DELETE CASCADE,
                session_number INTEGER NOT NULL,
                attendance_date DATE NOT NULL,
                status trainingattendancestatus NOT NULL DEFAULT 'pending',
                marked_by_id VARCHAR NOT NULL REFERENCES users(id),
                marked_at TIMESTAMPTZ DEFAULT NOW(),
                confirmed_by_id VARCHAR REFERENCES users(id),
                confirmed_at TIMESTAMPTZ,
                manager_notes TEXT,
                CONSTRAINT uix_training_attendance_enrollment_session
                    UNIQUE (enrollment_id, session_number)
            );
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_training_attendance_enrollment_id
            ON training_attendance(enrollment_id);
        """)
        conn.commit()
        print("Training attendance migration completed.")
    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    run_migration()
