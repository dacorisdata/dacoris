import asyncio
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import select, delete
from database import async_session_maker
from models import Workflow, WorkflowStage, WorkflowType, WorkflowStatus, User
import uuid


def generate_uuid():
    return str(uuid.uuid4())


def _stage(workflow_id, order, name, role, days, desc, approvals=1):
    return WorkflowStage(
        id=generate_uuid(),
        workflow_id=workflow_id,
        stage_order=order,
        stage_name=name,
        assigned_role=role,
        approvals_required=approvals,
        duration_days=days,
        description=desc,
    )


PROPOSAL_STAGES = [
    (1, "Received",       "ADMIN_STAFF",               3,  "Submitted & intake"),
    (2, "Eligibility",    "GRANT_MANAGER",             7,  "Step 1/5: Eligibility check"),
    (3, "Technical",      "EXTERNAL_REVIEWER",        14,  "Step 2/5: Expert review", 2),
    (4, "Budget",         "FINANCE_OFFICER",           7,  "Step 3/5: Finance review"),
    (5, "Panel",          "GRANT_MANAGER",            14,  "Step 4/5: Panel decision"),
    (6, "Final Approval", "INSTITUTIONAL_LEADERSHIP",  7,  "Step 5/5: Institutional sign-off"),
]

PROJECT_STAGES = [
    (1, "Received",           "ADMIN_STAFF",               3,  "Submitted & intake"),
    (2, "Documentation",      "ADMIN_STAFF",               5,  "Step 1/5: Verify project documentation"),
    (3, "Budget & Resources", "FINANCE_OFFICER",           7,  "Step 2/5: Budget and resource validation"),
    (4, "Compliance",         "ETHICS_COMMITTEE_MEMBER",   7,  "Step 3/5: Ethics and compliance check"),
    (5, "Department Review",  "GRANT_MANAGER",            10,  "Step 4/5: Department / faculty approval"),
    (6, "Final Activation",   "INSTITUTIONAL_LEADERSHIP",  5,  "Step 5/5: Institutional sign-off"),
]

ETHICS_STAGES = [
    (1, "Received",          "ADMIN_STAFF",               3,  "Submitted & intake"),
    (2, "Administrative",    "ADMIN_STAFF",               5,  "Step 1/5: Administrative screening"),
    (3, "Reviewer Assignment","GRANT_MANAGER",            3,  "Step 2/5: Assign committee reviewers"),
    (4, "Committee Review",  "ETHICS_COMMITTEE_MEMBER",  14,  "Step 3/5: Committee review", 2),
    (5, "Decision",          "ETHICS_COMMITTEE_MEMBER",   7,  "Step 4/5: Board decision"),
    (6, "Final Approval",    "INSTITUTIONAL_LEADERSHIP",  5,  "Step 5/5: Chair sign-off"),
]

ETHICS_EXPEDITED_STAGES = [
    (1, "Administrative Check", "ADMIN_STAFF",               2, "Verify completeness of application"),
    (2, "Ethics Committee Review", "ETHICS_COMMITTEE_MEMBER", 7, "Single reviewer assessment for minimal risk"),
]

DMP_STAGES = [
    (1, "Data Steward Review",  "DATA_STEWARD",   7, "Review data management practices and compliance"),
    (2, "Technical Validation", "DATA_ENGINEER",  5, "Validate technical feasibility and infrastructure"),
]


async def _upsert_default_workflow(session, admin_id, workflow_type, name, description, stages_spec):
    """Replace the default workflow for a type with the given stages."""
    result = await session.execute(
        select(Workflow).where(
            Workflow.workflow_type == workflow_type,
            Workflow.is_default == True,
        )
    )
    existing = result.scalars().all()

    for wf in existing:
        await session.execute(delete(WorkflowStage).where(WorkflowStage.workflow_id == wf.id))
        await session.delete(wf)

    workflow = Workflow(
        id=generate_uuid(),
        name=name,
        workflow_type=workflow_type,
        description=description,
        status=WorkflowStatus.ACTIVE,
        is_default=True,
        created_by_id=admin_id,
    )
    session.add(workflow)
    await session.flush()

    for spec in stages_spec:
        order, name, role, days, desc = spec[:5]
        approvals = spec[5] if len(spec) > 5 else 1
        session.add(_stage(workflow.id, order, name, role, days, desc, approvals))

    return workflow


async def _ensure_workflow(session, admin_id, workflow_type, name, description, stages_spec, is_default=False):
    """Create a non-default workflow only if one with the same name does not exist."""
    result = await session.execute(
        select(Workflow).where(Workflow.name == name)
    )
    if result.scalar_one_or_none():
        return None

    workflow = Workflow(
        id=generate_uuid(),
        name=name,
        workflow_type=workflow_type,
        description=description,
        status=WorkflowStatus.ACTIVE,
        is_default=is_default,
        created_by_id=admin_id,
    )
    session.add(workflow)
    await session.flush()

    for spec in stages_spec:
        order, sname, role, days, desc = spec[:5]
        approvals = spec[5] if len(spec) > 5 else 1
        session.add(_stage(workflow.id, order, sname, role, days, desc, approvals))

    return workflow


async def seed_default_workflows(force=False):
    async with async_session_maker() as session:
        result = await session.execute(select(User).where(User.email == "ra@dacoris.com"))
        admin_user = result.scalar_one_or_none()

        if not admin_user:
            result = await session.execute(select(User).where(User.email == "admin@dacoris.org"))
            admin_user = result.scalar_one_or_none()

        if not admin_user:
            print("WARNING: Admin user not found. Creating workflows without creator.")
            admin_id = None
        else:
            admin_id = admin_user.id

        existing = await session.execute(select(Workflow))
        if existing.scalars().first() and not force:
            print("WARNING: Workflows already exist. Run with --force to replace default workflows.")
            return

        print("Creating default review workflows...")

        await _upsert_default_workflow(
            session, admin_id,
            WorkflowType.PROPOSAL_REVIEW,
            "Standard Proposal Review",
            "Six-stage review pipeline for research grant proposals",
            PROPOSAL_STAGES,
        )
        print("[OK] Standard Proposal Review (6 stages)")

        await _upsert_default_workflow(
            session, admin_id,
            WorkflowType.PROJECT_REVIEW,
            "Standard Project Review",
            "Six-stage review pipeline for research project activation",
            PROJECT_STAGES,
        )
        print("[OK] Standard Project Review (6 stages)")

        await _upsert_default_workflow(
            session, admin_id,
            WorkflowType.ETHICS_REVIEW,
            "Standard Ethics Review",
            "Six-stage review pipeline for ethics applications",
            ETHICS_STAGES,
        )
        print("[OK] Standard Ethics Review (6 stages)")

        expedited = await _ensure_workflow(
            session, admin_id,
            WorkflowType.ETHICS_REVIEW,
            "Expedited Ethics Review",
            "Fast-track review for minimal risk studies",
            ETHICS_EXPEDITED_STAGES,
            is_default=False,
        )
        if expedited:
            print("[OK] Expedited Ethics Review (2 stages)")

        dmp = await _ensure_workflow(
            session, admin_id,
            WorkflowType.DMP_REVIEW,
            "DMP Standard Review",
            "Review process for Data Management Plans",
            DMP_STAGES,
            is_default=True,
        )
        if dmp:
            print("[OK] DMP Standard Review (2 stages)")

        await session.commit()
        print("\nDone: Default review workflows seeded successfully!")


if __name__ == "__main__":
    force = "--force" in sys.argv
    asyncio.run(seed_default_workflows(force=force))
