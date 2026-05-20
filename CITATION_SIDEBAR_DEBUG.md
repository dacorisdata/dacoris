# Citation Sidebar - Debugging Guide

## Issues Fixed

### 1. ✅ Removed from Researcher Sidebar
- **Data Sources** - Removed from Data Collection section
- **Collaboration section** - Completely removed (My Teams, Invitations)

**File Modified:** `frontend/components/ResearcherSidebar.js`

### 2. 🔍 Citation Sidebar - Publications Not Showing

**Added Debug Logging:**
The citation sidebar now logs detailed information to the browser console to help diagnose why publications aren't showing.

## How to Debug

### Step 1: Rebuild Frontend

```bash
cd c:\projects\dacoris
docker-compose up -d --build frontend
```

### Step 2: Open Browser Console

1. Navigate to the manuscript editor
2. Open browser console (F12)
3. Click the citation icon to open the sidebar

### Step 3: Check Console Logs

You should see these logs:

```
📚 Libraries fetched: [...]
📄 Publications fetched: [...]
📄 Transformed publications: [...]
🔍 Filtered publications: X
📁 Grouped publications: {...}
```

### What to Look For

#### If "Libraries fetched" is empty `[]`:
- No libraries exist in the database
- Go to `/researcher/publications/library` and create a library first

#### If "Publications fetched" is empty `[]`:
- No publications have been imported
- Go to `/researcher/publications/library`
- Import publications from PubMed/Crossref
- Assign them to a library

#### If "Filtered publications" is 0 but "Publications fetched" has data:
- Check the `library_id` and `library_name` fields
- The publications might not have proper library associations
- Check database: `SELECT id, title, library_id FROM publications;`

#### If "Grouped publications" is empty `{}`:
- Publications are being filtered out
- Check if `selectedLibrary` matches any publication's `library_id`

## Common Issues & Solutions

### Issue: "No publications in your library"

**Cause:** No publications have been imported yet.

**Solution:**
1. Go to `/researcher/publications/library`
2. Click "Import Publications"
3. Search PubMed/Crossref
4. Select publications
5. Choose a library/folder
6. Click "Import to Selected Library"

### Issue: Publications exist but don't show in citation sidebar

**Possible Causes:**
1. Publications not associated with a library
2. `library_name` field is null in database
3. API not returning `library_name` in response

**Debug SQL:**
```sql
SELECT 
  p.id, 
  p.title, 
  p.library_id,
  pl.name as library_name
FROM publications p
LEFT JOIN publication_libraries pl ON p.library_id = pl.id
WHERE p.library_id IS NOT NULL;
```

**Fix:**
If publications have `library_id` but no `library_name` in API response, check the backend route:

```python
# In backend/routes/publications.py
# Ensure the query joins publication_libraries table
```

### Issue: "All Libraries" dropdown shows but no specific libraries

**Cause:** Libraries table is empty or not being fetched.

**Solution:**
1. Create a library at `/researcher/publications/library`
2. Check browser console for "Libraries fetched" log
3. Verify API endpoint: `GET /api/publication-libraries`

## API Endpoints to Test

### Test Libraries Endpoint
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/publication-libraries
```

Expected response:
```json
[
  {
    "id": "uuid",
    "name": "My Library",
    "description": "...",
    "is_folder": false
  }
]
```

### Test Publications Endpoint
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/publications
```

Expected response:
```json
[
  {
    "id": "uuid",
    "title": "Publication Title",
    "authors": "Author Name",
    "journal": "Journal Name",
    "year": 2024,
    "library_id": "uuid",
    "library_name": "My Library"
  }
]
```

## Quick Fix Checklist

- [ ] Rebuild frontend: `docker-compose up -d --build frontend`
- [ ] Check browser console for logs
- [ ] Verify publications exist at `/researcher/publications/library`
- [ ] Verify libraries exist (not just folders)
- [ ] Check that publications are assigned to libraries
- [ ] Test API endpoints directly with curl
- [ ] Check database tables: `publications`, `publication_libraries`

## Next Steps

1. **Rebuild the frontend** to get the debug logs
2. **Open the citation sidebar** and check console
3. **Share the console output** if publications still don't show
4. **Check the publication library page** to ensure data exists

## Files Modified

- ✅ `frontend/components/ResearcherSidebar.js` - Removed Data Sources, Collaboration
- ✅ `frontend/components/CitationSidebar.js` - Added debug logging

## Expected Behavior After Fix

1. **Researcher Sidebar:**
   - Data Collection section shows only: Data Import, Data Lakes
   - No Collaboration section
   - No My Teams or Invitations

2. **Citation Sidebar:**
   - Shows library filter dropdown with actual libraries
   - Publications grouped by library name
   - Each group shows library name and count
   - Can filter by specific library

## If Still Not Working

Share these details:
1. Browser console output (all logs)
2. Response from `/api/publication-libraries`
3. Response from `/api/publications`
4. Screenshot of `/researcher/publications/library` page
5. Database query results for publications and libraries
