from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
import csv
import io
import pandas as pd
import re
from pathlib import Path

from database import get_db
from models import (
    User, Institution, AccountType, UserStatus, OrcidProfile,
    OpportunityCategory, InstitutionCategory, OpportunityCategories,
    GrantOpportunity
)
from auth import require_global_admin, get_password_hash
from services.training_defaults import ensure_default_programs

router = APIRouter(prefix="/api/global-admin", tags=["global-admin"])

class InstitutionCreate(BaseModel):
    name: str
    domain: str
    verified_domains: Optional[str] = None
    orcid_client_id: Optional[str] = None
    orcid_client_secret: Optional[str] = None
    orcid_redirect_uri: Optional[str] = None

class InstitutionResponse(BaseModel):
    id: str
    name: str
    domain: str
    verified_domains: Optional[str]
    is_active: bool
    primary_admin_id: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class InstitutionAdminCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    institution_id: str

class UserSummary(BaseModel):
    id: str
    email: str
    name: Optional[str]
    account_type: str
    status: str
    institution_id: Optional[str] = None
    is_global_admin: bool
    is_institution_admin: bool
    orcid_id: Optional[str] = None
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        populate_by_name = True
        
    @classmethod
    def model_validate(cls, obj):
        # Map primary_institution_id to institution_id
        if hasattr(obj, 'primary_institution_id'):
            data = {
                'id': obj.id,
                'email': obj.email,
                'name': obj.name,
                'account_type': obj.account_type.value if hasattr(obj.account_type, 'value') else obj.account_type,
                'status': obj.status.value if hasattr(obj.status, 'value') else obj.status,
                'institution_id': obj.primary_institution_id,
                'is_global_admin': obj.is_global_admin,
                'is_institution_admin': obj.is_institution_admin,
                'orcid_id': obj.orcid_id,
                'created_at': obj.created_at,
                'last_login': obj.last_login,
            }
            return cls(**data)
        return super().model_validate(obj)

class PlatformStats(BaseModel):
    total_institutions: int
    total_users: int
    active_users: int
    pending_users: int
    total_orcid_users: int

@router.get("/institutions", response_model=List[InstitutionResponse])
async def list_institutions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """List all institutions"""
    result = await db.execute(select(Institution))
    institutions = result.scalars().all()
    return institutions

@router.post("/institutions", response_model=InstitutionResponse)
async def create_institution(
    institution_data: InstitutionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Create a new institution"""
    # Check if domain already exists
    result = await db.execute(
        select(Institution).where(Institution.domain == institution_data.domain)
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Institution with domain {institution_data.domain} already exists"
        )
    
    institution = Institution(
        name=institution_data.name,
        domain=institution_data.domain,
        verified_domains=institution_data.verified_domains,
        orcid_client_id=institution_data.orcid_client_id,
        orcid_client_secret=institution_data.orcid_client_secret,
        orcid_redirect_uri=institution_data.orcid_redirect_uri,
        is_active=True
    )
    
    db.add(institution)
    await db.commit()
    await db.refresh(institution)

    await ensure_default_programs(db, institution.id, created_by_id=current_user.id)

    return institution

@router.get("/institutions/{institution_id}", response_model=InstitutionResponse)
async def get_institution(
    institution_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Get institution details"""
    result = await db.execute(
        select(Institution).where(Institution.id == institution_id)
    )
    institution = result.scalar_one_or_none()
    
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )
    
    return institution

@router.put("/institutions/{institution_id}", response_model=InstitutionResponse)
async def update_institution(
    institution_id: str,
    institution_data: InstitutionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Update institution details"""
    result = await db.execute(
        select(Institution).where(Institution.id == institution_id)
    )
    institution = result.scalar_one_or_none()
    
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )
    
    institution.name = institution_data.name
    institution.domain = institution_data.domain
    institution.verified_domains = institution_data.verified_domains
    institution.orcid_client_id = institution_data.orcid_client_id
    institution.orcid_client_secret = institution_data.orcid_client_secret
    institution.orcid_redirect_uri = institution_data.orcid_redirect_uri
    
    await db.commit()
    await db.refresh(institution)
    
    return institution

@router.post("/institutions/{institution_id}/toggle-status")
async def toggle_institution_status(
    institution_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Activate or deactivate an institution"""
    result = await db.execute(
        select(Institution).where(Institution.id == institution_id)
    )
    institution = result.scalar_one_or_none()
    
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )
    
    institution.is_active = not institution.is_active
    await db.commit()
    
    return {"message": f"Institution {'activated' if institution.is_active else 'deactivated'} successfully"}

