import httpx
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json
import os

from models import User, OrcidProfile, Institution, UserStatus
from dotenv import load_dotenv

load_dotenv()

ORCID_API_BASE_URL = os.getenv("ORCID_API_BASE_URL", "https://sandbox.orcid.org")
ORCID_SANDBOX_MODE = os.getenv("ORCID_SANDBOX_MODE", "false").lower() == "true"


def _member_api_base() -> str:
    if ORCID_API_BASE_URL and ORCID_API_BASE_URL not in ("https://sandbox.orcid.org", "https://api.orcid.org"):
        return ORCID_API_BASE_URL.rstrip("/")
    return "https://sandbox.orcid.org" if ORCID_SANDBOX_MODE else "https://api.orcid.org"


def _public_api_base() -> str:
    return "https://pub.sandbox.orcid.org" if ORCID_SANDBOX_MODE else "https://pub.orcid.org"


def _format_orcid_date(date_obj: dict | None) -> str:
    if not date_obj:
        return ""
    year = (date_obj.get("year") or {}).get("value")
    month = (date_obj.get("month") or {}).get("value")
    day = (date_obj.get("day") or {}).get("value")
    parts = [str(p) for p in (year, month, day) if p is not None and str(p).strip()]
    return "-".join(parts)


def _parse_work_summary(summary: dict) -> dict:
    title_obj = summary.get("title") or {}
    title = (
        (title_obj.get("title") or {}).get("value")
        or (title_obj.get("subtitle") or {}).get("value")
        or ""
    )
    external_ids = (summary.get("external-ids") or {}).get("external-id") or []
    doi = ""
    for ext in external_ids:
        if (ext.get("external-id-type") or "").lower() == "doi":
            doi = ext.get("external-id-value") or ""
            break
    url = (summary.get("url") or {}).get("value") or ""
    if doi and not url:
        url = f"https://doi.org/{doi}"
    return {
        "put_code": summary.get("put-code"),
        "title": title,
        "type": summary.get("type") or "",
        "journal": (summary.get("journal-title") or {}).get("value") or "",
        "publication_date": _format_orcid_date(summary.get("publication-date")),
        "doi": doi,
        "url": url,
    }


def _parse_peer_review_summary(summary: dict) -> dict:
    subject = summary.get("review-subject") or {}
    subject_url = (subject.get("subject-url") or {}).get("value") or ""
    review_url_raw = summary.get("review-url")
    if isinstance(review_url_raw, dict):
        review_url = review_url_raw.get("value") or ""
    else:
        review_url = str(review_url_raw or "")
    url_raw = summary.get("url")
    if isinstance(url_raw, dict):
        review_url = url_raw.get("value") or review_url
    elif isinstance(url_raw, str) and url_raw:
        review_url = url_raw
    org = summary.get("convening-organization") or {}
    review_group_raw = summary.get("review-group-id")
    if isinstance(review_group_raw, dict):
        review_group = review_group_raw.get("value") or ""
    else:
        review_group = review_group_raw or ""
    role = (
        (summary.get("role-title") or {}).get("value")
        or summary.get("reviewer-role")
        or ""
    )
    organization = org.get("name") or ""
    subject_title = (subject.get("subject-name") or {}).get("value") or ""
    # Prefer journal/org name over opaque identifiers like issn:1234-5678
    venue = organization
    if not venue and review_group and not str(review_group).lower().startswith(("issn:", "doi:")):
        venue = review_group
    return {
        "put_code": summary.get("put-code"),
        "role": role,
        "review_type": summary.get("review-type") or "",
        "completion_date": _format_orcid_date(summary.get("completion-date")),
        "organization": organization,
        "venue": venue,
        "subject_title": subject_title,
        "subject_type": subject.get("subject-type") or "",
        "review_group": review_group,
        "url": subject_url or review_url,
    }


