# Paging System Testing Guide

This document outlines how to test the newly implemented visual paging system for the manuscript editor.

## Features Implemented

1. **Visual Page Breaks** - Pages are displayed with clear boundaries and shadows
2. **Page Numbers** - Each page shows its number at the bottom center
3. **Page Size Selection** - Toolbar dropdown to switch between A4, Letter, and Legal sizes
4. **Manual Page Breaks** - Insert explicit page breaks using toolbar button or Ctrl+Enter
5. **Page Count Display** - Top bar shows total page count
6. **Current Page Indicator** - Fixed indicator showing "Page X of Y" at bottom right
7. **Print Optimization** - Print styles ensure visual breaks match actual print output

## Testing Checklist

### Basic Functionality

- [ ] **Load Editor**: Navigate to any manuscript editor page
  - URL: `http://192.168.100.90/researcher/manuscripts/{manuscript-id}/editor`
  - Verify page containers are visible with shadows
  - Verify page numbers appear at bottom of each page

- [ ] **Page Size Selector**: 
  - Click the page size dropdown in the toolbar (shows A4/Letter/Legal)
  - Select different page sizes
  - Verify page dimensions change accordingly
  - Verify selection is saved (refresh page and check it persists)

- [ ] **Manual Page Break**:
  - Type some content
  - Click the page break button in toolbar OR press Ctrl+Enter
  - Verify a visual page break appears with "Page Break" label
  - Verify content after break moves to next page

### Content Types Testing

- [ ] **Text Content**:
  - Add multiple paragraphs
  - Verify pages break naturally when content exceeds page height
  - Verify page count updates automatically

- [ ] **Headings**:
  - Add H1, H2, H3 headings
  - Verify headings are styled correctly across page breaks
  - In print preview, verify headings don't break (page-break-after: avoid)

- [ ] **Lists**:
  - Add bullet lists and numbered lists
  - Verify lists flow across pages naturally
  - Verify list formatting is maintained

- [ ] **Block Elements**:
  - Add blockquotes
  - Add code blocks
  - Verify they render correctly on pages
  - In print preview, verify they avoid page breaks (page-break-inside: avoid)

- [ ] **Citations**:
  - Insert citations using the citation sidebar
  - Verify citations display correctly within paged layout
  - Verify citations near page breaks work properly

- [ ] **Comments**:
  - Add comments to text
  - Verify comment highlights work across page boundaries
  - Verify comment sidebar remains functional

### Page Navigation

- [ ] **Scroll Behavior**:
  - Scroll through multiple pages
  - Verify "Page X of Y" indicator updates correctly
  - Verify current page tracks with scroll position

- [ ] **Long Documents**:
  - Create or load a long manuscript (10+ pages)
  - Verify performance is smooth
  - Verify all pages render correctly
  - Verify page numbers are sequential

### Responsive Design

- [ ] **Desktop View** (>768px):
  - Verify full paged layout is visible
  - Verify page shadows and styling work
  - Verify page numbers are visible

- [ ] **Mobile View** (<768px):
  - Resize browser to mobile width
  - Verify layout switches to continuous (non-paged) mode
  - Verify page numbers are hidden
  - Verify editor remains usable

### Print Testing

- [ ] **Print Preview** (Ctrl+P / Cmd+P):
  - Open browser print preview
  - Verify page breaks match visual breaks
  - Verify manual page breaks are respected
  - Verify page shadows and UI elements are hidden
  - Verify margins are correct
  - Set print destination to "Save as PDF" and verify output

### Edge Cases

- [ ] **Empty Document**:
  - Open blank manuscript
  - Verify single page container appears
  - Verify page number "1" is shown

- [ ] **Very Short Content**:
  - Add just one line of text
  - Verify page doesn't break unnecessarily
  - Verify single page is shown

- [ ] **Manual Break at Top**:
  - Insert page break at very beginning
  - Verify it creates a blank first page

- [ ] **Multiple Consecutive Breaks**:
  - Insert multiple page breaks in a row
  - Verify each creates a new page

- [ ] **Delete Content with Page Break**:
  - Add content spanning 2 pages
  - Delete content to fit on 1 page
  - Verify page count updates automatically

### Integration with Existing Features

- [ ] **Auto-save**:
  - Make changes to paged document
  - Wait 5 minutes or press Ctrl+S
  - Verify save works correctly
  - Reload page and verify pagination is preserved

- [ ] **Collaboration**:
  - Verify online user avatars still display
  - Verify collaborative features work with paged layout

- [ ] **Citation Sidebar**:
  - Open citation sidebar
  - Verify it doesn't interfere with page layout
  - Add citations and verify they work

- [ ] **Comment Sidebar**:
  - Open comment sidebar
  - Verify it doesn't interfere with page layout
  - Add comments and verify they work

## Known Issues / Limitations

1. **Performance**: Very long documents (100+ pages) may have slight performance impact. Consider implementing virtualization if needed.

2. **Mobile**: On mobile devices, paging is disabled for better usability on small screens.

3. **Dynamic Content**: If content includes images or tables (not yet implemented), they may not break perfectly across pages.

## Success Criteria

All of the following should be true:

✅ Pages display with clear visual boundaries  
✅ Page numbers appear correctly on each page  
✅ Manual page breaks can be inserted via toolbar/keyboard  
✅ Print preview matches screen pagination  
✅ Performance remains smooth with 50+ page documents  
✅ Page size can be switched (A4 ↔ Letter ↔ Legal) dynamically  
✅ No linter errors in new code  
✅ Existing features (citations, comments, save) continue to work  

## Manual Testing Instructions

1. Start the development server:
   ```bash
   cd frontend
   npm run dev
   ```

2. Navigate to: `http://localhost:3000/login`

3. Log in with test credentials

4. Navigate to any manuscript editor

5. Follow the testing checklist above

6. Report any issues or bugs found

## Automated Testing (Future)

Consider adding:
- Unit tests for page-config.js utilities
- Component tests for PagedEditor
- Integration tests for editor with paging
- E2E tests for page break insertion and navigation
