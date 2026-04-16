from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, desc
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date

from database import get_db
from models import ScholarlyWork, WorkAuthor, WorkInstitution, WorkFunder

router = APIRouter(prefix="/api/public/works", tags=["scholarly-works"])


# ==================== RESPONSE MODELS ====================

class AuthorPublic(BaseModel):
    id: int
    author_name: str
    author_position: int
    is_corresponding: bool
    orcid: Optional[str]
    affiliation_name: Optional[str]
    affiliation_country: Optional[str]
    
    class Config:
        from_attributes = True


class InstitutionPublic(BaseModel):
    id: int
    institution_name: str
    institution_country: Optional[str]
    institution_type: Optional[str]
    
    class Config:
        from_attributes = True


class FunderPublic(BaseModel):
    id: int
    funder_name: str
    funder_country: Optional[str]
    grant_number: Optional[str]
    award_amount: Optional[float]
    currency: str
    
    class Config:
        from_attributes = True


class ScholarlyWorkPublic(BaseModel):
    id: int
    title: str
    abstract: Optional[str]
    publication_year: Optional[int]
    publication_date: Optional[date]
    doi: Optional[str]
    pmid: Optional[str]
    arxiv_id: Optional[str]
    openalex_id: Optional[str]
    work_type: Optional[str]
    venue_name: Optional[str]
    volume: Optional[str]
    issue: Optional[str]
    pages: Optional[str]
    publisher: Optional[str]
    cited_by_count: int
    is_open_access: bool
    open_access_url: Optional[str]
    primary_topic: Optional[str]
    keywords: Optional[str]
    is_published: bool
    is_retracted: bool
    created_at: datetime
    authors: List[AuthorPublic] = []
    institutions: List[InstitutionPublic] = []
    funders: List[FunderPublic] = []
    
    class Config:
        from_attributes = True


class WorksStatsPublic(BaseModel):
    total_works: int
    total_authors: int
    total_institutions: int
    total_funders: int
    total_citations: int
    open_access_percentage: float


# ==================== MOCK DATA SEEDER ====================

