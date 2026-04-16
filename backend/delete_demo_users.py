"""
Delete demo users except steveggaita@ascensiondynamics.com
"""
import asyncio
from database import async_session_maker
from models import (User, Proposal, ProposalSection, ProposalDocument, ProposalCollaborator, 
                    ProposalReview, Award, BudgetLine, ResearchProject, EthicsApplication, 
                    CaptureForm, FormSubmission, GrantOpportunity, Notification)
from sqlalchemy import select, delete

async def delete_users():
    async with async_session_maker() as db:
        # Get user IDs to delete (all ascensiondynamics.com except steveggaita)
        result = await db.execute(
            select(User.id).where(
                User.email.like('%@ascensiondynamics.com'),
                User.email != 'steveggaita@ascensiondynamics.com'
            )
        )
        user_ids = [row[0] for row in result.fetchall()]
        
        if not user_ids:
            print("No demo users to delete")
            return
        
        print(f"Deleting data for {len(user_ids)} users...")
        
        # Delete in order to respect foreign key constraints
        # 1. Delete form submissions
        await db.execute(delete(FormSubmission).where(FormSubmission.submitted_by_id.in_(user_ids)))
        
        # 2. Delete capture forms
        await db.execute(delete(CaptureForm).where(CaptureForm.created_by_id.in_(user_ids)))
        
        # 3. Delete ethics applications
        await db.execute(delete(EthicsApplication).where(EthicsApplication.submitted_by_id.in_(user_ids)))
        
        # 4. Delete research projects
        await db.execute(delete(ResearchProject).where(ResearchProject.pi_id.in_(user_ids)))
        
        # 5. Delete budget lines (via awards)
        result = await db.execute(select(Award.id).where(Award.issued_by_id.in_(user_ids)))
        award_ids = [row[0] for row in result.fetchall()]
        if award_ids:
            await db.execute(delete(BudgetLine).where(BudgetLine.award_id.in_(award_ids)))
        
        # 6. Delete awards
        await db.execute(delete(Award).where(Award.issued_by_id.in_(user_ids)))
        
        # 7. Delete proposal reviews
        await db.execute(delete(ProposalReview).where(ProposalReview.reviewer_id.in_(user_ids)))
        
        # 8. Delete proposal-related data
        result = await db.execute(select(Proposal.id).where(Proposal.lead_pi_id.in_(user_ids)))
        proposal_ids = [row[0] for row in result.fetchall()]
        if proposal_ids:
            await db.execute(delete(ProposalCollaborator).where(ProposalCollaborator.proposal_id.in_(proposal_ids)))
            await db.execute(delete(ProposalDocument).where(ProposalDocument.proposal_id.in_(proposal_ids)))
            await db.execute(delete(ProposalSection).where(ProposalSection.proposal_id.in_(proposal_ids)))
        
        # 9. Delete proposals
        await db.execute(delete(Proposal).where(Proposal.lead_pi_id.in_(user_ids)))
        
        # 10. Delete grant opportunities
        await db.execute(delete(GrantOpportunity).where(GrantOpportunity.created_by_id.in_(user_ids)))
        
        # 11. Delete notifications
        await db.execute(delete(Notification).where(Notification.user_id.in_(user_ids)))
        
        # 12. Finally, delete the users
        result = await db.execute(
            delete(User).where(User.id.in_(user_ids))
        )
        
        await db.commit()
        print(f'✅ Deleted {result.rowcount} demo users and all related data')
        print('✅ Preserved steveggaita@ascensiondynamics.com')

if __name__ == "__main__":
    asyncio.run(delete_users())
