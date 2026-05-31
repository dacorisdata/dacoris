# UUID Primary Key Migration Guide

## Overview
This guide covers the migration from sequential Integer primary keys to unpredictable UUID string primary keys across all database tables.

## What Changed

### Before (Integer PKs)
```python
id = Column(Integer, primary_key=True, index=True)
user_id = Column(Integer, ForeignKey('users.id'))
```
- IDs: 1, 2, 3, 4... (predictable)
- Type: Integer

### After (UUID PKs)
```python
id = Column(String, primary_key=True, index=True, default=generate_uuid)
user_id = Column(String, ForeignKey('users.id'))
```
- IDs: "a3f8c9d2-4b5e-4c8a-9f2d-1e3b4c5d6e7f" (unpredictable)
- Type: String (VARCHAR(36))

## Changes Summary

✅ **55 primary keys** converted to UUID
✅ **115 foreign key columns** converted to String
✅ **All tables** affected (institutions, users, proposals, MoUs, publications, etc.)

## Migration Steps

### 1. Backup Your Database (CRITICAL!)

```bash
# PostgreSQL backup
pg_dump -U dacoris_user -h localhost dacoris_db > backup_before_uuid_migration.sql

# Or using Docker
docker exec dacoris-postgres pg_dump -U dacoris_user dacoris_db > backup_before_uuid_migration.sql
```

### 2. Stop All Services

```bash
# Stop backend and frontend
docker-compose down

# Or if running locally
# Stop your backend server
# Stop your frontend dev server
```

### 3. Review Updated Models

The `models.py` file has been automatically updated. Key changes:

- All `id` columns now use `String` type with `default=generate_uuid`
- All foreign key columns (`*_id`) now use `String` type
- UUID generation function added at top of file

### 4. Run the Migration Script

```bash
cd backend
python migrations/convert_to_uuid_pks.py
```

**What the script does:**
1. Reads all existing data from each table
2. Generates UUID for each Integer ID
3. Creates temporary tables with UUID structure
4. Migrates data with ID mappings preserved
5. Swaps tables (backs up originals)
6. Maintains all foreign key relationships

**Expected output:**
```
============================================================
UUID PRIMARY KEY MIGRATION
============================================================
[WARNING] This migration will convert ALL Integer PKs to UUIDs
[WARNING] Make sure you have a database backup!

Press ENTER to continue or Ctrl+C to cancel...

Starting migration...

============================================================
Migrating table: institutions
============================================================
Found 5 rows to migrate
[OK] Successfully migrated institutions
...
============================================================
[SUCCESS] MIGRATION COMPLETED SUCCESSFULLY
============================================================

Migrated 50 tables
Total ID mappings created: 1234
```

### 5. Verify Migration

```bash
# Connect to database
psql -U dacoris_user -d dacoris_db

# Check a few tables
SELECT id, email FROM users LIMIT 5;
SELECT id, name FROM institutions LIMIT 5;

# Verify IDs are now UUIDs (36-character strings)
```

### 6. Update Alembic (if using)

If you're using Alembic for migrations, you'll need to update:

```bash
# Generate new migration reflecting UUID changes
alembic revision --autogenerate -m "Convert to UUID primary keys"

# Mark as applied (since we manually migrated)
alembic stamp head
```

### 7. Restart Services

```bash
# Using Docker
docker-compose up -d

# Or locally
# Start backend: uvicorn main:app --reload
# Start frontend: npm run dev
```

### 8. Test Your Application

- ✅ Login/authentication
- ✅ Create new records
- ✅ View existing records
- ✅ Update records
- ✅ Delete records
- ✅ Foreign key relationships
- ✅ API endpoints returning IDs

## Affected Tables (50+)

### Core Tables
- institutions
- users
- user_roles (junction table)
- orcid_profiles

