'use client';
import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Paper, TextField, InputAdornment, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
  Chip, Menu, MenuItem, Checkbox, Dialog, DialogTitle, DialogContent, DialogActions,
  useTheme, Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon, Add as AddIcon, FilterList as FilterIcon,
  MoreVert as MoreIcon, Delete as DeleteIcon, Edit as EditIcon,
  CloudUpload as UploadIcon, Article as ArticleIcon, GetApp as ExportIcon,
  Visibility as ViewIcon, Star as StarIcon, StarBorder as StarBorderIcon,
} from '@mui/icons-material';

const ACCENT = '#1ca7a1';

// Mock publication data
const MOCK_LIBRARY = [
  { id: 1, title: 'Large-scale genome-wide association study of food addiction', authors: 'Cornelis MC, et al.', journal: 'Nature Medicine', year: 2022, doi: '10.1038/s41591-022-01450-2', source: 'PubMed', type: 'Journal Article', citations: 145, starred: false, tags: ['Genomics', 'Addiction'] },
  { id: 2, title: 'The architectural basis of academic research environments', authors: 'Henderson, P.', journal: 'Science Architecture', year: 2023, doi: '10.1126/sciadv.abc1234', source: 'PubMed', type: 'Journal Article', citations: 23, starred: true, tags: ['Architecture'] },
  { id: 3, title: 'Open Access and the future of Scholarly Communication', authors: 'Smith, L., Roberts, J.', journal: 'Journal of Informetrics', year: 2024, doi: '10.1016/j.joi.2024.101234', source: 'PubMed', type: 'Review', citations: 8, starred: false, tags: ['Open Access', 'Publishing'] },
  { id: 4, title: 'CRISPR-Cas9 Gene Editing in Human Clinical Trials', authors: 'Zhang, F., Doudna, J.', journal: 'NEJM', year: 2021, doi: '10.1056/NEJMra2034289', source: 'Crossref', type: 'Journal Article', citations: 892, starred: true, tags: ['CRISPR', 'Gene Editing'] },
  { id: 5, title: 'Machine learning approaches in genomic medicine', authors: 'Kumar, S., et al.', journal: 'Nature Reviews Genetics', year: 2023, doi: '10.1038/s41576-023-00567-4', source: 'Crossref', type: 'Review', citations: 234, starred: false, tags: ['Machine Learning', 'Genomics'] },
  { id: 6, title: 'Climate change impacts on agricultural productivity in Sub-Saharan Africa', authors: 'Ochieng, J., et al.', journal: 'Environmental Research Letters', year: 2023, doi: '10.1088/1748-9326/abc123', source: 'OpenAlex', type: 'Journal Article', citations: 67, starred: false, tags: ['Climate', 'Agriculture'] },
  { id: 7, title: 'Digital health interventions for maternal care in low-resource settings', authors: 'Njoroge, G., Kamau, M.', journal: 'The Lancet Digital Health', year: 2024, doi: '10.1016/S2589-7500(24)00012-3', source: 'OpenAlex', type: 'Journal Article', citations: 12, starred: true, tags: ['Digital Health', 'Maternal Care'] },
  { id: 8, title: 'Antibiotic resistance mechanisms in Gram-negative bacteria', authors: 'Odhiambo, A., et al.', journal: 'Microbiology Reviews', year: 2022, doi: '10.1128/MMBR.00045-21', source: 'Zotero', type: 'Review', citations: 178, starred: false, tags: ['Antibiotics', 'Microbiology'] },
];

