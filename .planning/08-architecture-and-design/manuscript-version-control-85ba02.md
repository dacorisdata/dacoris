# Manuscript Version Control System

Implement a comprehensive version control system for manuscripts with hybrid versioning (manual snapshots + auto-save + milestones), full diff tracking, timeline visualization, and complete integration with the commenting system.

## Overview

This system provides Git-like version control for manuscripts with:
- **Hybrid versioning**: Manual snapshots, auto-save versions, and milestone-based versions
- **Comprehensive tracking**: Content, metadata, diffs, word count, citations, comments, co-authors
- **Full version browser**: Timeline view, side-by-side comparison, diff visualization, restore/branch
- **Comment integration**: Comments are versioned with manuscripts, viewable across versions
- **Collaboration-aware**: Track who made changes, merge conflict detection for co-authors

## Backend Implementation

### 1. Database Models (`backend/models.py`)

Add after the `ManuscriptComment` model:

**ManuscriptVersion Model:**
```python
class ManuscriptVersion(Base):
    __tablename__ = "manuscript_versions"
    
    # Core fields
    id = Column(String, PK)
    manuscript_id = Column(String, FK)
    version_number = Column(Integer)  # Sequential: 1, 2, 3...
    
    # Version metadata
    version_type = Column(Enum)  # MANUAL, AUTO_SAVE, MILESTONE, BRANCH
    version_label = Column(String)  # User-provided name: "Draft 1", "After Review"
    change_summary = Column(Text)  # User description of changes
    
    # Content snapshot
    content = Column(Text)  # Full HTML content at this version
    abstract = Column(Text)
    title = Column(String)
    
    # Statistics
    word_count = Column(Integer)
    character_count = Column(Integer)
    citation_count = Column(Integer)
    comment_count = Column(Integer)
    resolved_comment_count = Column(Integer)
    
    # Status at time of version
    status = Column(String)  # draft, in_review, submitted, published
    
    # Diff information
    additions_count = Column(Integer)  # Lines/words added since last version
    deletions_count = Column(Integer)  # Lines/words deleted
    diff_summary = Column(JSON)  # Structured diff data
    
    # Collaboration metadata
    co_authors_snapshot = Column(JSON)  # List of co-authors at this version
    reviewers_snapshot = Column(JSON)  # List of reviewers
    
    # Tracking
    created_by_id = Column(String, FK)
    created_at = Column(DateTime)
    parent_version_id = Column(String, FK, nullable=True)  # For branching
    is_current = Column(Boolean, default=False)
    
    # Relationships
    manuscript = relationship("Manuscript", back_populates="versions")
    created_by = relationship("User")
    parent_version = relationship("ManuscriptVersion", remote_side=[id])
    comments_snapshot = relationship("ManuscriptVersionComment")
```

**ManuscriptVersionComment Model:**
```python
class ManuscriptVersionComment(Base):
    __tablename__ = "manuscript_version_comments"
    
    # Snapshot of comment at version time
    id = Column(String, PK)
    version_id = Column(String, FK)
    original_comment_id = Column(String, FK)  # Link to actual comment
    
    # Comment data snapshot
    content = Column(Text)
    quoted_text = Column(Text)
    selection_start = Column(Integer)
    selection_end = Column(Integer)
    is_resolved = Column(Boolean)
    user_name = Column(String)
    user_email = Column(String)
    created_at = Column(DateTime)
    
    # Thread info
    parent_comment_id = Column(String, nullable=True)
    replies_count = Column(Integer, default=0)
    
    # Relationships
    version = relationship("ManuscriptVersion")
    original_comment = relationship("ManuscriptComment")
```

**Update Manuscript Model:**
- Add `versions` relationship
- Add `current_version_number` field
- Add `last_auto_save_at` field for auto-save tracking

### 2. Version Creation Logic

**Auto-save Versions:**
- Create auto-save version every 10 minutes if content changed
- Keep only last 10 auto-save versions (delete older ones)
- Mark as `version_type = AUTO_SAVE`

**Manual Snapshots:**
- User clicks "Save Version" button
- Prompt for version label and change summary
- Mark as `version_type = MANUAL`
- Never auto-delete manual versions

**Milestone Versions:**
- Auto-create when status changes (draft → in_review, etc.)
- Label automatically: "Submitted for Review", "Published"
- Mark as `version_type = MILESTONE`

**Diff Calculation:**
- Use `difflib` (Python) or similar to compute diffs
- Store structured diff as JSON: `{additions: [...], deletions: [...], changes: [...]}`
- Calculate word/character count changes

### 3. Pydantic Schemas (`backend/routes/manuscripts.py`)

**VersionCreate:**
```python
class VersionCreate(BaseModel):
    version_label: Optional[str]
    change_summary: Optional[str]
    version_type: str = "MANUAL"
```

**VersionResponse:**
```python
class VersionResponse(BaseModel):
    id: str
    version_number: int
    version_type: str
    version_label: Optional[str]
    change_summary: Optional[str]
    word_count: int
    character_count: int
    citation_count: int
    comment_count: int
    status: str
    created_by: UserBasic
    created_at: datetime
    is_current: bool
    additions_count: int
    deletions_count: int
```

