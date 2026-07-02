"""Wait until PostgreSQL accepts connections. Used by startup.sh before migrations."""
import os
import sys
import time

import psycopg2

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    print("DATABASE_URL not set", file=sys.stderr)
    sys.exit(1)

# asyncpg URL -> psycopg2 DSN
dsn = (
    DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    .replace("postgresql+psycopg2://", "postgresql://")
)

max_attempts = int(os.getenv("DB_WAIT_ATTEMPTS", "30"))
delay_seconds = float(os.getenv("DB_WAIT_DELAY", "2"))

for attempt in range(1, max_attempts + 1):
    try:
        conn = psycopg2.connect(dsn, connect_timeout=5)
        conn.close()
        print(f"Database is ready (attempt {attempt}/{max_attempts})")
        sys.exit(0)
    except Exception as exc:
        print(f"Waiting for database ({attempt}/{max_attempts}): {exc}", file=sys.stderr)
        if attempt == max_attempts:
            print("Database not reachable — start the SSH tunnel first, then restart backend.", file=sys.stderr)
            sys.exit(1)
        time.sleep(delay_seconds)
