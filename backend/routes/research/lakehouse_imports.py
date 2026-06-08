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
from sqlalchemy import select, and_, or_, func, desc, update
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
    ResearchRole, Institution, Award, Proposal, ProposalCollaborator,
    ProjectMember, ProjectTeam,
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
    researcher_name: Optional[str] = None
    institution_name: Optional[str] = None
    departments: List[str] = []
    dataset_key: Optional[str] = None
    version_number: int = 1
    is_current_version: bool = True
    supersedes_id: Optional[str] = None
    analysis_mode: str = 'self'
    expected_visuals: Optional[str] = None
    
    class Config:
        from_attributes = True

class AnalysisPreferencesUpdate(BaseModel):
    analysis_mode: str = Field(..., description="self or dacoris")
    expected_visuals: Optional[str] = None

class VersionInfoResponse(BaseModel):
    dataset_key: str
    source_tag: str
    source_type: str
    project_id: Optional[str] = None
    next_version: int
    current_version: int
    total_versions: int
    is_new_dataset: bool

class DataImportListResponse(BaseModel):
    imports: List[DataImportResponse]
    total: int
    page: int
    page_size: int

# ──── Helpers ────────────────────────────────────────────────────────────────

def _sanitize_label(value: str) -> str:
    return re.sub(r'[^a-z0-9_]', '', value.lower().replace(' ', '_').replace('-', '_'))[:100]


def _parse_departments(department: Optional[str]) -> List[str]:
    if not department:
        return []
    return [part.strip() for part in department.split(',') if part.strip()]


def _is_rich_text_empty(value: Optional[str]) -> bool:
    if not value or not value.strip():
        return True
    text = re.sub(r'<[^>]+>', '', value).replace('&nbsp;', ' ').strip()
    return not text


def _extract_analysis_fields(metadata_json: Optional[str]) -> Tuple[str, Optional[str]]:
    mode = 'self'
    visuals = None
    if metadata_json:
        try:
            meta = json.loads(metadata_json)
            mode = meta.get('analysis_mode') or 'self'
            visuals = meta.get('expected_visuals')
        except json.JSONDecodeError:
            pass
    return mode, visuals


def _import_to_response(data_import: DataImport) -> DataImportResponse:
    researcher = data_import.researcher
    institution = data_import.institution
    analysis_mode, expected_visuals = _extract_analysis_fields(data_import.metadata_json)
    return DataImportResponse(
        id=data_import.id,
        institution_id=data_import.institution_id,
        researcher_id=data_import.researcher_id,
        project_id=data_import.project_id,
        source_url=data_import.source_url,
        source_type=data_import.source_type.value if hasattr(data_import.source_type, 'value') else str(data_import.source_type),
        source_tag=data_import.source_tag,
        file_name=data_import.file_name,
        file_format=data_import.file_format,
        ingest_status=data_import.ingest_status.value if hasattr(data_import.ingest_status, 'value') else str(data_import.ingest_status),
        bronze_path=data_import.bronze_path,
        bronze_bucket=data_import.bronze_bucket,
        file_size_bytes=data_import.file_size_bytes,
        record_count=data_import.record_count,
        description=data_import.description,
        priority=data_import.priority,
        retry_count=data_import.retry_count,
        error_message=data_import.error_message,
        created_at=data_import.created_at,
        ingest_triggered_at=data_import.ingest_triggered_at,
        ingest_completed_at=data_import.ingest_completed_at,
        metadata_json=data_import.metadata_json,
        researcher_name=researcher.name if researcher else None,
        institution_name=institution.name if institution else None,
        departments=_parse_departments(researcher.department if researcher else None),
        dataset_key=data_import.dataset_key,
        version_number=data_import.version_number or 1,
        is_current_version=data_import.is_current_version if data_import.is_current_version is not None else True,
        supersedes_id=data_import.supersedes_id,
        analysis_mode=analysis_mode,
        expected_visuals=expected_visuals,
    )


def _normalize_source_type(source_type) -> DataSourceType:
    if isinstance(source_type, DataSourceType):
        return source_type
    return DataSourceType(str(source_type).lower())