**VersionDetailResponse:**
```python
class VersionDetailResponse(VersionResponse):
    content: str
    abstract: Optional[str]
    title: str
    diff_summary: Optional[dict]
    co_authors_snapshot: List[dict]
    reviewers_snapshot: List[dict]
    comments_snapshot: List[CommentResponse]
```

**VersionComparisonResponse:**
```python
class VersionComparisonResponse(BaseModel):
    version_a: VersionDetailResponse
    version_b: VersionDetailResponse
    diff: dict  # Structured diff between versions
    summary: dict  # Stats: words added/removed, etc.
```

### 4. API Endpoints (`backend/routes/manuscripts.py`)

**Version Management:**
- `POST /api/manuscripts/{manuscript_id}/versions` - Create manual version
- `GET /api/manuscripts/{manuscript_id}/versions` - List all versions (paginated)
- `GET /api/manuscripts/{manuscript_id}/versions/{version_id}` - Get version details
- `DELETE /api/manuscripts/{manuscript_id}/versions/{version_id}` - Delete version (manual only)
- `POST /api/manuscripts/{manuscript_id}/versions/{version_id}/restore` - Restore to this version
- `GET /api/manuscripts/{manuscript_id}/versions/compare?v1={id}&v2={id}` - Compare two versions
- `POST /api/manuscripts/{manuscript_id}/versions/{version_id}/branch` - Create branch from version
- `GET /api/manuscripts/{manuscript_id}/versions/timeline` - Get timeline data

**Auto-save Integration:**
- Modify existing save endpoint to optionally create auto-save versions
- Add query param: `?create_version=true`
- Background job to clean up old auto-save versions

**Permissions:**
- Owner and co-authors can create manual versions
- Only owner can delete versions or restore
- All collaborators can view version history

### 5. Database Migration

Create: `backend/migrations/add_manuscript_versions.py`
- Create `manuscript_versions` table
- Create `manuscript_version_comments` table
- Add indexes on `manuscript_id`, `version_number`, `created_at`, `version_type`
- Add `current_version_number` to manuscripts table
- Create initial version for existing manuscripts

## Frontend Implementation

### 1. Version History Page (`frontend/app/researcher/manuscripts/[id]/versions/page.js`)

**Full-featured version browser with:**

**Timeline View (Default):**
- Vertical timeline showing all versions
- Visual indicators for version types (manual=star, milestone=flag, auto-save=clock)
- Each version card shows:
  - Version number and label
  - Date/time and author
  - Status badge
  - Word count change (+/- indicator)
  - Comment activity
  - Quick actions: View, Compare, Restore
- Filter controls: All/Manual/Milestones/Auto-saves
- Search versions by label or date range

**Version Detail View:**
- Full metadata display
- Read-only editor showing content at that version
- Comments from that version (read-only)
- Co-authors and reviewers list
- Statistics panel
- Actions: Compare, Restore, Download

**Comparison View:**
- Side-by-side layout
- Left: Version A, Right: Version B
- Diff highlighting:
  - Green background: additions
  - Red background: deletions
  - Yellow background: modifications
- Sync scrolling between versions
- Statistics: X words added, Y words removed, Z comments added
- Toggle: Show all / Show changes only

**Restore Workflow:**
- Confirmation dialog with warning
- Option to create backup of current version first
- Restore content, abstract, title
- Option to restore comments (checkbox)
- Success notification with undo option (5 seconds)

### 2. Editor Integration (`frontend/app/researcher/manuscripts/[id]/editor/page.js`)

**Version Controls in Toolbar:**
- "Version History" button (opens version browser in new tab/modal)
- "Save Version" button (opens save version dialog)
- Version indicator: "v12 • Last saved 2 min ago"
- Auto-save indicator with version count

**Save Version Dialog:**
- Text input for version label (required)
- Textarea for change summary (optional)
- Preview of changes since last version
- Word count comparison
- Save button

**Auto-save Enhancement:**
- Every 10 minutes, create auto-save version
- Show notification: "Auto-save version created"
- Don't interrupt user workflow

**Status Change Hook:**
- When manuscript status changes, auto-create milestone version
- Show notification: "Milestone version created: Submitted for Review"

### 3. Components

**VersionTimeline Component (`frontend/components/VersionTimeline.js`):**
- Renders vertical timeline
- Version cards with metadata
- Filter and search controls
- Infinite scroll/pagination
- Click handlers for view/compare/restore

**VersionCard Component (`frontend/components/VersionCard.js`):**
- Compact card showing version info
- Type icon and color coding
- Expandable to show more details
- Action buttons

**VersionComparison Component (`frontend/components/VersionComparison.js`):**
- Side-by-side diff viewer
- Syntax highlighting for changes
- Sync scroll implementation
- Statistics panel
- Export comparison as PDF

**SaveVersionDialog Component (`frontend/components/SaveVersionDialog.js`):**
- Form for creating manual version
- Change preview
- Validation

**RestoreVersionDialog Component (`frontend/components/RestoreVersionDialog.js`):**
- Confirmation with warnings
- Options (backup current, restore comments)
- Progress indicator

