"""
Complete seeding script for categories and opportunities with category assignments
This script:
1. Seeds categories from the Excel file
2. Seeds opportunities from the Excel file
3. Links opportunities to their categories
"""
import asyncio
import pandas as pd
import re
from pathlib import Path
from sqlalchemy import select
from database import async_session_maker
from models import OpportunityCategory, GrantOpportunity, OpportunityCategories, User


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


async def seed_complete():
    """Complete seeding process"""
    
    excel_path = Path(__file__).parent / "data" / "opportunities.xlsx"
    
    if not excel_path.exists():
        print(f"❌ Excel file not found: {excel_path}")
        return
    
    print("="*60)
    print("🌱 DACORIS Complete Seeding Script")
    print("="*60)
    
    async with async_session_maker() as db:
        # Get global admin
        result = await db.execute(select(User).where(User.is_global_admin == True))
        admin = result.scalar_one_or_none()
        
        if not admin:
            print("❌ No global admin found. Please create an admin first.")
            return
        
        print(f"✓ Using admin user: {admin.email}\n")
        
        # Read Excel file
        print("📂 Reading Excel file...")
        try:
            df = pd.read_excel(excel_path, header=2)
            print(f"✓ Loaded {len(df)} rows from Excel\n")
        except Exception as e:
            print(f"❌ Failed to read Excel: {e}")
            return
        
        # STEP 1: Seed Categories
        print("="*60)
        print("STEP 1: Seeding Categories")
        print("="*60)
        
        # Extract unique categories from column index 5 (CATEGORY / SECTOR)
        categories_raw = df.iloc[:, 5].dropna().unique()
        categories_list = sorted([str(cat).strip() for cat in categories_raw if str(cat).strip() and str(cat).lower() not in ['nan', 'none', '']])
        
        print(f"✓ Found {len(categories_list)} unique categories\n")
        
        # Get existing categories
        result = await db.execute(select(OpportunityCategory))
        existing_categories = {cat.name: cat for cat in result.scalars().all()}
        
        category_map = {}  # Map category name to category object
        created_cats = 0
        
        for idx, category_name in enumerate(categories_list):
            if category_name in existing_categories:
                print(f"  ⊘ Exists: {category_name}")
                category_map[category_name] = existing_categories[category_name]
            else:
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
                await db.flush()  # Flush to get ID
                category_map[category_name] = new_category
                print(f"  ✓ Created: {category_name} (color: {color})")
                created_cats += 1
        
        await db.commit()
        print(f"\n✅ Categories: Created {created_cats}, Total {len(category_map)}\n")
        
        # STEP 2: Seed Opportunities with Category Links
        print("="*60)
        print("STEP 2: Seeding Opportunities with Category Links")
        print("="*60)
        
        created_opps = 0
        skipped_opps = 0
        linked_cats = 0
        
        for idx, row in df.iterrows():
            try:
                # Get source_id (column 0)
                source_id = str(row.iloc[0]) if pd.notna(row.iloc[0]) else None
                if not source_id or source_id == 'nan':
                    continue
                
                # Check if exists
                result = await db.execute(
                    select(GrantOpportunity).where(GrantOpportunity.source_id == source_id)
                )
                existing_opp = result.scalar_one_or_none()
                
                if existing_opp:
                    print(f"  ⊘ Exists: {source_id}")
                    skipped_opps += 1
                    
                    # Still link categories if not linked
                    category_name = str(row.iloc[5]) if pd.notna(row.iloc[5]) else None
                    if category_name and category_name in category_map:
                        # Check if link exists
                        result = await db.execute(
                            select(OpportunityCategories).where(
                                OpportunityCategories.opportunity_id == existing_opp.id,
                                OpportunityCategories.category_id == category_map[category_name].id
                            )
                        )
                        if not result.scalar_one_or_none():
                            link = OpportunityCategories(
                                opportunity_id=existing_opp.id,
                                category_id=category_map[category_name].id
                            )
                            db.add(link)
                            linked_cats += 1
                    continue
                
                # Extract data
                title = str(row.iloc[2]) if pd.notna(row.iloc[2]) else "Untitled Opportunity"
                sponsor = str(row.iloc[3]) if pd.notna(row.iloc[3]) else None
                category_name = str(row.iloc[5]) if pd.notna(row.iloc[5]) else None
                geography = str(row.iloc[6]) if pd.notna(row.iloc[6]) else None
                applicant_type = str(row.iloc[7]) if pd.notna(row.iloc[7]) else None
                funding_type = str(row.iloc[8]) if pd.notna(row.iloc[8]) else None
                description = str(row.iloc[19]) if pd.notna(row.iloc[19]) else None
                
                # Amounts
                currency = str(row.iloc[9]) if pd.notna(row.iloc[9]) else "KES"
                amount_min = float(row.iloc[10]) if pd.notna(row.iloc[10]) and str(row.iloc[10]).replace('.','').replace('-','').isdigit() else None
                amount_max = float(row.iloc[11]) if pd.notna(row.iloc[11]) and str(row.iloc[11]).replace('.','').replace('-','').isdigit() else None
                
                # Dates
                open_date = None
                if pd.notna(row.iloc[12]):
                    try:
                        open_date = pd.to_datetime(row.iloc[12]).to_pydatetime()
                    except:
                        pass
                
                deadline = None
                if pd.notna(row.iloc[13]):
                    try:
                        deadline = pd.to_datetime(row.iloc[13]).date()
                    except:
                        pass
                
                # Other fields
                contact_email = str(row.iloc[17]) if pd.notna(row.iloc[17]) else None
                application_url = str(row.iloc[18]) if pd.notna(row.iloc[18]) else None
                status = str(row.iloc[15]).lower() if pd.notna(row.iloc[15]) else "open"
                
                # Create opportunity
                opportunity = GrantOpportunity(
                    source_id=source_id,
                    title=title,
                    sponsor=sponsor,
                    description=description,
                    category=category_name,  # Keep for backward compatibility
                    geography=geography,
                    applicant_type=applicant_type,
                    funding_type=funding_type,
                    amount_min=amount_min,
                    amount_max=amount_max,
                    currency=currency,
                    open_date=open_date,
                    deadline=deadline,
                    eligibility=applicant_type,
                    application_url=application_url,
                    contact_email=contact_email,
                    status=status,
                    source_system="excel_import",
                    is_curated=True,
                    created_by_id=admin.id,
                )
                
                db.add(opportunity)
                await db.flush()  # Flush to get ID
                
                # Link to category
                if category_name and category_name in category_map:
                    link = OpportunityCategories(
                        opportunity_id=opportunity.id,
                        category_id=category_map[category_name].id
                    )
                    db.add(link)
                    linked_cats += 1
                
                print(f"  ✓ Created: {source_id} - {title[:40]}... → {category_name}")
                created_opps += 1
                
            except Exception as e:
                print(f"  ❌ Error row {idx}: {e}")
                continue
        
        await db.commit()
        
        print("\n" + "="*60)
        print("✅ SEEDING COMPLETE!")
        print("="*60)
        print(f"Categories:")
        print(f"  - Created: {created_cats}")
        print(f"  - Total:   {len(category_map)}")
        print(f"\nOpportunities:")
        print(f"  - Created: {created_opps}")
        print(f"  - Skipped: {skipped_opps}")
        print(f"  - Total:   {created_opps + skipped_opps}")
        print(f"\nCategory Links:")
        print(f"  - Linked:  {linked_cats}")
        print("="*60)


if __name__ == "__main__":
    asyncio.run(seed_complete())
