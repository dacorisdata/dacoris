"""
Kill blocking database sessions
"""
import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:d6xvCEiRaBMmOwWqg69Np67pqcYWhqTF@localhost:15432/dacoris")

if "asyncpg" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("Finding and terminating blocking sessions...")
    print("="*80)
    
    # Find idle in transaction sessions
    result = conn.execute(text("""
        SELECT 
            pid,
            usename,
            state,
            NOW() - state_change AS idle_duration,
            query
        FROM pg_stat_activity
        WHERE state = 'idle in transaction'
        AND pid != pg_backend_pid();
    """))
    
    sessions = result.fetchall()
    
    if not sessions:
        print("No blocking sessions found.")
    else:
        for session in sessions:
            pid = session[0]
            print(f"\nTerminating PID {pid}:")
            print(f"  User: {session[1]}")
            print(f"  State: {session[2]}")
            print(f"  Idle for: {session[3]}")
            print(f"  Last query: {session[4][:100]}...")
            
            # Terminate the session
            conn.execute(text(f"SELECT pg_terminate_backend({pid})"))
            conn.commit()
            print(f"  [OK] Terminated")
    
    print("\n" + "="*80)
    print("Done. You can now retry the migration.")
