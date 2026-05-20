# DACORIS Production Deployment Guide
## Using docker-compose.prod.yml

This guide provides step-by-step instructions for deploying DACORIS to your production server using `docker-compose.prod.yml`.

## Prerequisites

- SSH access to production server (41.89.92.140)
- Docker and Docker Compose installed on server
- GitHub access (for pulling latest code)
- `.env.production` file configured on server

---

## Quick Deployment (Recommended)

### 1. SSH into Production Server

```bash
ssh adminuser@41.89.92.140
# Switch to dacoris user
sudo su - dacoris
```

### 2. Navigate to Production Directory

```bash
cd /home/dacoris/production
```

### 3. Pull Latest Code from GitHub

```bash
git pull origin main
```

**If prompted for credentials:**
- Username: Your GitHub username
- Password: Your GitHub Personal Access Token

### 4. Deploy with Docker Compose

```bash
# Stop and remove existing containers (preserves database)
docker compose -f docker-compose.prod.yml --env-file .env.production down

# Pull/rebuild images and start all services
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# View logs to verify deployment
docker compose -f docker-compose.prod.yml logs -f
```

### 5. Verify Deployment

```bash
# Check all containers are running
docker compose -f docker-compose.prod.yml ps

# Test API health
curl http://localhost/api/health

# Check backend logs
docker compose -f docker-compose.prod.yml logs backend --tail=50

# Check frontend logs
docker compose -f docker-compose.prod.yml logs frontend --tail=50
```

### 6. Browser Verification

Visit **http://41.89.92.140** and do a hard refresh:
- Windows/Linux: `Ctrl+Shift+R`
- Mac: `Cmd+Shift+R`

---

## Detailed Step-by-Step Deployment

### Step 1: Connect to Server

```bash
ssh adminuser@41.89.92.140
sudo su - dacoris
cd /home/dacoris/production
```

### Step 2: Backup Database (Recommended)

```bash
# Create backup directory if it doesn't exist
mkdir -p /var/backups/dacoris

# Backup current database
docker exec dacoris-db-prod pg_dump -U postgres dacoris | gzip > /var/backups/dacoris/backup-$(date +%Y%m%d_%H%M%S).sql.gz
```

### Step 3: Pull Latest Changes

```bash
# Check current status
git status

# Pull latest code
git pull origin main

# View what changed
git log -3 --oneline
git diff HEAD~1 --name-only
```

### Step 4: Update Environment Variables (if needed)

```bash
# Edit production environment file
nano .env.production

# Ensure required variables are set:
# DB_USER, DB_PASSWORD, DB_NAME
# ORCID_CLIENT_ID, ORCID_CLIENT_SECRET
# SECRET_KEY
```

### Step 5: Deploy Services

**Option A: Full Deployment (Recommended)**

```bash
# Stop all services
docker compose -f docker-compose.prod.yml down

# Rebuild and start all services
docker compose -f docker-compose.prod.yml up -d --build

# Follow logs
docker compose -f docker-compose.prod.yml logs -f
```

**Option B: Selective Service Update**

```bash
# Rebuild only backend
docker compose -f docker-compose.prod.yml up -d --build backend

# Rebuild only frontend
docker compose -f docker-compose.prod.yml up -d --build frontend

# Restart nginx
docker compose -f docker-compose.prod.yml restart nginx
```

### Step 6: Run Database Migrations (if needed)

```bash
# Run migrations using docker compose
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head

# Or run migrations before starting services
docker compose -f docker-compose.prod.yml run --rm backend alembic upgrade head
```

### Step 7: Verify All Services

```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Expected output:
# NAME                    STATUS              PORTS
# dacoris-backend-prod    Up X minutes        
# dacoris-db-prod         Up X minutes (healthy)
# dacoris-frontend-prod   Up X minutes        
# dacoris-nginx-prod      Up X minutes        0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

### Step 8: Check Service Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs --tail=50

# Specific service
docker compose -f docker-compose.prod.yml logs backend --tail=50
docker compose -f docker-compose.prod.yml logs frontend --tail=50
docker compose -f docker-compose.prod.yml logs db --tail=50
docker compose -f docker-compose.prod.yml logs nginx --tail=50

# Follow logs in real-time
docker compose -f docker-compose.prod.yml logs -f backend
```

### Step 9: Health Checks

```bash
# Test API endpoint
curl http://localhost/api/health

# Test frontend
curl -I http://localhost

# Check database connection
docker compose -f docker-compose.prod.yml exec db psql -U postgres -d dacoris -c "SELECT 1;"

# Check API documentation
curl http://localhost/apiDocs
```

---

## One-Line Deployment Script

Create a quick deployment script:

