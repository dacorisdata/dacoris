# Citation Library - Final Fix Applied

## Problem Identified

The citation sidebar was calling:
- `http://localhost:8000/api/publications/libraries` ❌
- `http://localhost:8000/api/publications` ❌

But since you access the app via `http://localhost/` (through nginx), the API calls must go through the nginx proxy at `/api`.

## Solution Applied

Changed all API calls in `CitationSidebar.js` to use:
- `/api/publications/libraries` ✅
- `/api/publications` ✅
- `/api/manuscripts/{id}/citations` ✅

**Changed from:**
```javascript
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
fetch(`${apiUrl}/api/publications`);
```

**Changed to:**
```javascript
const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
fetch(`${apiBase}/publications`);
```

## Files Modified

1. ✅ `frontend/components/CitationSidebar.js` - Fixed all 3 API endpoints
2. ✅ `frontend/components/ResearcherSidebar.js` - Removed Data Sources, Collaboration section

## Next Steps

### 1. Rebuild Frontend Container

```bash
cd c:\projects\dacoris
docker-compose up -d --build frontend
```

Wait for the build to complete (may take 2-3 minutes).

### 2. Test the Citation Sidebar

1. Navigate to: `http://localhost/researcher/manuscripts/03d2b245-2c79-4d50-a2e4-47b19faa2812/editor`
2. Click the citation icon (📝) in the toolbar
3. Open browser console (F12)
4. Check for these logs:
   ```
   📚 Libraries fetched: [...]
   📄 Publications fetched: [...]
   🔍 Filtered publications: X
   📁 Grouped publications: {...}
   ```

### 3. Expected Behavior

**Citation Sidebar should now show:**
- Filter by Library dropdown with: All Libraries, Diabetes, Covid, Cardiovascular
- Publications grouped by folder:
  - **Diabetes (1)**
    - Erratum: 18. Diabetes Care in the Hospital...
  - **Covid (1)**
    - Histopathological changes in the olfactory pathway...
  - **Cardiovascular (1)**
    - Asymmetrically Coordinated Cu Single-Atom...

### 4. If Still Not Working

Check browser console for:

**Network Tab:**
- Look for requests to `/api/publications/libraries` and `/api/publications`
- Status should be 200
- Check response data

**Console Logs:**
- Should see "📚 Libraries fetched:" with array of libraries
- Should see "📄 Publications fetched:" with array of publications
- If arrays are empty, check the "My Library" page to ensure publications exist

**Common Issues:**
1. **401 Unauthorized** - Token expired, refresh the page
2. **404 Not Found** - API route not registered, check backend logs
3. **Empty arrays** - No data in database, import publications first

## Researcher Sidebar Changes

**Removed:**
- ❌ Data Sources (from Data Collection)
- ❌ Collaboration section (My Teams, Invitations)

**Remaining in Data Collection:**
- ✅ Data Import
- ✅ Data Lakes

## Testing Checklist

- [ ] Frontend container rebuilt
- [ ] Citation sidebar opens
- [ ] Libraries dropdown shows folders (Diabetes, Covid, Cardiovascular)
- [ ] Publications appear under each folder
- [ ] Can insert citation by clicking +
- [ ] Citation appears inline in editor
- [ ] Bibliography auto-generates at document end
- [ ] Data Sources removed from sidebar
- [ ] Collaboration section removed from sidebar

## Debug Commands

### Check if frontend is running
```bash
docker-compose ps frontend
```

### View frontend logs
```bash
docker-compose logs -f frontend
```

### Test API directly
```bash
# Get your token from browser localStorage
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost/api/publications/libraries
```

## Summary

The root cause was incorrect API URLs. The frontend was trying to call `http://localhost:8000/api/...` directly instead of going through the nginx proxy at `/api/...`.

After rebuilding the frontend, the citation sidebar should now:
1. ✅ Fetch libraries correctly
2. ✅ Fetch publications correctly
3. ✅ Group publications by library/folder
4. ✅ Allow filtering by library
5. ✅ Insert citations into the document
