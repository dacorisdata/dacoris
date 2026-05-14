"""
Script to assign categories to existing opportunities based on the Excel file.
Matches opportunities by title and assigns categories from the CATEGORY/SECTOR column.
"""
import asyncio
import pandas as pd
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import sys

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from database import async_session_maker
from models import GrantOpportunity, OpportunityCategory, OpportunityCategories


async def assign_categories():
    """Assign categories to existing opportunities from Excel file"""
    
    # Path to Excel file
    excel_path = Path(__file__).parent.parent / "data" / "opportunities.xlsx"
    
    if not excel_path.exists():
        print(f"❌ Excel file not found: {excel_path}")
        return
    
    print(f"📂 Reading Excel file: {excel_path}")
    
    try:
        # Read Excel file with header row at index 2
        df = pd.read_excel(excel_path, header=2)
        print(f"✓ Loaded {len(df)} rows from Excel")
        
        # Create database session
        async with async_session_maker() as db:
            # Get all categories
            cat_result = await db.execute(select(OpportunityCategory))
            categories = {cat.name.lower(): cat for cat in cat_result.scalars().all()}
            print(f"✓ Found {len(categories)} categories in database")
            
            # Get all opportunities
            opp_result = await db.execute(select(GrantOpportunity))
            opportunities = {opp.title.lower(): opp for opp in opp_result.scalars().all()}
            print(f"✓ Found {len(opportunities)} opportunities in database")
            
            assigned_count = 0
            skipped_count = 0
            not_found_categories = set()
            
            for _, row in df.iterrows():
                # Skip empty rows
                if pd.isna(row.iloc[0]) or str(row.iloc[0]).strip() == '':
                    continue
                
                title = str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else None
                category_name = str(row.iloc[5]).strip() if pd.notna(row.iloc[5]) else None
                
                if not title or not category_name:
                    continue
                
                # Find opportunity by title (case-insensitive)
                opp = opportunities.get(title.lower())
                if not opp:
                    skipped_count += 1
                    continue
                
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
                assigned_count += 1
                print(f"  ✓ Assigned '{category.name}' to '{title[:50]}...'")
            
            # Commit all changes
            await db.commit()
            
            print(f"\n{'='*60}")
            print(f"✅ Category assignment complete!")
            print(f"   Assigned: {assigned_count} categories")
            print(f"   Skipped:  {skipped_count} (already assigned or not found)")
            
            if not_found_categories:
                print(f"\n⚠️  Categories not found in database:")
                for cat in sorted(not_found_categories):
                    print(f"   - {cat}")
                print(f"\n   Run 'Seed from Excel' on the categories page to create these.")
            
            print(f"{'='*60}")
    
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    print("🔗 Assigning categories to existing opportunities...")
    asyncio.run(assign_categories())
