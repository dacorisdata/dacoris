"""Department catalog helpers — seed templates, queries, and validation."""

from typing import List, Optional, Tuple

from sqlalchemy import or_, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models import Department, Institution, InstitutionType, InstitutionTypeAssignment


# Research-focused department templates keyed by institution type.
DEFAULT_DEPARTMENTS_BY_TYPE: dict[InstitutionType, List[Tuple[str, str]]] = {
    InstitutionType.UNIVERSITY: [
        ("Faculty of Science & Technology", "Natural, physical and computational sciences"),
        ("Faculty of Medicine & Health Sciences", "Clinical, biomedical and public health research"),
        ("Faculty of Engineering", "Engineering and applied sciences research"),
        ("Faculty of Arts & Humanities", "Humanities, languages and cultural research"),
        ("Faculty of Social Sciences", "Social, behavioural and policy research"),
        ("Graduate School / Postgraduate Studies", "Postgraduate research programmes"),
        ("Research Office", "Central research administration and support"),
        ("Library & Scholarly Communication", "Research outputs, metadata and open access"),
        ("Ethics & Research Governance", "Ethics review and research compliance"),
        ("Innovation & Technology Transfer", "Commercialisation and partnerships"),
    ],
    InstitutionType.RESEARCH_INSTITUTE: [
        ("Life Sciences Division", "Biological and life sciences research"),
        ("Clinical Research Unit", "Clinical trials and translational research"),
        ("Data Science & Analytics", "Data engineering, biostatistics and analytics"),
        ("Environmental & Earth Sciences", "Environmental monitoring and sustainability research"),
        ("Research Operations", "Research management and coordination"),
        ("Ethics & Compliance", "Ethics review and regulatory compliance"),
    ],
    InstitutionType.HOSPITAL: [
        ("Clinical Research Department", "Hospital-based clinical research"),
        ("Biomedical Sciences", "Laboratory and translational medicine"),
        ("Medical Ethics / IRB Office", "Ethics review for health research"),
        ("Nursing & Allied Health Research", "Nursing and allied health studies"),
    ],
    InstitutionType.GOVERNMENT: [
        ("Policy Research Unit", "Policy analysis and evidence synthesis"),
        ("Programme Evaluation", "Monitoring, evaluation and learning"),
        ("Statistics & Data Unit", "Official statistics and data governance"),
    ],
    InstitutionType.NGO: [
        ("Programme Research", "Field research and programme evidence"),
        ("Monitoring & Evaluation", "Impact assessment and learning"),
        ("Community Health Research", "Community-based health research"),
    ],
    InstitutionType.INDUSTRY: [
        ("R&D Laboratory", "Product and process research"),
        ("Clinical Affairs", "Clinical development and trials"),
        ("Regulatory & Quality", "Regulatory science and quality systems"),
    ],
}

SHARED_DEPARTMENTS: List[Tuple[str, str]] = [
    ("Interdisciplinary Research Centre", "Cross-cutting and multidisciplinary research"),
    ("Research Administration", "Grants, contracts and research finance support"),
    ("Other", "Department not listed above"),
]


def department_to_dict(dept: Department) -> dict:
    return {
        "id": dept.id,
        "institution_id": dept.institution_id,
        "name": dept.name,
        "institution_type": dept.institution_type.value if dept.institution_type else None,
        "description": dept.description,
        "is_active": dept.is_active,
        "sort_order": dept.sort_order,
        "created_at": dept.created_at.isoformat() if dept.created_at else None,
        "updated_at": dept.updated_at.isoformat() if dept.updated_at else None,
    }


async def load_institution_with_catalog(db: AsyncSession, institution_id: str) -> Institution:
    result = await db.execute(
        select(Institution)
        .where(Institution.id == institution_id)
    )
    institution = result.scalar_one_or_none()
    if not institution:
        raise ValueError("Institution not found")
    await db.refresh(institution, ["type_assignments", "departments"])
    return institution


