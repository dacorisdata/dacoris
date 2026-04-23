"""
Script to load sample grant opportunities from Excel file
Usage: python scripts/load_sample_opportunities.py
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

from services.opportunity_import import OpportunityImportService
from models import User
from sqlalchemy import select

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def load_opportunities():
    """Load sample opportunities from Excel file"""
    engine = create_async_engine(DATABASE_URL, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        # Get a system admin user to create the opportunities
        result = await db.execute(
            select(User).where(User.is_global_admin == True).limit(1)
        )
        admin_user = result.scalar_one_or_none()
        
        if not admin_user:
            print("❌ No global admin user found. Please create one first.")
            return
        
        print(f"✓ Using admin user: {admin_user.email}")
        
        # Path to Excel file
        excel_path = Path(__file__).parent.parent / "data" / "opportunities.xlsx"
        
        if not excel_path.exists():
            print(f"❌ Excel file not found: {excel_path}")
            return
        
        print(f"✓ Found Excel file: {excel_path}")
        
        # Parse Excel file
        print("\n📊 Parsing Excel file...")
        opportunities = OpportunityImportService.parse_excel_file(str(excel_path))
        print(f"✓ Found {len(opportunities)} opportunities in file")
        
        # Import opportunities
        print("\n📥 Importing opportunities...")
        created, skipped, errors = await OpportunityImportService.import_opportunities(
            db=db,
            opportunities=opportunities,
            created_by_id=admin_user.id,
            institution_id=None,  # Global opportunities
            skip_duplicates=True,
            update_existing=False
        )
        
        print(f"\n✅ Import complete!")
        print(f"   Created: {created}")
        print(f"   Skipped (duplicates): {skipped}")
        
        if errors:
            print(f"\n⚠️  Errors ({len(errors)}):")
            for error in errors[:10]:  # Show first 10 errors
                print(f"   - {error}")
            if len(errors) > 10:
                print(f"   ... and {len(errors) - 10} more")
    
    await engine.dispose()

if __name__ == "__main__":
    print("=" * 60)
    print("DACORIS - Load Sample Grant Opportunities")
    print("=" * 60)
    asyncio.run(load_opportunities())
