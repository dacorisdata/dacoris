import asyncio, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv; load_dotenv()
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@localhost:5432/dacoris")

async def main():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async with engine.connect() as c:
        r = await c.execute(text(
            "SELECT column_name, data_type, is_nullable, column_default "
            "FROM information_schema.columns "
            "WHERE table_name='users' ORDER BY ordinal_position"
        ))
        for row in r.fetchall():
            print(f"  {row[0]:<30} {row[1]:<25} nullable={row[2]}  default={row[3]}")
    await engine.dispose()

asyncio.run(main())
