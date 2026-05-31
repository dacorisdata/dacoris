# Collaborative Manuscript Editor Implementation Plan

Implement real-time collaborative editing for manuscripts using Y.js CRDT with WebSockets, including live cursors, comments, suggestions, permissions, and version history.

## Overview

Transform the current single-user manuscript editor into a fully collaborative Google Docs-style editor where multiple co-authors can edit simultaneously with real-time synchronization, conflict-free merging, inline comments, track changes, and role-based permissions.

## Architecture

### Technology Stack
- **Frontend**: TipTap editor with Y.js collaboration extension
- **Real-time Sync**: Y.js CRDT (Conflict-free Replicated Data Type)
- **WebSocket Server**: y-websocket (Node.js) or custom FastAPI WebSocket handler
- **Persistence**: PostgreSQL for document snapshots and metadata
- **State Management**: Y.js shared types for document state

### Data Flow
```
User A edits → Y.js local update → WebSocket broadcast → Y.js merge → User B sees change
                                  ↓
                            PostgreSQL snapshot (periodic)
```

## Implementation Phases

### Phase 1: Backend Infrastructure

#### 1.1 Database Schema Updates
**File**: `c:\projects\dacoris\backend\models.py`

Add new models:
- **ManuscriptSession**: Track active editing sessions
  - `id`, `manuscript_id`, `user_id`, `joined_at`, `last_seen`, `cursor_position`, `selection_range`
  
- **ManuscriptVersion**: Version history snapshots
  - `id`, `manuscript_id`, `version_number`, `content_snapshot`, `y_doc_state` (binary), `created_by`, `created_at`, `change_summary`
  
- **ManuscriptComment**: Inline comments and threads
  - `id`, `manuscript_id`, `user_id`, `position_start`, `position_end`, `content`, `parent_comment_id`, `resolved`, `created_at`, `updated_at`
  
- **ManuscriptSuggestion**: Track changes / suggestions
  - `id`, `manuscript_id`, `user_id`, `suggestion_type` (insert/delete/replace), `position_start`, `position_end`, `original_text`, `suggested_text`, `status` (pending/accepted/rejected), `created_at`
  
- **ManuscriptPermission**: Fine-grained permissions
  - `id`, `manuscript_id`, `user_id`, `permission_level` (owner/editor/commenter/viewer), `can_edit_sections` (JSON array), `granted_by`, `granted_at`

Update **ManuscriptCoAuthor** model:
- Add `permission_level` field (default: 'editor')
- Add `last_active_at` timestamp
- Add `cursor_color` for visual identification

