"""
MinIO Service for Lakehouse Bronze Layer Ingestion

This service handles:
- Uploading raw data files to MinIO Bronze bucket
- Fetching data from external URLs
- Managing metadata tags on MinIO objects
- Generating presigned URLs for temporary access
"""

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
import httpx
from io import BytesIO
from datetime import datetime, timedelta
from typing import Dict, Optional, BinaryIO
import os
import json
from dotenv import load_dotenv

load_dotenv()


def count_records(raw_data: bytes, file_format: Optional[str] = None, content_type: str = '') -> Optional[int]:
    """Count data rows/records from raw file bytes."""
    fmt = (file_format or '').lower()
    ct = (content_type or '').lower()

    try:
        if fmt == 'json' or 'json' in ct:
            parsed = json.loads(raw_data)
            if isinstance(parsed, dict):
                if isinstance(parsed.get('count'), int):
                    return parsed['count']
                if isinstance(parsed.get('results'), list):
                    return len(parsed['results'])
            if isinstance(parsed, list):
                return len(parsed)

        if fmt in ('csv', 'txt') or 'csv' in ct or 'text/plain' in ct:
            text = raw_data.decode('utf-8-sig', errors='replace')
            lines = [ln for ln in text.splitlines() if ln.strip()]
            return max(0, len(lines) - 1) if lines else 0

        if fmt in ('xlsx', 'xls') or 'spreadsheet' in ct or 'excel' in ct:
            import pandas as pd
            df = pd.read_excel(BytesIO(raw_data), sheet_name=0)
            return len(df)
    except Exception:
        return None

    return None


def count_records_from_file(file_path: str, file_format: Optional[str] = None) -> Optional[int]:
    """Count data rows/records from a local file path."""
    ext = (file_format or os.path.splitext(file_path)[1].lstrip('.')).lower()
    try:
        with open(file_path, 'rb') as f:
            raw_data = f.read()
        return count_records(raw_data, file_format=ext)
    except Exception:
        return None


