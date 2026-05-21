"""
Migration: Add manuscript version control tables
Creates manuscript_versions and manuscript_version_comments tables
Adds version tracking fields to manuscripts table
"""

import asyncio
import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from database import engine, async_session_maker
from models import Base

async def run_migration():
    """Run the migration to add version control tables"""
    
    async with engine.begin() as conn:
        print("🔄 Starting manuscript version control migration...")
        
        # Add version tracking fields to manuscripts table
        print("📝 Adding version tracking fields to manuscripts table...")
        await conn.execute(text("""
            ALTER TABLE manuscripts 
            ADD COLUMN IF NOT EXISTS current_version_number INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS last_auto_save_at TIMESTAMP WITH TIME ZONE;
        """))
        
        # Create manuscript_versions table
        print("📝 Creating manuscript_versions table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS manuscript_versions (
                id VARCHAR PRIMARY KEY,
                manuscript_id VARCHAR NOT NULL,
                version_number INTEGER NOT NULL,
                version_type VARCHAR(50) NOT NULL,
                version_label VARCHAR(255),
                change_summary TEXT,
                content TEXT NOT NULL,
                abstract TEXT,
                title VARCHAR(500) NOT NULL,
                word_count INTEGER DEFAULT 0,
                character_count INTEGER DEFAULT 0,
                citation_count INTEGER DEFAULT 0,
                comment_count INTEGER DEFAULT 0,
                resolved_comment_count INTEGER DEFAULT 0,
                status VARCHAR(50),
                additions_count INTEGER DEFAULT 0,
                deletions_count INTEGER DEFAULT 0,
                diff_summary JSONB,
                co_authors_snapshot JSONB,
                reviewers_snapshot JSONB,
                created_by_id VARCHAR NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                parent_version_id VARCHAR,
                is_current BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id) ON DELETE CASCADE,
                FOREIGN KEY (created_by_id) REFERENCES users(id),
                FOREIGN KEY (parent_version_id) REFERENCES manuscript_versions(id)
            );
        """))
        
        # Create indexes for manuscript_versions
        print("📝 Creating indexes for manuscript_versions...")
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_manuscript_versions_manuscript_id ON manuscript_versions(manuscript_id)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_manuscript_versions_version_number ON manuscript_versions(manuscript_id, version_number)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_manuscript_versions_created_at ON manuscript_versions(created_at)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_manuscript_versions_type ON manuscript_versions(version_type)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_manuscript_versions_current ON manuscript_versions(manuscript_id, is_current)"))
        
        # Create manuscript_version_comments table
        print("📝 Creating manuscript_version_comments table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS manuscript_version_comments (
                id VARCHAR PRIMARY KEY,
                version_id VARCHAR NOT NULL,
                original_comment_id VARCHAR,
                content TEXT NOT NULL,
                quoted_text TEXT,
                selection_start INTEGER,
                selection_end INTEGER,
                is_resolved BOOLEAN DEFAULT FALSE,
                user_name VARCHAR(255) NOT NULL,
                user_email VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                parent_comment_id VARCHAR,
                replies_count INTEGER DEFAULT 0,
                FOREIGN KEY (version_id) REFERENCES manuscript_versions(id) ON DELETE CASCADE,
                FOREIGN KEY (original_comment_id) REFERENCES manuscript_comments(id)
            );
        """))
        
        # Create indexes for manuscript_version_comments
        print("📝 Creating indexes for manuscript_version_comments...")
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_manuscript_version_comments_version_id ON manuscript_version_comments(version_id)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_manuscript_version_comments_original_id ON manuscript_version_comments(original_comment_id)"))
        
        print("✅ Migration completed successfully!")
        print("📊 Summary:")
        print("   - Added current_version_number and last_auto_save_at to manuscripts")
        print("   - Created manuscript_versions table with indexes")
        print("   - Created manuscript_version_comments table with indexes")

async def create_initial_versions():
    """Create initial version for existing manuscripts"""
    print("\n🔄 Creating initial versions for existing manuscripts...")
    
    async with async_session_maker() as session:
        # Get all manuscripts that don't have versions yet
        result = await session.execute(text("""
            SELECT m.id, m.title, m.content, m.abstract, m.status, m.user_id, m.created_at
            FROM manuscripts m
            LEFT JOIN manuscript_versions v ON m.id = v.manuscript_id
            WHERE v.id IS NULL AND m.content IS NOT NULL
        """))
        
        manuscripts = result.fetchall()
        
        if not manuscripts:
            print("✅ No manuscripts need initial versions")
            return
        
        print(f"📝 Found {len(manuscripts)} manuscripts needing initial versions")
        
        for manuscript in manuscripts:
            manuscript_id, title, content, abstract, status, user_id, created_at = manuscript
            
            # Calculate word count
            word_count = len(content.split()) if content else 0
            character_count = len(content) if content else 0
            
            # Create initial version
            await session.execute(text("""
                INSERT INTO manuscript_versions (
                    id, manuscript_id, version_number, version_type, version_label,
                    content, abstract, title, word_count, character_count,
                    status, created_by_id, created_at, is_current
                ) VALUES (
                    gen_random_uuid()::text, :manuscript_id, 1, 'MILESTONE', 'Initial Version',
                    :content, :abstract, :title, :word_count, :character_count,
                    :status, :user_id, :created_at, TRUE
                )
            """), {
                'manuscript_id': manuscript_id,
                'content': content or '',
                'abstract': abstract,
                'title': title,
                'word_count': word_count,
                'character_count': character_count,
                'status': status,
                'user_id': user_id,
                'created_at': created_at
            })
            
            # Update manuscript current_version_number
            await session.execute(text("""
                UPDATE manuscripts 
                SET current_version_number = 1 
                WHERE id = :manuscript_id
            """), {'manuscript_id': manuscript_id})
            
            print(f"   ✅ Created initial version for: {title[:50]}...")
        
        await session.commit()
        print(f"✅ Created initial versions for {len(manuscripts)} manuscripts")

async def main():
    """Main migration function"""
    try:
        await run_migration()
        await create_initial_versions()
        print("\n🎉 All migration tasks completed successfully!")
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