@router.post("/institutions/{institution_id}/admin", response_model=UserSummary)
async def create_institution_admin(
    institution_id: str,
    admin_data: InstitutionAdminCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Create an institution admin account"""
    # Verify institution exists
    result = await db.execute(
        select(Institution).where(Institution.id == institution_id)
    )
    institution = result.scalar_one_or_none()
    
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )
    
    # Check if user already exists
    result = await db.execute(
        select(User).where(
            User.email == admin_data.email,
            User.primary_institution_id == institution_id
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists for this institution"
        )
    
    # Create institution admin
    password_hash = get_password_hash(admin_data.password)
    
    admin = User(
        email=admin_data.email,
        name=admin_data.name,
        password_hash=password_hash,
        account_type=AccountType.INSTITUTION_ADMIN,
        status=UserStatus.ACTIVE,
        primary_institution_id=institution_id,
        is_institution_admin=True,
        is_global_admin=False
    )
    
    db.add(admin)
    await db.commit()
    await db.refresh(admin)
    
    return admin

@router.get("/users", response_model=List[UserSummary])
async def list_all_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """List all users across all institutions"""
    result = await db.execute(
        select(User).offset(skip).limit(limit)
    )
    users = result.scalars().all()
    return users

@router.get("/analytics", response_model=PlatformStats)
async def get_platform_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Get platform-wide analytics"""
    # Total institutions
    inst_result = await db.execute(select(func.count(Institution.id)))
    total_institutions = inst_result.scalar()
    
    # Total users
    user_result = await db.execute(select(func.count(User.id)))
    total_users = user_result.scalar()
    
    # Active users
    active_result = await db.execute(
        select(func.count(User.id)).where(User.status == UserStatus.ACTIVE)
    )
    active_users = active_result.scalar()
    
    # Pending users
    pending_result = await db.execute(
        select(func.count(User.id)).where(User.status == UserStatus.PENDING)
    )
    pending_users = pending_result.scalar()
    
    # ORCID users
    orcid_result = await db.execute(
        select(func.count(User.id)).where(User.account_type == AccountType.ORCID)
    )
    total_orcid_users = orcid_result.scalar()
    
    return PlatformStats(
        total_institutions=total_institutions,
        total_users=total_users,
        active_users=active_users,
        pending_users=pending_users,
        total_orcid_users=total_orcid_users
    )

@router.get("/institutions/{institution_id}/users", response_model=List[UserSummary])
async def get_institution_users(
    institution_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Get all users for a specific institution"""
    result = await db.execute(
        select(User).where(User.primary_institution_id == institution_id)
    )
    users = result.scalars().all()
    return users

@router.delete("/institutions/{institution_id}/users/{user_id}")
async def delete_institution_user(
    institution_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Delete a user from an institution"""
    # Verify user exists and belongs to the institution
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.primary_institution_id == institution_id
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or does not belong to this institution"
        )
    
    # Prevent deleting the last institution admin
    if user.is_institution_admin:
        admin_count_result = await db.execute(
            select(func.count(User.id)).where(
                User.primary_institution_id == institution_id,
                User.is_institution_admin == True
            )
        )
        admin_count = admin_count_result.scalar()
        
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the last institution admin"
            )
    
    # If deleting the primary admin, clear the primary_admin_id
    inst_result = await db.execute(
        select(Institution).where(Institution.id == institution_id)
    )
    institution = inst_result.scalar_one_or_none()
    if institution and institution.primary_admin_id == user_id:
        institution.primary_admin_id = None
    
    await db.delete(user)
    await db.commit()
    
    return {"message": "User deleted successfully"}

