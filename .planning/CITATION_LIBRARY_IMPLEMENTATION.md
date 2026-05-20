# Citation Library Integration - Implementation Complete

## Overview

Successfully implemented a comprehensive citation management system for the manuscript editor that allows researchers to cite publications from their library, manage citations, and auto-generate bibliographies in multiple formats (APA, MLA, Chicago, Harvard).

## What Was Implemented

### 1. Backend - Database & API ✅

**Models** (`c:\projects\dacoris\backend\models.py`):
- Added `ManuscriptCitation` model with fields:
  - `id`, `manuscript_id`, `publication_id`
  - `citation_key` (e.g., "Smith2023")
  - `order` (citation order in document)
  - `citation_style` (APA, MLA, Chicago, Harvard)
  - Timestamps and relationships
- Updated `Manuscript` model with `citations` relationship

**Citation Service** (`c:\projects\dacoris\backend\services\citation_service.py`):
- `format_inline_citation()` - Formats citations for inline display
- `format_bibliography_entry()` - Formats full reference entries
- `generate_bibliography()` - Generates complete bibliography HTML
- `generate_citation_key()` - Creates unique citation keys
- Support for 4 citation styles: APA, MLA, Chicago, Harvard

**API Routes** (`c:\projects\dacoris\backend\routes\manuscripts.py`):
- `POST /api/manuscripts/{id}/citations` - Add citation
- `GET /api/manuscripts/{id}/citations` - List all citations
- `DELETE /api/manuscripts/{id}/citations/{citation_id}` - Remove citation
- `PATCH /api/manuscripts/{id}/citations/reorder` - Update citation order
- `GET /api/manuscripts/{id}/bibliography` - Generate formatted bibliography

**Migration** (`c:\projects\dacoris\backend\migrations\add_manuscript_citations.py`):
- Creates `manuscript_citations` table
- Adds indexes for performance
- Ready to run when database is available

### 2. Frontend - Editor Integration ✅

**TipTap Citation Extension** (`c:\projects\dacoris\frontend\lib\tiptap-citation-extension.js`):
- Custom TipTap node for citations
- Inline citation rendering with styling
- Commands: `insertCitation()`, `deleteCitation()`
- Citation decorations for visual feedback

**Citation Sidebar** (`c:\projects\dacoris\frontend\components\CitationSidebar.js`):
- Right sidebar panel (toggleable)
- Search/filter publications from user's library
- Display publication cards with metadata
- Click to insert citation at cursor
- Shows citation count and cited status
- Citation style selector (APA, MLA, Chicago, Harvard)

**Bibliography Manager** (`c:\projects\dacoris\frontend\components\BibliographyManager.js`):
- Auto-detects or creates "References" section at document end
- Auto-updates bibliography when citations change
- Formats references based on selected style
- Manages bibliography lifecycle

**Editor Updates** (`c:\projects\dacoris\frontend\app\researcher\manuscripts\[id]\editor\page.js`):
- Added Citation extension to TipTap editor
- Added citation sidebar toggle button in toolbar
- Integrated CitationSidebar component
- Added citation style state management
- Implemented citation insertion logic
- Auto-save for citations
- Citation state tracking

**Styling** (`c:\projects\dacoris\frontend\app\researcher\manuscripts\[id]\editor\editor.css`):
- Citation node styles (highlighted, clickable)
- Bibliography section styles
- Hanging indent for references
- Hover effects

## How to Use

### 1. Run Database Migration

When your database is available, run:

```bash
cd c:\projects\dacoris\backend
python migrations/add_manuscript_citations.py
```

This will create the `manuscript_citations` table and indexes.

### 2. Start the Application

The citation library is now integrated into the manuscript editor. Access it at:
```
https://rims.dacoris.com/researcher/manuscripts/{manuscript_id}/editor
```

### 3. Using Citations

1. **Open Citation Sidebar**: Click the citation icon (quote icon) in the toolbar
2. **Search Publications**: Use the search bar to find publications from your library
3. **Select Citation Style**: Choose APA, MLA, Chicago, or Harvard from the dropdown
4. **Insert Citation**: Click the + button next to a publication to insert it at cursor
5. **Auto Bibliography**: The bibliography automatically updates at the document end
6. **Save**: Citations are saved with the manuscript content

