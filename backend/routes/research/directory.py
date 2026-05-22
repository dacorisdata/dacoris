from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from database import get_db
from models import User, ResearchProject, UserStatus, PrimaryAccountType
from auth import require_roles, ResearchRole

router = APIRouter(prefix="/api/research/directory", tags=["research-directory"])


class ResearcherOut(BaseModel):
    id: str
    name: Optional[str]
    email: str
    job_title: Optional[str]
    department: Optional[str]
    orcid_id: Optional[str]
    expertise_keywords: Optional[str]
    primary_account_type: Optional[str]
    status: str
    projects_count: int = 0
    publications_count: int = 0

    class Config:
        from_attributes = True


@router.get("", response_model=List[ResearcherOut])
async def list_researchers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.GRANT_OFFICER,
        ResearchRole.INSTITUTIONAL_LEAD,
        ResearchRole.DATA_STEWARD,
        ResearchRole.PRINCIPAL_INVESTIGATOR,
    ]))
):
    """
    List all researchers in the current institution with their project and publication counts.
    """
    if not current_user.primary_institution_id:
        raise HTTPException(400, "User must be associated with an institution")
    
    # Get all users in the institution who are researchers (RESEARCHER account type)
    result = await db.execute(
        select(User)
        .where(
            User.primary_institution_id == current_user.primary_institution_id,
            User.status.in_([UserStatus.ACTIVE, UserStatus.PENDING]),
            User.primary_account_type == PrimaryAccountType.RESEARCHER
        )
        .order_by(User.name)
    )
    users = result.scalars().all()
    
    # For each user, count their projects as PI
    enriched = []
    for user in users:
        # Count projects where user is PI
        projects_result = await db.execute(
            select(func.count(ResearchProject.id))
            .where(ResearchProject.pi_id == user.id)
        )
        projects_count = projects_result.scalar() or 0
        
        # Parse expertise keywords from JSON string to list
        expertise = user.expertise_keywords if user.expertise_keywords else None
        
        enriched.append({
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "job_title": user.job_title,
            "department": user.department,
            "orcid_id": user.orcid_id,
            "expertise_keywords": expertise,
            "primary_account_type": user.primary_account_type.value if user.primary_account_type else None,
            "status": user.status.value if user.status else "active",
            "projects_count": projects_count,
            "publications_count": 0,  # TODO: Implement when publications model is available
        })
    
    return enriched