@router.post("/institutions/{institution_id}/set-primary-admin/{user_id}")
async def set_primary_admin(
    institution_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Set a user as the primary admin for an institution"""
    # Verify institution exists
    inst_result = await db.execute(
        select(Institution).where(Institution.id == institution_id)
    )
    institution = inst_result.scalar_one_or_none()
    
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )
    
    # Verify user exists, belongs to institution, and is an admin
    user_result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.primary_institution_id == institution_id,
            User.is_institution_admin == True
        )
    )
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or is not an institution admin"
        )
    
    # Set as primary admin
    institution.primary_admin_id = user_id
    await db.commit()
    
    return {"message": "Primary admin set successfully", "primary_admin_id": user_id}


# ═══════════════════════════════════════════════════════════════════════════
# OPPORTUNITY CATEGORY MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    slug: str
    color: Optional[str] = "#3B82F6"
    icon: Optional[str] = None

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    slug: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None

class CategoryResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    slug: str
    color: str
    icon: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

@router.get("/categories", response_model=List[CategoryResponse])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """List all opportunity categories"""
    result = await db.execute(select(OpportunityCategory))
    categories = result.scalars().all()
    return categories

@router.post("/categories", response_model=CategoryResponse)
async def create_category(
    category_data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Create a new opportunity category"""
    # Check if slug already exists
    result = await db.execute(
        select(OpportunityCategory).where(OpportunityCategory.slug == category_data.slug)
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category with slug '{category_data.slug}' already exists"
        )
    
    category = OpportunityCategory(**category_data.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)
    
    return category

@router.get("/categories/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Get category details"""
    result = await db.execute(
        select(OpportunityCategory).where(OpportunityCategory.id == category_id)
    )
    category = result.scalar_one_or_none()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    return category

@router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    category_data: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Update category details"""
    result = await db.execute(
        select(OpportunityCategory).where(OpportunityCategory.id == category_id)
    )
    category = result.scalar_one_or_none()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Update fields
    update_data = category_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)
    
    await db.commit()
    await db.refresh(category)
    
    return category

@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Delete a category (only if not in use)"""
    result = await db.execute(
        select(OpportunityCategory).where(OpportunityCategory.id == category_id)
    )
    category = result.scalar_one_or_none()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Check if category is in use
    opp_count = await db.execute(
        select(func.count(OpportunityCategories.id)).where(
            OpportunityCategories.category_id == category_id
        )
    )
    inst_count = await db.execute(
        select(func.count(InstitutionCategory.id)).where(
            InstitutionCategory.category_id == category_id
        )
    )
    
    if opp_count.scalar() > 0 or inst_count.scalar() > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category that is assigned to opportunities or institutions"
        )
    
    await db.delete(category)
    await db.commit()
    
    return {"message": "Category deleted successfully"}


def slugify(text: str) -> str:
    """Convert text to URL-friendly slug"""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text


def get_category_color(index: int) -> str:
    """Get a color for the category based on index"""
    colors = [
        "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
        "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
    ]
    return colors[index % len(colors)]


@router.post("/categories/seed-from-excel")
async def seed_categories_from_excel(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Seed categories from the opportunities Excel file"""
    excel_path = Path(__file__).parent.parent / "data" / "opportunities.xlsx"
    
    if not excel_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunities Excel file not found"
        )
    
    try:
        # Read Excel file - try different header rows
        df = None
        category_column = None
        
        # Try reading with different header rows (0-10)
        for header_row in range(11):
            try:
                temp_df = pd.read_excel(excel_path, header=header_row)
                if header_row == 2:
                    print(f"Header row {header_row}: ALL columns = {list(temp_df.columns)}")  # Debug full list
                else:
                    print(f"Header row {header_row}: columns = {list(temp_df.columns)[:5]}...")  # Debug
                
                # Check if this row has a category column
                for col in [
                    'CATEGORY /\nSECTOR',  # Exact match from Excel (with newline)
                    'CATEGORY / SECTOR', 'Category / Sector', 'category / sector',
                    'CATEGORY/SECTOR', 'Category/Sector', 'category/sector',
                    'category', 'Category', 'CATEGORY', 'categories', 'Categories',
                    'sector', 'Sector', 'SECTOR'
                ]:
                    if col in temp_df.columns:
                        df = temp_df
                        category_column = col
                        print(f"Found category column: '{col}' at header row {header_row}")  # Debug
                        break
                
                if category_column:
                    break
            except Exception as ex:
                print(f"Error reading header row {header_row}: {ex}")  # Debug
                continue
        
        if df is None or category_column is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No category column found in Excel file. Please ensure the file has a 'category' column."
            )
        
        # Extract unique categories
        categories = df[category_column].dropna().unique()
        
        # Get existing categories
        result = await db.execute(select(OpportunityCategory))
        existing_categories = {cat.name: cat for cat in result.scalars().all()}
        
        created_count = 0
        skipped_count = 0
        created_categories = []
        
        for idx, category_name in enumerate(sorted(categories)):
            category_name = str(category_name).strip()
            
            if not category_name or category_name.lower() in ['nan', 'none', '']:
                continue
            
            if category_name in existing_categories:
                skipped_count += 1
                continue
            
            # Create new category
            slug = slugify(category_name)
            
            # Check if slug exists
            slug_result = await db.execute(
                select(OpportunityCategory).where(OpportunityCategory.slug == slug)
            )
            if slug_result.scalar_one_or_none():
                slug = f"{slug}-{idx}"
            
            color = get_category_color(idx)
            
            new_category = OpportunityCategory(
                name=category_name,
                slug=slug,
                color=color,
                description=f"Category for {category_name} opportunities",
                is_active=True
            )
            
            db.add(new_category)
            created_categories.append(category_name)
            created_count += 1
        
        await db.commit()
        
        return {
            "message": "Categories seeded successfully",
            "created_count": created_count,
            "skipped_count": skipped_count,
            "total_categories": created_count + skipped_count,
            "created_categories": created_categories
        }
    
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error seeding categories: {error_details}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error seeding categories: {str(e)}"
        )


@router.get("/categories/export-csv")
async def export_categories_csv(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Export all categories to CSV"""
    result = await db.execute(select(OpportunityCategory))
    categories = result.scalars().all()
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(['id', 'name', 'slug', 'description', 'color', 'icon', 'is_active'])
    
    # Write data
    for cat in categories:
        writer.writerow([
            cat.id,
            cat.name,
            cat.slug,
            cat.description or '',
            cat.color or '#3B82F6',
            cat.icon or '',
            'true' if cat.is_active else 'false'
        ])
    
    # Prepare response
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=categories.csv"}
    )


class CategoryImportResult(BaseModel):
    created: int
    updated: int
    skipped: int
    errors: List[str]
    duplicates_detected: List[str]


@router.post("/categories/import-csv", response_model=CategoryImportResult)
async def import_categories_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Import categories from CSV with duplicate detection"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV"
        )
    
    try:
        # Read CSV
        contents = await file.read()
        csv_data = io.StringIO(contents.decode('utf-8'))
        reader = csv.DictReader(csv_data)
        
        # Get existing categories
        result = await db.execute(select(OpportunityCategory))
        existing_by_name = {cat.name.lower(): cat for cat in result.scalars().all()}
        existing_by_slug = {cat.slug.lower(): cat for cat in result.scalars().all()}
        existing_by_id = {cat.id: cat for cat in result.scalars().all()}
        
        created = 0
        updated = 0
        skipped = 0
        errors = []
        duplicates_detected = []
        
        for row_num, row in enumerate(reader, start=2):
            try:
                name = row.get('name', '').strip()
                slug = row.get('slug', '').strip()
                description = row.get('description', '').strip()
                color = row.get('color', '#3B82F6').strip()
                icon = row.get('icon', '').strip()
                is_active = row.get('is_active', 'true').lower() == 'true'
                category_id = row.get('id', '').strip()
                
                if not name:
                    errors.append(f"Row {row_num}: Name is required")
                    continue
                
                if not slug:
                    slug = slugify(name)
                
                # Duplicate detection
                duplicate_found = False
                duplicate_reason = []
                
                # Check by ID (if updating existing)
                if category_id and category_id.isdigit():
                    cat_id = int(category_id)
                    if cat_id in existing_by_id:
                        # Update existing
                        category = existing_by_id[cat_id]
                        category.name = name
                        category.slug = slug
                        category.description = description
                        category.color = color
                        category.icon = icon
                        category.is_active = is_active
                        updated += 1
                        continue
                
                # Check for duplicates by name
                if name.lower() in existing_by_name:
                    duplicate_found = True
                    duplicate_reason.append(f"name '{name}'")
                
                # Check for duplicates by slug
                if slug.lower() in existing_by_slug:
                    duplicate_found = True
                    duplicate_reason.append(f"slug '{slug}'")
                
                if duplicate_found:
                    duplicates_detected.append(
                        f"Row {row_num}: Duplicate detected by {' and '.join(duplicate_reason)}"
                    )
                    skipped += 1
                    continue
                
                # Create new category
                new_category = OpportunityCategory(
                    name=name,
                    slug=slug,
                    description=description,
                    color=color,
                    icon=icon,
                    is_active=is_active
                )
                
                db.add(new_category)
                existing_by_name[name.lower()] = new_category
                existing_by_slug[slug.lower()] = new_category
                created += 1
                
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        await db.commit()
        
        return CategoryImportResult(
            created=created,
            updated=updated,
            skipped=skipped,
            errors=errors,
            duplicates_detected=duplicates_detected
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error importing CSV: {str(e)}"
        )


