# Manuscript Commenting System Implementation

Build a full-featured inline commenting system for the manuscript editor with text selection, threaded replies, resolution tracking, and reviewer permissions.

## Overview

This plan implements a Google Docs-style commenting system where users can:
- Select text in the editor and add inline comments
- Reply to comments in threaded conversations
- Mark comments as resolved/unresolved
- Filter comments by status (all/open/resolved)
- View comments in a right sidebar panel
- Support owner, co-authors, and reviewers with appropriate permissions

## Backend Implementation

### 1. Database Models (`backend/models.py`)

Add new models after the `ManuscriptCitation` model:

**ManuscriptComment Model:**
- `id` (String, PK)
- `manuscript_id` (FK to manuscripts)
- `user_id` (FK to users)
- `parent_comment_id` (FK to self, nullable - for threaded replies)
- `content` (Text - comment text)
- `quoted_text` (Text - the selected text being commented on)
- `selection_start` (Integer - character position in document)
- `selection_end` (Integer - character position in document)
- `is_resolved` (Boolean, default False)
- `resolved_by_id` (FK to users, nullable)
- `resolved_at` (DateTime, nullable)
- `created_at` (DateTime)
- `updated_at` (DateTime)
- Relationships: user, manuscript, parent_comment, replies, resolved_by

**ManuscriptReviewer Model:**
- `id` (String, PK)
- `manuscript_id` (FK to manuscripts)
- `user_id` (FK to users, nullable - for external reviewers)
- `email` (String - for non-registered reviewers)
- `name` (String)
- `status` (String - invited/accepted/declined)
- `invited_at` (DateTime)
- `responded_at` (DateTime, nullable)
- Relationships: user, manuscript

Update `Manuscript` model to add relationships:
- `comments` relationship
- `reviewers` relationship

### 2. Pydantic Schemas (`backend/routes/manuscripts.py`)

**CommentCreate:**
- content, quoted_text, selection_start, selection_end, parent_comment_id (optional)

**CommentUpdate:**
- content (optional), is_resolved (optional)

**CommentResponse:**
- All fields + user info (name, avatar), replies count, created_at formatted

**ReviewerCreate:**
- user_id (optional), email, name

**ReviewerResponse:**
- All fields + user info if linked

### 3. API Endpoints (`backend/routes/manuscripts.py`)

**Comment Endpoints:**
- `POST /api/manuscripts/{manuscript_id}/comments` - Create comment
- `GET /api/manuscripts/{manuscript_id}/comments` - List all comments (with query params: resolved=true/false)
- `PATCH /api/manuscripts/{manuscript_id}/comments/{comment_id}` - Update comment
- `DELETE /api/manuscripts/{manuscript_id}/comments/{comment_id}` - Delete comment
- `POST /api/manuscripts/{manuscript_id}/comments/{comment_id}/resolve` - Toggle resolve status
- `POST /api/manuscripts/{manuscript_id}/comments/{comment_id}/replies` - Add reply to comment

**Reviewer Endpoints:**
- `POST /api/manuscripts/{manuscript_id}/reviewers` - Invite reviewer
- `GET /api/manuscripts/{manuscript_id}/reviewers` - List reviewers
- `DELETE /api/manuscripts/{manuscript_id}/reviewers/{reviewer_id}` - Remove reviewer

**Permission Logic:**
- Check if user is owner, co-author, or reviewer before allowing comment operations
- Only owner can invite/remove reviewers
- Only comment author or manuscript owner can delete comments
- Anyone with access can resolve comments

### 4. Database Migration

Create migration script: `backend/migrations/add_manuscript_comments.py`
- Create manuscript_comments table
- Create manuscript_reviewers table
- Add indexes on manuscript_id, user_id, parent_comment_id, is_resolved

## Frontend Implementation

### 1. TipTap Extension for Comments (`frontend/lib/tiptap-comment-extension.js`)

Create custom TipTap extension:
- Mark extension for highlighting commented text
- Store comment IDs in mark attributes
- Custom styling for commented text (subtle background color)
- Click handler to open comment in sidebar

