# Citation Library - Quick Start Guide

## 🎯 What's New

Your manuscript editor now has a **Citation Library** that lets you:
- ✅ Cite publications from your library while writing
- ✅ Auto-generate bibliographies in APA, MLA, Chicago, or Harvard format
- ✅ Manage citations with a toggleable sidebar
- ✅ Track all citations in the database

## 🚀 Getting Started

### Step 1: Run Database Migration

```bash
cd backend
python migrations/add_manuscript_citations.py
```

This creates the `manuscript_citations` table.

### Step 2: Access the Editor

Navigate to: `https://rims.dacoris.com/researcher/manuscripts/{id}/editor`

### Step 3: Use Citations

1. **Click the citation icon** (📝) in the toolbar to open the sidebar
2. **Search for a publication** from your library
3. **Select citation style** (APA, MLA, Chicago, Harvard)
4. **Click the + button** to insert citation at cursor
5. **Bibliography auto-generates** at the end of your document

## 📚 Citation Styles

| Style | Inline Format | Bibliography Format |
|-------|--------------|---------------------|
| **APA** | (Smith, 2023) | Smith, J. (2023). Title. *Journal*. |
| **MLA** | (Smith) | Smith, John. "Title." *Journal*, 2023. |
| **Chicago** | [1] | 1. Smith, John. "Title." *Journal* (2023). |
| **Harvard** | (Smith 2023) | Smith, J. (2023) Title. *Journal*. |

## 🎨 Features

- **Right Sidebar**: Toggleable panel showing your publication library
- **Search**: Find publications by title, author, journal, or DOI
- **Cited Status**: See which publications are already cited
- **Auto-Update**: Bibliography updates automatically when you add/remove citations
- **Visual Feedback**: Citations are highlighted and clickable
- **Persistence**: All citations saved to database

## 🔧 API Endpoints

```
POST   /api/manuscripts/{id}/citations          - Add citation
GET    /api/manuscripts/{id}/citations          - List citations
DELETE /api/manuscripts/{id}/citations/{cid}    - Remove citation
PATCH  /api/manuscripts/{id}/citations/reorder  - Reorder citations
GET    /api/manuscripts/{id}/bibliography       - Get bibliography
```

## 📁 Files Created

### Backend
- `backend/models.py` - ManuscriptCitation model
- `backend/services/citation_service.py` - Citation formatting
- `backend/routes/manuscripts.py` - Citation endpoints
- `backend/migrations/add_manuscript_citations.py` - Migration

### Frontend
- `frontend/lib/tiptap-citation-extension.js` - TipTap extension
- `frontend/components/CitationSidebar.js` - Sidebar UI
- `frontend/components/BibliographyManager.js` - Bibliography manager
- `frontend/app/researcher/manuscripts/[id]/editor/page.js` - Updated
- `frontend/app/researcher/manuscripts/[id]/editor/editor.css` - Updated

## 🐛 Troubleshooting

**Citations not appearing?**
- Make sure you've run the migration
- Check that publications exist in your library at `/researcher/publications/library`

**Bibliography not updating?**
- Citations must be saved to the database first
- Check browser console for API errors

**Sidebar not opening?**
- Click the citation icon (📝) in the toolbar
- Check that the frontend components are properly imported

## 💡 Tips

- Use **Ctrl+S** to save your manuscript and citations
- Switch citation styles anytime - bibliography auto-updates
- Citations are highlighted in teal color for easy identification
- Click on a citation to see publication details
- The bibliography appears at the end with a "References" heading

## 📞 Support

For issues or questions, check:
- Implementation details: `.planning/CITATION_LIBRARY_IMPLEMENTATION.md`
- API documentation: Backend routes in `routes/manuscripts.py`
- Frontend components: `components/CitationSidebar.js`