def _canonical_tag(source_tag: str) -> str:
    return _sanitize_label(source_tag) or (source_tag or '').strip()


def _build_dataset_key(
    researcher_id: str,
    source_tag: str,
    source_type,
    project_id: Optional[str],
) -> str:
    tag = _canonical_tag(source_tag)
    st = _normalize_source_type(source_type).value
    return f"{researcher_id}:{tag}:{st}:{project_id or ''}"


def _series_where(
    researcher_id: str,
    source_tag: str,
    source_type,
    project_id: Optional[str],
):
    """Match all imports in the same versioned dataset series."""
    tag = _canonical_tag(source_tag)
    st = _normalize_source_type(source_type)
    clauses = [
        DataImport.researcher_id == researcher_id,
        DataImport.source_tag == tag,
        DataImport.source_type == st,
    ]
    if project_id:
        clauses.append(DataImport.project_id == project_id)
    else:
        clauses.append(or_(DataImport.project_id.is_(None), DataImport.project_id == ''))
    return and_(*clauses)


def _generate_bronze_path(
    institution_id: str,
    project_id: Optional[str],
    source_tag: str,
    file_format: str,
    version_number: int,
) -> str:
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    project_part = f"proj-{project_id}" if project_id else "no-project"
    fmt = file_format or 'csv'
    return f"inst-{institution_id}/{project_part}/{source_tag}_v{version_number}_{timestamp}.{fmt}"


async def _resolve_versioning(
    db: AsyncSession,
    researcher_id: str,
    source_tag: str,
    source_type,
    project_id: Optional[str],
) -> dict:
    tag = _canonical_tag(source_tag)
    dataset_key = _build_dataset_key(researcher_id, tag, source_type, project_id)
    series_filter = _series_where(researcher_id, tag, source_type, project_id)

    # Normalize legacy rows so series matching stays consistent
    await db.execute(
        update(DataImport)
        .where(series_filter)
        .values(dataset_key=dataset_key)
    )

    max_q = select(func.max(DataImport.version_number)).where(series_filter)
    max_ver = (await db.execute(max_q)).scalar() or 0
    next_ver = max_ver + 1

    prev_q = (
        select(DataImport)
        .where(and_(series_filter, DataImport.is_current_version == True))
        .order_by(desc(DataImport.version_number))
        .limit(1)
    )
    prev = (await db.execute(prev_q)).scalar_one_or_none()
    supersedes_id = prev.id if prev else None

    if max_ver > 0:
        await db.execute(
            update(DataImport)
            .where(series_filter)
            .values(is_current_version=False)
        )

    return {
        'dataset_key': dataset_key,
        'version_number': next_ver,
        'supersedes_id': supersedes_id,
        'is_current_version': True,
    }


async def _get_version_info(
    db: AsyncSession,
    researcher_id: str,
    source_tag: str,
    source_type,
    project_id: Optional[str],
) -> VersionInfoResponse:
    tag = _canonical_tag(source_tag)
    dataset_key = _build_dataset_key(researcher_id, tag, source_type, project_id)
    series_filter = _series_where(researcher_id, tag, source_type, project_id)
    st = _normalize_source_type(source_type).value

    count_q = select(func.count(DataImport.id)).where(series_filter)
    total = (await db.execute(count_q)).scalar() or 0

    current_q = select(func.max(DataImport.version_number)).where(series_filter)
    current = (await db.execute(current_q)).scalar() or 0

    return VersionInfoResponse(
        dataset_key=dataset_key,
        source_tag=tag,
        source_type=st,
        project_id=project_id,
        next_version=current + 1,
        current_version=current,
        total_versions=total,
        is_new_dataset=total == 0,
    )


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
        if analysis_mode == 'self':
            meta.pop('expected_visuals', None)
        elif expected_visuals:
            meta['expected_visuals'] = expected_visuals
    elif expected_visuals:
        meta['expected_visuals'] = expected_visuals
    return json.dumps(meta) if meta else None


