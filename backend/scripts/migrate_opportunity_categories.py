"""
Script to migrate existing opportunity categories from the old 'category' string field
to the new OpportunityCategories many-to-many relationship.
"""
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from database import async_session_maker
from models import GrantOpportunity, OpportunityCategory, OpportunityCategories


async def migrate_categories():
    """Migrate category strings to category relationships"""
    
    print("🔄 Starting category migration...")
    
    async with async_session_maker() as db:
        # Get all opportunities with a category value
        result = await db.execute(
            select(GrantOpportunity).where(GrantOpportunity.category.isnot(None))
        )
        opportunities = result.scalars().all()
        
        print(f"✓ Found {len(opportunities)} opportunities with categories")
        
        # Get all categories
        cat_result = await db.execute(select(OpportunityCategory))
        categories = {cat.name.lower(): cat for cat in cat_result.scalars().all()}
        
        print(f"✓ Found {len(categories)} categories in database")
        
        migrated_count = 0
        skipped_count = 0
        not_found_categories = set()
        
        for opp in opportunities:
            if not opp.category or opp.category.strip() == '':
                skipped_count += 1
                continue
            
            category_name = opp.category.strip()
            
            # Find category by name (case-insensitive)
            category = categories.get(category_name.lower())
            
            if not category:
                not_found_categories.add(category_name)
                skipped_count += 1
                continue
            
            # Check if relationship already exists
            existing = await db.execute(
                select(OpportunityCategories).where(
                    OpportunityCategories.opportunity_id == opp.id,
                    OpportunityCategories.category_id == category.id
                )
            )
            
            if existing.scalar_one_or_none():
                skipped_count += 1
                continue
            
            # Create the relationship
            opp_cat = OpportunityCategories(
                opportunity_id=opp.id,
                category_id=category.id
            )
            db.add(opp_cat)
            migrated_count += 1
            print(f"  ✓ Migrated '{category.name}' for '{opp.title[:50]}...'")
        
        # Commit all changes
        await db.commit()
        
        print(f"\n{'='*60}")
        print(f"✅ Migration complete!")
        print(f"   Migrated: {migrated_count} category assignments")
        print(f"   Skipped:  {skipped_count} (already migrated or no match)")
        
        if not_found_categories:
            print(f"\n⚠️  Categories not found in database:")
            for cat in sorted(not_found_categories):
                print(f"   - {cat}")
            print(f"\n   These categories need to be created first.")
            print(f"   Run 'Seed from Excel' on the categories page.")
        
        print(f"{'='*60}")


if __name__ == "__main__":
    print("🔄 Migrating opportunity categories...")
    asyncio.run(migrate_categories())
