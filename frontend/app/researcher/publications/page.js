'use client';
import { useState, useEffect } from 'react';
import LibraryManagerDialog from '../../../components/LibraryManagerDialog';
import {
  Box, Typography, Button, TextField, InputAdornment, Dialog, DialogContent, DialogTitle, DialogActions,
  Tabs, Tab, Paper, Chip, IconButton, Select, MenuItem, FormControl, InputLabel,
  Checkbox, Divider, useTheme, CircularProgress, Alert, TablePagination, Menu, Tooltip, Snackbar,
} from '@mui/material';
import {
  Search as SearchIcon, School as ScholarIcon, CloudUpload as UploadIcon,
  Link as LinkIcon, Close as CloseIcon, CheckBox as CheckIcon,
  CheckBoxOutlineBlank as UncheckIcon, Article as ArticleIcon,
  FilterList as FilterIcon, Delete as DeleteIcon,
  Folder as FolderIcon, FolderOpen as FolderOpenIcon, LibraryBooks as LibraryIcon,
  Add as AddIcon, MoreVert as MoreIcon, Edit as EditIcon, DriveFileMove as MoveIcon,
  ExpandMore as ExpandIcon, ChevronRight as CollapseIcon,
} from '@mui/icons-material';

const ACCENT = '#1ca7a1';

const PUB_TYPES = ['All Types', 'Journal Article', 'Conference Paper', 'Book Chapter', 'Review', 'Preprint', 'Thesis'];
const LANGUAGES = ['All Languages', 'English', 'French', 'Spanish', 'German', 'Chinese', 'Arabic'];

// Mock data for search results
const MOCK_PUBMED = [
  { id: 1, title: 'Large-scale genome-wide association study of food addiction', authors: 'Cornelis MC, et al.', journal: 'Nature Medicine', year: 2022, doi: '10.1038/s41591-022-01450-2', source: 'PubMed' },
  { id: 2, title: 'The architectural basis of academic research environments', authors: 'Henderson, P.', journal: 'Science Architecture', year: 2023, doi: '10.1126/sciadv.abc1234', source: 'PubMed' },
  { id: 3, title: 'Open Access and the future of Scholarly Communication', authors: 'Smith, L., Roberts, J.', journal: 'Journal of Informetrics', year: 2024, doi: '10.1016/j.joi.2024.101234', source: 'PubMed' },
];

const MOCK_CROSSREF = [
  { id: 4, title: 'CRISPR-Cas9 Gene Editing in Human Clinical Trials', authors: 'Zhang, F., Doudna, J.', journal: 'NEJM', year: 2021, doi: '10.1056/NEJMra2034289', source: 'Crossref' },
  { id: 5, title: 'Machine learning approaches in genomic medicine', authors: 'Kumar, S., et al.', journal: 'Nature Reviews Genetics', year: 2023, doi: '10.1038/s41576-023-00567-4', source: 'Crossref' },
];

const MOCK_OPENALEX = [
  { id: 6, title: 'Climate change impacts on agricultural productivity in Sub-Saharan Africa', authors: 'Ochieng, J., et al.', journal: 'Environmental Research Letters', year: 2023, doi: '10.1088/1748-9326/abc123', source: 'OpenAlex' },
  { id: 7, title: 'Digital health interventions for maternal care in low-resource settings', authors: 'Njoroge, G., Kamau, M.', journal: 'The Lancet Digital Health', year: 2024, doi: '10.1016/S2589-7500(24)00012-3', source: 'OpenAlex' },
];

const MOCK_ZOTERO = [
  { id: 8, title: 'Antibiotic resistance mechanisms in Gram-negative bacteria', authors: 'Odhiambo, A., et al.', journal: 'Microbiology Reviews', year: 2022, doi: '10.1128/MMBR.00045-21', source: 'Zotero' },
  { id: 9, title: 'Sustainable agriculture practices for smallholder farmers', authors: 'Mwangi, J.', journal: 'Agriculture & Food Security', year: 2023, doi: '10.1186/s40066-023-00412-1', source: 'Zotero' },
];

