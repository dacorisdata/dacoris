# Lakehouse Data Import - Implementation Summary

**Status:** ✅ Phase 1 Complete (Metadata-First without MinIO)  
**Date:** May 9, 2026  
**Approach:** Metadata-first architecture with pull-based MinIO integration

---

## What's Implemented

### ✅ Backend Components

#### 1. Database Model (`models.py`)
- **DataImport** model with all metadata fields
- **DataImportStatus** enum: pending, queued, ingesting, ingested, failed
- **DataSourceType** enum: url, file_upload, kobo_collect, google_sheets, excel, api_feed
- Indexes on institution_id, researcher_id, project_id, status, created_at

#### 2. API Endpoints

**Researcher Endpoints** (`/api/research/lakehouse-imports/`)
- `POST /register` - Register data import (metadata only, status: queued)
- `POST /upload-csv` - Upload CSV file (saves to temp, metadata only)
- `GET /` - List imports with filters (project, status, source_type)
- `GET /{import_id}` - Get import details
- `POST /{import_id}/retry` - Retry failed import
- `DELETE /{import_id}` - Delete import metadata

**MinIO Ingest Endpoints** (`/api/ingest/`)
- `GET /queued-imports` - Pull queued imports (requires API key)
- `POST /update-status` - Update ingestion status (requires API key)
- `GET /health` - Health check

#### 3. Services
- **MinIO Service** (`services/minio_service.py`) - Ready for when MinIO is configured
  - Upload to Bronze bucket
  - Generate presigned URLs
  - Fetch from URLs
  - Object management

#### 4. Database Migration
- Alembic migration created: `5d7fdb71d34c_add_data_imports_table_for_lakehouse.py`
- Creates `data_imports` table with all indexes
- Creates enum types

---

## Current Workflow

### For Researchers (Frontend → Backend)

```
1. User uploads CSV or provides URL
   ↓
2. POST /api/research/lakehouse-imports/register
   - Saves metadata to PostgreSQL
   - Status: QUEUED
   - Generates bronze_path
   - Returns import_id
   ↓
3. User sees import in list with status "queued"
```

### For MinIO Service (When Configured)

```
1. MinIO polls: GET /api/ingest/queued-imports
   Authorization: Bearer {INGEST_API_KEY}
   ↓
2. Gets list of queued imports with metadata
   ↓
3. For each import:
   a. POST /api/ingest/update-status (status: ingesting)
   b. Fetch data from source_url
   c. Upload to MinIO Bronze bucket
   d. POST /api/ingest/update-status (status: ingested)
   
   OR on failure:
   d. POST /api/ingest/update-status (status: failed, error_message)
```

---

## Configuration

### Environment Variables (.env)

```env
# MinIO Configuration (for when ready)
MINIO_ENDPOINT=http://102.68.87.70:9000
MINIO_ACCESS_KEY=your-minio-access-key
MINIO_SECRET_KEY=your-minio-secret-key
MINIO_BRONZE_BUCKET=dacoris-bronze
MINIO_USE_SSL=false

# Ingest API Key (shared with MinIO service)
INGEST_API_KEY=dev-ingest-key-change-in-production

# File Upload Directory
UPLOAD_DIR=./uploads
```

---

## API Examples

### 1. Register CSV Import (Researcher)

**Request:**
```http
POST /api/research/lakehouse-imports/register
Authorization: Bearer {user_token}
Content-Type: application/json

{
  "institution_id": 1,
  "researcher_id": 123,
  "project_id": 456,
  "source_url": "https://example.com/data.csv",
  "source_type": "url",
  "source_tag": "baseline_survey_q1_2026",
  "file_name": "baseline_survey.csv",
  "file_format": "csv",
  "description": "Baseline demographic survey",
  "priority": 5
}
```

**Response:**
```json
{
  "id": "abc123xyz",
  "institution_id": 1,
  "researcher_id": 123,
  "project_id": 456,
  "source_type": "url",
  "source_tag": "baseline_survey_q1_2026",
  "file_name": "baseline_survey.csv",
  "file_format": "csv",
  "ingest_status": "queued",
  "bronze_path": "inst-1/proj-456/baseline_survey_q1_2026_20260509T184530Z.csv",
  "bronze_bucket": "dacoris-bronze",
  "priority": 5,
  "retry_count": 0,
  "created_at": "2026-05-09T18:45:30Z"
}
```

### 2. Upload CSV File (Researcher)

**Request:**
```http
POST /api/research/lakehouse-imports/upload-csv
Authorization: Bearer {user_token}
Content-Type: multipart/form-data

file: [CSV file]
institution_id: 1
project_id: 456
source_tag: field_data_may_2026
description: Field survey data
priority: 7
```

**Response:**
```json
{
  "id": "def456uvw",
  "source_type": "file_upload",
  "source_url": "file:///path/to/uploads/field_data_may_2026_20260509T184600Z.csv",
  "ingest_status": "queued",
  "file_size_bytes": 1048576,
  ...
}
```

### 3. Get Queued Imports (MinIO Service)

