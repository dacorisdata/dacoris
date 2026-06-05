"""
Platform-wide default training programmes seeded per institution.
Institutions may add custom programmes beyond these core topics.
"""
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models import TrainingProgram, TrainingProgramStatus, TrainingEnrollment

CORE_CATEGORY = "Core Programme"
CUSTOM_CATEGORY = "Custom Programme"

DEFAULT_PROGRAMS = [
    {
        "title": "Scholarly Communication & Science Communication",
        "description": (
            "Build skills in communicating research findings to academic peers, "
            "policymakers, and public audiences through writing, presentations, and media engagement."
        ),
        "category": CORE_CATEGORY,
        "level": "intermediate",
        "delivery_mode": "hybrid",
        "cpd_hours": 16,
        "duration_hours": 20,
        "instructor_name": "Capacity Building Office",
        "learning_outcomes": [
            "Tailor research messages for academic and non-academic audiences",
            "Deliver clear oral and visual research presentations",
            "Apply science communication best practices",
        ],
        "certification_awarded": True,
    },
    {
        "title": "Resource Mobilization & Grants Management",
        "description": (
            "Develop competencies in identifying funding opportunities, preparing competitive "
            "proposals, and managing grant resources through the project lifecycle."
        ),
        "category": CORE_CATEGORY,
        "level": "intermediate",
        "delivery_mode": "hybrid",
        "cpd_hours": 20,
        "duration_hours": 24,
        "instructor_name": "Research Development Office",
        "learning_outcomes": [
            "Identify and assess relevant funding opportunities",
            "Prepare competitive grant proposals and budgets",
            "Manage awarded grants in compliance with funder requirements",
        ],
        "certification_awarded": True,
    },
    {
        "title": "Research Data Management & Data Analysis",
        "description": (
            "Covers research data planning, FAIR principles, secure storage, and foundational "
            "approaches to qualitative and quantitative data analysis."
        ),
        "category": CORE_CATEGORY,
        "level": "beginner",
        "delivery_mode": "online",
        "cpd_hours": 18,
        "duration_hours": 18,
        "instructor_name": "Data Stewardship Team",
        "learning_outcomes": [
            "Create and implement research data management plans",
            "Apply FAIR data principles in practice",
            "Conduct basic qualitative and quantitative analysis workflows",
        ],
        "certification_awarded": True,
    },
    {
        "title": "Research Visibility, Publishing Strategy & Knowledge Dissemination",
        "description": (
            "Strengthen research impact through publishing strategy, open science practices, "
            "bibliometrics, and effective knowledge dissemination channels."
        ),
        "category": CORE_CATEGORY,
        "level": "intermediate",
        "delivery_mode": "online",
        "cpd_hours": 14,
        "duration_hours": 14,
        "instructor_name": "Research Communications Unit",
        "learning_outcomes": [
            "Develop a strategic approach to research publishing",
            "Increase research visibility through open science and indexing",
            "Plan knowledge dissemination beyond traditional publications",
        ],
        "certification_awarded": True,
    },
    {
        "title": "Research Capacity Strengthening for Academic and Research Staff",
        "description": (
            "Holistic programme to strengthen research competencies, mentorship, collaboration, "
            "and professional development for academic and research staff."
        ),
        "category": CORE_CATEGORY,
        "level": "beginner",
        "delivery_mode": "hybrid",
        "cpd_hours": 24,
        "duration_hours": 30,
        "instructor_name": "Institutional Research Office",
        "learning_outcomes": [
            "Strengthen core research design and execution skills",
            "Build effective research collaboration and mentorship practices",
            "Plan continuous professional development as a researcher",
        ],
        "certification_awarded": True,
    },
]

CURRENT_DEFAULT_TITLES = {p["title"] for p in DEFAULT_PROGRAMS}

LEGACY_DEFAULT_TITLES = {
    "Research Ethics & IRB Compliance",
    "Grant Proposal Writing for African Researchers",
    "Research Data Management Fundamentals",
    "Postgraduate Research Supervision",
    "Scientific Writing & Publication Strategy",
}


async def ensure_default_programs(
    db: AsyncSession,
    institution_id: str,
    created_by_id: Optional[str] = None,
) -> int:
    """
    Sync platform default programmes for an institution.
    - Removes superseded legacy defaults (when no enrollments)
    - Archives legacy defaults that have enrollments
    - Adds any missing current defaults as published core programmes
    Returns the number of programmes added.
    """
    from models import TrainingProgramLevel, TrainingDeliveryMode

    result = await db.execute(
        select(TrainingProgram).where(TrainingProgram.institution_id == institution_id)
    )
    programs = list(result.scalars().all())
    titles_present = {p.title for p in programs}
    added = 0

    for prog in programs:
        is_legacy = prog.title in LEGACY_DEFAULT_TITLES
        is_stale_default = prog.is_system_default and prog.title not in CURRENT_DEFAULT_TITLES
        if not is_legacy and not is_stale_default:
            if prog.title in CURRENT_DEFAULT_TITLES and not prog.is_system_default:
                prog.is_system_default = True
            continue

        enroll_count = (await db.execute(
            select(func.count(TrainingEnrollment.id)).where(
                TrainingEnrollment.program_id == prog.id
            )
        )).scalar() or 0

        if enroll_count > 0:
            prog.status = TrainingProgramStatus.ARCHIVED
            prog.is_system_default = False
        else:
            await db.delete(prog)
            titles_present.discard(prog.title)

    for tmpl in DEFAULT_PROGRAMS:
        if tmpl["title"] in titles_present:
            continue
        prog = TrainingProgram(
            institution_id=institution_id,
            created_by_id=created_by_id,
            status=TrainingProgramStatus.PUBLISHED,
            is_system_default=True,
            title=tmpl["title"],
            description=tmpl["description"],
            category=tmpl["category"],
            level=TrainingProgramLevel(tmpl["level"]),
            delivery_mode=TrainingDeliveryMode(tmpl["delivery_mode"]),
            cpd_hours=tmpl["cpd_hours"],
            duration_hours=tmpl["duration_hours"],
            instructor_name=tmpl["instructor_name"],
            learning_outcomes=tmpl["learning_outcomes"],
            certification_awarded=tmpl["certification_awarded"],
        )
        db.add(prog)
        added += 1

    await db.commit()
    return added


async def seed_all_institutions(db: AsyncSession) -> dict:
    """Ensure defaults exist for every registered institution."""
    from models import Institution

    result = await db.execute(select(Institution.id))
    institution_ids = [row[0] for row in result.all()]
    total_added = 0
    for inst_id in institution_ids:
        total_added += await ensure_default_programs(db, inst_id)
    return {"institutions": len(institution_ids), "programmes_added": total_added}
