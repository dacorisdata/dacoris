"""
Script to update grant_opportunities table with new columns
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@localhost:5432/dacoris")

async def main():
    engine = create_async_engine(DATABASE_URL, echo=True)
    
    async with engine.begin() as conn:
        print("[INFO] Adding missing columns to grant_opportunities table...")
        
        # Add columns
        await conn.execute(text("ALTER TABLE grant_opportunities ADD COLUMN IF NOT EXISTS eligibility TEXT"))
        await conn.execute(text("ALTER TABLE grant_opportunities ADD COLUMN IF NOT EXISTS criteria TEXT"))
        await conn.execute(text("ALTER TABLE grant_opportunities ADD COLUMN IF NOT EXISTS application_url VARCHAR(500)"))
        await conn.execute(text("ALTER TABLE grant_opportunities ADD COLUMN IF NOT EXISTS contact_email VARCHAR(200)"))
        
        print("[OK] Columns added")
        
        # Change amount columns to float
        try:
            await conn.execute(text("ALTER TABLE grant_opportunities ALTER COLUMN amount_min TYPE DOUBLE PRECISION"))
            await conn.execute(text("ALTER TABLE grant_opportunities ALTER COLUMN amount_max TYPE DOUBLE PRECISION"))
            print("[OK] Amount columns changed to DOUBLE PRECISION")
        except Exception as e:
            print(f"[SKIP] Amount columns already correct or error: {e}")
        
        # Change deadline to date
        try:
            await conn.execute(text("ALTER TABLE grant_opportunities ALTER COLUMN deadline TYPE DATE"))
            print("[OK] Deadline column changed to DATE")
        except Exception as e:
            print(f"[SKIP] Deadline column already correct or error: {e}")
        
        # Make institution_id nullable
        try:
            await conn.execute(text("ALTER TABLE grant_opportunities ALTER COLUMN institution_id DROP NOT NULL"))
            print("[OK] institution_id is now nullable")
        except Exception as e:
            print(f"[SKIP] institution_id already nullable or error: {e}")
        
        # Make created_by_id not nullable
        try:
            # First update any NULL values
            result = await conn.execute(text("UPDATE grant_opportunities SET created_by_id = 1 WHERE created_by_id IS NULL"))
            if result.rowcount > 0:
                print(f"[OK] Updated {result.rowcount} rows with NULL created_by_id")
            
            await conn.execute(text("ALTER TABLE grant_opportunities ALTER COLUMN created_by_id SET NOT NULL"))
            print("[OK] created_by_id is now NOT NULL")
        except Exception as e:
            print(f"[SKIP] created_by_id already NOT NULL or error: {e}")
    
    await engine.dispose()
    print("\n[DONE] Grant opportunities table updated successfully!")

if __name__ == "__main__":
    asyncio.run(main())
