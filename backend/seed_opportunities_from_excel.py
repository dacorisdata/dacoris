"""
Seed grant opportunities from Excel file
Usage: python seed_opportunities_from_excel.py
"""
import asyncio
import pandas as pd
from datetime import datetime, timezone
from sqlalchemy import select
from database import async_session_maker
from models import GrantOpportunity, User, Institution

async def seed_opportunities():
    async with async_session_maker() as db:
        # Get the global admin user to use as created_by
        result = await db.execute(
            select(User).where(User.is_global_admin == True)
        )
        admin = result.scalar_one_or_none()
        
        if not admin:
            print("[ERROR] No global admin found. Please create an admin first.")
            return
        
        print(f"[INFO] Using admin user: {admin.email}")
        
        # Read the Excel file (header is in row 3, index 2)
        try:
            df = pd.read_excel('data/opportunities.xlsx', header=2)
            print(f"[INFO] Read {len(df)} rows from Excel file")
            print(f"[INFO] Columns: {df.columns.tolist()[:5]}...")  # Show first 5 columns
        except Exception as e:
            print(f"[ERROR] Failed to read Excel file: {e}")
            return
        
        # Map Excel columns to database fields
        # First, let's see what columns we have
        print("\n[INFO] Excel columns:")
        for i, col in enumerate(df.columns):
            print(f"  {i}: {col}")
        
        # Process each row
        created_count = 0
        skipped_count = 0
        
        for idx, row in df.iterrows():
            try:
                # Skip if source_id is empty or NaN
                source_id = str(row.iloc[0]) if pd.notna(row.iloc[0]) else None
                if not source_id or source_id == 'nan':
                    continue
                
                # Check if opportunity already exists
                result = await db.execute(
                    select(GrantOpportunity).where(GrantOpportunity.source_id == source_id)
                )
                if result.scalar_one_or_none():
                    print(f"[SKIP] Opportunity {source_id} already exists")
                    skipped_count += 1
                    continue
                
                # Extract data from row based on actual Excel structure
                # Index 0: OPPORTUNITY ID (source_id)
                # Index 1: SOURCE SYSTEM
                # Index 2: OPPORTUNITY TITLE
                # Index 3: SPONSOR / FUNDER
                # Index 4: SPONSOR TYPE
                # Index 5: CATEGORY / SECTOR
                # Index 6: GEOGRAPHY / COUNTY
                # Index 7: ELIGIBLE APPLICANTS
                # Index 8: FUNDING TYPE
                # Index 9: CCY
                # Index 10: MIN AWARD (KES/USD)
                # Index 11: MAX AWARD (KES/USD)
                # Index 12: OPEN DATE
                # Index 13: DEADLINE
                # Index 14: DAYS REMAINING
                # Index 15: STATUS
                # Index 16: ROUND / CYCLE
                # Index 17: CONTACT EMAIL
                # Index 18: OPPORTUNITY URL
                # Index 19: INTERNAL NOTES
                
                title = str(row.iloc[2]) if pd.notna(row.iloc[2]) else "Untitled Opportunity"
                sponsor = str(row.iloc[3]) if pd.notna(row.iloc[3]) else None
                category = str(row.iloc[5]) if pd.notna(row.iloc[5]) else None
                geography = str(row.iloc[6]) if pd.notna(row.iloc[6]) else None
                applicant_type = str(row.iloc[7]) if pd.notna(row.iloc[7]) else None
                funding_type = str(row.iloc[8]) if pd.notna(row.iloc[8]) else None
                
                # Build description from internal notes
                description = str(row.iloc[19]) if pd.notna(row.iloc[19]) else None
                
                # Amount fields
                currency = str(row.iloc[9]) if pd.notna(row.iloc[9]) else "KES"
                amount_min = float(row.iloc[10]) if pd.notna(row.iloc[10]) and str(row.iloc[10]).replace('.','').replace('-','').isdigit() else None
                amount_max = float(row.iloc[11]) if pd.notna(row.iloc[11]) and str(row.iloc[11]).replace('.','').replace('-','').isdigit() else None
                
                # Date fields
                open_date_val = row.iloc[12] if pd.notna(row.iloc[12]) else None
                deadline_val = row.iloc[13] if pd.notna(row.iloc[13]) else None
                
                # Convert dates
                open_date = None
                if open_date_val:
                    if isinstance(open_date_val, pd.Timestamp):
                        open_date = open_date_val.to_pydatetime()
                    elif isinstance(open_date_val, str):
                        try:
                            open_date = pd.to_datetime(open_date_val).to_pydatetime()
                        except:
                            pass
                
                deadline = None
                if deadline_val:
                    if isinstance(deadline_val, pd.Timestamp):
                        deadline = deadline_val.date()
                    elif isinstance(deadline_val, str):
                        try:
                            deadline = pd.to_datetime(deadline_val).date()
                        except:
                            pass
                
                # Other fields
                contact_email = str(row.iloc[17]) if pd.notna(row.iloc[17]) else None
                application_url = str(row.iloc[18]) if pd.notna(row.iloc[18]) else None
                status_val = str(row.iloc[15]) if pd.notna(row.iloc[15]) else "open"
                status = status_val.lower() if status_val else "open"
                
                # Eligibility is the applicant_type field
                eligibility = applicant_type
                criteria = None  # Not in Excel
                
                # Create opportunity
                opportunity = GrantOpportunity(
                    source_id=source_id,
                    title=title,
                    sponsor=sponsor,
                    description=description,
                    category=category,
                    geography=geography,
                    applicant_type=applicant_type,
                    funding_type=funding_type,
                    amount_min=amount_min,
                    amount_max=amount_max,
                    currency=currency,
                    open_date=open_date,
                    deadline=deadline,
                    eligibility=eligibility,
                    criteria=criteria,
                    application_url=application_url,
                    contact_email=contact_email,
                    status=status,
                    source_system="excel_import",
                    is_curated=True,
                    created_by_id=admin.id,
                )
                
                db.add(opportunity)
                created_count += 1
                print(f"[OK] Created: {source_id} - {title[:50]}")
                
            except Exception as e:
                print(f"[ERROR] Failed to process row {idx}: {e}")
                continue
        
        await db.commit()
        
        print("\n" + "="*60)
        print(f"[OK] Seeding complete!")
        print(f"  Created: {created_count}")
        print(f"  Skipped: {skipped_count}")
        print("="*60)

if __name__ == "__main__":
    asyncio.run(seed_opportunities())