export default function PublicationLibraryPage() {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentPub, setCurrentPub] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  const handleMenuOpen = (event, pub) => {
    setAnchorEl(event.currentTarget);
    setCurrentPub(pub);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setCurrentPub(null);
  };

  const toggleSelectAll = () => {
    if (selected.length === filteredPubs.length) {
      setSelected([]);
    } else {
      setSelected(filteredPubs.map(p => p.id));
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredPubs = publications.filter(p =>
    searchQuery === '' ||
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.authors.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.journal.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.doi.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedPubs = filteredPubs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Fetch publications from backend
  useEffect(() => {
    fetchPublications();
  }, []);

  const fetchPublications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/publications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Transform backend data to frontend format
        const transformedPubs = data.map(pub => ({
          id: pub.id,
          title: pub.title,
          authors: pub.authors,
          journal: pub.journal || 'Unknown',
          year: pub.year,
          doi: pub.doi || '',
          source: pub.source || 'Unknown',
          type: pub.publication_type || 'Journal Article',
          citations: pub.citation_count || 0,
          starred: pub.starred || false,
          tags: pub.tags ? JSON.parse(pub.tags) : [],
        }));
        setPublications(transformedPubs);
      }
    } catch (error) {
      console.error('Error fetching publications:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStar = async (id) => {
    try {
      const pub = publications.find(p => p.id === id);
      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/publications/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          starred: !pub.starred,
        }),
      });
      setPublications(pubs => pubs.map(p => p.id === id ? { ...p, starred: !p.starred } : p));
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  const deletePub = async (id) => {
    if (!window.confirm('Delete this publication from your library?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/publications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        setPublications(pubs => pubs.filter(p => p.id !== id));
        handleMenuClose();
      }
    } catch (error) {
      console.error('Error deleting publication:', error);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: 26, fontWeight: 700, mb: 0.5 }}>My Library</Typography>
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            {publications.length} publications · {selected.length} selected
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            sx={{ textTransform: 'none', borderRadius: 2, borderColor: 'divider' }}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => window.location.href = '/researcher/publications'}
            sx={{ textTransform: 'none', borderRadius: 2, bgcolor: ACCENT, '&:hover': { bgcolor: '#0e7490' } }}
          >
            Import Publications
          </Button>
        </Box>
      </Box>

      {/* Search & Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search by title, author, journal, or DOI..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 500, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
        <Button
          variant="outlined"
          startIcon={<FilterIcon />}
          sx={{ textTransform: 'none', borderRadius: 2, borderColor: 'divider', minWidth: 120 }}
        >
          Filters
        </Button>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selected.length === filteredPubs.length && filteredPubs.length > 0}
                  indeterminate={selected.length > 0 && selected.length < filteredPubs.length}
                  onChange={toggleSelectAll}
                  size="small"
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Title & Authors</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Journal</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Year</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Source</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Citations</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Tags</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedPubs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} sx={{ textAlign: 'center', py: 5 }}>
                  <ArticleIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
                    {searchQuery ? 'No publications match your search' : 'No publications in your library'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedPubs.map((pub) => (
                <TableRow
                  key={pub.id}
                  hover
                  sx={{
                    '&:hover': { bgcolor: `${ACCENT}05` },
                    bgcolor: selected.includes(pub.id) ? `${ACCENT}08` : 'transparent',
                  }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selected.includes(pub.id)}
                      onChange={() => toggleSelect(pub.id)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 300 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <IconButton size="small" onClick={() => toggleStar(pub.id)} sx={{ mt: -0.5, p: 0.5 }}>
                        {pub.starred ? (
                          <StarIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                        ) : (
                          <StarBorderIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        )}
                      </IconButton>
                      <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, mb: 0.3 }}>
                          {pub.title}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                          {pub.authors}
                        </Typography>
                        <Typography sx={{ fontSize: 10, color: 'text.disabled', fontFamily: 'monospace', mt: 0.3 }}>
                          {pub.doi}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, fontStyle: 'italic', maxWidth: 150 }}>
                    {pub.journal}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{pub.year}</TableCell>
                  <TableCell>
                    <Chip
                      label={pub.type}
                      size="small"
                      sx={{ fontSize: 10, bgcolor: `${ACCENT}15`, color: ACCENT, fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={pub.source}
                      size="small"
                      sx={{ fontSize: 10, bgcolor: 'rgba(100,116,139,0.1)', color: '#64748b', fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary' }}>
                    {pub.citations}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 150 }}>
                      {pub.tags.slice(0, 2).map((tag, i) => (
                        <Chip
                          key={i}
                          label={tag}
                          size="small"
                          sx={{ fontSize: 9, height: 18, bgcolor: dark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', color: 'text.secondary' }}
                        />
                      ))}
                      {pub.tags.length > 2 && (
                        <Chip
                          label={`+${pub.tags.length - 2}`}
                          size="small"
                          sx={{ fontSize: 9, height: 18, bgcolor: dark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', color: 'text.secondary' }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, pub)}>
                      <MoreIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredPubs.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </TableContainer>

      {/* Action Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => { handleMenuClose(); }}>
          <ViewIcon sx={{ fontSize: 16, mr: 1.5 }} /> View Details
        </MenuItem>
        <MenuItem onClick={() => { setEditOpen(true); handleMenuClose(); }}>
          <EditIcon sx={{ fontSize: 16, mr: 1.5 }} /> Edit
        </MenuItem>
        <MenuItem onClick={() => deletePub(currentPub?.id)} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ fontSize: 16, mr: 1.5 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Edit Dialog (placeholder) */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Publication</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            Edit functionality coming soon...
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" sx={{ textTransform: 'none', bgcolor: ACCENT, '&:hover': { bgcolor: '#0e7490' } }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