# ═══════════════════════════════════════════════════════════════════════════
# INSTITUTION CATEGORY ASSIGNMENT
# ═══════════════════════════════════════════════════════════════════════════

class InstitutionCategoryAssign(BaseModel):
    category_ids: List[str]
    notes: Optional[str] = None

class InstitutionCategoryResponse(BaseModel):
    id: str
    institution_id: str
    category_id: str
    category_name: str
    category_slug: str
    category_color: str
    assigned_at: datetime
    notes: Optional[str]
    
    class Config:
        from_attributes = True

@router.get("/institutions/{institution_id}/categories")
async def get_institution_categories(
    institution_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Get all categories assigned to an institution"""
    result = await db.execute(
        select(InstitutionCategory, OpportunityCategory)
        .join(OpportunityCategory)
        .where(InstitutionCategory.institution_id == institution_id)
    )
    
    assignments = []
    for inst_cat, cat in result.all():
        assignments.append({
            "id": inst_cat.id,
            "institution_id": inst_cat.institution_id,
            "category_id": cat.id,
            "category_name": cat.name,
            "category_slug": cat.slug,
            "category_color": cat.color,
            "assigned_at": inst_cat.assigned_at,
            "notes": inst_cat.notes
        })
    
    return assignments

@router.post("/institutions/{institution_id}/categories")
async def assign_categories_to_institution(
    institution_id: str,
    assignment_data: InstitutionCategoryAssign,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Assign multiple categories to an institution (replaces existing assignments)"""
    # Verify institution exists
    inst_result = await db.execute(
        select(Institution).where(Institution.id == institution_id)
    )
    institution = inst_result.scalar_one_or_none()
    
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )
    
    # Delete all existing assignments
    await db.execute(
        delete(InstitutionCategory).where(
            InstitutionCategory.institution_id == institution_id
        )
    )
    
    # Add new assignments
    for category_id in assignment_data.category_ids:
        assignment = InstitutionCategory(
            institution_id=institution_id,
            category_id=category_id,
            assigned_by=current_user.id,
            notes=assignment_data.notes
        )
        db.add(assignment)
    
    await db.commit()
    
    return {
        "message": f"Assigned {len(assignment_data.category_ids)} categories to institution",
        "assigned_category_ids": assignment_data.category_ids
    }