#### 1.2 WebSocket Server Setup
**Option A**: Separate Node.js y-websocket server (Recommended)
- Create `c:\projects\dacoris\collaboration-server\` directory
- Install: `y-websocket`, `ws`, `lib0`
- Implement persistence provider to sync with PostgreSQL
- Handle authentication via JWT tokens

**Option B**: FastAPI WebSocket integration
- Create `c:\projects\dacoris\backend\routes\collaboration.py`
- Implement WebSocket endpoint: `/ws/manuscripts/{manuscript_id}`
- Use `ypy` (Python Y.js bindings) for CRDT operations
- Handle connection management, broadcasting, and persistence

#### 1.3 API Endpoints
**File**: `c:\projects\dacoris\backend\routes\manuscripts.py`

Add endpoints:
- `GET /api/manuscripts/{id}/sessions` - List active users
- `POST /api/manuscripts/{id}/sessions` - Join editing session
- `DELETE /api/manuscripts/{id}/sessions/{session_id}` - Leave session
- `GET /api/manuscripts/{id}/versions` - List version history
- `POST /api/manuscripts/{id}/versions` - Create manual snapshot
- `GET /api/manuscripts/{id}/versions/{version_id}` - Get specific version
- `POST /api/manuscripts/{id}/versions/{version_id}/restore` - Restore version
- `GET /api/manuscripts/{id}/comments` - List comments
- `POST /api/manuscripts/{id}/comments` - Add comment
- `PATCH /api/manuscripts/{id}/comments/{comment_id}` - Update comment
- `DELETE /api/manuscripts/{id}/comments/{comment_id}` - Delete comment
- `POST /api/manuscripts/{id}/comments/{comment_id}/resolve` - Resolve thread
- `GET /api/manuscripts/{id}/suggestions` - List suggestions
- `POST /api/manuscripts/{id}/suggestions` - Create suggestion
- `PATCH /api/manuscripts/{id}/suggestions/{suggestion_id}` - Accept/reject
- `GET /api/manuscripts/{id}/permissions` - List permissions
- `POST /api/manuscripts/{id}/permissions` - Grant permission
- `PATCH /api/manuscripts/{id}/permissions/{permission_id}` - Update permission
- `DELETE /api/manuscripts/{id}/permissions/{permission_id}` - Revoke permission

#### 1.4 Persistence Service
**File**: `c:\projects\dacoris\backend\services\collaboration_service.py`

Implement:
- `save_y_doc_snapshot()` - Persist Y.js document state
- `load_y_doc_snapshot()` - Load latest snapshot
- `apply_awareness_update()` - Handle cursor/selection updates
- `broadcast_to_session()` - Send updates to all connected users
- `cleanup_stale_sessions()` - Remove inactive sessions
- `create_version_snapshot()` - Auto-save versions periodically

### Phase 2: Frontend Real-time Collaboration

#### 2.1 Install Dependencies
**File**: `c:\projects\dacoris\frontend\package.json`

Add packages:
```json
"y-websocket": "^1.5.0",
"yjs": "^13.6.0",
"@tiptap/extension-collaboration": "^2.1.13",
"@tiptap/extension-collaboration-cursor": "^2.1.13",
"lib0": "^0.2.89"
```

#### 2.2 Y.js Integration
**File**: `c:\projects\dacoris\frontend\lib\collaboration-provider.js`

Create WebSocket provider:
- Initialize Y.Doc for shared document state
- Connect to WebSocket server
- Handle reconnection logic
- Implement awareness protocol for cursors/presence
- Add offline support with IndexedDB persistence

#### 2.3 Update Editor Component
**File**: `c:\projects\dacoris\frontend\app\researcher\manuscripts\[id]\editor\page.js`

Major changes:
1. Replace static editor with collaborative editor
2. Add TipTap extensions:
   - `Collaboration` - Y.js document binding
   - `CollaborationCursor` - Live cursor positions
   - `Comment` - Inline comment nodes
   - `Suggestion` - Track changes extension
3. Initialize Y.js provider on mount
4. Subscribe to awareness updates for user presence
5. Handle connection status (online/offline/syncing)
6. Add permission checks before allowing edits

#### 2.4 User Presence UI
**File**: `c:\projects\dacoris\frontend\components\CollaborationPresence.js`

Create component showing:
- Active users with avatars (already exists, enhance it)
- User cursor colors and names
- Connection status indicator
- "X users editing" badge
- User activity timestamps

#### 2.5 Comments Sidebar
**File**: `c:\projects\dacoris\frontend\components\CommentsSidebar.js`

Implement:
- List all comments for the manuscript
- Filter by resolved/unresolved
- Click comment to jump to position in document
- Reply to comments (threaded)
- Resolve/reopen comment threads
- Real-time updates when others comment
- Mention users with @ autocomplete

#### 2.6 Suggestions/Track Changes UI
**File**: `c:\projects\dacoris\frontend\components\SuggestionsPanel.js`

Features:
- Toggle "Suggestion Mode" (like Word's Track Changes)
- Show insertions in green, deletions in red strikethrough
- Accept/reject individual suggestions
- Accept/reject all suggestions
- Filter by author
- Show suggestion metadata (who, when)

#### 2.7 Version History Panel
**File**: `c:\projects\dacoris\frontend\components\VersionHistory.js`

Implement:
- Timeline of versions with timestamps
- Preview version diffs (highlight changes)
- Restore to previous version
- Name/tag important versions
- Auto-save indicator
- Compare two versions side-by-side

#### 2.8 Permissions Management
**File**: `c:\projects\dacoris\frontend\components\ManuscriptPermissions.js`

Create dialog for:
- List co-authors with current permissions
- Change permission levels (Owner/Editor/Commenter/Viewer)
- Invite new collaborators by email
- Set section-specific permissions (e.g., only edit Methods)
- Revoke access
- Transfer ownership

### Phase 3: Advanced Features

#### 3.1 Comment Extension
**File**: `c:\projects\dacoris\frontend\lib\tiptap-comment-extension.js`

Custom TipTap extension:
- Mark selected text as commented
- Store comment ID in mark attributes
- Render comment highlights
- Handle comment deletion when text is deleted
- Support nested/overlapping comments

#### 3.2 Suggestion Extension
**File**: `c:\projects\dacoris\frontend\lib\tiptap-suggestion-extension.js`

Custom TipTap extension:
- Track insertions/deletions when in suggestion mode
- Store suggestion metadata
- Render visual indicators (colors, strikethrough)
- Handle accept/reject operations
- Merge consecutive suggestions from same user

#### 3.3 Conflict Resolution UI
**File**: `c:\projects\dacoris\frontend\components\ConflictResolver.js`

Handle edge cases:
- Show notification when conflicts detected (rare with Y.js)
- Manual merge interface for complex conflicts
- Undo/redo with awareness of collaborative changes
- Lock sections during critical edits (optional)

#### 3.4 Offline Support
**File**: `c:\projects\dacoris\frontend\lib\offline-sync.js`

Implement:
- IndexedDB persistence for Y.js document
- Queue changes when offline
- Sync when connection restored
- Show offline indicator
- Conflict resolution on reconnect

#### 3.5 Activity Feed
**File**: `c:\projects\dacoris\frontend\components\ManuscriptActivity.js`

Real-time activity log:
- "User X edited Introduction section"
- "User Y added a comment"
- "User Z accepted suggestion"
- Filter by user, action type, date
- Export activity log

### Phase 4: Performance & Polish

#### 4.1 Optimization
- Implement Y.js snapshot compression
- Lazy load version history
- Debounce cursor position updates
- Optimize WebSocket message size
- Add connection pooling
- Implement rate limiting

#### 4.2 Testing
- Unit tests for CRDT operations
- Integration tests for WebSocket sync
- Load testing with 10+ concurrent users
- Test offline/online transitions
- Test conflict scenarios
- Cross-browser testing

#### 4.3 Security
- Validate permissions on every edit
- Sanitize user input in comments
- Rate limit WebSocket messages
- Encrypt WebSocket connection (WSS)
- Audit log for permission changes
- CSRF protection for API endpoints

#### 4.4 UX Enhancements
- Keyboard shortcuts (Ctrl+Alt+M for comment)
- Smooth cursor animations
- Toast notifications for user actions
- Loading states for version restore
- Empty states for comments/suggestions
- Onboarding tour for new users

## Migration Strategy

### Database Migration
**File**: `c:\projects\dacoris\backend\migrations\add_collaboration_tables.py`

Create migration script:
1. Add new tables (sessions, versions, comments, suggestions, permissions)
2. Update manuscript_co_authors table
3. Create indexes for performance
4. Migrate existing manuscripts to Y.js format
5. Set default permissions for existing co-authors

### Backward Compatibility
- Keep existing save endpoint for non-collaborative mode
- Add feature flag to enable/disable collaboration
- Graceful degradation if WebSocket unavailable
- Support both old and new editor formats

## Deployment Checklist

### Infrastructure
- [ ] Set up Node.js server for y-websocket (or configure FastAPI WebSocket)
- [ ] Configure WebSocket load balancing (sticky sessions)
- [ ] Set up Redis for session management (optional)
- [ ] Configure CORS for WebSocket connections
- [ ] Set up monitoring for WebSocket connections

### Configuration
- [ ] Add WebSocket URL to environment variables
- [ ] Configure Y.js persistence interval
- [ ] Set max concurrent users per document
- [ ] Configure auto-save interval
- [ ] Set version snapshot frequency

### Documentation
- [ ] User guide for collaborative editing
- [ ] API documentation for new endpoints
- [ ] WebSocket protocol documentation
- [ ] Troubleshooting guide
- [ ] Admin guide for permissions

## File Structure

```
backend/
├── models.py (updated)
├── routes/
│   ├── manuscripts.py (updated)
│   └── collaboration.py (new)
├── services/
│   ├── collaboration_service.py (new)
│   └── version_service.py (new)
└── migrations/
    └── add_collaboration_tables.py (new)

