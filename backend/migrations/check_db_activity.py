"""
Check what's currently running in the database
"""
import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:d6xvCEiRaBMmOwWqg69Np67pqcYWhqTF@localhost:15432/dacoris")

if "asyncpg" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("Current database activity:")
    print("="*80)
    
    # Check active queries
    result = conn.execute(text("""
        SELECT 
            pid,
            usename,
            application_name,
            state,
            query,
            NOW() - query_start AS duration
        FROM pg_stat_activity
        WHERE state != 'idle'
        AND pid != pg_backend_pid()
        ORDER BY query_start;
    """))
    
    rows = result.fetchall()
    if rows:
        for row in rows:
            print(f"\nPID: {row[0]}")
            print(f"User: {row[1]}")
            print(f"App: {row[2]}")
            print(f"State: {row[3]}")
            print(f"Duration: {row[5]}")
            print(f"Query: {row[4][:200]}...")
    else:
        print("No active queries (other than this one)")
    
    print("\n" + "="*80)
    
    # Check locks
    result = conn.execute(text("""
        SELECT 
            l.locktype,
            l.relation::regclass,
            l.mode,
            l.granted,
            a.usename,
            a.query
        FROM pg_locks l
        JOIN pg_stat_activity a ON l.pid = a.pid
        WHERE NOT l.granted
        ORDER BY l.relation;
    """))
    
    locks = result.fetchall()
    if locks:
        print("\nBlocked locks found:")
        for lock in locks:
            print(f"  {lock[1]} - {lock[2]} - User: {lock[4]}")
    else:
        print("\nNo blocked locks")
