# Metadata-First Lakehouse Data Import Implementation

Transform Dacoris data collection to use metadata-first architecture where raw data is stored in MinIO Bronze layer while the webapp database only stores lightweight metadata for tracking and governance.

---

## Overview

Currently, the data import workflow stores actual data in PostgreSQL. This plan implements a **metadata-first approach** where:
- Webapp captures only metadata (URL, source type, tags, IDs)
- Raw data is ingested directly to MinIO Bronze bucket
- Backend provides endpoints for Lakehouse to pull raw data
- All data types (KoboCollect, Google Sheets, Excel, URLs) follow this pattern

---

## Architecture Changes

### Current Flow
```
User uploads data → Frontend → Backend API → PostgreSQL (stores raw data)
```

### New Flow
```
User uploads/links data → Frontend → Backend API → PostgreSQL (metadata only)
                                          ↓
                                    MinIO Bronze Ingest
                                          ↓
                              MinIO Bronze Bucket (raw data)
```

---

## Database Schema Changes

### New Table: `data_imports`

Replace/extend existing data import tracking with metadata-first structure:

```sql
CREATE TABLE data_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Context IDs
    institution_id INTEGER NOT NULL REFERENCES institutions(id),
    researcher_id INTEGER NOT NULL REFERENCES users(id),
    project_id INTEGER REFERENCES research_projects(id),
    
    -- Source metadata
    source_url TEXT,                          -- Direct URL to raw data
    source_type VARCHAR(50) NOT NULL,         -- 'url', 'file_upload', 'kobo_collect', 'google_sheets', 'excel', 'api_feed'
    source_tag VARCHAR(100) NOT NULL,         -- Human label e.g. "beneficiary_list_Q1"
    file_name VARCHAR(255),                   -- Original filename
    file_format VARCHAR(20),                  -- 'csv', 'xlsx', 'json', 'pdf'
    file_size_bytes BIGINT,                   -- Original file size
    
    -- Ingestion tracking
    ingest_status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'queued', 'ingesting', 'ingested', 'failed'
    bronze_path TEXT,                         -- MinIO object path after ingestion
    bronze_bucket VARCHAR(100),               -- MinIO bucket name
    ingest_triggered_at TIMESTAMP,            -- When ingestion started
    ingest_completed_at TIMESTAMP,            -- When ingestion completed
    error_message TEXT,                       -- Error details if failed
    
    -- Additional metadata
    record_count INTEGER,                     -- Number of records in dataset
    description TEXT,                         -- User-provided description
    metadata_json JSONB,                      -- Flexible metadata storage
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_institution_project (institution_id, project_id),
    INDEX idx_researcher (researcher_id),
    INDEX idx_status (ingest_status),
    INDEX idx_created_at (created_at DESC)
);
```

---

## Backend Implementation

### 1. New API Endpoints

#### **POST /api/research/data-imports/register**
Register new data import and trigger Bronze ingestion

**Request:**
```json
{
  "institution_id": 1,
  "researcher_id": 123,
  "project_id": 456,
  "source_url": "https://kobo.example.com/api/v2/assets/abc123/data.csv",
  "source_type": "kobo_collect",
  "source_tag": "baseline_survey_nairobi_q1_2026",
  "file_name": "baseline_survey.csv",
  "file_format": "csv",
  "description": "Baseline demographic survey - Nairobi region"
}
```

**Response:**
```json
{
  "import_id": "uuid-abc-123",
  "status": "queued",
  "bronze_path": "dacoris-bronze/inst-1/proj-456/baseline_survey_nairobi_q1_2026_20260507T201530Z.csv",
  "message": "Import registered. Raw data ingestion queued."
}
```

**Logic:**
1. Validate user permissions (researcher belongs to institution/project)
2. Create metadata record in `data_imports` table
3. Generate Bronze path: `{bucket}/{institution_id}/{project_id}/{source_tag}_{timestamp}.{format}`
4. Trigger async MinIO ingestion task
5. Return import ID and status

---

#### **GET /api/research/data-imports**
List all imports for current researcher with filters

**Query Parameters:**
- `project_id` (optional)
- `status` (optional)
- `source_type` (optional)
- `limit`, `offset` for pagination

**Response:**
```json
{
  "imports": [
    {
      "id": "uuid-abc-123",
      "source_tag": "baseline_survey_nairobi_q1_2026",
      "source_type": "kobo_collect",
      "file_name": "baseline_survey.csv",
      "ingest_status": "ingested",
      "bronze_path": "dacoris-bronze/inst-1/proj-456/...",
      "record_count": 1250,
      "created_at": "2026-05-07T20:15:30Z"
    }
  ],
  "total": 42,
  "page": 1,
  "page_size": 20
}
```

---

#### **GET /api/research/data-imports/{import_id}**
Get detailed metadata for specific import

---

#### **POST /api/research/data-imports/{import_id}/retry**
Retry failed ingestion

---

#### **DELETE /api/research/data-imports/{import_id}**
Delete metadata record (does NOT delete from MinIO - requires separate cleanup)

---

### 2. MinIO Integration Service

