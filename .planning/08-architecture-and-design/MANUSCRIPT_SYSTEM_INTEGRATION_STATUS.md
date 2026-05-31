# Manuscript System Integration Status & Roadmap
**Date:** May 21, 2026
**Integration of:** Version Control + Commenting + Collaboration

## Overview

This document consolidates three manuscript feature plans into a unified implementation roadmap:
1. **Version Control System** (manuscript-version-control-85ba02.md)
2. **Commenting System** (manuscript-commenting-system-85ba02.md)
3. **Collaborative Editor** (collaborative-manuscript-editor-3d691f.md)

---

## 📊 Implementation Status

### ✅ COMPLETED

#### Backend Infrastructure
- [x] **Database Models** (in `backend/models.py`)
  - [x] `Manuscript` model with version tracking fields (lines 1131-1164)
  - [x] `ManuscriptCoAuthor` model (lines 1171-1192)
  - [x] `ManuscriptCitation` model (lines 1195-1212)
  - [x] `ManuscriptComment` model (lines 1215-1243)
  - [x] `ManuscriptReviewer` model (lines 1246-1263)
  - [x] `ManuscriptVersion` model (lines 1266-1313)
  - [x] `ManuscriptVersionComment` model (lines 1316-1340)

#### Database Migrations
- [x] **Comments Migration** (`backend/migrations/add_manuscript_comments.py`)
  - [x] `manuscript_comments` table with indexes
  - [x] `manuscript_reviewers` table with indexes
  
- [x] **Versions Migration** (`backend/migrations/add_manuscript_versions.py`)
  - [x] `manuscript_versions` table with indexes
  - [x] `manuscript_version_comments` table
  - [x] Added `current_version_number` and `last_auto_save_at` to `manuscripts` table
  - [x] Auto-creation of initial versions for existing manuscripts

#### API Endpoints (in `backend/routes/manuscripts.py`)
- [x] **Manuscript CRUD**
  - [x] `POST /api/manuscripts` - Create manuscript with co-authors
  - [x] `GET /api/manuscripts` - List manuscripts
  - [x] `GET /api/manuscripts/{id}` - Get manuscript details
  - [x] `PATCH /api/manuscripts/{id}` - Update manuscript
  - [x] `DELETE /api/manuscripts/{id}` - Delete manuscript

- [x] **Co-Authors Management**
  - [x] `POST /api/manuscripts/{id}/co-authors` - Add co-author
  - [x] `PATCH /api/manuscripts/{id}/co-authors/{co_author_id}` - Update co-author role
  - [x] `DELETE /api/manuscripts/{id}/co-authors/{co_author_id}` - Remove co-author

- [x] **Citations Management**
  - [x] `POST /api/manuscripts/{id}/citations` - Add citation
  - [x] `GET /api/manuscripts/{id}/citations` - List citations
  - [x] `POST /api/manuscripts/{id}/citations/reorder` - Reorder citations
  - [x] `DELETE /api/manuscripts/{id}/citations/{citation_id}` - Remove citation

- [x] **Comments System** (Need to verify in routes)
  - [x] `POST /api/manuscripts/{id}/comments` - Create comment
  - [x] `GET /api/manuscripts/{id}/comments` - List comments
  - [x] `POST /api/manuscripts/{id}/comments/{comment_id}/resolve` - Toggle resolve
  - [x] `DELETE /api/manuscripts/{id}/comments/{comment_id}` - Delete comment

#### Frontend Components
- [x] **Editor Page** (`frontend/app/researcher/manuscripts/[id]/editor/page.js`)
  - [x] TipTap editor with extensions
  - [x] Citation sidebar integration
  - [x] Comment sidebar component
  - [x] Comment form with @mentions
  - [x] Toolbar with formatting options
  - [x] Auto-save functionality
  - [x] Text selection for comments

- [x] **Citation Components**
  - [x] `CitationSidebar.js` - Citation library sidebar
  - [x] `BibliographyManager.js` - Bibliography generation

- [x] **Comment Components**
  - [x] `CommentSidebar.js` - Comments panel with threading
  - [x] `CommentForm.js` - New comment creation
  - [x] Comment highlighting in editor via TipTap extension
  - [x] @mentions support for collaborators

