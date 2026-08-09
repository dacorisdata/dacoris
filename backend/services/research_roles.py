"""Helpers for mapping ResearchRole to PostgreSQL researchrole enum labels."""

from models import ResearchRole

# Newer enum members were added lowercase in one migration; the canonical DB labels are uppercase.
_LOWERCASE_DB_LABELS = {
    ResearchRole.DVC_RESEARCH,
    ResearchRole.DIRECTOR_RESEARCH,
    ResearchRole.LIBRARIAN,
}


def parse_research_role(role_str: str) -> ResearchRole:
    return ResearchRole(role_str)


def research_role_db_label(role: ResearchRole) -> str:
    """Return the PostgreSQL researchrole enum label for a ResearchRole."""
    if role in _LOWERCASE_DB_LABELS:
        # Prefer uppercase labels once migration f8b2c3d4e5f6 is applied; fallback to lowercase.
        return role.name
    return role.name
