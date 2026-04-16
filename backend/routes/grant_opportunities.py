"""
Grant Opportunities Management API
Supports manual creation, Excel import, and external API integration
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, update, delete, func
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
import pandas as pd
import io
import httpx

from database import get_db
from auth import get_current_user
from models import User, GrantOpportunity

router = APIRouter(prefix="/api/grants", tags=["grants"])


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


# ==================== MODELS ====================

class OpportunityCreate(BaseModel):
    title: str
    sponsor: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    funding_type: Optional[str] = None
    currency: str = "KES"
    amount_min: Optional[float] = None
    amount_max: Optional[float] = None
    deadline: Optional[date] = None
    eligibility: Optional[str] = None
    criteria: Optional[str] = None
    application_url: Optional[str] = None
    contact_email: Optional[str] = None
    status: str = "open"


class OpportunityResponse(BaseModel):
    id: int
    title: str
    sponsor: Optional[str]
    description: Optional[str]
    category: Optional[str]
    funding_type: Optional[str]
    currency: str
    amount_min: Optional[float]
    amount_max: Optional[float]
    deadline: Optional[date]
    eligibility: Optional[str]
    criteria: Optional[str]
    application_url: Optional[str]
    contact_email: Optional[str]
    status: str
    created_at: datetime
    created_by_id: int
    
    class Config:
        from_attributes = True


class ExternalAPIImportRequest(BaseModel):
    api_url: str = Field(default="http://localhost:8000/api/mock/external-opportunities")
    filters: Optional[dict] = None


# ==================== ENDPOINTS ====================

@router.get("/opportunities", response_model=List[OpportunityResponse])
async def list_opportunities(
    status_filter: Optional[str] = None,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all grant opportunities with optional filters"""
    query = select(GrantOpportunity).order_by(GrantOpportunity.created_at.desc())
    
    if status_filter:
        query = query.where(GrantOpportunity.status == status_filter)
    if category:
        query = query.where(GrantOpportunity.category.ilike(f'%{category}%'))
    
    result = await db.execute(query)
    opportunities = result.scalars().all()
    return opportunities


