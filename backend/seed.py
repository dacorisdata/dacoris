"""
Prototype seed script — creates demo institution, users, and sample data.
Run once after database initialisation.
Usage: python seed.py
"""
import asyncio
from datetime import datetime, timezone, timedelta
from database import async_session_maker
from models import (
    Institution, User, AccountType, UserStatus,
    GrantOpportunity, Proposal, ProposalSection, ProposalStatus,
    Award, AwardStatus, BudgetLine,
    ResearchProject, ProjectStatus,
    EthicsApplication, EthicsStatus,
    CaptureForm,
)
from auth import get_password_hash
import json

DEMO_INSTITUTION = {
    "name": "Ascension Dynamics",
    "domain": "ascensiondynamics.com",
    "verified_domains": "ascensiondynamics.com",
    "is_active": True,
}

async def seed():
    async with async_session_maker() as db:
        # ── Institution ─────────────────────────────────────────────────────
        from sqlalchemy import select
        result = await db.execute(select(Institution).where(Institution.domain == "ascensiondynamics.com"))
        inst = result.scalar_one_or_none()
        
        if inst:
            print("[WARN] Institution 'ascensiondynamics.com' already exists, using existing institution")
        else:
            inst = Institution(**DEMO_INSTITUTION)
            db.add(inst)
            await db.flush()
            print("[OK] Created institution: Demo Research University")

        # ── Users ───────────────────────────────────────────────────────────
        users = {}
        user_data = [
            {"email": "pi@ascensiondynamics.com",        "name": "Dr. Amina Odhiambo",  "role": "pi"},
            {"email": "grant@ascensiondynamics.com",      "name": "James Kariuki",        "role": "grant_officer"},
            {"email": "finance@ascensiondynamics.com",    "name": "Grace Waweru",         "role": "finance_officer"},
            {"email": "reviewer@ascensiondynamics.com",   "name": "Prof. David Mutua",    "role": "external_reviewer"},
            {"email": "ethics@ascensiondynamics.com",     "name": "Dr. Fatuma Hassan",    "role": "ethics_chair"},
            {"email": "data@ascensiondynamics.com",       "name": "Brian Otieno",         "role": "data_steward"},
        ]
        for u in user_data:
            result = await db.execute(select(User).where(User.email == u["email"]))
            user = result.scalar_one_or_none()
            
            if user:
                print(f"[WARN] User {u['email']} already exists, skipping")
                users[u["role"]] = user
            else:
                user = User(
                    email=u["email"],
                    name=u["name"],
                    password_hash=get_password_hash("Demo@12345"),
                    account_type=AccountType.ORCID,
                    status=UserStatus.ACTIVE,
                    primary_institution_id=inst.id,
                )
                db.add(user)
                await db.flush()
                users[u["role"]] = user
                print(f"[OK] Created user: {u['email']}")

        # ── Grant Opportunity ─────────────────────────────────────────────
        opp = GrantOpportunity(
            institution_id=inst.id,
            title="Digital Health Innovation Grant 2026",
            sponsor="Kenya National Research Fund",
            description="Funding digital health solutions for rural communities.",
            category="Health Technology",
            geography="Kenya",
            applicant_type="Research Institution",
            funding_type="competitive_grant",
            amount_min=500_000,
            amount_max=2_000_000,
            currency="KES",
            open_date=datetime.now(timezone.utc),
            deadline=datetime.now(timezone.utc) + timedelta(days=45),
            status="open",
            created_by_id=users["grant_officer"].id,
        )
        db.add(opp)
        await db.flush()

        # ── Proposal ─────────────────────────────────────────────────────
        proposal = Proposal(
            opportunity_id=opp.id,
            institution_id=inst.id,
            lead_pi_id=users["pi"].id,
            title="Mobile-Based Maternal Health Monitoring System",
            status=ProposalStatus.DRAFT,
        )
        db.add(proposal)
        await db.flush()

        sections = [
            ("executive_summary", "Executive Summary",
             "<p>This project develops a mobile-based system to monitor maternal health indicators in rural Kenya, targeting a 30% reduction in preventable maternal deaths.</p>"),
            ("problem_statement", "Problem Statement",
             "<p>Rural communities lack access to consistent prenatal care. This system bridges the gap using SMS and offline-capable mobile apps.</p>"),
            ("methodology", "Methodology",
             "<p>Mixed-methods approach: quantitative health tracking via ODK forms and qualitative FGDs with community health workers.</p>"),
            ("budget_justification", "Budget Justification", ""),
            ("mel_plan", "M&E Plan", ""),
        ]
        for stype, stitle, content in sections:
            db.add(ProposalSection(
                proposal_id=proposal.id,
                section_type=stype,
                title=stitle,
                content_html=content,
                word_count=len(content.split()),
            ))

        # ── Award (for a separate funded project) ─────────────────────────
        opp2 = GrantOpportunity(
            institution_id=inst.id,
            title="Climate Resilience Research Fund",
            sponsor="African Development Bank",
            description="Research on climate adaptation for smallholder farmers.",
            amount_max=5_000_000,
            currency="KES",
            deadline=datetime.now(timezone.utc) - timedelta(days=30),
            status="closed",
            created_by_id=users["grant_officer"].id,
        )
        db.add(opp2)
        await db.flush()

        funded_proposal = Proposal(
            opportunity_id=opp2.id,
            institution_id=inst.id,
            lead_pi_id=users["pi"].id,
            title="Drought-Resistant Crop Varieties for Arid Regions",
            status=ProposalStatus.AWARDED,
            submitted_at=datetime.now(timezone.utc) - timedelta(days=20),
        )
        db.add(funded_proposal)
        await db.flush()

        award = Award(
            proposal_id=funded_proposal.id,
            institution_id=inst.id,
            award_number="AWD-2026-DEMO01",
            funder_name="African Development Bank",
            total_amount=3_500_000,
            currency="KES",
            start_date=datetime.now(timezone.utc),
            end_date=datetime.now(timezone.utc) + timedelta(days=730),
            status=AwardStatus.ACTIVE,
            issued_by_id=users["grant_officer"].id,
        )
        db.add(award)
        await db.flush()

        budget_lines = [
            ("Personnel", "PI and RA salaries", 1_400_000),
            ("Equipment", "Lab equipment and sensors", 700_000),
            ("Field Work", "Travel and data collection", 500_000),
            ("Overhead", "Institutional overhead 20%", 700_000),
            ("Publications", "Open access fees", 200_000),
        ]
        for cat, desc, amt in budget_lines:
            db.add(BudgetLine(award_id=award.id, category=cat, description=desc, amount=amt))

        # ── Research Project ──────────────────────────────────────────────
        project = ResearchProject(
            institution_id=inst.id,
            award_id=award.id,
            pi_id=users["pi"].id,
            title="Drought-Resistant Crop Varieties for Arid Regions",
            description="Field research on improved crop varieties in Baringo County.",
            project_type="funded",
            status=ProjectStatus.ACTIVE,
            involves_human_subjects=True,
            start_date=datetime.now(timezone.utc),
            end_date=datetime.now(timezone.utc) + timedelta(days=730),
        )
        db.add(project)
        await db.flush()

        # ── Ethics Application ────────────────────────────────────────────
        db.add(EthicsApplication(
            project_id=project.id,
            institution_id=inst.id,
            application_type="full_review",
            status=EthicsStatus.SUBMITTED,
            title="Human Subjects Ethics Application: Drought Research",
            lay_summary="Research involving smallholder farmers via structured interviews.",
            methodology="Household surveys and FGDs with 200 farmers across 3 counties.",
            risk_assessment="Minimal risk. Informed consent will be obtained.",
            data_handling="Data pseudonymised, stored on institutional servers only.",
            submitted_by_id=users["pi"].id,
            submitted_at=datetime.now(timezone.utc) - timedelta(days=5),
        ))

        # ── Capture Form ──────────────────────────────────────────────────
        form_schema = {
            "fields": [
                {"name": "farmer_name", "label": "Farmer Name", "type": "text", "required": True},
                {"name": "county", "label": "County", "type": "select_one",
                 "choices": ["Baringo", "Laikipia", "Turkana"], "required": True},
                {"name": "farm_size_acres", "label": "Farm Size (acres)", "type": "decimal"},
                {"name": "primary_crop", "label": "Primary Crop", "type": "text"},
                {"name": "has_irrigation", "label": "Has Irrigation?",
                 "type": "select_one", "choices": ["Yes", "No"]},
                {"name": "gps_location", "label": "Farm GPS Location", "type": "geopoint"},
            ]
        }
        db.add(CaptureForm(
            institution_id=inst.id,
            project_id=project.id,
            title="Farmer Baseline Survey",
            description="Baseline socioeconomic and agricultural data collection from farmers.",
            source_system="kobo",
            external_form_id="aXdemo123",
            external_endpoint="https://kf.kobotoolbox.org/api/v2/assets/aXdemo123/data/",
            form_schema=json.dumps(form_schema),
            created_by_id=users["data_steward"].id,
        ))

        await db.commit()
        print("[OK] Seed data created successfully!")
        print("\n[INFO] Demo Login Credentials (password: Demo@12345 for all):")
        for u in user_data:
            print(f"  {u['role']:20s} -> {u['email']}")
        print(f"\n[INFO] Institution: Ascension Dynamics")
        print(f"[INFO] Opportunity: Digital Health Innovation Grant 2026")
        print(f"[INFO] Proposal in DRAFT: Mobile-Based Maternal Health Monitoring System")
        print(f"[INFO] Funded award: AWD-2026-DEMO01 (KES 3,500,000)")
        print(f"[INFO] Active project with ethics application submitted")
        print(f"[INFO] Capture form: Farmer Baseline Survey (KoBoToolbox linked)")

if __name__ == "__main__":
    asyncio.run(seed())
