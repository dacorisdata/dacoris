# DACORIS Theme System

## Color Palette

### Primary Colors
- **Primary Main**: `#0b3c5d` - Deep blue for main UI elements
- **Primary Light**: `#1fa6a0` - Teal accent color
- **Primary Dark**: `#0a1f33` - Very dark blue for text and emphasis

### Secondary Colors
- **Secondary Main**: `#1fa6a0` - Teal for highlights and interactive elements

## Typography System

### Font Families

1. **Primary (UI)**: System sans-serif stack
   - Used for: Navigation, cards, CRM data, general UI
   - Stack: Inter, UI Sans, Segoe UI, Roboto, Arial

2. **Manuscript (Writing Lab)**: System serif stack
   - Used for: Document editor, academic content
   - Stack: Georgia, Times New Roman, Times
   - Apply with: `fontFamily: theme.typography.fontFamilySerif`

3. **Technical**: Monospace
   - Used for: DOIs, IDs, code
   - Stack: Courier New, Courier
   - Apply with: `fontFamily: theme.typography.fontFamilyMono`

### Typography Variants

| Variant | Size | Weight | Use Case |
|---------|------|--------|----------|
| `h1` | 24px | 900 (Black) | Page titles, main headings |
| `h2` | 18px | 700 (Bold) | Document titles, lead names |
| `h3` | 14px | 700 (Bold) | Card headers, section titles |
| `body1` | 14px | 500 (Medium) | Standard body text, lists, buttons |
| `body2` | 12px | 500 (Medium) | Supporting text, timestamps |
| `caption` | 10px | 900 (Black) | Field labels (uppercase) |
| `overline` | 9px | 700 (Bold) | Status badges, metadata |
| `button` | 14px | 900 (Black) | Button text |

### Special Styling

- **Uppercase Labels**: Use `variant="caption"` for field labels with automatic uppercase and wide tracking
- **Tighter Tracking**: h1 uses `letterSpacing: '-0.02em'` for compact, modern look
- **Wide Tracking**: caption and overline use wider letter spacing for readability at small sizes

## Usage Examples

### Page Title
```jsx
<Typography variant="h1">Research Overview</Typography>
```

### Card Header
```jsx
<Typography variant="h3">Project Details</Typography>
```

### Field Label
```jsx
<Typography variant="caption">Institution Name</Typography>
```

### Badge/Status
```jsx
<Typography variant="overline">Active</Typography>
```

### Manuscript Editor
```jsx
<TextField
  multiline
  sx={{
    '& .MuiInputBase-input': {
      fontFamily: theme.typography.fontFamilySerif,
      fontSize: '18px',
      lineHeight: 1.8,
    }
  }}
/>
```

### Technical ID/DOI
```jsx
<Typography sx={{ fontFamily: 'fontFamilyMono' }}>
  DOI: 10.1234/example
</Typography>
```

## Component Customization

All MUI components are pre-configured with:
- Rounded corners (8-12px)
- Consistent shadows
- Theme-aware colors
- Typography system integration

Access theme in components:
```jsx
import { useTheme } from '@mui/material/styles';

const theme = useTheme();
// Use: theme.palette.primary.main, theme.typography.h1, etc.
```