def _parse_affiliation_summary(summary: dict) -> dict:
    org = summary.get("organization") or {}
    address = org.get("address") or {}
    location = ", ".join(p for p in (address.get("city"), address.get("region"), address.get("country")) if p)
    end_date_raw = summary.get("end-date")
    return {
        "put_code": summary.get("put-code"),
        "organization": org.get("name") or "",
        "role_title": summary.get("role-title") or "",
        "department": summary.get("department-name") or "",
        "start_date": _format_orcid_date(summary.get("start-date")),
        "end_date": _format_orcid_date(end_date_raw) if end_date_raw else "",
        "location": location,
        "url": (summary.get("url") or {}).get("value") or "",
        "is_current": end_date_raw is None,
    }


def _affiliations_from_orcid_section(data: dict, summary_key: str) -> list[dict]:
    items = []
    for group in data.get("affiliation-group") or []:
        for summary_wrap in group.get("summaries") or []:
            summary = summary_wrap.get(summary_key)
            if summary and (summary.get("organization") or {}).get("name") or summary.get("role-title"):
                items.append(_parse_affiliation_summary(summary))
    items.sort(
        key=lambda x: (not x.get("is_current"), x.get("start_date") or ""),
        reverse=True,
    )
    return items


def _scopus_profile_url(author_id: str, url_from_orcid: str | None = None) -> str:
    if url_from_orcid and str(url_from_orcid).startswith("http"):
        return str(url_from_orcid).replace("http://", "https://", 1)
    return f"https://www.scopus.com/authid/detail.uri?authorId={author_id}"


def _parse_scopus_from_person(person_data: dict) -> dict | None:
    """Extract public Scopus Author ID from ORCID person external-identifiers."""
    for ext in (person_data.get("external-identifiers") or {}).get("external-identifier") or []:
        ext_type = (ext.get("external-id-type") or "").lower()
        if "scopus" not in ext_type:
            continue
        author_id = (ext.get("external-id-value") or "").strip()
        if not author_id:
            continue
        url = (ext.get("external-id-url") or {}).get("value") or ""
        return {
            "author_id": author_id,
            "url": _scopus_profile_url(author_id, url),
        }
    return None