frontend/
├── app/researcher/manuscripts/[id]/editor/
│   ├── page.js (major update)
│   └── editor.css (updated)
├── components/
│   ├── CollaborationPresence.js (new)
│   ├── CommentsSidebar.js (new)
│   ├── SuggestionsPanel.js (new)
│   ├── VersionHistory.js (new)
│   ├── ManuscriptPermissions.js (new)
│   ├── ConflictResolver.js (new)
│   └── ManuscriptActivity.js (new)
└── lib/
    ├── collaboration-provider.js (new)
    ├── offline-sync.js (new)
    ├── tiptap-comment-extension.js (new)
    └── tiptap-suggestion-extension.js (new)

collaboration-server/ (if using Node.js)
├── package.json
├── server.js
├── persistence.js
└── auth.js
```

## Testing Plan

### Unit Tests
- Y.js document merging
- Permission validation
- Comment threading
- Suggestion accept/reject logic

### Integration Tests
- WebSocket connection lifecycle
- Multi-user editing scenarios
- Offline sync recovery
- Version restore functionality

### E2E Tests
- Complete collaboration workflow
- Permission changes during editing
- Comment and suggestion workflows
- Version history navigation

### Load Tests
- 10 concurrent users editing
- 100 comments on single document
- Large document (10,000+ words)
- Rapid edits from multiple users

## Success Metrics

- Real-time sync latency < 100ms
- Support 20+ concurrent editors per document
- Zero data loss on connection drops
- Conflict resolution accuracy > 99.9%
- User satisfaction with collaborative features

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| WebSocket connection instability | High | Implement reconnection logic, offline support |
| Y.js learning curve | Medium | Use Tiptap Collaboration extension, thorough testing |
| Performance with large documents | High | Implement pagination, lazy loading, compression |
| Permission complexity | Medium | Start with simple roles, iterate based on feedback |
| Data consistency issues | Critical | Extensive testing, audit logs, version snapshots |

## Timeline Estimate

- **Phase 1** (Backend): 2-3 weeks
- **Phase 2** (Frontend Core): 2-3 weeks
- **Phase 3** (Advanced Features): 3-4 weeks
- **Phase 4** (Polish & Testing): 1-2 weeks

**Total**: 8-12 weeks for full implementation

## Next Steps

1. Review and approve this plan
2. Set up development environment with Y.js
3. Create database migration for new tables
4. Implement WebSocket server (Node.js or FastAPI)
5. Build basic real-time sync proof-of-concept
6. Iterate and add features incrementally
