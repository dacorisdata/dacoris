# Opportunity Curation Implementation Summary

## Overview
Implemented category-based opportunity curation system where **Global Admin** manages all opportunities and controls institution access through category assignments.

---

## Backend Implementation

### 1. Database Models (`backend/models.py`)

#### New Models Added:
```python
# Opportunity Categories
class OpportunityCategory(Base):
    - id, name, description, slug, color, icon, is_active
    - Relationships: opportunity_associations, institution_associations

# Junction Tables
class OpportunityCategories(Base):  # Opportunity <-> Category
    - opportunity_id, category_id, assigned_by, assigned_at

class InstitutionCategory(Base):    # Institution <-> Category
    - institution_id, category_id, assigned_by, assigned_at, notes
```

#### Updated Models:
```python
class GrantOpportunity(Base):
    - REMOVED: institution_id (opportunities are now platform-wide)
    - ADDED: category_assignments relationship
    - Legacy category field kept for backward compatibility
```

### 2. API Routes (`backend/routes/global_admin.py`)

#### Category Management Endpoints:
```
GET    /api/global-admin/categories                    # List all categories
POST   /api/global-admin/categories                    # Create category
GET    /api/global-admin/categories/{id}               # Get category
PUT    /api/global-admin/categories/{id}               # Update category
DELETE /api/global-admin/categories/{id}               # Delete category (if not in use)
```

#### Institution Category Assignment:
```
GET    /api/global-admin/institutions/{id}/categories         # Get institution's categories
POST   /api/global-admin/institutions/{id}/categories         # Assign categories (bulk)
DELETE /api/global-admin/institutions/{id}/categories/{cat_id} # Remove category
```

#### Opportunity Curation:
```
GET    /api/global-admin/opportunities                        # All opportunities (with categories)
PATCH  /api/global-admin/opportunities/{id}/curate            # Toggle publish/unpublish
POST   /api/global-admin/opportunities/{id}/categories        # Assign categories to opportunity
DELETE /api/global-admin/opportunities/{id}/categories/{cat_id} # Remove category
POST   /api/global-admin/opportunities/bulk-curate            # Bulk publish/unpublish
```

---

## Frontend Implementation

### 1. Global Admin - Opportunities Page
**Location:** `frontend/app/global-admin/opportunities/page.js`

**Features:**
- ✅ View all opportunities (curated and uncurated)
- ✅ Search and filter opportunities
- ✅ Filter by curation status (all/published/unpublished)
- ✅ Bulk select opportunities
- ✅ Bulk publish/unpublish actions
- ✅ Individual publish/unpublish toggle
- ✅ Assign categories to opportunities (multi-select dialog)
- ✅ Visual category chips with colors
- ✅ Real-time status indicators

**UI Components:**
- Search bar with filter dropdown
- Bulk action buttons (Publish Selected, Unpublish Selected)
- Data table with checkboxes
- Category assignment dialog with multi-select
- Color-coded category chips

### 2. Global Admin - Categories Page
**Location:** `frontend/app/global-admin/categories/page.js`

**Features:**
- ✅ View all categories in grid layout
- ✅ Create new categories
- ✅ Edit existing categories
- ✅ Delete categories (with validation)
- ✅ Color picker for category colors
- ✅ Auto-generate slugs from names
- ✅ Category status indicators

**UI Components:**
- Grid card layout
- Create/Edit dialog with form
- Color picker with live preview
- Delete confirmation
- Empty state with call-to-action

### 3. Global Admin - Institutions Page (Enhanced)
**Location:** `frontend/app/global-admin/institutions/page.js`

**New Features Added:**
- ✅ "Manage Categories" button for each institution
- ✅ Category assignment dialog
- ✅ Visual category selection interface
- ✅ Shows currently assigned categories
- ✅ Bulk category assignment

**UI Components:**
- Category management button in actions column
- Interactive category selection dialog
- Color-coded category indicators
- Selected state visualization

---

## Data Flow

### Opportunity Visibility Logic:
```
1. Global Admin creates/imports opportunity
2. Global Admin assigns categories (e.g., "Health", "Agriculture")
3. Global Admin assigns categories to institutions
   - Medical University → "Health" category
   - Agricultural College → "Agriculture" category
4. Global Admin curates (publishes) opportunity
5. Researchers see opportunities where:
   - is_curated = true
   - opportunity has category assigned to their institution
   - status = "Open" or "Upcoming"
```

### Access Control:
- **Global Admin**: Sees ALL opportunities (curated + uncurated)
- **Grant Officers**: Can create opportunities but cannot curate
- **Institution Admins**: See only curated opportunities in their categories
- **Researchers**: See only curated opportunities in their institution's categories

---

## Next Steps