- [x] **TipTap Extensions**
  - [x] `tiptap-citation-extension.js` - Citation marks
  - [x] `tiptap-comment-extension.js` - Comment marks with click handlers

### 🚧 IN PROGRESS / PARTIALLY IMPLEMENTED

#### Version Control (Backend)
- [ ] **Version API Endpoints** (NOT FOUND in routes)
  - [ ] `POST /api/manuscripts/{id}/versions` - Create manual version
  - [ ] `GET /api/manuscripts/{id}/versions` - List versions
  - [ ] `GET /api/manuscripts/{id}/versions/{version_id}` - Get version details
  - [ ] `DELETE /api/manuscripts/{id}/versions/{version_id}` - Delete version
  - [ ] `POST /api/manuscripts/{id}/versions/{version_id}/restore` - Restore version
  - [ ] `GET /api/manuscripts/{id}/versions/compare?v1={id}&v2={id}` - Compare versions
  - [ ] `GET /api/manuscripts/{id}/versions/timeline` - Timeline data

- [ ] **Version Services**
  - [ ] Diff calculation utility
  - [ ] Auto-save version creation logic
  - [ ] Milestone version creation on status change
  - [ ] Comment snapshot creation
  - [ ] Version comparison logic

#### Version Control (Frontend)
- [ ] **Version History Page** (`frontend/app/researcher/manuscripts/[id]/versions/page.js`)
  - [ ] NOT CREATED
  
- [ ] **Version Components** (NOT FOUND)
  - [ ] `VersionTimeline.js` - Timeline visualization
  - [ ] `VersionCard.js` - Version summary cards
  - [ ] `VersionComparison.js` - Side-by-side diff viewer
  - [ ] `SaveVersionDialog.js` - Manual version creation dialog
  - [ ] `RestoreVersionDialog.js` - Restore confirmation dialog

- [ ] **Editor Integration**
  - [ ] Version indicator in toolbar
  - [ ] Save version button
  - [ ] Version history link
  - [ ] Auto-save version creation (every 10 minutes)
  - [ ] Milestone version on status change

### 🎯 NOT IMPLEMENTED (REQUIRED)

#### Collaborative Editing (PRIORITY: CRITICAL)
- [ ] **Real-time Collaboration Infrastructure**
  - [ ] Y.js CRDT integration
  - [ ] WebSocket server (y-websocket or FastAPI)
  - [ ] Collaboration provider service
  - [ ] Awareness protocol for cursors
  - [ ] Offline support with IndexedDB

- [ ] **Database Models**
  - [ ] `ManuscriptSession` - Active editing sessions
  - [ ] `ManuscriptSuggestion` - Track changes
  - [ ] `ManuscriptPermission` - Fine-grained permissions

- [ ] **Collaborative Features**
  - [ ] Live cursors and presence
  - [ ] Real-time syncing
  - [ ] Suggestion mode (track changes)
  - [ ] Conflict resolution
  - [ ] Session management

---

## 🎯 Integrated Implementation Roadmap

### Phase 1: Real-time Collaboration Foundation (Priority: CRITICAL) ⏰ 1-2 weeks

**Goal:** Set up Y.js + WebSocket infrastructure for real-time collaborative editing

**Why First:** Real-time collaboration changes the entire editor architecture. Must be implemented before completing version control, as versions will need to snapshot Y.js document state, not just HTML.

#### Backend - WebSocket Server (Days 1-3)

**Decision: Use separate Node.js y-websocket server (Recommended)**

1. **Create Collaboration Server** (`collaboration-server/`)
   ```bash
   mkdir collaboration-server
   cd collaboration-server
   npm init -y
   npm install y-websocket yjs lib0 ws dotenv jsonwebtoken
   ```

2. **Server Implementation** (`collaboration-server/server.js`)
   ```javascript
   // Features needed:
   - WebSocket server with y-websocket
   - JWT authentication from FastAPI
   - PostgreSQL persistence provider
   - Room management (one room per manuscript)
   - Awareness protocol for cursors
   - Auto-save to PostgreSQL every 30 seconds
   ```

3. **Persistence Provider** (`collaboration-server/persistence.js`)
   ```javascript
   // Connect Y.js to PostgreSQL:
   - Load Y.js document state from manuscripts.content
   - Save Y.js updates to database
   - Handle binary Y.js state encoding/decoding
   ```

