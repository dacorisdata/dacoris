# Docker Update Guide - Preserve Database

This guide explains how to pull fresh Docker containers and redeploy your application while retaining all PostgreSQL database data.

## Overview

The key to preserving your database is ensuring the PostgreSQL data volume is not deleted during the update process. Docker volumes persist independently of containers.

## Prerequisites

- SSH access to your remote server
- Docker and Docker Compose installed
- Existing deployment running

## Step-by-Step Update Process

### 1. Connect to Remote Server

```bash
ssh user@your-server-ip
cd /path/to/dacoris
```

### 2. Backup Database (Recommended)

Before any update, create a backup:

```bash
# Create backup directory if it doesn't exist
mkdir -p backups

# Backup the database
docker-compose exec -T db pg_dump -U postgres dacoris > backups/dacoris_backup_$(date +%Y%m%d_%H%M%S).sql
```

### 3. Stop Running Containers

```bash
# Stop all containers without removing volumes
docker-compose down
```

**IMPORTANT:** Do NOT use `docker-compose down -v` as this will delete volumes including your database data.

### 4. Pull Latest Code

```bash
# Pull latest code from repository
git pull origin main
```

### 5. Pull Fresh Docker Images

```bash
# Pull latest images from registry or rebuild
docker-compose pull

# OR if you build images locally:
docker-compose build --no-cache
```

### 6. Start Updated Containers

```bash
# Start containers with fresh images
docker-compose up -d
```

### 7. Verify Database Data

```bash
# Check database is running
docker-compose ps

# Verify data exists
docker-compose exec db psql -U postgres -d dacoris -c "SELECT COUNT(*) FROM users;"
```

### 8. Check Application Logs

```bash
# View logs for all services
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

## Understanding Docker Volumes

### Check Existing Volumes

```bash
# List all volumes
docker volume ls

# Inspect the database volume
docker volume inspect dacoris_postgres_data
```

### Volume Configuration

Your `docker-compose.yml` should have a volume definition like:

```yaml
services:
  db:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

This named volume (`postgres_data`) persists even when containers are removed.

## Production Deployment Commands

### For Production Environment

```bash
# Stop production containers
docker-compose -f docker-compose.prod.yml down

# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Start with fresh containers
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Complete Update Script

Create a script `update-deployment.sh`:

```bash
#!/bin/bash

set -e  # Exit on error

echo "=== Starting Deployment Update ==="

# 1. Backup database
echo "Creating database backup..."
mkdir -p backups
docker-compose exec -T db pg_dump -U postgres dacoris > backups/dacoris_backup_$(date +%Y%m%d_%H%M%S).sql
echo "✓ Backup created"

# 2. Stop containers
echo "Stopping containers..."
docker-compose down
echo "✓ Containers stopped"

# 3. Pull latest code
echo "Pulling latest code..."
git pull origin main
echo "✓ Code updated"

# 4. Pull/build fresh images
echo "Pulling fresh Docker images..."
docker-compose pull
# OR: docker-compose build --no-cache
echo "✓ Images updated"

# 5. Start containers
echo "Starting updated containers..."
docker-compose up -d
echo "✓ Containers started"

# 6. Wait for services to be ready
echo "Waiting for services to start..."
sleep 10

# 7. Check database
echo "Verifying database..."
docker-compose exec -T db psql -U postgres -d dacoris -c "SELECT 'Database OK' as status;"
echo "✓ Database verified"

# 8. Show status
echo "=== Deployment Status ==="
docker-compose ps

echo ""
echo "=== Update Complete ==="
echo "View logs with: docker-compose logs -f"
```

Make it executable:

```bash
chmod +x update-deployment.sh
./update-deployment.sh
```

## Troubleshooting

### Database Connection Issues

```bash
# Check database container is running
docker-compose ps db

# Check database logs
docker-compose logs db

# Test connection
docker-compose exec db psql -U postgres -d dacoris -c "\dt"
```

### Data Not Appearing

```bash
# Verify volume is mounted
docker-compose exec db df -h /var/lib/postgresql/data

# Check volume contents
docker volume inspect dacoris_postgres_data
```

### Restore from Backup

If something goes wrong:

```bash
# Stop containers
docker-compose down

# Start only database
docker-compose up -d db

# Wait for database to be ready
sleep 5

# Restore backup
cat backups/dacoris_backup_YYYYMMDD_HHMMSS.sql | docker-compose exec -T db psql -U postgres dacoris

# Start all services
docker-compose up -d
```

## What Gets Updated vs Preserved

### Updated (Fresh Containers):
- ✓ Application code (backend/frontend)
- ✓ Dependencies and packages
- ✓ System configurations
- ✓ Docker images

### Preserved (Volumes):
- ✓ PostgreSQL database data
- ✓ User uploads (if using volumes)
- ✓ Any other mounted volumes

## Important Notes

1. **Never use `docker-compose down -v`** - This deletes volumes
2. **Always backup before updates** - Safety first
3. **Test in staging first** - If you have a staging environment
4. **Monitor logs** - Watch for errors during startup
5. **Database migrations** - May run automatically on startup

## Database Migrations

If your application has pending migrations:

```bash
# Run migrations manually if needed
docker-compose exec backend alembic upgrade head

# OR if using custom migration scripts
docker-compose exec backend python migrations/run_migrations.py
```

## Rollback Procedure

If the update fails:

```bash
# 1. Stop new containers
docker-compose down

# 2. Checkout previous code version
git checkout <previous-commit-hash>

# 3. Use previous images
docker-compose up -d

# 4. Restore database backup if needed
cat backups/latest_backup.sql | docker-compose exec -T db psql -U postgres dacoris
```

## Best Practices

1. **Schedule updates during low-traffic periods**
2. **Keep multiple backup copies**
3. **Test the update process in staging**
4. **Document any manual steps required**
5. **Monitor application health after update**
6. **Keep backup retention policy (e.g., last 7 days)**

## Automated Backup Cron Job

Add to crontab for daily backups:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/dacoris && docker-compose exec -T db pg_dump -U postgres dacoris > backups/dacoris_backup_$(date +\%Y\%m\%d).sql

# Keep only last 7 days of backups
0 3 * * * find /path/to/dacoris/backups -name "dacoris_backup_*.sql" -mtime +7 -delete
```

## Quick Reference Commands

```bash
# Update deployment (preserves DB)
docker-compose down && docker-compose pull && docker-compose up -d

# Backup database
docker-compose exec -T db pg_dump -U postgres dacoris > backup.sql

# Restore database
cat backup.sql | docker-compose exec -T db psql -U postgres dacoris

# View logs
docker-compose logs -f

# Check container status
docker-compose ps

# Restart specific service
docker-compose restart backend
```
