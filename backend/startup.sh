#!/bin/bash
set -e

echo "Starting DACORIS Backend..."

# Apply database migrations (do not block startup if DB is already provisioned)
echo "Running database migrations..."
if ! alembic upgrade head; then
  echo "WARNING: Database migrations did not complete."
  echo "Run manually: docker compose exec backend alembic upgrade head"
fi

# Run admin initialization
echo "Checking for global admin account..."
python init_admin.py

# Start the application
echo "Starting Uvicorn server..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