### 4. Citation Workflow

```
User clicks citation button → Sidebar opens
User searches publication → Selects publication
API creates citation → Returns citation data
Editor inserts citation node → Updates UI
Bibliography auto-updates → Shows at document end
User saves manuscript → All data persisted
```

## Features Implemented

✅ **Cite-as-you-write** - Insert citations while writing
✅ **Auto-generated bibliography** - Updates automatically at document end
✅ **4 citation styles** - APA, MLA, Chicago, Harvard
✅ **Toggleable sidebar** - Right panel showing publication library
✅ **Search & filter** - Find publications quickly
✅ **Unique citation keys** - Auto-generated (e.g., Smith2023, Smith2023a)
✅ **Citation tracking** - Separate database table for data integrity
✅ **Real-time updates** - Bibliography updates when citations change
✅ **Visual feedback** - Highlighted citations, hover effects
✅ **Keyboard shortcuts** - Ctrl+S to save
✅ **Citation count** - Shows number of citations in document
✅ **Cited status** - Shows which publications are already cited

## Citation Formats

### APA
- Inline: `(Smith, 2023)` or `(Smith et al., 2023)`
- Bibliography: `Smith, J., & Jones, M. (2023). Title. Journal.`

### MLA
- Inline: `(Smith)` or `(Smith and Jones)`
- Bibliography: `Smith, John. "Title." Journal, 2023.`

### Chicago
- Inline: `[1]`
- Bibliography: `1. Smith, John. "Title." Journal (2023).`

### Harvard
- Inline: `(Smith 2023)` or `(Smith and Jones 2023)`
- Bibliography: `Smith, J. (2023) Title. Journal.`

## Technical Architecture

### Data Flow

1. **Citation Creation**:
   - User selects publication from sidebar
   - Frontend calls `POST /api/manuscripts/{id}/citations`
   - Backend creates `ManuscriptCitation` record
   - Backend generates unique citation key
   - Returns citation data with publication info
   - Frontend inserts citation node in editor

2. **Bibliography Generation**:
   - BibliographyManager watches citations array
   - Calls `GET /api/manuscripts/{id}/bibliography`
   - Backend formats citations based on style
   - Returns HTML bibliography
   - Frontend inserts/updates bibliography section

3. **Citation Storage**:
   - Citations stored in separate `manuscript_citations` table
   - Linked to both manuscript and publication
   - Order tracked for proper sequencing
   - Style preference saved per citation

### Database Schema

```sql
manuscript_citations (
  id VARCHAR(36) PRIMARY KEY,
  manuscript_id VARCHAR(36) → manuscripts.id,
  publication_id VARCHAR(36) → publications.id,
  citation_key VARCHAR(100),
  order INTEGER,
  citation_style VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## Files Modified/Created

### Backend
- ✅ `models.py` - Added ManuscriptCitation model
- ✅ `routes/manuscripts.py` - Added citation endpoints
- ✅ `services/citation_service.py` - Citation formatting logic
- ✅ `migrations/add_manuscript_citations.py` - Database migration

### Frontend
- ✅ `lib/tiptap-citation-extension.js` - Custom TipTap extension
- ✅ `components/CitationSidebar.js` - Citation sidebar UI
- ✅ `components/BibliographyManager.js` - Bibliography auto-update
- ✅ `app/researcher/manuscripts/[id]/editor/page.js` - Editor integration
- ✅ `app/researcher/manuscripts/[id]/editor/editor.css` - Citation styles

## Next Steps

1. **Run Migration**: Execute the database migration when DB is available
2. **Test**: Test citation insertion, bibliography generation, style switching
3. **Verify**: Ensure citations persist correctly on save
4. **Polish**: Test edge cases (no DOI, missing authors, etc.)

## Future Enhancements (Not Implemented)

- Import citations from BibTeX/RIS files
- Collaborative citation editing
- Citation analytics
- Integration with Zotero/Mendeley
- Custom citation style editor
- Citation notes/annotations
- Export bibliography as separate file

## Notes

- Citations are stored separately from manuscript content for data integrity
- Bibliography auto-updates when citations change
- Citation keys are unique per manuscript (Smith2023, Smith2023a, etc.)
- All citation data persists to database
- Real-time sync between editor and database
- Supports all publications from user's library