@router.delete("/institutions/{institution_id}/categories/{category_id}")
async def remove_category_from_institution(
    institution_id: str,
    category_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Remove a category assignment from an institution"""
    result = await db.execute(
        select(InstitutionCategory).where(
            InstitutionCategory.institution_id == institution_id,
            InstitutionCategory.category_id == category_id
        )
    )
    assignment = result.scalar_one_or_none()
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category assignment not found"
        )
    
    await db.delete(assignment)
    await db.commit()
    
    return {"message": "Category removed from institution successfully"}


# ═══════════════════════════════════════════════════════════════════════════
# OPPORTUNITY CURATION & MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════

class OpportunityResponse(BaseModel):
    id: str
    title: str
    sponsor: Optional[str]
    description: Optional[str]
    geography: Optional[str]
    funding_type: Optional[str]
    amount_min: Optional[float]
    amount_max: Optional[float]
    currency: str
    deadline: Optional[datetime]
    status: str
    is_curated: bool
    created_at: datetime
    categories: List[dict] = []
    
    class Config:
        from_attributes = True

class OpportunityCategoryAssign(BaseModel):
    category_ids: List[str]

@router.get("/opportunities")
async def list_all_opportunities(
    skip: int = 0,
    limit: int = 100,
    curated_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """List all opportunities (Global Admin sees all)"""
    query = select(GrantOpportunity)
    
    if curated_only:
        query = query.where(GrantOpportunity.is_curated == True)
    
    query = query.offset(skip).limit(limit).order_by(GrantOpportunity.deadline.desc())
    
    result = await db.execute(query)
    opportunities = result.scalars().all()
    
    # Fetch categories for each opportunity
    response = []
    for opp in opportunities:
        cat_result = await db.execute(
            select(OpportunityCategory)
            .join(OpportunityCategories)
            .where(OpportunityCategories.opportunity_id == opp.id)
        )
        categories = cat_result.scalars().all()
        
        response.append({
            "id": opp.id,
            "title": opp.title,
            "sponsor": opp.sponsor,
            "description": opp.description,
            "geography": opp.geography,
            "funding_type": opp.funding_type,
            "amount_min": opp.amount_min,
            "amount_max": opp.amount_max,
            "currency": opp.currency,
            "deadline": opp.deadline,
            "status": opp.status,
            "is_curated": opp.is_curated,
            "created_at": opp.created_at,
            "categories": [{"id": c.id, "name": c.name, "slug": c.slug, "color": c.color} for c in categories]
        })
    
    return response

@router.patch("/opportunities/{opportunity_id}/curate")
async def toggle_opportunity_curation(
    opportunity_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Toggle opportunity curation status (publish/unpublish)"""
    result = await db.execute(
        select(GrantOpportunity).where(GrantOpportunity.id == opportunity_id)
    )
    opportunity = result.scalar_one_or_none()
    
    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunity not found"
        )
    
    opportunity.is_curated = not opportunity.is_curated
    await db.commit()
    
    return {
        "message": f"Opportunity {'published' if opportunity.is_curated else 'unpublished'} successfully",
        "is_curated": opportunity.is_curated
    }