def _validate_analysis_fields(analysis_mode: Optional[str], expected_visuals: Optional[str]):
    if analysis_mode == 'dacoris' and _is_rich_text_empty(expected_visuals):
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
    changed_ids = []

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
                changed_ids.append(imp.id)

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
                changed_ids.append(imp.id)

    if changed_ids:
        await db.commit()
        # Re-load relationships on affected imports after commit (commit expires ORM state)
        for imp in imports:
            if imp.id in changed_ids:
                await db.refresh(imp, ['researcher', 'institution'])


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


def _truncate_metadata_value(value: str, max_len: int = 900) -> str:
    text = str(value).strip()
    if len(text) <= max_len:
        return text
    return text[: max_len - 3] + '...'


def _build_ingest_metadata(data_import: DataImport) -> dict:
    """Build string key-value tags attached to MinIO Bronze objects on upload."""
    researcher = data_import.researcher
    institution = data_import.institution
    departments = _parse_departments(researcher.department if researcher else None)

    metadata = {
        'import_id': data_import.id,
        'institution_id': str(data_import.institution_id),
        'researcher_id': str(data_import.researcher_id),
        'project_id': str(data_import.project_id) if data_import.project_id else '',
        'source_tag': data_import.source_tag,
        'source_type': data_import.source_type.value if hasattr(data_import.source_type, 'value') else str(data_import.source_type),
        'version_number': str(data_import.version_number or 1),
        'is_current_version': str(
            data_import.is_current_version if data_import.is_current_version is not None else True
        ).lower(),
        'analysis_mode': 'self',
    }
    if researcher and researcher.name:
        metadata['researcher_name'] = researcher.name
    if institution and institution.name:
        metadata['institution_name'] = institution.name
    if departments:
        metadata['departments'] = ', '.join(departments)
    if data_import.dataset_key:
        metadata['dataset_key'] = data_import.dataset_key
    if data_import.supersedes_id:
        metadata['supersedes_id'] = data_import.supersedes_id
    if data_import.description:
        metadata['description'] = _truncate_metadata_value(data_import.description, max_len=500)
    if data_import.metadata_json:
        try:
            extra = json.loads(data_import.metadata_json)
            if extra.get('analysis_mode'):
                metadata['analysis_mode'] = str(extra['analysis_mode'])
            if extra.get('expected_visuals'):
                metadata['expected_visuals'] = _truncate_metadata_value(extra['expected_visuals'])
            if extra.get('asset_uid'):
                metadata['asset_uid'] = str(extra['asset_uid'])
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
    background_tasks.add_task(
        trigger_bronze_ingestion,
        import_id=data_import.id,
        db_session=db,
    )

# ──── Background Tasks ───────────────────────────────────────────────────────

async def trigger_bronze_ingestion(
    import_id: str,
    db_session: AsyncSession,
):
    """Background task to ingest data to MinIO Bronze bucket."""
    minio_service = get_minio_service()

    try:
        stmt = (
            select(DataImport)
            .options(
                selectinload(DataImport.institution),
                selectinload(DataImport.researcher),
            )
            .where(DataImport.id == import_id)
        )
        result = await db_session.execute(stmt)
        data_import = result.scalar_one_or_none()

        if not data_import:
            print(f"Import {import_id} not found")
            return

        data_import.ingest_status = DataImportStatus.INGESTING
        data_import.ingest_triggered_at = datetime.utcnow()
        await db_session.commit()

        metadata = _build_ingest_metadata(data_import)
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

    source_tag = _canonical_tag(source_tag) or source_tag
    
    versioning = await _resolve_versioning(
        db, payload.researcher_id, source_tag, payload.source_type, payload.project_id
    )
    bronze_path = _generate_bronze_path(
        payload.institution_id,
        payload.project_id,
        source_tag,
        payload.file_format or 'csv',
        versioning['version_number'],
    )

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
        created_by=current_user.id,
        dataset_key=versioning['dataset_key'],
        version_number=versioning['version_number'],
        is_current_version=versioning['is_current_version'],
        supersedes_id=versioning['supersedes_id'],
    )

    record_count = await _estimate_record_count(data_import)
    if record_count is not None:
        data_import.record_count = record_count

    db.add(data_import)
    await db.commit()
    await db.refresh(data_import)

    _schedule_ingestion(background_tasks, data_import, db)

    return _import_to_response(data_import)


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
    
    source_tag = _canonical_tag(source_tag) or source_tag
    versioning = await _resolve_versioning(
        db, current_user.id, source_tag, DataSourceType.FILE_UPLOAD, project_id
    )
    bronze_path = _generate_bronze_path(
        institution_id, project_id, source_tag, 'csv', versioning['version_number']
    )

    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")

    # Read file content to get size
    file_content = await file.read()
    file_size = len(file_content)
    
    # Save to temporary location (will be picked up by MinIO later)
    upload_dir = os.getenv("UPLOAD_DIR", "./uploads")
    os.makedirs(upload_dir, exist_ok=True)
    temp_file_path = os.path.join(upload_dir, f"{source_tag}_v{versioning['version_number']}_{timestamp}.csv")
    
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
        created_by=current_user.id,
        dataset_key=versioning['dataset_key'],
        version_number=versioning['version_number'],
        is_current_version=versioning['is_current_version'],
        supersedes_id=versioning['supersedes_id'],
    )
    
    db.add(data_import)
    await db.commit()
    await db.refresh(data_import)
    
    return data_import


