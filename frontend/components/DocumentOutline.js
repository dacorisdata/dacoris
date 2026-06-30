'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  ChevronLeft as CollapseIcon,
  ChevronRight as ExpandIcon,
  Description as DocumentIcon,
  Add as AddIcon,
} from '@mui/icons-material';

const ACCENT = '#1ca7a1';

const SECTION_TEMPLATES = [
  'Abstract',
  'Introduction',
  'Literature Review',
  'Methodology',
  'Results',
  'Discussion',
  'Conclusion',
  'References',
];

export default function DocumentOutline({ editor, open, onToggle, accent = ACCENT }) {
  const [outline, setOutline] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionLevel, setSectionLevel] = useState(2);

  const extractOutline = () => {
    if (!editor) return;

    const headings = [];
    const doc = editor.state.doc;

    doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        headings.push({
          id: `heading-${pos}`,
          level: node.attrs.level,
          text: node.textContent,
          pos,
        });
      }
    });

    setOutline(headings);
  };

  useEffect(() => {
    if (!editor) return;

    extractOutline();

    const handleUpdate = () => extractOutline();

    editor.on('update', handleUpdate);
    editor.on('selectionUpdate', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
      editor.off('selectionUpdate', handleUpdate);
    };
  }, [editor]);

  const insertSection = (title, level = 2) => {
    if (!editor || !title.trim()) return false;

    const trimmed = title.trim();
    const exists = outline.some(
      h => h.text.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) return false;

    const { doc } = editor.state;
    const endPos = doc.content.size;
    const needsBreak = endPos > 0 && doc.lastChild?.textContent?.length > 0;

    const content = [];
    if (needsBreak) {
      content.push({ type: 'paragraph' });
    }
    content.push(
      { type: 'heading', attrs: { level }, content: [{ type: 'text', text: trimmed }] },
      { type: 'paragraph' },
    );

    if (endPos === 0) {
      editor.chain().focus().insertContent(content).run();
    } else {
      editor.chain().focus().insertContentAt(endPos, content).run();
    }

    const newPos = editor.state.doc.content.size - 1;
    editor.chain().focus().setTextSelection(newPos).run();
    return true;
  };

  const openAddDialog = () => {
    setSectionTitle('');
    setSectionLevel(2);
    setAddDialogOpen(true);
  };

  const handleCreateSection = () => {
    if (!sectionTitle.trim()) return;
    const ok = insertSection(sectionTitle, sectionLevel);
    if (ok) {
      setAddDialogOpen(false);
      setSectionTitle('');
    }
  };

  const handleTemplateClick = (template) => {
    setSectionTitle(template);
  };

  const handleHeadingClick = (heading) => {
    if (!editor) return;

    editor.commands.setTextSelection(heading.pos);
    editor.commands.focus();

    const { node } = editor.view.domAtPos(heading.pos);
    if (node) {
      const element = node.nodeType === 1 ? node : node.parentElement;
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    setActiveId(heading.id);
  };

  const getIndent = (level) => (level - 1) * 16;

  const getFontSize = (level) => {
    const sizes = { 1: 14, 2: 13, 3: 12, 4: 12, 5: 11, 6: 11 };
    return sizes[level] || 11;
  };

  const addSectionButton = (
    <Tooltip title="Add document section">
      <Button
        size="small"
        startIcon={<AddIcon sx={{ fontSize: 16 }} />}
        onClick={openAddDialog}
        sx={{
          textTransform: 'none',
          fontSize: 11,
          fontWeight: 600,
          py: 0.25,
          px: 1,
          minWidth: 0,
          color: accent,
          borderColor: `${accent}55`,
          '&:hover': { bgcolor: `${accent}10`, borderColor: accent },
        }}
        variant="outlined"
      >
        Add Section
      </Button>
    </Tooltip>
  );

  const addSectionDialog = (
    <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Add Document Section</DialogTitle>
      <DialogContent sx={{ pt: '8px !important' }}>
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>
          Inserts a heading at the end of the document with space below for content.
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
          {SECTION_TEMPLATES.map(template => {
            const used = outline.some(h => h.text.trim().toLowerCase() === template.toLowerCase());
            return (
              <Chip
                key={template}
                label={template}
                size="small"
                disabled={used}
                onClick={() => handleTemplateClick(template)}
                sx={{
                  fontSize: 11,
                  cursor: used ? 'default' : 'pointer',
                  bgcolor: sectionTitle === template ? `${accent}18` : undefined,
                  color: sectionTitle === template ? accent : undefined,
                  borderColor: sectionTitle === template ? accent : undefined,
                }}
                variant={sectionTitle === template ? 'filled' : 'outlined'}
              />
            );
          })}
        </Box>

        <TextField
          fullWidth
          size="small"
          label="Section title"
          value={sectionTitle}
          onChange={e => setSectionTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreateSection()}
          placeholder="e.g. Introduction"
          sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />

        <FormControl fullWidth size="small">
          <InputLabel>Heading level</InputLabel>
          <Select
            value={sectionLevel}
            label="Heading level"
            onChange={e => setSectionLevel(Number(e.target.value))}
            sx={{ borderRadius: 2 }}
          >
            {[1, 2, 3, 4, 5, 6].map(level => (
              <MenuItem key={level} value={level} sx={{ fontSize: 13 }}>
                Heading {level}{level === 2 ? ' (recommended)' : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {sectionTitle.trim() && outline.some(h => h.text.trim().toLowerCase() === sectionTitle.trim().toLowerCase()) && (
          <Typography sx={{ fontSize: 11, color: 'warning.main', mt: 1.5 }}>
            A section with this title already exists.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setAddDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleCreateSection}
          disabled={!sectionTitle.trim() || outline.some(h => h.text.trim().toLowerCase() === sectionTitle.trim().toLowerCase())}
          sx={{ bgcolor: accent, textTransform: 'none', borderRadius: 2, '&:hover': { bgcolor: '#0e8a85' } }}
        >
          Create Section
        </Button>
      </DialogActions>
    </Dialog>
  );

  if (!open) {
    return (
      <>
        <Box
          sx={{
            width: 48,
            bgcolor: 'background.paper',
            borderRight: 1,
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 2,
            gap: 1,
          }}
        >
          <IconButton onClick={onToggle} size="small">
            <ExpandIcon />
          </IconButton>
          <Tooltip title="Add section">
            <IconButton onClick={openAddDialog} size="small" sx={{ color: accent }}>
              <AddIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Box sx={{ mt: 1, transform: 'rotate(-90deg)', transformOrigin: 'center' }}>
            <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}>
              OUTLINE
            </Typography>
          </Box>
        </Box>
        {addSectionDialog}
      </>
    );
  }

  return (
    <>
      <Box
        sx={{
          width: 280,
          bgcolor: 'background.paper',
          borderRight: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <DocumentIcon sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 13 }} noWrap>
              Document Outline
            </Typography>
          </Box>
          <IconButton onClick={onToggle} size="small" sx={{ flexShrink: 0 }}>
            <CollapseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        <Box sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: 'divider' }}>
          {addSectionButton}
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
          {outline.length === 0 ? (
            <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 12 }}>
                No sections yet
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11, display: 'block', mt: 1, mb: 2 }}>
                Create sections to structure your manuscript
              </Typography>
              <Button
                size="small"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openAddDialog}
                sx={{ bgcolor: accent, textTransform: 'none', borderRadius: 2, '&:hover': { bgcolor: '#0e8a85' } }}
              >
                Add First Section
              </Button>
            </Box>
          ) : (
            <List dense disablePadding>
              {outline.map((heading) => (
                <ListItem
                  key={heading.id}
                  disablePadding
                  sx={{ pl: `${getIndent(heading.level) + 16}px` }}
                >
                  <ListItemButton
                    onClick={() => handleHeadingClick(heading)}
                    selected={activeId === heading.id}
                    sx={{
                      py: 0.5,
                      px: 1,
                      minHeight: 32,
                      borderRadius: 1,
                      mx: 0.5,
                      '&.Mui-selected': {
                        bgcolor: 'action.selected',
                        '&:hover': { bgcolor: 'action.selected' },
                      },
                    }}
                  >
                    <ListItemText
                      primary={heading.text || '(Empty heading)'}
                      primaryTypographyProps={{
                        sx: {
                          fontSize: getFontSize(heading.level),
                          fontWeight: heading.level <= 2 ? 600 : 400,
                          color: heading.text ? 'text.primary' : 'text.disabled',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        <Divider />
        <Box sx={{ px: 2, py: 1, bgcolor: 'background.default' }}>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
            {outline.length} {outline.length === 1 ? 'section' : 'sections'}
          </Typography>
        </Box>
      </Box>
      {addSectionDialog}
    </>
  );
}