```bash
# Create deploy script
cat > /home/dacoris/production/deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting DACORIS deployment..."

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Backup database
echo "💾 Creating database backup..."
mkdir -p /var/backups/dacoris
docker exec dacoris-db-prod pg_dump -U postgres dacoris | gzip > /var/backups/dacoris/backup-$(date +%Y%m%d_%H%M%S).sql.gz

# Deploy with docker compose
echo "🐳 Deploying services..."
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 15

# Run migrations
echo "📊 Running database migrations..."
docker compose -f docker-compose.prod.yml exec -T backend alembic upgrade head

# Verify deployment
echo "✅ Verifying deployment..."
docker compose -f docker-compose.prod.yml ps

echo "🏥 Testing API health..."
curl -f http://localhost/api/health || echo "⚠️  API health check failed"

echo "✨ Deployment complete!"
echo "🌐 Visit: http://41.89.92.140"
EOF

# Make executable
chmod +x /home/dacoris/production/deploy.sh
```

**Run deployment:**

```bash
./deploy.sh
```

---

## Common Docker Compose Commands

### Service Management

```bash
# Start all services
docker compose -f docker-compose.prod.yml up -d

# Stop all services (preserves data)
docker compose -f docker-compose.prod.yml down

# Stop all services and remove volumes (⚠️ DELETES DATABASE)
docker compose -f docker-compose.prod.yml down -v

# Restart specific service
docker compose -f docker-compose.prod.yml restart backend

# Rebuild and restart service
docker compose -f docker-compose.prod.yml up -d --build backend
```

### Monitoring

```bash
# View running containers
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f

# View resource usage
docker stats

# Execute command in container
docker compose -f docker-compose.prod.yml exec backend bash
docker compose -f docker-compose.prod.yml exec db psql -U postgres dacoris
```

### Cleanup

```bash
# Remove stopped containers
docker compose -f docker-compose.prod.yml rm

# Remove unused images
docker image prune -a

# Remove unused volumes (⚠️ BE CAREFUL)
docker volume prune

# Full cleanup (⚠️ REMOVES EVERYTHING)
docker system prune -a --volumes
```

---

## Troubleshooting

### Containers Won't Start

```bash
# Check logs for errors
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs frontend

# Check if ports are in use
sudo netstat -tulpn | grep -E '80|443|3000|8000|5432'

# Restart services
docker compose -f docker-compose.prod.yml restart
```

### Database Connection Issues

```bash
# Check database health
docker compose -f docker-compose.prod.yml ps db

# View database logs
docker compose -f docker-compose.prod.yml logs db

# Test connection
docker compose -f docker-compose.prod.yml exec db psql -U postgres -d dacoris -c "SELECT version();"

# Check environment variables
docker compose -f docker-compose.prod.yml exec backend env | grep DATABASE
```

### Nginx 502 Bad Gateway

```bash
# Check if backend/frontend are running
docker compose -f docker-compose.prod.yml ps

# Check nginx logs
docker compose -f docker-compose.prod.yml logs nginx

# Verify network connectivity
docker compose -f docker-compose.prod.yml exec nginx ping backend
docker compose -f docker-compose.prod.yml exec nginx ping frontend

# Restart nginx
docker compose -f docker-compose.prod.yml restart nginx
```

### Old Code Still Showing

```bash
# Rebuild with no cache
docker compose -f docker-compose.prod.yml build --no-cache frontend

# Force recreate containers
docker compose -f docker-compose.prod.yml up -d --force-recreate

# Clear browser cache or use incognito mode
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Check Docker disk usage
docker system df

# Clean up unused images
docker image prune -a

# Clean up build cache
docker builder prune -a
```

---

## Rollback Procedure

If deployment fails, rollback to previous version:

```bash
# View commit history
git log --oneline

# Rollback to previous commit
git reset --hard <commit-hash>

# Redeploy
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build

# Or restore from backup
gunzip < /var/backups/dacoris/backup-YYYYMMDD_HHMMSS.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U postgres dacoris
```

---

## Environment Variables

Ensure `.env.production` contains:

```env
# Database
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_NAME=dacoris

# ORCID
ORCID_CLIENT_ID=your_orcid_client_id
ORCID_CLIENT_SECRET=your_orcid_client_secret

# Security
SECRET_KEY=your_secret_key_here

# Optional
ENVIRONMENT=production
```

---

## Production URLs

- **Main Application**: http://41.89.92.140
- **API Health**: http://41.89.92.140/api/health
- **API Docs**: http://41.89.92.140/apiDocs
- **OpenAPI Spec**: http://41.89.92.140/openapi.json

---

## Best Practices

1. **Always backup database before deployment**
2. **Test in staging environment first** (if available)
3. **Monitor logs during deployment**
4. **Never stop the database container** unless absolutely necessary
5. **Keep `.env.production` secure** and never commit to git
6. **Use `--build` flag** to ensure latest code is deployed
7. **Verify health checks** after deployment
8. **Clear browser cache** to see latest frontend changes

---

## Support

For issues or questions:
- Check logs: `docker compose -f docker-compose.prod.yml logs`
- Review other deployment guides: `DEPLOYMENT_UPDATE_GUIDE.md`, `LINUX_DEPLOYMENT_GUIDE.md`
- Contact development team

---

## Quick Reference

```bash
# Full deployment
cd /home/dacoris/production
git pull origin main
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f

# Check status
docker compose -f docker-compose.prod.yml ps
curl http://localhost/api/health

# View logs
docker compose -f docker-compose.prod.yml logs backend --tail=50

# Restart service
docker compose -f docker-compose.prod.yml restart backend
```
