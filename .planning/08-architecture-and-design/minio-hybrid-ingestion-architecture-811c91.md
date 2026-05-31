# MinIO Hybrid Ingestion Architecture with Queue Management

Implement a hybrid push-pull ingestion system where Dacoris triggers immediate MinIO ingestion while a background worker polls for queued/failed imports, with configurable processing modes (automatic, priority-based, or manual selection).

---

## Overview

This plan extends the metadata-first import architecture with a **hybrid ingestion approach**:
- **Push**: Dacoris triggers MinIO ingestion immediately when import is registered
- **Pull**: MinIO background worker periodically polls Dacoris for queued/failed imports
- **Flexible Processing**: Support automatic, priority-based, and manual selection modes

---

## Architecture Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Dacoris Backend (FastAPI)                    │
│                                                                 │
│  [POST /api/research/data-imports/register]                     │
│         │                                                       │
│         ├──► Save metadata to PostgreSQL                        │
│         │                                                       │
│         └──► Trigger immediate ingestion (PUSH) ────────┐       │
│                                                          │       │
│  [GET /api/ingest/queued-imports]  ◄──────────────┐     │       │
│         │                                         │     │       │
│         └──► Return list of queued imports        │     │       │
│                                                   │     │       │
└───────────────────────────────────────────────────┼─────┼───────┘
                                                    │     │
                                                    │     │
┌───────────────────────────────────────────────────┼─────┼───────┐
│              MinIO Ingest Service (FastAPI)       │     │       │
│                                                   │     │       │
│  [POST /ingest/bronze] ◄──────────────────────────┘     │       │
│         │                                               │       │
│         └──► Fetch raw data & upload to MinIO           │       │
│                                                          │       │
│  Background Worker (PULL) ───────────────────────────────┘       │
│         │                                                        │
│         ├──► Poll Dacoris every N minutes                        │
│         ├──► Fetch queued imports                                │
│         ├──► Apply processing strategy                           │
│         └──► Ingest to MinIO Bronze                              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Component 1: Dacoris API Endpoints

### **GET /api/ingest/queued-imports**
Endpoint for MinIO service to fetch pending imports

**Purpose:** Allow MinIO background worker to pull queued imports

**Authentication:** API Key (shared secret between Dacoris and MinIO service)

**Query Parameters:**
- `status` (optional): Filter by status (default: `queued,pending`)
- `limit` (optional): Max records to return (default: 100)
- `priority_order` (optional): Sort by priority (default: `created_at ASC`)

**Request:**
```http
GET /api/ingest/queued-imports?status=queued&limit=50
Authorization: Bearer {INGEST_API_KEY}
```

**Response:**
```json
{
  "imports": [
    {
      "import_id": "uuid-abc-123",
      "institution_id": 1,
      "researcher_id": 123,
      "project_id": 456,
      "source_url": "https://kobo.example.com/data.csv",
      "source_type": "kobo_collect",
      "source_tag": "baseline_survey_q1",
      "file_name": "baseline.csv",
      "file_format": "csv",
      "bronze_path": "dacoris-bronze/inst-1/proj-456/baseline_survey_q1_20260507T201530Z.csv",
      "priority": 5,
      "file_size_estimate": 1048576,
      "created_at": "2026-05-07T20:15:30Z",
      "retry_count": 0
    }
  ],
  "total": 42,
  "timestamp": "2026-05-07T20:30:00Z"
}
```

---

### **POST /api/ingest/update-status**
Callback endpoint for MinIO service to update ingestion status

**Purpose:** MinIO service reports back ingestion results

**Request:**
```json
{
  "import_id": "uuid-abc-123",
  "status": "ingested",
  "bronze_path": "dacoris-bronze/inst-1/proj-456/baseline_survey_q1_20260507T201530Z.csv",
  "file_size_bytes": 1048576,
  "record_count": 1250,
  "ingested_at": "2026-05-07T20:16:45Z",
  "error_message": null
}
```

**Response:**
```json
{
  "success": true,
  "import_id": "uuid-abc-123",
  "updated_at": "2026-05-07T20:16:46Z"
}
```

---

## Component 2: MinIO Ingest Service

### Service Structure

```
minio-ingest-service/
├── main.py                    # FastAPI app
├── config.py                  # Configuration
├── models.py                  # Pydantic models
├── services/
│   ├── ingest.py              # Core ingestion logic
│   ├── dacoris_client.py      # Dacoris API client
│   └── minio_client.py        # MinIO S3 client
├── workers/
│   ├── background_worker.py   # Background polling worker
│   └── processor.py           # Processing strategies
├── requirements.txt
└── Dockerfile
```

