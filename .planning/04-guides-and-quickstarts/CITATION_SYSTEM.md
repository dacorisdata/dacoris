# Citation System Documentation

## Overview

The manuscript editor now supports comprehensive citation management with inline citation insertion, cite-as-you-write functionality, and automatic reference list generation.

## Features Implemented

### 1. Inline Citation Insertion

When you click the insert button from the Citation Sidebar, citations are inserted directly into your text at the current cursor position.

**Example:**
```
Original text: "The quick brown fox jumped over the lazy dog"
After inserting citation: "The quick brown fox jumped over the lazy dog (Smith, 2026)"
```

The citation format depends on the selected citation style:
- **APA**: (Author, Year)
- **MLA**: (Author)
- **Chicago**: [Number]
- **Harvard**: (Author Year)

### 2. Cite-As-You-Write

You can insert citations without leaving your text editor by typing `@` followed by the author name or publication title.

**How to use:**

1. While typing your manuscript, type `@` to trigger the citation suggestion
2. Start typing the author's name or part of the publication title
3. A dropdown menu will appear showing matching publications from your library
4. Use arrow keys (↑↓) to navigate through the suggestions
5. Press `Enter` to insert the selected citation
6. The citation will be inserted inline at your cursor position

**Example workflow:**
```
Type: "Recent studies on climate change @smith"
Dropdown appears showing publications by Smith
Select the one you want → Press Enter
Result: "Recent studies on climate change (Smith, 2024)"
```

**Tips:**
- Type more characters to narrow down the search (e.g., `@smith climate`)
- The search filters by both author name and publication title
- Press `Escape` to close the dropdown without inserting

### 3. Auto-Generated Reference List

The reference list is automatically generated at the bottom of your manuscript whenever you insert a citation.

**Key features:**
- **No duplicates**: Each publication appears only once in the reference list
- **Automatic updates**: Reference list updates when you add or remove citations
- **Proper formatting**: References are formatted according to your selected citation style
- **Always at the end**: The reference list is always placed at the end of your document

### 4. Citation Styles

Four major citation styles are supported:

#### APA (American Psychological Association)
- **Inline**: (Author, Year)
- **Reference**: Author, A. A. (Year). Title of work. Journal Name, Volume(Issue), pages. DOI

#### MLA (Modern Language Association)
- **Inline**: (Author)
- **Reference**: Author. "Title of Article." Journal Name, vol. Volume, no. Issue, Year, pages.

#### Chicago (Chicago Manual of Style)
- **Inline**: [1], [2], [3]...
- **Reference**: Author. "Title of Article." Journal Name Volume, no. Issue (Year): pages.

#### Harvard
- **Inline**: (Author Year)
- **Reference**: Author, A. (Year) 'Title of article', Journal Name, Volume(Issue), pages.

### 5. Visual Indicators

Citations in the text are styled with:
- Light teal background (#1ca7a115)
- Teal border (#1ca7a130)
- Slightly bolder text (600 weight)
- Hover effect for better visibility
- Clickable for easy identification

## How to Use

### Method 1: Using the Citation Sidebar

1. Click the **citation icon** (quote icon) in the toolbar to open the Citation Sidebar
2. Browse or search for the publication you want to cite
3. Click the **+** button next to the publication
4. The citation will be inserted at your current cursor position

### Method 2: Cite-As-You-Write

1. Place your cursor where you want the citation
2. Type `@` followed by the author's name or publication title
3. Select from the dropdown suggestions
4. Press `Enter` to insert

### Changing Citation Style

1. Open the Citation Sidebar
2. Use the **Citation Style** dropdown at the top
3. Select your preferred style (APA, MLA, Chicago, Harvard)
4. All citations and the reference list will update automatically

## Technical Details

### Components

1. **CitationSidebar.js**
   - Displays publication library
   - Handles citation insertion from sidebar
   - Filters publications by library and search query

2. **CitationSuggestion.js**
   - Provides the dropdown interface for cite-as-you-write
   - Keyboard navigation support
   - Real-time filtering based on user input

3. **BibliographyManager.js**
   - Automatically generates and updates the reference list
   - Ensures no duplicate entries
   - Removes bibliography when all citations are deleted
   - Debounces updates to improve performance

4. **tiptap-citation-extension.js**
   - Custom TipTap extension for citations
   - Integrates with TipTap's suggestion plugin
   - Handles citation node rendering

### Backend Integration

The system integrates with backend endpoints:

- `GET /api/publications` - Fetch user's publication library
- `POST /api/manuscripts/{id}/citations` - Create new citation
- `GET /api/manuscripts/{id}/citations` - Get all citations in manuscript
- `GET /api/manuscripts/{id}/bibliography?style={style}` - Generate formatted bibliography

### Citation Data Model

Each citation contains:
```json
{
  "id": "citation-uuid",
  "manuscript_id": "manuscript-uuid",
  "publication_id": "publication-uuid",
  "citation_key": "author2024keyword",
  "citation_style": "APA",
  "order": 1,
  "publication": {
    "id": "publication-uuid",
    "title": "Publication Title",
    "authors": "Author, A.; Co-author, B.",
    "journal": "Journal Name",
    "year": 2024,
    "doi": "10.xxxx/xxxxx"
  }
}
```

## Best Practices

1. **Add publications to your library first**: Make sure your publications are in your library before writing
2. **Choose citation style early**: Select your citation style before inserting citations to maintain consistency
3. **Use cite-as-you-write**: It's faster than switching to the sidebar repeatedly
4. **Let the system manage the reference list**: Don't manually edit the References section - it's auto-generated

## Troubleshooting

### Citation not appearing?
- Check that you have publications in your library
- Ensure the publication hasn't already been cited
- Verify your cursor is in a text area (not in a heading or code block)

### Reference list not updating?
- The system debounces updates by 500ms for performance
- Save your manuscript to trigger a refresh
- Try closing and reopening the document

### Dropdown not showing when typing @?
- Make sure you have publications in your library
- Try typing more characters to narrow the search
- Check that JavaScript is enabled

### Duplicate citations appearing?
- The system prevents duplicates automatically
- If you see duplicates, try refreshing the page
- Check the backend citations endpoint

## Future Enhancements

Planned features for future releases:

1. **Multiple trigger characters**: Support for `cite:` in addition to `@`
2. **Citation editing**: Click on a citation to edit its style or remove it
3. **Footnotes and endnotes**: Support for footnote-style citations
4. **Import from BibTeX**: Import citations from .bib files
5. **Citation groups**: Cite multiple sources at once (Author1, 2024; Author2, 2025)
6. **In-text vs. parenthetical**: Choose citation placement style
7. **Custom citation styles**: Create and save custom citation formats
8. **Citation preview**: Hover over citations to see full reference details
9. **Smart citation suggestions**: AI-powered suggestions based on context

## Dependencies

- TipTap Editor v2.27.2
- @tiptap/extension-mathematics v2.27.2
- @tiptap/suggestion v2.1.13
- tippy.js v6.3.7

## Support

For issues or questions about the citation system:
1. Check this documentation
2. Review the console logs in your browser developer tools
3. Contact the development team
4. Submit an issue in the project repository

---

**Last Updated**: May 22, 2026
**Version**: 1.0.0
