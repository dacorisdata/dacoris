import psycopg2
import os

def run_migration():
    """Create manuscripts and manuscript_co_authors tables"""
    
    db_host = os.getenv("DB_HOST", "db")
    db_name = os.getenv("DB_NAME", "dacoris")
    db_user = os.getenv("DB_USER", "postgres")
    db_password = os.getenv("DB_PASSWORD", "Waxmangme86")
    
    conn = psycopg2.connect(
        host=db_host,
        database=db_name,
        user=db_user,
        password=db_password
    )
    
    try:
        cursor = conn.cursor()
        
        # Create manuscripts table
        print("Creating manuscripts table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS manuscripts (
                id SERIAL PRIMARY KEY,
                title VARCHAR(500) NOT NULL,
                short_description TEXT,
                department VARCHAR(255),
                keywords TEXT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content TEXT,
                abstract TEXT,
                status VARCHAR(50) DEFAULT 'draft',
                version INTEGER DEFAULT 1,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE
            )
        """)
        print("✓ Created manuscripts table")
        
        # Create manuscript_co_authors table
        print("Creating manuscript_co_authors table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS manuscript_co_authors (
                id SERIAL PRIMARY KEY,
                manuscript_id INTEGER NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
                given_name VARCHAR(255) NOT NULL,
                family_name VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                orcid VARCHAR(50),
                status VARCHAR(50) DEFAULT 'invited',
                invited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                responded_at TIMESTAMP WITH TIME ZONE,
                author_order INTEGER NOT NULL,
                UNIQUE(manuscript_id, author_order)
            )
        """)
        print("✓ Created manuscript_co_authors table")
        
        # Create indexes
        print("Creating indexes...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_manuscripts_user_id ON manuscripts(user_id)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_manuscripts_status ON manuscripts(status)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_manuscript_co_authors_manuscript_id 
            ON manuscript_co_authors(manuscript_id)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_manuscript_co_authors_orcid 
            ON manuscript_co_authors(orcid)
        """)
        print("✓ Created indexes")
        
        conn.commit()
        print("\n✅ Migration completed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
