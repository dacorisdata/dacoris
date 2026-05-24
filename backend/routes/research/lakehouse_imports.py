"""
Lakehouse Data Import API Endpoints (Metadata-First Architecture)

These endpoints handle:
- Registering new data imports (metadata only)
- Triggering MinIO Bronze ingestion
- Listing and managing imports
- Status tracking and retry logic
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Tuple
from datetime import datetime, timezone
from io import BytesIO
import os
import json
import re
import httpx

from database import get_db
from models import (
    User, ResearchProject, DataImport, DataImportStatus, DataSourceType,
    ResearchRole, Institution
)
from auth import require_roles, get_current_user
from services.minio_service import get_minio_service

router = APIRouter(prefix="/api/research/lakehouse-imports", tags=["lakehouse-imports"])

INGEST_TIMEOUT_MINUTES = int(os.getenv("INGEST_TIMEOUT_MINUTES", "10"))
QUEUED_TIMEOUT_MINUTES = int(os.getenv("QUEUED_TIMEOUT_MINUTES", "15"))

# ──── Schemas ────────────────────────────────────────────────────────────────

class DataImportCreate(BaseModel):
    institution_id: str
    researcher_id: str
    project_id: Optional[str] = None
    source_url: Optional[str] = None
    source_type: DataSourceType
    source_tag: str = Field(..., description="Human-readable label for this import")
    file_name: Optional[str] = None
    file_format: Optional[str] = None
    description: Optional[str] = None
    priority: int = Field(default=5, ge=1, le=10)
    metadata_json: Optional[str] = None
    analysis_mode: Optional[str] = Field(default="self", description="self or dacoris")
    expected_visuals: Optional[str] = None

class ResolveLabelRequest(BaseModel):
    source_type: DataSourceType
    source_url: Optional[str] = None
    asset_uid: Optional[str] = None
    kobo_server: Optional[str] = None
    kobo_token: Optional[str] = None
    file_name: Optional[str] = None

class ResolveLabelResponse(BaseModel):
    suggested_label: str
    display_name: Optional[str] = None

class DataImportResponse(BaseModel):
    id: str
    institution_id: str
    researcher_id: str
    project_id: Optional[str]
    source_url: Optional[str]
    source_type: str
    source_tag: str
    file_name: Optional[str]
    file_format: Optional[str]
    ingest_status: str
    bronze_path: Optional[str]
    bronze_bucket: Optional[str]
    file_size_bytes: Optional[int]
    record_count: Optional[int]
    description: Optional[str]
    priority: int
    retry_count: int
    error_message: Optional[str]
    created_at: datetime
    ingest_triggered_at: Optional[datetime]
    ingest_completed_at: Optional[datetime]
    metadata_json: Optional[str] = None
    
    class Config:
        from_attributes = True

class DataImportListResponse(BaseModel):
    imports: List[DataImportResponse]
    total: int
    page: int
    page_size: int

# ──── Helpers ────────────────────────────────────────────────────────────────

def _sanitize_label(value: str) -> str:
    return re.sub(r'[^a-z0-9_]', '', value.lower().replace(' ', '_').replace('-', '_'))[:100]


def _merge_metadata_json(
    metadata_json: Optional[str],
    analysis_mode: Optional[str] = None,
    expected_visuals: Optional[str] = None,
    extra: Optional[dict] = None,
) -> Optional[str]:
    meta = {}
    if metadata_json:
        try:
            meta = json.loads(metadata_json)
        except json.JSONDecodeError:
            pass
    if extra:
        meta.update(extra)
    if analysis_mode:
        meta['analysis_mode'] = analysis_mode
    if expected_visuals:
        meta['expected_visuals'] = expected_visuals
    return json.dumps(meta) if meta else None


def _validate_analysis_fields(analysis_mode: Optional[str], expected_visuals: Optional[str]):
    if analysis_mode == 'dacoris' and not (expected_visuals and expected_visuals.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expected visuals are required when procuring the Dacoris Data Team",
        )


def _as_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


async def _mark_stuck_imports_failed(db: AsyncSession, imports: list) -> None:
    """Mark imports that have been stuck too long as failed with a clear error."""
    now = datetime.now(timezone.utc)
    changed = False

    for imp in imports:
        if imp.ingest_status == DataImportStatus.INGESTING and imp.ingest_triggered_at:
            elapsed_min = (now - _as_utc(imp.ingest_triggered_at)).total_seconds() / 60
            if elapsed_min > INGEST_TIMEOUT_MINUTES:
                imp.ingest_status = DataImportStatus.FAILED
                imp.error_message = (
                    f"Ingestion timed out after {int(elapsed_min)} minutes. "
                    "The source may be unreachable, credentials may be invalid, or MinIO may be unavailable."
                )
                imp.retry_count += 1
                imp.last_retry_at = now
                changed = True

        elif imp.ingest_status in (DataImportStatus.QUEUED, DataImportStatus.PENDING):
            elapsed_min = (now - _as_utc(imp.created_at)).total_seconds() / 60
            if elapsed_min > QUEUED_TIMEOUT_MINUTES and not imp.ingest_triggered_at:
                imp.ingest_status = DataImportStatus.FAILED
                imp.error_message = (
                    f"Ingestion never started after {int(elapsed_min)} minutes. "
                    "The background worker may be unavailable — use Retry to try again."
                )
                imp.retry_count += 1
                imp.last_retry_at = now
                changed = True

    if changed:
        await db.commit()


def _google_sheets_export_url(url: str) -> str:
    match = re.search(r'/spreadsheets/d/([a-zA-Z0-9-_]+)', url)
    if not match:
        return url
    sheet_id = match.group(1)
    gid_match = re.search(r'[?&#]gid=(\d+)', url)
    gid = gid_match.group(1) if gid_match else '0'
    return f'https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}'


def _resolve_fetch_url(data_import: DataImport) -> str:
    source_url = data_import.source_url or ''
    if data_import.source_type == DataSourceType.GOOGLE_SHEETS:
        return _google_sheets_export_url(source_url)
    return source_url


def _resolve_fetch_headers(data_import: DataImport) -> Dict[str, str]:
    if data_import.source_type != DataSourceType.KOBO_COLLECT or not data_import.metadata_json:
        return {}
    try:
        meta = json.loads(data_import.metadata_json)
    except json.JSONDecodeError:
        return {}
    token = meta.get('api_token')
    if token:
        return {'Authorization': f'Token {token}'}
    return {}


def _build_ingest_metadata(data_import: DataImport) -> dict:
    metadata = {
        'import_id': data_import.id,
        'institution_id': str(data_import.institution_id),
        'researcher_id': str(data_import.researcher_id),
        'project_id': str(data_import.project_id) if data_import.project_id else '',
        'source_tag': data_import.source_tag,
        'source_type': data_import.source_type.value if hasattr(data_import.source_type, 'value') else str(data_import.source_type),
    }
    if data_import.metadata_json:
        try:
            extra = json.loads(data_import.metadata_json)
            for key in ('analysis_mode', 'expected_visuals', 'asset_uid'):
                if key in extra and extra[key]:
                    metadata[key] = str(extra[key])
        except json.JSONDecodeError:
            pass
    return metadata


def _clean_google_sheet_title(raw: str) -> Optional[str]:
    if not raw:
        return None
    title = raw.strip()
    for suffix in (' - Google Sheets', ' - Google Drive', ' - Google Docs'):
        if title.endswith(suffix):
            title = title[:-len(suffix)].strip()
    if title.lower() in ('google sheets', 'sign in', 'access denied', 'page not found'):
        return None
    return title or None


def _parse_google_title_from_html(html: str) -> Optional[str]:
    patterns = [
        r'<meta\s+property="og:title"\s+content="([^"]+)"',
        r'<meta\s+content="([^"]+)"\s+property="og:title"',
        r'"title"\s*:\s*"((?:\\.|[^"\\])*)"',
        r'<title>([^<]+)</title>',
    ]
    for pattern in patterns:
        match = re.search(pattern, html, re.IGNORECASE)
        if match:
            title = _clean_google_sheet_title(match.group(1))
            if title:
                return title
    return None


async def _fetch_google_sheets_title_via_api(sheet_id: str) -> Optional[str]:
    api_key = os.getenv("GOOGLE_SHEETS_API_KEY")
    if not api_key:
        return None
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(url, params={"fields": "properties.title", "key": api_key})
            response.raise_for_status()
            return response.json().get("properties", {}).get("title")
    except Exception:
        return None


async def _fetch_google_sheets_title(url: str) -> Optional[str]:
    match = re.search(r'/spreadsheets/d/([a-zA-Z0-9-_]+)', url)
    if not match:
        return None
    sheet_id = match.group(1)

    title = await _fetch_google_sheets_title_via_api(sheet_id)
    if title:
        return _clean_google_sheet_title(title)

    headers = {
        'User-Agent': (
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
            '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ),
    }
    urls_to_try = [
        f'https://docs.google.com/spreadsheets/d/{sheet_id}/edit',
        f'https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv',
        f'https://docs.google.com/spreadsheets/d/{sheet_id}/pub?output=csv',
    ]

    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers=headers) as client:
            for fetch_url in urls_to_try:
                response = await client.get(fetch_url)
                if response.status_code >= 400:
                    continue

                content_disposition = response.headers.get('content-disposition', '')
                cd_match = re.search(r'filename="?([^";]+)"?', content_disposition)
                if cd_match:
                    filename = cd_match.group(1)
                    base = os.path.splitext(filename)[0]
                    title = _clean_google_sheet_title(base.replace('_', ' '))
                    if title:
                        return title

                if 'text/html' in response.headers.get('content-type', ''):
                    title = _parse_google_title_from_html(response.text)
                    if title:
                        return title
    except Exception:
        pass

    return None


async def _suggest_google_sheets_label(source_url: str) -> Tuple[str, Optional[str]]:
    display_name = await _fetch_google_sheets_title(source_url)
    if display_name:
        return _sanitize_label(display_name), display_name
    match = re.search(r'/spreadsheets/d/([a-zA-Z0-9-_]+)', source_url)
    fallback = _sanitize_label(f'sheet_{match.group(1)[:8]}') if match else 'sheet_import'
    return fallback, None


async def _fetch_kobo_asset_name(server: str, asset_uid: str, api_token: str) -> Optional[str]:
    base = server.rstrip('/')
    url = f'{base}/api/v2/assets/{asset_uid}/'
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(url, headers={'Authorization': f'Token {api_token}'})
            response.raise_for_status()
            data = response.json()
            return data.get('name') or data.get('uid')
    except Exception:
        return None


async def _estimate_record_count(data_import: DataImport) -> Optional[int]:
    """Count rows/records from the source file or URL."""
    from services.minio_service import count_records, count_records_from_file

    try:
        source_url = data_import.source_url or ''
        if source_url.startswith('file://'):
            local_path = source_url[len('file://'):]
            fmt = data_import.file_format or os.path.splitext(local_path)[1].lstrip('.')
            return count_records_from_file(local_path, file_format=fmt)

        fetch_url = _resolve_fetch_url(data_import)
        headers = _resolve_fetch_headers(data_import)
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.get(fetch_url, headers=headers or {})
            response.raise_for_status()
            return count_records(
                response.content,
                file_format=data_import.file_format,
                content_type=response.headers.get('content-type', ''),
            )
    except Exception:
        return None


def _schedule_ingestion(background_tasks: BackgroundTasks, data_import: DataImport, db: AsyncSession):
    metadata = _build_ingest_metadata(data_import)
    background_tasks.add_task(
        trigger_bronze_ingestion,
        import_id=data_import.id,
        db_session=db,
        metadata=metadata,
    )

# ──── Background Tasks ───────────────────────────────────────────────────────

async def trigger_bronze_ingestion(
    import_id: str,
    metadata: dict,
    db_session: AsyncSession,
):
    """Background task to ingest data to MinIO Bronze bucket."""
    minio_service = get_minio_service()

    try:
        stmt = select(DataImport).where(DataImport.id == import_id)
        result = await db_session.execute(stmt)
        data_import = result.scalar_one_or_none()

        if not data_import:
            print(f"Import {import_id} not found")
            return

        data_import.ingest_status = DataImportStatus.INGESTING
        data_import.ingest_triggered_at = datetime.utcnow()
        await db_session.commit()

        bronze_path = data_import.bronze_path
        source_url = data_import.source_url or ''

        if source_url.startswith('file://'):
            local_path = source_url[len('file://'):]
            upload_result = minio_service.upload_file(
                file_path=local_path,
                bronze_path=bronze_path,
                metadata_tags=metadata,
            )
        else:
            fetch_url = _resolve_fetch_url(data_import)
            headers = _resolve_fetch_headers(data_import)
            upload_result = await minio_service.ingest_from_url(
                source_url=fetch_url,
                bronze_path=bronze_path,
                metadata=metadata,
                headers=headers or None,
            )

        data_import.ingest_status = DataImportStatus.INGESTED
        data_import.bronze_path = upload_result['bronze_path']
        data_import.bronze_bucket = upload_result['bronze_bucket']
        data_import.file_size_bytes = upload_result['file_size_bytes']
        if upload_result.get('record_count') is not None:
            data_import.record_count = upload_result['record_count']
        data_import.ingest_completed_at = datetime.utcnow()
        data_import.error_message = None

        await db_session.commit()
        print(f"✓ Import {import_id} ingested successfully to {bronze_path}")

    except Exception as e:
        print(f"✗ Import {import_id} failed: {str(e)}")

        stmt = select(DataImport).where(DataImport.id == import_id)
        result = await db_session.execute(stmt)
        data_import = result.scalar_one_or_none()

        if data_import:
            data_import.ingest_status = DataImportStatus.FAILED
            data_import.error_message = str(e)
            data_import.retry_count += 1
            data_import.last_retry_at = datetime.utcnow()
            await db_session.commit()

# ──── Routes ─────────────────────────────────────────────────────────────────

@router.post("/resolve-label", response_model=ResolveLabelResponse)
async def resolve_import_label(
    payload: ResolveLabelRequest,
    current_user: User = Depends(get_current_user),
):
    """Suggest an import label from the source URL, Kobo asset, or file name."""
    display_name = None
    suggested = None

    if payload.source_type == DataSourceType.GOOGLE_SHEETS and payload.source_url:
        suggested, display_name = await _suggest_google_sheets_label(payload.source_url)

    elif payload.source_type == DataSourceType.KOBO_COLLECT and payload.asset_uid and payload.kobo_token:
        server = payload.kobo_server or 'https://kf.kobotoolbox.org'
        display_name = await _fetch_kobo_asset_name(server, payload.asset_uid, payload.kobo_token)
        suggested = _sanitize_label(display_name) if display_name else _sanitize_label(f'kobo_{payload.asset_uid[:8]}')

    elif payload.source_type == DataSourceType.EXCEL and payload.file_name:
        base = os.path.splitext(payload.file_name)[0]
        display_name = base
        suggested = _sanitize_label(base)

    if not suggested:
        suggested = 'import'

    return ResolveLabelResponse(suggested_label=suggested, display_name=display_name)


@router.post("/register", response_model=DataImportResponse, status_code=status.HTTP_201_CREATED)
async def register_data_import(
    payload: DataImportCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Register a new data import (metadata only) - NO MinIO ingestion yet
    
    This endpoint:
    1. Saves metadata to PostgreSQL with status 'queued'
    2. Generates Bronze path for future ingestion
    3. Returns immediately with import ID
    
    MinIO will pull queued imports via /api/ingest/queued-imports endpoint
    """
    # Verify user has access to institution and project
    if payload.institution_id != current_user.primary_institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this institution"
        )
    
    if payload.project_id:
        project_query = select(ResearchProject).where(
            and_(
                ResearchProject.id == payload.project_id,
                ResearchProject.institution_id == payload.institution_id
            )
        )
        project_result = await db.execute(project_query)
        project = project_result.scalar_one_or_none()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or access denied"
            )
    
    # Validate source_url is provided
    if not payload.source_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="source_url is required for ingestion"
        )

    _validate_analysis_fields(payload.analysis_mode, payload.expected_visuals)

    source_tag = payload.source_tag
    if payload.source_type == DataSourceType.GOOGLE_SHEETS and payload.source_url:
        generic_tags = {'sheet_import', 'import', ''}
        if not source_tag or source_tag in generic_tags or re.match(r'^sheet_[a-z0-9]{6,8}$', source_tag):
            suggested_tag, _ = await _suggest_google_sheets_label(payload.source_url)
            if suggested_tag:
                source_tag = suggested_tag
    
    # Generate Bronze path (for future ingestion)
    from datetime import datetime
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    project_part = f"proj-{payload.project_id}" if payload.project_id else "no-project"
    bronze_path = f"inst-{payload.institution_id}/{project_part}/{source_tag}_{timestamp}.{payload.file_format or 'csv'}"
    
    # Create metadata record with QUEUED status
    merged_metadata = _merge_metadata_json(
        payload.metadata_json,
        analysis_mode=payload.analysis_mode,
        expected_visuals=payload.expected_visuals,
    )

    data_import = DataImport(
        institution_id=payload.institution_id,
        researcher_id=payload.researcher_id,
        project_id=payload.project_id,
        source_url=payload.source_url,
        source_type=payload.source_type,
        source_tag=source_tag,
        file_name=payload.file_name or f"{source_tag}.{payload.file_format or 'csv'}",
        file_format=payload.file_format,
        description=payload.description,
        priority=payload.priority,
        metadata_json=merged_metadata,
        ingest_status=DataImportStatus.QUEUED,
        bronze_path=bronze_path,
        bronze_bucket="dacoris-bronze",
        created_by=current_user.id
    )

    record_count = await _estimate_record_count(data_import)
    if record_count is not None:
        data_import.record_count = record_count

    db.add(data_import)
    await db.commit()
    await db.refresh(data_import)

    _schedule_ingestion(background_tasks, data_import, db)

    return data_import


