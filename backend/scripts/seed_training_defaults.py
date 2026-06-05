"""
Seed core training programmes for all registered institutions.
Removes superseded legacy defaults and adds the current platform catalogue.

Usage: python scripts/seed_training_defaults.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import async_session_maker
from services.training_defaults import seed_all_institutions


async def main():
    async with async_session_maker() as db:
        result = await seed_all_institutions(db)
    print(f"Seeded training defaults for {result['institutions']} institution(s).")
    print(f"Programmes added: {result['programmes_added']}")


if __name__ == "__main__":
    asyncio.run(main())