---

### Background Worker Implementation

**File:** `workers/background_worker.py`

```python
import asyncio
from datetime import datetime
from typing import List
from services.dacoris_client import DacorisClient
from services.ingest import IngestService
from workers.processor import ProcessingStrategy

class BackgroundWorker:
    def __init__(
        self,
        dacoris_client: DacorisClient,
        ingest_service: IngestService,
        poll_interval_seconds: int = 300,  # 5 minutes
        processing_strategy: str = "automatic"
    ):
        self.dacoris_client = dacoris_client
        self.ingest_service = ingest_service
        self.poll_interval = poll_interval_seconds
        self.strategy = ProcessingStrategy.get(processing_strategy)
        self.running = False
    
    async def start(self):
        """Start the background worker"""
        self.running = True
        print(f"Background worker started (poll interval: {self.poll_interval}s)")
        
        while self.running:
            try:
                await self.process_queued_imports()
            except Exception as e:
                print(f"Error in background worker: {e}")
            
            await asyncio.sleep(self.poll_interval)
    
    async def process_queued_imports(self):
        """Fetch and process queued imports from Dacoris"""
        # Fetch queued imports
        queued_imports = await self.dacoris_client.get_queued_imports(
            status="queued,pending",
            limit=100
        )
        
        if not queued_imports:
            print(f"[{datetime.utcnow()}] No queued imports found")
            return
        
        print(f"[{datetime.utcnow()}] Found {len(queued_imports)} queued imports")
        
        # Apply processing strategy to select which imports to process
        selected_imports = self.strategy.select(queued_imports)
        
        print(f"[{datetime.utcnow()}] Processing {len(selected_imports)} imports")
        
        # Process selected imports
        for import_item in selected_imports:
            try:
                await self.ingest_service.ingest_import(import_item)
                print(f"✓ Ingested: {import_item['import_id']}")
            except Exception as e:
                print(f"✗ Failed: {import_item['import_id']} - {e}")
    
    def stop(self):
        """Stop the background worker"""
        self.running = False
        print("Background worker stopped")
```

---

### Processing Strategies

**File:** `workers/processor.py`

```python
from typing import List, Dict
from abc import ABC, abstractmethod

class ProcessingStrategy(ABC):
    """Base class for import processing strategies"""
    
    @abstractmethod
    def select(self, imports: List[Dict]) -> List[Dict]:
        """Select which imports to process"""
        pass
    
    @staticmethod
    def get(strategy_name: str) -> 'ProcessingStrategy':
        """Factory method to get strategy by name"""
        strategies = {
            'automatic': AutomaticStrategy(),
            'priority': PriorityStrategy(),
            'manual': ManualStrategy()
        }
        return strategies.get(strategy_name, AutomaticStrategy())


class AutomaticStrategy(ProcessingStrategy):
    """Process all queued imports in FIFO order"""
    
    def select(self, imports: List[Dict]) -> List[Dict]:
        # Sort by created_at (oldest first)
        return sorted(imports, key=lambda x: x['created_at'])


class PriorityStrategy(ProcessingStrategy):
    """Process imports based on priority score"""
    
    def select(self, imports: List[Dict]) -> List[Dict]:
        # Calculate priority score for each import
        for imp in imports:
            imp['_priority_score'] = self._calculate_priority(imp)
        
        # Sort by priority score (highest first)
        return sorted(imports, key=lambda x: x['_priority_score'], reverse=True)
    
    def _calculate_priority(self, import_item: Dict) -> int:
        """
        Calculate priority score based on multiple factors:
        - Explicit priority field (1-10)
        - File size (smaller files first)
        - Retry count (failed imports get lower priority)
        - Age (older imports get higher priority)
        """
        score = 0
        
        # Base priority (1-10)
        score += import_item.get('priority', 5) * 10
        
        # File size penalty (larger files = lower priority)
        file_size = import_item.get('file_size_estimate', 0)
        if file_size < 1_000_000:  # < 1MB
            score += 20
        elif file_size < 10_000_000:  # < 10MB
            score += 10
        else:
            score += 0
        
        # Retry penalty (failed imports get lower priority)
        retry_count = import_item.get('retry_count', 0)
        score -= retry_count * 5
        
        # Age bonus (older imports get higher priority)
        # TODO: Calculate age from created_at timestamp
        
        return score


class ManualStrategy(ProcessingStrategy):
    """
    Manual selection mode - requires operator intervention
    This strategy returns empty list by default
    Imports are processed only when explicitly triggered via API
    """
    
    def select(self, imports: List[Dict]) -> List[Dict]:
        # Return empty list - manual processing only
        return []
```

