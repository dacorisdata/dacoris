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
  ExpandMore as ExpandIcon, ChevronRight as CollapseIcon, Lock as LockIcon,
  Visibility as VisibilityIcon, VisibilityOff as VisibilityOffIcon,
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

const MOCK_ZOTERO = [
  { id: 8, title: 'Antibiotic resistance mechanisms in Gram-negative bacteria', authors: 'Odhiambo, A., et al.', journal: 'Microbiology Reviews', year: 2022, doi: '10.1128/MMBR.00045-21', source: 'Zotero' },
  { id: 9, title: 'Sustainable agriculture practices for smallholder farmers', authors: 'Mwangi, J.', journal: 'Agriculture & Food Security', year: 2023, doi: '10.1186/s40066-023-00412-1', source: 'Zotero' },
];

const MOCK_R4L = [
  { id: 10, title: 'Malaria control strategies in sub-Saharan Africa: a systematic review', authors: 'Njoroge, P., et al.', journal: 'The Lancet Global Health', year: 2023, doi: '10.1016/S2214-109X(23)00112-4', source: 'Research4Life' },
  { id: 11, title: 'Food security and climate adaptation in East African smallholder systems', authors: 'Wanjiru, C., Kimani, D.', journal: 'Food Policy', year: 2024, doi: '10.1016/j.foodpol.2024.102456', source: 'Research4Life' },
];

// Helper to parse a single Crossref API item into our standard pub shape
const parseCrossrefItem = (item) => ({
  id: `crossref_${item.DOI}`,
  title: (Array.isArray(item.title) ? item.title[0] : item.title) || 'No title',
  authors: item.author
    ? item.author.slice(0, 3)
        .map(a => [a.family, a.given ? a.given.charAt(0) + '.' : ''].filter(Boolean).join(' '))
        .join(', ') + (item.author.length > 3 ? ', et al.' : '')
    : 'Unknown',
  journal: (Array.isArray(item['container-title']) ? item['container-title'][0] : item['container-title']) || 'Unknown',
  year: (
    item.published?.['date-parts']?.[0]?.[0] ||
    item['published-print']?.['date-parts']?.[0]?.[0] ||
    item['published-online']?.['date-parts']?.[0]?.[0] ||
    'N/A'
  ).toString(),
  doi: item.DOI || '',
  source: 'Crossref',
  abstract: item.abstract ? item.abstract.replace(/<[^>]+>/g, '').trim() : '',
  type: item.type || '',
});

