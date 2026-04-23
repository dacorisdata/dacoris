# Database Seeding Instructions

## Seed Opportunities from Excel

This script loads grant opportunities from the Excel file into the PostgreSQL database.

### Prerequisites
- Docker containers must be running (`docker compose up`)
- Excel file must exist at: `backend/data/opportunities.xlsx`

### Run the Seed Script

**Option 1: From host machine (if Python environment is set up)**
```bash
cd backend
python scripts/seed_opportunities.py
```

**Option 2: Inside Docker container (recommended)**
```bash
# Enter the backend container
docker exec -it dacoris-backend bash

# Run the seed script
python scripts/seed_opportunities.py

# Exit container
exit
```

### What the Script Does

1. **Creates tables** - Ensures `grant_opportunities` and `opportunity_bookmarks` tables exist
2. **Creates system user** - Creates a system user if one doesn't exist (for `created_by` field)
3. **Loads Excel data** - Reads all opportunities from `opportunities.xlsx`
4. **Checks for duplicates** - Skips opportunities with duplicate titles
5. **Seeds database** - Inserts all new opportunities with `is_curated=False` by default
6. **Reports results** - Shows count of added, skipped, and total opportunities

### Expected Output

```
🌱 Starting opportunity seeding process...
📂 Loading opportunities from: /app/data/opportunities.xlsx
📊 Found 25 opportunities in Excel file
✅ Processed 10/25 opportunities...
✅ Processed 20/25 opportunities...

============================================================
✅ Successfully added 25 opportunities
⏭️  Skipped 0 duplicates
📊 Total opportunities in database: 25
============================================================
✨ Seeding complete!
```

### After Seeding

1. **Verify in database**:
   ```bash
   docker exec -it dacoris-db psql -U dacoris_user -d dacoris_db -c "SELECT COUNT(*) FROM grant_opportunities;"
   ```

2. **Check frontend**:
   - Admin: `http://localhost/admin-staff/grants/opportunities`
   - Researcher: `http://localhost/researcher/grants/discover`

3. **Curate opportunities**:
   - Go to admin page
   - Select opportunities
   - Click "Publish to Researchers"

### Database Schema

**grant_opportunities table:**
- `id` - Primary key
- `title` - Opportunity title
- `sponsor` - Funding organization
- `description` - Full description
- `category` - Category (Health, STEM, etc.)
- `funding_type` - Type of funding
- `amount_min`, `amount_max` - Funding range
- `currency` - Currency code (KES, USD, EUR)
- `deadline` - Application deadline
- `status` - open, upcoming, archived, closed
- `is_curated` - Published to researchers (default: false)
- `created_by_id` - User who created it
- `created_at`, `updated_at` - Timestamps

**opportunity_bookmarks table:**
- `id` - Primary key
- `opportunity_id` - Foreign key to grant_opportunities
- `user_id` - Foreign key to users
- `created_at` - Timestamp
- Unique constraint on (opportunity_id, user_id)

### Troubleshooting

**Error: Excel file not found**
- Ensure `backend/data/opportunities.xlsx` exists
- Check file path in script

**Error: System user creation failed**
- Check database connection
- Ensure migrations have run

**Error: Duplicate opportunities**
- Script skips duplicates by title
- Delete existing opportunities if you want to re-seed

### Re-seeding

To clear and re-seed:
```bash
docker exec -it dacoris-backend python scripts/seed_opportunities.py
# When prompted: "Do you want to delete existing opportunities? (yes/no):"
# Type: yes
```
