import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import engine, init_db


async def migrate():
    await init_db()
    print("Postgraduate tables created via SQLAlchemy metadata")


if __name__ == '__main__':
    asyncio.run(migrate())