class MinIOService:
    """Service for interacting with MinIO Bronze bucket"""
    
    def __init__(self):
        self.endpoint = os.getenv("MINIO_ENDPOINT", "http://localhost:9000")
        self.access_key = os.getenv("MINIO_ACCESS_KEY")
        self.secret_key = os.getenv("MINIO_SECRET_KEY")
        self.bronze_bucket = os.getenv("MINIO_BRONZE_BUCKET", "dacoris-bronze")
        self.use_ssl = os.getenv("MINIO_USE_SSL", "false").lower() == "true"
        
        if not self.access_key or not self.secret_key:
            raise ValueError("MinIO credentials not configured. Set MINIO_ACCESS_KEY and MINIO_SECRET_KEY in .env")
        
        # Initialize S3 client for MinIO
        self.s3_client = boto3.client(
            's3',
            endpoint_url=self.endpoint,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            config=Config(signature_version='s3v4'),
            use_ssl=self.use_ssl
        )
        
        # Ensure Bronze bucket exists
        self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self):
        """Create Bronze bucket if it doesn't exist"""
        try:
            self.s3_client.head_bucket(Bucket=self.bronze_bucket)
            print(f"✓ MinIO Bronze bucket '{self.bronze_bucket}' exists")
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                print(f"Creating MinIO Bronze bucket '{self.bronze_bucket}'...")
                self.s3_client.create_bucket(Bucket=self.bronze_bucket)
                print(f"✓ MinIO Bronze bucket '{self.bronze_bucket}' created")
            else:
                raise
    
    def generate_bronze_path(
        self,
        institution_id: int,
        project_id: Optional[int],
        source_tag: str,
        file_format: str
    ) -> str:
        """
        Generate Bronze path following naming convention:
        dacoris-bronze/{institution_id}/{project_id}/{source_tag}_{timestamp}.{format}
        """
        timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
        project_part = f"proj-{project_id}" if project_id else "no-project"
        
        return f"inst-{institution_id}/{project_part}/{source_tag}_{timestamp}.{file_format}"
    
    async def ingest_from_url(
        self,
        source_url: str,
        bronze_path: str,
        metadata: Dict[str, str],
        timeout: int = 300,
        headers: Optional[Dict[str, str]] = None,
    ) -> Dict:
        """
        Fetch data from URL and upload to MinIO Bronze bucket
        
        Args:
            source_url: URL to fetch data from
            bronze_path: Destination path in Bronze bucket
            metadata: Metadata tags to attach to object
            timeout: Request timeout in seconds
            
        Returns:
            Dict with upload details (size, content_type, etc.)
        """
        try:
            # Fetch raw data from source URL
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.get(source_url, headers=headers or {})
                response.raise_for_status()
                raw_data = response.content
            
            content_type = response.headers.get('content-type', 'application/octet-stream')
            file_format = bronze_path.rsplit('.', 1)[-1] if '.' in bronze_path else None
            record_count = count_records(raw_data, file_format=file_format, content_type=content_type)

            # Upload to MinIO Bronze
            result = self.upload_to_bronze(
                file_data=BytesIO(raw_data),
                bronze_path=bronze_path,
                metadata_tags=metadata,
                content_type=content_type
            )

            result['source_url'] = source_url
            result['record_count'] = record_count
            return result
            
        except httpx.HTTPStatusError as e:
            body = e.response.text[:300] if e.response.text else e.response.reason_phrase
            raise Exception(f"Source returned HTTP {e.response.status_code}: {body}")
        except httpx.TimeoutException:
            raise Exception(f"Request timed out after {timeout}s — the source may be slow or unreachable")
        except httpx.HTTPError as e:
            raise Exception(f"Failed to fetch data from URL: {str(e)}")
        except Exception as e:
            raise Exception(f"Ingestion failed: {str(e)}")
    
    def upload_to_bronze(
        self,
        file_data: BinaryIO,
        bronze_path: str,
        metadata_tags: Dict[str, str],
        content_type: str = 'application/octet-stream'
    ) -> Dict:
        """
        Upload file data to MinIO Bronze bucket
        
        Args:
            file_data: File-like object containing data
            bronze_path: Destination path in Bronze bucket
            metadata_tags: Metadata tags to attach
            content_type: MIME type of the file
            
        Returns:
            Dict with upload details
        """
        try:
            # Convert all metadata values to strings
            metadata_str = {k: str(v) for k, v in metadata_tags.items()}
            
            # Add ingestion timestamp
            metadata_str['ingested_at'] = datetime.utcnow().isoformat()
            
            # Upload to MinIO
            self.s3_client.put_object(
                Bucket=self.bronze_bucket,
                Key=bronze_path,
                Body=file_data,
                ContentType=content_type,
                Metadata=metadata_str
            )
            
            # Get object info
            obj_info = self.s3_client.head_object(
                Bucket=self.bronze_bucket,
                Key=bronze_path
            )
            
            return {
                'bronze_path': bronze_path,
                'bronze_bucket': self.bronze_bucket,
                'file_size_bytes': obj_info['ContentLength'],
                'content_type': content_type,
                'metadata': metadata_str,
                'uploaded_at': datetime.utcnow().isoformat()
            }
            
        except ClientError as e:
            raise Exception(f"Failed to upload to MinIO: {str(e)}")
    
    def upload_file(
        self,
        file_path: str,
        bronze_path: str,
        metadata_tags: Dict[str, str]
    ) -> Dict:
        """
        Upload a local file to MinIO Bronze bucket
        
        Args:
            file_path: Path to local file
            bronze_path: Destination path in Bronze bucket
            metadata_tags: Metadata tags to attach
            
        Returns:
            Dict with upload details
        """
        try:
            with open(file_path, 'rb') as f:
                # Determine content type from file extension
                ext = os.path.splitext(file_path)[1].lower()
                content_type_map = {
                    '.csv': 'text/csv',
                    '.json': 'application/json',
                    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    '.xls': 'application/vnd.ms-excel',
                    '.pdf': 'application/pdf',
                    '.txt': 'text/plain'
                }
                content_type = content_type_map.get(ext, 'application/octet-stream')
                record_count = count_records_from_file(file_path, file_format=ext.lstrip('.'))

                result = self.upload_to_bronze(
                    file_data=f,
                    bronze_path=bronze_path,
                    metadata_tags=metadata_tags,
                    content_type=content_type
                )
                result['record_count'] = record_count
                return result
        except FileNotFoundError:
            raise Exception(f"File not found: {file_path}")
        except Exception as e:
            raise Exception(f"Failed to upload file: {str(e)}")
    
    def get_presigned_url(
        self,
        bronze_path: str,
        expiry_seconds: int = 3600
    ) -> str:
        """
        Generate presigned URL for temporary access to Bronze object
        
        Args:
            bronze_path: Path to object in Bronze bucket
            expiry_seconds: URL expiry time in seconds (default: 1 hour)
            
        Returns:
            Presigned URL string
        """
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bronze_bucket,
                    'Key': bronze_path
                },
                ExpiresIn=expiry_seconds
            )
            return url
        except ClientError as e:
            raise Exception(f"Failed to generate presigned URL: {str(e)}")
    
    def check_object_exists(self, bronze_path: str) -> bool:
        """Check if object exists in Bronze bucket"""
        try:
            self.s3_client.head_object(
                Bucket=self.bronze_bucket,
                Key=bronze_path
            )
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return False
            raise
    
    def update_object_metadata(self, bronze_path: str, metadata_tags: Dict[str, str]) -> Dict:
        """Replace user-defined metadata on an existing Bronze object."""
        try:
            metadata_str = {k: str(v) for k, v in metadata_tags.items() if v is not None and str(v) != ''}
            self.s3_client.copy_object(
                Bucket=self.bronze_bucket,
                Key=bronze_path,
                CopySource={'Bucket': self.bronze_bucket, 'Key': bronze_path},
                Metadata=metadata_str,
                MetadataDirective='REPLACE',
            )
            return self.get_object_metadata(bronze_path)
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                raise Exception(f"Object not found: {bronze_path}")
            raise Exception(f"Failed to update object metadata: {str(e)}")

    def get_object_metadata(self, bronze_path: str) -> Dict:
        """Get metadata for Bronze object"""
        try:
            response = self.s3_client.head_object(
                Bucket=self.bronze_bucket,
                Key=bronze_path
            )
            return {
                'size': response['ContentLength'],
                'content_type': response.get('ContentType'),
                'last_modified': response['LastModified'].isoformat(),
                'metadata': response.get('Metadata', {})
            }
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                raise Exception(f"Object not found: {bronze_path}")
            raise Exception(f"Failed to get object metadata: {str(e)}")
    
    def delete_object(self, bronze_path: str) -> bool:
        """Delete object from Bronze bucket"""
        try:
            self.s3_client.delete_object(
                Bucket=self.bronze_bucket,
                Key=bronze_path
            )
            return True
        except ClientError as e:
            raise Exception(f"Failed to delete object: {str(e)}")
    
    def list_objects(
        self,
        prefix: str = "",
        max_keys: int = 1000
    ) -> list:
        """List objects in Bronze bucket with optional prefix filter"""
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bronze_bucket,
                Prefix=prefix,
                MaxKeys=max_keys
            )
            
            objects = []
            for obj in response.get('Contents', []):
                objects.append({
                    'key': obj['Key'],
                    'size': obj['Size'],
                    'last_modified': obj['LastModified'].isoformat()
                })
            
            return objects
        except ClientError as e:
            raise Exception(f"Failed to list objects: {str(e)}")


# Singleton instance
_minio_service = None

def get_minio_service() -> MinIOService:
    """Get or create MinIO service singleton"""
    global _minio_service
    if _minio_service is None:
        _minio_service = MinIOService()
    return _minio_service
