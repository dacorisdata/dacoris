"""Add primary_admin_id column to institutions table"""
import asyncio
from database import async_session_maker
from sqlalchemy import text

async def add_column():
    async with async_session_maker() as db:
        try:
            await db.execute(text(
                'ALTER TABLE institutions ADD COLUMN IF NOT EXISTS primary_admin_id INTEGER REFERENCES users(id)'
            ))
            await db.commit()
            print('✅ Column primary_admin_id added successfully to institutions table')
        except Exception as e:
            print(f'❌ Error: {e}')
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(add_column())
