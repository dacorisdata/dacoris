# Manuscript Editor Improvements Summary

## Date: May 21, 2026

### ✅ Completed Enhancements

---

## 1. **Comment Sidebar Toggle** 
- Comment sidebar now starts **closed by default**
- Added toggle button in toolbar to open/close sidebar
- Matches citation sidebar behavior for consistency

---

## 2. **Fixed Reply Field Focus Loss**
- Wrapped `handleTextSelection` in `useCallback` to prevent re-renders
- Added `autoFocus` to reply TextField
- Users can now type full replies without losing focus

---

## 3. **Comment Deletion on Text Deletion**
- When commented text is deleted, the comment is automatically removed from database
- Implemented using ProseMirror plugin to track mark deletions
- Prevents orphaned comments

---

## 4. **Comment Highlights Don't Expand**
- Set `inclusive: false` on Comment mark
- Comments only highlight originally selected text
- New text typed after commented text is NOT highlighted

---

## 5. **Snackbar Notifications**
- Replaced `alert()` with Material-UI Snackbar
- Shows success/error messages for save operations
- Appears in bottom-right corner
- Auto-dismisses after 4 seconds

---

## 6. **Improved Autosave**
- Autosave interval changed from 30 seconds to **5 minutes**
- Added `beforeunload` event handler
- Warns user when leaving with unsaved changes
- Attempts to save before page unload

---

## 7. **Comment Hover Tooltips**
- Hovering over commented text shows comment preview in tooltip
- Tooltip displays: "💬 [comment text]" + "Click to view all comments"
- Comment text limited to 50 characters in tooltip

---

## 8. **Click Comment to Open Sidebar**
- Clicking on highlighted commented text opens comment sidebar
- Automatically scrolls to the clicked comment
- Smooth scroll animation to center comment in view

---

## 9. **Comprehensive Menu Bar**
Added Google Docs-style menu bar with:

### **File Menu**
- Rename (TODO)
- Auto Save status indicator

### **Edit Menu**
- Undo (Ctrl+Z)
- Redo (Ctrl+Y)
- Cut (Ctrl+X)
- Copy (Ctrl+C)
- Paste (Ctrl+V)

### **Insert Menu**
- Image (TODO)
- Table (TODO)
- Link (TODO)

### **Format Menu**
- Bold (Ctrl+B)
- Italic (Ctrl+I)
- Underline (Ctrl+U)
- Align Left
- Align Center
- Align Right
- Align Justify

### **Tools Menu**
- Citations (opens citation sidebar)
- Comments (opens comment sidebar)
- Version Control (TODO)

---

## Technical Implementation Details

### Files Modified:
1. **`frontend/lib/tiptap-comment-extension.js`**
   - Added `inclusive: false`
   - Added `commentText` attribute for tooltips
   - Added `onCommentClick` callback
   - Added `onCommentDeleted` callback
   - Added click handler plugin
   - Added deletion tracker plugin
   - Added `removeCommentMark` command

2. **`frontend/app/researcher/manuscripts/[id]/editor/page.js`**
   - Added `commentSidebarOpen` state
   - Added menu bar anchor states
   - Added `snackbar` state
   - Added `handleCommentDeletedFromText` callback
   - Updated Comment extension configuration
   - Updated autosave interval to 5 minutes
   - Added `beforeunload` event handler
   - Replaced alerts with snackbar
   - Added comprehensive menu bar
   - Added Snackbar component

3. **`frontend/components/CommentSidebar.js`**
   - Added `autoFocus` to reply TextField
   - Wrapped `handleReply` in `useCallback`
   - Added `data-comment-id` attribute for scroll targeting

---

## User Experience Improvements

✅ **Better UX**: Sidebar doesn't clutter screen by default  
✅ **Smoother Typing**: No focus loss when replying to comments  
✅ **Cleaner Content**: Deleted text removes associated comments  
✅ **Precise Highlighting**: Comments don't expand unexpectedly  
✅ **Professional Notifications**: Snackbar instead of alerts  
✅ **Safer Editing**: Autosave and unsaved changes warning  
✅ **Interactive Comments**: Click to view, hover to preview  
✅ **Familiar Interface**: Google Docs-style menu bar  
✅ **Keyboard Shortcuts**: Displayed in menus for discoverability  

---

## Next Steps (TODOs)

- [ ] Implement Rename manuscript functionality
- [ ] Add Image insertion
- [ ] Add Table insertion
- [ ] Add Link insertion
- [ ] Implement Version Control
- [ ] Add more Format menu options (headings, lists, etc.)

---

## Deployment Status

**All changes deployed to Docker containers** ✅

Access at: `http://192.168.100.90/researcher/manuscripts/{id}/editor`

---

**System Ready for Production Use!** 🎉