---

### Dacoris API Client

**File:** `services/dacoris_client.py`

```python
import httpx
from typing import List, Dict, Optional

class DacorisClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.api_key = api_key
        self.client = httpx.AsyncClient(
            base_url=base_url,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=30.0
        )
    
    async def get_queued_imports(
        self,
        status: str = "queued,pending",
        limit: int = 100
    ) -> List[Dict]:
        """Fetch queued imports from Dacoris"""
        response = await self.client.get(
            "/api/ingest/queued-imports",
            params={"status": status, "limit": limit}
        )
        response.raise_for_status()
        data = response.json()
        return data.get("imports", [])
    
    async def update_import_status(
        self,
        import_id: str,
        status: str,
        bronze_path: Optional[str] = None,
        file_size_bytes: Optional[int] = None,
        record_count: Optional[int] = None,
        error_message: Optional[str] = None
    ) -> Dict:
        """Update import status in Dacoris"""
        payload = {
            "import_id": import_id,
            "status": status,
            "bronze_path": bronze_path,
            "file_size_bytes": file_size_bytes,
            "record_count": record_count,
            "error_message": error_message,
            "ingested_at": datetime.utcnow().isoformat()
        }
        
        response = await self.client.post(
            "/api/ingest/update-status",
            json=payload
        )
        response.raise_for_status()
        return response.json()
```

---

### Core Ingestion Service

**File:** `services/ingest.py`

```python
import httpx
import boto3
from io import BytesIO
from datetime import datetime
from typing import Dict
from services.dacoris_client import DacorisClient
from config import settings

class IngestService:
    def __init__(self, dacoris_client: DacorisClient):
        self.dacoris_client = dacoris_client
        self.s3_client = boto3.client(
            's3',
            endpoint_url=settings.MINIO_ENDPOINT,
            aws_access_key_id=settings.MINIO_ACCESS_KEY,
            aws_secret_access_key=settings.MINIO_SECRET_KEY
        )
        self.bronze_bucket = settings.MINIO_BRONZE_BUCKET
    
    async def ingest_import(self, import_item: Dict):
        """
        Ingest a single import to MinIO Bronze
        
        Steps:
        1. Update status to 'ingesting'
        2. Fetch raw data from source_url
        3. Upload to MinIO Bronze
        4. Update status to 'ingested' or 'failed'
        """
        import_id = import_item['import_id']
        
        try:
            # Update status to 'ingesting'
            await self.dacoris_client.update_import_status(
                import_id=import_id,
                status='ingesting'
            )
            
            # Fetch raw data from source URL
            async with httpx.AsyncClient(timeout=300) as client:
                response = await client.get(import_item['source_url'])
                response.raise_for_status()
                raw_data = response.content
            
            # Upload to MinIO Bronze
            bronze_path = import_item['bronze_path']
            
            self.s3_client.put_object(
                Bucket=self.bronze_bucket,
                Key=bronze_path,
                Body=BytesIO(raw_data),
                ContentType=response.headers.get('content-type', 'application/octet-stream'),
                Metadata={
                    'import_id': import_id,
                    'institution_id': str(import_item['institution_id']),
                    'researcher_id': str(import_item['researcher_id']),
                    'project_id': str(import_item['project_id']),
                    'source_tag': import_item['source_tag'],
                    'ingested_at': datetime.utcnow().isoformat()
                }
            )
            
            # Update status to 'ingested'
            await self.dacoris_client.update_import_status(
                import_id=import_id,
                status='ingested',
                bronze_path=bronze_path,
                file_size_bytes=len(raw_data)
            )
            
        except Exception as e:
            # Update status to 'failed'
            await self.dacoris_client.update_import_status(
                import_id=import_id,
                status='failed',
                error_message=str(e)
            )
            raise
```

---

## Component 3: Manual Selection Interface (Optional)

### Admin Dashboard Endpoint

**File:** `main.py` (MinIO Ingest Service)

