# DACORIS Docker Setup - Simple Guide

## Overview

DACORIS uses **2 Docker Compose files**:

1. **`docker-compose.yml`** - For **local development** (default)
2. **`docker-compose.prod.yml`** - For **production deployment**

## Quick Start - Local Development

### 1. Start the application

```powershell
# Option 1: Use the helper script
.\run-local.ps1 -d

# Option 2: Use docker-compose directly
docker-compose up -d
```

### 2. Stop the application

```powershell
# Option 1: Use the helper script
.\stop-local.ps1

# Option 2: Use docker-compose directly
docker-compose down

# To also remove volumes (fresh start)
docker-compose down -v
```

### 3. View logs

```powershell
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs -f frontend
```

## Local Development Configuration

All local settings are in **`.env.local`**:

```
ADMIN_EMAIL=admin@dacoris.com
ADMIN_PASSWORD=Admin123
ORCID_SANDBOX_MODE=true
FRONTEND_URL=http://localhost
```

**Access the app**: http://localhost

## Production Deployment

### 1. Create production environment file

```powershell
# Copy the example file
Copy-Item .env.production.example .env.production

# Edit .env.production and update ALL values
notepad .env.production
```

### 2. Deploy to production

```powershell
# Option 1: Use the helper script
.\run-prod.ps1 -d

# Option 2: Use docker-compose directly
docker-compose -f docker-compose.prod.yml up -d
```

### 3. Stop production

```powershell
# Option 1: Use the helper script
.\stop-prod.ps1

# Option 2: Use docker-compose directly
docker-compose -f docker-compose.prod.yml down
```

## File Structure

```
dacoris/
├── docker-compose.yml              # Local development (DEFAULT)
├── docker-compose.prod.yml         # Production deployment
├── .env.local                      # Local environment variables
├── .env.production                 # Production environment variables (create from example)
├── .env.production.example         # Template for production
├── run-local.ps1                   # Helper: Start local
├── stop-local.ps1                  # Helper: Stop local
├── run-prod.ps1                    # Helper: Start production
└── stop-prod.ps1                   # Helper: Stop production
```

## Common Commands

### Local Development

```powershell
# Start
docker-compose up -d

# Stop
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# Fresh start (removes database)
docker-compose down -v
docker-compose up -d

# View logs
docker-compose logs -f backend
```

### Production

```powershell
# Start
docker-compose -f docker-compose.prod.yml up -d

# Stop
docker-compose -f docker-compose.prod.yml down

# Rebuild
docker-compose -f docker-compose.prod.yml up -d --build

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Environment Variables

### Local (.env.local)

- **ADMIN_EMAIL**: admin@dacoris.com
- **ADMIN_PASSWORD**: Admin123
- **ORCID_SANDBOX_MODE**: true
- **FRONTEND_URL**: http://localhost
- **DATABASE_URL**: Uses local PostgreSQL

### Production (.env.production)

- **ADMIN_EMAIL**: Your production admin email
- **ADMIN_PASSWORD**: Strong password (16+ characters)
- **ORCID_SANDBOX_MODE**: false
- **FRONTEND_URL**: https://yourdomain.com
- **DATABASE_URL**: Production database
- **JWT_SECRET_KEY**: Strong random key
- **All secrets**: Must be changed from defaults!

## Troubleshooting

### Port conflicts

If port 80 is already in use:

```powershell
# Edit docker-compose.yml
# Change "80:80" to "8080:80"
# Access at http://localhost:8080
```

### Database issues

```powershell
# Reset database
docker-compose down -v
docker-compose up -d
```

### View container status

```powershell
docker-compose ps
```

### Access container shell

```powershell
docker exec -it dacoris-backend bash
docker exec -it dacoris-frontend sh
```

## Security Notes

1. **Never commit** `.env.local` or `.env.production` to git
2. **Change all passwords** in production
3. **Generate strong secrets** for JWT_SECRET_KEY
4. **Use HTTPS** in production (configure SSL certificates)
5. **Backup database** regularly in production

## Need Help?

- Check logs: `docker-compose logs -f`
- Check container status: `docker-compose ps`
- Restart: `docker-compose restart`
- Fresh start: `docker-compose down -v && docker-compose up -d`
