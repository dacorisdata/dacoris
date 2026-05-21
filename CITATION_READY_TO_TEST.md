# ✅ Citation Library - Ready to Test!

## Build Complete

The frontend container has been successfully rebuilt with all the fixes applied.

## What Was Fixed

### 1. API Endpoint URLs ✅
Changed from `http://localhost:8000/api/...` to `/api/...` to work with nginx proxy.

### 2. Researcher Sidebar ✅
- Removed "Data Sources" from Data Collection
- Removed entire "Collaboration" section (My Teams, Invitations)

### 3. Citation Sidebar ✅
- Fixed library fetching endpoint
- Fixed publications fetching endpoint
- Fixed citation insertion endpoint
- Added library grouping by folder
- Added library filter dropdown

## Test Now

### Step 1: Open the Editor
Navigate to:
```
http://localhost/researcher/manuscripts/03d2b245-2c79-4d50-a2e4-47b19faa2812/editor
```

### Step 2: Open Citation Sidebar
Click the citation icon (📝 quote icon) in the toolbar.

### Step 3: Check Browser Console
Press F12 to open DevTools and check the Console tab. You should see:

```
📚 Libraries fetched: [array of libraries]
📄 Publications fetched: [array of publications]
🔍 Filtered publications: 3
📁 Grouped publications: {Diabetes: [...], Covid: [...], Cardiovascular: [...]}
```

### Step 4: Verify Display

**Expected in Citation Sidebar:**

**Filter by Library dropdown:**
- All Libraries
- Diabetes
- Covid
- Cardiovascular

**Publications grouped by folder:**

**Diabetes (1)**
- Erratum: 18. Diabetes Care in the Hospital: Standards of Care in Diabetes-2024
  - Authors: American Diabetes Association
  - Journal: Clinical diabetes : a publication of the American Diabetes Association
  - Year: 2024

**Covid (1)**
- Histopathological changes in the olfactory pathway in COVID-19: An autopsy-based case-control study
  - Authors: Magri M, Reggio S, Saba G, et al.
  - Journal: BMJ journal of medical science
  - Year: 2026

**Cardiovascular (1)**
- Asymmetrically Coordinated Cu Single-Atom Nanozymes to Accelerate Inflammation and Immune Homeostasis Modulation in Acute Myocardial Infarction
  - Authors: Lin Y, Chen H, Zhang X, et al.
  - Journal: ACS nano
  - Year: 2026

### Step 5: Test Citation Insertion

1. Click the **+** button next to any publication
2. The citation should appear inline in the editor (e.g., `(American Diabetes Association, 2024)`)
3. A bibliography section should auto-generate at the end of the document

### Step 6: Test Citation Styles

1. Change the citation style dropdown (APA, MLA, Chicago, Harvard)
2. Insert a new citation
3. The format should change accordingly:
   - **APA**: (Author, Year)
   - **MLA**: (Author)
   - **Chicago**: [1]
   - **Harvard**: (Author Year)

## Troubleshooting

### If libraries/publications still don't show:

1. **Check browser console** for error messages
2. **Check Network tab** in DevTools:
   - Look for `/api/publications/libraries` request
   - Look for `/api/publications` request
   - Both should return 200 status
   - Check the response data

3. **Verify data exists**:
   - Go to `http://localhost/researcher/publications/library`
   - Confirm you see your 3 publications in folders

4. **Check authentication**:
   - If you see 401 errors, refresh the page to get a new token

### If citation insertion fails:

1. Check browser console for detailed error message
2. Look for `/api/manuscripts/{id}/citations` request in Network tab
3. Check the response - it should show the error reason

## What to Report

If it still doesn't work, please share:

1. **Browser console output** (copy all logs)
2. **Network tab screenshot** showing the API requests
3. **Response data** from `/api/publications/libraries` and `/api/publications`

## Success Criteria

✅ Citation sidebar opens
✅ Shows "Filter by Library" dropdown with your folders
✅ Shows 3 publications grouped by folder
✅ Can click + to insert citation
✅ Citation appears inline in editor
✅ Bibliography auto-generates at document end
✅ Can switch citation styles
✅ Data Sources removed from sidebar
✅ Collaboration section removed from sidebar

## Next Steps After Testing

Once you confirm it works:
1. Test with more publications
2. Test citation deletion
3. Test bibliography updates when changing styles
4. Test saving manuscript with citations
5. Test reopening manuscript (citations should persist)

---

**The citation library is now ready to use!** 🎉