4. **Authentication** (`collaboration-server/auth.js`)
   ```javascript
   // Verify JWT tokens from FastAPI
   - Decode JWT
   - Check manuscript permissions
   - Allow/deny connection
   ```

#### Backend - FastAPI Updates (Days 2-3)

1. **Add Session Models** (`backend/models.py`)
   ```python
   class ManuscriptSession(Base):
       id, manuscript_id, user_id, joined_at, last_seen
       cursor_position, selection_range, cursor_color
   
   class ManuscriptSuggestion(Base):
       id, manuscript_id, user_id, suggestion_type
       position_start, position_end, original_text, suggested_text
       status (pending/accepted/rejected)
   ```

2. **Migration** (`backend/migrations/add_collaboration_tables.py`)
   - Create manuscript_sessions table
   - Create manuscript_suggestions table
   - Add indexes

3. **Session Endpoints** (`backend/routes/manuscripts.py`)
   ```python
   @router.get("/{id}/sessions")  # List active users
   @router.post("/{id}/sessions")  # Join session (return WS URL + token)
   @router.get("/{id}/sessions/active-users")  # Get online collaborators
   ```

#### Frontend - Y.js Integration (Days 4-7)

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install yjs y-websocket @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor lib0
   ```

2. **Collaboration Provider** (`frontend/lib/collaboration-provider.js`)
   ```javascript
   import * as Y from 'yjs'
   import { WebsocketProvider } from 'y-websocket'
   
   export function createCollaborationProvider(manuscriptId, token, user) {
     const ydoc = new Y.Doc()
     const wsProvider = new WebsocketProvider(
       process.env.NEXT_PUBLIC_COLLABORATION_WS_URL,
       manuscriptId,
       ydoc,
       { params: { token } }
     )
     
     // Set user awareness (name, color, cursor)
     wsProvider.awareness.setLocalStateField('user', {
       name: user.name,
       color: getUserColor(user.id)
     })
     
     return { ydoc, wsProvider }
   }
   ```

3. **Update Editor** (`frontend/app/researcher/manuscripts/[id]/editor/page.js`)
   ```javascript
   // Replace static editor with collaborative editor:
   import Collaboration from '@tiptap/extension-collaboration'
   import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
   
   const { ydoc, wsProvider } = createCollaborationProvider(
     manuscriptId, 
     token, 
     currentUser
   )
   
   const editor = useEditor({
     extensions: [
       StarterKit.configure({ history: false }), // Disable local history
       Collaboration.configure({ document: ydoc }),
       CollaborationCursor.configure({ provider: wsProvider }),
       // ... other extensions
     ]
   })
   ```

4. **Presence Component** (`frontend/components/CollaborationPresence.js`)
   ```javascript
   // Show active users with cursors
   - Display avatars of online users
   - Show user cursor positions in document
   - Connection status indicator
   - "X users editing" badge
   ```

#### Testing (Days 6-7)
- [ ] Two users can edit simultaneously
- [ ] Cursor positions update in real-time
- [ ] Changes sync instantly
- [ ] Offline/online transitions work
- [ ] Authentication works
- [ ] Persistence saves to database

---

### Phase 2: Complete Version Control (Priority: HIGH) ⏰ 3-4 days

**Goal:** Finish version control system with Y.js snapshot support

#### Backend (Days 1-2)
1. **Create Version Endpoints** (`backend/routes/manuscripts.py`)
   ```python
   # Add these schemas
   class VersionCreate(BaseModel)
   class VersionResponse(BaseModel)
   class VersionDetailResponse(BaseModel)
   class VersionComparisonResponse(BaseModel)
   
   # Add these endpoints
   @router.post("/{manuscript_id}/versions")
   @router.get("/{manuscript_id}/versions")
   @router.get("/{manuscript_id}/versions/{version_id}")
   @router.delete("/{manuscript_id}/versions/{version_id}")
   @router.post("/{manuscript_id}/versions/{version_id}/restore")
   @router.get("/{manuscript_id}/versions/compare")
   @router.get("/{manuscript_id}/versions/timeline")
   ```

2. **Create Version Service** (`backend/services/version_service.py`)
   ```python
   # Functions needed:
   - calculate_diff(old_content, new_content)
   - create_version_snapshot(manuscript, version_type, user, label, summary)
   - snapshot_comments(manuscript_id, version_id)
   - restore_version(manuscript_id, version_id, restore_comments)
   - compare_versions(version_a_id, version_b_id)
   - cleanup_old_auto_saves(manuscript_id, keep_count=10)
   ```

3. **Enhance Save Endpoint**
   - Add optional `create_version` query parameter
   - Integrate auto-save version creation
   - Update `current_version_number`

#### Frontend (Days 3-4)
1. **Version History Page** (`frontend/app/researcher/manuscripts/[id]/versions/page.js`)
   - Timeline view of all versions
   - Filter by type (all/manual/milestones/auto-saves)
   - Search by label/date
   - Click to view version details

2. **Version Components**
   - `VersionTimeline.js` - Vertical timeline with version cards
   - `VersionCard.js` - Shows: version #, type icon, label, author, date, word count, status
   - `VersionComparison.js` - Side-by-side diff viewer with syntax highlighting
   - `SaveVersionDialog.js` - Modal with label input, summary textarea, change preview
   - `RestoreVersionDialog.js` - Confirmation with warnings, backup option

3. **Editor Integration**
   - Add "Version History" menu item → opens versions page
   - Add "Save Version" button in toolbar → opens SaveVersionDialog
   - Add version indicator: "v12 • Last saved 2m ago"
   - Implement auto-save versions (every 10 min, only if changed)
   - Create milestone version on status change

**Testing Checklist:**
- [ ] Create manual version with label
- [ ] Auto-save version created after 10 minutes
- [ ] Milestone version on status change
- [ ] View version timeline
- [ ] View version details with comments
- [ ] Compare two versions with diff
- [ ] Restore to previous version
- [ ] Delete auto-save version (manual versions protected)
- [ ] Permissions: co-authors can create versions

---

### Phase 2: Enhance Commenting System (Priority: MEDIUM) ⏰ 1-2 days

**Goal:** Polish the existing commenting system and integrate with versions

#### Backend (Day 1)
1. **Add Reviewer Endpoints**
   ```python
   @router.post("/{manuscript_id}/reviewers")  # Invite reviewer
   @router.get("/{manuscript_id}/reviewers")   # List reviewers
   @router.delete("/{manuscript_id}/reviewers/{reviewer_id}")  # Remove
   ```

2. **Enhance Comment Integration**
   - Ensure comments are snapshotted when creating versions
   - Add @mention notification system
   - Add comment activity tracking

#### Frontend (Day 2)
1. **Reviewer Management**
   - Create `ReviewerDialog.js` component
   - Add "Manage Reviewers" option in Tools menu
   - Show reviewer avatars in top bar

2. **Comment Enhancements**
   - Add notification when someone replies
   - Improve @mention autocomplete
   - Add comment activity feed

**Testing Checklist:**
- [ ] Invite reviewer by email
- [ ] Reviewer can add comments
- [ ] @mentions send notifications
- [ ] Comments appear in version snapshots
- [ ] Filter comments by status works

---

### Phase 3: Suggestions / Track Changes (Priority: HIGH) ⏰ 1 week

**Goal:** Implement Word-style "Suggestion Mode" for tracked changes

#### Backend (Days 1-2)
1. **Suggestion Endpoints** (`backend/routes/manuscripts.py`)
   ```python
   @router.get("/{id}/suggestions")
   @router.post("/{id}/suggestions")  # Create suggestion
   @router.patch("/{id}/suggestions/{suggestion_id}")  # Accept/reject
   @router.delete("/{id}/suggestions/{suggestion_id}")
   ```

2. **Suggestion Service** (`backend/services/suggestion_service.py`)
   - Create suggestion from editor change
   - Accept suggestion (apply change)
   - Reject suggestion (revert change)
   - Batch accept/reject

#### Frontend (Days 3-5)
1. **Suggestion TipTap Extension** (`frontend/lib/tiptap-suggestion-extension.js`)
   ```javascript
   // Custom mark for tracked changes:
   - Insertions: green background
   - Deletions: red strikethrough
   - Replacements: yellow highlight
   - Store suggestion metadata in mark attributes
   ```

2. **Suggestions Panel** (`frontend/components/SuggestionsPanel.js`)
   ```javascript
   // Sidebar showing all suggestions:
   - List all pending suggestions
   - Filter by author
   - Accept/reject individual suggestions
   - Accept/reject all
   - Show who made each change and when
   ```

3. **Suggestion Mode Toggle** (in editor toolbar)
   ```javascript
   // Toggle button in toolbar:
   - When ON: all edits create suggestions
   - When OFF: direct editing
   - Visual indicator of current mode
   ```

---

### Phase 4: Advanced Features (Priority: MEDIUM) ⏰ 1-2 weeks

#### Conflict Resolution (Days 1-2)
- Show notification when conflicts detected
- Manual merge interface for complex conflicts
- Undo/redo with awareness of collaborative changes

#### Offline Support (Days 3-4)
- IndexedDB persistence for Y.js document
- Queue changes when offline
- Sync when connection restored
- Show offline indicator

#### Activity Feed (Day 5)
- Real-time activity log
- "User X edited Introduction"
- "User Y added a comment"
- "User Z accepted suggestion"
- Filter by user, action type, date

---

## 🔗 Integration Points

### Version Control ↔ Commenting
- **When creating version:** Snapshot all current comments
- **When viewing version:** Show comments from that snapshot (read-only)
- **When restoring version:** Option to restore comments
- **In version comparison:** Show comment activity (added/resolved)

### Version Control ↔ Collaboration
- **Auto-save versions:** Background saves for safety
- **Manual versions:** User-created checkpoints
- **Milestone versions:** Status change snapshots
- **Co-author permissions:** All co-authors can create versions

### Commenting ↔ Collaboration
- **@mentions:** Notify co-authors and reviewers
- **Comment threading:** Nested replies
- **Resolution tracking:** Resolve/reopen discussions
- **Permissions:** Owner, co-authors, reviewers can comment

---

## 📝 API Endpoint Summary

### Manuscripts
- `POST /api/manuscripts` ✅
- `GET /api/manuscripts` ✅
- `GET /api/manuscripts/{id}` ✅
- `PATCH /api/manuscripts/{id}` ✅
- `DELETE /api/manuscripts/{id}` ✅

### Co-Authors
- `POST /api/manuscripts/{id}/co-authors` ✅
- `PATCH /api/manuscripts/{id}/co-authors/{co_author_id}` ✅
- `DELETE /api/manuscripts/{id}/co-authors/{co_author_id}` ✅

### Citations
- `POST /api/manuscripts/{id}/citations` ✅
- `GET /api/manuscripts/{id}/citations` ✅
- `POST /api/manuscripts/{id}/citations/reorder` ✅
- `DELETE /api/manuscripts/{id}/citations/{citation_id}` ✅

### Comments
- `POST /api/manuscripts/{id}/comments` ✅
- `GET /api/manuscripts/{id}/comments` ✅
- `POST /api/manuscripts/{id}/comments/{comment_id}/resolve` ✅
- `DELETE /api/manuscripts/{id}/comments/{comment_id}` ✅

### Reviewers
- `POST /api/manuscripts/{id}/reviewers` ❌ NEED
- `GET /api/manuscripts/{id}/reviewers` ❌ NEED
- `DELETE /api/manuscripts/{id}/reviewers/{reviewer_id}` ❌ NEED

### Versions (ALL MISSING)
- `POST /api/manuscripts/{id}/versions` ❌ NEED
- `GET /api/manuscripts/{id}/versions` ❌ NEED
- `GET /api/manuscripts/{id}/versions/{version_id}` ❌ NEED
- `DELETE /api/manuscripts/{id}/versions/{version_id}` ❌ NEED
- `POST /api/manuscripts/{id}/versions/{version_id}/restore` ❌ NEED
- `GET /api/manuscripts/{id}/versions/compare?v1={id}&v2={id}` ❌ NEED
- `GET /api/manuscripts/{id}/versions/timeline` ❌ NEED

---

## 🚀 Next Steps

### Immediate (This Week)
1. ✅ Fix comment sidebar error (COMPLETED)
2. ⏰ Implement version control backend endpoints
3. ⏰ Create version service with diff calculation
4. ⏰ Build version history page

### Short Term (Next 2 Weeks)
1. Complete version control frontend
2. Add reviewer management endpoints
3. Polish commenting system
4. Add @mention notifications

### Long Term (Future)
1. Consider real-time collaboration (major project)
2. Add suggestion mode / track changes
3. Implement conflict resolution
4. Add activity feed

---

## 📦 File Checklist

### Backend Files
- ✅ `backend/models.py` - All models present
- ✅ `backend/migrations/add_manuscript_comments.py` - Complete
- ✅ `backend/migrations/add_manuscript_versions.py` - Complete
- ⏰ `backend/routes/manuscripts.py` - Missing version endpoints
- ❌ `backend/services/version_service.py` - NOT CREATED
- ❌ `backend/services/collaboration_service.py` - NOT NEEDED YET

### Frontend Files
- ✅ `frontend/app/researcher/manuscripts/[id]/editor/page.js` - Complete
- ✅ `frontend/components/CommentSidebar.js` - Complete & Fixed
- ✅ `frontend/components/CommentForm.js` - Complete
- ✅ `frontend/components/CitationSidebar.js` - Complete
- ✅ `frontend/lib/tiptap-comment-extension.js` - Complete
- ✅ `frontend/lib/tiptap-citation-extension.js` - Complete
- ❌ `frontend/app/researcher/manuscripts/[id]/versions/page.js` - NOT CREATED
- ❌ `frontend/components/VersionTimeline.js` - NOT CREATED
- ❌ `frontend/components/VersionCard.js` - NOT CREATED
- ❌ `frontend/components/VersionComparison.js` - NOT CREATED
- ❌ `frontend/components/SaveVersionDialog.js` - NOT CREATED
- ❌ `frontend/components/RestoreVersionDialog.js` - NOT CREATED
- ❌ `frontend/components/ReviewerDialog.js` - NOT CREATED

---

## 💡 Recommendations

### Priority Order
1. **Version Control** - Already 70% done, finish it! (3-4 days)
2. **Reviewer Management** - Quick win (1 day)
3. **Comment Enhancements** - Polish existing (1-2 days)
4. **Real-time Collaboration** - Defer to future (8-12 weeks if needed)

### Architecture Decision
**Current State:** Async collaboration via versions + comments
**Proposed:** Keep this approach, it's simpler and sufficient
**Future:** Add real-time only if users demand it

### Why Defer Real-time Collaboration?
- Current system already enables collaboration
- Much simpler to maintain
- No WebSocket infrastructure needed
- No complex conflict resolution
- Versions provide clear checkpoints
- Comments enable discussions
- Users can work asynchronously

---

## 🎉 Summary

### What Works Now
✅ Create manuscripts with co-authors
✅ Rich text editing with TipTap
✅ Add citations from publication library
✅ Inline comments with threading
✅ @mentions for collaborators
✅ Resolve/unresolve comments
✅ Auto-save manuscripts
✅ Database ready for versions

### What Needs Work
⏰ Version creation and management endpoints
⏰ Version history UI
⏰ Diff calculation and comparison
⏰ Restore version functionality
⏰ Reviewer invitation system

### What's Coming Next
🚀 Real-time collaborative editing (Phase 1)
🚀 Live cursors and presence (Phase 1)
🚀 Suggestion mode / track changes (Phase 3)
🚀 WebSocket infrastructure (Phase 1)
🚀 Offline sync (Phase 4)

---

## ⚠️ IMPORTANT: Architecture Change

**Because real-time collaboration is required, we must implement it FIRST.**

**Why?**
- Y.js stores documents in binary CRDT format, not HTML
- Version control must snapshot Y.js state, not HTML
- Comments must track positions in Y.js document
- Can't retrofit Y.js into existing system easily

**Revised Timeline:**
1. **Week 1-2:** Real-time collaboration foundation (Phase 1)
2. **Week 3:** Complete version control with Y.js support (Phase 2)
3. **Week 4:** Suggestion mode / track changes (Phase 3)
4. **Week 5-6:** Advanced features & polish (Phase 4)

**Total:** 5-6 weeks for complete system

---

**Next Action:** Start Phase 1 - Set up Y.js and WebSocket infrastructure!