@router.post("/opportunities/{opportunity_id}/categories")
async def assign_categories_to_opportunity(
    opportunity_id: str,
    assignment_data: OpportunityCategoryAssign,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Assign categories to an opportunity"""
    # Verify opportunity exists
    opp_result = await db.execute(
        select(GrantOpportunity).where(GrantOpportunity.id == opportunity_id)
    )
    opportunity = opp_result.scalar_one_or_none()
    
    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunity not found"
        )
    
    # Get existing assignments
    existing_result = await db.execute(
        select(OpportunityCategories.category_id).where(
            OpportunityCategories.opportunity_id == opportunity_id
        )
    )
    existing_category_ids = {row[0] for row in existing_result.all()}
    
    # Add new assignments
    new_assignments = []
    for category_id in assignment_data.category_ids:
        if category_id not in existing_category_ids:
            assignment = OpportunityCategories(
                opportunity_id=opportunity_id,
                category_id=category_id,
                assigned_by=current_user.id
            )
            db.add(assignment)
            new_assignments.append(category_id)
    
    await db.commit()
    
    return {
        "message": f"Assigned {len(new_assignments)} new categories to opportunity",
        "assigned_category_ids": new_assignments
    }

@router.delete("/opportunities/{opportunity_id}/categories/{category_id}")
async def remove_category_from_opportunity(
    opportunity_id: str,
    category_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Remove a category from an opportunity"""
    result = await db.execute(
        select(OpportunityCategories).where(
            OpportunityCategories.opportunity_id == opportunity_id,
            OpportunityCategories.category_id == category_id
        )
    )
    assignment = result.scalar_one_or_none()
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category assignment not found"
        )
    
    await db.delete(assignment)
    await db.commit()
    
    return {"message": "Category removed from opportunity successfully"}