@router.get("/version-info", response_model=VersionInfoResponse)
async def get_import_version_info(
    source_tag: str,
    source_type: DataSourceType,
    project_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Preview the version number that the next import with this label will receive."""
    tag = _canonical_tag(source_tag)
    return await _get_version_info(db, current_user.id, tag, source_type, project_id)


@router.get("", response_model=DataImportListResponse)
async def list_data_imports(
    project_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    source_type: Optional[str] = None,
    latest_only: bool = False,
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

    if latest_only:
        where_clauses.append(DataImport.is_current_version == True)
    
    # Count total
    count_query = select(func.count(DataImport.id)).where(and_(*where_clauses))
    count_result = await db.execute(count_query)
    total = count_result.scalar()
    
    # Get paginated results
    offset = (page - 1) * page_size
    query = (
        select(DataImport)
        .options(
            selectinload(DataImport.institution),
            selectinload(DataImport.researcher),
        )
        .where(and_(*where_clauses))
        .order_by(desc(DataImport.created_at))
        .limit(page_size)
        .offset(offset)
    )
    
    result = await db.execute(query)
    imports = list(result.scalars().all())

    await _mark_stuck_imports_failed(db, imports)

    return {
        "imports": [_import_to_response(imp) for imp in imports],
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


@router.patch("/{import_id}/analysis", response_model=DataImportResponse)
async def update_import_analysis(
    import_id: str,
    payload: AnalysisPreferencesUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update analysis mode and expected visuals for an ingested dataset."""
    if payload.analysis_mode not in ('self', 'dacoris'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="analysis_mode must be 'self' or 'dacoris'",
        )

    _validate_analysis_fields(payload.analysis_mode, payload.expected_visuals)

    query = (
        select(DataImport)
        .options(
            selectinload(DataImport.institution),
            selectinload(DataImport.researcher),
        )
        .where(
            and_(
                DataImport.id == import_id,
                DataImport.researcher_id == current_user.id,
            )
        )
    )
    result = await db.execute(query)
    data_import = result.scalar_one_or_none()

    if not data_import:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Import not found",
        )

    if data_import.ingest_status != DataImportStatus.INGESTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Analysis preferences can only be updated for ingested datasets",
        )

    data_import.metadata_json = _merge_metadata_json(
        data_import.metadata_json,
        analysis_mode=payload.analysis_mode,
        expected_visuals=payload.expected_visuals if payload.analysis_mode == 'dacoris' else None,
    )
    data_import.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(data_import)

    if data_import.bronze_path:
        try:
            minio_service = get_minio_service()
            minio_service.update_object_metadata(
                data_import.bronze_path,
                _build_ingest_metadata(data_import),
            )
        except Exception as e:
            print(f"Warning: MinIO metadata update failed for {import_id}: {e}")

    return _import_to_response(data_import)