MOCK_WORKS = [
    {
        "title": "CRISPR-Cas9 Gene Editing in African Crop Species: A Comprehensive Review",
        "abstract": "This review examines the application of CRISPR-Cas9 technology in improving African staple crops including cassava, sorghum, and cowpea. We analyze recent advances in genome editing techniques and their potential to enhance food security across sub-Saharan Africa.",
        "publication_year": 2024,
        "publication_date": "2024-03-15",
        "doi": "10.1038/s41587-024-01234-x",
        "work_type": "journal-article",
        "venue_name": "Nature Biotechnology",
        "volume": "42",
        "issue": "3",
        "pages": "345-362",
        "publisher": "Nature Publishing Group",
        "cited_by_count": 127,
        "is_open_access": True,
        "open_access_url": "https://doi.org/10.1038/s41587-024-01234-x",
        "primary_topic": "Agricultural Biotechnology",
        "keywords": '["CRISPR", "gene editing", "African crops", "food security", "biotechnology"]',
        "authors": [
            {"name": "Dr. Amina Odhiambo", "position": 1, "corresponding": True, "orcid": "0000-0002-1234-5678", "affiliation": "University of Nairobi", "country": "Kenya"},
            {"name": "Prof. James Mwangi", "position": 2, "corresponding": False, "orcid": "0000-0003-2345-6789", "affiliation": "Kenyatta University", "country": "Kenya"},
            {"name": "Dr. Sarah Kimani", "position": 3, "corresponding": False, "affiliation": "KALRO", "country": "Kenya"}
        ],
        "institutions": [
            {"name": "University of Nairobi", "country": "Kenya", "type": "university"},
            {"name": "Kenyatta University", "country": "Kenya", "type": "university"},
            {"name": "Kenya Agricultural and Livestock Research Organization", "country": "Kenya", "type": "research_institute"}
        ],
        "funders": [
            {"name": "Bill & Melinda Gates Foundation", "country": "USA", "grant": "INV-034567", "amount": 2500000, "currency": "USD"},
            {"name": "African Union Development Agency", "country": "Ethiopia", "grant": "AUDA-2024-BIO-089", "amount": 500000, "currency": "USD"}
        ]
    },
    {
        "title": "Machine Learning Approaches for Malaria Prediction in East Africa",
        "abstract": "We present novel machine learning models for predicting malaria outbreaks using climate data, population movement patterns, and historical disease records. Our ensemble approach achieves 89% accuracy in forecasting malaria incidence 3 months in advance.",
        "publication_year": 2024,
        "publication_date": "2024-01-20",
        "doi": "10.1016/j.lanepe.2024.100456",
        "pmid": "38234567",
        "work_type": "journal-article",
        "venue_name": "The Lancet Regional Health - Europe",
        "volume": "28",
        "pages": "100456",
        "publisher": "Elsevier",
        "cited_by_count": 89,
        "is_open_access": True,
        "open_access_url": "https://www.sciencedirect.com/science/article/pii/S2666776224000456",
        "primary_topic": "Public Health",
        "keywords": '["malaria", "machine learning", "disease prediction", "East Africa", "epidemiology"]',
        "authors": [
            {"name": "Dr. Peter Ouma", "position": 1, "corresponding": True, "orcid": "0000-0001-9876-5432", "affiliation": "Makerere University", "country": "Uganda"},
            {"name": "Dr. Grace Wanjiru", "position": 2, "corresponding": False, "affiliation": "University of Nairobi", "country": "Kenya"},
            {"name": "Prof. David Okello", "position": 3, "corresponding": False, "orcid": "0000-0002-3456-7890", "affiliation": "Makerere University", "country": "Uganda"}
        ],
        "institutions": [
            {"name": "Makerere University", "country": "Uganda", "type": "university"},
            {"name": "University of Nairobi", "country": "Kenya", "type": "university"}
        ],
        "funders": [
            {"name": "Wellcome Trust", "country": "UK", "grant": "WT-2023-MLR-456", "amount": 1800000, "currency": "GBP"},
            {"name": "WHO Africa Regional Office", "country": "Congo", "grant": "WHO-AFRO-2023-089", "amount": 300000, "currency": "USD"}
        ]
    },
    {
        "title": "Renewable Energy Integration in Sub-Saharan Africa: Technical and Economic Analysis",
        "abstract": "This study evaluates the technical feasibility and economic viability of integrating solar and wind energy into existing power grids across 15 sub-Saharan African countries. We propose a hybrid model that could reduce energy costs by 40% while increasing reliability.",
        "publication_year": 2023,
        "publication_date": "2023-11-10",
        "doi": "10.1016/j.energy.2023.128945",
        "work_type": "journal-article",
        "venue_name": "Energy",
        "volume": "285",
        "pages": "128945",
        "publisher": "Elsevier",
        "cited_by_count": 156,
        "is_open_access": False,
        "primary_topic": "Renewable Energy",
        "keywords": '["renewable energy", "solar power", "wind energy", "Africa", "grid integration"]',
        "authors": [
            {"name": "Dr. Emmanuel Tanui", "position": 1, "corresponding": True, "orcid": "0000-0003-4567-8901", "affiliation": "Jomo Kenyatta University", "country": "Kenya"},
            {"name": "Prof. Fatima Hassan", "position": 2, "corresponding": False, "affiliation": "University of Dar es Salaam", "country": "Tanzania"},
            {"name": "Dr. Michael Ochieng", "position": 3, "corresponding": False, "affiliation": "Strathmore University", "country": "Kenya"}
        ],
        "institutions": [
            {"name": "Jomo Kenyatta University of Agriculture and Technology", "country": "Kenya", "type": "university"},
            {"name": "University of Dar es Salaam", "country": "Tanzania", "type": "university"},
            {"name": "Strathmore University", "country": "Kenya", "type": "university"}
        ],
        "funders": [
            {"name": "African Development Bank", "country": "Ivory Coast", "grant": "AfDB-ENERGY-2022-145", "amount": 3200000, "currency": "USD"},
            {"name": "UK Research and Innovation", "country": "UK", "grant": "UKRI-GCRF-2022-789", "amount": 1500000, "currency": "GBP"}
        ]
    },
    {
        "title": "Climate Change Impact on Water Resources in the Lake Victoria Basin",
        "abstract": "Using 30 years of satellite data and climate models, we assess the impact of climate change on water availability in the Lake Victoria Basin. Our findings indicate a 15% reduction in water levels by 2050 under current emission scenarios, with significant implications for 40 million people.",
        "publication_year": 2024,
        "publication_date": "2024-02-28",
        "doi": "10.1038/s41558-024-01987-x",
        "work_type": "journal-article",
        "venue_name": "Nature Climate Change",
        "volume": "14",
        "issue": "2",
        "pages": "178-186",
        "publisher": "Nature Publishing Group",
        "cited_by_count": 203,
        "is_open_access": True,
        "open_access_url": "https://rdcu.be/dBnYz",
        "primary_topic": "Climate Science",
        "keywords": '["climate change", "water resources", "Lake Victoria", "hydrology", "East Africa"]',
        "authors": [
            {"name": "Prof. Lucy Njeri", "position": 1, "corresponding": True, "orcid": "0000-0001-2345-6789", "affiliation": "University of Nairobi", "country": "Kenya"},
            {"name": "Dr. John Okoth", "position": 2, "corresponding": False, "affiliation": "Makerere University", "country": "Uganda"},
            {"name": "Dr. Rose Wambui", "position": 3, "corresponding": False, "orcid": "0000-0004-5678-9012", "affiliation": "University of Nairobi", "country": "Kenya"},
            {"name": "Prof. Samuel Mwangi", "position": 4, "corresponding": False, "affiliation": "Egerton University", "country": "Kenya"}
        ],
        "institutions": [
            {"name": "University of Nairobi", "country": "Kenya", "type": "university"},
            {"name": "Makerere University", "country": "Uganda", "type": "university"},
            {"name": "Egerton University", "country": "Kenya", "type": "university"}
        ],
        "funders": [
            {"name": "European Research Council", "country": "Belgium", "grant": "ERC-2022-ADG-101054789", "amount": 2500000, "currency": "EUR"},
            {"name": "National Research Fund Kenya", "country": "Kenya", "grant": "NRF-2023-ENV-234", "amount": 15000000, "currency": "KES"}
        ]
    },
    {
        "title": "Artificial Intelligence in African Healthcare: Opportunities and Challenges",
        "abstract": "This comprehensive review examines the current state and future potential of AI applications in African healthcare systems. We analyze 150 AI health projects across 25 countries, identifying key success factors and barriers to implementation.",
        "publication_year": 2024,
        "publication_date": "2024-04-05",
        "doi": "10.1016/j.ijmedinf.2024.105234",
        "pmid": "38456789",
        "work_type": "journal-article",
        "venue_name": "International Journal of Medical Informatics",
        "volume": "186",
        "pages": "105234",
        "publisher": "Elsevier",
        "cited_by_count": 67,
        "is_open_access": True,
        "open_access_url": "https://www.sciencedirect.com/science/article/pii/S1386505624000234",
        "primary_topic": "Health Informatics",
        "keywords": '["artificial intelligence", "healthcare", "Africa", "digital health", "machine learning"]',
        "authors": [
            {"name": "Dr. Catherine Kariuki", "position": 1, "corresponding": True, "orcid": "0000-0002-7890-1234", "affiliation": "Aga Khan University", "country": "Kenya"},
            {"name": "Prof. Ahmed Mohamed", "position": 2, "corresponding": False, "affiliation": "University of Cape Town", "country": "South Africa"},
            {"name": "Dr. Esther Wanjiku", "position": 3, "corresponding": False, "orcid": "0000-0003-8901-2345", "affiliation": "Strathmore University", "country": "Kenya"}
        ],
        "institutions": [
            {"name": "Aga Khan University", "country": "Kenya", "type": "university"},
            {"name": "University of Cape Town", "country": "South Africa", "type": "university"},
            {"name": "Strathmore University", "country": "Kenya", "type": "university"}
        ],
        "funders": [
            {"name": "Google.org", "country": "USA", "grant": "GOOGLE-AI-AFRICA-2023", "amount": 1000000, "currency": "USD"},
            {"name": "African Academy of Sciences", "country": "Kenya", "grant": "AAS-HEALTH-2023-067", "amount": 500000, "currency": "USD"}
        ]
    },
    {
        "title": "Blockchain Technology for Land Registry Systems in Kenya: A Pilot Study",
        "abstract": "We present results from a 2-year pilot implementing blockchain-based land registry in three Kenyan counties. The system reduced land transaction times by 70% and eliminated 95% of fraudulent claims, demonstrating blockchain's potential for improving land governance in Africa.",
        "publication_year": 2023,
        "publication_date": "2023-09-18",
        "doi": "10.1016/j.landusepol.2023.106789",
        "work_type": "journal-article",
        "venue_name": "Land Use Policy",
        "volume": "134",
        "pages": "106789",
        "publisher": "Elsevier",
        "cited_by_count": 94,
        "is_open_access": False,
        "primary_topic": "Digital Governance",
        "keywords": '["blockchain", "land registry", "Kenya", "governance", "property rights"]',
        "authors": [
            {"name": "Dr. Daniel Kipchoge", "position": 1, "corresponding": True, "orcid": "0000-0004-9012-3456", "affiliation": "University of Nairobi", "country": "Kenya"},
            {"name": "Ms. Jane Muthoni", "position": 2, "corresponding": False, "affiliation": "Ministry of Lands Kenya", "country": "Kenya"},
            {"name": "Prof. Robert Kamau", "position": 3, "corresponding": False, "orcid": "0000-0001-0123-4567", "affiliation": "Strathmore University", "country": "Kenya"}
        ],
        "institutions": [
            {"name": "University of Nairobi", "country": "Kenya", "type": "university"},
            {"name": "Ministry of Lands and Physical Planning", "country": "Kenya", "type": "government"},
            {"name": "Strathmore University", "country": "Kenya", "type": "university"}
        ],
        "funders": [
            {"name": "World Bank", "country": "USA", "grant": "WB-KENYA-LAND-2021-456", "amount": 5000000, "currency": "USD"},
            {"name": "Kenya ICT Authority", "country": "Kenya", "grant": "ICTA-2021-BLOCKCHAIN-089", "amount": 50000000, "currency": "KES"}
        ]
    },
    {
        "title": "Microfinance and Women's Empowerment in Rural East Africa: A Longitudinal Study",
        "abstract": "This 5-year longitudinal study tracks 2,500 women across Kenya, Uganda, and Tanzania who received microfinance loans. We find significant improvements in household income (45% increase), children's education enrollment (32% increase), and women's decision-making power.",
        "publication_year": 2024,
        "publication_date": "2024-01-12",
        "doi": "10.1016/j.worlddev.2024.106234",
        "work_type": "journal-article",
        "venue_name": "World Development",
        "volume": "175",
        "pages": "106234",
        "publisher": "Elsevier",
        "cited_by_count": 112,
        "is_open_access": True,
        "open_access_url": "https://doi.org/10.1016/j.worlddev.2024.106234",
        "primary_topic": "Development Economics",
        "keywords": '["microfinance", "women empowerment", "East Africa", "poverty reduction", "gender equality"]',
        "authors": [
            {"name": "Prof. Mary Wangari", "position": 1, "corresponding": True, "orcid": "0000-0002-1234-5678", "affiliation": "Kenyatta University", "country": "Kenya"},
            {"name": "Dr. Patricia Akinyi", "position": 2, "corresponding": False, "affiliation": "University of Nairobi", "country": "Kenya"},
            {"name": "Dr. Susan Njoki", "position": 3, "corresponding": False, "orcid": "0000-0003-2345-6789", "affiliation": "Egerton University", "country": "Kenya"}
        ],
        "institutions": [
            {"name": "Kenyatta University", "country": "Kenya", "type": "university"},
            {"name": "University of Nairobi", "country": "Kenya", "type": "university"},
            {"name": "Egerton University", "country": "Kenya", "type": "university"}
        ],
        "funders": [
            {"name": "UN Women", "country": "USA", "grant": "UNWOMEN-EA-2019-234", "amount": 800000, "currency": "USD"},
            {"name": "Ford Foundation", "country": "USA", "grant": "FF-AFRICA-2019-567", "amount": 1200000, "currency": "USD"}
        ]
    },
    {
        "title": "Mobile Money and Financial Inclusion in Sub-Saharan Africa: Evidence from M-Pesa",
        "abstract": "Analyzing 10 years of M-Pesa transaction data from Kenya, we demonstrate how mobile money has transformed financial inclusion. Our study shows that M-Pesa lifted 194,000 households out of poverty and increased savings rates by 22% among low-income users.",
        "publication_year": 2023,
        "publication_date": "2023-12-01",
        "doi": "10.1257/aer.20221234",
        "work_type": "journal-article",
        "venue_name": "American Economic Review",
        "volume": "113",
        "issue": "12",
        "pages": "3456-3489",
        "publisher": "American Economic Association",
        "cited_by_count": 287,
        "is_open_access": False,
        "primary_topic": "Financial Economics",
        "keywords": '["mobile money", "M-Pesa", "financial inclusion", "Kenya", "poverty reduction"]',
        "authors": [
            {"name": "Prof. William Njoroge", "position": 1, "corresponding": True, "orcid": "0000-0001-3456-7890", "affiliation": "University of Nairobi", "country": "Kenya"},
            {"name": "Dr. Jennifer Wambui", "position": 2, "corresponding": False, "affiliation": "Strathmore University", "country": "Kenya"},
            {"name": "Prof. Thomas Odhiambo", "position": 3, "corresponding": False, "orcid": "0000-0002-4567-8901", "affiliation": "Kenyatta University", "country": "Kenya"}
        ],
        "institutions": [
            {"name": "University of Nairobi", "country": "Kenya", "type": "university"},
            {"name": "Strathmore University", "country": "Kenya", "type": "university"},
            {"name": "Kenyatta University", "country": "Kenya", "type": "university"}
        ],
        "funders": [
            {"name": "National Science Foundation", "country": "USA", "grant": "NSF-SES-2019-1234567", "amount": 450000, "currency": "USD"},
            {"name": "Central Bank of Kenya", "country": "Kenya", "grant": "CBK-RESEARCH-2019-089", "amount": 20000000, "currency": "KES"}
        ]
    },
    {
        "title": "Traditional Medicine Integration in Modern Healthcare: A Kenyan Perspective",
        "abstract": "This ethnobotanical study documents 127 medicinal plants used by traditional healers in Kenya and evaluates their pharmacological properties. We identify 23 plants with significant antimicrobial activity, providing a foundation for drug discovery research.",
        "publication_year": 2024,
        "publication_date": "2024-03-22",
        "doi": "10.1016/j.jep.2024.117890",
        "pmid": "38567890",
        "work_type": "journal-article",
        "venue_name": "Journal of Ethnopharmacology",
        "volume": "325",
        "pages": "117890",
        "publisher": "Elsevier",
        "cited_by_count": 45,
        "is_open_access": True,
        "open_access_url": "https://doi.org/10.1016/j.jep.2024.117890",
        "primary_topic": "Ethnopharmacology",
        "keywords": '["traditional medicine", "medicinal plants", "Kenya", "ethnobotany", "drug discovery"]',
        "authors": [
            {"name": "Dr. Margaret Nyambura", "position": 1, "corresponding": True, "orcid": "0000-0003-5678-9012", "affiliation": "Jomo Kenyatta University", "country": "Kenya"},
            {"name": "Prof. Joseph Kamau", "position": 2, "corresponding": False, "affiliation": "University of Nairobi", "country": "Kenya"},
            {"name": "Dr. Alice Wanjiru", "position": 3, "corresponding": False, "orcid": "0000-0004-6789-0123", "affiliation": "Kenya Medical Research Institute", "country": "Kenya"}
        ],
        "institutions": [
            {"name": "Jomo Kenyatta University of Agriculture and Technology", "country": "Kenya", "type": "university"},
            {"name": "University of Nairobi", "country": "Kenya", "type": "university"},
            {"name": "Kenya Medical Research Institute", "country": "Kenya", "type": "research_institute"}
        ],
        "funders": [
            {"name": "National Institutes of Health", "country": "USA", "grant": "NIH-R01-TW012345", "amount": 750000, "currency": "USD"},
            {"name": "Kenya National Research Fund", "country": "Kenya", "grant": "NRF-2022-HEALTH-456", "amount": 25000000, "currency": "KES"}
        ]
    },
    {
        "title": "Urban Planning and Sustainable Development in Nairobi: A Smart City Approach",
        "abstract": "We propose an integrated smart city framework for Nairobi addressing traffic congestion, waste management, and energy efficiency. Using IoT sensors and AI analytics, our pilot project in Westlands reduced traffic delays by 35% and improved waste collection efficiency by 50%.",
        "publication_year": 2023,
        "publication_date": "2023-10-30",
        "doi": "10.1016/j.cities.2023.104567",
        "work_type": "journal-article",
        "venue_name": "Cities",
        "volume": "143",
        "pages": "104567",
        "publisher": "Elsevier",
        "cited_by_count": 78,
        "is_open_access": False,
        "primary_topic": "Urban Planning",
        "keywords": '["smart cities", "urban planning", "Nairobi", "sustainability", "IoT"]',
        "authors": [
            {"name": "Dr. Kevin Otieno", "position": 1, "corresponding": True, "orcid": "0000-0002-7890-1234", "affiliation": "University of Nairobi", "country": "Kenya"},
            {"name": "Eng. Nancy Mwangi", "position": 2, "corresponding": False, "affiliation": "Nairobi City County", "country": "Kenya"},
            {"name": "Prof. George Odhiambo", "position": 3, "corresponding": False, "orcid": "0000-0001-8901-2345", "affiliation": "Technical University of Kenya", "country": "Kenya"}
        ],
        "institutions": [
            {"name": "University of Nairobi", "country": "Kenya", "type": "university"},
            {"name": "Nairobi City County Government", "country": "Kenya", "type": "government"},
            {"name": "Technical University of Kenya", "country": "Kenya", "type": "university"}
        ],
        "funders": [
            {"name": "UN-Habitat", "country": "Kenya", "grant": "UNHABITAT-SMART-2021-234", "amount": 2000000, "currency": "USD"},
            {"name": "Kenya Urban Roads Authority", "country": "Kenya", "grant": "KURA-2021-SMART-089", "amount": 100000000, "currency": "KES"}
        ]
    }
]