**Request:**
```http
GET /api/ingest/queued-imports?limit=50
Authorization: Bearer dev-ingest-key-change-in-production
```

**Response:**
```json
{
  "imports": [
    {
      "import_id": "abc123xyz",
      "institution_id": 1,
      "researcher_id": 123,
      "project_id": 456,
      "source_url": "https://example.com/data.csv",
      "source_type": "url",
      "source_tag": "baseline_survey_q1_2026",
      "bronze_path": "inst-1/proj-456/baseline_survey_q1_2026_20260509T184530Z.csv",
      "bronze_bucket": "dacoris-bronze",
      "priority": 5,
      "created_at": "2026-05-09T18:45:30Z",
      "retry_count": 0
    }
  ],
  "total": 1,
  "timestamp": "2026-05-09T18:50:00Z"
}
```

### 4. Update Ingestion Status (MinIO Service)

**Request:**
```http
POST /api/ingest/update-status
Authorization: Bearer dev-ingest-key-change-in-production
Content-Type: application/json

{
  "import_id": "abc123xyz",
  "status": "ingested",
  "bronze_path": "inst-1/proj-456/baseline_survey_q1_2026_20260509T184530Z.csv",
  "file_size_bytes": 1048576,
  "record_count": 1250
}
```

**Response:**
```json
{
  "success": true,
  "import_id": "abc123xyz",
  "updated_at": "2026-05-09T18:51:00Z"
}
```

---

## Bronze Path Convention

All files follow this naming pattern:

```
{bronze_bucket}/{institution_id}/{project_id}/{source_tag}_{timestamp}.{format}

Example:
dacoris-bronze/inst-1/proj-456/baseline_survey_q1_2026_20260509T184530Z.csv
```

**Components:**
- `bronze_bucket`: dacoris-bronze
- `institution_id`: inst-{id}
- `project_id`: proj-{id} or "no-project"
- `source_tag`: User-provided label (lowercase, underscores)
- `timestamp`: UTC timestamp (YYYYMMDDTHHMMSSz)
- `format`: File extension (csv, xlsx, json, etc.)

---

## Next Steps (When MinIO is Ready)

### 1. Configure MinIO Credentials
Update `.env` with actual MinIO credentials:
```env
MINIO_ENDPOINT=http://102.68.87.70:9000
MINIO_ACCESS_KEY=<actual-key>
MINIO_SECRET_KEY=<actual-secret>
INGEST_API_KEY=<strong-random-key>
```

### 2. Deploy MinIO Ingest Service
Use the plan in `.planning/minio-hybrid-ingestion-architecture-811c91.md` to:
- Create FastAPI ingest service
- Implement background worker
- Configure polling interval
- Choose processing strategy (automatic/priority/manual)

### 3. Test End-to-End
1. Register import via frontend
2. Verify metadata in database (status: queued)
3. MinIO service pulls queued imports
4. MinIO ingests to Bronze bucket
5. MinIO updates status to ingested
6. Verify in frontend (status: ingested)

### 4. Optional Enhancements
- Add webhook notifications when ingestion completes
- Implement data validation before ingestion
- Add record count estimation
- Create admin dashboard for monitoring
- Add retry logic with exponential backoff

---

## Files Created/Modified

### Created
- `backend/models.py` - DataImport model (added)
- `backend/services/minio_service.py` - MinIO integration service
- `backend/routes/research/lakehouse_imports.py` - Researcher endpoints
- `backend/routes/ingest/queue.py` - MinIO pull endpoints
- `backend/alembic/versions/5d7fdb71d34c_*.py` - Database migration

### Modified
- `backend/main.py` - Registered new routers
- `backend/requirements.txt` - Added boto3
- `backend/.env.example` - Added MinIO and ingest config

---

## Testing Checklist

### Without MinIO (Current State)
- [ ] Register import with URL source
- [ ] Upload CSV file
- [ ] List imports with filters
- [ ] Get import details
- [ ] Verify metadata in database
- [ ] Check status is "queued"

### With MinIO (Future)
- [ ] MinIO can authenticate with INGEST_API_KEY
- [ ] MinIO pulls queued imports
- [ ] MinIO updates status to "ingesting"
- [ ] MinIO fetches data from source_url
- [ ] MinIO uploads to Bronze bucket
- [ ] MinIO updates status to "ingested"
- [ ] Failed imports update with error message
- [ ] Retry logic works correctly

---

## Security Notes

1. **INGEST_API_KEY** must be strong and kept secret
2. **MinIO credentials** should never be exposed to frontend
3. **Source URLs** should be validated (optional allowlist)
4. **File uploads** are stored temporarily - clean up old files
5. **API authentication** required for all researcher endpoints
6. **Rate limiting** recommended for upload endpoints

---

## Monitoring Recommendations

Track these metrics:
- Total imports by status
- Average time in queue
- Ingestion success/failure rate
- Bronze bucket storage usage
- Failed imports by error type
- Imports per institution/project

---

**Implementation Status:** ✅ Ready for frontend integration and testing  
**MinIO Integration:** ⏳ Pending MinIO configuration  
**Next Action:** Build frontend UI for data imports
