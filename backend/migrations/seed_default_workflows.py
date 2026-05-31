import asyncio
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import select
from database import async_session_maker
from models import Workflow, WorkflowStage, WorkflowType, WorkflowStatus, User
import uuid


def generate_uuid():
    return str(uuid.uuid4())


async def seed_default_workflows():
    async with async_session_maker() as session:
        result = await session.execute(select(User).where(User.email == "ra@dacoris.com"))
        admin_user = result.scalar_one_or_none()
        
        if not admin_user:
            print("⚠️  Admin user ra@dacoris.com not found. Creating workflows without creator.")
            admin_id = None
        else:
            admin_id = admin_user.id
        
        existing = await session.execute(select(Workflow))
        if existing.scalars().first():
            print("⚠️  Workflows already exist. Skipping seed.")
            return
        
        print("Creating default workflows...")
        
        proposal_workflow = Workflow(
            id=generate_uuid(),
            name="Standard Proposal Review",
            workflow_type=WorkflowType.PROPOSAL_REVIEW,
            description="Multi-stage review process for research proposals",
            status=WorkflowStatus.ACTIVE,
            is_default=True,
            created_by_id=admin_id,
        )
        session.add(proposal_workflow)
        await session.flush()
        
        proposal_stages = [
            WorkflowStage(
                id=generate_uuid(),
                workflow_id=proposal_workflow.id,
                stage_order=1,
                stage_name="Initial Screening",
                assigned_role="GRANT_MANAGER",
                approvals_required=1,
                duration_days=5,
                description="Initial eligibility and completeness check",
            ),
            WorkflowStage(
                id=generate_uuid(),
                workflow_id=proposal_workflow.id,
                stage_order=2,
                stage_name="Technical Review",
                assigned_role="EXTERNAL_REVIEWER",
                approvals_required=2,
                duration_days=14,
                description="Technical and scientific merit evaluation",
            ),
            WorkflowStage(
                id=generate_uuid(),
                workflow_id=proposal_workflow.id,
                stage_order=3,
                stage_name="Budget Review",
                assigned_role="FINANCE_OFFICER",
                approvals_required=1,
                duration_days=7,
                description="Financial feasibility and budget validation",
            ),
            WorkflowStage(
                id=generate_uuid(),
                workflow_id=proposal_workflow.id,
                stage_order=4,
                stage_name="Final Approval",
                assigned_role="INSTITUTIONAL_LEADERSHIP",
                approvals_required=1,
                duration_days=5,
                description="Executive decision and final sign-off",
            ),
        ]
        for stage in proposal_stages:
            session.add(stage)
        
        print("✓ Created Standard Proposal Review workflow")
        
        ethics_expedited = Workflow(
            id=generate_uuid(),
            name="Expedited Ethics Review",
            workflow_type=WorkflowType.ETHICS_REVIEW,
            description="Fast-track review for minimal risk studies",
            status=WorkflowStatus.ACTIVE,
            is_default=False,
            created_by_id=admin_id,
        )
        session.add(ethics_expedited)
        await session.flush()
        
        ethics_expedited_stages = [
            WorkflowStage(
                id=generate_uuid(),
                workflow_id=ethics_expedited.id,
                stage_order=1,
                stage_name="Administrative Check",
                assigned_role="ADMIN_STAFF",
                approvals_required=1,
                duration_days=2,
                description="Verify completeness of application",
            ),
            WorkflowStage(
                id=generate_uuid(),
                workflow_id=ethics_expedited.id,
                stage_order=2,
                stage_name="Ethics Committee Review",
                assigned_role="ETHICS_COMMITTEE_MEMBER",
                approvals_required=1,
                duration_days=7,
                description="Single reviewer assessment for minimal risk",
            ),
        ]
        for stage in ethics_expedited_stages:
            session.add(stage)
        
        print("✓ Created Expedited Ethics Review workflow")
        
        ethics_full = Workflow(
            id=generate_uuid(),
            name="Full Ethics Board Review",
            workflow_type=WorkflowType.ETHICS_REVIEW,
            description="Comprehensive review for higher risk or complex studies",
            status=WorkflowStatus.ACTIVE,
            is_default=True,
            created_by_id=admin_id,
        )
        session.add(ethics_full)
        await session.flush()
        
        ethics_full_stages = [
            WorkflowStage(
                id=generate_uuid(),
                workflow_id=ethics_full.id,
                stage_order=1,
                stage_name="Administrative Check",
                assigned_role="ADMIN_STAFF",
                approvals_required=1,
                duration_days=3,
                description="Verify completeness of application",
            ),
            WorkflowStage(
                id=generate_uuid(),
                workflow_id=ethics_full.id,
                stage_order=2,
                stage_name="Primary Review",
                assigned_role="ETHICS_COMMITTEE_MEMBER",
                approvals_required=2,
                duration_days=14,
                description="Detailed review by two committee members",
            ),
            WorkflowStage(
                id=generate_uuid(),
                workflow_id=ethics_full.id,
                stage_order=3,
                stage_name="Board Discussion",
                assigned_role="ETHICS_COMMITTEE_MEMBER",
                approvals_required=3,
                duration_days=7,
                description="Full board meeting and deliberation",
            ),
            WorkflowStage(
                id=generate_uuid(),
                workflow_id=ethics_full.id,
                stage_order=4,
                stage_name="Chair Approval",
                assigned_role="INSTITUTIONAL_LEADERSHIP",
                approvals_required=1,
                duration_days=3,
                description="Final approval by ethics committee chair",
            ),
        ]
        for stage in ethics_full_stages:
            session.add(stage)
        
        print("✓ Created Full Ethics Board Review workflow")
        
        project_workflow = Workflow(
            id=generate_uuid(),
            name="Project Activation Review",
            workflow_type=WorkflowType.PROJECT_REVIEW,
            description="Review process for activating new research projects",
            status=WorkflowStatus.ACTIVE,
            is_default=True,
            created_by_id=admin_id,
        )
        session.add(project_workflow)
        await session.flush()
        
        project_stages = [
            WorkflowStage(
                id=generate_uuid(),
                workflow_id=project_workflow.id,
                stage_order=1,
                stage_name="Documentation Review",
                assigned_role="ADMIN_STAFF",
                approvals_required=1,
                duration_days=3,
                description="Verify all required documentation is complete",
            ),
            WorkflowStage(
                id=generate_uuid(),
                workflow_id=project_workflow.id,
                stage_order=2,
                stage_name="Resource Allocation",
                assigned_role="GRANT_MANAGER",
                approvals_required=1,
                duration_days=5,
                description="Confirm resource availability and allocation",
            ),
            WorkflowStage(
                id=generate_uuid(),
                workflow_id=project_workflow.id,
                stage_order=3,
                stage_name="Final Activation",
                assigned_role="INSTITUTIONAL_LEADERSHIP",
                approvals_required=1,
                duration_days=2,
                description="Approve project activation",
            ),
        ]
        for stage in project_stages:
            session.add(stage)
        
        print("✓ Created Project Activation Review workflow")
        
        dmp_workflow = Workflow(
            id=generate_uuid(),
            name="DMP Standard Review",
            workflow_type=WorkflowType.DMP_REVIEW,
            description="Review process for Data Management Plans",
            status=WorkflowStatus.ACTIVE,
            is_default=True,
            created_by_id=admin_id,
        )
        session.add(dmp_workflow)
        await session.flush()
        
        dmp_stages = [
            WorkflowStage(
                id=generate_uuid(),
                workflow_id=dmp_workflow.id,
                stage_order=1,
                stage_name="Data Steward Review",
                assigned_role="DATA_STEWARD",
                approvals_required=1,
                duration_days=7,
                description="Review data management practices and compliance",
            ),
            WorkflowStage(
                id=generate_uuid(),
                workflow_id=dmp_workflow.id,
                stage_order=2,
                stage_name="Technical Validation",
                assigned_role="DATA_ENGINEER",
                approvals_required=1,
                duration_days=5,
                description="Validate technical feasibility and infrastructure",
            ),
        ]
        for stage in dmp_stages:
            session.add(stage)
        
        print("✓ Created DMP Standard Review workflow")
        
        await session.commit()
        print("\n✅ All default workflows seeded successfully!")


if __name__ == "__main__":
    asyncio.run(seed_default_workflows())
