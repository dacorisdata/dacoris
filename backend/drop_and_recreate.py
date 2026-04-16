"""
Script to drop and recreate all tables with the new schema.
WARNING: This will delete all existing data!
"""
import asyncio
from database import engine
from models import Base

async def drop_and_create():
    async with engine.begin() as conn:
        print("Dropping all tables...")
        await conn.run_sync(Base.metadata.drop_all)
        print("Creating all tables with new schema...")
        await conn.run_sync(Base.metadata.create_all)
        print("✓ Database schema updated successfully!")

if __name__ == "__main__":
    asyncio.run(drop_and_create())