```python
@app.get("/admin/queued-imports")
async def list_queued_imports():
    """Admin view: List all queued imports"""
    imports = await dacoris_client.get_queued_imports(limit=500)
    return {
        "imports": imports,
        "total": len(imports),
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/admin/process-import/{import_id}")
async def manually_process_import(import_id: str):
    """Admin action: Manually trigger ingestion for specific import"""
    # Fetch import details from Dacoris
    imports = await dacoris_client.get_queued_imports(limit=1000)
    import_item = next((i for i in imports if i['import_id'] == import_id), None)
    
    if not import_item:
        raise HTTPException(status_code=404, detail="Import not found")
    
    # Process the import
    await ingest_service.ingest_import(import_item)
    
    return {
        "success": True,
        "import_id": import_id,
        "message": "Import processed successfully"
    }

@app.post("/admin/process-batch")
async def manually_process_batch(import_ids: List[str]):
    """Admin action: Manually trigger ingestion for multiple imports"""
    results = []
    
    for import_id in import_ids:
        try:
            await manually_process_import(import_id)
            results.append({"import_id": import_id, "status": "success"})
        except Exception as e:
            results.append({"import_id": import_id, "status": "failed", "error": str(e)})
    
    return {
        "results": results,
        "total": len(import_ids),
        "succeeded": len([r for r in results if r['status'] == 'success']),
        "failed": len([r for r in results if r['status'] == 'failed'])
    }
```

---

## Configuration

### MinIO Ingest Service `.env`

```env
# Dacoris API
DACORIS_API_URL=https://dacoris.example.com
DACORIS_API_KEY=your-shared-secret-key

# MinIO
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=your-minio-access-key
MINIO_SECRET_KEY=your-minio-secret-key
MINIO_BRONZE_BUCKET=dacoris-bronze

# Background Worker
WORKER_ENABLED=true
WORKER_POLL_INTERVAL_SECONDS=300  # 5 minutes
WORKER_PROCESSING_STRATEGY=automatic  # automatic | priority | manual

# Processing Limits
MAX_CONCURRENT_INGESTIONS=5
MAX_FILE_SIZE_BYTES=1073741824  # 1GB
```

---

### Dacoris Backend `.env`

```env
# Ingest API Key (shared with MinIO service)
INGEST_API_KEY=your-shared-secret-key

# MinIO Trigger URL (for push-based ingestion)
MINIO_INGEST_URL=http://102.68.87.70:8000/ingest/bronze
```

---

## Database Schema Updates

### Add Priority and Retry Tracking

```sql
ALTER TABLE data_imports
ADD COLUMN priority INTEGER DEFAULT 5,  -- 1 (low) to 10 (high)
ADD COLUMN retry_count INTEGER DEFAULT 0,
ADD COLUMN last_retry_at TIMESTAMP,
ADD COLUMN file_size_estimate BIGINT;

CREATE INDEX idx_priority_status ON data_imports(priority DESC, ingest_status, created_at);
```

---

## Deployment Architecture

### Option 1: Separate MinIO Ingest Service
```
┌─────────────────┐         ┌─────────────────┐
│  Dacoris Web    │◄───────►│  MinIO Ingest   │
│  (FastAPI)      │  HTTPS  │  Service        │
│  Port 8001      │         │  (FastAPI)      │
└─────────────────┘         │  Port 8000      │
                            │  + Worker       │
                            └────────┬────────┘
                                     │
                            ┌────────▼────────┐
                            │  MinIO Server   │
                            │  Port 9000      │
                            └─────────────────┘
```

### Option 2: Integrated Worker in Dacoris
```
┌─────────────────────────────┐
│  Dacoris Backend            │
│  - FastAPI API              │
│  - Background Worker        │
│  - MinIO Client             │
└──────────────┬──────────────┘
               │
      ┌────────▼────────┐
      │  MinIO Server   │
      │  Port 9000      │
      └─────────────────┘
```

---

## Processing Strategy Comparison

| Strategy | Pros | Cons | Use Case |
|----------|------|------|----------|
| **Automatic** | Simple, no manual intervention | No control over order | Standard production use |
| **Priority** | Optimizes for important imports | Complex scoring logic | High-traffic environments |
| **Manual** | Full control, safety | Requires operator | Testing, sensitive data |

---

## Workflow Examples

### Scenario 1: Automatic Processing (Default)

1. Researcher registers import → Status: `pending`
2. Dacoris triggers immediate ingestion (PUSH) → Status: `ingesting`
3. If push fails → Status: `queued`
4. Background worker polls every 5 min
5. Worker finds queued import
6. Worker ingests to MinIO → Status: `ingested`

### Scenario 2: Priority-Based Processing

