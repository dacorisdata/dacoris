# Citation Insertion Fix

## Problem
Citations were being created in the database but not appearing in the editor.

## Root Cause
The custom TipTap `insertCitation` command wasn't properly inserting the citation node into the editor content.

## Solution Applied

### 1. Simplified Citation Insertion
Changed from using a custom TipTap command to directly inserting HTML content:

**Before:**
```javascript
editor.chain().focus().insertCitation({
  citationId: citation.id,
  citationKey: citation.citation_key,
  publicationId: citation.publication_id,
  inlineText: inlineText,
}).run();
```

**After:**
```javascript
editor.chain().focus().insertContent(
  `<span class="citation-node" 
         data-citation-id="${citation.id}" 
         data-citation-key="${citation.citation_key}" 
         data-publication-id="${citation.publication_id}">
    ${inlineText}
  </span> `
).run();
```

### 2. Better Error Handling
If a citation already exists in the database but not in the editor (e.g., after page refresh), the system now:
1. Fetches the existing citation from the API
2. Inserts it into the editor
3. Updates the citations state

### 3. Added Debug Logging
Added console logs to track citation insertion:
- `📝 Inserting citation:` - When starting insertion
- `✅ Citation inserted successfully` - When complete
- `⚠️ Publication already cited:` - When trying to cite again
- `📌 Inserting existing citation:` - When recovering from DB

## Testing

### Step 1: Rebuild Frontend
```bash
docker-compose up -d --build frontend
```

### Step 2: Test Citation Insertion

1. Open the manuscript editor
2. Open citation sidebar
3. Click + on a publication
4. **Expected**: Citation appears immediately in the editor as `(Author, Year)`
5. Check browser console for `✅ Citation inserted successfully`

### Step 3: Test Duplicate Prevention

1. Try to insert the same publication again
2. **Expected**: Alert saying "This publication is already cited in your document"
3. Citation should be visible in the editor

### Step 4: Test Recovery from Database

If you previously inserted a citation that's in the database but not showing:
1. Click + on that publication again
2. **Expected**: System fetches it from database and inserts it into editor
3. Check console for `📌 Inserting existing citation:`

## What to Check

### In Browser Console:
```
➕ Adding citation for: [Publication Title]
✅ Citation created: {id: "...", citation_key: "Smith2023", ...}
📝 Inserting citation: {id: "...", ...}
✅ Citation inserted successfully
```

### In Editor:
- Citation should appear as styled text: `(Smith, 2023)`
- Should have teal background color
- Should be clickable
- Should have hover effect

### In Database:
- Citation record exists in `manuscript_citations` table
- Has correct `manuscript_id`, `publication_id`, `citation_key`

## Troubleshooting

### Citation still not appearing:

1. **Check editor is initialized**:
   ```javascript
   console.log('Editor:', editor);
   ```
   Should not be null

2. **Check insertContent works**:
   Open console and try:
   ```javascript
   editor.chain().focus().insertContent('TEST').run();
   ```
   Should insert "TEST" at cursor

3. **Check CSS is loaded**:
   Look for `.citation-node` styles in DevTools

### "Already cited" but not visible:

1. Refresh the page
2. Open citation sidebar
3. Try inserting again
4. System should fetch from database and insert

### Citation appears but no styling:

Check that `editor.css` has:
```css
.citation-node {
  background-color: #1ca7a115;
  color: #1ca7a1;
  padding: 0.1em 0.3em;
  border-radius: 3px;
  font-weight: 600;
}
```

## Files Modified

1. ✅ `frontend/app/researcher/manuscripts/[id]/editor/page.js`
   - Changed `handleInsertCitation` to use `insertContent` with HTML
   - Added debug logging
   - Improved state management

2. ✅ `frontend/components/CitationSidebar.js`
   - Better duplicate detection
   - Recovery mechanism for existing citations
   - Enhanced error messages
   - More detailed logging

## Next Steps

After frontend rebuild completes:
1. Test citation insertion
2. Verify citations appear in editor
3. Test saving manuscript
4. Test reopening manuscript (citations should persist)
5. Test bibliography generation

---

**The citation insertion should now work correctly!** 🎉
