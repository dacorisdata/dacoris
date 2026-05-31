# Dacoris Lakehouse — Next.js Webapp Integration Plan

**Project:** Dacoris Grants Management Platform  
**Prepared by:** Uabiri Digital Solutions  
**Date:** May 2026  
**Status:** Phase 2 Planning

---

## Overview

This document describes how the Dacoris Next.js webapp integrates with the on-premise Lakehouse infrastructure. The core principle is **metadata-first import**: the webapp never stores raw file/dataset content in its own PostgreSQL database. Instead, it captures lightweight metadata about each import and delegates raw data ingestion to the Lakehouse Bronze layer via a dedicated ingest endpoint.

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                  Next.js Webapp (Frontend + API)            │
│                                                             │
│   User uploads / links data source                         │
│        │                                                    │
│        ▼                                                    │
│   [POST /api/imports]  ←── captures metadata only          │
│        │                                                    │
│        └──► Saves to PostgreSQL (metadata only)            │
│        │                                                    │
│        └──► Triggers Bronze Ingest Endpoint ──────────────┐│
└────────────────────────────────────────────────────────────┼┘
                                                             │
                                                             ▼
┌─────────────────────────────────────────────────────────────┐
│              Lakehouse Ingest Layer (On-Premise)            │
│                                                             │
│   [POST /ingest/bronze]  ←── receives metadata payload      │
│        │                                                    │
│        ▼                                                    │
│   Fetches raw data from source URL                          │
│        │                                                    │
│        ▼                                                    │
│   Writes to MinIO  →  dacoris-bronze/{institution_id}/      │
│                             {project_id}/{file}             │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. What Gets Stored in the Webapp Database (PostgreSQL)

When a user imports data, the webapp **only** stores the following metadata record. No raw file content is persisted in the app DB.

### Table: `data_imports`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `institution_id` | UUID | FK → institutions table |
| `researcher_id` | UUID | FK → users table |
| `project_id` | UUID | FK → projects table |
| `source_url` | TEXT | Direct URL to the raw data source |
| `source_type` | ENUM | `url`, `file_upload`, `api_feed`, `google_sheet` |
| `source_tag` | VARCHAR(100) | Human label e.g. `"beneficiary_list_Q1"` |
| `file_name` | VARCHAR(255) | Original filename (if upload) |
| `file_format` | VARCHAR(20) | `csv`, `xlsx`, `json`, `pdf` |
| `ingest_status` | ENUM | `pending`, `queued`, `ingested`, `failed` |
| `bronze_path` | TEXT | MinIO object path after ingestion |
| `ingest_triggered_at` | TIMESTAMP | When the bronze endpoint was called |
| `ingest_completed_at` | TIMESTAMP | Confirmed by Lakehouse callback |
| `error_message` | TEXT | Set if ingestion fails |
| `created_at` | TIMESTAMP | Record creation time |
| `created_by` | UUID | User who triggered the import |

---

## 2. Webapp API — Import Registration Endpoint

**Route:** `POST /api/imports`  
**Auth:** Bearer token (session user)  
**Purpose:** Register a new import, tag it with context IDs, and trigger Bronze ingestion.

### Request Body

```json
{
  "institution_id": "uuid-xxx",
  "researcher_id": "uuid-yyy",
  "project_id": "uuid-zzz",
  "source_url": "https://example.com/data/beneficiaries.csv",
  "source_type": "url",
  "source_tag": "beneficiary_list_Q1_2026",
  "file_name": "beneficiaries.csv",
  "file_format": "csv"
}
```

### Response

```json
{
  "import_id": "uuid-import-abc",
  "status": "queued",
  "bronze_path": "dacoris-bronze/inst-xxx/proj-zzz/beneficiary_list_Q1_2026_20260507T120000Z.csv",
  "message": "Import registered. Raw data ingestion triggered."
}
```

### Handler Logic (Next.js API Route)

