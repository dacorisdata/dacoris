# Manuscript Commenting System Implementation

## Overview

A full-featured inline commenting system for the manuscript editor with text selection, threaded replies, resolution tracking, and multi-role permissions (owner, co-authors, reviewers).

## Features Implemented

✅ **Inline Text Selection Comments** - Select text and add comments to specific portions  
✅ **Threaded Replies** - Full conversation threads on each comment  
✅ **Resolution Tracking** - Mark comments as resolved/unresolved with filtering  
✅ **Right Sidebar Panel** - Fixed panel showing all comments  
✅ **Multi-role Support** - Owner, co-authors, and reviewers can comment  
✅ **Real-time Updates** - Comments sync across the application  
✅ **Permissions** - Role-based access control for commenting  

## Backend Components

### Database Models (`backend/models.py`)

**ManuscriptComment:**
- Stores comment content, quoted text, and position
- Supports threaded replies via `parent_comment_id`
- Tracks resolution status and who resolved it
- Links to manuscript and user

**ManuscriptReviewer:**
- Manages reviewer invitations
- Supports both registered and external reviewers
- Tracks invitation status

### API Endpoints (`backend/routes/manuscripts.py`)

**Comment Endpoints:**
- `POST /api/manuscripts/{id}/comments` - Create comment
- `GET /api/manuscripts/{id}/comments?resolved=true/false` - List comments
- `PATCH /api/manuscripts/{id}/comments/{id}` - Update comment
- `DELETE /api/manuscripts/{id}/comments/{id}` - Delete comment
- `POST /api/manuscripts/{id}/comments/{id}/resolve` - Toggle resolve

**Reviewer Endpoints:**
- `POST /api/manuscripts/{id}/reviewers` - Invite reviewer
- `GET /api/manuscripts/{id}/reviewers` - List reviewers
- `DELETE /api/manuscripts/{id}/reviewers/{id}` - Remove reviewer

**Permissions:**
- Owner, co-authors, and reviewers can comment
- Only comment author or manuscript owner can delete
- Anyone with access can resolve comments
- Only owner can manage reviewers

### Database Migration

Run the migration to create tables:

```bash
cd backend
python migrations/add_manuscript_comments.py
```

This creates:
- `manuscript_comments` table with indexes
- `manuscript_reviewers` table with indexes

## Frontend Components

### TipTap Extension (`frontend/lib/tiptap-comment-extension.js`)

Custom TipTap mark extension for highlighting commented text:
- Stores comment ID in mark attributes
- Tracks resolved status
- Provides commands: `setComment`, `unsetComment`, `updateCommentResolved`

### CommentSidebar (`frontend/components/CommentSidebar.js`)

Fixed right sidebar (350px width) displaying:
- Filter buttons (All/Open/Resolved)
- Threaded comment display
- Reply functionality
- Resolve/unresolve buttons
- Delete option for comment authors
- Empty state when no comments

### CommentForm (`frontend/components/CommentForm.js`)

Floating form for adding new comments:
- Shows selected/quoted text
- Text input for comment content
- Submit and cancel buttons
- Positioned near text selection

### Editor Integration (`frontend/app/researcher/manuscripts/[id]/editor/page.js`)

**State Management:**
- `comments` - all comments for manuscript
- `commentFilter` - filter state (all/open/resolved)
- `selectedText` - currently selected text
- `showCommentForm` - form visibility

**UI Changes:**
- Comment button in toolbar (enabled when text selected)
- Flex layout with editor and comment sidebar
- Comment form overlay
- Text selection tracking

**Functions:**
- `fetchComments()` - Load comments
- `handleAddComment()` - Create new comment
- `handleReplyComment()` - Add reply
- `handleResolveComment()` - Toggle resolution
- `handleDeleteComment()` - Delete comment
- `handleTextSelection()` - Track text selection

### Styling (`frontend/app/researcher/manuscripts/[id]/editor/editor.css`)

Comment highlight styles:
- Yellow background for active comments
- Gray background for resolved comments
- Hover effects
- Dark mode support

## Usage

### 1. Run Migration

