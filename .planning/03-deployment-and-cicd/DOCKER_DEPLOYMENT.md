# Docker Deployment Guide for DACORIS

This guide explains how to run the DACORIS application in a containerized environment using Docker and nginx.

## Architecture

The application consists of four Docker containers:
- **nginx**: Reverse proxy serving on port 80
- **frontend**: Next.js application (internal port 3000)
- **backend**: FastAPI application (internal port 8000)
- **db**: PostgreSQL 15 database (port 5432)

All services communicate through a Docker network called `dacoris-network`.

## Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose v3.8 or higher
- At least 4GB of available RAM
- Ports 80 and 5432 available on your host machine

## Quick Start

### 1. Build and Start All Services

```bash
docker-compose up --build
```

This command will:
- Build Docker images for backend, frontend, and nginx
- Pull the PostgreSQL image
- Start all containers
- Initialize the database

### 2. Access the Application

Once all containers are running:
- **Frontend**: http://localhost
- **Backend API**: http://localhost/api
- **API Documentation**: http://localhost/docs
- **Database**: localhost:5432

### 3. Stop the Application

```bash
docker-compose down
```

To stop and remove volumes (database data):
```bash
docker-compose down -v
```

## Detailed Commands

### Build Without Cache
```bash
docker-compose build --no-cache
```

### Start in Detached Mode (Background)
```bash
docker-compose up -d
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx
docker-compose logs -f db
```

### Restart a Specific Service
```bash
docker-compose restart backend
docker-compose restart frontend
docker-compose restart nginx
```

### Execute Commands in Containers

**Backend Shell:**
```bash
docker-compose exec backend bash
```

**Run Database Migrations:**
```bash
docker-compose exec backend alembic upgrade head
```

**Frontend Shell:**
```bash
docker-compose exec frontend sh
```

**Database Shell:**
```bash
docker-compose exec db psql -U postgres -d dacoris
```

## Configuration

### Environment Variables

Environment variables are defined in `docker-compose.yml`. For production, create a `.env` file:

```bash
cp .env.docker .env
```

Edit `.env` with your production values, especially:
- `JWT_SECRET_KEY`: Generate a secure random key
- `POSTGRES_PASSWORD`: Use a strong password
- `ORCID_CLIENT_ID` and `ORCID_CLIENT_SECRET`: Your production ORCID credentials
- `ORCID_REDIRECT_URI`: Update to your production domain

### Database Persistence

Database data is stored in a Docker volume named `postgres_data`. This persists even when containers are stopped.

To backup the database:
```bash
docker-compose exec db pg_dump -U postgres dacoris > backup.sql
```

To restore:
```bash
docker-compose exec -T db psql -U postgres dacoris < backup.sql
```

### File Uploads

Uploaded files are stored in `./backend/uploads` on the host machine, mounted to `/app/uploads` in the backend container.

## Nginx Configuration

The nginx reverse proxy routes requests as follows:
- `/api/*` → Backend (FastAPI)
- `/docs` → Backend (API documentation)
- `/openapi.json` → Backend (OpenAPI spec)
- `/*` → Frontend (Next.js)

Maximum upload size is set to 50MB in `nginx/nginx.conf`.

## Troubleshooting

### Container Won't Start

Check logs:
```bash
docker-compose logs [service-name]
```

### Database Connection Issues

Ensure the database is healthy:
```bash
docker-compose ps
```

The backend waits for the database health check to pass before starting.

### Port Conflicts

If port 80 or 5432 is already in use, modify the port mappings in `docker-compose.yml`:

```yaml
ports:
  - "8080:80"  # Change host port to 8080
```

### Rebuild After Code Changes

```bash
docker-compose up --build
```

Or rebuild specific service:
```bash
docker-compose build backend
docker-compose up -d backend
```

### Clear Everything and Start Fresh

```bash
docker-compose down -v
docker system prune -a
docker-compose up --build
```

## Production Deployment

For production environments:

1. **Use environment files**: Store secrets in `.env` file (not committed to git)
2. **Enable HTTPS**: Configure SSL certificates in nginx
3. **Update CORS settings**: Modify `backend/main.py` to allow your production domain
4. **Set strong passwords**: Update database credentials
5. **Configure logging**: Set up centralized logging
6. **Resource limits**: Add memory and CPU limits to services in `docker-compose.yml`
7. **Health checks**: Monitor container health
8. **Backup strategy**: Implement automated database backups

### Example Production docker-compose.yml additions:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## Development Workflow

For active development, you may want to use volume mounts for hot-reloading:

```yaml
services:
  backend:
    volumes:
      - ./backend:/app
      - /app/__pycache__
```

However, this is not included by default for production-ready deployment.

## Network Architecture

All services communicate through the `dacoris-network` bridge network:
- Services can reach each other using service names as hostnames
- Only nginx exposes port 80 to the host
- Database port 5432 is exposed for external tools (optional)

## Monitoring

Check container status:
```bash
docker-compose ps
```

Check resource usage:
```bash
docker stats
```

## Support

For issues or questions, refer to:
- Backend logs: `docker-compose logs backend`
- Frontend logs: `docker-compose logs frontend`
- Database logs: `docker-compose logs db`
- Nginx logs: `docker-compose logs nginx`