_PROVENANCE_PROJECT_OPTS = [
    selectinload(ResearchProject.pi),
    selectinload(ResearchProject.award).selectinload(Award.proposal).selectinload(Proposal.opportunity),
    selectinload(ResearchProject.award).selectinload(Award.proposal).selectinload(Proposal.lead_pi),
    selectinload(ResearchProject.award).selectinload(Award.proposal).selectinload(Proposal.collaborators).selectinload(ProposalCollaborator.user),
    selectinload(ResearchProject.members).selectinload(ProjectMember.user),
    selectinload(ResearchProject.teams).selectinload(ProjectTeam.members),
]


def _serialize_provenance(data_import: DataImport, versions: List[DataImport]) -> dict:
    analysis_mode, expected_visuals = _extract_analysis_fields(data_import.metadata_json)
    researcher = data_import.researcher
    institution = data_import.institution
    project = data_import.project

    dataset = {
        **_import_to_response(data_import).model_dump(),
        'analysis_mode': analysis_mode,
        'expected_visuals': expected_visuals,
    }

    award_data = None
    proposal_data = None
    opportunity_data = None
    project_data = None
    project_members = []
    project_teams = []
    proposal_collaborators = []

    if project:
        award = project.award
        project_data = {
            'id': project.id,
            'title': project.title,
            'project_code': project.project_code,
            'status': project.status.value if hasattr(project.status, 'value') else str(project.status),
            'project_type': project.project_type,
            'description': project.description,
            'project_abstract': project.project_abstract,
            'research_area': project.research_area,
            'lead_institution': project.lead_institution,
            'department': project.department,
            'start_date': project.start_date,
            'end_date': project.end_date,
            'pi_id': project.pi_id,
            'pi_name': project.pi.name if project.pi else project.pi_full_name,
            'pi_email': project.pi_email or (project.pi.email if project.pi else None),
            'pi_orcid': project.pi_orcid or (project.pi.orcid_id if project.pi else None),
        }
        project_members = [
            {
                'id': m.id,
                'role': m.role,
                'status': m.status,
                'name': m.user.name if m.user else m.invited_name,
                'email': m.user.email if m.user else m.invited_email,
            }
            for m in (project.members or [])
        ]
        project_teams = [
            {
                'id': t.id,
                'name': t.name,
                'members': [
                    {'name': mem.display_name, 'role': mem.role_label}
                    for mem in (t.members or [])
                ],
            }
            for t in (project.teams or [])
        ]

        if award:
            award_data = {
                'id': award.id,
                'award_number': award.award_number,
                'funder_name': award.funder_name,
                'total_amount': award.total_amount,
                'currency': award.currency,
                'start_date': award.start_date,
                'end_date': award.end_date,
                'status': award.status.value if hasattr(award.status, 'value') else str(award.status),
            }
            proposal = award.proposal
            if proposal:
                proposal_data = {
                    'id': proposal.id,
                    'title': proposal.title,
                    'status': proposal.status.value if hasattr(proposal.status, 'value') else str(proposal.status),
                    'submitted_at': proposal.submitted_at,
                    'lead_pi_name': proposal.lead_pi.name if proposal.lead_pi else None,
                    'review_stage_name': proposal.review_stage_name,
                }
                proposal_collaborators = [
                    {
                        'id': c.id,
                        'role': c.role,
                        'status': c.status,
                        'name': c.user.name if c.user else c.invited_name,
                        'email': c.user.email if c.user else c.invited_email,
                        'affiliation': c.invited_affiliation,
                    }
                    for c in (proposal.collaborators or [])
                ]
                opportunity = proposal.opportunity
                if opportunity:
                    opportunity_data = {
                        'id': opportunity.id,
                        'title': opportunity.title,
                        'sponsor': opportunity.sponsor,
                        'description': opportunity.description,
                        'category': opportunity.category,
                        'funding_type': opportunity.funding_type,
                        'amount_min': opportunity.amount_min,
                        'amount_max': opportunity.amount_max,
                        'currency': opportunity.currency,
                        'deadline': opportunity.deadline,
                        'geography': opportunity.geography,
                        'status': opportunity.status,
                    }

    version_history = [
        {
            'id': v.id,
            'version_number': v.version_number or 1,
            'is_current_version': v.is_current_version,
            'record_count': v.record_count,
            'ingest_completed_at': v.ingest_completed_at,
            'created_at': v.created_at,
        }
        for v in versions
    ]

    return {
        'dataset': dataset,
        'researcher': {
            'id': data_import.researcher_id,
            'name': researcher.name if researcher else None,
            'departments': _parse_departments(researcher.department if researcher else None),
        },
        'institution': {
            'id': data_import.institution_id,
            'name': institution.name if institution else None,
        },
        'project': project_data,
        'award': award_data,
        'proposal': proposal_data,
        'funding_source': opportunity_data,
        'project_team': project_members,
        'project_teams': project_teams,
        'proposal_team': proposal_collaborators,
        'version_history': version_history,
        'lineage': [
            step for step in [
                {'type': 'dataset', 'id': data_import.id, 'label': data_import.source_tag},
                {'type': 'project', 'id': project_data['id'], 'label': project_data['title']} if project_data else None,
                {'type': 'proposal', 'id': proposal_data['id'], 'label': proposal_data['title']} if proposal_data else None,
                {'type': 'funding_source', 'id': opportunity_data['id'], 'label': opportunity_data['title']} if opportunity_data else None,
            ] if step
        ],
    }


