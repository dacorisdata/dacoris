from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import User, Institution, AccountType, UserStatus, ResearchRole, PrimaryAccountType, user_roles
from account_types import get_default_roles
from services.research_roles import parse_research_role, research_role_db_label
from auth import require_institution_admin
from services.institution_types import institution_types_as_strings, sync_institution_types
from services.departments import (
    department_to_dict,
    list_departments_for_institution,
    seed_departments_for_institution,
)
from models import Department, InstitutionType
from services.institution_domains import (
    get_admin_institution,
    get_institution_email_domains,
    ensure_user_in_institution,
    user_email_domain_filter,
)
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/api/institution-admin", tags=["institution-admin"])

class UserApproval(BaseModel):
    status: str  # "active" or "suspended"

class RoleAssignment(BaseModel):
    roles: List[str]
    primary_account_type: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str]
    account_type: str
    status: str
    orcid_id: Optional[str]
    created_at: datetime
    last_login: Optional[datetime] = None
    primary_account_type: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None
    roles: Optional[List[str]] = None
    
    class Config:
        from_attributes = True

class InstitutionSettings(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    verified_domains: Optional[str] = None
    institution_type: Optional[str] = None
    institution_types: Optional[List[str]] = None
    auto_approve: Optional[bool] = None
    orcid_client_id: Optional[str] = None
    orcid_client_secret: Optional[str] = None
    orcid_redirect_uri: Optional[str] = None

class InstitutionStats(BaseModel):
    total_users: int
    active_users: int
    pending_users: int
    users_by_role: dict

@router.get("/stats")
async def get_institution_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin)
):
    """Get institution statistics"""
    institution = await get_admin_institution(db, current_user)
    domains = get_institution_email_domains(institution)
    domain_filter = user_email_domain_filter(User, domains)

    # Total users
    total_result = await db.execute(
        select(func.count(User.id)).where(domain_filter)
    )
    total_users = total_result.scalar()
    
    # Active users
    active_result = await db.execute(
        select(func.count(User.id))
        .where(domain_filter, User.status == UserStatus.ACTIVE)
    )
    active_users = active_result.scalar()
    
    # Pending users
    pending_result = await db.execute(
        select(func.count(User.id))
        .where(domain_filter, User.status == UserStatus.PENDING)
    )
    pending_users = pending_result.scalar()
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "pending_users": pending_users
    }

@router.get("/users", response_model=List[UserResponse])
async def list_institution_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin)
):
    """List all users in the institution"""
    institution = await get_admin_institution(db, current_user)
    domains = get_institution_email_domains(institution)

    result = await db.execute(
        select(User)
        .where(user_email_domain_filter(User, domains))
        .offset(skip)
        .limit(limit)
    )
    users = result.scalars().all()

    # Attach roles to each user
    enriched = []
    for u in users:
        roles_result = await db.execute(
            select(user_roles.c.role).where(user_roles.c.user_id == u.id)
        )
        role_list = [r[0].value for r in roles_result.fetchall()]
        user_dict = {
            "id": u.id, "email": u.email, "name": u.name,
            "account_type": u.account_type.value if u.account_type else None,
            "status": u.status.value if u.status else None,
            "orcid_id": u.orcid_id, "created_at": u.created_at,
            "last_login": u.last_login,
            "primary_account_type": u.primary_account_type.value if u.primary_account_type else None,
            "department": u.department, "job_title": u.job_title,
            "roles": role_list,
        }
        enriched.append(user_dict)
    return enriched

@router.get("/users/pending", response_model=List[UserResponse])
async def list_pending_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin)
):
    """List pending users awaiting approval"""
    institution = await get_admin_institution(db, current_user)
    domains = get_institution_email_domains(institution)

    result = await db.execute(
        select(User)
        .where(
            user_email_domain_filter(User, domains),
            User.status == UserStatus.PENDING
        )
    )
    users = result.scalars().all()
    return users

@router.post("/users/{user_id}/approve")
async def approve_user(
    user_id: str,
    approval: UserApproval,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin)
):
    """Approve or reject a pending user"""
    institution = await get_admin_institution(db, current_user)
    
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    ensure_user_in_institution(user, institution)
    
    # Update status
    if approval.status == "active":
        user.status = UserStatus.ACTIVE
    elif approval.status == "suspended":
        user.status = UserStatus.SUSPENDED
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Use 'active' or 'suspended'"
        )
    
    await db.commit()

    if user.status == UserStatus.ACTIVE:
        try:
            from services.proposal_invites import claim_pending_proposal_invites
            await claim_pending_proposal_invites(db, user)
        except Exception as e:
            print(f"Failed to claim proposal invites after approval for {user.email}: {e}")
    
    return {"message": f"User {approval.status} successfully"}