### Grant Module
- grant_opportunities
- opportunity_bookmarks
- opportunity_categories
- opportunity_category_assignments
- institution_categories
- proposals
- proposal_sections
- proposal_section_versions
- proposal_documents
- proposal_collaborators
- proposal_reviews
- proposal_stage_history
- proposal_stage_assignments
- awards
- budget_lines

### Research Module
- research_projects
- ethics_applications
- ethics_documents
- project_members
- project_milestones
- project_tasks
- project_documents
- research_outputs

### Data Module
- capture_forms
- form_submissions
- datasets
- dataset_versions
- qa_rules
- qa_results
- data_transformations
- data_import_requests
- data_sources

### Publications Module
- scholarly_works
- work_authors
- work_institutions
- work_funders
- publication_libraries
- publications

### Manuscripts Module
- manuscripts
- manuscript_co_authors

### MoU Module
- mous
- mou_partners
- mou_partner_contacts
- mou_participants
- mou_communications
- mou_approval_stages
- mou_activities
- mou_versions
- mou_budgets
- mou_compliance_items

### Notifications
- email_verifications
- notifications

## Rollback (If Needed)

If something goes wrong, you can restore from backup:

```bash
# Stop services
docker-compose down

# Restore from backup
psql -U dacoris_user -d dacoris_db < backup_before_uuid_migration.sql

# Or drop and recreate
dropdb -U dacoris_user dacoris_db
createdb -U dacoris_user dacoris_db
psql -U dacoris_user -d dacoris_db < backup_before_uuid_migration.sql

# Revert models.py to previous version
git checkout HEAD -- backend/models.py

# Restart services
docker-compose up -d
```

## Frontend Considerations

Your frontend should handle UUIDs transparently since they're just strings. However, verify:

1. **API Responses**: IDs are now strings, not numbers
2. **URL Parameters**: Routes like `/users/123` become `/users/a3f8c9d2-...`
3. **Form Validation**: Update any ID validation that expects integers
4. **TypeScript Types**: Update interfaces if you have `id: number` → `id: string`

Example frontend update:
```typescript
// Before
interface User {
  id: number;
  email: string;
}

// After
interface User {
  id: string;
  email: string;
}
```

## Performance Notes

- **UUID vs Integer**: UUIDs are slightly larger (36 bytes vs 4 bytes) but the security benefit outweighs the minimal performance impact
- **Indexing**: All ID columns remain indexed
- **Foreign Keys**: All relationships preserved
- **Query Performance**: Negligible difference for typical workloads

## Security Benefits

✅ **Unpredictable IDs**: Attackers can't guess valid IDs
✅ **No Enumeration**: Can't iterate through records sequentially
✅ **Better Privacy**: User IDs don't reveal registration order
✅ **API Security**: Harder to scrape data by incrementing IDs

## Troubleshooting

### Migration fails midway
- Check database logs for specific errors
- Restore from backup
- Fix the issue and re-run

### Foreign key constraint errors
- Ensure all parent tables are migrated before child tables
- The script handles this automatically via `TABLES_IN_ORDER`

### "Table already exists" errors
- Drop temporary tables: `DROP TABLE IF EXISTS *_uuid_temp CASCADE;`
- Re-run migration

### Performance issues after migration
- Rebuild indexes: `REINDEX DATABASE dacoris_db;`
- Update statistics: `ANALYZE;`

## Post-Migration Checklist

- [ ] Database backup created
- [ ] Migration script completed successfully
- [ ] All services restarted
- [ ] Login/authentication works
- [ ] Can create new records
- [ ] Can view existing records
- [ ] Foreign key relationships intact
- [ ] API endpoints return UUID strings
- [ ] Frontend displays data correctly
- [ ] No console errors in browser
- [ ] No backend errors in logs

## Questions?

If you encounter issues:
1. Check the migration script output for errors
2. Review database logs
3. Verify backup exists before attempting fixes
4. Test in development environment first

---

**Migration Date**: _____________
**Performed By**: _____________
**Database Backup Location**: _____________
**Status**: ⬜ Success ⬜ Failed ⬜ Rolled Back