@router.post("/opportunities", response_model=OpportunityResponse, status_code=status.HTTP_201_CREATED)
async def create_opportunity(
    opportunity: OpportunityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new grant opportunity manually"""
    db_opportunity = GrantOpportunity(
        title=opportunity.title,
        sponsor=opportunity.sponsor,
        description=opportunity.description,
        category=opportunity.category,
        funding_type=opportunity.funding_type,
        currency=opportunity.currency,
        amount_min=opportunity.amount_min,
        amount_max=opportunity.amount_max,
        deadline=opportunity.deadline,
        eligibility=opportunity.eligibility,
        criteria=opportunity.criteria,
        application_url=opportunity.application_url,
        contact_email=opportunity.contact_email,
        status=opportunity.status,
        created_by_id=current_user.id,
        institution_id=current_user.primary_institution_id
    )
    db.add(db_opportunity)
    await db.commit()
    await db.refresh(db_opportunity)
    return db_opportunity


@router.post("/opportunities/import/excel")
async def import_from_excel(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Import grant opportunities from Excel file
    Expected columns: title, sponsor, description, category, funding_type, 
                     currency, amount_min, amount_max, deadline, eligibility, 
                     application_url, contact_email, status
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an Excel file (.xlsx or .xls)"
        )
    
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # Validate required columns
        required_cols = ['title']
        missing = [col for col in required_cols if col not in df.columns]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required columns: {', '.join(missing)}"
            )
        
        # Process each row
        imported_count = 0
        errors = []
        
        for idx, row in df.iterrows():
            try:
                # Convert deadline to date if present
                deadline = parse_date(row.get('deadline'))
                
                opp_data = {
                    "title": str(row['title']),
                    "sponsor": str(row.get('sponsor', '')) if pd.notna(row.get('sponsor')) else None,
                    "description": str(row.get('description', '')) if pd.notna(row.get('description')) else None,
                    "category": str(row.get('category', '')) if pd.notna(row.get('category')) else None,
                    "funding_type": str(row.get('funding_type', '')) if pd.notna(row.get('funding_type')) else None,
                    "currency": str(row.get('currency', 'KES')),
                    "amount_min": float(row['amount_min']) if pd.notna(row.get('amount_min')) else None,
                    "amount_max": float(row['amount_max']) if pd.notna(row.get('amount_max')) else None,
                    "deadline": deadline,
                    "eligibility": str(row.get('eligibility', '')) if pd.notna(row.get('eligibility')) else None,
                    "application_url": str(row.get('application_url', '')) if pd.notna(row.get('application_url')) else None,
                    "contact_email": str(row.get('contact_email', '')) if pd.notna(row.get('contact_email')) else None,
                    "status": str(row.get('status', 'open')),
                }
                
                # Insert into database
                db_opp = GrantOpportunity(
                    **opp_data, 
                    created_by_id=current_user.id,
                    institution_id=current_user.primary_institution_id
                )
                db.add(db_opp)
                imported_count += 1
                
            except Exception as e:
                errors.append(f"Row {idx + 2}: {str(e)}")
        
        await db.commit()
        
        return {
            "success": True,
            "imported_count": imported_count,
            "total_rows": len(df),
            "errors": errors if errors else None
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process Excel file: {str(e)}"
        )


@router.post("/opportunities/import/api")
async def import_from_external_api(
    request: ExternalAPIImportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Import grant opportunities from external API
    Demonstrates integration capability with external grant databases
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(request.api_url, params=request.filters or {})
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
                    # Map external API fields to our schema
                    # Map external API fields to our schema
                    deadline_str = item.get('deadline') or item.get('closing_date')
                    opp_data = {
                        "title": item.get('title') or item.get('name'),
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
                    
                    # Insert into database
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
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Import failed: {str(e)}"
        )


@router.get("/opportunities/template/excel")
async def download_excel_template():
    """Download Excel template for batch import"""
    from fastapi.responses import StreamingResponse
    
    # Create template DataFrame
    template_data = {
        'title': ['Example Grant Opportunity 1', 'Example Grant Opportunity 2'],
        'sponsor': ['Wellcome Trust', 'Bill & Melinda Gates Foundation'],
        'description': ['Research grant for health innovation', 'Agricultural development grant'],
        'category': ['Health', 'Agriculture'],
        'funding_type': ['Grant', 'Grant'],
        'currency': ['USD', 'USD'],
        'amount_min': [50000, 100000],
        'amount_max': [150000, 500000],
        'deadline': ['2024-12-31', '2025-06-30'],
        'eligibility': ['Universities and research institutions', 'NGOs and research organizations'],
        'application_url': ['https://wellcome.org/apply', 'https://gatesfoundation.org/apply'],
        'contact_email': ['grants@wellcome.org', 'grants@gatesfoundation.org'],
        'status': ['open', 'upcoming']
    }
    
    df = pd.DataFrame(template_data)
    
    # Create Excel file in memory
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Grant Opportunities')
        
        # Auto-adjust column widths
        worksheet = writer.sheets['Grant Opportunities']
        for idx, col in enumerate(df.columns):
            max_length = max(df[col].astype(str).apply(len).max(), len(col)) + 2
            worksheet.column_dimensions[chr(65 + idx)].width = min(max_length, 50)
    
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=grant_opportunities_template.xlsx"}
    )


# ==================== MOCK EXTERNAL API ====================

@router.get("/mock/external-opportunities")
async def mock_external_grant_api(
    category: Optional[str] = None,
    min_amount: Optional[float] = None
):
    """
    Mock external grant opportunities API
    Simulates integration with external funding databases like:
    - Grants.gov
    - Research Professional
    - Pivot-RP
    - Foundation Directory Online
    """
    mock_opportunities = [
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
            "amount_min": 75000,
            "amount_max": 300000,
            "deadline": "2024-10-31",
            "eligibility": "African universities and research centers",
            "application_url": "https://www.afdb.org/en/topics-and-sectors/initiatives-partnerships/climate-resilience-program",
            "contact_email": "climate.research@afdb.org"
        },
        {
            "title": "Digital Innovation for Development",
            "sponsor": "USAID Kenya",
            "description": "Supporting digital solutions for education, healthcare delivery, and financial inclusion in Kenya.",
            "category": "Technology",
            "funding_type": "Innovation Grant",
            "currency": "USD",
            "amount_min": 50000,
            "amount_max": 200000,
            "deadline": "2024-08-31",
            "eligibility": "Kenyan tech startups, universities, and innovation hubs",
            "application_url": "https://www.usaid.gov/kenya/work-usaid/get-grant-or-contract",
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
    
    # Apply filters if provided
    filtered = mock_opportunities
    if category:
        filtered = [o for o in filtered if o['category'].lower() == category.lower()]
    if min_amount:
        filtered = [o for o in filtered if o.get('amount_min', 0) >= min_amount]
    
    return filtered
