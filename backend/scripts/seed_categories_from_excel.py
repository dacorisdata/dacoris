"""
Script to seed opportunity categories from the opportunities Excel file.
Extracts unique categories and creates them in the database.
"""
import asyncio
import pandas as pd
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import sys
import re

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from database import async_session_maker
from models import OpportunityCategory


def slugify(text: str) -> str:
    """Convert text to URL-friendly slug"""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text


def get_category_color(index: int) -> str:
    """Get a color for the category based on index"""
    colors = [
        "#3B82F6",  # Blue
        "#10B981",  # Green
        "#F59E0B",  # Amber
        "#EF4444",  # Red
        "#8B5CF6",  # Purple
        "#EC4899",  # Pink
        "#14B8A6",  # Teal
        "#F97316",  # Orange
        "#6366F1",  # Indigo
        "#84CC16",  # Lime
    ]
    return colors[index % len(colors)]


async def seed_categories():
    """Extract categories from Excel and seed database"""
    
    # Path to Excel file
    excel_path = Path(__file__).parent.parent / "data" / "opportunities.xlsx"
    
    if not excel_path.exists():
        print(f"❌ Excel file not found: {excel_path}")
        return
    
    print(f"📂 Reading Excel file: {excel_path}")
    
    try:
        # Read Excel file - try different header rows
        df = None
        category_column = None
        
        print("🔍 Searching for category column in Excel file...")
        
        # Try reading with different header rows (0-10)
        for header_row in range(11):
            try:
                temp_df = pd.read_excel(excel_path, header=header_row)
                
                # Check if this row has a category column
                for col in [
                    'CATEGORY /\nSECTOR',  # Exact match from Excel (with newline)
                    'CATEGORY / SECTOR', 'Category / Sector', 'category / sector',
                    'CATEGORY/SECTOR', 'Category/Sector', 'category/sector',
                    'category', 'Category', 'CATEGORY', 'categories', 'Categories',
                    'sector', 'Sector', 'SECTOR'
                ]:
                    if col in temp_df.columns:
                        df = temp_df
                        category_column = col
                        print(f"✓ Found category column '{col}' at header row {header_row}")
                        break
                
                if category_column:
                    break
            except:
                continue
        
        if df is None or category_column is None:
            print(f"❌ No category column found in Excel file.")
            print(f"   Please ensure the file has a 'category' column.")
            return
        
        print(f"✓ Loaded {len(df)} opportunities")
        
        print(f"✓ Found category column: '{category_column}'")
        
        # Extract unique categories
        categories = df[category_column].dropna().unique()
        print(f"✓ Found {len(categories)} unique categories")
        
        # Create database session
        async with async_session_maker() as db:
            # Get existing categories
            result = await db.execute(select(OpportunityCategory))
            existing_categories = {cat.name: cat for cat in result.scalars().all()}
            
            print(f"✓ Found {len(existing_categories)} existing categories in database")
            
            created_count = 0
            skipped_count = 0
            
            for idx, category_name in enumerate(sorted(categories)):
                category_name = str(category_name).strip()
                
                if not category_name or category_name.lower() in ['nan', 'none', '']:
                    continue
                
                if category_name in existing_categories:
                    print(f"  ⊘ Skipping existing: {category_name}")
                    skipped_count += 1
                    continue
                
                # Create new category
                slug = slugify(category_name)
                color = get_category_color(idx)
                
                new_category = OpportunityCategory(
                    name=category_name,
                    slug=slug,
                    color=color,
                    description=f"Category for {category_name} opportunities",
                    is_active=True
                )
                
                db.add(new_category)
                print(f"  ✓ Creating: {category_name} (slug: {slug}, color: {color})")
                created_count += 1
            
            # Commit all changes
            await db.commit()
            
            print(f"\n{'='*60}")
            print(f"✅ Seeding complete!")
            print(f"   Created: {created_count} categories")
            print(f"   Skipped: {skipped_count} categories (already exist)")
            print(f"   Total:   {created_count + skipped_count} categories")
            print(f"{'='*60}")
    
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    print("🌱 Starting category seeding from Excel file...")
    asyncio.run(seed_categories())