### 4. State Management

**Version Context (`frontend/contexts/VersionContext.js`):**
- Manage version state across components
- Fetch versions
- Create/delete/restore versions
- Compare versions
- Real-time updates

**Integration with Editor:**
- Track unsaved changes
- Trigger auto-save versions
- Update version indicator
- Handle restore operations

### 5. Diff Algorithm (Frontend)

Use library like `diff-match-patch` or `react-diff-viewer`:
- Calculate diffs client-side for preview
- Highlight additions/deletions/changes
- Word-level or character-level diffing
- Clean, readable presentation

## UI/UX Design

**Visual Design:**
- Timeline: Clean, modern, inspired by Git/GitHub
- Version cards: Compact but informative
- Diff view: Clear color coding (green/red/yellow)
- Icons for version types (star, flag, clock, branch)
- Smooth animations and transitions

**Color Coding:**
- Manual versions: Blue accent
- Milestone versions: Purple accent
- Auto-save versions: Gray/muted
- Current version: Green highlight
- Additions: Light green background
- Deletions: Light red background
- Modifications: Light yellow background

**Responsive Design:**
- Timeline: Stack on mobile
- Comparison: Switch to tabbed view on mobile
- Touch-friendly controls

## Integration with Commenting System

**Version-Comment Linking:**
- When creating version, snapshot all current comments
- Store in `manuscript_version_comments` table
- Link to original comment via `original_comment_id`

**Viewing Comments Across Versions:**
- Version detail view shows comments from that version
- Comments are read-only in historical versions
- Can see which comments were added/resolved between versions

**Restoring with Comments:**
- Option to restore comments when restoring version
- Warning if current comments will be affected
- Merge strategy: Keep current comments + restore old ones (mark as restored)

**Comment Timeline:**
- In version comparison, show comment activity
- "3 comments added, 2 resolved" between versions
- Click to see which comments

## Auto-save Strategy

**Timing:**
- Create auto-save version every 10 minutes
- Only if content has changed since last version
- Don't create if user is actively typing (debounce)

**Retention:**
- Keep last 10 auto-save versions
- Delete older auto-saves automatically
- Never delete manual or milestone versions

**User Control:**
- Settings to enable/disable auto-save versions
- Adjust auto-save interval (5/10/15/30 minutes)
- Option to promote auto-save to manual version

## Performance Considerations

**Database:**
- Index on `manuscript_id` + `version_number`
- Index on `created_at` for timeline queries
- Paginate version list (20 per page)
- Lazy load version content (only when viewing)

**Storage:**
- Content is duplicated per version (acceptable for text)
- Consider compression for very large manuscripts
- Archive old versions after 1 year (optional)

**Diff Calculation:**
- Calculate diffs on-demand, not on save
- Cache diff results for frequently compared versions
- Use efficient diff algorithm (Myers' diff)

## Testing Checklist

- [ ] Create manual version with label and summary
- [ ] Auto-save version created after 10 minutes
- [ ] Milestone version created on status change
- [ ] View version timeline
- [ ] View version details
- [ ] Compare two versions with diff highlighting
- [ ] Restore to previous version
- [ ] Restore with comments option works
- [ ] Delete auto-save version
- [ ] Cannot delete manual/milestone version (only owner)
- [ ] Filter versions by type
- [ ] Search versions
- [ ] Version pagination works
- [ ] Comments are versioned correctly
- [ ] Co-author can create versions
- [ ] Reviewer cannot create versions
- [ ] Performance with 100+ versions

## Implementation Order

1. **Backend foundation** (Days 1-2)
   - Database models and migration
   - Version creation logic
   - Diff calculation utility
   - Basic API endpoints

2. **Backend completion** (Day 3)
   - Comparison endpoint
   - Restore logic
   - Comment versioning integration
   - Auto-save cleanup job

3. **Frontend components** (Days 4-5)
   - Version timeline component
   - Version card component
   - Save version dialog
   - Restore version dialog

4. **Version browser page** (Day 6)
   - Timeline view
   - Detail view
   - Comparison view
   - Navigation and routing

5. **Editor integration** (Day 7)
   - Version controls in toolbar
   - Auto-save implementation
   - Status change hooks
   - Version indicator

6. **Polish and testing** (Day 8)
   - Styling and animations
   - Responsive design
   - Performance optimization
   - Bug fixes and edge cases

## Future Enhancements

- **Branching**: Create alternate versions from any point
- **Merging**: Merge changes from different branches
- **Conflict resolution**: UI for resolving merge conflicts
- **Version tagging**: Tag important versions (e.g., "Submission v1")
- **Export version**: Download specific version as PDF/Word
- **Version analytics**: Charts showing writing progress over time
- **Collaborative editing**: Real-time co-editing with version control
- **Version comments**: Add comments on specific versions (meta-comments)

## Notes

- Follow existing patterns from `ProposalSectionVersion` and `DatasetVersion`
- Use existing notification system for version events
- Integrate with existing permission system
- Consider storage implications for large manuscripts
- Auto-save versions are convenience feature, not primary backup
- Manual versions are permanent historical record
- Milestone versions capture important state transitions
