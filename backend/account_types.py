"""
Account Type Configuration and Utilities
Maps primary account types to their properties and default roles
"""

from models import PrimaryAccountType, ResearchRole
from typing import Dict, List, Optional

# Account type metadata
ACCOUNT_TYPE_CONFIG: Dict[str, Dict] = {
    PrimaryAccountType.RESEARCHER: {
        "label": "Researcher",
        "description": "Faculty, postdocs, research staff, students conducting research",
        "requires_orcid": True,
        "default_roles": [ResearchRole.RESEARCHER],
        "assignable_roles": [
            ResearchRole.RESEARCHER,
            ResearchRole.PRINCIPAL_INVESTIGATOR,
            ResearchRole.CO_INVESTIGATOR,
            ResearchRole.ETHICS_REVIEWER
        ],
        "primary_modules": ["Grants", "Research", "Data"],
        "icon": "science"
    },
    PrimaryAccountType.GRANT_MANAGER: {
        "label": "Grant Manager",
        "description": "Grant office staff managing funding opportunities and award lifecycle",
        "requires_orcid": False,
        "default_roles": [ResearchRole.GRANT_OFFICER],
        "assignable_roles": [
            ResearchRole.GRANT_OFFICER,
            ResearchRole.RESEARCH_ADMIN
        ],
        "primary_modules": ["Grants"],
        "icon": "account_balance"
    },
    PrimaryAccountType.FINANCE_OFFICER: {
        "label": "Finance Officer",
        "description": "Finance staff managing budgets, disbursements, and financial reporting",
        "requires_orcid": False,
        "default_roles": [ResearchRole.FINANCE_OFFICER],
        "assignable_roles": [ResearchRole.FINANCE_OFFICER],
        "primary_modules": ["Grants (Finance)"],
        "icon": "payments"
    },
    PrimaryAccountType.ETHICS_COMMITTEE_MEMBER: {
        "label": "Ethics Committee Member",
        "description": "Ethics/IRB committee members reviewing research protocols",
        "requires_orcid": True,
        "default_roles": [ResearchRole.ETHICS_REVIEWER],
        "assignable_roles": [
            ResearchRole.ETHICS_REVIEWER,
            ResearchRole.ETHICS_CHAIR
        ],
        "primary_modules": ["Research (Ethics)"],
        "icon": "gavel"
    },
    PrimaryAccountType.DATA_STEWARD: {
        "label": "Data Steward",
        "description": "Data management professionals curating datasets and managing repository",
        "requires_orcid": False,
        "default_roles": [ResearchRole.DATA_STEWARD],
        "assignable_roles": [ResearchRole.DATA_STEWARD],
        "primary_modules": ["Data Management Part A"],
        "icon": "storage"
    },
    PrimaryAccountType.DATA_ENGINEER: {
        "label": "Data Engineer",
        "description": "Technical staff building data pipelines and analytics infrastructure",
        "requires_orcid": False,
        "default_roles": [ResearchRole.DATA_ENGINEER],
        "assignable_roles": [ResearchRole.DATA_ENGINEER],
        "primary_modules": ["Data Management Part B"],
        "icon": "engineering"
    },
    PrimaryAccountType.INSTITUTIONAL_LEADERSHIP: {
        "label": "Institutional Leadership",
        "description": "Executives, deans, department heads with strategic oversight",
        "requires_orcid": False,
        "default_roles": [ResearchRole.INSTITUTIONAL_LEAD],
        "assignable_roles": [ResearchRole.INSTITUTIONAL_LEAD],
        "primary_modules": ["All (Strategic Dashboards)"],
        "icon": "business_center"
    },
    PrimaryAccountType.EXTERNAL_REVIEWER: {
        "label": "External Reviewer",
        "description": "External experts invited to review grant applications (invitation-only)",
        "requires_orcid": False,
        "default_roles": [ResearchRole.EXTERNAL_REVIEWER],
        "assignable_roles": [ResearchRole.EXTERNAL_REVIEWER],
        "primary_modules": ["Grants (Review)"],
        "icon": "rate_review",
        "invitation_only": True
    },
    PrimaryAccountType.GUEST_COLLABORATOR: {
        "label": "Guest Collaborator",
        "description": "External collaborators on specific proposals/projects (invitation-only)",
        "requires_orcid": False,
        "default_roles": [ResearchRole.GUEST_COLLABORATOR],
        "assignable_roles": [ResearchRole.GUEST_COLLABORATOR],
        "primary_modules": ["Grants", "Research"],
        "icon": "person_add",
        "invitation_only": True
    },
    PrimaryAccountType.EXTERNAL_FUNDER: {
        "label": "External Funder",
        "description": "Funder representatives monitoring awarded grants (invitation-only)",
        "requires_orcid": False,
        "default_roles": [ResearchRole.EXTERNAL_FUNDER],
        "assignable_roles": [ResearchRole.EXTERNAL_FUNDER],
        "primary_modules": ["Grants (Post-Award)"],
        "icon": "monetization_on",
        "invitation_only": True
    }
}


def get_account_type_config(account_type: PrimaryAccountType) -> Dict:
    """Get configuration for a specific account type"""
    return ACCOUNT_TYPE_CONFIG.get(account_type, {})


def requires_orcid(account_type: PrimaryAccountType) -> bool:
    """Check if account type requires ORCID authentication"""
    config = get_account_type_config(account_type)
    return config.get("requires_orcid", False)


def is_invitation_only(account_type: PrimaryAccountType) -> bool:
    """Check if account type is invitation-only"""
    config = get_account_type_config(account_type)
    return config.get("invitation_only", False)


def get_default_roles(account_type: PrimaryAccountType) -> List[ResearchRole]:
    """Get default roles for an account type"""
    config = get_account_type_config(account_type)
    return config.get("default_roles", [])


def get_self_registration_account_types() -> List[Dict]:
    """Get list of account types available for self-registration"""
    return [
        {
            "value": account_type,
            "label": config["label"],
            "description": config["description"],
            "requires_orcid": config["requires_orcid"],
            "icon": config["icon"]
        }
        for account_type, config in ACCOUNT_TYPE_CONFIG.items()
        if not config.get("invitation_only", False)
    ]


def validate_account_type_for_registration(account_type: str) -> Optional[PrimaryAccountType]:
    """Validate and return account type enum if valid for self-registration"""
    try:
        account_type_enum = PrimaryAccountType(account_type)
        if is_invitation_only(account_type_enum):
            return None
        return account_type_enum
    except ValueError:
        return None
