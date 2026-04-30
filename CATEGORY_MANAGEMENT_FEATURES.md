# Category Management Features

## Overview
Comprehensive category management system for organizing funding opportunities with Excel seeding, CSV import/export, and duplicate detection.

---

## ✨ New Features

### 1. **Seed Categories from Excel** 🌱
Automatically extract and create categories from the opportunities Excel file.

**How it works:**
- Reads `backend/data/opportunities.xlsx`
- Extracts unique values from the `category` column
- Creates new categories with auto-generated slugs and colors
- Skips existing categories (duplicate detection)
- Shows summary of created vs skipped categories

**Usage:**
1. Go to **Global Admin → Categories**
2. Click **Actions** → **Seed from Excel**
3. Confirm the action
4. View results showing created and skipped categories

**API Endpoint:**
```
POST /api/global-admin/categories/seed-from-excel
```

---

### 2. **Export Categories to CSV** 📥
Download all categories as a CSV file for editing or backup.

**CSV Format:**
```csv
id,name,slug,description,color,icon,is_active
1,Health,health,Category for Health opportunities,#3B82F6,,true
2,Agriculture,agriculture,Category for Agriculture opportunities,#10B981,,true
```

**Usage:**
1. Go to **Global Admin → Categories**
2. Click **Actions** → **Export to CSV**
3. File downloads automatically as `categories_YYYY-MM-DD.csv`

**API Endpoint:**
```
GET /api/global-admin/categories/export-csv
```

---

### 3. **Import Categories from CSV** 📤
Upload a CSV file to create or update categories in bulk.

**Features:**
- **Create** new categories
- **Update** existing categories (by ID)
- **Duplicate Detection** by name and slug
- **Error Reporting** for invalid rows
- **Summary Dialog** showing results

**Duplicate Detection:**
- Checks for duplicate **names** (case-insensitive)
- Checks for duplicate **slugs** (case-insensitive)
- Reports all duplicates with reasons
- Skips duplicates automatically

**Usage:**
1. Export existing categories (optional)
2. Edit the CSV file:
   - Add new rows (leave `id` empty)
   - Update existing rows (keep `id` value)
3. Click **Actions** → **Import from CSV**
4. Select your CSV file
5. Review import results dialog

**Import Result Dialog Shows:**
- ✅ **Created** - New categories added
- 🔄 **Updated** - Existing categories modified
- ⚠️ **Skipped** - Duplicates detected
- ❌ **Errors** - Invalid data

**API Endpoint:**
```
POST /api/global-admin/categories/import-csv
```

---

## 🔧 Backend Implementation

### New API Endpoints

#### 1. Seed from Excel
```python
@router.post("/categories/seed-from-excel")
async def seed_categories_from_excel(...)
```
- Reads Excel file
- Extracts unique categories
- Creates missing categories
- Returns summary

#### 2. Export CSV
```python
@router.get("/categories/export-csv")
async def export_categories_csv(...)
```
- Fetches all categories
- Generates CSV in memory
- Returns as downloadable file

#### 3. Import CSV
```python
@router.post("/categories/import-csv")
async def import_categories_csv(...)
```
- Validates CSV format
- Detects duplicates by name and slug
- Creates new categories
- Updates existing categories (by ID)
- Returns detailed results

### Helper Functions

```python
def slugify(text: str) -> str
    """Convert text to URL-friendly slug"""

def get_category_color(index: int) -> str
    """Get a color for the category based on index"""
```

### Duplicate Detection Logic

```python
# Check by name (case-insensitive)
if name.lower() in existing_by_name:
    duplicate_found = True
    
# Check by slug (case-insensitive)
if slug.lower() in existing_by_slug:
    duplicate_found = True

# Update existing by ID
if category_id in existing_by_id:
    # Update existing category
```

---

## 🎨 Frontend Implementation

### New UI Components

#### Actions Menu
- **Seed from Excel** - Button with loading state
- **Export to CSV** - Download trigger
- **Import from CSV** - File upload trigger

#### Import Results Dialog
- Summary cards (Created, Updated, Skipped)
- Duplicates list with warnings
- Errors list with details
- Success message

### State Management

```javascript
const [menuAnchor, setMenuAnchor] = useState(null);
const [importDialogOpen, setImportDialogOpen] = useState(false);
const [importResult, setImportResult] = useState(null);
const [seeding, setSeeding] = useState(false);
const fileInputRef = useRef(null);
```

### Handler Functions

```javascript
handleSeedFromExcel()   // Seed from Excel file
handleExportCSV()       // Download CSV
handleImportCSV()       // Upload and import CSV
```

---

## 📊 CSV File Format

### Required Columns
- `name` - Category name (required)
- `slug` - URL-friendly identifier (auto-generated if empty)

