"""
Add auto_approve column to institutions table
Run this script to add the missing column
"""
import asyncio
from sqlalchemy import text
from database import async_session_maker

async def add_auto_approve_column():
    async with async_session_maker() as db:
        try:
            # Check if column exists
            result = await db.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='institutions' AND column_name='auto_approve'
            """))
            exists = result.scalar_one_or_none()
            
            if exists:
                print("✓ Column 'auto_approve' already exists")
                return
            
            # Add the column
            await db.execute(text("""
                ALTER TABLE institutions 
                ADD COLUMN auto_approve BOOLEAN NOT NULL DEFAULT FALSE
            """))
            await db.commit()
            
            print("✅ Successfully added 'auto_approve' column to institutions table")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(add_auto_approve_column())
