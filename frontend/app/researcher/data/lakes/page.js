'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Paper,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tabs,
  Tab,
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Avatar,
  Tooltip,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  FormControlLabel,
  Switch,
  RadioGroup,
  Radio,
  FormControl,
  FormLabel,
  CircularProgress,
} from '@mui/material';
import {
  Storage as StorageIcon,
  MoreVert as MoreIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  CloudUpload as KoboIcon,
  Google as GoogleIcon,
  TableChart as ExcelIcon,
  TrendingUp as TrendingIcon,
  CheckCircle as CheckIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
  Publish as NewVersionIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';

const TiptapEditor = dynamic(() => import('@/components/TiptapEditor'), { ssr: false });

const ACCENT = '#1ca7a1';

const isRichTextEmpty = (html) => {
  if (!html || !html.trim()) return true;
  const text = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  return !text;
};

const DATA_STAGES = {
  raw: { label: 'Raw', color: '#6b7280', icon: StorageIcon, description: 'Unprocessed data from sources' },
  cleaned: { label: 'Cleaned', color: '#f59e0b', icon: CheckIcon, description: 'Data cleaned and validated' },
  processed: { label: 'Processed', color: '#3b82f6', icon: TrendingIcon, description: 'Transformed and enriched data' },
  analyzed: { label: 'Analyzed', color: '#8b5cf6', icon: TrendingIcon, description: 'Data with analysis results' },
  published: { label: 'Published', color: '#10b981', icon: CheckIcon, description: 'Finalized and published data' },
};

const SOURCE_TYPE_MAP = {
  google_sheets: { label: 'Google Sheets', icon: GoogleIcon, color: '#34a853' },
  kobo_collect: { label: 'KoboCollect', icon: KoboIcon, color: '#1ca7a1' },
  excel: { label: 'Excel', icon: ExcelIcon, color: '#217346' },
  file_upload: { label: 'File Upload', icon: StorageIcon, color: '#6b7280' },
  url: { label: 'URL', icon: StorageIcon, color: '#6b7280' },
  api_feed: { label: 'API Feed', icon: StorageIcon, color: '#6b7280' },
};

const formatFileSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const mapImportToEntry = (imp, projects) => {
  const project = projects.find(p => p.id === imp.project_id);
  const tags = [imp.source_tag];
  if (imp.file_format) tags.push(imp.file_format);
  return {
    id: imp.id,
    name: imp.source_tag,
    source: SOURCE_TYPE_MAP[imp.source_type]?.label || imp.source_type,
    sourceType: imp.source_type,
    project: project?.title || '—',
    stage: 'raw',
    records: imp.record_count ?? null,
    size: formatFileSize(imp.file_size_bytes),
    created: imp.created_at,
    updated: imp.ingest_completed_at || imp.updated_at || imp.created_at,
    version: imp.version_number || 1,
    isCurrentVersion: imp.is_current_version !== false,
    datasetKey: imp.dataset_key,
    projectId: imp.project_id,
    tags,
    bronzePath: imp.bronze_path,
    bronzeBucket: imp.bronze_bucket,
    fileName: imp.file_name,
    description: imp.description,
    ingestCompletedAt: imp.ingest_completed_at,
    analysisMode: imp.analysis_mode || 'self',
    expectedVisuals: imp.expected_visuals || '',
  };
};

export default function DataLakesPage() {
  const { token } = useAuth();
  const router = useRouter();

  const [currentTab, setCurrentTab] = useState('all');
  const [latestOnly, setLatestOnly] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [rawImports, setRawImports] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [versionHistory, setVersionHistory] = useState([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editAnalysisMode, setEditAnalysisMode] = useState('self');
  const [editExpectedVisuals, setEditExpectedVisuals] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const dataLakeEntries = useMemo(
    () => rawImports.map(imp => mapImportToEntry(imp, projects)),
    [rawImports, projects],
  );

  const loadProjects = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/research/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(Array.isArray(data) ? data : []);
      }
    } catch (_) {}
  }, [token]);

  const loadIngestedData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError('');
    try {
      const qs = new URLSearchParams({
        status_filter: 'ingested',
        page_size: '100',
        ...(latestOnly && { latest_only: 'true' }),
      });
      const res = await fetch(
        `/api/research/lakehouse-imports?${qs}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) {
        throw new Error('Failed to load ingested data');
      }
      const data = await res.json();
      setRawImports(data.imports || []);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, latestOnly]);

  useEffect(() => {
    if (token) {
      loadProjects();
      loadIngestedData();
    }
  }, [token, loadProjects, loadIngestedData]);

  const handleMenuOpen = (event, dataset) => {
    setAnchorEl(event.currentTarget);
    setSelectedDataset(dataset);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleViewDetails = async () => {
    setViewDialog(true);
    handleMenuClose();
    if (!selectedDataset?.datasetKey || !token) {
      setVersionHistory([]);
      return;
    }
    try {
      const res = await fetch(
        '/api/research/lakehouse-imports?status_filter=ingested&page_size=100',
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const data = await res.json();
        const history = (data.imports || [])
          .filter(imp => imp.dataset_key === selectedDataset.datasetKey)
          .sort((a, b) => (b.version_number || 1) - (a.version_number || 1));
        setVersionHistory(history);
      }
    } catch (_) {
      setVersionHistory([]);
    }
  };

  const handleDelete = async () => {
    if (!selectedDataset || !confirm(`Are you sure you want to delete "${selectedDataset?.name}"?`)) {
      handleMenuClose();
      return;
    }
    try {
      await fetch(`/api/research/lakehouse-imports/${selectedDataset.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setRawImports(entries => entries.filter(e => e.id !== selectedDataset.id));
    } catch (_) {}
    handleMenuClose();
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const handleImportNewVersion = () => {
    if (!selectedDataset) return;
    const qs = new URLSearchParams({
      tag: selectedDataset.name,
      source_type: selectedDataset.sourceType,
      ...(selectedDataset.projectId && { project_id: selectedDataset.projectId }),
    });
    router.push(`/researcher/data/import?${qs}`);
    handleMenuClose();
  };

  const handleEditAnalysis = () => {
    if (!selectedDataset) return;
    setEditAnalysisMode(selectedDataset.analysisMode || 'self');
    setEditExpectedVisuals(selectedDataset.expectedVisuals || '');
    setEditError('');
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleSaveAnalysis = async () => {
    if (!selectedDataset || !token) return;
    if (editAnalysisMode === 'dacoris' && isRichTextEmpty(editExpectedVisuals)) {
      setEditError('Expected visuals are required when procuring the Dacoris Data Team');
      return;
    }
    setEditSaving(true);
    setEditError('');
    try {
      const res = await fetch(`/api/research/lakehouse-imports/${selectedDataset.id}/analysis`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysis_mode: editAnalysisMode,
          expected_visuals: editAnalysisMode === 'dacoris' ? editExpectedVisuals : null,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.detail || 'Failed to update analysis preferences');
      }
      const updated = await res.json();
      setRawImports(imports =>
        imports.map(imp => (imp.id === updated.id ? { ...imp, ...updated } : imp)),
      );
      setSelectedDataset(prev => prev ? {
        ...prev,
        analysisMode: updated.analysis_mode,
        expectedVisuals: updated.expected_visuals || '',
      } : prev);
      setEditDialogOpen(false);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSaving(false);
    }
  };

  const getFilteredEntries = () => {
    let filtered = dataLakeEntries;

    if (currentTab !== 'all') {
      filtered = filtered.filter(e => e.stage === currentTab);
    }

    if (searchTerm) {
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return filtered;
  };

  const getStageStats = () => {
    const stats = {};
    Object.keys(DATA_STAGES).forEach(stage => {
      stats[stage] = dataLakeEntries.filter(e => e.stage === stage).length;
    });
    return stats;
  };

  const stageStats = getStageStats();
  const filteredEntries = getFilteredEntries();
  const totalDatasets = dataLakeEntries.length;
  const totalRecords = dataLakeEntries.reduce((sum, e) => sum + (e.records || 0), 0);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Data Lakes
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Ingested datasets stored in MinIO Bronze — ready for processing
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={latestOnly}
                  onChange={(e) => setLatestOnly(e.target.checked)}
                  size="small"
                  sx={{ '& .Mui-checked': { color: '#1ca7a1' }, '& .Mui-checked + .MuiSwitch-track': { bgcolor: '#1ca7a1' } }}
                />
              }
              label={<Typography variant="caption" sx={{ fontWeight: 600 }}>Latest versions only</Typography>}
            />
            <Button startIcon={<RefreshIcon />} onClick={loadIngestedData} size="small" disabled={loading}>
              Refresh
            </Button>
          </Box>
        </Box>

        {loadError && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{loadError}</Alert>
        )}

        {/* Stats Cards */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Card sx={{ 
            flex: '1 1 calc(25% - 16px)', 
            minWidth: 180,
            background: 'linear-gradient(135deg, #1ca7a1 0%, #158f8a 100%)', 
            color: 'white' 
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5, fontSize: 13 }}>
                Total Datasets
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {totalDatasets}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ 
            flex: '1 1 calc(25% - 16px)', 
            minWidth: 180,
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
            color: 'white' 
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5, fontSize: 13 }}>
                Total Records
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {totalRecords.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ 
            flex: '1 1 calc(25% - 16px)', 
            minWidth: 180,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
            color: 'white' 
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5, fontSize: 13 }}>
                Published
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {stageStats.published}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ 
            flex: '1 1 calc(25% - 16px)', 
            minWidth: 180,
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', 
            color: 'white' 
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5, fontSize: 13 }}>
                In Analysis
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {stageStats.analyzed}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Search Bar */}
        <TextField
          fullWidth
          placeholder="Search datasets by name, project, or tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              bgcolor: 'background.paper',
            },
          }}
        />
      </Box>

      {/* Stage Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={currentTab}
          onChange={(e, newValue) => setCurrentTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              minHeight: 56,
            },
          }}
        >
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                All Stages
                <Chip
                  label={totalDatasets}
                  size="small"
                  sx={{
                    bgcolor: '#1ca7a115',
                    color: '#1ca7a1',
                    fontWeight: 600,
                    height: 20,
                    fontSize: 11,
                  }}
                />
              </Box>
            }
            value="all"
          />
          {Object.entries(DATA_STAGES).map(([key, stage]) => (
            <Tab
              key={key}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {stage.label}
                  <Chip
                    label={stageStats[key]}
                    size="small"
                    sx={{
                      bgcolor: `${stage.color}15`,
                      color: stage.color,
                      fontWeight: 600,
                      height: 20,
                      fontSize: 11,
                    }}
                  />
                </Box>
              }
              value={key}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Data Lake Table */}
      {loading ? (
        <LinearProgress sx={{ borderRadius: 1, mb: 2 }} />
      ) : null}
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 600, fontSize: 13, color: 'text.secondary' }}>
                DATASET
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: 13, color: 'text.secondary' }}>
                SOURCE
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: 13, color: 'text.secondary' }}>
                PROJECT
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: 13, color: 'text.secondary' }}>
                STAGE
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: 13, color: 'text.secondary' }}>
                RECORDS
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: 13, color: 'text.secondary' }}>
                SIZE
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: 13, color: 'text.secondary' }}>
                VERSION
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: 13, color: 'text.secondary' }}>
                LAST UPDATED
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: 13, color: 'text.secondary', width: 80 }}>
                ACTIONS
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">
                    {searchTerm
                      ? 'No datasets found matching your search'
                      : currentTab === 'all'
                        ? 'No ingested datasets yet. Completed imports will appear here after ingestion.'
                        : 'No datasets in this stage'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry) => {
                const stageInfo = DATA_STAGES[entry.stage];
                const sourceInfo = SOURCE_TYPE_MAP[entry.sourceType];
                const SourceIcon = sourceInfo?.icon || StorageIcon;
                
                return (
                  <TableRow
                    key={entry.id}
                    hover
                    onClick={() => router.push(`/researcher/data/lakes/${entry.id}`)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'grey.50' },
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: ACCENT }}>
                          {entry.name}
                          {entry.isCurrentVersion && (
                            <Chip
                              label="Latest"
                              size="small"
                              sx={{ ml: 1, height: 18, fontSize: 10, bgcolor: '#10b98115', color: '#059669', fontWeight: 600 }}
                            />
                          )}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {entry.tags.map((tag) => (
                            <Chip
                              key={tag}
                              label={tag}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: 10,
                                bgcolor: 'grey.100',
                                color: 'text.secondary',
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar
                          sx={{
                            width: 28,
                            height: 28,
                            bgcolor: `${sourceInfo?.color || '#1ca7a1'}15`,
                            color: sourceInfo?.color || '#1ca7a1',
                          }}
                        >
                          <SourceIcon sx={{ fontSize: 16 }} />
                        </Avatar>
                        <Typography variant="body2" sx={{ fontSize: 13 }}>
                          {entry.source}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: 13 }}>
                        {entry.project}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={stageInfo.label}
                        size="small"
                        sx={{
                          bgcolor: `${stageInfo.color}15`,
                          color: stageInfo.color,
                          fontWeight: 600,
                          fontSize: 11,
                          borderRadius: 1.5,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {entry.records != null ? entry.records.toLocaleString() : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: 13, color: 'text.secondary' }}>
                        {entry.size}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`v${entry.version}`}
                        size="small"
                        sx={{
                          bgcolor: '#1ca7a115',
                          color: '#1ca7a1',
                          fontWeight: 600,
                          fontSize: 11,
                          borderRadius: 1.5,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {new Date(entry.updated).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled' }}>
                        {new Date(entry.updated).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); handleMenuOpen(e, entry); }}
                        sx={{ '&:hover': { bgcolor: 'grey.100' } }}
                      >
                        <MoreIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { borderRadius: 2, minWidth: 180 },
        }}
      >
        <MenuItem onClick={handleViewDetails}>
          <ViewIcon fontSize="small" sx={{ mr: 1.5 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={handleImportNewVersion}>
          <NewVersionIcon fontSize="small" sx={{ mr: 1.5 }} />
          Import New Version
        </MenuItem>
        <MenuItem onClick={handleEditAnalysis}>
          <EditIcon fontSize="small" sx={{ mr: 1.5 }} />
          Edit Analysis Request
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <DownloadIcon fontSize="small" sx={{ mr: 1.5 }} />
          Download
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* View Details Dialog */}
      <Dialog
        open={viewDialog}
        onClose={() => setViewDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Dataset Details
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedDataset && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    {selectedDataset.name}
                  </Typography>
                  <Chip
                    label={DATA_STAGES[selectedDataset.stage].label}
                    sx={{
                      bgcolor: `${DATA_STAGES[selectedDataset.stage].color}15`,
                      color: DATA_STAGES[selectedDataset.stage].color,
                      fontWeight: 600,
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Source
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {selectedDataset.source}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Project
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {selectedDataset.project}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Records
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {selectedDataset.records != null ? selectedDataset.records.toLocaleString() : '—'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Analysis
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {selectedDataset.analysisMode === 'dacoris' ? 'Dacoris Data Team' : 'Self-analysis'}
                  </Typography>
                </Grid>
                {selectedDataset.analysisMode === 'dacoris' && !isRichTextEmpty(selectedDataset.expectedVisuals) && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Expected Visuals
                    </Typography>
                    <Box
                      sx={{
                        mt: 0.5,
                        fontSize: 14,
                        lineHeight: 1.6,
                        '& p': { margin: '0 0 0.5em' },
                        '& ul, & ol': { pl: 2.5, my: 0.5 },
                      }}
                      dangerouslySetInnerHTML={{ __html: selectedDataset.expectedVisuals }}
                    />
                  </Grid>
                )}
                {selectedDataset.bronzePath && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Bronze Path
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>
                        {selectedDataset.bronzePath}
                      </Typography>
                      <Tooltip title="Copy path">
                        <IconButton size="small" onClick={() => handleCopy(selectedDataset.bronzePath)}>
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Grid>
                )}
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Size
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {selectedDataset.size}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Version
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    v{selectedDataset.version}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body2">
                    {new Date(selectedDataset.created).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Last Updated
                  </Typography>
                  <Typography variant="body2">
                    {new Date(selectedDataset.updated).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Tags
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                    {selectedDataset.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" />
                    ))}
                  </Box>
                </Grid>
                {versionHistory.length > 1 && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Version History
                    </Typography>
                    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                      {versionHistory.map((v) => (
                        <Box
                          key={v.id}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            p: 1,
                            borderRadius: 1,
                            bgcolor: v.id === selectedDataset.id ? '#1ca7a108' : 'grey.50',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip label={`v${v.version_number || 1}`} size="small" sx={{ fontWeight: 600, fontSize: 11 }} />
                            {v.is_current_version && (
                              <Chip label="Latest" size="small" sx={{ height: 18, fontSize: 10, bgcolor: '#10b98115', color: '#059669' }} />
                            )}
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {(v.record_count != null ? `${v.record_count.toLocaleString()} records · ` : '')}
                            {new Date(v.ingest_completed_at || v.created_at).toLocaleString()}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setViewDialog(false)} sx={{ textTransform: 'none' }}>
            Close
          </Button>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => {
              setViewDialog(false);
              handleEditAnalysis();
            }}
            sx={{ textTransform: 'none', borderColor: `${ACCENT}66`, color: ACCENT }}
          >
            Edit Analysis
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            sx={{
              bgcolor: '#1ca7a1',
              '&:hover': { bgcolor: '#158f8a' },
              textTransform: 'none',
              px: 3,
            }}
          >
            Download
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Analysis Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => !editSaving && setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Edit Analysis Request
          </Typography>
          {selectedDataset && (
            <Typography variant="caption" color="text.secondary">
              {selectedDataset.name} · v{selectedDataset.version}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControl component="fieldset" sx={{ mb: 2.5, width: '100%' }}>
              <FormLabel component="legend" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
                Data Analysis
              </FormLabel>
              <RadioGroup
                value={editAnalysisMode}
                onChange={(e) => {
                  setEditAnalysisMode(e.target.value);
                  if (e.target.value === 'self') setEditExpectedVisuals('');
                  setEditError('');
                }}
              >
                <FormControlLabel
                  value="self"
                  control={<Radio sx={{ color: ACCENT, '&.Mui-checked': { color: ACCENT } }} />}
                  label="I will analyse the data myself"
                />
                <FormControlLabel
                  value="dacoris"
                  control={<Radio sx={{ color: ACCENT, '&.Mui-checked': { color: ACCENT } }} />}
                  label="Procure the services of the Dacoris Data Team"
                />
              </RadioGroup>
            </FormControl>
            {editAnalysisMode === 'dacoris' && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Expected Visuals <Typography component="span" color="error.main">*</Typography>
                </Typography>
                <TiptapEditor
                  compact
                  content={editExpectedVisuals}
                  onChange={setEditExpectedVisuals}
                  placeholder="Describe the charts, dashboards, or reports you need..."
                />
              </Box>
            )}
            {editError && (
              <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{editError}</Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setEditDialogOpen(false)} disabled={editSaving} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveAnalysis}
            disabled={editSaving}
            sx={{
              bgcolor: ACCENT,
              '&:hover': { bgcolor: '#158f8a' },
              textTransform: 'none',
              minWidth: 100,
            }}
          >
            {editSaving ? <CircularProgress size={22} sx={{ color: 'white' }} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