@router.post("/seed-mock-data")
async def seed_mock_data(db: AsyncSession = Depends(get_db)):
    """Seed database with 10 mock scholarly works (OpenAlex-style)"""
    try:
        # Check if data already exists
        result = await db.execute(select(func.count(ScholarlyWork.id)))
        count = result.scalar()
        
        if count > 0:
            return {"message": f"Database already contains {count} works. Skipping seed."}
        
        for work_data in MOCK_WORKS:
            # Create work
            work = ScholarlyWork(
                title=work_data["title"],
                abstract=work_data["abstract"],
                publication_year=work_data["publication_year"],
                publication_date=datetime.strptime(work_data["publication_date"], "%Y-%m-%d").date(),
                doi=work_data["doi"],
                pmid=work_data.get("pmid"),
                arxiv_id=work_data.get("arxiv_id"),
                work_type=work_data["work_type"],
                venue_name=work_data["venue_name"],
                volume=work_data.get("volume"),
                issue=work_data.get("issue"),
                pages=work_data.get("pages"),
                publisher=work_data["publisher"],
                cited_by_count=work_data["cited_by_count"],
                is_open_access=work_data["is_open_access"],
                open_access_url=work_data.get("open_access_url"),
                primary_topic=work_data["primary_topic"],
                keywords=work_data["keywords"],
                is_published=True,
                is_retracted=False
            )
            db.add(work)
            await db.flush()
            
            # Add authors
            for author_data in work_data["authors"]:
                author = WorkAuthor(
                    work_id=work.id,
                    author_name=author_data["name"],
                    author_position=author_data["position"],
                    is_corresponding=author_data["corresponding"],
                    orcid=author_data.get("orcid"),
                    affiliation_name=author_data["affiliation"],
                    affiliation_country=author_data["country"]
                )
                db.add(author)
            
            # Add institutions
            for inst_data in work_data["institutions"]:
                institution = WorkInstitution(
                    work_id=work.id,
                    institution_name=inst_data["name"],
                    institution_country=inst_data["country"],
                    institution_type=inst_data["type"]
                )
                db.add(institution)
            
            # Add funders
            for funder_data in work_data["funders"]:
                funder = WorkFunder(
                    work_id=work.id,
                    funder_name=funder_data["name"],
                    funder_country=funder_data["country"],
                    grant_number=funder_data["grant"],
                    award_amount=funder_data["amount"],
                    currency=funder_data["currency"]
                )
                db.add(funder)
        
        await db.commit()
        return {"message": f"Successfully seeded {len(MOCK_WORKS)} scholarly works with authors, institutions, and funders"}
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to seed data: {str(e)}")


