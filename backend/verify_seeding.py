"""Quick verification script to check seeding results"""
import asyncio
from sqlalchemy import select, func
from database import async_session_maker
from models import OpportunityCategory, GrantOpportunity, OpportunityCategories

async def verify():
    async with async_session_maker() as db:
        # Count categories
        cat_count = await db.scalar(select(func.count()).select_from(OpportunityCategory))
        
        # Count opportunities
        opp_count = await db.scalar(select(func.count()).select_from(GrantOpportunity))
        
        # Count category links
        link_count = await db.scalar(select(func.count()).select_from(OpportunityCategories))
        
        print("="*60)
        print("📊 SEEDING VERIFICATION")
        print("="*60)
        print(f"✓ Categories:       {cat_count}")
        print(f"✓ Opportunities:    {opp_count}")
        print(f"✓ Category Links:   {link_count}")
        print("="*60)
        
        # Show sample categories
        result = await db.execute(select(OpportunityCategory).limit(5))
        categories = result.scalars().all()
        
        print("\n📁 Sample Categories:")
        for cat in categories:
            print(f"  - {cat.name} ({cat.color})")
        
        # Show sample opportunities with categories
        result = await db.execute(
            select(GrantOpportunity)
            .limit(5)
        )
        opportunities = result.scalars().all()
        
        print("\n💰 Sample Opportunities:")
        for opp in opportunities:
            print(f"  - {opp.title[:50]}...")
            print(f"    Category: {opp.category}")
        
        print("\n" + "="*60)
        print("✅ Verification Complete!")
        print("="*60)

if __name__ == "__main__":
    asyncio.run(verify())
