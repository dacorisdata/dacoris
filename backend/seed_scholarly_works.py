"""
Seed script for scholarly works mock data
Run this script to populate the database with 10 mock scholarly works
"""
import asyncio
import sys
from sqlalchemy.ext.asyncio import AsyncSession
from database import async_session_maker, init_db
from routes.scholarly_works import MOCK_WORKS
from models import ScholarlyWork, WorkAuthor, WorkInstitution, WorkFunder
from datetime import datetime
from sqlalchemy import select, func


async def seed_data():
    """Seed database with mock scholarly works"""
    print("Starting scholarly works seeding process...")
    
    # Initialize database
    await init_db()
    print("Database initialized")
    
    async with async_session_maker() as db:
        try:
            # Check if data already exists
            result = await db.execute(select(func.count(ScholarlyWork.id)))
            count = result.scalar()
            
            if count > 0:
                print(f"Database already contains {count} works. Skipping seed.")
                return
            
            print(f"Seeding {len(MOCK_WORKS)} scholarly works...")
            
            for idx, work_data in enumerate(MOCK_WORKS, 1):
                # Create work
                work = ScholarlyWork(
                    title=work_data["title"],
                    abstract=work_data["abstract"],
                    publication_year=work_data["publication_year"],
                    publication_date=datetime.strptime(work_data["publication_date"], "%Y-%m-%d").date(),
                    doi=work_data["doi"],
                    pmid=work_data.get("pmid"),
                    arxiv_id=work_data.get("arxiv_id"),
                    work_type=work_data["work_type"],
                    venue_name=work_data["venue_name"],
                    volume=work_data.get("volume"),
                    issue=work_data.get("issue"),
                    pages=work_data.get("pages"),
                    publisher=work_data["publisher"],
                    cited_by_count=work_data["cited_by_count"],
                    is_open_access=work_data["is_open_access"],
                    open_access_url=work_data.get("open_access_url"),
                    primary_topic=work_data["primary_topic"],
                    keywords=work_data["keywords"],
                    is_published=True,
                    is_retracted=False
                )
                db.add(work)
                await db.flush()
                
                # Add authors
                for author_data in work_data["authors"]:
                    author = WorkAuthor(
                        work_id=work.id,
                        author_name=author_data["name"],
                        author_position=author_data["position"],
                        is_corresponding=author_data["corresponding"],
                        orcid=author_data.get("orcid"),
                        affiliation_name=author_data["affiliation"],
                        affiliation_country=author_data["country"]
                    )
                    db.add(author)
                
                # Add institutions
                for inst_data in work_data["institutions"]:
                    institution = WorkInstitution(
                        work_id=work.id,
                        institution_name=inst_data["name"],
                        institution_country=inst_data["country"],
                        institution_type=inst_data["type"]
                    )
                    db.add(institution)
                
                # Add funders
                for funder_data in work_data["funders"]:
                    funder = WorkFunder(
                        work_id=work.id,
                        funder_name=funder_data["name"],
                        funder_country=funder_data["country"],
                        grant_number=funder_data["grant"],
                        award_amount=funder_data["amount"],
                        currency=funder_data["currency"]
                    )
                    db.add(funder)
                
                print(f"  [OK] Work {idx}/{len(MOCK_WORKS)}: {work_data['title'][:60]}...")
            
            await db.commit()
            print(f"\nSuccessfully seeded {len(MOCK_WORKS)} scholarly works!")
            print("Summary:")
            print(f"   - {len(MOCK_WORKS)} scholarly works")
            print(f"   - {sum(len(w['authors']) for w in MOCK_WORKS)} authors")
            print(f"   - {sum(len(w['institutions']) for w in MOCK_WORKS)} institution affiliations")
            print(f"   - {sum(len(w['funders']) for w in MOCK_WORKS)} funding records")
            
        except Exception as e:
            await db.rollback()
            print(f"ERROR seeding data: {str(e)}")
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(seed_data())