### Optional Columns
- `id` - Category ID (for updates)
- `description` - Category description
- `color` - Hex color code (default: #3B82F6)
- `icon` - Material icon name
- `is_active` - true/false (default: true)

### Example CSV

```csv
id,name,slug,description,color,icon,is_active
,New Category,new-category,A brand new category,#FF5722,,true
1,Health,health,Updated description,#3B82F6,health,true
```

**Row 1:** Creates new category (no ID)
**Row 2:** Updates category with ID=1

---

## 🚀 Usage Workflows

### Workflow 1: Initial Setup
1. **Seed from Excel** to create categories from existing data
2. **Export to CSV** to review and edit
3. **Import CSV** to update descriptions and colors

### Workflow 2: Bulk Updates
1. **Export to CSV**
2. Edit in Excel/Google Sheets
3. **Import CSV** with updated data
4. Review duplicate detection results

### Workflow 3: Adding New Categories
1. **Export to CSV** (to get template)
2. Add new rows (leave `id` empty)
3. **Import CSV**
4. New categories created automatically

---

## ⚠️ Important Notes

### Duplicate Detection
- **By Name:** Case-insensitive comparison
- **By Slug:** Case-insensitive comparison
- **Duplicates are skipped**, not overwritten
- **To update:** Include the `id` column

### Slug Generation
- Auto-generated from name if not provided
- Converts to lowercase
- Replaces spaces with hyphens
- Removes special characters

### Color Assignment
- Default: `#3B82F6` (blue)
- Auto-assigned from palette when seeding
- Can be customized in CSV or UI

### Excel File Requirements
- Must be located at `backend/data/opportunities.xlsx`
- Must have a `category` column (case-insensitive)
- Empty/null values are skipped

---

## 🔍 Error Handling

### Common Errors

**1. Missing Category Column**
```
Error: No category column found. Available columns: [...]
```
**Solution:** Ensure Excel file has a column named `category`

**2. Duplicate Detected**
```
Row 5: Duplicate detected by name 'Health'
```
**Solution:** Remove duplicate or include `id` to update existing

**3. Invalid CSV Format**
```
Error: File must be a CSV
```
**Solution:** Ensure file has `.csv` extension

**4. Missing Required Field**
```
Row 3: Name is required
```
**Solution:** Ensure all rows have a `name` value

---

## 📝 Files Modified/Created

### Backend
- ✅ `backend/routes/global_admin.py` - Added 3 new endpoints
- ✅ `backend/scripts/seed_categories_from_excel.py` - Standalone seeding script

### Frontend
- ✅ `frontend/app/global-admin/categories/page.js` - Added UI for all features

### Dependencies
- `pandas` - Excel/CSV processing
- `openpyxl` - Excel file reading

---

## 🎯 Benefits

1. **Time Saving** - Bulk operations instead of manual entry
2. **Data Integrity** - Duplicate detection prevents errors
3. **Flexibility** - Edit in familiar tools (Excel, Google Sheets)
4. **Audit Trail** - CSV files serve as backups
5. **Migration** - Easy to move categories between environments

---

## 🔮 Future Enhancements

- [ ] Category merging functionality
- [ ] Bulk delete from CSV
- [ ] Category usage statistics in export
- [ ] Import preview before commit
- [ ] Support for multiple Excel files
- [ ] Category hierarchy/nesting

---

## 📚 API Documentation

### Seed from Excel
```http
POST /api/global-admin/categories/seed-from-excel
Authorization: Bearer {token}

Response:
{
  "message": "Categories seeded successfully",
  "created_count": 15,
  "skipped_count": 3,
  "total_categories": 18,
  "created_categories": ["Health", "Agriculture", ...]
}
```

### Export CSV
```http
GET /api/global-admin/categories/export-csv
Authorization: Bearer {token}

Response: CSV file download
```

### Import CSV
```http
POST /api/global-admin/categories/import-csv
Authorization: Bearer {token}
Content-Type: multipart/form-data

Body: file=categories.csv

Response:
{
  "created": 5,
  "updated": 2,
  "skipped": 3,
  "errors": [],
  "duplicates_detected": [
    "Row 10: Duplicate detected by name 'Health'"
  ]
}
```

---

## ✅ Testing Checklist

- [ ] Seed from Excel with valid file
- [ ] Seed from Excel with missing file
- [ ] Seed from Excel with no category column
- [ ] Export CSV with categories
- [ ] Export CSV with no categories
- [ ] Import CSV with new categories
- [ ] Import CSV with updates (by ID)
- [ ] Import CSV with duplicates
- [ ] Import CSV with errors
- [ ] Import CSV with mixed operations
- [ ] Verify duplicate detection by name
- [ ] Verify duplicate detection by slug
- [ ] Verify slug auto-generation
- [ ] Verify color assignment

---

**Status:** ✅ Complete and Ready for Use!