Create new service module: `backend/services/minio_ingest.py`

**Functions:**
- `trigger_bronze_ingest(import_id, source_url, bronze_path, metadata)`
- `upload_to_bronze(file_data, bronze_path, metadata_tags)`
- `get_bronze_presigned_url(bronze_path, expiry_seconds=3600)`
- `check_bronze_object_exists(bronze_path)`

**Implementation:**
```python
import boto3
from botocore.client import Config
import httpx
from io import BytesIO
from typing import Dict, Optional

class MinIOIngestService:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            endpoint_url=settings.MINIO_ENDPOINT,
            aws_access_key_id=settings.MINIO_ACCESS_KEY,
            aws_secret_access_key=settings.MINIO_SECRET_KEY,
            config=Config(signature_version='s3v4')
        )
        self.bronze_bucket = settings.MINIO_BRONZE_BUCKET
    
    async def ingest_from_url(
        self, 
        import_id: str,
        source_url: str, 
        bronze_path: str,
        metadata: Dict
    ):
        """Fetch data from URL and upload to MinIO Bronze"""
        try:
            # Update status to 'ingesting'
            await update_import_status(import_id, 'ingesting')
            
            # Fetch raw data
            async with httpx.AsyncClient(timeout=300) as client:
                response = await client.get(source_url)
                response.raise_for_status()
                raw_data = response.content
            
            # Upload to MinIO with metadata tags
            self.s3_client.put_object(
                Bucket=self.bronze_bucket,
                Key=bronze_path,
                Body=BytesIO(raw_data),
                ContentType=response.headers.get('content-type', 'application/octet-stream'),
                Metadata={
                    'import_id': import_id,
                    'institution_id': str(metadata.get('institution_id')),
                    'researcher_id': str(metadata.get('researcher_id')),
                    'project_id': str(metadata.get('project_id')),
                    'source_tag': metadata.get('source_tag', ''),
                    'ingested_at': datetime.utcnow().isoformat()
                }
            )
            
            # Update status to 'ingested'
            await update_import_status(
                import_id, 
                'ingested',
                bronze_path=bronze_path,
                file_size=len(raw_data)
            )
            
        except Exception as e:
            # Update status to 'failed'
            await update_import_status(
                import_id,
                'failed',
                error_message=str(e)
            )
            raise
```

---

### 3. Background Task Queue

Use FastAPI BackgroundTasks for async ingestion:

```python
from fastapi import BackgroundTasks

@router.post("/register")
async def register_import(
    payload: DataImportCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Create metadata record
    import_record = await create_import_record(db, payload, current_user)
    
    # Queue ingestion task
    background_tasks.add_task(
        minio_service.ingest_from_url,
        import_id=import_record.id,
        source_url=payload.source_url,
        bronze_path=import_record.bronze_path,
        metadata={
            'institution_id': payload.institution_id,
            'researcher_id': current_user.id,
            'project_id': payload.project_id,
            'source_tag': payload.source_tag
        }
    )
    
    return import_record
```

---

## Frontend Implementation

### 1. Update Data Import Page

**File:** `frontend/app/researcher/data/import/page.js`

**Changes:**
1. Remove mock data storage simulation
2. Add API integration for metadata registration
3. Show real-time ingestion status
4. Display Bronze path after successful ingestion
5. Add retry button for failed imports

**Key Updates:**
```javascript
const handleImport = async () => {
  setImporting(true);
  
  try {
    // Register import (metadata only)
    const response = await fetch('/api/research/data-imports/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        institution_id: currentUser.institution_id,
        researcher_id: currentUser.id,
        project_id: selectedProject,
        source_url: selectedSource.url,
        source_type: selectedSource.type,
        source_tag: importName.toLowerCase().replace(/\s+/g, '_'),
        file_name: selectedSource.file_name,
        file_format: selectedSource.format,
        description: importDescription
      })
    });
    
    const result = await response.json();
    
    // Poll for ingestion status
    pollIngestionStatus(result.import_id);
    
  } catch (error) {
    setError(error.message);
  }
};

const pollIngestionStatus = async (importId) => {
  const interval = setInterval(async () => {
    const status = await fetch(`/api/research/data-imports/${importId}`);
    const data = await status.json();
    
    if (data.ingest_status === 'ingested') {
      clearInterval(interval);
      setImporting(false);
      setSuccess(true);
    } else if (data.ingest_status === 'failed') {
      clearInterval(interval);
      setImporting(false);
      setError(data.error_message);
    }
  }, 2000);
};
```

---

### 2. Import History View

Add columns:
- **Bronze Path** (with copy button)
- **Ingestion Status** (with color coding)
- **File Size** (human readable)
- **Retry** action for failed imports

---

## Environment Configuration

### Backend `.env`

```env
# MinIO Configuration
MINIO_ENDPOINT=http://102.68.87.70:9000
MINIO_ACCESS_KEY=your-minio-access-key
MINIO_SECRET_KEY=your-minio-secret-key
MINIO_BRONZE_BUCKET=dacoris-bronze
MINIO_USE_SSL=false

# Bronze Path Convention
BRONZE_PATH_TEMPLATE={bucket}/{institution_id}/{project_id}/{source_tag}_{timestamp}.{format}
```