@router.get("/{import_id}/provenance")
async def get_import_provenance(
    import_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Full data origin chain: dataset → project → proposal → funding source."""
    query = (
        select(DataImport)
        .options(
            selectinload(DataImport.institution),
            selectinload(DataImport.researcher),
            selectinload(DataImport.project).options(*_PROVENANCE_PROJECT_OPTS),
        )
        .where(
            and_(
                DataImport.id == import_id,
                DataImport.researcher_id == current_user.id,
            )
        )
    )
    result = await db.execute(query)
    data_import = result.scalar_one_or_none()

    if not data_import:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found",
        )

    versions = []
    versions_q = (
        select(DataImport)
        .where(
            and_(
                _series_where(
                    current_user.id,
                    data_import.source_tag,
                    data_import.source_type,
                    data_import.project_id,
                ),
                DataImport.ingest_status == DataImportStatus.INGESTED,
            )
        )
        .order_by(desc(DataImport.version_number))
    )
    versions_result = await db.execute(versions_q)
    versions = list(versions_result.scalars().all())

    return _serialize_provenance(data_import, versions)


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

    source_tag = _canonical_tag(source_tag) or source_tag
    _validate_analysis_fields(analysis_mode, expected_visuals)

    file_ext = 'xlsx' if file.filename.lower().endswith('.xlsx') else 'xls'
    versioning = await _resolve_versioning(
        db, current_user.id, source_tag, DataSourceType.EXCEL, project_id
    )
    bronze_path = _generate_bronze_path(
        institution_id, project_id, source_tag, file_ext, versioning['version_number']
    )
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")

    file_content = await file.read()
    file_size = len(file_content)

    upload_dir = os.getenv("UPLOAD_DIR", "./uploads")
    os.makedirs(upload_dir, exist_ok=True)
    temp_file_path = os.path.join(upload_dir, f"{source_tag}_v{versioning['version_number']}_{timestamp}.{file_ext}")

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
        created_by=current_user.id,
        dataset_key=versioning['dataset_key'],
        version_number=versioning['version_number'],
        is_current_version=versioning['is_current_version'],
        supersedes_id=versioning['supersedes_id'],
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

    was_current = data_import.is_current_version
    series_filter = _series_where(
        current_user.id,
        data_import.source_tag,
        data_import.source_type,
        data_import.project_id,
    )

    await db.delete(data_import)
    await db.commit()

    if was_current:
        promote_q = (
            select(DataImport)
            .where(series_filter)
            .order_by(desc(DataImport.version_number))
            .limit(1)
        )
        result = await db.execute(promote_q)
        successor = result.scalar_one_or_none()
        if successor:
            successor.is_current_version = True
            await db.commit()
    
    return None
