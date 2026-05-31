# DACORIS Deployment Directory Structure

## Current Production Setup

The application is deployed directly in the `dacoris` user's home directory:

```
/home/dacoris/
├── backend/                    # Backend source code
├── frontend/                   # Frontend source code
├── nginx/                      # Nginx configuration
├── docker-compose.yml          # Main compose file (from docker-compose.prod.yml)
├── .env.production             # Environment variables
├── docker-compose.yml.backup   # Backup for rollback
├── health-check.sh             # Health monitoring script
├── backup.sh                   # Database backup script
└── [documentation files]       # Various .md files
```

## Backup Directory

```
/var/backups/dacoris/
├── prod-20240520_140000.sql.gz
├── prod-20240519_020000.sql.gz
└── [older backups...]
```

## Docker Containers

Running containers use the naming convention from `docker-compose.prod.yml`:

- `dacoris-db-prod` - PostgreSQL database
- `dacoris-backend-prod` - FastAPI backend
- `dacoris-frontend-prod` - Next.js frontend
- `dacoris-nginx-prod` - Nginx reverse proxy

## Volume Mounts

```yaml
volumes:
  - /home/dacoris/backend/uploads:/app/uploads  # File uploads
  - /home/dacoris/nginx/ssl:/etc/nginx/ssl      # SSL certificates
  - postgres_data:/var/lib/postgresql/data      # Database data
```

## CI/CD Deployment Flow

1. **GitHub Actions** pushes code changes
2. Files copied to `/home/dacoris/`:
   - `docker-compose.prod.yml` → `docker-compose.yml`
   - `nginx/` directory
   - `.env.production` (generated from secrets)
3. Docker Compose pulls and starts containers
4. Migrations run on `dacoris-backend-prod`
5. Health check verifies deployment

## Key Differences from Multi-Environment Setup

**Previous assumption** (incorrect):
```
/home/dacoris/
├── staging/
│   └── [deployment files]
└── production/
    └── [deployment files]
```

**Actual structure** (correct):
```
/home/dacoris/
└── [deployment files directly in home]
```

## Working with This Structure

### Deploy
```bash
cd /home/dacoris
docker-compose up -d
```

### View Logs
```bash
cd /home/dacoris
docker-compose logs -f
```

### Restart Services
```bash
cd /home/dacoris
docker-compose restart
```

### Rollback
```bash
cd /home/dacoris
mv docker-compose.yml.backup docker-compose.yml
docker-compose up -d
```

## Environment Variables

Located at `/home/dacoris/.env.production`, loaded by docker-compose:

```yaml
services:
  backend:
    env_file:
      - .env.production
```

## Notes

- All CI/CD workflows updated to use `/home/dacoris` as the deployment directory
- No separate staging/production subdirectories
- Backups stored in `/var/backups/dacoris/`
- Scripts and documentation files coexist with deployment files in home directory