---

## Migration Strategy

### Phase 1: Database Migration
1. Create `data_imports` table
2. Migrate existing `data_import_requests` metadata (if applicable)
3. Add indexes

### Phase 2: Backend Implementation
1. Create MinIO service module
2. Implement registration endpoint
3. Implement list/detail endpoints
4. Add background task handling

### Phase 3: Frontend Updates
1. Update import page to use new API
2. Add status polling
3. Update import history display
4. Add retry functionality

### Phase 4: Testing
1. Test with small CSV files
2. Test with large Excel files
3. Test KoboCollect integration
4. Test Google Sheets integration
5. Test error handling and retry

### Phase 5: Deployment
1. Deploy backend changes
2. Run database migration
3. Deploy frontend changes
4. Monitor first production imports

---

## Data Source Type Handling

### KoboCollect
- `source_url`: KoboToolbox API endpoint
- `source_type`: `kobo_collect`
- Requires API token authentication
- Fetch data via KoboToolbox REST API

### Google Sheets
- `source_url`: Google Sheets export URL
- `source_type`: `google_sheets`
- Requires OAuth token or service account
- Export as CSV via Google Sheets API

### Excel Upload
- `source_url`: Temporary upload URL (presigned)
- `source_type`: `file_upload`
- Upload to temp storage first, then move to Bronze

### Direct URL
- `source_url`: Direct HTTP/HTTPS URL
- `source_type`: `url`
- Simple HTTP GET request

---

## Security Considerations

1. **Access Control**
   - Verify researcher belongs to institution
   - Verify researcher has access to project
   - Validate source URLs against allowlist (optional)

2. **MinIO Security**
   - Bronze bucket is PRIVATE (no public access)
   - Use presigned URLs for temporary access
   - Rotate MinIO credentials regularly

3. **Data Privacy**
   - Encrypt sensitive metadata fields
   - Audit log all import operations
   - Implement data retention policies

4. **Rate Limiting**
   - Limit imports per researcher per day
   - Prevent abuse of ingestion service

---

## Monitoring & Observability

1. **Metrics to Track**
   - Import registration rate
   - Ingestion success/failure rate
   - Average ingestion time
   - Bronze storage usage by institution/project

2. **Alerts**
   - Failed ingestion rate > 10%
   - Ingestion time > 5 minutes
   - Bronze bucket storage > 80% capacity

3. **Logging**
   - Log all import registrations
   - Log ingestion start/complete/failure
   - Log MinIO API errors

---

## Future Enhancements

1. **Batch Import**
   - Support multiple files in single import session
   - Bulk metadata registration

2. **Scheduled Imports**
   - Periodic data pulls from external sources
   - Cron-based ingestion

3. **Data Validation**
   - Schema validation before ingestion
   - Data quality checks

4. **Lakehouse Integration**
   - Webhook to trigger dbt pipeline after ingestion
   - Bronze → Silver → Gold transformation tracking

5. **Data Catalog**
   - Searchable metadata catalog
   - Data lineage tracking
   - Column-level metadata

---

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] MinIO connection works
- [ ] Import registration creates metadata record
- [ ] Background ingestion task executes
- [ ] Status updates correctly (pending → queued → ingesting → ingested)
- [ ] Failed ingestion updates error message
- [ ] Retry functionality works
- [ ] Frontend displays real-time status
- [ ] Import history shows all imports
- [ ] Bronze path is accessible
- [ ] Metadata tags are stored in MinIO
- [ ] Large file uploads work (>100MB)
- [ ] Concurrent imports don't conflict
- [ ] Error handling is robust

---

## Success Criteria

✅ **Zero raw data stored in PostgreSQL**  
✅ **All imports tracked with metadata only**  
✅ **Raw data successfully ingested to MinIO Bronze**  
✅ **Real-time status updates in UI**  
✅ **Failed imports can be retried**  
✅ **Bronze path follows naming convention**  
✅ **Metadata tags embedded in MinIO objects**  
✅ **Performance: <30s for typical CSV import**  
✅ **Scalability: Handles 1000+ imports per day**

---

## Files to Create/Modify

### Backend
- `backend/models.py` - Add `DataImport` model
- `backend/alembic/versions/xxx_add_data_imports_table.py` - Migration
- `backend/services/minio_ingest.py` - NEW MinIO service
- `backend/routes/research/data_imports.py` - NEW API routes
- `backend/config.py` - Add MinIO settings
- `backend/requirements.txt` - Add `boto3`, `httpx`

### Frontend
- `frontend/app/researcher/data/import/page.js` - Update import workflow
- `frontend/lib/api/dataImports.js` - NEW API client
- `frontend/components/ImportStatusBadge.js` - NEW status component

### Documentation
- `docs/data-import-metadata-first.md` - Architecture documentation
- `docs/minio-bronze-convention.md` - Bronze path naming convention

---

**Estimated Effort:** 3-4 days  
**Priority:** High  
**Dependencies:** MinIO already configured ✅
