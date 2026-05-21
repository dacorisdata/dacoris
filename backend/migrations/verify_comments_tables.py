import asyncio
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import text
from database import engine


async def verify_tables():
    """Verify that comment tables were created"""
    
    async with engine.begin() as conn:
        result = await conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name IN ('manuscript_comments', 'manuscript_reviewers')
            ORDER BY table_name
        """))
        
        tables = [row[0] for row in result]
        
        print("✅ Found tables:")
        for table in tables:
            print(f"   - {table}")
        
        if len(tables) == 2:
            print("\n✅ Migration successful! Both tables exist.")
            
            # Check comment table structure
            result = await conn.execute(text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'manuscript_comments'
                ORDER BY ordinal_position
            """))
            
            print("\n📋 manuscript_comments columns:")
            for row in result:
                print(f"   - {row[0]}: {row[1]}")
                
        else:
            print(f"\n❌ Expected 2 tables, found {len(tables)}")


if __name__ == "__main__":
    asyncio.run(verify_tables())
