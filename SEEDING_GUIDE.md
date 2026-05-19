# DACORIS Seeding Guide

## Quick Start

To seed categories and opportunities from the Excel file:

```powershell
# Run the complete seeding script
docker exec dacoris-backend python seed_complete.py
```

## What Gets Seeded

### Categories (from Excel column: CATEGORY / SECTOR)
The script extracts all unique categories from the opportunities Excel file and creates them with:
- **Name**: Category name from Excel
- **Slug**: URL-friendly version (e.g., "agriculture-food-security")
- **Color**: Auto-assigned color for UI display
- **Description**: Auto-generated description
- **Status**: Active by default

### Opportunities (from Excel file: data/opportunities.xlsx)
Each opportunity is created with:
- **Basic Info**: Title, Sponsor, Description
- **Category**: Linked to the appropriate category
- **Geography**: Target counties/regions
- **Funding**: Amount range, currency, funding type
- **Dates**: Open date, deadline
- **Eligibility**: Applicant types, requirements
- **Contact**: Email, application URL
- **Status**: Open, upcoming, or archived

### Category-Opportunity Links
Each opportunity is automatically linked to its category through the `opportunity_category_assignments` table.

## Seeding Results

After running the script, you'll see:

```
============================================================
✅ SEEDING COMPLETE!
============================================================
Categories:
  - Created: 20
  - Total:   20

Opportunities:
  - Created: 20
  - Skipped: 0
  - Total:   20

Category Links:
  - Linked:  20
============================================================
```

## View Seeded Data

### Categories
Visit: http://localhost/global-admin/categories

You should see all 20 categories with their colors and counts.

### Opportunities
Visit: http://localhost/global-admin/opportunities

You should see all 20 opportunities, each tagged with its category.

## Excel File Structure

The script reads from `backend/data/opportunities.xlsx` with the following columns (header row 3):

| Column | Name | Description |
|--------|------|-------------|
| 0 | OPPORTUNITY ID | Unique identifier (source_id) |
| 1 | SOURCE SYSTEM | Source system name |
| 2 | OPPORTUNITY TITLE | Grant title |
| 3 | SPONSOR / FUNDER | Funding organization |
| 4 | SPONSOR TYPE | Type of funder |
| 5 | **CATEGORY / SECTOR** | Category (used for linking) |
| 6 | GEOGRAPHY / COUNTY | Target regions |
| 7 | ELIGIBLE APPLICANTS | Who can apply |
| 8 | FUNDING TYPE | Grant, loan, etc. |
| 9 | CCY | Currency (KES, USD, etc.) |
| 10 | MIN AWARD | Minimum amount |
| 11 | MAX AWARD | Maximum amount |
| 12 | OPEN DATE | Application opens |
| 13 | DEADLINE | Application deadline |
| 14 | DAYS REMAINING | Calculated field |
| 15 | STATUS | open, upcoming, archived |
| 16 | ROUND / CYCLE | Funding round |
| 17 | CONTACT EMAIL | Contact email |
| 18 | OPPORTUNITY URL | Application URL |
| 19 | INTERNAL NOTES | Description/notes |

## Re-seeding

The script is **idempotent** - it won't create duplicates:

```powershell
# Safe to run multiple times
docker exec dacoris-backend python seed_complete.py
```

Output will show:
- **Created**: New items added
- **Skipped**: Items that already exist

## Individual Seeding Scripts

If you need to seed only categories or only opportunities:

### Categories Only
```powershell
docker exec dacoris-backend python scripts/seed_categories_from_excel.py
```

### Opportunities Only (without category links)
```powershell
docker exec dacoris-backend python seed_opportunities_from_excel.py
```

### Complete (Categories + Opportunities + Links)
```powershell
docker exec dacoris-backend python seed_complete.py
```

## Troubleshooting

### Excel file not found
```
❌ Excel file not found: /app/data/opportunities.xlsx
```

**Solution**: Ensure `backend/data/opportunities.xlsx` exists and rebuild:
```powershell
docker-compose up -d --build backend
```

### No global admin found
```
❌ No global admin found. Please create an admin first.
```

**Solution**: The admin is created automatically on first startup. Check:
```powershell
docker logs dacoris-backend | grep "Global admin"
```

### Permission errors
```
❌ Permission denied
```

**Solution**: Run PowerShell as Administrator

### Database connection errors
```
❌ Database connection failed
```

**Solution**: Ensure database is healthy:
```powershell
docker-compose ps
docker-compose logs db
```

## Updating the Excel File

1. Edit `backend/data/opportunities.xlsx`
2. Rebuild backend container:
```powershell
docker-compose up -d --build backend
```
3. Run seeding:
```powershell
docker exec dacoris-backend python seed_complete.py
```

## Categories Created

The following categories are seeded from the Excel file:

1. Agriculture & Food Security
2. Climate Change & Environment
3. Digital Innovation & ICT
4. Disaster Risk Reduction
5. Economic Empowerment
6. Education
7. Energy & Infrastructure
8. Gender Equality & Women Empowerment
9. Governance & Accountability
10. Health & Community Systems
11. Human Rights & Social Justice
12. Humanitarian Response
13. Innovation & Research
14. Livestock & Fisheries
15. Peace & Security
16. Private Sector Development
17. TVET & Skills Development
18. Trade & Economic Integration
19. Urban Development
20. Water & Sanitation

Each category is assigned a unique color for easy visual identification in the UI.

## Next Steps

After seeding:

1. **View Categories**: http://localhost/global-admin/categories
2. **View Opportunities**: http://localhost/global-admin/opportunities
3. **Test Filtering**: Filter opportunities by category
4. **Test Search**: Search for specific opportunities
5. **Test Curation**: Mark opportunities as curated/uncurated

## Support

For issues with seeding:
1. Check Docker logs: `docker logs dacoris-backend`
2. Verify Excel file exists: `docker exec dacoris-backend ls -la data/`
3. Check database: `docker-compose ps`
4. Review script output for specific errors
