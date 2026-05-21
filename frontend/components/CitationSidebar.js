'use client';
import { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, TextField, InputAdornment, IconButton, Chip,
  List, ListItem, ListItemButton, ListItemText, Divider, CircularProgress,
  Tooltip, Select, MenuItem, FormControl, InputLabel, Badge,
} from '@mui/material';
import {
  Search as SearchIcon, Close as CloseIcon, Article as ArticleIcon,
  Add as AddIcon, Check as CheckIcon, FormatQuote as QuoteIcon,
} from '@mui/icons-material';

const ACCENT = '#1ca7a1';

export default function CitationSidebar({
  open,
  onClose,
  manuscriptId,
  onInsertCitation,
  citationStyle,
  onStyleChange,
  existingCitations = [],
}) {
  const [publications, setPublications] = useState([]);
  const [libraries, setLibraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLibrary, setSelectedLibrary] = useState('all');

  useEffect(() => {
    if (open) {
      fetchLibraries();
      fetchPublications();
    }
  }, [open]);

  const fetchLibraries = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
      const response = await fetch(
        `${apiBase}/publications/libraries`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        console.log('📚 Libraries fetched:', data);
        setLibraries(data);
      } else {
        console.error('Failed to fetch libraries:', response.status);
      }
    } catch (error) {
      console.error('Error fetching libraries:', error);
    }
  };

  const fetchPublications = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
      const response = await fetch(
        `${apiBase}/publications`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        console.log('📄 Publications fetched:', data);
        const transformedPubs = data.map((pub) => ({
          id: pub.id,
          title: pub.title,
          authors: pub.authors || 'Unknown',
          journal: pub.journal || 'Unknown',
          year: pub.year,
          doi: pub.doi || '',
          library_id: pub.library_id,
          library_name: pub.library_name || 'Uncategorized',
        }));
        console.log('📄 Transformed publications:', transformedPubs);
        setPublications(transformedPubs);
      } else {
        console.error('Failed to fetch publications:', response.status);
      }
    } catch (error) {
      console.error('Error fetching publications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInsertCitation = async (publication) => {
    // Check if already cited
    const alreadyCited = existingCitations.some(c => c.publication_id === publication.id);
    if (alreadyCited) {
      console.log('⚠️ Publication already cited:', publication.title);
      alert('This publication is already cited in your document. Check your editor for the existing citation.');
      return;
    }

    console.log('➕ Adding citation for:', publication.title);

    try {
      const token = localStorage.getItem('token');
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
      const response = await fetch(
        `${apiBase}/manuscripts/${manuscriptId}/citations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            publication_id: publication.id,
            citation_style: citationStyle,
          }),
        }
      );

      if (response.ok) {
        const citation = await response.json();
        console.log('✅ Citation created:', citation);
        onInsertCitation(citation);
      } else {
        const error = await response.json();
        console.error('❌ Citation error:', error);
        if (error.detail && error.detail.includes('already exists')) {
          // Citation exists in DB but not in editor state - still insert it
          console.log('⚠️ Citation exists in DB, fetching and inserting...');
          // Try to fetch existing citations and find this one
          const citationsResponse = await fetch(
            `${apiBase}/manuscripts/${manuscriptId}/citations`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          if (citationsResponse.ok) {
            const allCitations = await citationsResponse.json();
            const existingCitation = allCitations.find(c => c.publication_id === publication.id);
            if (existingCitation) {
              console.log('📌 Inserting existing citation:', existingCitation);
              onInsertCitation(existingCitation);
            }
          }
        } else {
          alert(error.detail || 'Failed to add citation. Please try again.');
        }
      }
    } catch (error) {
      console.error('❌ Network error adding citation:', error);
      alert('Network error. Please check your connection and try again.');
    }
  };

  const isCited = (publicationId) => {
    return existingCitations.some((c) => c.publication_id === publicationId);
  };

  const filteredPublications = publications.filter((pub) => {
    const matchesSearch =
      searchQuery === '' ||
      pub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pub.authors.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pub.journal.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLibrary =
      selectedLibrary === 'all' || pub.library_id === selectedLibrary;

    return matchesSearch && matchesLibrary;
  });

  const groupedPublications = {};
  filteredPublications.forEach((pub) => {
    const libName = pub.library_name || 'Uncategorized';
    if (!groupedPublications[libName]) {
      groupedPublications[libName] = [];
    }
    groupedPublications[libName].push(pub);
  });

  console.log('🔍 Filtered publications:', filteredPublications.length);
  console.log('📁 Grouped publications:', groupedPublications);

  if (!open) return null;

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        right: 0,
        top: 0,
        height: '100vh',
        width: 400,
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 0,
        borderLeft: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: ACCENT,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QuoteIcon sx={{ fontSize: 20 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>Citation Library</Typography>
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography sx={{ fontSize: 11, opacity: 0.9 }}>
          {existingCitations.length} citation{existingCitations.length !== 1 ? 's' : ''} in document
        </Typography>
      </Box>

      {/* Citation Style Selector */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <FormControl fullWidth size="small">
          <InputLabel sx={{ fontSize: 13 }}>Citation Style</InputLabel>
          <Select
            value={citationStyle}
            onChange={(e) => onStyleChange(e.target.value)}
            label="Citation Style"
            sx={{ fontSize: 13 }}
          >
            <MenuItem value="APA">APA</MenuItem>
            <MenuItem value="MLA">MLA</MenuItem>
            <MenuItem value="Chicago">Chicago</MenuItem>
            <MenuItem value="Harvard">Harvard</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Library Filter */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <FormControl fullWidth size="small">
          <InputLabel sx={{ fontSize: 13 }}>Filter by Library</InputLabel>
          <Select
            value={selectedLibrary}
            onChange={(e) => setSelectedLibrary(e.target.value)}
            label="Filter by Library"
            sx={{ fontSize: 13 }}
          >
            <MenuItem value="all">All Libraries</MenuItem>
            {libraries.map((lib) => (
              <MenuItem key={lib.id} value={lib.id}>
                {lib.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Search */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search publications..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
      </Box>

      {/* Publications List - Grouped by Library */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress size={32} sx={{ color: ACCENT }} />
          </Box>
        ) : filteredPublications.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
            <ArticleIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              {searchQuery ? 'No publications match your search' : 'No publications in your library'}
            </Typography>
          </Box>
        ) : (
          <Box>
            {Object.entries(groupedPublications).map(([libraryName, pubs]) => (
              <Box key={libraryName}>
                {/* Library Header */}
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    bgcolor: 'background.default',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                  }}
                >
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>
                    {libraryName} ({pubs.length})
                  </Typography>
                </Box>

                {/* Publications in this library */}
                <List sx={{ p: 0 }}>
                  {pubs.map((pub, index) => {
              const cited = isCited(pub.id);
              return (
                <Box key={pub.id}>
                  {index > 0 && <Divider />}
                  <ListItem
                    disablePadding
                    secondaryAction={
                      cited ? (
                        <Chip
                          icon={<CheckIcon sx={{ fontSize: 14 }} />}
                          label="Cited"
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: 10,
                            bgcolor: `${ACCENT}20`,
                            color: ACCENT,
                            fontWeight: 600,
                          }}
                        />
                      ) : (
                        <Tooltip title="Insert citation">
                          <IconButton
                            size="small"
                            onClick={() => handleInsertCitation(pub)}
                            sx={{
                              color: ACCENT,
                              '&:hover': { bgcolor: `${ACCENT}10` },
                            }}
                          >
                            <AddIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      )
                    }
                  >
                    <ListItemButton
                      onClick={() => !cited && handleInsertCitation(pub)}
                      disabled={cited}
                      sx={{
                        py: 1.5,
                        px: 2,
                        '&:hover': {
                          bgcolor: cited ? 'transparent' : `${ACCENT}05`,
                        },
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography
                            sx={{
                              fontSize: 13,
                              fontWeight: 600,
                              lineHeight: 1.4,
                              mb: 0.5,
                              pr: 6,
                            }}
                          >
                            {pub.title}
                          </Typography>
                        }
                        secondary={
                          <>
                            <Typography
                              component="span"
                              sx={{ fontSize: 11, color: 'text.secondary', display: 'block', mb: 0.3 }}
                            >
                              {pub.authors}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                              <Typography
                                component="span"
                                sx={{ fontSize: 10, color: 'text.disabled', fontStyle: 'italic' }}
                              >
                                {pub.journal}
                              </Typography>
                              <Typography component="span" sx={{ fontSize: 10, color: 'text.disabled' }}>
                                •
                              </Typography>
                              <Typography component="span" sx={{ fontSize: 10, color: 'text.disabled' }}>
                                {pub.year}
                              </Typography>
                            </Box>
                          </>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                </Box>
              );
            })}
                </List>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          p: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.default',
        }}
      >
        <Typography sx={{ fontSize: 11, color: 'text.secondary', textAlign: 'center' }}>
          Click <strong>+</strong> to insert citation at cursor
        </Typography>
      </Box>
    </Paper>
  );
}