@router.post("/opportunities/bulk-curate")
async def bulk_curate_opportunities(
    opportunity_ids: List[str],
    curate: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Bulk publish/unpublish opportunities"""
    result = await db.execute(
        select(GrantOpportunity).where(GrantOpportunity.id.in_(opportunity_ids))
    )
    opportunities = result.scalars().all()
    
    for opp in opportunities:
        opp.is_curated = curate
    
    await db.commit()
    
    return {
        "message": f"{'Published' if curate else 'Unpublished'} {len(opportunities)} opportunities",
        "updated_count": len(opportunities)
    }


@router.post("/opportunities/migrate-categories")
async def migrate_opportunity_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Migrate existing category strings to category relationships"""
    try:
        # Get all opportunities with a category value
        result = await db.execute(
            select(GrantOpportunity).where(GrantOpportunity.category.isnot(None))
        )
        opportunities = result.scalars().all()
        
        # Get all categories
        cat_result = await db.execute(select(OpportunityCategory))
        categories = {cat.name.lower(): cat for cat in cat_result.scalars().all()}
        
        migrated_count = 0
        skipped_count = 0
        not_found_categories = set()
        
        for opp in opportunities:
            if not opp.category or opp.category.strip() == '':
                skipped_count += 1
                continue
            
            category_name = opp.category.strip()
            
            # Find category by name (case-insensitive)
            category = categories.get(category_name.lower())
            
            if not category:
                not_found_categories.add(category_name)
                skipped_count += 1
                continue
            
            # Check if relationship already exists
            existing = await db.execute(
                select(OpportunityCategories).where(
                    OpportunityCategories.opportunity_id == opp.id,
                    OpportunityCategories.category_id == category.id
                )
            )
            
            if existing.scalar_one_or_none():
                skipped_count += 1
                continue
            
            # Create the relationship
            opp_cat = OpportunityCategories(
                opportunity_id=opp.id,
                category_id=category.id
            )
            db.add(opp_cat)
            migrated_count += 1
        
        await db.commit()
        
        return {
            "message": "Categories migrated successfully",
            "migrated_count": migrated_count,
            "skipped_count": skipped_count,
            "not_found_categories": list(not_found_categories)
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error migrating categories: {str(e)}"
        )


@router.post("/opportunities/sync-categories-from-excel")
async def sync_categories_from_excel(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_global_admin)
):
    """Sync categories to existing opportunities from Excel file"""
    excel_path = Path(__file__).parent.parent / "data" / "opportunities.xlsx"
    
    if not excel_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunities Excel file not found"
        )
    
    try:
        # Read Excel file with header row at index 2
        df = pd.read_excel(excel_path, header=2)
        
        # Get all categories
        cat_result = await db.execute(select(OpportunityCategory))
        categories = {cat.name.lower(): cat for cat in cat_result.scalars().all()}
        
        # Get all opportunities
        opp_result = await db.execute(select(GrantOpportunity))
        opportunities = {opp.title.lower(): opp for opp in opp_result.scalars().all()}
        
        assigned_count = 0
        skipped_count = 0
        not_found_categories = set()
        
        for _, row in df.iterrows():
            # Skip empty rows
            if pd.isna(row.iloc[0]) or str(row.iloc[0]).strip() == '':
                continue
            
            title = str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else None
            category_name = str(row.iloc[5]).strip() if pd.notna(row.iloc[5]) else None
            
            if not title or not category_name:
                continue
            
            # Find opportunity by title (case-insensitive)
            opp = opportunities.get(title.lower())
            if not opp:
                skipped_count += 1
                continue
            
            # Find category by name (case-insensitive)
            category = categories.get(category_name.lower())
            if not category:
                not_found_categories.add(category_name)
                skipped_count += 1
                continue
            
            # Check if relationship already exists
            existing = await db.execute(
                select(OpportunityCategories).where(
                    OpportunityCategories.opportunity_id == opp.id,
                    OpportunityCategories.category_id == category.id
                )
            )
            if existing.scalar_one_or_none():
                skipped_count += 1
                continue
            
            # Create the relationship
            opp_cat = OpportunityCategories(
                opportunity_id=opp.id,
                category_id=category.id
            )
            db.add(opp_cat)
            assigned_count += 1
        
        await db.commit()
        
        return {
            "message": "Categories synced successfully",
            "assigned_count": assigned_count,
            "skipped_count": skipped_count,
            "not_found_categories": list(not_found_categories)
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error syncing categories: {str(e)}"
        )