class OrcidSyncService:
    """Service for syncing ORCID profile data"""
    
    @staticmethod
    async def fetch_orcid_record(orcid_id: str, access_token: str) -> dict:
        """Fetch full ORCID record using access token"""
        async with httpx.AsyncClient() as client:
            headers = {
                "Accept": "application/json",
                "Authorization": f"Bearer {access_token}"
            }
            
            response = await client.get(
                f"{ORCID_API_BASE_URL}/v3.0/{orcid_id}/record",
                headers=headers
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                raise Exception(f"Failed to fetch ORCID record: {response.status_code}")
    
    @staticmethod
    async def fetch_person_details(orcid_id: str, access_token: str) -> dict:
        """Fetch person details from ORCID"""
        async with httpx.AsyncClient() as client:
            headers = {
                "Accept": "application/json",
                "Authorization": f"Bearer {access_token}"
            }
            
            response = await client.get(
                f"{ORCID_API_BASE_URL}/v3.0/{orcid_id}/person",
                headers=headers
            )
            
            if response.status_code == 200:
                return response.json()
            return {}
    
    @staticmethod
    async def sync_user_profile(user: User, db: AsyncSession) -> OrcidProfile:
        """Sync ORCID profile data for a user"""
        if not user.orcid_id or not user.orcid_access_token:
            raise ValueError("User must have ORCID ID and access token")
        
        try:
            # Fetch person details
            person_data = await OrcidSyncService.fetch_person_details(
                user.orcid_id, 
                user.orcid_access_token
            )
            
            # Extract name
            given_names = None
            family_name = None
            biography = None
            
            if person_data.get("name"):
                name_data = person_data["name"]
                if name_data.get("given-names"):
                    given_names = name_data["given-names"].get("value")
                if name_data.get("family-name"):
                    family_name = name_data["family-name"].get("value")
            
            if person_data.get("biography"):
                biography = person_data["biography"].get("content")
            
            # Extract affiliations
            affiliations = []
            if person_data.get("employments"):
                for emp in person_data["employments"].get("affiliation-group", []):
                    for summary in emp.get("summaries", []):
                        aff_data = summary.get("employment-summary", {})
                        org_name = aff_data.get("organization", {}).get("name")
                        if org_name:
                            affiliations.append(org_name)
            
            # Fetch works
            works = []
            try:
                async with httpx.AsyncClient() as client:
                    headers = {
                        "Accept": "application/json",
                        "Authorization": f"Bearer {user.orcid_access_token}"
                    }
                    works_response = await client.get(
                        f"{ORCID_API_BASE_URL}/v3.0/{user.orcid_id}/works",
                        headers=headers
                    )
                    if works_response.status_code == 200:
                        works_data = works_response.json()
                        for group in works_data.get("group", [])[:10]:  # Limit to 10 works
                            for summary in group.get("work-summary", []):
                                title = summary.get("title", {}).get("title", {}).get("value")
                                if title:
                                    works.append(title)
            except Exception:
                pass  # Works are optional
            
            # Check visibility status
            visibility_status = "public"
            is_public = True
            
            # Create or update OrcidProfile
            result = await db.execute(
                select(OrcidProfile).where(OrcidProfile.user_id == user.id)
            )
            profile = result.scalar_one_or_none()
            
            if profile:
                # Update existing profile
                profile.given_names = given_names
                profile.family_name = family_name
                profile.biography = biography
                profile.affiliations = json.dumps(affiliations)
                profile.works = json.dumps(works)
                profile.visibility_status = visibility_status
                profile.is_public = is_public
                profile.last_synced_at = datetime.utcnow()
            else:
                # Create new profile
                profile = OrcidProfile(
                    user_id=user.id,
                    institution_id=user.primary_institution_id,
                    orcid_id=user.orcid_id,
                    given_names=given_names,
                    family_name=family_name,
                    biography=biography,
                    affiliations=json.dumps(affiliations),
                    works=json.dumps(works),
                    visibility_status=visibility_status,
                    is_public=is_public,
                    last_synced_at=datetime.utcnow()
                )
                db.add(profile)
            
            # Update user's last sync time
            user.orcid_profile_last_sync = datetime.utcnow()
            
            # Update user name if not set
            if not user.name and (given_names or family_name):
                user.name = f"{given_names or ''} {family_name or ''}".strip()
            
            await db.commit()
            await db.refresh(profile)
            
            return profile
            
        except Exception as e:
            raise Exception(f"Failed to sync ORCID profile: {str(e)}")
    
    @staticmethod
    async def determine_institution_from_affiliations(
        affiliations: list, 
        db: AsyncSession
    ) -> Institution:
        """Determine institution based on ORCID affiliations"""
        result = await db.execute(select(Institution))
        institutions = result.scalars().all()
        
        for institution in institutions:
            for affiliation in affiliations:
                if institution.name.lower() in affiliation.lower():
                    return institution
                if institution.domain.lower() in affiliation.lower():
                    return institution
        
        return None
    
    @staticmethod
    async def _fetch_orcid_section(orcid_id: str, section: str, access_token: str | None = None) -> dict:
        """Fetch a section of an ORCID record (works, peer-reviews, etc.)."""
        headers = {"Accept": "application/json"}
        bases = []
        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"
            bases.append(_member_api_base())
        bases.append(_public_api_base())

        last_status = None
        async with httpx.AsyncClient(timeout=15.0) as client:
            for base in bases:
                auth_headers = dict(headers)
                if base.startswith("https://pub.") and "Authorization" in auth_headers:
                    auth_headers.pop("Authorization", None)
                response = await client.get(
                    f"{base}/v3.0/{orcid_id}/{section}",
                    headers=auth_headers,
                )
                last_status = response.status_code
                if response.status_code == 200:
                    return response.json()
        raise Exception(f"Failed to fetch ORCID {section}: {last_status}")

    @staticmethod
    async def fetch_works(orcid_id: str, access_token: str | None = None) -> list[dict]:
        """Fetch published works from ORCID (live public or authenticated API)."""
        try:
            data = await OrcidSyncService._fetch_orcid_section(orcid_id, "works", access_token)
        except Exception:
            return []

        publications = []
        seen_titles = set()
        for group in data.get("group") or []:
            for summary in group.get("work-summary") or []:
                parsed = _parse_work_summary(summary)
                if not parsed["title"]:
                    continue
                key = parsed["title"].lower()
                if key in seen_titles:
                    continue
                seen_titles.add(key)
                publications.append(parsed)

        publications.sort(
            key=lambda w: w.get("publication_date") or "",
            reverse=True,
        )
        return publications

    @staticmethod
    async def fetch_peer_reviews(orcid_id: str, access_token: str | None = None) -> list[dict]:
        """Fetch peer review activities from ORCID."""
        try:
            data = await OrcidSyncService._fetch_orcid_section(orcid_id, "peer-reviews", access_token)
        except Exception:
            return []

        reviews = []
        for group in data.get("group") or []:
            for review_group in group.get("peer-review-group") or []:
                for summary in review_group.get("peer-review-summary") or []:
                    parsed = _parse_peer_review_summary(summary)
                    if not parsed["venue"] and not parsed["subject_title"] and not parsed["organization"]:
                        continue
                    reviews.append(parsed)

        reviews.sort(
            key=lambda r: r.get("completion_date") or "",
            reverse=True,
        )
        return reviews

    @staticmethod
    async def fetch_scopus_author_id(orcid_id: str, access_token: str | None = None) -> dict | None:
        """Fetch Scopus Author ID from public ORCID external identifiers."""
        try:
            person_data = await OrcidSyncService._fetch_orcid_section(orcid_id, "person", access_token)
        except Exception:
            return None
        return _parse_scopus_from_person(person_data)

    @staticmethod
    async def fetch_employments(orcid_id: str, access_token: str | None = None) -> list[dict]:
        """Fetch employment affiliations from ORCID."""
        try:
            data = await OrcidSyncService._fetch_orcid_section(orcid_id, "employments", access_token)
        except Exception:
            return []
        return _affiliations_from_orcid_section(data, "employment-summary")

    @staticmethod
    async def fetch_educations(orcid_id: str, access_token: str | None = None) -> list[dict]:
        """Fetch education affiliations from ORCID."""
        try:
            data = await OrcidSyncService._fetch_orcid_section(orcid_id, "educations", access_token)
        except Exception:
            return []
        return _affiliations_from_orcid_section(data, "education-summary")

    @staticmethod
    async def fetch_keywords(orcid_id: str, access_token: str | None = None) -> list[str]:
        """Fetch public research keywords from ORCID."""
        try:
            data = await OrcidSyncService._fetch_orcid_section(orcid_id, "keywords", access_token)
        except Exception:
            return []

        keywords = []
        seen = set()
        for kw in data.get("keyword") or []:
            content = (kw.get("content") or "").strip()
            if not content:
                continue
            for part in content.replace(";", ",").split(","):
                term = part.strip()
                key = term.lower()
                if term and key not in seen:
                    seen.add(key)
                    keywords.append(term)
        return keywords

    @staticmethod
    async def verify_email_domain(email: str, db: AsyncSession) -> Institution:
        """Verify email domain against institution domains"""
        if not email or "@" not in email:
            return None
        
        domain = email.split("@")[1].lower()
        print(f"[DEBUG] Verifying email domain: {domain}")
        
        result = await db.execute(select(Institution))
        institutions = result.scalars().all()
        
        print(f"[DEBUG] Found {len(institutions)} institutions in database")
        
        for institution in institutions:
            print(f"[DEBUG] Checking institution: {institution.name}")
            print(f"[DEBUG]   - Primary domain: {institution.domain}")
            print(f"[DEBUG]   - Verified domains: {institution.verified_domains}")
            
            # Check primary domain if it exists
            if institution.domain and institution.domain.strip() and institution.domain.lower() == domain:
                print(f"[DEBUG] ✓ Match found on primary domain!")
                return institution
            
            # Check verified_domains (comma-separated list)
            if institution.verified_domains and institution.verified_domains.strip():
                verified = [d.strip().lower() for d in institution.verified_domains.split(",") if d.strip()]
                print(f"[DEBUG]   - Parsed verified domains: {verified}")
                if domain in verified:
                    print(f"[DEBUG] ✓ Match found in verified domains!")
                    return institution
        
        print(f"[DEBUG] ✗ No match found for domain: {domain}")
        return None