// Helper to parse a single OpenAlex API work into our standard pub shape
const parseOpenAlexItem = (item) => ({
  id: `openalex_${(item.id || '').replace('https://openalex.org/', '') || item.doi || Math.random()}`,
  title: item.display_name || item.title || 'No title',
  authors: item.authorships?.length
    ? item.authorships.slice(0, 3).map(a => a.author?.display_name).filter(Boolean).join(', ') + (item.authorships.length > 3 ? ', et al.' : '')
    : 'Unknown',
  journal: item.primary_location?.source?.display_name || item.host_venue?.display_name || 'Unknown',
  year: item.publication_year ? String(item.publication_year) : 'N/A',
  doi: item.doi ? item.doi.replace('https://doi.org/', '') : '',
  source: 'OpenAlex',
  abstract: '',
});

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

  // Research4Life institutional login
  const [r4lLoginOpen, setR4lLoginOpen] = useState(false);
  const [r4lUsername, setR4lUsername] = useState('');
  const [r4lPassword, setR4lPassword] = useState('');
  const [r4lInstitution, setR4lInstitution] = useState('');
  const [r4lShowPassword, setR4lShowPassword] = useState(false);
  const [r4lLoggingIn, setR4lLoggingIn] = useState(false);
  const [r4lConnected, setR4lConnected] = useState(false);
  const [r4lError, setR4lError] = useState('');

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

  const handleR4lLogin = async () => {
    if (!r4lUsername.trim() || !r4lPassword.trim()) {
      setR4lError('Please enter your username and password.');
      return;
    }
    setR4lLoggingIn(true);
    setR4lError('');
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setR4lConnected(true);
      setR4lLoginOpen(false);
      setR4lPassword('');
      setSnackbar({ open: true, message: 'Successfully connected to Research4Life', severity: 'success' });
    } catch {
      setR4lError('Login failed. Please check your credentials and try again.');
    } finally {
      setR4lLoggingIn(false);
    }
  };

  const handleR4lDisconnect = () => {
    setR4lConnected(false);
    setR4lUsername('');
    setR4lPassword('');
    setR4lInstitution('');
    setSnackbar({ open: true, message: 'Disconnected from Research4Life', severity: 'info' });
  };

  const handleSearch = async (isLoadMore = false) => {
    if (searchSource === 'Research4Life' && !r4lConnected) {
      return;
    }
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
      } else if (searchSource === 'Crossref') {
        const isDOI = /^10\.\d{4,}/.test(searchQuery.trim());
        const currentOffset = isLoadMore ? searchResults.length : 0;
        const rows = 20;

        if (isDOI) {
          // Direct DOI lookup
          const doiRes = await fetch(
            `https://api.crossref.org/works/${encodeURIComponent(searchQuery.trim())}`
          );
          if (!doiRes.ok) throw new Error('DOI not found in Crossref');
          const doiData = await doiRes.json();
          const result = parseCrossrefItem(doiData.message);

          setSearchResults([result]);
          setTotalResultsCount(1);
          setHasMoreResults(false);
          if (!isLoadMore) setResultsModalOpen(true);
        } else {
          // Build search URL
          let url = `https://api.crossref.org/works?rows=${rows}&offset=${currentOffset}`;
          if (searchQuery.trim()) url += `&query=${encodeURIComponent(searchQuery.trim())}`;
          if (advancedFields.author) url += `&query.author=${encodeURIComponent(advancedFields.author)}`;
          if (advancedFields.journal) url += `&query.container-title=${encodeURIComponent(advancedFields.journal)}`;

          const filterParts = [];
          if (advancedFields.yearFrom) filterParts.push(`from-pub-date:${advancedFields.yearFrom}`);
          if (advancedFields.yearTo) filterParts.push(`until-pub-date:${advancedFields.yearTo}`);
          if (advancedFields.openAccess) filterParts.push('is-oa:true');
          if (filterParts.length > 0) url += `&filter=${filterParts.join(',')}`;

          const crossrefRes = await fetch(url);
          const crossrefData = await crossrefRes.json();

          const totalCount = crossrefData.message?.['total-results'] || 0;
          const items = crossrefData.message?.items || [];
          const results = items.map(parseCrossrefItem);

          if (isLoadMore) {
            setSearchResults(prev => [...prev, ...results]);
          } else {
            setSearchResults(results);
          }

          setTotalResultsCount(totalCount);
          setHasMoreResults(currentOffset + results.length < totalCount);
          if (results.length > 0 && !isLoadMore) setResultsModalOpen(true);
        }
      } else if (searchSource === 'OpenAlex') {
        const perPage = 25;
        const currentPage = isLoadMore ? Math.floor(searchResults.length / perPage) + 1 : 1;

        const filterParts = [];
        if (advancedFields.author) filterParts.push(`authorships.author.display_name.search:${advancedFields.author}`);
        if (advancedFields.journal) filterParts.push(`primary_location.source.display_name.search:${advancedFields.journal}`);
        if (advancedFields.yearFrom) filterParts.push(`from_publication_date:${advancedFields.yearFrom}-01-01`);
        if (advancedFields.yearTo) filterParts.push(`to_publication_date:${advancedFields.yearTo}-12-31`);
        if (advancedFields.openAccess) filterParts.push('is_oa:true');

        let url = `https://api.openalex.org/works?per_page=${perPage}&page=${currentPage}`;
        const searchTerms = [searchQuery.trim(), advancedFields.keywords].filter(Boolean).join(' ');
        if (searchTerms) url += `&search=${encodeURIComponent(searchTerms)}`;
        if (filterParts.length > 0) url += `&filter=${encodeURIComponent(filterParts.join(','))}`;

        const openAlexRes = await fetch(url);
        if (!openAlexRes.ok) throw new Error('OpenAlex request failed');
        const openAlexData = await openAlexRes.json();

        const totalCount = openAlexData.meta?.count || 0;
        const items = openAlexData.results || [];
        const results = items.map(parseOpenAlexItem);

        if (isLoadMore) {
          setSearchResults(prev => [...prev, ...results]);
        } else {
          setSearchResults(results);
        }

        setTotalResultsCount(totalCount);
        setHasMoreResults(currentPage * perPage < totalCount);
        if (results.length > 0 && !isLoadMore) setResultsModalOpen(true);
      } else if (searchSource === 'Research4Life' && r4lConnected) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        const query = searchQuery.trim().toLowerCase();
        const results = query
          ? MOCK_R4L.filter(
              (item) =>
                item.title.toLowerCase().includes(query) ||
                item.authors.toLowerCase().includes(query) ||
                item.journal.toLowerCase().includes(query)
            )
          : MOCK_R4L;

        if (isLoadMore) {
          setSearchResults((prev) => [...prev, ...results]);
        } else {
          setSearchResults(results);
        }
        setTotalResultsCount(results.length);
        setHasMoreResults(false);
        if (results.length > 0 && !isLoadMore) setResultsModalOpen(true);
      }
    } catch (error) {
      console.error('Search error:', error);
      if (!isLoadMore) {
        // Fallback to mock data on error (Crossref and OpenAlex use live APIs, no mock fallback)
        let results = [];
        if (searchSource === 'PubMed') results = MOCK_PUBMED;
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
      } else if (searchSource === 'Crossref') {
        // Build Crossref refined search URL
        let url = `https://api.crossref.org/works?rows=20&offset=0`;

        // Combine base query with filter keyword
        const baseQuery = [searchQuery.trim(), resultsFilter.keyword].filter(Boolean).join(' ');
        if (baseQuery) url += `&query=${encodeURIComponent(baseQuery)}`;

        // Author: combine advanced field + results filter
        const authorQuery = [advancedFields.author, resultsFilter.author].filter(Boolean).join(' ');
        if (authorQuery) url += `&query.author=${encodeURIComponent(authorQuery)}`;

        // Title filter
        if (resultsFilter.title) url += `&query.title=${encodeURIComponent(resultsFilter.title)}`;

        if (advancedFields.journal) url += `&query.container-title=${encodeURIComponent(advancedFields.journal)}`;

        const filterParts = [];
        if (advancedFields.yearFrom) filterParts.push(`from-pub-date:${advancedFields.yearFrom}`);
        if (advancedFields.yearTo) filterParts.push(`until-pub-date:${advancedFields.yearTo}`);
        if (resultsFilter.year) filterParts.push(`from-pub-date:${resultsFilter.year},until-pub-date:${resultsFilter.year}`);
        if (advancedFields.openAccess) filterParts.push('is-oa:true');
        if (filterParts.length > 0) url += `&filter=${filterParts.join(',')}`;

        const crossrefRes = await fetch(url);
        const crossrefData = await crossrefRes.json();

        const totalCount = crossrefData.message?.['total-results'] || 0;
        const items = crossrefData.message?.items || [];
        const results = items.map(parseCrossrefItem);

        setSearchResults(results);
        setTotalResultsCount(totalCount);
        setHasMoreResults(results.length < totalCount);
      } else if (searchSource === 'OpenAlex') {
        const perPage = 25;

        const filterParts = [];
        const authorQuery = [advancedFields.author, resultsFilter.author].filter(Boolean).join(' ');
        if (authorQuery) filterParts.push(`authorships.author.display_name.search:${authorQuery}`);
        if (advancedFields.journal) filterParts.push(`primary_location.source.display_name.search:${advancedFields.journal}`);
        if (advancedFields.yearFrom) filterParts.push(`from_publication_date:${advancedFields.yearFrom}-01-01`);
        if (advancedFields.yearTo) filterParts.push(`to_publication_date:${advancedFields.yearTo}-12-31`);
        if (resultsFilter.year) filterParts.push(`from_publication_date:${resultsFilter.year}-01-01,to_publication_date:${resultsFilter.year}-12-31`);
        if (advancedFields.openAccess) filterParts.push('is_oa:true');

        const searchTerms = [searchQuery.trim(), resultsFilter.keyword, resultsFilter.title].filter(Boolean).join(' ');
        let url = `https://api.openalex.org/works?per_page=${perPage}&page=1`;
        if (searchTerms) url += `&search=${encodeURIComponent(searchTerms)}`;
        if (filterParts.length > 0) url += `&filter=${encodeURIComponent(filterParts.join(','))}`;

        const openAlexRes = await fetch(url);
        if (!openAlexRes.ok) throw new Error('OpenAlex request failed');
        const openAlexData = await openAlexRes.json();

        const totalCount = openAlexData.meta?.count || 0;
        const items = openAlexData.results || [];
        const results = items.map(parseOpenAlexItem);

        setSearchResults(results);
        setTotalResultsCount(totalCount);
        setHasMoreResults(results.length < totalCount);
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
                      <MenuItem value="Research4Life">Research4Life</MenuItem>
                    </Select>
                  </FormControl>
                  {searchSource === 'Research4Life' && r4lConnected && (
                    <Chip
                      label="Connected"
                      color="success"
                      size="small"
                      onDelete={handleR4lDisconnect}
                      sx={{ alignSelf: 'center' }}
                    />
                  )}
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
                    disabled={!searchQuery.trim() || searching || (searchSource === 'Research4Life' && !r4lConnected)}
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

              {searchSource === 'Research4Life' && !r4lConnected ? (
                <Paper elevation={0} variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 3, borderStyle: 'dashed', borderColor: ACCENT }}>
                  <LockIcon sx={{ fontSize: 48, color: ACCENT, mb: 2 }} />
                  <Typography sx={{ fontSize: 15, fontWeight: 600, mb: 1 }}>Institutional login required</Typography>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary', maxWidth: 420, mx: 'auto', mb: 3 }}>
                    Research4Life (Hinari, AGORA, ARDI, GOALI, OARE) doesn't offer a public search API. Log in with
                    your institution's Research4Life credentials to search content from within DACORIS.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<LockIcon />}
                    onClick={() => { setR4lError(''); setR4lLoginOpen(true); }}
                    sx={{ textTransform: 'none', borderRadius: 2, bgcolor: ACCENT, '&:hover': { bgcolor: '#0e7490' } }}
                  >
                    Log in to Research4Life
                  </Button>
                </Paper>
              ) : searching ? (
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

      {/* Research4Life Login Modal */}
      <Dialog
        open={r4lLoginOpen}
        onClose={() => !r4lLoggingIn && setR4lLoginOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockIcon sx={{ color: ACCENT }} />
            Log in to Research4Life
          </Box>
          <IconButton size="small" onClick={() => setR4lLoginOpen(false)} disabled={r4lLoggingIn}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2.5 }}>
            Enter your institution's Research4Life credentials. Access covers Hinari, AGORA, ARDI, GOALI, and OARE collections.
          </Typography>
          {r4lError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {r4lError}
            </Alert>
          )}
          <TextField
            fullWidth
            label="Username or email"
            value={r4lUsername}
            onChange={(e) => setR4lUsername(e.target.value)}
            disabled={r4lLoggingIn}
            autoFocus
            sx={{ mb: 2 }}
            onKeyDown={(e) => e.key === 'Enter' && handleR4lLogin()}
          />
          <TextField
            fullWidth
            label="Password"
            type={r4lShowPassword ? 'text' : 'password'}
            value={r4lPassword}
            onChange={(e) => setR4lPassword(e.target.value)}
            disabled={r4lLoggingIn}
            sx={{ mb: 2 }}
            onKeyDown={(e) => e.key === 'Enter' && handleR4lLogin()}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setR4lShowPassword((v) => !v)} edge="end">
                    {r4lShowPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            fullWidth
            label="Institution (optional)"
            placeholder="e.g. University of Nairobi"
            value={r4lInstitution}
            onChange={(e) => setR4lInstitution(e.target.value)}
            disabled={r4lLoggingIn}
            helperText="Your affiliated institution for Research4Life access"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setR4lLoginOpen(false)} disabled={r4lLoggingIn} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleR4lLogin}
            disabled={r4lLoggingIn || !r4lUsername.trim() || !r4lPassword.trim()}
            sx={{ textTransform: 'none', borderRadius: 2, bgcolor: ACCENT, '&:hover': { bgcolor: '#0e7490' }, minWidth: 100 }}
          >
            {r4lLoggingIn ? <CircularProgress size={20} color="inherit" /> : 'Log in'}
          </Button>
        </DialogActions>
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