@router.post("/users/{user_id}/reject")
async def reject_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin)
):
    """Reject a pending user"""
    institution = await get_admin_institution(db, current_user)
    
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    ensure_user_in_institution(user, institution)
    
    # Update status to suspended
    user.status = UserStatus.SUSPENDED
    
    await db.commit()
    
    return {"message": "User rejected successfully"}

@router.post("/users/{user_id}/roles")
async def assign_roles(
    user_id: str,
    role_data: RoleAssignment,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin)
):
    """Assign roles to a user"""
    institution = await get_admin_institution(db, current_user)
    
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    ensure_user_in_institution(user, institution)
    
    roles_to_assign = list(role_data.roles or [])
    if role_data.primary_account_type and not roles_to_assign:
        try:
            account_type = PrimaryAccountType(role_data.primary_account_type)
            roles_to_assign = [r.value for r in get_default_roles(account_type)]
        except ValueError:
            pass

    # Normalize: permission roles only (lowercase researchrole values)
    normalized_roles: List[str] = []
    for role_str in roles_to_assign:
        if not role_str:
            continue
        try:
            PrimaryAccountType(role_str)
            continue
        except ValueError:
            pass
        try:
            role = parse_research_role(role_str)
            normalized_roles.append(research_role_db_label(role))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role: {role_str}",
            )
    roles_to_assign = list(dict.fromkeys(normalized_roles))
    
    # Delete existing roles
    await db.execute(
        user_roles.delete().where(user_roles.c.user_id == user_id)
    )
    
    # Add new roles
    for role_value in roles_to_assign:
        await db.execute(
            user_roles.insert().values(
                user_id=user_id,
                role=role_value,
                assigned_by=current_user.id
            )
        )
    
    # Update primary_account_type if provided
    if role_data.primary_account_type:
        try:
            user.primary_account_type = PrimaryAccountType(role_data.primary_account_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid primary_account_type: {role_data.primary_account_type}"
            )

    await db.commit()
    
    return {"message": "Roles assigned successfully", "roles": roles_to_assign, "primary_account_type": role_data.primary_account_type}

@router.get("/users/{user_id}/roles")
async def get_user_roles(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin)
):
    """Get roles for a user"""
    institution = await get_admin_institution(db, current_user)
    
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    ensure_user_in_institution(user, institution)
    
    # Get roles
    result = await db.execute(
        select(user_roles.c.role).where(user_roles.c.user_id == user_id)
    )
    roles = [row[0].value for row in result.fetchall()]
    
    return {"user_id": user_id, "roles": roles}

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin)
):
    """Delete a user from the institution"""
    institution = await get_admin_institution(db, current_user)
    
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    ensure_user_in_institution(user, institution)
    
    # Prevent deleting global or institution admins
    if user.is_global_admin or user.is_institution_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete admin accounts"
        )
    
    # Delete user roles first
    await db.execute(
        user_roles.delete().where(user_roles.c.user_id == user_id)
    )
    
    # Delete the user
    await db.delete(user)
    await db.commit()
    
    return {"message": "User deleted successfully"}

@router.post("/users/{user_id}/suspend")
async def suspend_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin)
):
    """Suspend a user account"""
    institution = await get_admin_institution(db, current_user)
    
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    ensure_user_in_institution(user, institution)
    
    # Update status to suspended
    user.status = UserStatus.SUSPENDED
    await db.commit()
    
    return {"message": "User suspended successfully", "status": "suspended"}

@router.post("/users/{user_id}/activate")
async def activate_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin)
):
    """Activate a suspended user account"""
    institution = await get_admin_institution(db, current_user)
    
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    ensure_user_in_institution(user, institution)
    
    # Update status to active
    user.status = UserStatus.ACTIVE
    await db.commit()
    
    return {"message": "User activated successfully", "status": "active"}

