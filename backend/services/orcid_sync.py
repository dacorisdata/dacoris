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