### 2. Comment Components

**CommentSidebar Component (`frontend/components/CommentSidebar.js`):**
- Fixed right sidebar (300-350px width)
- Header with filter buttons (All/Open/Resolved)
- List of comments sorted by position in document
- Empty state when no comments
- Scroll to sync with editor position

**CommentThread Component (`frontend/components/CommentThread.js`):**
- Display main comment with quoted text
- Show all replies in thread
- Reply input field
- Resolve/Unresolve button
- Delete button (for author/owner)
- User avatars and timestamps
- Highlight quoted text on hover

**CommentForm Component (`frontend/components/CommentForm.js`):**
- Text input for comment content
- Display selected/quoted text
- Submit and Cancel buttons
- Character counter (optional)

### 3. Editor Page Updates (`frontend/app/researcher/manuscripts/[id]/editor/page.js`)

**State Management:**
- `comments` - array of all comments
- `activeCommentId` - currently selected comment
- `commentFilter` - 'all' | 'open' | 'resolved'
- `selectedText` - currently selected text for new comment
- `showCommentForm` - boolean to show/hide comment form

**UI Changes:**
- Add Comment button in toolbar (only shows when text is selected)
- Integrate CommentSidebar on the right side
- Adjust editor width to accommodate sidebar
- Add TipTap comment extension to editor config

**Functions:**
- `fetchComments()` - Load all comments for manuscript
- `handleAddComment(content, quotedText, selection)` - Create new comment
- `handleReplyToComment(commentId, content)` - Add reply
- `handleResolveComment(commentId)` - Toggle resolve status
- `handleDeleteComment(commentId)` - Delete comment
- `handleCommentClick(commentId)` - Scroll to and highlight comment in editor
- `handleTextSelection()` - Detect text selection and show comment button

**Layout:**
- Main container: flex row
- Editor section: flex 1
- Comment sidebar: fixed 350px width
- Responsive: hide sidebar on mobile, show as modal

### 4. Reviewer Management

**ReviewerDialog Component (`frontend/components/ReviewerDialog.js`):**
- Modal to invite reviewers
- Email input with validation
- Name input
- List of current reviewers with remove option
- Only visible to manuscript owner

**Integration:**
- Add "Manage Reviewers" option in editor menu
- Show reviewer avatars in top bar with co-authors
- Different color/badge for reviewers vs co-authors

## Styling & UX

**Visual Design:**
- Commented text: subtle yellow/blue background highlight
- Active comment: brighter highlight
- Resolved comments: gray/muted appearance
- Comment sidebar: clean, minimal design matching app theme
- Smooth transitions and hover effects

**User Experience:**
- Real-time comment updates (polling every 10s or WebSocket)
- Optimistic UI updates for instant feedback
- Keyboard shortcuts: Ctrl+Alt+M to add comment
- Notification when someone replies to your comment
- Auto-scroll to comment when clicked in sidebar

## Testing Checklist

- [ ] Create inline comment on selected text
- [ ] Reply to existing comment
- [ ] Resolve/unresolve comment
- [ ] Delete own comment
- [ ] Filter comments by status
- [ ] Invite reviewer to manuscript
- [ ] Reviewer can add comments
- [ ] Co-author can add comments
- [ ] Permissions: non-collaborators cannot comment
- [ ] Comment highlights sync with sidebar
- [ ] Responsive design on mobile

## Implementation Order

1. Backend models and migration
2. Backend API endpoints with permissions
3. TipTap comment extension
4. Comment sidebar and thread components
5. Editor integration and state management
6. Reviewer management feature
7. Styling and polish
8. Testing and bug fixes

## Notes

- Use existing `ACCENT` color (#1ca7a1) for comment highlights
- Integrate with existing notification system for comment replies
- Consider adding @mentions in comments (future enhancement)
- Store comment positions as character offsets for stability
- Handle edge cases: deleted text with comments, overlapping comments
