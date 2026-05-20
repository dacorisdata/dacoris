"""
Migration: Add manuscript_citations table
Run with: python migrations/add_manuscript_citations.py
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
        print("Creating manuscript_citations table...")
        
        # Create manuscript_citations table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS manuscript_citations (
                id VARCHAR(36) PRIMARY KEY,
                manuscript_id VARCHAR(36) NOT NULL,
                publication_id VARCHAR(36) NOT NULL,
                citation_key VARCHAR(100) NOT NULL,
                "order" INTEGER NOT NULL,
                citation_style VARCHAR(50) DEFAULT 'APA',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE,
                FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id) ON DELETE CASCADE,
                FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE
            )
        """)
        
        # Create indexes for performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_manuscript_citations_manuscript_id 
            ON manuscript_citations(manuscript_id)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_manuscript_citations_publication_id 
            ON manuscript_citations(publication_id)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_manuscript_citations_order 
            ON manuscript_citations(manuscript_id, "order")
        """)
        
        conn.commit()
        print("✓ Created manuscript_citations table")
        print("✓ Created indexes")
        
    except Exception as e:
        conn.rollback()
        print(f"✗ Error: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


def rollback():
    """Remove manuscript_citations table"""
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    try:
        cursor.execute("DROP TABLE IF EXISTS manuscript_citations")
        conn.commit()
        print("✓ Dropped manuscript_citations table")
    except Exception as e:
        conn.rollback()
        print(f"✗ Error: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        rollback()
    else:
        run_migration()
