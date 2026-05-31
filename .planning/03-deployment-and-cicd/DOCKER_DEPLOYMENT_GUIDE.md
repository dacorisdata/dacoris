# Lakehouse Import - Docker Deployment Guide

**For:** Dacoris Docker deployment  
**Date:** May 9, 2026

---

## Quick Start

### 1. Update Environment Variables

Edit `.env.docker` or set environment variables when you have MinIO credentials:

```bash
# MinIO Configuration
MINIO_ACCESS_KEY=your-actual-minio-access-key
MINIO_SECRET_KEY=your-actual-minio-secret-key
INGEST_API_KEY=generate-strong-random-key-here
```

### 2. Rebuild Backend Container

```bash
# Rebuild backend to include new dependencies (boto3, pandas, openpyxl)
docker-compose build backend

# Or rebuild all services
docker-compose build
```

### 3. Run Database Migrations

```bash
# Option 1: Run migrations inside container
docker-compose exec backend alembic upgrade head

# Option 2: Restart backend (migrations run on startup)
docker-compose restart backend
```

### 4. Start Services

```bash
# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f backend
```

---

## What's Already Configured

### ✅ Docker Compose (`docker-compose.yml`)

The backend service now includes:

```yaml
environment:
  # MinIO Configuration (Lakehouse Bronze Layer)
  - MINIO_ENDPOINT=http://102.68.87.70:9000
  - MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY:-your-minio-access-key}
  - MINIO_SECRET_KEY=${MINIO_SECRET_KEY:-your-minio-secret-key}
  - MINIO_BRONZE_BUCKET=dacoris-bronze
  - MINIO_USE_SSL=false
  # Ingest API Key (shared secret for MinIO ingest service)
  - INGEST_API_KEY=${INGEST_API_KEY:-dev-ingest-key-change-in-production}
```

### ✅ Volume Mounts

Uploads directory is already mounted:
```yaml
volumes:
  - ./backend/uploads:/app/uploads
```

This means CSV files uploaded via the API are stored at `./backend/uploads/` on your host machine.

---

## API Endpoints (Available in Docker)

All endpoints are accessible through nginx at `http://192.168.0.103/api/`

### Researcher Endpoints

```bash
# Register import from URL
curl -X POST http://192.168.0.103/api/research/lakehouse-imports/register \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "institution_id": 1,
    "researcher_id": 123,
    "project_id": 456,
    "source_url": "https://example.com/data.csv",
    "source_type": "url",
    "source_tag": "baseline_survey_q1",
    "file_format": "csv",
    "priority": 5
  }'

# Upload CSV file
curl -X POST http://192.168.0.103/api/research/lakehouse-imports/upload-csv \
  -H "Authorization: Bearer {token}" \
  -F "file=@data.csv" \
  -F "institution_id=1" \
  -F "project_id=456" \
  -F "source_tag=field_data_may" \
  -F "priority=7"

# List imports
curl http://192.168.0.103/api/research/lakehouse-imports/ \
  -H "Authorization: Bearer {token}"
```

### MinIO Ingest Endpoints

```bash
# Get queued imports (MinIO service calls this)
curl http://192.168.0.103/api/ingest/queued-imports \
  -H "Authorization: Bearer dev-ingest-key-change-in-production"

# Update import status (MinIO service calls this)
curl -X POST http://192.168.0.103/api/ingest/update-status \
  -H "Authorization: Bearer dev-ingest-key-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{
    "import_id": "abc123",
    "status": "ingested",
    "file_size_bytes": 1048576,
    "record_count": 1250
  }'
```

---

## Database Migration Details

The migration creates the `data_imports` table with:

