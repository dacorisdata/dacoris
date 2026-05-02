import asyncio
from sqlalchemy import select, func
from database import async_session_maker
from models import GrantOpportunity

async def verify():
    async with async_session_maker() as db:
        result = await db.execute(select(func.count()).select_from(GrantOpportunity))
        count = result.scalar()
        print(f"Total opportunities in database: {count}")
        
        # Show first 5
        result = await db.execute(select(GrantOpportunity).limit(5))
        opps = result.scalars().all()
        print("\nFirst 5 opportunities:")
        for opp in opps:
            print(f"  - {opp.source_id}: {opp.title[:60]}")

asyncio.run(verify())