```js
// pages/api/imports/index.js

import { createImportRecord, updateImportStatus } from '@/lib/db/imports';
import { triggerBronzeIngest } from '@/lib/lakehouse/ingest';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const {
    institution_id,
    researcher_id,
    project_id,
    source_url,
    source_type,
    source_tag,
    file_name,
    file_format,
  } = req.body;

  // 1. Save metadata to PostgreSQL
  const importRecord = await createImportRecord({
    institution_id,
    researcher_id,
    project_id,
    source_url,
    source_type,
    source_tag,
    file_name,
    file_format,
    ingest_status: 'pending',
  });

  // 2. Build Bronze path
  const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15) + 'Z';
  const bronze_path = `dacoris-bronze/${institution_id}/${project_id}/${source_tag}_${timestamp}.${file_format}`;

  // 3. Trigger Lakehouse Bronze ingest (non-blocking)
  triggerBronzeIngest({
    import_id: importRecord.id,
    source_url,
    bronze_path,
    metadata: { institution_id, researcher_id, project_id, source_tag },
  }).catch((err) => console.error('Ingest trigger failed:', err));

  // 4. Update status to queued
  await updateImportStatus(importRecord.id, 'queued', bronze_path);

  return res.status(202).json({
    import_id: importRecord.id,
    status: 'queued',
    bronze_path,
    message: 'Import registered. Raw data ingestion triggered.',
  });
}
```

---

## 3. Lakehouse Ingest Endpoint

This is a lightweight Python service (FastAPI) running on the on-premise server alongside MinIO. Its job is to receive the metadata payload, fetch the raw data, and write it to the Bronze bucket.

**Base URL:** `http://102.68.87.70:8000`  
**Route:** `POST /ingest/bronze`

### Request Payload (sent by webapp)

```json
{
  "import_id": "uuid-import-abc",
  "source_url": "https://example.com/data/beneficiaries.csv",
  "bronze_path": "dacoris-bronze/inst-xxx/proj-zzz/beneficiary_list_Q1_2026_20260507T120000Z.csv",
  "metadata": {
    "institution_id": "uuid-xxx",
    "researcher_id": "uuid-yyy",
    "project_id": "uuid-zzz",
    "source_tag": "beneficiary_list_Q1_2026"
  }
}
```

### FastAPI Ingest Service (Python)

```python
# ingest_service/main.py

from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
import httpx
import boto3
from io import BytesIO
import json

app = FastAPI(title="Dacoris Bronze Ingest Service")

MINIO_ENDPOINT = "http://localhost:9000"
MINIO_ACCESS_KEY = "your-minio-access-key"
MINIO_SECRET_KEY = "your-minio-secret-key"
WEBAPP_CALLBACK_URL = "https://your-webapp.com/api/imports/callback"

s3_client = boto3.client(
    "s3",
    endpoint_url=MINIO_ENDPOINT,
    aws_access_key_id=MINIO_ACCESS_KEY,
    aws_secret_access_key=MINIO_SECRET_KEY,
)

class IngestPayload(BaseModel):
    import_id: str
    source_url: str
    bronze_path: str
    metadata: dict

async def fetch_and_store(payload: IngestPayload):
    """Fetch raw data from source URL and write to MinIO Bronze bucket."""
    try:
        # Fetch raw data
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.get(payload.source_url)
            response.raise_for_status()
            raw_data = response.content

        # Parse bucket and object key from bronze_path
        # bronze_path format: "dacoris-bronze/inst-id/proj-id/filename.csv"
        parts = payload.bronze_path.split("/", 1)
        bucket_name = parts[0]
        object_key = parts[1]

        # Write to MinIO Bronze — append metadata as object tags
        s3_client.put_object(
            Bucket=bucket_name,
            Key=object_key,
            Body=BytesIO(raw_data),
            ContentType=response.headers.get("content-type", "application/octet-stream"),
            Metadata={
                "import_id": payload.import_id,
                "institution_id": payload.metadata.get("institution_id", ""),
                "researcher_id": payload.metadata.get("researcher_id", ""),
                "project_id": payload.metadata.get("project_id", ""),
                "source_tag": payload.metadata.get("source_tag", ""),
            },
        )

        # Callback to webapp — mark as ingested
        async with httpx.AsyncClient() as client:
            await client.post(WEBAPP_CALLBACK_URL, json={
                "import_id": payload.import_id,
                "status": "ingested",
                "bronze_path": payload.bronze_path,
            })

    except Exception as e:
        # Callback to webapp — mark as failed
        async with httpx.AsyncClient() as client:
            await client.post(WEBAPP_CALLBACK_URL, json={
                "import_id": payload.import_id,
                "status": "failed",
                "error": str(e),
            })

@app.post("/ingest/bronze", status_code=202)
async def ingest_to_bronze(payload: IngestPayload, background_tasks: BackgroundTasks):
    """Receive metadata and trigger async raw data ingestion to MinIO Bronze."""
    background_tasks.add_task(fetch_and_store, payload)
    return {
        "message": "Ingestion queued",
        "import_id": payload.import_id,
        "bronze_path": payload.bronze_path,
    }

@app.get("/health")
def health():
    return {"status": "ok"}
```

