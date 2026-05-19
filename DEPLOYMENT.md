# DACORIS Deployment Guide

This guide explains how to deploy DACORIS in different environments.

## Environment Configuration

DACORIS uses separate Docker Compose files and environment configurations for different deployment scenarios:

### Files Overview

- **`docker-compose.local.yml`** - Local development configuration
- **`docker-compose.prod.yml`** - Production configuration
- **`.env.local`** - Local environment variables
- **`.env.production`** - Production environment variables (create from `.env.production.example`)
- **`.env.production.example`** - Template for production environment variables

## Local Development

### Setup

1. Ensure `.env.local` exists with your local configuration (already configured)
2. Run the local development environment:

```powershell
# Start in detached mode
.\run-local.ps1 -d

# Start with logs
.\run-local.ps1

# Stop local environment
.\stop-local.ps1

# Stop and remove volumes (clean slate)
.\stop-local.ps1 -v
```

### Local Configuration

- **Database**: PostgreSQL on port 5433 (to avoid conflicts)
- **Frontend**: http://localhost
- **ORCID**: Sandbox mode enabled
- **Admin**: admin@dacoris.com / Admin123
- **Email**: Console mode (emails printed to logs)

## Production Deployment

### Initial Setup

1. **Create production environment file**:
   ```powershell
   Copy-Item .env.production.example .env.production
   ```

2. **Edit `.env.production`** and configure:
   - Strong database password
   - Production ORCID credentials
   - Production domain/URL
   - Strong JWT secret key
   - Production SMTP settings
   - Strong admin password
   - Production MinIO credentials
   - Strong ingest API key

3. **Generate strong secrets**:
   ```powershell
   # Generate JWT secret (PowerShell)
   -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
   ```

### Deployment

1. **Deploy to production**:
   ```powershell
   .\run-prod.ps1 -d
   ```

2. **View logs**:
   ```powershell
   docker-compose -f docker-compose.prod.yml logs -f
   ```

3. **Stop production**:
   ```powershell
   .\stop-prod.ps1
   ```

### Production Checklist

- [ ] Updated all passwords and secrets in `.env.production`
- [ ] Configured production ORCID credentials
- [ ] Set up production domain/SSL certificates
- [ ] Configured production SMTP server
- [ ] Set up production MinIO/S3 storage
- [ ] Tested database backups
- [ ] Configured firewall rules
- [ ] Set up monitoring and logging
- [ ] Configured automated backups

## SSL/HTTPS Configuration (Production)

For production, you'll need SSL certificates. Update `nginx/conf.d/default.conf` to include:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # ... rest of configuration
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

Place your SSL certificates in `nginx/ssl/` directory.

## Database Backups

### Backup Database

```powershell
# Local
docker exec dacoris-db pg_dump -U postgres dacoris > backup_$(Get-Date -Format "yyyyMMdd_HHmmss").sql

# Production
docker exec dacoris-db-prod pg_dump -U postgres dacoris_prod > backup_prod_$(Get-Date -Format "yyyyMMdd_HHmmss").sql
```

### Restore Database

```powershell
# Local
Get-Content backup.sql | docker exec -i dacoris-db psql -U postgres dacoris

# Production
Get-Content backup.sql | docker exec -i dacoris-db-prod psql -U postgres dacoris_prod
```

## Environment Variables Reference

### Critical Security Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET_KEY` | Secret key for JWT tokens | Random 64-char string |
| `ADMIN_PASSWORD` | Global admin password | Strong password |
| `DB_PASSWORD` | Database password | Strong password |
| `ORCID_CLIENT_SECRET` | ORCID OAuth secret | From ORCID |
| `SMTP_PASSWORD` | Email server password | From email provider |
| `MINIO_SECRET_KEY` | MinIO secret key | Strong random key |
| `INGEST_API_KEY` | Data ingest API key | Strong random key |

### Application Variables

| Variable | Local | Production |
|----------|-------|------------|
| `FRONTEND_URL` | http://localhost | https://yourdomain.com |
| `ORCID_SANDBOX_MODE` | true | false |
| `NOTIFICATION_MODE` | console | email |
| `MINIO_USE_SSL` | false | true |

## Troubleshooting

### Reset Local Database

```powershell
.\stop-local.ps1 -v
.\run-local.ps1 -d
```

### View Container Logs

```powershell
# Local
docker logs dacoris-backend -f
docker logs dacoris-frontend -f

# Production
docker logs dacoris-backend-prod -f
docker logs dacoris-frontend-prod -f
```

### Check Environment Variables

```powershell
# Local
docker exec dacoris-backend printenv

# Production
docker exec dacoris-backend-prod printenv
```

## Migration from Old Setup

If you're migrating from the old `docker-compose.yml`:

1. Backup your database
2. Stop old containers: `docker-compose down`
3. Use new local setup: `.\run-local.ps1 -d`
4. Restore database if needed

## Security Best Practices

1. **Never commit** `.env.production` to version control
2. **Use strong passwords** (minimum 16 characters, mixed case, numbers, symbols)
3. **Rotate secrets** regularly (every 90 days)
4. **Enable SSL/HTTPS** in production
5. **Restrict database access** to backend container only
6. **Use environment-specific** ORCID applications
7. **Monitor logs** for suspicious activity
8. **Keep Docker images** updated

## Support

For issues or questions, contact the development team.
