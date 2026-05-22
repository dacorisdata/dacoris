#!/bin/bash

# Run database migration using Docker
# This script executes the migration from within the backend container

echo "Running collaborator invitation migration..."

# Execute migration using docker exec with psql
docker exec -i dacoris-backend sh -c "PGPASSWORD=\${POSTGRES_PASSWORD:-d6xvCEiRaBMmOwWqg69Np67pqcYWhqTF} psql -h host.docker.internal -p 15432 -U postgres -d dacoris" < backend/migrations/add_collaborator_affiliation_and_invitation_token.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
else
    echo "❌ Migration failed. Check the error messages above."
    exit 1
fi