---

## 4. Webapp Callback Endpoint

The ingest service calls back to the webapp once ingestion completes (success or failure), so the `data_imports` table stays in sync.

**Route:** `POST /api/imports/callback`

```js
// pages/api/imports/callback.js

import { updateImportStatus } from '@/lib/db/imports';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { import_id, status, bronze_path, error } = req.body;

  await updateImportStatus(import_id, status, bronze_path, error);

  return res.status(200).json({ received: true });
}
```

---

## 5. MinIO Bronze Path Convention

All objects in the Bronze bucket follow this naming pattern to ensure data is partitioned and traceable:

```
dacoris-bronze/
  └── {institution_id}/
        └── {project_id}/
              └── {source_tag}_{YYYYMMDDTHHMMSSZ}.{format}
```

**Example:**
```
dacoris-bronze/
  └── inst-dacoris-001/
        └── proj-grants-2026/
              └── beneficiary_list_Q1_2026_20260507T120000Z.csv
```

Object-level metadata tags stored alongside every file:

| Tag | Value |
|---|---|
| `import_id` | UUID from webapp |
| `institution_id` | Tagged institution |
| `researcher_id` | Uploader/researcher |
| `project_id` | Associated project |
| `source_tag` | Human label |

---

## 6. Phase 2 — dbt Pickup from Bronze

Once data lands in Bronze, the existing Phase 2 dbt pipeline picks it up automatically:

```
MinIO Bronze (raw files)
    │
    ▼  [dbt Silver models]
dim_applicant · dim_institution · dim_donor
fact_application · fact_review
    │
    ▼  [dbt Gold models]
approval_rates · application_funnel
    │
    ▼  [Metabase Dashboards]
Donor Impact · Manager Approval Funnel · Reviewer KPIs
```

The `institution_id`, `researcher_id`, and `project_id` metadata tags embedded in each Bronze object allow dbt models to filter and join records without re-querying the webapp DB.

---

## 7. Security Considerations

- The `/ingest/bronze` endpoint on the Lakehouse should be protected with a shared secret / API key (not publicly open).
- The webapp callback URL should validate the `import_id` exists before updating status.
- MinIO buckets remain `PRIVATE` — only the ingest service has write access to Bronze.
- Source URLs should be validated against an allowlist of trusted domains where possible.
- Consider adding port 8000 to the server firewall only for the webapp server IP, not publicly.

---

## 8. Deployment Checklist

### On-Premise Server (102.68.87.70)

- [ ] Deploy FastAPI ingest service with `uvicorn` or Docker
- [ ] Open port `8000` (restricted to webapp IP only)
- [ ] Configure MinIO credentials in ingest service environment
- [ ] Test `/health` endpoint is reachable
- [ ] Test `/ingest/bronze` with a sample CSV URL

### Next.js Webapp

- [ ] Create `data_imports` table migration in PostgreSQL
- [ ] Implement `POST /api/imports` route
- [ ] Implement `POST /api/imports/callback` route
- [ ] Add `LAKEHOUSE_INGEST_URL` to `.env` (e.g. `http://102.68.87.70:8000`)
- [ ] Add `LAKEHOUSE_API_KEY` to `.env` for auth with ingest service
- [ ] Build import UI — source URL input + tagging fields

---

## 9. Environment Variables

```env
# .env.local (Next.js webapp)
LAKEHOUSE_INGEST_URL=http://102.68.87.70:8000
LAKEHOUSE_API_KEY=your-shared-secret-key

# ingest service (.env)
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=your-minio-key
MINIO_SECRET_KEY=your-minio-secret
WEBAPP_CALLBACK_URL=https://your-webapp.com/api/imports/callback
INGEST_API_KEY=your-shared-secret-key
```

---

*This integration plan aligns with the Dacoris Lakehouse Phase 2 roadmap. Data stays on-premise in Kenya. Zero licensing cost. Portable to Microsoft Fabric when ready.*
