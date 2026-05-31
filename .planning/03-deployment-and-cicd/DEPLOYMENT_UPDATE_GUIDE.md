# DACORIS Deployment Update Guide

This guide provides step-by-step instructions for deploying new code changes to the production server after pushing to GitHub.

## Prerequisites

- SSH access to the production server (41.89.92.140)
- GitHub credentials (Personal Access Token recommended)
- Docker and Docker Compose installed on the server

## Deployment Steps

### 1. Connect to the Production Server

```bash
ssh adminuser@41.89.92.140
# Or switch to dacoris user
sudo su - dacoris
```

### 2. Navigate to Production Directory

```bash
cd /home/dacoris/production
```

### 3. Pull Latest Changes from GitHub

```bash
git pull origin main
```

**If prompted for credentials:**
- Username: Your GitHub username
- Password: Your GitHub Personal Access Token (not your password)

**If you encounter merge conflicts:**
```bash
# Check what files have conflicts
git status

# For config files, decide whether to keep local or remote version
# To keep remote version (recommended for code updates):
git checkout --theirs <filename>

# Add resolved files
git add <filename>

# Complete the merge
git commit -m "Merge remote changes"
```

### 4. Check What Changed

```bash
# View recent commits
git log -3 --oneline

# View changed files
git diff HEAD~1 --name-only
```

### 5. Rebuild Docker Images

**If backend code changed:**
```bash
sudo docker compose build backend
```

**If frontend code changed:**
```bash
sudo docker compose build frontend
```

**If both changed:**
```bash
sudo docker compose build backend frontend
```

### 6. Stop and Remove Old Containers

**Backend:**
```bash
docker stop dacoris-backend
docker rm dacoris-backend
```

**Frontend:**
```bash
docker stop dacoris-frontend
docker rm dacoris-frontend
```

### 7. Run Database Migrations (if needed)

```bash
docker run --rm \
  --network production_dacoris-network \
  -e DATABASE_URL="postgresql+asyncpg://postgres:d6xvCEiRaBMmOwWqg69Np67pqcYWhqTF@db:5432/dacoris" \
  production-backend \
  alembic upgrade head
```

### 8. Create New Containers

**Backend:**
```bash
docker run -d \
  --name dacoris-backend \
  --network production_dacoris-network \
  --network-alias backend \
  --network-alias dacoris-backend \
  -p 8000:8000 \
  -e DATABASE_URL="postgresql+asyncpg://postgres:d6xvCEiRaBMmOwWqg69Np67pqcYWhqTF@db:5432/dacoris" \
  production-backend
```

**Frontend:**
```bash
docker run -d \
  --name dacoris-frontend \
  --network production_dacoris-network \
  --network-alias frontend \
  --network-alias dacoris-frontend \
  -p 3000:3000 \
  production-frontend
```

### 9. Verify Deployment

```bash
# Wait for containers to start
sleep 10

# Check container status
docker ps | grep dacoris

# Check backend logs
docker logs dacoris-backend --tail=30

# Check frontend logs
docker logs dacoris-frontend --tail=30

# Test API health
curl http://localhost/api/health

# Test frontend
curl -I http://localhost
```

### 10. Browser Verification

Visit **http://41.89.92.140** in your browser and:
1. Do a hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. Or clear cache and reload
3. Or open in incognito/private window

## Quick Deployment Script

For convenience, you can create a deployment script:

```bash
#!/bin/bash
# save as: /home/dacoris/production/deploy.sh

echo "🚀 Starting DACORIS deployment..."

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Rebuild images
echo "🔨 Rebuilding Docker images..."
sudo docker compose build backend frontend

# Stop old containers
echo "🛑 Stopping old containers..."
docker stop dacoris-backend dacoris-frontend
docker rm dacoris-backend dacoris-frontend

# Run migrations
echo "📊 Running database migrations..."
docker run --rm \
  --network production_dacoris-network \
  -e DATABASE_URL="postgresql+asyncpg://postgres:d6xvCEiRaBMmOwWqg69Np67pqcYWhqTF@db:5432/dacoris" \
  production-backend \
  alembic upgrade head

# Start new containers
echo "🚀 Starting new containers..."
docker run -d \
  --name dacoris-backend \
  --network production_dacoris-network \
  --network-alias backend \
  --network-alias dacoris-backend \
  -p 8000:8000 \
  -e DATABASE_URL="postgresql+asyncpg://postgres:d6xvCEiRaBMmOwWqg69Np67pqcYWhqTF@db:5432/dacoris" \
  production-backend

docker run -d \
  --name dacoris-frontend \
  --network production_dacoris-network \
  --network-alias frontend \
  --network-alias dacoris-frontend \
  -p 3000:3000 \
  production-frontend

# Wait and verify
echo "⏳ Waiting for containers to start..."
sleep 10

echo "✅ Checking deployment status..."
docker ps | grep dacoris

echo "🏥 Testing API health..."
curl http://localhost/api/health

echo "✨ Deployment complete!"
echo "🌐 Visit: http://41.89.92.140"
echo "📚 API Docs: http://41.89.92.140/apiDocs"
```

**To use the script:**
```bash
# Make it executable
chmod +x /home/dacoris/production/deploy.sh

# Run it
./deploy.sh
```

## Troubleshooting

### Containers won't start
```bash
# Check logs for errors
docker logs dacoris-backend
docker logs dacoris-frontend

# Check if ports are already in use
sudo netstat -tulpn | grep -E '3000|8000'
```

### Database connection issues
```bash
# Verify database is running
docker ps | grep dacoris-db

# Check database logs
docker logs dacoris-db --tail=50

# Test database connection
docker exec -it dacoris-db psql -U postgres -d dacoris -c "SELECT 1;"
```

### Nginx 502 errors
```bash
# Check if backend/frontend have correct network aliases
docker inspect dacoris-backend | grep -A 10 "Networks"
docker inspect dacoris-frontend | grep -A 10 "Networks"

# Restart nginx
docker restart dacoris-nginx
```

### Old code still showing in browser
1. Hard refresh: `Ctrl+Shift+R` or `Cmd+Shift+R`
2. Clear browser cache
3. Open in incognito/private window
4. Check if container is using new image:
   ```bash
   docker inspect dacoris-frontend | grep -E "(Image|Created)"
   ```

## Rollback Procedure

If something goes wrong, you can rollback:

```bash
# Check previous commits
git log --oneline

# Rollback to previous commit
git reset --hard <commit-hash>

# Rebuild and redeploy
sudo docker compose build backend frontend
# Then follow steps 6-9 above
```

## Important Notes

- Always test in a staging environment first if available
- Keep database backups before major updates
- Monitor logs after deployment for any errors
- The database container (`dacoris-db`) should NOT be stopped during updates
- Network aliases (`backend`, `frontend`, `db`) are critical for nginx routing

## Production URLs

- **Main Application**: http://41.89.92.140
- **API Health Check**: http://41.89.92.140/api/health
- **API Documentation**: http://41.89.92.140/apiDocs
- **OpenAPI Spec**: http://41.89.92.140/openapi.json

## Support

For issues or questions, contact the development team or refer to the main deployment guide at `LINUX_DEPLOYMENT_GUIDE.md`.