### Required for Full Implementation:

1. **Update Existing Opportunity Routes** (`backend/routes/grant_opportunities.py`):
   - Add category filtering for institution users
   - Update opportunity list endpoint to filter by institution categories
   - Add category information to opportunity responses

2. **Admin Staff Frontend** (`frontend/app/admin-staff/grants/opportunities`):
   - Update to show only category-filtered opportunities
   - Display category badges on opportunities
   - Update opportunity discovery page

3. **Database Migration**:
   - Create Alembic migration for new tables
   - Migrate existing opportunities (optional category assignment)
   - Seed initial categories

4. **Testing**:
   - Test category assignment workflow
   - Test opportunity visibility filtering
   - Test bulk operations
   - Test permission boundaries

5. **Documentation**:
   - Update API documentation
   - Create user guide for Global Admin
   - Document category management workflow

---

## Database Schema Changes

### New Tables:
```sql
CREATE TABLE opportunity_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    slug VARCHAR(100) UNIQUE NOT NULL,
    color VARCHAR(20) DEFAULT '#3B82F6',
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);

CREATE TABLE opportunity_category_assignments (
    id SERIAL PRIMARY KEY,
    opportunity_id INTEGER REFERENCES grant_opportunities(id),
    category_id INTEGER REFERENCES opportunity_categories(id),
    assigned_by INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(opportunity_id, category_id)
);

CREATE TABLE institution_categories (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER REFERENCES institutions(id),
    category_id INTEGER REFERENCES opportunity_categories(id),
    assigned_by INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT NOW(),
    notes TEXT,
    UNIQUE(institution_id, category_id)
);
```

### Modified Tables:
```sql
ALTER TABLE grant_opportunities 
DROP COLUMN institution_id;  -- Opportunities are now platform-wide
```

---

## Example Usage Workflow

### 1. Global Admin Creates Categories:
```javascript
POST /api/global-admin/categories
{
  "name": "Health & Medical Research",
  "slug": "health-medical-research",
  "description": "Opportunities related to health, medicine, and medical research",
  "color": "#EF4444"
}
```

### 2. Global Admin Assigns Categories to Institution:
```javascript
POST /api/global-admin/institutions/1/categories
{
  "category_ids": [1, 3, 5],  // Health, Education, Technology
  "notes": "Medical university with tech programs"
}
```

### 3. Global Admin Assigns Categories to Opportunity:
```javascript
POST /api/global-admin/opportunities/42/categories
{
  "category_ids": [1]  // Health category
}
```

### 4. Global Admin Publishes Opportunity:
```javascript
PATCH /api/global-admin/opportunities/42/curate
// Toggles is_curated to true
```

### 5. Researcher Queries Opportunities:
```javascript
GET /api/grants/opportunities
// Returns only opportunities where:
// - is_curated = true
// - opportunity.categories ∩ institution.categories ≠ ∅
// - status IN ('open', 'upcoming')
```

---

## Benefits of This Architecture

1. **Centralized Control**: Global Admin has full visibility and control
2. **Flexible Categorization**: Multiple categories per opportunity/institution
3. **Scalability**: Easy to add new categories without code changes
4. **Multi-tenancy**: Institutions see only relevant opportunities
5. **Audit Trail**: Track who assigned categories and when
6. **Bulk Operations**: Efficient management of large opportunity sets
7. **Visual Organization**: Color-coded categories for easy identification

---

## Files Modified/Created

### Backend:
- ✅ `backend/models.py` - Added category models
- ✅ `backend/routes/global_admin.py` - Added category & curation routes
- ⏳ `backend/routes/grant_opportunities.py` - Needs category filtering
- ⏳ `backend/alembic/versions/xxx_add_categories.py` - Migration needed

### Frontend:
- ✅ `frontend/app/global-admin/opportunities/page.js` - NEW
- ✅ `frontend/app/global-admin/categories/page.js` - NEW
- ✅ `frontend/app/global-admin/institutions/page.js` - ENHANCED
- ⏳ `frontend/app/admin-staff/grants/opportunities/` - Needs update

### Documentation:
- ✅ `DACORIS_Implementation_Plan_v1.4.md` - Updated to v1.5
- ✅ `OPPORTUNITY_CURATION_IMPLEMENTATION.md` - This file

---

## Status: ✅ Core Implementation Complete

**Completed:**
- ✅ Database models
- ✅ Global Admin API routes
- ✅ Global Admin frontend pages
- ✅ Category management system
- ✅ Institution category assignment
- ✅ Opportunity curation interface

**Pending:**
- ⏳ Category filtering in opportunity routes
- ⏳ Admin-staff frontend updates
- ⏳ Database migration
- ⏳ Testing & validation
