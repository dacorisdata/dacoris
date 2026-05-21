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
  Collapse,
} from '@mui/material';
import {
  ChevronLeft as CollapseIcon,
  ChevronRight as ExpandIcon,
  Description as DocumentIcon,
} from '@mui/icons-material';

export default function DocumentOutline({ editor, open, onToggle }) {
  const [outline, setOutline] = useState([]);
  const [activeId, setActiveId] = useState(null);

  // Extract headings from editor content
  const extractOutline = () => {
    if (!editor) return;

    const headings = [];
    const doc = editor.state.doc;

    doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        const level = node.attrs.level;
        const text = node.textContent;
        const id = `heading-${pos}`;
        
        headings.push({
          id,
          level,
          text,
          pos,
        });
      }
    });

    setOutline(headings);
  };

  // Update outline when editor content changes
  useEffect(() => {
    if (!editor) return;

    extractOutline();

    const handleUpdate = () => {
      extractOutline();
    };

    editor.on('update', handleUpdate);
    editor.on('selectionUpdate', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
      editor.off('selectionUpdate', handleUpdate);
    };
  }, [editor]);

  // Scroll to heading when clicked
  const handleHeadingClick = (heading) => {
    if (!editor) return;

    // Set selection to the heading
    editor.commands.setTextSelection(heading.pos);
    editor.commands.focus();

    // Scroll heading into view
    const { node } = editor.view.domAtPos(heading.pos);
    if (node) {
      const element = node.nodeType === 1 ? node : node.parentElement;
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    setActiveId(heading.id);
  };

  // Get indent level based on heading level
  const getIndent = (level) => {
    return (level - 1) * 16;
  };

  // Get font size based on heading level
  const getFontSize = (level) => {
    const sizes = {
      1: 14,
      2: 13,
      3: 12,
      4: 12,
      5: 11,
      6: 11,
    };
    return sizes[level] || 11;
  };

  if (!open) {
    return (
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
        }}
      >
        <IconButton onClick={onToggle} size="small">
          <ExpandIcon />
        </IconButton>
        <Box sx={{ mt: 2, transform: 'rotate(-90deg)', transformOrigin: 'center' }}>
          <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}>
            OUTLINE
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
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
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DocumentIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 13 }}>
            Document Outline
          </Typography>
        </Box>
        <IconButton onClick={onToggle} size="small">
          <CollapseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* Outline List */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        {outline.length === 0 ? (
          <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 12 }}>
              No headings in document
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11, display: 'block', mt: 1 }}>
              Add headings to see the outline
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {outline.map((heading) => (
              <ListItem
                key={heading.id}
                disablePadding
                sx={{
                  pl: `${getIndent(heading.level) + 16}px`,
                }}
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
                      '&:hover': {
                        bgcolor: 'action.selected',
                      },
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

      {/* Footer Info */}
      <Divider />
      <Box sx={{ px: 2, py: 1, bgcolor: 'background.default' }}>
        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
          {outline.length} {outline.length === 1 ? 'heading' : 'headings'}
        </Typography>
      </Box>
    </Box>
  );
}
