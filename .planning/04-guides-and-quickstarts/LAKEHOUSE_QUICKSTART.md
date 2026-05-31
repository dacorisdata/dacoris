# 🚀 Lakehouse Import - Quick Start (Docker)

## Step 1: Rebuild Backend

```bash
docker-compose build backend
```

## Step 2: Start Services

```bash
docker-compose up -d
```

## Step 3: Run Migrations

```bash
docker-compose exec backend alembic upgrade head
```

## Step 4: Check Status

```bash
# Check if services are running
docker-compose ps

# Check backend logs
docker-compose logs -f backend

# Test health endpoint
curl http://192.168.0.103/api/health

# Test ingest health
curl http://192.168.0.103/api/ingest/health
```

## Step 5: Test Import (After Login)

```bash
# Get auth token (replace with your credentials)
curl -X POST http://192.168.0.103/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'

# Use token to register import
curl -X POST http://192.168.0.103/api/research/lakehouse-imports/register \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "institution_id": 1,
    "researcher_id": 1,
    "source_url": "https://example.com/data.csv",
    "source_type": "url",
    "source_tag": "test_import_001",
    "file_format": "csv",
    "priority": 5
  }'
```

## Available Endpoints

### Researcher Endpoints
- `POST /api/research/lakehouse-imports/register` - Register import
- `POST /api/research/lakehouse-imports/upload-csv` - Upload CSV
- `GET /api/research/lakehouse-imports/` - List imports
- `GET /api/research/lakehouse-imports/{id}` - Get import details
- `POST /api/research/lakehouse-imports/{id}/retry` - Retry failed
- `DELETE /api/research/lakehouse-imports/{id}` - Delete import

### MinIO Endpoints (API Key Required)
- `GET /api/ingest/queued-imports` - Pull queued imports
- `POST /api/ingest/update-status` - Update status
- `GET /api/ingest/health` - Health check

## When MinIO is Ready

1. Update `.env.docker`:
```env
MINIO_ACCESS_KEY=your-actual-key
MINIO_SECRET_KEY=your-actual-secret
INGEST_API_KEY=strong-random-key
```

2. Restart backend:
```bash
docker-compose restart backend
```

3. MinIO will start pulling queued imports automatically!

## Documentation

- **Full Implementation:** `.planning/LAKEHOUSE_IMPORT_IMPLEMENTATION_SUMMARY.md`
- **Docker Guide:** `.planning/DOCKER_DEPLOYMENT_GUIDE.md`
- **Architecture Plans:** 
  - `.planning/metadata-first-lakehouse-import-811c91.md`
  - `.planning/minio-hybrid-ingestion-architecture-811c91.md`
