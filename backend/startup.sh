#!/bin/bash
set -e

echo "Starting DACORIS Backend..."

# Run admin initialization
echo "Checking for global admin account..."
python init_admin.py

# Start the application
echo "Starting Uvicorn server..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