@router.post("/upload-csv", response_model=DataImportResponse, status_code=status.HTTP_201_CREATED)
async def upload_csv_file(
    file: UploadFile = File(...),
    institution_id: str = None,
    project_id: Optional[str] = None,
    source_tag: str = None,
    description: Optional[str] = None,
    priority: int = 5,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload CSV file - saves metadata only, file stored temporarily
    
    This endpoint:
    1. Saves file to temporary location
    2. Creates metadata record with status 'queued'
    3. MinIO will pull and ingest later
    """
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are supported"
        )
    
    # Verify user has access
    if institution_id != current_user.primary_institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this institution"
        )
    
    # Generate Bronze path
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    project_part = f"proj-{project_id}" if project_id else "no-project"
    bronze_path = f"inst-{institution_id}/{project_part}/{source_tag}_{timestamp}.csv"
    
    # Read file content to get size
    file_content = await file.read()
    file_size = len(file_content)
    
    # Save to temporary location (will be picked up by MinIO later)
    upload_dir = os.getenv("UPLOAD_DIR", "./uploads")
    os.makedirs(upload_dir, exist_ok=True)
    temp_file_path = os.path.join(upload_dir, f"{source_tag}_{timestamp}.csv")
    
    with open(temp_file_path, 'wb') as f:
        f.write(file_content)
    
    # Create metadata record with QUEUED status
    data_import = DataImport(
        institution_id=institution_id,
        researcher_id=current_user.id,
        project_id=project_id,
        source_url=f"file://{temp_file_path}",  # Local file path
        source_type=DataSourceType.FILE_UPLOAD,
        source_tag=source_tag,
        file_name=file.filename,
        file_format='csv',
        description=description,
        priority=priority,
        file_size_bytes=file_size,
        ingest_status=DataImportStatus.QUEUED,
        bronze_path=bronze_path,
        bronze_bucket="dacoris-bronze",
        created_by=current_user.id
    )
    
    db.add(data_import)
    await db.commit()
    await db.refresh(data_import)
    
    return data_import


@router.get("", response_model=DataImportListResponse)
async def list_data_imports(
    project_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    source_type: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List data imports for current researcher with optional filters
    """
    # Build query
    where_clauses = [DataImport.researcher_id == current_user.id]
    
    if project_id:
        where_clauses.append(DataImport.project_id == project_id)
    
    if status_filter:
        statuses = [s.strip() for s in status_filter.split(",") if s.strip()]
        valid_statuses = []
        for s in statuses:
            try:
                valid_statuses.append(DataImportStatus[s.upper()])
            except KeyError:
                try:
                    valid_statuses.append(DataImportStatus(s))
                except ValueError:
                    pass
        if len(valid_statuses) == 1:
            where_clauses.append(DataImport.ingest_status == valid_statuses[0])
        elif valid_statuses:
            where_clauses.append(DataImport.ingest_status.in_(valid_statuses))
    
    if source_type:
        where_clauses.append(DataImport.source_type == source_type)
    
    # Count total
    count_query = select(func.count(DataImport.id)).where(and_(*where_clauses))
    count_result = await db.execute(count_query)
    total = count_result.scalar()
    
    # Get paginated results
    offset = (page - 1) * page_size
    query = (
        select(DataImport)
        .where(and_(*where_clauses))
        .order_by(desc(DataImport.created_at))
        .limit(page_size)
        .offset(offset)
    )
    
    result = await db.execute(query)
    imports = list(result.scalars().all())

    await _mark_stuck_imports_failed(db, imports)

    return {
        "imports": imports,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/{import_id}", response_model=DataImportResponse)
async def get_data_import(
    import_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed information about a specific import"""
    query = select(DataImport).where(
        and_(
            DataImport.id == import_id,
            DataImport.researcher_id == current_user.id
        )
    )
    result = await db.execute(query)
    data_import = result.scalar_one_or_none()
    
    if not data_import:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Import not found"
        )
    
    return data_import


@router.post("/{import_id}/retry", response_model=DataImportResponse)
async def retry_failed_import(
    import_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retry a failed import"""
    query = select(DataImport).where(
        and_(
            DataImport.id == import_id,
            DataImport.researcher_id == current_user.id
        )
    )
    result = await db.execute(query)
    data_import = result.scalar_one_or_none()
    
    if not data_import:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Import not found"
        )
    
    if data_import.ingest_status not in (
        DataImportStatus.FAILED,
        DataImportStatus.QUEUED,
        DataImportStatus.PENDING,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only failed or queued imports can be retried",
        )

    if data_import.ingest_status == DataImportStatus.FAILED and data_import.retry_count >= 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum retry attempts exceeded",
        )
    
    # Reset status to queued
    data_import.ingest_status = DataImportStatus.QUEUED
    data_import.error_message = None
    await db.commit()

    _schedule_ingestion(background_tasks, data_import, db)

    await db.refresh(data_import)
    return data_import


@router.post("/upload-excel", response_model=DataImportResponse, status_code=status.HTTP_201_CREATED)
async def upload_excel_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    institution_id: str = None,
    project_id: Optional[str] = None,
    source_tag: str = None,
    description: Optional[str] = None,
    priority: int = 5,
    analysis_mode: Optional[str] = "self",
    expected_visuals: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload Excel file (.xlsx/.xls) - saves metadata only, file stored temporarily
    Raw data will be ingested to MinIO Bronze by the background worker.
    """
    if not file.filename.lower().endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only Excel files (.xlsx, .xls) are supported"
        )

    if institution_id != current_user.primary_institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this institution"
        )

    if not source_tag:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="source_tag is required"
        )

    _validate_analysis_fields(analysis_mode, expected_visuals)

    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    project_part = f"proj-{project_id}" if project_id else "no-project"
    file_ext = 'xlsx' if file.filename.lower().endswith('.xlsx') else 'xls'
    bronze_path = f"inst-{institution_id}/{project_part}/{source_tag}_{timestamp}.{file_ext}"

    file_content = await file.read()
    file_size = len(file_content)

    upload_dir = os.getenv("UPLOAD_DIR", "./uploads")
    os.makedirs(upload_dir, exist_ok=True)
    temp_file_path = os.path.join(upload_dir, f"{source_tag}_{timestamp}.{file_ext}")

    with open(temp_file_path, 'wb') as f:
        f.write(file_content)

    merged_metadata = _merge_metadata_json(
        None,
        analysis_mode=analysis_mode,
        expected_visuals=expected_visuals,
    )

    from services.minio_service import count_records_from_file
    record_count = count_records_from_file(temp_file_path, file_format=file_ext)

    data_import = DataImport(
        institution_id=institution_id,
        researcher_id=current_user.id,
        project_id=project_id,
        source_url=f"file://{temp_file_path}",
        source_type=DataSourceType.EXCEL,
        source_tag=source_tag,
        file_name=file.filename,
        file_format=file_ext,
        description=description,
        priority=priority,
        file_size_bytes=file_size,
        record_count=record_count,
        metadata_json=merged_metadata,
        ingest_status=DataImportStatus.QUEUED,
        bronze_path=bronze_path,
        bronze_bucket="dacoris-bronze",
        created_by=current_user.id
    )

    db.add(data_import)
    await db.commit()
    await db.refresh(data_import)

    _schedule_ingestion(background_tasks, data_import, db)

    return data_import


@router.delete("/{import_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_data_import(
    import_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete import metadata record
    Note: This does NOT delete the file from MinIO Bronze bucket
    """
    query = select(DataImport).where(
        and_(
            DataImport.id == import_id,
            DataImport.researcher_id == current_user.id
        )
    )
    result = await db.execute(query)
    data_import = result.scalar_one_or_none()
    
    if not data_import:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Import not found"
        )
    
    await db.delete(data_import)
    await db.commit()
    
    return None
