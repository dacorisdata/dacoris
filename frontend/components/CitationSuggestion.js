'use client';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Box, Paper, List, ListItem, ListItemButton, ListItemText, Typography, CircularProgress } from '@mui/material';
import { Article as ArticleIcon } from '@mui/icons-material';

const ACCENT = '#1ca7a1';

const CitationSuggestion = forwardRef((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublications();
  }, []);

  const fetchPublications = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
      const response = await fetch(`${apiBase}/publications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setPublications(data);
      }
    } catch (error) {
      console.error('Error fetching publications:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectItem = (index) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }

      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }

      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  if (!props.items || props.items.length === 0) {
    return (
      <Paper
        elevation={3}
        sx={{
          position: 'absolute',
          zIndex: 9999,
          minWidth: 500,
          maxWidth: 700,
          maxHeight: 400,
          overflow: 'hidden',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            {loading ? 'Loading publications...' : 'No publications found'}
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        zIndex: 9999,
        minWidth: 500,
        maxWidth: 700,
        maxHeight: 400,
        overflow: 'auto',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
        <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>
          SELECT CITATION
        </Typography>
      </Box>
      <List sx={{ p: 0 }}>
        {props.items.map((item, index) => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton
              selected={index === selectedIndex}
              onClick={() => selectItem(index)}
              sx={{
                py: 2,
                px: 2.5,
                bgcolor: index === selectedIndex ? `${ACCENT}15` : 'transparent',
                '&.Mui-selected': {
                  bgcolor: `${ACCENT}20`,
                  '&:hover': {
                    bgcolor: `${ACCENT}30`,
                  },
                },
              }}
            >
              <ListItemText
                primary={
                  <Typography sx={{ fontSize: 14, fontWeight: 600, lineHeight: 1.5, mb: 0.5 }}>
                    {item.title}
                  </Typography>
                }
                secondary={
                  <>
                    <Typography component="span" sx={{ fontSize: 12, color: 'text.secondary', display: 'block', mb: 0.4 }}>
                      {item.authors || 'Unknown author'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography component="span" sx={{ fontSize: 11, color: 'text.disabled', fontStyle: 'italic' }}>
                        {item.journal || 'Unknown journal'}
                      </Typography>
                      {item.year && (
                        <>
                          <Typography component="span" sx={{ fontSize: 11, color: 'text.disabled' }}>
                            •
                          </Typography>
                          <Typography component="span" sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 500 }}>
                            {item.year}
                          </Typography>
                        </>
                      )}
                    </Box>
                  </>
                }
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
        <Typography sx={{ fontSize: 10, color: 'text.secondary', textAlign: 'center' }}>
          Use ↑↓ to navigate, Enter to select
        </Typography>
      </Box>
    </Paper>
  );
});

CitationSuggestion.displayName = 'CitationSuggestion';

export default CitationSuggestion;
