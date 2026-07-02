from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models import Institution, InstitutionType, InstitutionTypeAssignment


def parse_institution_type_list(values: Optional[List[str]]) -> List[InstitutionType]:
    if not values:
        return []
    parsed: List[InstitutionType] = []
    seen = set()
    for value in values:
        if not value or value in seen:
            continue
        try:
            parsed.append(InstitutionType(value))
            seen.add(value)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid institution type: {value}",
            )
    return parsed


def institution_types_as_strings(institution: Institution) -> List[str]:
    return [assignment.institution_type.value for assignment in institution.type_assignments]


async def sync_institution_types(
    db: AsyncSession,
    institution_id: str,
    type_values: Optional[List[str]],
) -> None:
    if type_values is None:
        return

    parsed_types = parse_institution_type_list(type_values)
    await db.execute(
        delete(InstitutionTypeAssignment).where(
            InstitutionTypeAssignment.institution_id == institution_id
        )
    )
    for institution_type in parsed_types:
        db.add(
            InstitutionTypeAssignment(
                institution_id=institution_id,
                institution_type=institution_type,
            )
        )


async def load_institution_with_types(db: AsyncSession, institution_id: str) -> Institution:
    result = await db.execute(
        select(Institution)
        .options(selectinload(Institution.type_assignments))
        .where(Institution.id == institution_id)
    )
    institution = result.scalar_one_or_none()
    if not institution:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Institution not found")
    return institution