async def list_departments_for_institution(
    db: AsyncSession,
    institution_id: str,
    *,
    active_only: bool = True,
    registration_only: bool = False,
) -> List[Department]:
    institution = await load_institution_with_catalog(db, institution_id)
    type_values = [a.institution_type for a in institution.type_assignments]

    query = select(Department).where(Department.institution_id == institution_id)
    if active_only:
        query = query.where(Department.is_active.is_(True))

    if registration_only and type_values:
        query = query.where(
            or_(
                Department.institution_type.is_(None),
                Department.institution_type.in_(type_values),
            )
        )

    query = query.order_by(Department.sort_order, Department.name)
    result = await db.execute(query)
    return list(result.scalars().all())


async def validate_department_for_institution(
    db: AsyncSession,
    institution_id: str,
    department_name: str,
) -> str:
    """Return canonical department name if valid for registration."""
    name = (department_name or "").strip()
    if not name:
        raise ValueError("Department is required")

    departments = await list_departments_for_institution(
        db, institution_id, active_only=True, registration_only=True
    )
    by_name = {d.name.lower(): d.name for d in departments}
    canonical = by_name.get(name.lower())
    if not canonical:
        raise ValueError("Invalid department for this institution")
    return canonical


async def seed_departments_for_institution(
    db: AsyncSession,
    institution: Institution,
    institution_types: Optional[List[str]] = None,
) -> int:
    """Seed default research departments for an institution. Returns count created."""
    if institution_types is None:
        institution_types = [a.institution_type.value for a in institution.type_assignments]

    parsed_types: List[InstitutionType] = []
    for value in institution_types:
        try:
            parsed_types.append(InstitutionType(value))
        except ValueError:
            continue

    existing = {
        d.name.lower()
        for d in (institution.departments or [])
    }
    created = 0
    sort_order = 0

    def add_department(name: str, description: str, inst_type: Optional[InstitutionType] = None) -> None:
        nonlocal sort_order, created
        key = name.lower()
        if key in existing:
            return
        db.add(
            Department(
                institution_id=institution.id,
                name=name,
                description=description,
                institution_type=inst_type,
                is_active=True,
                sort_order=sort_order,
            )
        )
        existing.add(key)
        sort_order += 1
        created += 1

    for inst_type in parsed_types:
        for name, description in DEFAULT_DEPARTMENTS_BY_TYPE.get(inst_type, []):
            add_department(name, description, inst_type)

    for name, description in SHARED_DEPARTMENTS:
        add_department(name, description, None)

    if created:
        await db.flush()
    return created


ASCENSION_DOMAINS = {"ascensiondynamics.com", "ascensiondynamics.co"}
ASCENSION_NAME = "Ascension Dynamics"


async def find_ascension_dynamics_institution(db: AsyncSession) -> Optional[Institution]:
    """Locate Ascension Dynamics by primary domain or institution name."""
    for domain in ASCENSION_DOMAINS:
        result = await db.execute(
            select(Institution).where(func.lower(Institution.domain) == domain)
        )
        institution = result.scalar_one_or_none()
        if institution:
            return institution

    result = await db.execute(
        select(Institution).where(func.lower(Institution.name) == ASCENSION_NAME.lower())
    )
    return result.scalar_one_or_none()

async def ensure_ascension_dynamics_setup(db: AsyncSession) -> None:
    """Ensure Ascension Dynamics has institution types and research departments."""
    from services.institution_types import sync_institution_types

    institution = await find_ascension_dynamics_institution(db)
    if not institution:
        return

    domains = {
        d.strip().lower()
        for d in (institution.verified_domains or institution.domain or "").split(",")
        if d.strip()
    }
    domains.update(ASCENSION_DOMAINS)
    institution.verified_domains = ",".join(sorted(domains))

    await sync_institution_types(
        db,
        institution.id,
        ["university", "research_institute"],
    )
    await db.refresh(institution, ["type_assignments", "departments"])
    await seed_departments_for_institution(
        db,
        institution,
        ["university", "research_institute"],
    )
