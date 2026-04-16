from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from database import get_db
from models import (Proposal, ProposalSection, ProposalDocument,
                    ProposalCollaborator, ProposalStatus, GrantOpportunity, User)
from auth import require_roles, ResearchRole
from services.workflow import can_transition_proposal
from services.notifications import create_notification
from services.file_upload import save_upload

router = APIRouter(prefix="/api/grants/proposals", tags=["proposals"])

DEFAULT_SECTIONS = [
    {"section_type": "executive_summary", "title": "Executive Summary"},
    {"section_type": "problem_statement", "title": "Problem Statement"},
    {"section_type": "methodology", "title": "Methodology"},
    {"section_type": "budget_justification", "title": "Budget Justification"},
    {"section_type": "mel_plan", "title": "M&E Plan"},
]


class ProposalCreate(BaseModel):
    opportunity_id: int
    title: str


class ProposalOut(BaseModel):
    id: int
    title: str
    status: str
    opportunity_id: int
    lead_pi_id: int
    current_version: int
    submitted_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class SectionUpdate(BaseModel):
    content_html: str
    word_count: Optional[int] = 0


@router.post("", response_model=ProposalOut, status_code=201)
async def create_proposal(
    data: ProposalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER]))
):
    opp = await db.get(GrantOpportunity, data.opportunity_id)
    if not opp or opp.institution_id != current_user.primary_institution_id:
        raise HTTPException(404, "Opportunity not found")

    proposal = Proposal(
        opportunity_id=data.opportunity_id,
        institution_id=current_user.primary_institution_id,
        lead_pi_id=current_user.id,
        title=data.title,
    )
    db.add(proposal)
    await db.flush()

    for s in DEFAULT_SECTIONS:
        db.add(ProposalSection(proposal_id=proposal.id, **s))

    await db.commit()
    await db.refresh(proposal)
    return proposal


@router.get("", response_model=List[ProposalOut])
async def list_proposals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER,
        ResearchRole.INSTITUTIONAL_LEAD
    ]))
):
    query = select(Proposal).where(
        Proposal.institution_id == current_user.primary_institution_id
    )
    result = await db.execute(query.order_by(Proposal.created_at.desc()))
    return result.scalars().all()


@router.get("/{proposal_id}")
async def get_proposal(
    proposal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER,
        ResearchRole.INSTITUTIONAL_LEAD
    ]))
):
    result = await db.execute(
        select(Proposal)
        .options(
            selectinload(Proposal.sections),
            selectinload(Proposal.documents),
            selectinload(Proposal.collaborators),
            selectinload(Proposal.reviews),
        )
        .where(
            Proposal.id == proposal_id,
            Proposal.institution_id == current_user.primary_institution_id
        )
    )
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(404, "Proposal not found")
    return proposal


@router.put("/{proposal_id}/sections/{section_id}")
async def update_section(
    proposal_id: int,
    section_id: int,
    data: SectionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER]))
):
    result = await db.execute(
        select(ProposalSection).where(
            ProposalSection.id == section_id,
            ProposalSection.proposal_id == proposal_id,
        )
    )
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(404, "Section not found")

    section.content_html = data.content_html
    section.word_count = data.word_count
    section.last_edited_by_id = current_user.id
    section.version += 1
    await db.commit()
    return {"id": section_id, "version": section.version}


@router.post("/{proposal_id}/documents", status_code=201)
async def upload_document(
    proposal_id: int,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER]))
):
    result = await db.execute(select(Proposal).where(
        Proposal.id == proposal_id,
        Proposal.institution_id == current_user.primary_institution_id
    ))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(404, "Proposal not found")

    file_info = await save_upload(file, subfolder="documents")
    doc = ProposalDocument(
        proposal_id=proposal_id,
        document_type=document_type,
        uploaded_by_id=current_user.id,
        **file_info,
    )
    db.add(doc)
    await db.commit()
    return {"id": doc.id, "filename": file_info["original_filename"]}


