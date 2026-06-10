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

# Ensure workflow tables and default review workflows exist
echo "Setting up workflow tables and defaults..."
python migrations/add_workflow_tables.py || echo "WARNING: workflow tables setup failed"
python migrations/seed_default_workflows.py || echo "WARNING: workflow seed skipped (already exists)"

# Start the application
echo "Starting Uvicorn server..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
