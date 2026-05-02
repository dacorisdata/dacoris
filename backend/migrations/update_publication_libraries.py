import psycopg2
import os

def run_migration():
    """Add parent_id and is_folder columns to publication_libraries table"""
    
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
        
        # Check if columns already exist
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='publication_libraries' 
            AND column_name IN ('parent_id', 'is_folder')
        """)
        existing_columns = [row[0] for row in cursor.fetchall()]
        
        # Add parent_id column if it doesn't exist
        if 'parent_id' not in existing_columns:
            print("Adding parent_id column...")
            cursor.execute("""
                ALTER TABLE publication_libraries 
                ADD COLUMN parent_id INTEGER REFERENCES publication_libraries(id) ON DELETE CASCADE
            """)
            print("✓ Added parent_id column")
        else:
            print("✓ parent_id column already exists")
        
        # Add is_folder column if it doesn't exist
        if 'is_folder' not in existing_columns:
            print("Adding is_folder column...")
            cursor.execute("""
                ALTER TABLE publication_libraries 
                ADD COLUMN is_folder BOOLEAN DEFAULT FALSE
            """)
            print("✓ Added is_folder column")
        else:
            print("✓ is_folder column already exists")
        
        # Create index on parent_id for better query performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_publication_libraries_parent_id 
            ON publication_libraries(parent_id)
        """)
        print("✓ Created index on parent_id")
        
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