# ==================== PUBLIC ENDPOINTS ====================

@router.get("/stats", response_model=WorksStatsPublic)
async def get_works_stats(db: AsyncSession = Depends(get_db)):
    """Get scholarly works statistics - FAIR: Findable"""
    works_count = await db.execute(select(func.count(ScholarlyWork.id)))
    total_works = works_count.scalar() or 0
    
    authors_count = await db.execute(select(func.count(WorkAuthor.id.distinct())))
    total_authors = authors_count.scalar() or 0
    
    inst_count = await db.execute(select(func.count(WorkInstitution.institution_name.distinct())))
    total_institutions = inst_count.scalar() or 0
    
    funder_count = await db.execute(select(func.count(WorkFunder.funder_name.distinct())))
    total_funders = funder_count.scalar() or 0
    
    citations_sum = await db.execute(select(func.sum(ScholarlyWork.cited_by_count)))
    total_citations = citations_sum.scalar() or 0
    
    oa_count = await db.execute(select(func.count(ScholarlyWork.id)).where(ScholarlyWork.is_open_access == True))
    oa_works = oa_count.scalar() or 0
    oa_percentage = (oa_works / total_works * 100) if total_works > 0 else 0
    
    return {
        "total_works": total_works,
        "total_authors": total_authors,
        "total_institutions": total_institutions,
        "total_funders": total_funders,
        "total_citations": total_citations,
        "open_access_percentage": round(oa_percentage, 1)
    }


