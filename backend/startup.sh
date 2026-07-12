#!/bin/bash
set -e

echo "Starting DACORIS Backend..."

# Remote DB is reached via SSH tunnel on the host (host.docker.internal:54321).
echo "Waiting for database..."
if ! python scripts/wait_for_db.py; then
  echo "ERROR: Cannot connect to PostgreSQL."
  echo "  1. Start the SSH tunnel first (keep the terminal open):"
  echo "     ssh -L 0.0.0.0:54321:172.19.0.2:5432 adminuser@41.89.92.140 -p 22000 -N"
  echo "  2. Then restart: docker compose restart backend"
  exit 1
fi

echo "Running database migrations..."
if ! alembic upgrade head; then
  echo "WARNING: Database migrations did not complete."
  echo "Run manually: docker compose exec backend alembic upgrade head"
fi

# One-time setup scripts — run in background so Uvicorn starts without waiting
# on slow remote DB queries over the SSH tunnel.
(
  echo "Running background initialization..."
  python init_admin.py || echo "WARNING: admin init skipped"
  python create_demo_user.py || echo "WARNING: demo user init skipped"
  python migrations/add_workflow_tables.py || echo "WARNING: workflow tables setup failed"
  python migrations/seed_default_workflows.py || echo "WARNING: workflow seed skipped"
  echo "Background initialization complete."
) &

echo "Starting Uvicorn server..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