1. Multiple imports registered with different priorities
2. Background worker fetches all queued imports
3. Worker calculates priority scores:
   - Small file (1MB) + Priority 8 + No retries = Score 98
   - Large file (100MB) + Priority 5 + 1 retry = Score 45
4. Worker processes high-score imports first

### Scenario 3: Manual Selection

1. Admin views queued imports dashboard
2. Admin selects specific imports to process
3. Admin clicks "Process Selected"
4. MinIO service ingests only selected imports
5. Background worker skips automatic processing

---

## Monitoring & Observability

### Metrics to Track

1. **Queue Metrics**
   - Total queued imports
   - Average queue time
   - Queue growth rate

2. **Worker Metrics**
   - Polls per hour
   - Imports processed per poll
   - Success/failure rate

3. **Ingestion Metrics**
   - Average ingestion time
   - Throughput (MB/s)
   - Concurrent ingestions

### Health Checks

```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "worker_running": worker.running,
        "last_poll": worker.last_poll_time,
        "minio_accessible": await check_minio_connection(),
        "dacoris_accessible": await check_dacoris_connection()
    }
```

---

## Error Handling & Retry Logic

### Retry Strategy

```python
class RetryConfig:
    MAX_RETRIES = 3
    RETRY_DELAYS = [60, 300, 900]  # 1min, 5min, 15min
    
    @staticmethod
    def should_retry(import_item: Dict) -> bool:
        return import_item.get('retry_count', 0) < RetryConfig.MAX_RETRIES
    
    @staticmethod
    def get_retry_delay(retry_count: int) -> int:
        if retry_count >= len(RetryConfig.RETRY_DELAYS):
            return RetryConfig.RETRY_DELAYS[-1]
        return RetryConfig.RETRY_DELAYS[retry_count]
```

### Failure Scenarios

| Scenario | Action | Status Update |
|----------|--------|---------------|
| Source URL unreachable | Retry with backoff | `queued` (retry_count++) |
| MinIO connection failed | Retry immediately | `queued` |
| Invalid file format | Mark as failed | `failed` |
| Max retries exceeded | Mark as failed | `failed` |

---

## Testing Strategy

### Unit Tests
- [ ] Test each processing strategy
- [ ] Test priority score calculation
- [ ] Test retry logic
- [ ] Test Dacoris API client

### Integration Tests
- [ ] Test background worker polling
- [ ] Test push-based ingestion
- [ ] Test pull-based ingestion
- [ ] Test manual processing
- [ ] Test concurrent ingestions

### Load Tests
- [ ] 100 concurrent imports
- [ ] 1000 queued imports
- [ ] Large file ingestion (1GB)
- [ ] Worker under high load

---

## Migration Path

### Phase 1: Push-Only (Current Plan)
- Implement immediate push-based ingestion
- No background worker yet

### Phase 2: Add Background Worker
- Deploy MinIO ingest service with worker
- Configure automatic processing strategy
- Worker handles failed/missed imports

### Phase 3: Add Priority Processing
- Implement priority scoring
- Add priority field to imports
- Switch to priority strategy

### Phase 4: Add Manual Selection (Optional)
- Build admin dashboard
- Add manual processing endpoints
- Allow strategy switching

---

## Files to Create/Modify

### Dacoris Backend
- `backend/routes/ingest/queue.py` - NEW queue endpoints
- `backend/models.py` - Add priority, retry_count fields
- `backend/alembic/versions/xxx_add_import_priority.py` - Migration
- `backend/config.py` - Add INGEST_API_KEY

### MinIO Ingest Service (NEW)
- `minio-ingest-service/main.py`
- `minio-ingest-service/config.py`
- `minio-ingest-service/services/ingest.py`
- `minio-ingest-service/services/dacoris_client.py`
- `minio-ingest-service/workers/background_worker.py`
- `minio-ingest-service/workers/processor.py`
- `minio-ingest-service/requirements.txt`
- `minio-ingest-service/Dockerfile`

---

## Success Criteria

✅ **Push ingestion works immediately**  
✅ **Background worker polls every 5 minutes**  
✅ **Failed imports are automatically retried**  
✅ **All three processing strategies work**  
✅ **Admin can manually trigger ingestion**  
✅ **Queue never grows unbounded**  
✅ **Monitoring shows worker health**  
✅ **No duplicate ingestions**

---

**Estimated Effort:** 5-6 days  
**Priority:** High  
**Dependencies:** Metadata-first import plan, MinIO configured ✅