```sql
CREATE TABLE data_imports (
    id VARCHAR(36) PRIMARY KEY,
    institution_id INTEGER NOT NULL,
    researcher_id INTEGER NOT NULL,
    project_id INTEGER,
    source_url TEXT,
    source_type datasourcetype NOT NULL,
    source_tag VARCHAR(100) NOT NULL,
    file_name VARCHAR(255),
    file_format VARCHAR(20),
    file_size_bytes INTEGER,
    ingest_status dataimportstatus DEFAULT 'pending',
    bronze_path TEXT,
    bronze_bucket VARCHAR(100),
    ingest_triggered_at TIMESTAMP WITH TIME ZONE,
    ingest_completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    record_count INTEGER,
    description TEXT,
    metadata_json TEXT,
    priority INTEGER DEFAULT 5,
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMP WITH TIME ZONE,
    file_size_estimate INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE,
    -- Foreign keys and indexes...
);
```

---

## Troubleshooting

### Check if backend is running

```bash
docker-compose ps
docker-compose logs backend
```

### Check database connection

```bash
docker-compose exec backend python -c "from database import engine; print('DB OK')"
```

### Check if migrations ran

```bash
docker-compose exec backend alembic current
```

### Check if table exists

```bash
docker-compose exec db psql -U postgres -d dacoris -c "\dt data_imports"
```

### View backend logs

```bash
docker-compose logs -f backend
```

### Rebuild from scratch

```bash
docker-compose down
docker-compose build --no-cache backend
docker-compose up -d
```

---

## File Locations in Docker

### Inside Backend Container

- **Code:** `/app/`
- **Uploads:** `/app/uploads/`
- **Migrations:** `/app/alembic/versions/`

### On Host Machine

- **Uploads:** `./backend/uploads/`
- **Code:** `./backend/`

### Uploaded CSV Files

When a researcher uploads a CSV via `/upload-csv`, it's saved to:
- Container: `/app/uploads/{source_tag}_{timestamp}.csv`
- Host: `./backend/uploads/{source_tag}_{timestamp}.csv`

The `source_url` in the database will be:
```
file:///app/uploads/{source_tag}_{timestamp}.csv
```

---

## MinIO Integration (When Ready)

### Option 1: MinIO as Docker Service

Add MinIO to `docker-compose.yml`:

```yaml
services:
  minio:
    image: minio/minio:latest
    container_name: dacoris-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    networks:
      - dacoris-network

volumes:
  minio_data:
```

Then update backend environment:
```yaml
- MINIO_ENDPOINT=http://minio:9000
- MINIO_ACCESS_KEY=minioadmin
- MINIO_SECRET_KEY=minioadmin123
```

### Option 2: External MinIO Server

Keep current configuration pointing to `http://102.68.87.70:9000`

Update credentials in `.env.docker` when available.

---

## Testing in Docker

### 1. Test Health Endpoint

```bash
curl http://192.168.0.103/api/health
```

### 2. Test Ingest Health

```bash
curl http://192.168.0.103/api/ingest/health
```

### 3. Test Import Registration (after login)

```bash
# First, login to get token
TOKEN=$(curl -X POST http://192.168.0.103/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.access_token')

# Then register import
curl -X POST http://192.168.0.103/api/research/lakehouse-imports/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "institution_id": 1,
    "researcher_id": 1,
    "source_url": "https://example.com/test.csv",
    "source_type": "url",
    "source_tag": "test_import",
    "file_format": "csv"
  }'
```

### 4. Check Database

```bash
docker-compose exec db psql -U postgres -d dacoris \
  -c "SELECT id, source_tag, ingest_status, created_at FROM data_imports;"
```

---

## Production Checklist

Before deploying to production:

- [ ] Change `INGEST_API_KEY` to a strong random key
- [ ] Update MinIO credentials
- [ ] Set `MINIO_USE_SSL=true` if using HTTPS
- [ ] Configure proper backup for `./backend/uploads/`
- [ ] Set up log rotation for Docker containers
- [ ] Configure monitoring for import queue
- [ ] Test retry logic for failed imports
- [ ] Set up alerts for failed ingestions

---

## Next Steps

1. **Test the endpoints** using the examples above
2. **Build frontend UI** to interact with the API
3. **Configure MinIO** when credentials are available
4. **Deploy MinIO ingest service** (separate container/service)

---

**Status:** ✅ Ready for Docker deployment and testing  
**MinIO:** ⏳ Pending credentials configuration
