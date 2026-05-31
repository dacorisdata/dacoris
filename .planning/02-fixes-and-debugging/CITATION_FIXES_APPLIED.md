# Citation Library - Fixes Applied

## Issues Fixed

### 1. ✅ Publications Now Grouped by Library/Folder

**Changes Made:**
- Added library filter dropdown to sidebar
- Publications now grouped by library name with headers
- Each group shows library name and count
- Sticky headers for easy navigation

**Files Modified:**
- `frontend/components/CitationSidebar.js`

### 2. ✅ Better Error Handling for Citation Insertion

**Changes Made:**
- Fixed API URL to use full path (`http://localhost:8000/api`)
- Added specific error messages for different failure cases
- Better handling of "Citation already exists" error
- Network error detection and user-friendly messages

**What to Check:**
- Open browser console (F12) to see detailed error messages
- Check if the API is accessible at `http://localhost:8000/api/manuscripts/{id}/citations`

### 3. ⚠️ Cite-as-you-write (@/cite:) - Requires Additional Setup

**Status:** Partially implemented, needs TipTap Suggestion package

**What's Needed:**
The @ trigger requires the `@tiptap/suggestion` package which may not be installed.

**To Enable:**
```bash
cd frontend
npm install @tiptap/suggestion
```

Then rebuild the frontend:
```bash
docker-compose up -d --build frontend
```

**Alternative:** For now, users can click the citation icon in toolbar to open the sidebar and insert citations manually.

## How to Deploy Fixes

### Option 1: Rebuild Frontend Container (Recommended)

```bash
cd c:\projects\dacoris
docker-compose up -d --build frontend
```

This will pick up all the new changes to the citation sidebar.

### Option 2: Hot Reload (If Next.js dev mode is running)

If you're running in development mode, the changes should auto-reload.

## Testing the Fixes

1. **Test Library Grouping:**
   - Open citation sidebar
   - Check "Filter by Library" dropdown
   - Verify publications are grouped by library name

2. **Test Citation Insertion:**
   - Click + button next to a publication
   - Check browser console for any errors
   - If it fails, note the exact error message

3. **Test Error Messages:**
   - Try inserting the same citation twice
   - Should see "This publication is already cited in your document"

## Common Issues & Solutions

### Issue: "Failed to add citation"

**Possible Causes:**
1. Backend API not accessible
2. Database connection issue
3. Publication doesn't belong to user's library

**Debug Steps:**
```bash
# Check backend logs
docker-compose logs backend

# Check if API endpoint exists
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/manuscripts/MANUSCRIPT_ID/citations
```

### Issue: Publications not showing

**Possible Causes:**
1. No publications in user's library
2. API endpoint returning empty array
3. Frontend not fetching correctly

**Debug Steps:**
- Check `/researcher/publications/library` page
- Open browser console and check Network tab
- Verify API call to `/api/publications` succeeds

### Issue: Library filter not working

**Possible Causes:**
1. Libraries not fetched from API
2. Publications missing `library_id` field

**Debug Steps:**
- Check browser console for API errors
- Verify `/api/publication-libraries` endpoint works

## Next Steps

1. **Deploy the fixes:**
   ```bash
   docker-compose up -d --build frontend
   ```

2. **Test in browser:**
   - Navigate to manuscript editor
   - Open citation sidebar
   - Try inserting citations

3. **Monitor logs:**
   ```bash
   docker-compose logs -f backend
   docker-compose logs -f frontend
   ```

4. **Report any new errors** with:
   - Browser console output
   - Backend logs
   - Exact steps to reproduce

## Files Modified

- ✅ `frontend/components/CitationSidebar.js` - Library grouping, error handling
- ✅ `frontend/lib/tiptap-citation-extension.js` - Suggestion plugin (needs package)
- ✅ `backend/migrations/add_manuscript_citations.py` - Migration (already run)

## Known Limitations

1. **@ trigger not working yet** - Requires `@tiptap/suggestion` package
2. **cite: trigger not implemented** - Can be added after @ trigger works
3. **No autocomplete dropdown** - Would need custom suggestion renderer

## Workaround for Now

Until the @ trigger is fully working:
1. Click the citation icon (📝) in the toolbar
2. Use the sidebar to search and insert citations
3. Citations will appear inline in the document
4. Bibliography auto-generates at the end