@router.patch("/{proposal_id}/status")
async def transition_proposal_status(
    proposal_id: int,
    target_status: ProposalStatus,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER
    ]))
):
    result = await db.execute(select(Proposal).where(
        Proposal.id == proposal_id,
        Proposal.institution_id == current_user.primary_institution_id
    ))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(404, "Proposal not found")

    if not can_transition_proposal(proposal.status, target_status):
        raise HTTPException(400, f"Cannot move from {proposal.status} to {target_status}")

    proposal.status = target_status
    if target_status == ProposalStatus.SUBMITTED:
        proposal.submitted_at = datetime.now(timezone.utc)

    await db.commit()

    if target_status == ProposalStatus.RETURNED and proposal.lead_pi_id != current_user.id:
        await create_notification(
            db, proposal.lead_pi_id,
            title="Proposal returned for revision",
            message=f'Your proposal "{proposal.title}" requires revision.',
            entity_type="proposal", entity_id=proposal_id
        )

    return {"id": proposal_id, "status": target_status}


@router.post("/{proposal_id}/collaborators", status_code=201)
async def add_collaborator(
    proposal_id: int,
    user_id: int,
    role: str = "co_investigator",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    """Add a collaborator to a proposal"""
    result = await db.execute(select(Proposal).where(
        Proposal.id == proposal_id,
        Proposal.lead_pi_id == current_user.id
    ))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(404, "Proposal not found or you're not the lead PI")
    
    # Check if user exists
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    
    # Check if already a collaborator
    existing = await db.execute(select(ProposalCollaborator).where(
        ProposalCollaborator.proposal_id == proposal_id,
        ProposalCollaborator.user_id == user_id
    ))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "User is already a collaborator")
    
    collaborator = ProposalCollaborator(
        proposal_id=proposal_id,
        user_id=user_id,
        role=role
    )
    db.add(collaborator)
    await db.commit()
    
    await create_notification(
        db, user_id,
        title="Added to proposal",
        message=f'You have been added as {role} to proposal "{proposal.title}"',
        entity_type="proposal", entity_id=proposal_id
    )
    
    return {"id": collaborator.id, "user_id": user_id, "role": role}


@router.delete("/{proposal_id}/collaborators/{collaborator_id}")
async def remove_collaborator(
    proposal_id: int,
    collaborator_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([ResearchRole.PRINCIPAL_INVESTIGATOR]))
):
    """Remove a collaborator from a proposal"""
    result = await db.execute(select(Proposal).where(
        Proposal.id == proposal_id,
        Proposal.lead_pi_id == current_user.id
    ))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(404, "Proposal not found or you're not the lead PI")
    
    collaborator = await db.get(ProposalCollaborator, collaborator_id)
    if not collaborator or collaborator.proposal_id != proposal_id:
        raise HTTPException(404, "Collaborator not found")
    
    await db.delete(collaborator)
    await db.commit()
    return {"message": "Collaborator removed"}


@router.get("/{proposal_id}/completion")
async def get_proposal_completion(
    proposal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        ResearchRole.PRINCIPAL_INVESTIGATOR, ResearchRole.GRANT_OFFICER
    ]))
):
    """Get proposal completion percentage"""
    result = await db.execute(
        select(Proposal).options(
            selectinload(Proposal.sections),
            selectinload(Proposal.documents)
        ).where(
            Proposal.id == proposal_id,
            Proposal.institution_id == current_user.primary_institution_id
        )
    )
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(404, "Proposal not found")
    
    total_sections = len(proposal.sections)
    completed_sections = sum(1 for s in proposal.sections if s.word_count > 50)
    
    required_docs = ["cv", "budget", "support_letter"]
    uploaded_doc_types = {d.document_type for d in proposal.documents}
    completed_docs = sum(1 for dt in required_docs if dt in uploaded_doc_types)
    
    section_pct = (completed_sections / total_sections * 100) if total_sections > 0 else 0
    doc_pct = (completed_docs / len(required_docs) * 100) if required_docs else 0
    overall_pct = (section_pct * 0.7 + doc_pct * 0.3)
    
    return {
        "overall_percentage": round(overall_pct, 1),
        "sections_completed": completed_sections,
        "sections_total": total_sections,
        "documents_completed": completed_docs,
        "documents_required": len(required_docs),
        "missing_documents": [dt for dt in required_docs if dt not in uploaded_doc_types]
    }