@router.get("/roles")
async def list_roles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin)
):
    """List all available permission roles with user counts for this institution."""
    institution = await get_admin_institution(db, current_user)
    domains = get_institution_email_domains(institution)
    domain_filter = user_email_domain_filter(User, domains)

    role_result = await db.execute(
        select(user_roles.c.role, func.count(user_roles.c.user_id))
        .join(User, User.id == user_roles.c.user_id)
        .where(domain_filter)
        .group_by(user_roles.c.role)
    )
    users_by_role = {row[0].value: row[1] for row in role_result.fetchall()}

    role_labels = {
        ResearchRole.RESEARCHER: "Researcher",
        ResearchRole.PRINCIPAL_INVESTIGATOR: "Principal Investigator",
        ResearchRole.CO_INVESTIGATOR: "Co-Investigator",
        ResearchRole.GRANT_OFFICER: "Grant Officer",
        ResearchRole.RESEARCH_ADMIN: "Research Administrator",
        ResearchRole.FINANCE_OFFICER: "Finance Officer",
        ResearchRole.ETHICS_REVIEWER: "Ethics Reviewer",
        ResearchRole.ETHICS_CHAIR: "Ethics Chair",
        ResearchRole.DATA_STEWARD: "Data Steward",
        ResearchRole.DATA_ENGINEER: "Data Engineer",
        ResearchRole.INSTITUTIONAL_LEAD: "Institutional Lead",
        ResearchRole.DVC_RESEARCH: "DVC (Research)",
        ResearchRole.DIRECTOR_RESEARCH: "Director of Research",
        ResearchRole.LIBRARIAN: "Librarian / RDM Specialist",
        ResearchRole.SYSTEM_ADMIN: "System Administrator",
        ResearchRole.EXTERNAL_REVIEWER: "External Reviewer",
        ResearchRole.GUEST_COLLABORATOR: "Guest Collaborator",
        ResearchRole.EXTERNAL_FUNDER: "External Funder",
        ResearchRole.APPLICANT: "Applicant",
        ResearchRole.MOU_ADMIN: "MoU Administrator",
        ResearchRole.LEGAL_OFFICER: "Legal Officer",
        ResearchRole.PARTNERSHIP_COORDINATOR: "Partnership Coordinator",
        ResearchRole.EXTERNAL_PARTNER: "External Partner",
        ResearchRole.POSTGRADUATE_STUDENT: "Postgraduate Student",
        ResearchRole.SUPERVISOR: "Supervisor",
        ResearchRole.EXTERNAL_SUPERVISOR: "External Supervisor",
        ResearchRole.PG_COORDINATOR: "PG Coordinator",
        ResearchRole.HEAD_OF_PG_STUDIES: "Head of Postgraduate Studies",
    }

    return [
        {
            "id": role.value,
            "name": role_labels.get(role, role.value.replace("_", " ").title()),
            "description": role_labels.get(role, ""),
            "user_count": users_by_role.get(role.value, 0),
        }
        for role in ResearchRole
    ]

@router.post("/roles")
async def create_role(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin)
):
    """Create a new role (placeholder - roles are predefined)"""
    return {"message": "Roles are predefined in the system"}

@router.get("/settings")
async def get_institution_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin)
):
    """Get institution settings"""
    institution = await get_admin_institution(db, current_user)
    
    result = await db.execute(
        select(Institution)
        .options(selectinload(Institution.type_assignments))
        .where(Institution.id == institution.id)
    )
    institution = result.scalar_one_or_none()
    
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )
    
    return {
        "id": institution.id,
        "name": institution.name,
        "domain": institution.domain,
        "verified_domains": institution.verified_domains,
        "institution_types": institution_types_as_strings(institution),
        "auto_approve": institution.auto_approve,
        "orcid_client_id": institution.orcid_client_id,
        "orcid_redirect_uri": institution.orcid_redirect_uri,
        "is_active": institution.is_active
    }

@router.put("/settings")
async def update_institution_settings(
    settings: InstitutionSettings,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin)
):
    """Update institution settings"""
    institution = await get_admin_institution(db, current_user)
    
    result = await db.execute(
        select(Institution)
        .options(selectinload(Institution.type_assignments))
        .where(Institution.id == institution.id)
    )
    institution = result.scalar_one_or_none()
    
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )
    
    # Update settings
    if settings.name is not None:
        institution.name = settings.name
    if settings.domain is not None:
        institution.domain = settings.domain
    if settings.verified_domains is not None:
        institution.verified_domains = settings.verified_domains
    if settings.institution_types is not None:
        await sync_institution_types(db, institution.id, settings.institution_types)
    elif settings.institution_type is not None:
        await sync_institution_types(
            db,
            institution.id,
            [settings.institution_type] if settings.institution_type else [],
        )
    if settings.auto_approve is not None:
        institution.auto_approve = settings.auto_approve
    if settings.orcid_client_id is not None:
        institution.orcid_client_id = settings.orcid_client_id
    if settings.orcid_client_secret is not None:
        institution.orcid_client_secret = settings.orcid_client_secret
    if settings.orcid_redirect_uri is not None:
        institution.orcid_redirect_uri = settings.orcid_redirect_uri
    
    await db.commit()
    
    return {"message": "Settings updated successfully"}

