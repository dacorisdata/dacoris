"""
Migration script to add publication_libraries and publications tables
Run this with: python migrations/add_publications.py
"""

import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
# Convert asyncpg URL to psycopg2 format
if DATABASE_URL.startswith("postgresql+asyncpg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

def run_migration():
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    try:
        print("Creating publication_libraries table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS publication_libraries (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                is_default BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE
            );
        """)
        
        print("Creating publications table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS publications (
                id SERIAL PRIMARY KEY,
                library_id INTEGER NOT NULL REFERENCES publication_libraries(id) ON DELETE CASCADE,
                
                -- Core metadata
                title TEXT NOT NULL,
                authors TEXT NOT NULL,
                journal VARCHAR(500),
                year INTEGER,
                doi VARCHAR(255),
                pmid VARCHAR(50),
                
                -- Source info
                source VARCHAR(50),
                source_id VARCHAR(255),
                
                -- Additional metadata
                abstract TEXT,
                publication_type VARCHAR(100),
                language VARCHAR(50),
                country VARCHAR(100),
                keywords TEXT,
                
                -- Citation info
                citation_count INTEGER DEFAULT 0,
                
                -- User interaction
                starred BOOLEAN DEFAULT FALSE,
                tags TEXT,
                notes TEXT,
                
                -- AI summary
                ai_summary TEXT,
                ai_summary_generated_at TIMESTAMP WITH TIME ZONE,
                
                -- Timestamps
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE
            );
        """)
        
        print("Creating indexes...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_publications_library_id ON publications(library_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_publications_doi ON publications(doi);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_publications_pmid ON publications(pmid);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_publication_libraries_user_id ON publication_libraries(user_id);
        """)
        
        conn.commit()
        print("✅ Migration completed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    try:
        run_migration()
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise
