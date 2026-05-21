import asyncio
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import text
from database import engine


async def run_migration():
    """Add manuscript comments and reviewers tables"""
    
    async with engine.begin() as conn:
        print("🔧 Creating manuscript_comments table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS manuscript_comments (
                id VARCHAR PRIMARY KEY,
                manuscript_id VARCHAR NOT NULL,
                user_id VARCHAR NOT NULL,
                parent_comment_id VARCHAR,
                content TEXT NOT NULL,
                quoted_text TEXT,
                selection_start INTEGER,
                selection_end INTEGER,
                is_resolved BOOLEAN DEFAULT FALSE NOT NULL,
                resolved_by_id VARCHAR,
                resolved_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE,
                FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (parent_comment_id) REFERENCES manuscript_comments(id) ON DELETE CASCADE,
                FOREIGN KEY (resolved_by_id) REFERENCES users(id) ON DELETE SET NULL
            )
        """))
        
        print("🔧 Creating indexes on manuscript_comments...")
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_manuscript_comments_manuscript_id 
            ON manuscript_comments(manuscript_id)
        """))
        
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_manuscript_comments_user_id 
            ON manuscript_comments(user_id)
        """))
        
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_manuscript_comments_parent_id 
            ON manuscript_comments(parent_comment_id)
        """))
        
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_manuscript_comments_resolved 
            ON manuscript_comments(is_resolved)
        """))
        
        print("🔧 Creating manuscript_reviewers table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS manuscript_reviewers (
                id VARCHAR PRIMARY KEY,
                manuscript_id VARCHAR NOT NULL,
                user_id VARCHAR,
                email VARCHAR(255),
                name VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'invited',
                invited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                responded_at TIMESTAMP WITH TIME ZONE,
                FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        """))
        
        print("🔧 Creating indexes on manuscript_reviewers...")
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_manuscript_reviewers_manuscript_id 
            ON manuscript_reviewers(manuscript_id)
        """))
        
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_manuscript_reviewers_user_id 
            ON manuscript_reviewers(user_id)
        """))
        
        print("✅ Migration completed successfully!")


if __name__ == "__main__":
    print("=" * 60)
    print("MANUSCRIPT COMMENTS & REVIEWERS MIGRATION")
    print("=" * 60)
    asyncio.run(run_migration())
    print("\n✨ All done! You can now use the commenting system.")
