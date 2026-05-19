'use client';
import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Paper, TextField, InputAdornment, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
  Chip, Menu, MenuItem, Checkbox, Dialog, DialogTitle, DialogContent, DialogActions,
  useTheme, Tooltip, Autocomplete,
} from '@mui/material';
import {
  Search as SearchIcon, Add as AddIcon, FilterList as FilterIcon,
  MoreVert as MoreIcon, Delete as DeleteIcon, Edit as EditIcon,
  CloudUpload as UploadIcon, Article as ArticleIcon, FolderOpen as LibraryIcon,
  Visibility as ViewIcon, Star as StarIcon, StarBorder as StarBorderIcon,
  DriveFileMove as MoveIcon, ExpandMore as ExpandIcon, ChevronRight as CollapseIcon,
} from '@mui/icons-material';
import LibraryManagerDialog from '@/components/LibraryManagerDialog';

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
  const [libraryFilter, setLibraryFilter] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentPub, setCurrentPub] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveToLibraryId, setMoveToLibraryId] = useState(null);
  const [individualMoves, setIndividualMoves] = useState({});
  
  // Library management
  const [libraries, setLibraries] = useState([]);
  const [libraryManagerOpen, setLibraryManagerOpen] = useState(false);
  const [selectedLibrary, setSelectedLibrary] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState([]);

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

  // Recursive function to get all child folder IDs
  const getAllChildFolderIds = (parentId) => {
    const childIds = [parentId];
    const children = libraries.filter(lib => lib.parent_id === parentId);
    children.forEach(child => {
      childIds.push(...getAllChildFolderIds(child.id));
    });
    return childIds;
  };

  const filteredPubs = publications.filter(p => {
    const matchesSearch = searchQuery === '' ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.authors.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.journal.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.doi.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Include publications from selected folder AND all its subfolders
    const matchesLibrary = !libraryFilter || getAllChildFolderIds(libraryFilter).includes(p.library_id);
    
    return matchesSearch && matchesLibrary;
  });

  const paginatedPubs = filteredPubs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Fetch publications and libraries from backend
  useEffect(() => {
    fetchPublications();
    fetchLibraries();
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
          library_id: pub.library_id,
          library_name: pub.library_name || 'Uncategorized',
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

  // Library management functions
  const fetchLibraries = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/publications/libraries`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setLibraries(data);
      }
    } catch (error) {
      console.error('Error fetching libraries:', error);
    }
  };

  const createLibrary = async (name, parentId = null, isFolder = false) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/publications/libraries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, parent_id: parentId, is_folder: isFolder }),
      });
      await fetchLibraries();
    } catch (error) {
      console.error('Error creating library:', error);
    }
  };

  const deleteLibrary = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/publications/libraries/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      await fetchLibraries();
    } catch (error) {
      console.error('Error deleting library:', error);
    }
  };

  const renameLibrary = async (id, newName) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/publications/libraries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newName }),
      });
      await fetchLibraries();
    } catch (error) {
      console.error('Error renaming library:', error);
    }
  };

  const moveLibrary = async (id, newParentId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/publications/libraries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ parent_id: newParentId }),
      });
      await fetchLibraries();
    } catch (error) {
      console.error('Error moving library:', error);
    }
  };

  const movePublication = async (pubId, fromLibId, toLibId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/publications/${pubId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ library_id: toLibId }),
      });
      await fetchPublications();
    } catch (error) {
      console.error('Error moving publication:', error);
    }
  };

  const deletePublication = async (pubId, libId) => {
    await deletePub(pubId);
  };

  const handleMovePublication = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // For bulk moves with individual destinations
      if (selected.length > 0) {
        // Check if all publications have destinations assigned
        const allAssigned = selected.every(pubId => individualMoves[pubId]);
        if (!allAssigned) {
          alert('Please assign a destination folder for all selected publications');
          return;
        }
        
        // Move each publication to its assigned destination
        await Promise.all(
          selected.map(pubId =>
            fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/publications/${pubId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ library_id: individualMoves[pubId] }),
            })
          )
        );
      } else {
        // Single publication move
        if (!moveToLibraryId) return;
        
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/publications/${currentPub.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ library_id: moveToLibraryId }),
        });
      }
      
      // Refresh publications and clear selections
      await fetchPublications();
      setMoveDialogOpen(false);
      setMoveToLibraryId(null);
      setCurrentPub(null);
      setSelected([]);
      setIndividualMoves({});
    } catch (error) {
      console.error('Error moving publication:', error);
    }
  };

  const toggleFolder = (id) => {
    setExpandedFolders(prev => 
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  // Helper function to render library tree
  const renderLibraryTree = (parentId = null, level = 0) => {
    return libraries
      .filter(lib => lib.parent_id === parentId)
      .map(lib => {
        const hasChildren = libraries.some(l => l.parent_id === lib.id);
        const isExpanded = expandedFolders.includes(lib.id);
        const isSelected = libraryFilter === lib.id;
        // Count publications in this folder AND all subfolders
        const folderIds = getAllChildFolderIds(lib.id);
        const pubCount = publications.filter(p => folderIds.includes(p.library_id)).length;
        
        return (
          <Box key={lib.id}>
            <Box
              onClick={() => setLibraryFilter(lib.id)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                py: 0.75,
                px: 1.5,
                pl: 1.5 + level * 2,
                cursor: 'pointer',
                borderRadius: 1,
                bgcolor: isSelected ? `${ACCENT}15` : 'transparent',
                '&:hover': { bgcolor: isSelected ? `${ACCENT}20` : 'action.hover' },
                transition: 'all 0.15s',
              }}
            >
              {hasChildren && (
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); toggleFolder(lib.id); }}
                  sx={{ p: 0.25 }}
                >
                  {isExpanded ? <ExpandIcon sx={{ fontSize: 16 }} /> : <CollapseIcon sx={{ fontSize: 16 }} />}
                </IconButton>
              )}
              {!hasChildren && <Box sx={{ width: 20 }} />}
              <LibraryIcon sx={{ fontSize: 16, color: isSelected ? ACCENT : 'text.secondary' }} />
              <Typography sx={{ fontSize: 12, fontWeight: isSelected ? 600 : 400, flex: 1, color: isSelected ? ACCENT : 'text.primary' }}>
                {lib.name}
              </Typography>
              <Chip label={pubCount} size="small" sx={{ height: 18, fontSize: 10, minWidth: 28 }} />
            </Box>
            {hasChildren && isExpanded && renderLibraryTree(lib.id, level + 1)}
          </Box>
        );
      });
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 80px)' }}>
      {/* Sidebar - Library Tree */}
      {sidebarOpen && (
        <Paper
          elevation={0}
          sx={{
            width: 280,
            borderRight: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: dark ? 'background.paper' : 'grey.50',
          }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 1 }}>Libraries & Folders</Typography>
            <Button
              fullWidth
              size="small"
              variant="outlined"
              onClick={() => setLibraryFilter(null)}
              sx={{ textTransform: 'none', fontSize: 11, borderRadius: 1.5 }}
            >
              Show All Publications
            </Button>
          </Box>
          <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
            {renderLibraryTree()}
          </Box>
        </Paper>
      )}

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: 26, fontWeight: 700, mb: 0.5 }}>My Library</Typography>
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            {publications.length} publications · {selected.length} selected
            {libraryFilter && (
              <Chip
                label={`Filtered by: ${libraries.find(l => l.id === libraryFilter)?.name || 'Unknown'}`}
                size="small"
                onDelete={() => setLibraryFilter(null)}
                sx={{ ml: 1, fontSize: 11 }}
              />
            )}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {selected.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<MoveIcon />}
              onClick={() => { setMoveDialogOpen(true); setCurrentPub({ title: `${selected.length} publications` }); }}
              sx={{ textTransform: 'none', borderRadius: 2, borderColor: ACCENT, color: ACCENT }}
            >
              Move Selected ({selected.length})
            </Button>
          )}
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
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Library</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Source</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Citations</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Tags</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedPubs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} sx={{ textAlign: 'center', py: 5 }}>
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
                  <TableCell sx={{ fontSize: 12, maxWidth: 180 }}>
                    <Tooltip title={`Click to filter by: ${pub.library_name}`}>
                      <Box 
                        onClick={() => setLibraryFilter(pub.library_id)}
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 0.5,
                          cursor: 'pointer',
                          p: 0.5,
                          borderRadius: 1,
                          transition: 'all 0.2s',
                          '&:hover': { 
                            bgcolor: `${ACCENT}10`,
                            '& .MuiTypography-root': { color: ACCENT }
                          }
                        }}
                      >
                        <LibraryIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography sx={{ fontSize: 11, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {pub.library_name}
                        </Typography>
                      </Box>
                    </Tooltip>
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
        <MenuItem onClick={() => { setMoveDialogOpen(true); handleMenuClose(); }}>
          <MoveIcon sx={{ fontSize: 16, mr: 1.5 }} /> Move to Folder
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

      {/* Move Publication Dialog */}
      <Dialog open={moveDialogOpen} onClose={() => { setMoveDialogOpen(false); setMoveToLibraryId(null); setIndividualMoves({}); }} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {selected.length > 0 ? `Move ${selected.length} Publications` : 'Move Publication'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selected.length > 0 ? (
            // Bulk move with individual destinations
            <Box>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
                Select destination folder for each publication:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 500, overflowY: 'auto' }}>
                {selected.map(pubId => {
                  const pub = publications.find(p => p.id === pubId);
                  if (!pub) return null;
                  
                  return (
                    <Paper key={pubId} elevation={0} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {pub.title}
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                            Current: {pub.library_name}
                          </Typography>
                        </Box>
                        <Box sx={{ minWidth: 200 }}>
                          <Autocomplete
                            size="small"
                            options={libraries.filter(lib => lib.id !== pub.library_id)}
                            value={libraries.find(lib => lib.id === individualMoves[pubId]) || null}
                            onChange={(e, newValue) => setIndividualMoves(prev => ({ ...prev, [pubId]: newValue?.id }))}
                            getOptionLabel={(option) => option.name || ''}
                            renderOption={(props, option) => (
                              <Box component="li" {...props} sx={{ fontSize: 13 }}>
                                {option.isFolder ? '📁 ' : '📚 '}{option.name}
                              </Box>
                            )}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                placeholder="Select folder..."
                                sx={{ '& .MuiInputBase-root': { fontSize: 12 } }}
                              />
                            )}
                          />
                        </Box>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            </Box>
          ) : (
            // Single publication move
            <Box>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
                Move "{currentPub?.title}" to:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 400, overflowY: 'auto' }}>
                {libraries.map(lib => {
                  const isCurrentLibrary = lib.id === currentPub?.library_id;
                  return (
                    <Paper
                      key={lib.id}
                      elevation={0}
                      variant="outlined"
                      onClick={() => !isCurrentLibrary && setMoveToLibraryId(lib.id)}
                      sx={{
                        p: 1.5,
                        cursor: isCurrentLibrary ? 'not-allowed' : 'pointer',
                        borderRadius: 2,
                        transition: 'all 0.15s',
                        opacity: isCurrentLibrary ? 0.5 : 1,
                        borderColor: moveToLibraryId === lib.id ? ACCENT : 'divider',
                        bgcolor: moveToLibraryId === lib.id ? `${ACCENT}08` : 'transparent',
                        '&:hover': !isCurrentLibrary ? { borderColor: ACCENT, bgcolor: `${ACCENT}05` } : {},
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {lib.isFolder ? <LibraryIcon sx={{ fontSize: 18, color: ACCENT }} /> : <ArticleIcon sx={{ fontSize: 18, color: '#64748b' }} />}
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                            {lib.name}
                          </Typography>
                          {isCurrentLibrary && (
                            <Typography sx={{ fontSize: 10, color: 'text.disabled', mt: 0.3 }}>
                              Current location
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setMoveDialogOpen(false); setMoveToLibraryId(null); setIndividualMoves({}); }} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleMovePublication}
            disabled={selected.length > 0 ? !selected.every(id => individualMoves[id]) : !moveToLibraryId}
            sx={{ textTransform: 'none', bgcolor: ACCENT, '&:hover': { bgcolor: '#0e7490' } }}
          >
            Move {selected.length > 0 ? `${selected.length} Publications` : ''}
          </Button>
        </DialogActions>
      </Dialog>

        </Box>
      </Box>
      {/* Library Manager Dialog */}
      <LibraryManagerDialog
        open={libraryManagerOpen}
        onClose={() => setLibraryManagerOpen(false)}
        libraries={libraries}
        selectedLibrary={selectedLibrary}
        setSelectedLibrary={setSelectedLibrary}
        selectedFolder={selectedFolder}
        setSelectedFolder={setSelectedFolder}
        expandedFolders={expandedFolders}
        toggleFolder={toggleFolder}
        currentImportPub={null}
        onConfirmImport={() => {}}
        theme={theme}
        onCreateLibrary={createLibrary}
        onDeleteLibrary={deleteLibrary}
        onRenameLibrary={renameLibrary}
        onMoveLibrary={moveLibrary}
        onDeletePublication={deletePublication}
        onMovePublication={movePublication}
      />
    </Box>
  );
}