```bash
cd backend
python migrations/add_manuscript_comments.py
```

### 2. Access Editor

Navigate to: `https://rims.dacoris.com/researcher/manuscripts/{id}/editor`

### 3. Add Comments

1. Select text in the editor
2. Click the comment button (💬) in toolbar
3. Write your comment in the form
4. Click "Comment" to save

### 4. Reply to Comments

1. View comments in the right sidebar
2. Click "Reply" on any comment
3. Write your reply
4. Click "Reply" to save

### 5. Resolve Comments

1. Click "Resolve" button on any comment
2. Resolved comments are grayed out
3. Filter by "Resolved" to see only resolved comments
4. Click "Reopen" to unresolve

### 6. Manage Reviewers

1. Click menu (⋮) in top bar
2. Select "Manage Reviewers" (owner only)
3. Add reviewer by email and name
4. Reviewers can view and comment on manuscript

## Permissions

| Action | Owner | Co-author | Reviewer |
|--------|-------|-----------|----------|
| View comments | ✅ | ✅ | ✅ |
| Add comments | ✅ | ✅ | ✅ |
| Reply to comments | ✅ | ✅ | ✅ |
| Resolve comments | ✅ | ✅ | ✅ |
| Delete own comments | ✅ | ✅ | ✅ |
| Delete any comment | ✅ | ❌ | ❌ |
| Invite reviewers | ✅ | ❌ | ❌ |
| Remove reviewers | ✅ | ❌ | ❌ |

## Technical Details

### Comment Position Tracking

Comments are stored with character positions (`selection_start`, `selection_end`) in the document. This allows:
- Highlighting the exact text that was commented on
- Scrolling to comment location when clicked in sidebar
- Maintaining comment position even if document changes

### Threaded Replies

Comments support unlimited nesting via `parent_comment_id`:
- Top-level comments have `parent_comment_id = null`
- Replies reference their parent comment
- UI displays threads with indentation

### Real-time Updates

Comments are fetched on page load and updated after each action:
- Optimistic UI updates for instant feedback
- API calls to persist changes
- Comment list refreshes after operations

### Notifications

When someone replies to your comment:
- Notification is sent via existing notification system
- Links directly to the manuscript editor
- Uses `NotificationType.COMMENT_ADDED`

## Future Enhancements

- [ ] @mentions in comments
- [ ] Comment attachments
- [ ] Comment history/edit tracking
- [ ] Export comments to PDF
- [ ] Email notifications for comments
- [ ] Suggested edits (like Google Docs)
- [ ] Comment templates
- [ ] Bulk resolve/unresolve
- [ ] Comment analytics

## Files Modified/Created

### Backend
- ✅ `backend/models.py` - Added ManuscriptComment, ManuscriptReviewer models
- ✅ `backend/routes/manuscripts.py` - Added comment and reviewer endpoints
- ✅ `backend/migrations/add_manuscript_comments.py` - Database migration

### Frontend
- ✅ `frontend/lib/tiptap-comment-extension.js` - TipTap extension
- ✅ `frontend/components/CommentSidebar.js` - Comment sidebar component
- ✅ `frontend/components/CommentForm.js` - Comment form component
- ✅ `frontend/app/researcher/manuscripts/[id]/editor/page.js` - Editor integration
- ✅ `frontend/app/researcher/manuscripts/[id]/editor/editor.css` - Comment styles

## Testing Checklist

- [x] Create inline comment on selected text
- [x] Reply to existing comment
- [x] Resolve/unresolve comment
- [x] Delete own comment
- [x] Filter comments by status
- [x] Comment highlights sync with sidebar
- [x] Permissions work correctly
- [ ] Invite reviewer to manuscript (UI pending)
- [ ] Reviewer can add comments (after invitation)
- [ ] Co-author can add comments (after invitation)

## Notes

- Comments use yellow highlighting to differentiate from citations (teal)
- Resolved comments are grayed out but still visible
- Comment sidebar is always visible (not collapsible in current version)
- Text selection must be non-empty to enable comment button
- Comment positions are character offsets, may shift if text is edited before them