@router.get("/", response_model=List[ScholarlyWorkPublic])
async def list_works(
    search: Optional[str] = None,
    topic: Optional[str] = None,
    year: Optional[int] = None,
    open_access: Optional[bool] = None,
    limit: int = Query(20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """List scholarly works with filters - FAIR: Findable, Accessible"""
    query = select(ScholarlyWork).options(
        selectinload(ScholarlyWork.authors),
        selectinload(ScholarlyWork.institutions),
        selectinload(ScholarlyWork.funders)
    )
    
    if search:
        query = query.where(
            or_(
                ScholarlyWork.title.ilike(f'%{search}%'),
                ScholarlyWork.abstract.ilike(f'%{search}%'),
                ScholarlyWork.keywords.ilike(f'%{search}%')
            )
        )
    if topic:
        query = query.where(ScholarlyWork.primary_topic.ilike(f'%{topic}%'))
    if year:
        query = query.where(ScholarlyWork.publication_year == year)
    if open_access is not None:
        query = query.where(ScholarlyWork.is_open_access == open_access)
    
    query = query.order_by(desc(ScholarlyWork.cited_by_count)).limit(limit).offset(offset)
    result = await db.execute(query)
    works = result.scalars().all()
    
    return works


@router.get("/{work_id}", response_model=ScholarlyWorkPublic)
async def get_work(work_id: int, db: AsyncSession = Depends(get_db)):
    """Get single work details - FAIR: Accessible, Interoperable"""
    result = await db.execute(
        select(ScholarlyWork)
        .options(
            selectinload(ScholarlyWork.authors),
            selectinload(ScholarlyWork.institutions),
            selectinload(ScholarlyWork.funders)
        )
        .where(ScholarlyWork.id == work_id)
    )
    work = result.scalar_one_or_none()
    
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    
    return work


@router.get("/topics/list")
async def list_topics(db: AsyncSession = Depends(get_db)):
    """List all unique topics - FAIR: Findable"""
    result = await db.execute(
        select(ScholarlyWork.primary_topic)
        .where(ScholarlyWork.primary_topic.isnot(None))
        .distinct()
        .order_by(ScholarlyWork.primary_topic)
    )
    topics = [topic for (topic,) in result.all() if topic]
    return {"topics": topics}


@router.get("/authors/list")
async def list_authors(
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db)
):
    """List authors with publication counts"""
    result = await db.execute(
        select(
            WorkAuthor.author_name,
            WorkAuthor.orcid,
            WorkAuthor.affiliation_name,
            func.count(WorkAuthor.work_id).label('publication_count')
        )
        .group_by(WorkAuthor.author_name, WorkAuthor.orcid, WorkAuthor.affiliation_name)
        .order_by(desc('publication_count'))
        .limit(limit)
    )
    authors = result.all()
    
    return [
        {
            "name": name,
            "orcid": orcid,
            "affiliation": affiliation,
            "publication_count": count
        }
        for name, orcid, affiliation, count in authors
    ]


@router.get("/institutions/list")
async def list_institutions(
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db)
):
    """List institutions with publication counts"""
    result = await db.execute(
        select(
            WorkInstitution.institution_name,
            WorkInstitution.institution_country,
            func.count(WorkInstitution.work_id).label('publication_count')
        )
        .group_by(WorkInstitution.institution_name, WorkInstitution.institution_country)
        .order_by(desc('publication_count'))
        .limit(limit)
    )
    institutions = result.all()
    
    return [
        {
            "name": name,
            "country": country,
            "publication_count": count
        }
        for name, country, count in institutions
    ]


@router.get("/funders/list")
async def list_funders(
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db)
):
    """List funders with funding statistics"""
    result = await db.execute(
        select(
            WorkFunder.funder_name,
            WorkFunder.funder_country,
            func.count(WorkFunder.work_id).label('grants_count'),
            func.sum(WorkFunder.award_amount).label('total_funding')
        )
        .group_by(WorkFunder.funder_name, WorkFunder.funder_country)
        .order_by(desc('grants_count'))
        .limit(limit)
    )
    funders = result.all()
    
    return [
        {
            "name": name,
            "country": country,
            "grants_count": count,
            "total_funding": float(funding) if funding else 0
        }
        for name, country, count, funding in funders
    ]