@router.get("/analytics", response_model=InstitutionStats)
async def get_institution_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin)
):
    """Get institution analytics"""
    institution = await get_admin_institution(db, current_user)
    domains = get_institution_email_domains(institution)
    domain_filter = user_email_domain_filter(User, domains)

    # Total users
    total_result = await db.execute(
        select(func.count(User.id)).where(domain_filter)
    )
    total_users = total_result.scalar()
    
    # Active users
    active_result = await db.execute(
        select(func.count(User.id))
        .where(domain_filter, User.status == UserStatus.ACTIVE)
    )
    active_users = active_result.scalar()
    
    # Pending users
    pending_result = await db.execute(
        select(func.count(User.id))
        .where(domain_filter, User.status == UserStatus.PENDING)
    )
    pending_users = pending_result.scalar()
    
    # Users by role
    role_result = await db.execute(
        select(user_roles.c.role, func.count(user_roles.c.user_id))
        .join(User, User.id == user_roles.c.user_id)
        .where(domain_filter)
        .group_by(user_roles.c.role)
    )
    
    users_by_role = {row[0].value: row[1] for row in role_result.fetchall()}
    
    return InstitutionStats(
        total_users=total_users,
        active_users=active_users,
        pending_users=pending_users,
        users_by_role=users_by_role
    )


class DepartmentCreate(BaseModel):
    name: str
    institution_type: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    institution_type: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


@router.get("/departments")
async def list_departments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin),
):
    institution = await get_admin_institution(db, current_user)
    departments = await list_departments_for_institution(
        db, institution.id, active_only=False, registration_only=False
    )
    return [department_to_dict(d) for d in departments]


@router.post("/departments", status_code=status.HTTP_201_CREATED)
async def create_department(
    payload: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin),
):
    institution = await get_admin_institution(db, current_user)
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Department name is required")

    inst_type = None
    if payload.institution_type:
        try:
            inst_type = InstitutionType(payload.institution_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid institution type: {payload.institution_type}")

    existing = await db.execute(
        select(Department).where(
            Department.institution_id == institution.id,
            func.lower(Department.name) == name.lower(),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="A department with this name already exists")

    department = Department(
        institution_id=institution.id,
        name=name,
        institution_type=inst_type,
        description=(payload.description or "").strip() or None,
        is_active=payload.is_active,
        sort_order=payload.sort_order,
    )
    db.add(department)
    await db.commit()
    await db.refresh(department)
    return department_to_dict(department)


@router.put("/departments/{department_id}")
async def update_department(
    department_id: str,
    payload: DepartmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin),
):
    institution = await get_admin_institution(db, current_user)
    result = await db.execute(
        select(Department).where(
            Department.id == department_id,
            Department.institution_id == institution.id,
        )
    )
    department = result.scalar_one_or_none()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Department name is required")
        department.name = name

    if payload.institution_type is not None:
        if payload.institution_type == "":
            department.institution_type = None
        else:
            try:
                department.institution_type = InstitutionType(payload.institution_type)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid institution type: {payload.institution_type}")

    if payload.description is not None:
        department.description = payload.description.strip() or None
    if payload.is_active is not None:
        department.is_active = payload.is_active
    if payload.sort_order is not None:
        department.sort_order = payload.sort_order

    await db.commit()
    await db.refresh(department)
    return department_to_dict(department)


@router.delete("/departments/{department_id}")
async def delete_department(
    department_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin),
):
    institution = await get_admin_institution(db, current_user)
    result = await db.execute(
        select(Department).where(
            Department.id == department_id,
            Department.institution_id == institution.id,
        )
    )
    department = result.scalar_one_or_none()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    await db.delete(department)
    await db.commit()
    return {"message": "Department deleted successfully"}


@router.post("/departments/seed-defaults")
async def seed_default_departments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institution_admin),
):
    institution = await get_admin_institution(db, current_user)
    await db.refresh(institution, ["type_assignments", "departments"])
    created = await seed_departments_for_institution(db, institution)
    await db.commit()
    return {"message": f"Seeded {created} department(s)", "created": created}
