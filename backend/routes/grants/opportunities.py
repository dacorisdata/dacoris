from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
import pandas as pd
import io
import httpx

from database import get_db
from models import GrantOpportunity, User
from auth import require_roles, ResearchRole, get_current_user
from services.opportunity_import import OpportunityImportService

router = APIRouter(prefix="/api/grants/opportunities", tags=["opportunities"])


class OpportunityCreate(BaseModel):
    title: str
    sponsor: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    geography: Optional[str] = None
    applicant_type: Optional[str] = None
    funding_type: Optional[str] = None
    amount_min: Optional[float] = None
    amount_max: Optional[float] = None
    currency: str = "KES"
    open_date: Optional[datetime] = None
    deadline: Optional[datetime] = None


class OpportunityOut(BaseModel):
    id: str
    title: str
    sponsor: Optional[str]
    description: Optional[str]
    category: Optional[str]
    geography: Optional[str]
    applicant_type: Optional[str]
    funding_type: Optional[str]
    amount_min: Optional[float]
    amount_max: Optional[float]
    currency: str
    deadline: Optional[date]
    status: str
    is_curated: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=List[OpportunityOut])
async def list_opportunities(
    status: Optional[str] = Query(None),
    curated_only: Optional[bool] = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List grant opportunities from database.
    - Global/Institution admins see all opportunities
    - Admin-staff and researchers see only opportunities matching their institution's categories
    """
    from models import OpportunityCategory, InstitutionCategory, OpportunityCategories
    
    # Only Global Admins and Institution Admins see ALL opportunities
    # Everyone else (including admin-staff and researchers) see filtered by institution categories
    is_global_or_inst_admin = current_user.is_global_admin or current_user.is_institution_admin
    
    if is_global_or_inst_admin:
        # Global/Institution admins see all opportunities
        query = select(GrantOpportunity)
        
        if status:
            query = query.where(GrantOpportunity.status == status)
        
        if curated_only:
            query = query.where(GrantOpportunity.is_curated == True)
        
        result = await db.execute(query.order_by(GrantOpportunity.deadline))
        return result.scalars().all()
    
    # Admin-staff and researchers see only opportunities matching their institution's categories
    if not current_user.primary_institution_id:
        return []
    
    # Get institution's category IDs
    inst_categories_result = await db.execute(
        select(InstitutionCategory.category_id).where(
            InstitutionCategory.institution_id == current_user.primary_institution_id
        )
    )
    institution_category_ids = [row[0] for row in inst_categories_result.fetchall()]
    
    if not institution_category_ids:
        # Institution has no categories assigned, return empty list
        return []
    
    # Get opportunities that match institution's categories
    query = (
        select(GrantOpportunity)
        .join(OpportunityCategories, GrantOpportunity.id == OpportunityCategories.opportunity_id)
        .where(OpportunityCategories.category_id.in_(institution_category_ids))
        .distinct()
    )
    
    if status:
        query = query.where(GrantOpportunity.status == status)
    
    if curated_only:
        query = query.where(GrantOpportunity.is_curated == True)
    
    result = await db.execute(query.order_by(GrantOpportunity.deadline))
    return result.scalars().all()


@router.post("", response_model=OpportunityOut, status_code=201)
async def create_opportunity(
    data: OpportunityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.GRANT_OFFICER, ResearchRole.SYSTEM_ADMIN
    ]))
):
    opp = GrantOpportunity(
        institution_id=current_user.primary_institution_id,
        created_by_id=current_user.id,
        **data.model_dump()
    )
    db.add(opp)
    await db.commit()
    await db.refresh(opp)
    return opp


@router.get("/from-excel-source")
async def get_opportunities_from_excel(
    current_user: User = Depends(get_current_user)
):
    """Fetch opportunities from Excel file without persisting to database"""
    try:
        from pathlib import Path
        import traceback
        
        excel_path = Path(__file__).parent.parent.parent / "data" / "opportunities.xlsx"
        
        if not excel_path.exists():
            print(f"Excel file not found at: {excel_path}")
            return []
        
        opportunities = OpportunityImportService.parse_dacoris_excel_file(str(excel_path))
        
        result = []
        for idx, opp in enumerate(opportunities, 1):
            result.append({
                "id": idx,
                "title": opp.get("title"),
                "sponsor": opp.get("sponsor"),
                "description": opp.get("description"),
                "category": opp.get("category"),
                "geography": opp.get("geography"),
                "applicant_type": opp.get("applicant_type"),
                "funding_type": opp.get("funding_type"),
                "amount_min": opp.get("amount_min"),
                "amount_max": opp.get("amount_max"),
                "currency": opp.get("currency", "KES"),
                "deadline": opp.get("deadline").isoformat() if opp.get("deadline") else None,
                "eligibility": opp.get("eligibility"),
                "criteria": opp.get("criteria"),
                "application_url": opp.get("application_url"),
                "contact_email": opp.get("contact_email"),
                "source_system": opp.get("source_system", "excel_import"),
                "source_id": opp.get("source_id"),
                "status": opp.get("status", "open"),
                "created_at": datetime.now().isoformat()
            })
        
        return result
        
    except Exception as e:
        import traceback
        print(f"[ERROR] Error reading Excel file: {e}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read opportunities: {str(e)}"
        )


@router.get("/{opp_id}", response_model=OpportunityOut)
async def get_opportunity(
    opp_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.GRANT_OFFICER, ResearchRole.PRINCIPAL_INVESTIGATOR,
        ResearchRole.INSTITUTIONAL_LEAD, ResearchRole.SYSTEM_ADMIN
    ]))
):
    result = await db.execute(
        select(GrantOpportunity).where(
            GrantOpportunity.id == opp_id,
            GrantOpportunity.institution_id == current_user.primary_institution_id
        )
    )
    opp = result.scalar_one_or_none()
    if not opp:
        raise HTTPException(404, "Opportunity not found")
    return opp


@router.patch("/{opp_id}/status")
async def update_opportunity_status(
    opp_id: str,
    status: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.GRANT_OFFICER]))
):
    result = await db.execute(select(GrantOpportunity).where(
        GrantOpportunity.id == opp_id,
        GrantOpportunity.institution_id == current_user.primary_institution_id
    ))
    opp = result.scalar_one_or_none()
    if not opp:
        raise HTTPException(404, "Opportunity not found")
    opp.status = status
    await db.commit()
    return {"id": opp_id, "status": status}


@router.delete("/{opp_id}")
async def delete_opportunity(
    opp_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a grant opportunity"""
    result = await db.execute(
        select(GrantOpportunity).where(
            GrantOpportunity.id == opp_id,
            GrantOpportunity.institution_id == current_user.primary_institution_id
        )
    )
    opp = result.scalar_one_or_none()
    if not opp:
        raise HTTPException(404, "Opportunity not found")
    
    await db.delete(opp)
    await db.commit()
    return {"success": True, "message": "Opportunity deleted successfully"}


# ==================== HELPER FUNCTIONS ====================

def parse_date(date_value):
    """Convert various date formats to Python date object"""
    if not date_value:
        return None
    if isinstance(date_value, date):
        return date_value
    if isinstance(date_value, datetime):
        return date_value.date()
    if isinstance(date_value, str):
        try:
            return datetime.strptime(date_value, '%Y-%m-%d').date()
        except ValueError:
            try:
                return datetime.strptime(date_value, '%Y/%m/%d').date()
            except ValueError:
                return None
    return None


# ==================== IMPORT ENDPOINTS ====================

@router.post("/import/excel")
async def import_from_excel(
    file: UploadFile = File(...),
    skip_duplicates: bool = Query(True, description="Skip duplicate opportunities"),
    update_existing: bool = Query(False, description="Update existing opportunities"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Import grant opportunities from Excel file with deduplication"""
    try:
        # Save uploaded file temporarily
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp_file:
            contents = await file.read()
            tmp_file.write(contents)
            tmp_file_path = tmp_file.name
        
        try:
            # Parse Excel file
            opportunities = OpportunityImportService.parse_excel_file(tmp_file_path)
            
            if not opportunities:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No valid opportunities found in file"
                )
            
            # Import opportunities
            created, skipped, errors = await OpportunityImportService.import_opportunities(
                db=db,
                opportunities=opportunities,
                created_by_id=current_user.id,
                institution_id=current_user.primary_institution_id,
                skip_duplicates=skip_duplicates,
                update_existing=update_existing
            )
            
            return {
                "success": True,
                "created_count": created,
                "skipped_count": skipped,
                "total_rows": len(opportunities),
                "errors": errors if errors else None
            }
            
        finally:
            # Clean up temp file
            os.unlink(tmp_file_path)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process Excel file: {str(e)}"
        )


class ExternalAPIImportRequest(BaseModel):
    api_url: str


@router.post("/import/api")
async def import_from_external_api(
    request: ExternalAPIImportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Import grant opportunities from external API"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(request.api_url)
            response.raise_for_status()
            external_data = response.json()
            
            if not isinstance(external_data, list):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="External API must return a list of opportunities"
                )
            
            imported_count = 0
            errors = []
            
            for item in external_data:
                try:
                    title = item.get('title') or item.get('name')
                    
                    # Check if opportunity already exists
                    existing = await db.execute(
                        select(GrantOpportunity).where(
                            GrantOpportunity.title == title,
                            GrantOpportunity.institution_id == current_user.primary_institution_id
                        )
                    )
                    if existing.scalar_one_or_none():
                        errors.append(f"Opportunity '{title}' already exists - skipped")
                        continue
                    
                    deadline_str = item.get('deadline') or item.get('closing_date')
                    opp_data = {
                        "title": title,
                        "sponsor": item.get('sponsor') or item.get('funder') or item.get('organization'),
                        "description": item.get('description') or item.get('summary'),
                        "category": item.get('category') or item.get('focus_area'),
                        "funding_type": item.get('funding_type') or item.get('type'),
                        "currency": item.get('currency', 'USD'),
                        "amount_min": item.get('amount_min') or item.get('min_award'),
                        "amount_max": item.get('amount_max') or item.get('max_award'),
                        "deadline": parse_date(deadline_str),
                        "eligibility": item.get('eligibility') or item.get('requirements'),
                        "application_url": item.get('application_url') or item.get('url'),
                        "contact_email": item.get('contact_email') or item.get('email'),
                        "status": "open",
                    }
                    
                    db_opp = GrantOpportunity(
                        **opp_data,
                        created_by_id=current_user.id,
                        institution_id=current_user.primary_institution_id
                    )
                    db.add(db_opp)
                    imported_count += 1
                    
                except Exception as e:
                    errors.append(f"Item '{item.get('title', 'Unknown')}': {str(e)}")
            
            await db.commit()
            
            return {
                "success": True,
                "imported_count": imported_count,
                "total_items": len(external_data),
                "errors": errors if errors else None
            }
            
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch from external API: {str(e)}"
        )


@router.get("/template/excel")
async def download_excel_template():
    """Download Excel template for batch import"""
    template_data = {
        'title': ['Sample Grant Opportunity'],
        'sponsor': ['Example Foundation'],
        'description': ['Description of the grant opportunity'],
        'category': ['Health'],
        'funding_type': ['Research Grant'],
        'currency': ['KES'],
        'amount_min': [100000],
        'amount_max': [500000],
        'deadline': ['2024-12-31'],
        'eligibility': ['Universities and research institutions'],
        'application_url': ['https://example.org/apply'],
        'contact_email': ['grants@example.org'],
        'status': ['open']
    }
    
    df = pd.DataFrame(template_data)
    output = io.BytesIO()
    
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Opportunities')
        worksheet = writer.sheets['Opportunities']
        for idx, col in enumerate(df.columns):
            max_length = max(df[col].astype(str).apply(len).max(), len(col)) + 2
            worksheet.column_dimensions[chr(65 + idx)].width = min(max_length, 50)
    
    output.seek(0)
    
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        io.BytesIO(output.getvalue()),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=grant_opportunities_template.xlsx"}
    )


# ==================== MOCK EXTERNAL API ====================

@router.get("/mock/external-opportunities")
async def mock_external_api():
    """Mock external grant opportunities API for testing"""
    return [
        {
            "title": "Global Health Innovation Fund 2024",
            "sponsor": "Wellcome Trust",
            "description": "Supporting innovative research to address major health challenges in low- and middle-income countries. Focus areas include infectious diseases, maternal health, and health systems strengthening.",
            "category": "Health",
            "funding_type": "Research Grant",
            "currency": "GBP",
            "amount_min": 100000,
            "amount_max": 500000,
            "deadline": "2024-09-30",
            "eligibility": "Universities, research institutions, and NGOs in Africa and Asia",
            "application_url": "https://wellcome.org/grant-funding/schemes/global-health-innovation-fund",
            "contact_email": "grants@wellcome.org"
        },
        {
            "title": "Agricultural Transformation Initiative",
            "sponsor": "Bill & Melinda Gates Foundation",
            "description": "Grants to support smallholder farmers through improved agricultural practices, market access, and climate-resilient crops.",
            "category": "Agriculture",
            "funding_type": "Development Grant",
            "currency": "USD",
            "amount_min": 250000,
            "amount_max": 2000000,
            "deadline": "2024-11-15",
            "eligibility": "NGOs, research organizations, and agricultural institutions in Sub-Saharan Africa",
            "application_url": "https://www.gatesfoundation.org/how-we-work/general-information/grant-opportunities",
            "contact_email": "agriculture@gatesfoundation.org"
        },
        {
            "title": "Climate Resilience Research Program",
            "sponsor": "African Development Bank",
            "description": "Research grants focused on climate adaptation strategies, renewable energy, and sustainable water management in African contexts.",
            "category": "Environment",
            "funding_type": "Research Grant",
            "currency": "USD",
            "amount_min": 150000,
            "amount_max": 800000,
            "deadline": "2024-10-20",
            "eligibility": "African universities and research centers",
            "application_url": "https://www.afdb.org/en/topics-and-sectors/initiatives-partnerships/climate-resilience",
            "contact_email": "climate@afdb.org"
        },
        {
            "title": "Digital Innovation for Development",
            "sponsor": "USAID",
            "description": "Supporting technology-driven solutions for development challenges including education, healthcare delivery, and financial inclusion.",
            "category": "Technology",
            "funding_type": "Innovation Grant",
            "currency": "USD",
            "amount_min": 50000,
            "amount_max": 300000,
            "deadline": "2024-08-31",
            "eligibility": "Tech startups, NGOs, and research institutions in USAID partner countries",
            "application_url": "https://www.usaid.gov/digital-development",
            "contact_email": "innovation@usaid.gov"
        },
        {
            "title": "Women in STEM Leadership Fellowship",
            "sponsor": "L'Oréal-UNESCO For Women in Science",
            "description": "Fellowships for outstanding women scientists in Africa pursuing research in life sciences, physical sciences, mathematics, or computer science.",
            "category": "STEM",
            "funding_type": "Fellowship",
            "currency": "EUR",
            "amount_min": 15000,
            "amount_max": 15000,
            "deadline": "2024-07-15",
            "eligibility": "Women scientists with PhD in African countries",
            "application_url": "https://www.forwomeninscience.com/",
            "contact_email": "fwis@unesco.org"
        },
        {
            "title": "Tuberculosis Research Initiative - East Africa",
            "sponsor": "EDCTP (European & Developing Countries Clinical Trials Partnership)",
            "description": "Clinical trials and implementation research on tuberculosis prevention, diagnosis, and treatment in East African settings.",
            "category": "Health",
            "funding_type": "Clinical Research Grant",
            "currency": "EUR",
            "amount_min": 500000,
            "amount_max": 3000000,
            "deadline": "2024-12-01",
            "eligibility": "Research consortia led by African institutions with European partners",
            "application_url": "https://www.edctp.org/call/tuberculosis-research-initiative/",
            "contact_email": "tb.research@edctp.org"
        }
    ]


# ==================== CURATION ENDPOINTS ====================

@router.patch("/{opportunity_id}/curate")
async def toggle_curation(
    opportunity_id: str,
    curate: bool = Query(..., description="True to publish, False to unpublish"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Toggle curation status (publish/unpublish to researchers)"""
    result = await db.execute(
        select(GrantOpportunity).where(GrantOpportunity.id == opportunity_id)
    )
    opportunity = result.scalar_one_or_none()
    
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    
    opportunity.is_curated = curate
    await db.commit()
    await db.refresh(opportunity)
    
    return {
        "id": opportunity.id,
        "title": opportunity.title,
        "is_curated": opportunity.is_curated,
        "message": f"Opportunity {'published' if curate else 'unpublished'} successfully"
    }


@router.post("/bulk-curate")
async def bulk_curate_opportunities(
    opportunity_ids: List[int],
    curate: bool = Query(..., description="True to publish, False to unpublish"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bulk publish/unpublish opportunities"""
    from sqlalchemy import update
    
    stmt = (
        update(GrantOpportunity)
        .where(GrantOpportunity.id.in_(opportunity_ids))
        .values(is_curated=curate)
    )
    
    result = await db.execute(stmt)
    await db.commit()
    
    return {
        "updated_count": result.rowcount,
        "is_curated": curate,
        "message": f"{result.rowcount} opportunities {'published' if curate else 'unpublished'}"
    }


# ==================== BOOKMARK ENDPOINTS ====================

@router.post("/{opportunity_id}/bookmark")
async def bookmark_opportunity(
    opportunity_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bookmark an opportunity (save for later)"""
    from models import OpportunityBookmark
    
    # Check if opportunity exists
    result = await db.execute(
        select(GrantOpportunity).where(GrantOpportunity.id == opportunity_id)
    )
    opportunity = result.scalar_one_or_none()
    
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    
    # Check if already bookmarked
    existing = await db.execute(
        select(OpportunityBookmark).where(
            OpportunityBookmark.opportunity_id == opportunity_id,
            OpportunityBookmark.user_id == current_user.id
        )
    )
    
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Opportunity already bookmarked")
    
    # Create bookmark
    bookmark = OpportunityBookmark(
        opportunity_id=opportunity_id,
        user_id=current_user.id
    )
    db.add(bookmark)
    await db.commit()
    
    return {"message": "Opportunity bookmarked successfully", "opportunity_id": opportunity_id}


@router.delete("/{opportunity_id}/bookmark")
async def remove_bookmark(
    opportunity_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove bookmark from an opportunity"""
    from models import OpportunityBookmark
    
    result = await db.execute(
        select(OpportunityBookmark).where(
            OpportunityBookmark.opportunity_id == opportunity_id,
            OpportunityBookmark.user_id == current_user.id
        )
    )
    bookmark = result.scalar_one_or_none()
    
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    
    await db.delete(bookmark)
    await db.commit()
    
    return {"message": "Bookmark removed successfully", "opportunity_id": opportunity_id}


@router.get("/bookmarks/my")
async def get_my_bookmarks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all bookmarked opportunities for current user"""
    from models import OpportunityBookmark
    
    result = await db.execute(
        select(GrantOpportunity)
        .join(OpportunityBookmark)
        .where(OpportunityBookmark.user_id == current_user.id)
        .order_by(OpportunityBookmark.created_at.desc())
    )
    
    opportunities = result.scalars().all()
    
    return [
        {
            "id": opp.id,
            "title": opp.title,
            "sponsor": opp.sponsor,
            "deadline": opp.deadline,
            "status": opp.status,
            "is_curated": opp.is_curated
        }
        for opp in opportunities
    ]
