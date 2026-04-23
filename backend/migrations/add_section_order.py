"""Add order column to proposal_sections table"""
import asyncio
from sqlalchemy import text
from database import engine

async def upgrade():
    async with engine.begin() as conn:
        # Add order column with default value 0
        await conn.execute(text(
            'ALTER TABLE proposal_sections ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0'
        ))
        
        # Update existing sections to have sequential order based on id
        await conn.execute(text("""
            UPDATE proposal_sections ps
            SET "order" = subquery.row_num - 1
            FROM (
                SELECT id, ROW_NUMBER() OVER (PARTITION BY proposal_id ORDER BY id) as row_num
                FROM proposal_sections
            ) AS subquery
            WHERE ps.id = subquery.id
        """))
        
        print("✅ Added 'order' column to proposal_sections table")
        print("✅ Updated existing sections with sequential order")

async def downgrade():
    async with engine.begin() as conn:
        await conn.execute(text(
            'ALTER TABLE proposal_sections DROP COLUMN IF EXISTS "order"'
        ))
        print("✅ Removed 'order' column from proposal_sections table")

if __name__ == "__main__":
    print("Running migration: add_section_order")
    asyncio.run(upgrade())
    print("Migration completed successfully!")
