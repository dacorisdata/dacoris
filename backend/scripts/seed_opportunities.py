"""
Seed grant opportunities from Excel file into the database
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
import pandas as pd
from datetime import datetime, date
import os
from dotenv import load_dotenv

load_dotenv()

# Create synchronous engine for seeding
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@localhost:5432/dacoris")
# Convert async URL to sync URL
SYNC_DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
engine = create_engine(SYNC_DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Import models after engine is created
from models import GrantOpportunity, User, Base


def parse_date(date_str):
    """Parse date from various formats"""
    if pd.isna(date_str) or date_str == '' or date_str is None:
        return None
    
    if isinstance(date_str, (date, datetime)):
        return date_str if isinstance(date_str, date) else date_str.date()
    
    try:
        # Try parsing as datetime
        dt = pd.to_datetime(date_str)
        return dt.date() if not pd.isna(dt) else None
    except:
        return None


def parse_amount(amount_str):
    """Parse amount from string, handling KES prefix and commas"""
    if pd.isna(amount_str) or amount_str == '' or amount_str is None:
        return None
    
    try:
        # Convert to string and clean
        amount_str = str(amount_str).strip()
        # Remove currency symbols and commas
        amount_str = amount_str.replace('KES', '').replace('USD', '').replace(',', '').strip()
        return float(amount_str)
    except:
        return None


def seed_opportunities():
    """Load opportunities from Excel file and seed into database"""
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    
    try:
        # Get or create a system user for created_by
        system_user = db.query(User).filter(User.email == "system@dacoris.org").first()
        if not system_user:
            print("System user not found. Creating one...")
            system_user = User(
                email="system@dacoris.org",
                name="System User",
                password_hash="not_used",
                email_verified=True,
                primary_institution_id=1  # Assuming institution ID 1 exists
            )
            db.add(system_user)
            db.commit()
            db.refresh(system_user)
        
        # Load Excel file
        excel_path = Path(__file__).parent.parent / "data" / "opportunities.xlsx"
        
        if not excel_path.exists():
            print(f"❌ Excel file not found at: {excel_path}")
            return
        
        print(f"📂 Loading opportunities from: {excel_path}")
        # Excel has 2 header rows, actual data starts at row 3 (header=2)
        df = pd.read_excel(excel_path, header=2)
        
        # Clean column names
        df.columns = df.columns.str.strip()
        
        print(f"📊 Found {len(df)} opportunities in Excel file")
        print(f"📋 Columns: {list(df.columns)}")
        
        # Clear existing opportunities (optional - comment out to keep existing)
        existing_count = db.query(GrantOpportunity).count()
        if existing_count > 0:
            print(f"⚠️  Found {existing_count} existing opportunities in database")
            response = input("Do you want to delete existing opportunities? (yes/no): ")
            if response.lower() == 'yes':
                db.query(GrantOpportunity).delete()
                db.commit()
                print("🗑️  Deleted existing opportunities")
        
        # Process each row
        added_count = 0
        skipped_count = 0
        
        for idx, row in df.iterrows():
            try:
                # Map Excel columns to database fields
                title = row.get('OPPORTUNITY TITLE', 'Untitled Opportunity')
                
                # Skip if no title
                if pd.isna(title) or str(title).strip() == '':
                    skipped_count += 1
                    continue
                
                # Create new opportunity with all Excel fields
                opportunity = GrantOpportunity(
                    title=str(title).strip(),
                    sponsor=row.get('SPONSOR / FUNDER'),
                    description=row.get('INTERNAL NOTES'),  # Using internal notes as description
                    category=row.get('CATEGORY /\nSECTOR'),
                    geography=row.get('GEOGRAPHY /\nCOUNTY'),
                    applicant_type=row.get('ELIGIBLE\nAPPLICANTS'),
                    funding_type=row.get('FUNDING\nTYPE'),
                    amount_min=parse_amount(row.get('MIN AWARD\n(KES/USD)')),
                    amount_max=parse_amount(row.get('MAX AWARD\n(KES/USD)')),
                    currency=row.get('CCY', 'KES'),
                    open_date=parse_date(row.get('OPEN DATE')),
                    deadline=parse_date(row.get('DEADLINE')),
                    eligibility=row.get('ELIGIBLE\nAPPLICANTS'),
                    application_url=row.get('OPPORTUNITY URL'),
                    contact_email=row.get('CONTACT EMAIL'),
                    status=str(row.get('STATUS', 'open')).lower(),
                    is_curated=False,  # Default to not curated
                    source_system=row.get('SOURCE\nSYSTEM', 'excel_import'),
                    source_id=row.get('OPPORTUNITY ID\n(source_id)'),
                    created_by_id=system_user.id
                )
                
                db.add(opportunity)
                added_count += 1
                
                if (idx + 1) % 10 == 0:
                    print(f"✅ Processed {idx + 1}/{len(df)} opportunities...")
                
            except Exception as e:
                print(f"❌ Error processing row {idx + 1}: {e}")
                continue
        
        # Commit all changes
        db.commit()
        
        print("\n" + "="*60)
        print(f"✅ Successfully added {added_count} opportunities")
        print(f"⏭️  Skipped {skipped_count} duplicates")
        print(f"📊 Total opportunities in database: {db.query(GrantOpportunity).count()}")
        print("="*60)
        
    except Exception as e:
        print(f"❌ Error seeding opportunities: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("🌱 Starting opportunity seeding process...")
    seed_opportunities()
    print("✨ Seeding complete!")