export default function PublicationsPage() {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [searchMode, setSearchMode] = useState(true); // true = search landing, false = library view
  const [importOpen, setImportOpen] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSource, setSearchSource] = useState('PubMed');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [library, setLibrary] = useState([]);
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const [resultsPage, setResultsPage] = useState(0);
  const [resultsPerPage] = useState(20);
  const [totalResultsCount, setTotalResultsCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [resultsFilter, setResultsFilter] = useState({ keyword: '', author: '', title: '', year: '' });
  const [applyingFilter, setApplyingFilter] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Advanced search fields
  const [advancedFields, setAdvancedFields] = useState({
    author: '',
    yearFrom: '',
    yearTo: '',
    doi: '',
    keywords: '',
    journal: '',
    country: '',
    pubType: 'All Types',
    language: 'All Languages',
    openAccess: false,
  });

  // Library management
  const [libraries, setLibraries] = useState([]);
  const [selectedLibrary, setSelectedLibrary] = useState(null);
  const [libraryDialogOpen, setLibraryDialogOpen] = useState(false);
  const [newLibraryName, setNewLibraryName] = useState('');
  const [currentImportPub, setCurrentImportPub] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState([1, 2]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [contextMenu, setContextMenu] = useState(null);
  const [renameDialog, setRenameDialog] = useState({ open: false, item: null, newName: '' });
  const [moveDialog, setMoveDialog] = useState({ open: false, item: null, targetId: null });
  const [aiSummaries, setAiSummaries] = useState({});
  const [loadingSummary, setLoadingSummary] = useState({});

  // File upload
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parsedEntries, setParsedEntries] = useState([]);

  // Connected apps
  const [zoteroConnected, setZoteroConnected] = useState(false);
  const [mendeleyConnected, setMendeleyConnected] = useState(false);
  const [zoteroLibrary, setZoteroLibrary] = useState([]);

  // Fetch libraries from backend
  useEffect(() => {
    fetchLibraries();
  }, []);

  const fetchLibraries = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/publications/libraries`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Transform backend data to frontend format
        const transformedLibraries = data.map(lib => ({
          id: lib.id,
          name: lib.name,
          parentId: lib.parent_id,
          isFolder: lib.is_folder,
          publications: [], // Will be populated when viewing library
          publication_count: lib.publication_count,
        }));
        setLibraries(transformedLibraries);
      }
    } catch (error) {
      console.error('Error fetching libraries:', error);
    }
  };

  const handleSearch = async (isLoadMore = false) => {
    if (!isLoadMore) {
      setSearching(true);
      setSearchResults([]);
      setResultsPage(0);
      setTotalResultsCount(0);
      setHasMoreResults(false);
    } else {
      setLoadingMore(true);
    }
    
    try {
      if (searchSource === 'PubMed') {
        // Build PubMed query
        let query = searchQuery;
        if (advancedFields.author) query += ` AND ${advancedFields.author}[Author]`;
        if (advancedFields.journal) query += ` AND ${advancedFields.journal}[Journal]`;
        if (advancedFields.keywords) query += ` AND (${advancedFields.keywords.split(',').map(k => k.trim()).join(' OR ')})`;
        if (advancedFields.yearFrom || advancedFields.yearTo) {
          const from = advancedFields.yearFrom || '1900';
          const to = advancedFields.yearTo || new Date().getFullYear();
          query += ` AND ${from}:${to}[Date - Publication]`;
        }
        if (advancedFields.country) query += ` AND ${advancedFields.country}[Affiliation]`;
        
        const currentStart = isLoadMore ? searchResults.length : 0;
        const batchSize = 100; // Fetch 100 at a time for better performance
        
        // Search PubMed - get total count and IDs
        const searchRes = await fetch(
          `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=${batchSize}&retstart=${currentStart}`
        );
        const searchData = await searchRes.json();
        const ids = searchData.esearchresult?.idlist || [];
        const totalCount = parseInt(searchData.esearchresult?.count || '0');
        
        if (ids.length > 0) {
          // Fetch details
          const summaryRes = await fetch(
            `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`
          );
          const summaryData = await summaryRes.json();
          
          const results = ids.map(id => {
            const article = summaryData.result[id];
            return {
              id: `pubmed_${id}`,
              pmid: id,
              title: article.title || 'No title',
              authors: article.authors?.slice(0, 3).map(a => a.name).join(', ') + (article.authors?.length > 3 ? ', et al.' : '') || 'Unknown',
              journal: article.fulljournalname || article.source || 'Unknown',
              year: article.pubdate?.split(' ')[0] || 'N/A',
              doi: article.elocationid?.replace('doi: ', '') || article.articleids?.find(a => a.idtype === 'doi')?.value || '',
              source: 'PubMed',
              abstract: '',
            };
          });
          
          if (isLoadMore) {
            setSearchResults(prev => [...prev, ...results]);
          } else {
            setSearchResults(results);
          }
          
          setTotalResultsCount(totalCount);
          setHasMoreResults(currentStart + results.length < totalCount);
          
          if (results.length > 0 && !isLoadMore) {
            setResultsModalOpen(true);
          }
        } else {
          if (!isLoadMore) {
            setSearchResults([]);
            setTotalResultsCount(0);
            setHasMoreResults(false);
          }
        }
      } else {
        // Fallback to mock data for other sources
        let results = [];
        if (searchSource === 'Crossref') results = MOCK_CROSSREF;
        else if (searchSource === 'OpenAlex') results = MOCK_OPENALEX;
        setSearchResults(results);
        if (results.length > 0) {
          setResultsModalOpen(true);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      if (!isLoadMore) {
        // Fallback to mock data on error
        let results = [];
        if (searchSource === 'PubMed') results = MOCK_PUBMED;
        else if (searchSource === 'Crossref') results = MOCK_CROSSREF;
        else if (searchSource === 'OpenAlex') results = MOCK_OPENALEX;
        setSearchResults(results);
        setTotalResultsCount(results.length);
        setHasMoreResults(false);
        if (results.length > 0) {
          setResultsModalOpen(true);
        }
      }
    }
    
    if (isLoadMore) {
      setLoadingMore(false);
    } else {
      setSearching(false);
    }
  };

  const loadMoreResults = () => {
    if (!loadingMore && hasMoreResults) {
      handleSearch(true);
    }
  };

  const applyFilter = async () => {
    if (!resultsFilter.keyword && !resultsFilter.author && !resultsFilter.title && !resultsFilter.year) {
      return;
    }
    
    setApplyingFilter(true);
    setSearchResults([]);
    setResultsPage(0);
    
    try {
      if (searchSource === 'PubMed') {
        // Build refined query with filters
        let query = searchQuery;
        if (advancedFields.author) query += ` AND ${advancedFields.author}[Author]`;
        if (advancedFields.journal) query += ` AND ${advancedFields.journal}[Journal]`;
        if (advancedFields.keywords) query += ` AND (${advancedFields.keywords.split(',').map(k => k.trim()).join(' OR ')})`;
        if (advancedFields.yearFrom || advancedFields.yearTo) {
          const from = advancedFields.yearFrom || '1900';
          const to = advancedFields.yearTo || new Date().getFullYear();
          query += ` AND ${from}:${to}[Date - Publication]`;
        }
        if (advancedFields.country) query += ` AND ${advancedFields.country}[Affiliation]`;
        
        // Add filter criteria to query
        if (resultsFilter.keyword) {
          query += ` AND (${resultsFilter.keyword}[Title] OR ${resultsFilter.keyword}[Author] OR ${resultsFilter.keyword}[Journal])`;
        }
        if (resultsFilter.author) {
          query += ` AND ${resultsFilter.author}[Author]`;
        }
        if (resultsFilter.title) {
          query += ` AND ${resultsFilter.title}[Title]`;
        }
        if (resultsFilter.year) {
          query += ` AND ${resultsFilter.year}[Date - Publication]`;
        }
        
        const batchSize = 100;
        
        // Search PubMed with refined query
        const searchRes = await fetch(
          `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=${batchSize}&retstart=0`
        );
        const searchData = await searchRes.json();
        const ids = searchData.esearchresult?.idlist || [];
        const totalCount = parseInt(searchData.esearchresult?.count || '0');
        
        if (ids.length > 0) {
          // Fetch details
          const summaryRes = await fetch(
            `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`
          );
          const summaryData = await summaryRes.json();
          
          const results = ids.map(id => {
            const article = summaryData.result[id];
            return {
              id: `pubmed_${id}`,
              pmid: id,
              title: article.title || 'No title',
              authors: article.authors?.slice(0, 3).map(a => a.name).join(', ') + (article.authors?.length > 3 ? ', et al.' : '') || 'Unknown',
              journal: article.fulljournalname || article.source || 'Unknown',
              year: article.pubdate?.split(' ')[0] || 'N/A',
              doi: article.elocationid?.replace('doi: ', '') || article.articleids?.find(a => a.idtype === 'doi')?.value || '',
              source: 'PubMed',
              abstract: '',
            };
          });
          
          setSearchResults(results);
          setTotalResultsCount(totalCount);
          setHasMoreResults(results.length < totalCount);
        } else {
          setSearchResults([]);
          setTotalResultsCount(0);
          setHasMoreResults(false);
        }
      }
    } catch (error) {
      console.error('Filter error:', error);
    }
    
    setApplyingFilter(false);
  };

  const clearFilters = async () => {
    setResultsFilter({ keyword: '', author: '', title: '', year: '' });
    // Re-run original search
    await handleSearch(false);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const importSelected = () => {
    const toImport = searchResults.filter(r => selectedIds.includes(r.id));
    setLibrary(prev => [...prev, ...toImport]);
    setSelectedIds([]);
    setImportOpen(false);
    setSearchMode(false);
  };

  const handleImportSingle = (pub) => {
    setCurrentImportPub(pub);
    setLibraryDialogOpen(true);
  };

  const confirmImport = async () => {
    if (!selectedLibrary || !currentImportPub) {
      setSnackbar({ open: true, message: 'Please select a library or folder first', severity: 'warning' });
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/publications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...currentImportPub,
          library_id: selectedLibrary,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to import publication');
      }
      
      // Update local state - add publication to library
      setLibrary(prev => [...prev, currentImportPub]);
      setLibraries(libs => libs.map(lib => 
        lib.id === selectedLibrary ? { ...lib, publications: [...lib.publications, currentImportPub] } : lib
      ));
      
      // Get the library/folder name for the confirmation message
      const selectedLib = libraries.find(lib => lib.id === selectedLibrary);
      const libName = selectedLib?.name || 'library';
      
      setLibraryDialogOpen(false);
      setCurrentImportPub(null);
      setSelectedLibrary(null);
      setSelectedFolder(null);
      setSnackbar({ open: true, message: `Publication imported to "${libName}" successfully!`, severity: 'success' });
    } catch (error) {
      console.error('Import error:', error);
      setSnackbar({ open: true, message: 'Failed to import publication', severity: 'error' });
    }
  };

  const createLibrary = async (name, parentId = null, isFolder = false) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/publications/libraries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name,
          parent_id: parentId,
          is_folder: isFolder,
        }),
      });
      
      // Always refresh libraries to show the created item
      await fetchLibraries();
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error creating library:', errorData);
        setSnackbar({ open: true, message: errorData.detail || 'Failed to create library', severity: 'error' });
      } else {
        setSnackbar({ open: true, message: `${isFolder ? 'Folder' : 'Library'} created successfully`, severity: 'success' });
      }
    } catch (error) {
      console.error('Error creating library:', error);
      // Still refresh to check if it was created
      await fetchLibraries();
      setSnackbar({ open: true, message: 'Network error, but item may have been created', severity: 'warning' });
    }
  };

  const deleteLibraryItem = async (id) => {
    if (!confirm('Delete this item and all its contents?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/publications/libraries/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        await fetchLibraries();
        if (selectedFolder === id) setSelectedFolder(null);
      }
    } catch (error) {
      console.error('Error deleting library:', error);
      alert('Failed to delete library');
    }
  };

  const renameLibraryItem = async (id, newName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/publications/libraries/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newName,
        }),
      });
      
      if (response.ok) {
        await fetchLibraries();
      }
    } catch (error) {
      console.error('Error renaming library:', error);
      alert('Failed to rename library');
    }
  };

  const moveLibraryItem = async (id, targetId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/publications/libraries/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          parent_id: targetId,
        }),
      });
      
      if (response.ok) {
        await fetchLibraries();
      }
    } catch (error) {
      console.error('Error moving library:', error);
      alert('Failed to move library');
    }
  };

  const movePublication = async (pubId, fromLibId, toLibId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/publications/${pubId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          library_id: toLibId,
        }),
      });
      
      if (response.ok) {
        await fetchLibraries();
      }
    } catch (error) {
      console.error('Error moving publication:', error);
      alert('Failed to move publication');
    }
  };

  const deletePublication = async (pubId, libId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/publications/${pubId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        await fetchLibraries();
      }
    } catch (error) {
      console.error('Error deleting publication:', error);
      alert('Failed to delete publication');
    }
  };

  const toggleFolder = (id) => {
    setExpandedFolders(prev => 
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  const getLibraryTree = (parentId = null) => {
    return libraries.filter(lib => lib.parentId === parentId);
  };

  const generateAISummary = async (pub) => {
    setLoadingSummary(prev => ({ ...prev, [pub.id]: true }));
    
    try {
      // Mock AI summary for now
      await new Promise(resolve => setTimeout(resolve, 1500));
      const summary = `This ${pub.source} publication titled "${pub.title}" presents research findings in ${pub.journal}. The study was published in ${pub.year} and contributes to the field through novel methodologies and significant results. Key findings include innovative approaches and potential implications for future research directions.`;
      
      setAiSummaries(prev => ({ ...prev, [pub.id]: summary }));
    } catch (error) {
      console.error('AI summary error:', error);
    } finally {
      setLoadingSummary(prev => ({ ...prev, [pub.id]: false }));
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    
    // Mock parsing
    setTimeout(() => {
      setParsedEntries([
        { id: 100, title: 'Parsed Entry from BibTeX File', authors: 'Author, A.', journal: 'Journal Name', year: 2023, doi: '10.1234/example', source: 'BibTeX' },
        { id: 101, title: 'Another Parsed Entry', authors: 'Smith, B.', journal: 'Another Journal', year: 2024, doi: '10.5678/example2', source: 'BibTeX' },
      ]);
    }, 500);
  };

  const importParsedEntries = () => {
    setLibrary(prev => [...prev, ...parsedEntries]);
    setParsedEntries([]);
    setUploadedFile(null);
    setImportOpen(false);
    setSearchMode(false);
  };

  const connectZotero = () => {
    setTimeout(() => {
      setZoteroConnected(true);
      setZoteroLibrary(MOCK_ZOTERO);
    }, 600);
  };

  const importFromZotero = () => {
    const toImport = zoteroLibrary.filter(r => selectedIds.includes(r.id));
    setLibrary(prev => [...prev, ...toImport]);
    setSelectedIds([]);
    setImportOpen(false);
    setSearchMode(false);
  };

  const deleteFromLibrary = (id) => {
    setLibrary(prev => prev.filter(p => p.id !== id));
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {searchMode ? (
        /* ═══════════════════════════════════════════════════════════════
           SEARCH LANDING PAGE (Google-like)
           ═══════════════════════════════════════════════════════════════ */
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', px: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <ScholarIcon sx={{ fontSize: 48, color: ACCENT }} />
            <Typography sx={{ fontSize: 42, fontWeight: 800, color: 'text.primary' }}>
              DACORiS<Typography component="span" sx={{ color: ACCENT }}>Flow</Typography>
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 16, color: 'text.secondary', mb: 1 }}>
            Search the world's research databases and build your collaborative library.
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.disabled', mb: 5 }}>
            Powered by PubMed, Crossref, OpenAlex & more
          </Typography>

          <Box sx={{ width: '100%', maxWidth: 600, position: 'relative', mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Paste DOI, search PubMed, Crossref, or OpenAlex..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && setImportOpen(true)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 50,
                  bgcolor: 'background.paper',
                  fontSize: 15,
                  boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
                  '&:hover': { boxShadow: dark ? 'none' : '0 4px 12px rgba(0,0,0,0.12)' },
                },
              }}
            />
            <Button
              variant="contained"
              onClick={() => setImportOpen(true)}
              sx={{
                position: 'absolute',
                right: 4,
                top: 4,
                bottom: 4,
                borderRadius: 50,
                bgcolor: ACCENT,
                textTransform: 'none',
                px: 3,
                fontWeight: 700,
                '&:hover': { bgcolor: '#0e7490' },
              }}
            >
              SEARCH
            </Button>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              startIcon={<UploadIcon />}
              onClick={() => { setImportOpen(true); setTabIndex(1); }}
              sx={{ 
                textTransform: 'none', 
                borderRadius: 50, 
                px: 3, 
                py: 1,
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': { borderColor: ACCENT, bgcolor: `${ACCENT}08` }
              }}
            >
              Upload BibTeX / RIS / XML
            </Button>
            <Button
              startIcon={<LinkIcon />}
              onClick={() => { setImportOpen(true); setTabIndex(2); }}
              sx={{ 
                textTransform: 'none', 
                borderRadius: 50, 
                px: 3,
                py: 1,
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': { borderColor: ACCENT, bgcolor: `${ACCENT}08` }
              }}
            >
              Connect Zotero / Mendeley
            </Button>
          </Box>

          <Typography sx={{ fontSize: 12, color: 'text.disabled', mb: 1, textTransform: 'uppercase', letterSpacing: 1 }}>
            Proudly Integrated With
          </Typography>
          <Box sx={{ display: 'flex', gap: 4 }}>
            {['PubMed', 'Crossref', 'OpenAlex', 'Mendeley'].map(name => (
              <Typography key={name} sx={{ fontSize: 15, fontWeight: 600, color: 'text.secondary' }}>
                {name}
              </Typography>
            ))}
          </Box>

          {library.length > 0 && (
            <Button
              variant="outlined"
              onClick={() => setSearchMode(false)}
              sx={{ mt: 5, textTransform: 'none', borderRadius: 2, borderColor: ACCENT, color: ACCENT }}
            >
              View My Library ({library.length} publications)
            </Button>
          )}
        </Box>
      ) : (
        /* ═══════════════════════════════════════════════════════════════
           LIBRARY VIEW
           ═══════════════════════════════════════════════════════════════ */
        <Box sx={{ p: { xs: 2, md: 4 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography sx={{ fontSize: 26, fontWeight: 700 }}>My Publications</Typography>
              <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>{library.length} publications in your library</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                startIcon={<SearchIcon />}
                onClick={() => setSearchMode(true)}
                sx={{ textTransform: 'none', borderRadius: 2, borderColor: 'divider' }}
              >
                Search More
              </Button>
              <Button
                variant="contained"
                startIcon={<UploadIcon />}
                onClick={() => setImportOpen(true)}
                sx={{ textTransform: 'none', borderRadius: 2, bgcolor: ACCENT, '&:hover': { bgcolor: '#0e7490' } }}
              >
                Import
              </Button>
            </Box>
          </Box>

          {library.length === 0 ? (
            <Paper elevation={0} variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
              <ArticleIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography sx={{ fontSize: 18, fontWeight: 600, mb: 1 }}>No publications yet</Typography>
              <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 3 }}>
                Start building your research library by importing from databases or uploading files
              </Typography>
              <Button
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={() => setSearchMode(true)}
                sx={{ textTransform: 'none', borderRadius: 2, bgcolor: ACCENT, '&:hover': { bgcolor: '#0e7490' } }}
              >
                Search Databases
              </Button>
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {library.map(pub => (
                <Paper key={pub.id} elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3, transition: 'border-color 0.2s', '&:hover': { borderColor: ACCENT } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 0.5, color: 'text.primary' }}>
                        {pub.title}
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1 }}>
                        {pub.authors} — <Typography component="span" sx={{ fontStyle: 'italic' }}>{pub.journal}</Typography> ({pub.year})
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip label={pub.source} size="small" sx={{ fontSize: 10, bgcolor: `${ACCENT}18`, color: ACCENT, fontWeight: 700 }} />
                        {pub.doi && (
                          <Typography sx={{ fontSize: 11, color: 'text.disabled', fontFamily: 'monospace' }}>
                            DOI: {pub.doi}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <IconButton size="small" onClick={() => deleteFromLibrary(pub.id)} sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                      <DeleteIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          IMPORT MODAL
          ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={importOpen} onClose={() => setImportOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, minHeight: 600 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ArticleIcon sx={{ fontSize: 22, color: ACCENT }} />
            <Typography sx={{ fontSize: 18, fontWeight: 700 }}>Import Publications</Typography>
          </Box>
          <IconButton size="small" onClick={() => setImportOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2 }}>
          <Tab icon={<SearchIcon />} label="GLOBAL SEARCH" sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }} />
          <Tab icon={<UploadIcon />} label="FILE UPLOAD" sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }} />
          <Tab icon={<LinkIcon />} label="INTEGRATIONS" sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }} />
        </Tabs>

        <DialogContent sx={{ p: 3 }}>
          {/* ─────────────────────────────────────────────────────────────
              TAB 0: GLOBAL SEARCH
              ───────────────────────────────────────────────────────────── */}
          {tabIndex === 0 && (
            <Box>
              <Paper elevation={0} sx={{ p: 2, bgcolor: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderRadius: 2, mb: 3 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 1.5 }}>Quick Search</Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 0 }}>
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Database</InputLabel>
                    <Select value={searchSource} label="Database" onChange={(e) => setSearchSource(e.target.value)}>
                      <MenuItem value="PubMed">PubMed</MenuItem>
                      <MenuItem value="Crossref">Crossref</MenuItem>
                      <MenuItem value="OpenAlex">OpenAlex</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Enter title, DOI, keywords, or paste citation..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !searching && searchQuery.trim() && handleSearch(false)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={() => handleSearch(false)}
                    disabled={!searchQuery.trim() || searching}
                    sx={{ 
                      textTransform: 'none', 
                      borderRadius: 2, 
                      bgcolor: ACCENT, 
                      minWidth: 100,
                      '&:hover': { bgcolor: '#0e7490' },
                      '&:disabled': { bgcolor: 'action.disabledBackground' }
                    }}
                  >
                    Search
                  </Button>
                </Box>
              </Paper>

              <Box sx={{ mb: 3 }}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1, 
                    mb: showAdvancedFilters ? 1.5 : 0,
                    cursor: 'pointer',
                    p: 1,
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  <IconButton size="small" sx={{ p: 0 }}>
                    {showAdvancedFilters ? <ExpandIcon /> : <CollapseIcon />}
                  </IconButton>
                  <FilterIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>Advanced Filters</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>(Optional - refine your search)</Typography>
                </Box>
                {showAdvancedFilters && (<>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5, mb: 1.5 }}>
                  <TextField size="small" label="Author" placeholder="e.g., Smith J" value={advancedFields.author} onChange={(e) => setAdvancedFields(f => ({ ...f, author: e.target.value }))} />
                  <TextField size="small" label="Journal/Venue" placeholder="e.g., Nature" value={advancedFields.journal} onChange={(e) => setAdvancedFields(f => ({ ...f, journal: e.target.value }))} />
                  <TextField size="small" label="Country" placeholder="e.g., Kenya, USA" value={advancedFields.country} onChange={(e) => setAdvancedFields(f => ({ ...f, country: e.target.value }))} />
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5, mb: 1.5 }}>
                  <TextField size="small" label="Year From" type="number" placeholder="2020" value={advancedFields.yearFrom} onChange={(e) => setAdvancedFields(f => ({ ...f, yearFrom: e.target.value }))} />
                  <TextField size="small" label="Year To" type="number" placeholder="2024" value={advancedFields.yearTo} onChange={(e) => setAdvancedFields(f => ({ ...f, yearTo: e.target.value }))} />
                  <TextField size="small" label="DOI" placeholder="10.1234/..." value={advancedFields.doi} onChange={(e) => setAdvancedFields(f => ({ ...f, doi: e.target.value }))} />
                </Box>
                <Box sx={{ mb: 1.5 }}>
                  <TextField 
                    fullWidth
                    multiline
                    rows={2}
                    size="small" 
                    label="Keywords" 
                    placeholder="Enter keywords separated by commas (e.g., CRISPR, gene editing, genomics, clinical trials)" 
                    value={advancedFields.keywords} 
                    onChange={(e) => setAdvancedFields(f => ({ ...f, keywords: e.target.value }))} 
                  />
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 1.5 }}>
                  <FormControl size="small">
                    <InputLabel>Publication Type</InputLabel>
                    <Select value={advancedFields.pubType} label="Publication Type" onChange={(e) => setAdvancedFields(f => ({ ...f, pubType: e.target.value }))}>
                      {PUB_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl size="small">
                    <InputLabel>Language</InputLabel>
                    <Select value={advancedFields.language} label="Language" onChange={(e) => setAdvancedFields(f => ({ ...f, language: e.target.value }))}>
                      {LANGUAGES.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Checkbox checked={advancedFields.openAccess} onChange={(e) => setAdvancedFields(f => ({ ...f, openAccess: e.target.checked }))} size="small" sx={{ p: 0 }} />
                  <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Open Access only</Typography>
                </Box>
                </>) }
              </Box>

              {searching ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
                  <CircularProgress size={48} sx={{ color: ACCENT, mb: 3 }} />
                  <Typography sx={{ fontSize: 15, fontWeight: 600, color: 'text.primary', mb: 1 }}>
                    Searching {searchSource}...
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                    Please wait while we fetch your results
                  </Typography>
                </Box>
              ) : (
                <Paper elevation={0} variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 3, borderStyle: 'dashed' }}>
                  <SearchIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography sx={{ fontSize: 15, fontWeight: 600, mb: 1 }}>Ready to search</Typography>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary', maxWidth: 400, mx: 'auto' }}>
                    Enter a search term above and click <strong>Search</strong> to find publications from {searchSource}
                  </Typography>
                </Paper>
              )}
            </Box>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 1: FILE UPLOAD
              ───────────────────────────────────────────────────────────── */}
          {tabIndex === 1 && (
            <Box>
              <Paper
                elevation={0}
                variant="outlined"
                sx={{
                  p: 5,
                  textAlign: 'center',
                  borderStyle: 'dashed',
                  borderWidth: 2,
                  borderColor: 'divider',
                  borderRadius: 3,
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                  '&:hover': { borderColor: ACCENT },
                  mb: 3,
                }}
                onClick={() => document.getElementById('file-upload').click()}
              >
                <Box sx={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: 3, 
                  bgcolor: `${ACCENT}10`, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2
                }}>
                  <UploadIcon sx={{ fontSize: 40, color: ACCENT }} />
                </Box>
                <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 1 }}>Drop files here or click to browse</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 0.5 }}>Supported formats:</Typography>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Chip label=".bib (BibTeX)" size="small" sx={{ fontSize: 11, bgcolor: `${ACCENT}15`, color: ACCENT }} />
                  <Chip label=".ris (RIS)" size="small" sx={{ fontSize: 11, bgcolor: `${ACCENT}15`, color: ACCENT }} />
                  <Chip label=".xml (EndNote)" size="small" sx={{ fontSize: 11, bgcolor: `${ACCENT}15`, color: ACCENT }} />
                </Box>
                <input
                  id="file-upload"
                  type="file"
                  accept=".bib,.ris,.xml"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </Paper>

              {uploadedFile && (
                <Alert severity="success" icon={<CheckIcon />} sx={{ mb: 3, borderRadius: 2 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.3 }}>File uploaded successfully!</Typography>
                  <Typography sx={{ fontSize: 12 }}>
                    {uploadedFile.name} — Found {parsedEntries.length} publication{parsedEntries.length !== 1 ? 's' : ''}
                  </Typography>
                </Alert>
              )}

              {parsedEntries.length > 0 && (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                      Preview ({parsedEntries.length} publication{parsedEntries.length !== 1 ? 's' : ''})
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>
                      Review before importing
                    </Typography>
                  </Box>
                  <Box sx={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                    {parsedEntries.map(entry => (
                      <Paper key={entry.id} elevation={0} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 0.5 }}>{entry.title}</Typography>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                          {entry.authors} — <Typography component="span" sx={{ fontStyle: 'italic' }}>{entry.journal}</Typography> ({entry.year})
                        </Typography>
                      </Paper>
                    ))}
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      onClick={importParsedEntries}
                      sx={{ textTransform: 'none', borderRadius: 2, bgcolor: ACCENT, '&:hover': { bgcolor: '#0e7490' } }}
                    >
                      Import All {parsedEntries.length} Entries
                    </Button>
                  </Box>
                </>
              )}
            </Box>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 2: INTEGRATIONS
              ───────────────────────────────────────────────────────────── */}
          {tabIndex === 2 && (
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 1 }}>Connect Your Reference Manager</Typography>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 3 }}>
                Link your Zotero or Mendeley account to import publications directly from your existing library
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 0.5 }}>Zotero</Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {zoteroConnected ? 'Connected — Browse and import from your Zotero library' : 'Connect to import from your Zotero library'}
                      </Typography>
                    </Box>
                    {!zoteroConnected ? (
                      <Button
                        variant="outlined"
                        onClick={connectZotero}
                        sx={{ textTransform: 'none', borderRadius: 2, borderColor: ACCENT, color: ACCENT }}
                      >
                        Connect
                      </Button>
                    ) : (
                      <Chip label="Connected" color="success" size="small" />
                    )}
                  </Box>
                </Paper>

                <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 0.5 }}>Mendeley</Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {mendeleyConnected ? 'Connected — Browse and import from your Mendeley library' : 'Connect to import from your Mendeley library'}
                      </Typography>
                    </Box>
                    {!mendeleyConnected ? (
                      <Button
                        variant="outlined"
                        onClick={() => setMendeleyConnected(true)}
                        sx={{ textTransform: 'none', borderRadius: 2, borderColor: ACCENT, color: ACCENT }}
                      >
                        Connect
                      </Button>
                    ) : (
                      <Chip label="Connected" color="success" size="small" />
                    )}
                  </Box>
                </Paper>
              </Box>

              {zoteroConnected && zoteroLibrary.length > 0 && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                      Your Zotero Library ({zoteroLibrary.length} items)
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>
                      Select items to import
                    </Typography>
                  </Box>
                  <Box sx={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {zoteroLibrary.map(item => (
                      <Paper
                        key={item.id}
                        elevation={0}
                        variant="outlined"
                        onClick={() => toggleSelect(item.id)}
                        sx={{
                          p: 2,
                          cursor: 'pointer',
                          borderColor: selectedIds.includes(item.id) ? ACCENT : 'divider',
                          bgcolor: selectedIds.includes(item.id) ? `${ACCENT}08` : 'transparent',
                          transition: 'all 0.15s',
                          '&:hover': { borderColor: ACCENT },
                        }}
                      >
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                          <Checkbox
                            checked={selectedIds.includes(item.id)}
                            icon={<UncheckIcon />}
                            checkedIcon={<CheckIcon />}
                            sx={{ p: 0, color: ACCENT }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 0.5 }}>{item.title}</Typography>
                            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                              {item.authors} — <Typography component="span" sx={{ fontStyle: 'italic' }}>{item.journal}</Typography> ({item.year})
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      variant="contained"
                      disabled={selectedIds.length === 0}
                      onClick={importFromZotero}
                      sx={{ textTransform: 'none', borderRadius: 2, bgcolor: ACCENT, '&:hover': { bgcolor: '#0e7490' } }}
                    >
                      Import {selectedIds.length} Selected
                    </Button>
                  </Box>
                </>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Search Results Modal */}
      <Dialog 
        open={resultsModalOpen} 
        onClose={() => setResultsModalOpen(false)} 
        maxWidth="lg" 
        fullWidth 
        PaperProps={{ sx: { borderRadius: 3, height: '90vh' } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 700 }}>Search Results</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 400 }}>
              {totalResultsCount > 0 ? (
                <>
                  Showing {searchResults.length} of {totalResultsCount.toLocaleString()} results from {searchSource}
                  {hasMoreResults && <Chip label="More available" size="small" sx={{ ml: 1, fontSize: 10, height: 18, bgcolor: `${ACCENT}15`, color: ACCENT }} />}
                </>
              ) : (
                `${searchResults.length} results from {searchSource}`
              )}
            </Typography>
          </Box>
          <IconButton onClick={() => setResultsModalOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: '8px !important' }}>
          {/* Filter Bar */}
          <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <FilterIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>
                Refine Search
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                (searches across all {totalResultsCount.toLocaleString()} results)
              </Typography>
              {(resultsFilter.keyword || resultsFilter.author || resultsFilter.title || resultsFilter.year) && (
                <Button
                  size="small"
                  onClick={clearFilters}
                  disabled={applyingFilter}
                  sx={{ ml: 'auto', textTransform: 'none', fontSize: 11 }}
                >
                  Clear & Reset
                </Button>
              )}
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 0.8fr auto', gap: 1.5 }}>
              <TextField
                size="small"
                placeholder="Search in all fields..."
                value={resultsFilter.keyword}
                onChange={(e) => setResultsFilter(f => ({ ...f, keyword: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && applyFilter()}
                disabled={applyingFilter}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                size="small"
                placeholder="Author..."
                value={resultsFilter.author}
                onChange={(e) => setResultsFilter(f => ({ ...f, author: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && applyFilter()}
                disabled={applyingFilter}
              />
              <TextField
                size="small"
                placeholder="Title..."
                value={resultsFilter.title}
                onChange={(e) => setResultsFilter(f => ({ ...f, title: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && applyFilter()}
                disabled={applyingFilter}
              />
              <TextField
                size="small"
                placeholder="Year..."
                value={resultsFilter.year}
                onChange={(e) => setResultsFilter(f => ({ ...f, year: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && applyFilter()}
                disabled={applyingFilter}
              />
              <Button
                variant="contained"
                size="small"
                onClick={applyFilter}
                disabled={applyingFilter || (!resultsFilter.keyword && !resultsFilter.author && !resultsFilter.title && !resultsFilter.year)}
                sx={{
                  textTransform: 'none',
                  borderRadius: 2,
                  bgcolor: ACCENT,
                  minWidth: 100,
                  '&:hover': { bgcolor: '#0e7490' },
                }}
              >
                {applyingFilter ? <CircularProgress size={16} sx={{ color: 'white' }} /> : 'Apply Filter'}
              </Button>
            </Box>
          </Paper>
          
          {searchResults.length === 0 && !applyingFilter ? (
            <Paper elevation={0} variant="outlined" sx={{ p: 8, textAlign: 'center', borderRadius: 3, borderStyle: 'dashed' }}>
              <FilterIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
              <Typography sx={{ fontSize: 16, fontWeight: 600, mb: 1 }}>No results found</Typography>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 3, maxWidth: 400, mx: 'auto' }}>
                No publications match your refined search. Try adjusting your filter criteria or clear filters to see all results.
              </Typography>
              <Button
                variant="outlined"
                onClick={clearFilters}
                sx={{
                  textTransform: 'none',
                  borderRadius: 2,
                  borderColor: ACCENT,
                  color: ACCENT,
                  '&:hover': { borderColor: '#0e7490', bgcolor: `${ACCENT}08` }
                }}
              >
                Clear & Reset
              </Button>
            </Paper>
          ) : applyingFilter ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
              <CircularProgress size={48} sx={{ color: ACCENT, mb: 3 }} />
              <Typography sx={{ fontSize: 15, fontWeight: 600, color: 'text.primary', mb: 1 }}>
                Refining search...
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                Searching across all {totalResultsCount.toLocaleString()} results
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
              {searchResults.slice(resultsPage * resultsPerPage, (resultsPage + 1) * resultsPerPage).map(result => (
                <Paper
                  key={result.id}
                  elevation={0}
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderColor: 'divider',
                    transition: 'all 0.15s',
                    '&:hover': { borderColor: ACCENT, boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.08)' },
                  }}
                >
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 0.8, lineHeight: 1.4 }}>{result.title}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>
                      {result.authors}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', fontStyle: 'italic', mb: 1 }}>
                      {result.journal} • {result.year}
                    </Typography>
                    {result.doi && (
                      <Typography sx={{ fontSize: 10, color: 'text.disabled', fontFamily: 'monospace', mb: 1 }}>
                        DOI: {result.doi}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {result.pmid && (
                        <Chip label={`PMID: ${result.pmid}`} size="small" sx={{ fontSize: 9, height: 18 }} />
                      )}
                      <Chip label={result.source} size="small" sx={{ fontSize: 9, height: 18, bgcolor: `${ACCENT}15`, color: ACCENT }} />
                    </Box>
                    
                    {aiSummaries[result.id] && (
                      <Paper elevation={0} sx={{ mt: 2, p: 1.5, bgcolor: dark ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.05)', borderRadius: 2, border: '1px solid', borderColor: 'rgba(139,92,246,0.2)' }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box component="span" sx={{ fontSize: 16 }}>✨</Box> AI Summary
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.6 }}>
                          {aiSummaries[result.id]}
                        </Typography>
                      </Paper>
                    )}
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={loadingSummary[result.id]}
                    onClick={() => generateAISummary(result)}
                    sx={{ 
                      textTransform: 'none', 
                      borderRadius: 2, 
                      fontSize: 12,
                      borderColor: '#8b5cf6',
                      color: '#8b5cf6',
                      '&:hover': { borderColor: '#7c3aed', bgcolor: 'rgba(139,92,246,0.05)' }
                    }}
                  >
                    {loadingSummary[result.id] ? (
                      <CircularProgress size={14} sx={{ mr: 0.5 }} />
                    ) : (
                      '✨'
                    )} AI Summary
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => handleImportSingle(result)}
                    sx={{ 
                      textTransform: 'none', 
                      borderRadius: 2, 
                      fontSize: 12,
                      bgcolor: ACCENT,
                      '&:hover': { bgcolor: '#0e7490' }
                    }}
                  >
                    Import to Library
                  </Button>
                </Box>
              </Paper>
            ))}
            </Box>
          )}
          
          <TablePagination
            component="div"
            count={searchResults.length}
            page={resultsPage}
            onPageChange={(_, newPage) => setResultsPage(newPage)}
            rowsPerPage={resultsPerPage}
            rowsPerPageOptions={[]}
            sx={{ borderTop: '1px solid', borderColor: 'divider', mt: 2 }}
          />
          
          {hasMoreResults && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, pb: 2 }}>
              <Button
                variant="outlined"
                onClick={loadMoreResults}
                disabled={loadingMore}
                startIcon={loadingMore ? <CircularProgress size={16} /> : null}
                sx={{
                  textTransform: 'none',
                  borderRadius: 2,
                  borderColor: ACCENT,
                  color: ACCENT,
                  '&:hover': { borderColor: '#0e7490', bgcolor: `${ACCENT}08` }
                }}
              >
                {loadingMore ? 'Loading...' : `Load More Results (${(totalResultsCount - searchResults.length).toLocaleString()} remaining)`}
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Library Manager Dialog */}
      <LibraryManagerDialog
        open={libraryDialogOpen}
        onClose={() => setLibraryDialogOpen(false)}
        libraries={libraries}
        selectedLibrary={selectedLibrary}
        setSelectedLibrary={setSelectedLibrary}
        selectedFolder={selectedFolder}
        setSelectedFolder={setSelectedFolder}
        expandedFolders={expandedFolders}
        toggleFolder={toggleFolder}
        currentImportPub={currentImportPub}
        onConfirmImport={confirmImport}
        theme={theme}
        onCreateLibrary={createLibrary}
        onDeleteLibrary={deleteLibraryItem}
        onRenameLibrary={renameLibraryItem}
        onMoveLibrary={moveLibraryItem}
        onDeletePublication={deletePublication}
        onMovePublication={movePublication}
      />

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
