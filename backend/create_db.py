"""
Quick script to create the dacoris database.
Run this before migrations if the database doesn't exist.
"""
import asyncio
import asyncpg
from dotenv import load_dotenv
import os
from urllib.parse import unquote

load_dotenv()

async def create_database():
    # Parse DATABASE_URL to get connection details
    db_url = os.getenv("DATABASE_URL", "")
    # Example: postgresql+asyncpg://postgres:%40Waxmangme86@localhost:5432/dacoris
    
    if "://" not in db_url:
        print("Error: Could not parse DATABASE_URL from .env file")
        return
    
    # Remove the +asyncpg part if present
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    
    parts = db_url.split("://")[1]
    user_pass, host_port_db = parts.split("@")
    user, password = user_pass.split(":")
    host_port, dbname = host_port_db.split("/")
    host = host_port.split(":")[0]
    port = int(host_port.split(":")[1]) if ":" in host_port else 5432
    
    # URL decode password (e.g., %40 -> @)
    password = unquote(password)
    
    print(f"Connecting to PostgreSQL at {host}:{port} as user '{user}'...")
    
    try:
        # Connect to postgres database to create new database
        conn = await asyncpg.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database="postgres"
        )
        
        # Check if database exists
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", dbname
        )
        
        if exists:
            print(f"[OK] Database '{dbname}' already exists")
        else:
            await conn.execute(f'CREATE DATABASE {dbname}')
            print(f"[OK] Database '{dbname}' created successfully!")
        
        await conn.close()
        
    except Exception as e:
        print(f"[ERROR] {e}")
        print("\nMake sure PostgreSQL is running and credentials are correct in .env file")
        print(f"Attempted connection: {user}@{host}:{port}")

if __name__ == "__main__":
    asyncio.run(create_database())
