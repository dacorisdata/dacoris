'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Avatar,
  InputAdornment,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Alert,
  Select,
  InputLabel,
  FormControl,
  TablePagination,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DynamicForm as KoboIcon,
  TableChart as ExcelIcon,
  Google as GoogleIcon,
  MoreVert as MoreIcon,
  Sync as SyncIcon,
  Search as SearchIcon,
  Link as LinkIcon,
  FiberManualRecord as DotIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';

const DATA_SOURCE_TYPES = [
  { id: 'kobo_collect', name: 'KoboCollect', icon: KoboIcon, color: '#1ca7a1', description: 'Mobile data collection platform' },
  { id: 'google_sheets', name: 'Google Sheets', icon: GoogleIcon, color: '#34a853', description: 'Cloud-based spreadsheet' },
  { id: 'excel', name: 'Excel', icon: ExcelIcon, color: '#217346', description: 'Microsoft Excel files' },
];

const EMPTY_FORM = {
  name: '', source_type: '', url: '', api_key: '',
  asset_uid: '', description: '', is_active: true,
};

export default function DataSourcesPage() {
  const { token } = useAuth();

  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);

  const [openDialog, setOpenDialog] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedSource, setSelectedSource] = useState(null);

  const [groupPages, setGroupPages] = useState({});
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const apiFetch = useCallback(async (path, opts = {}) => {
    const res = await fetch(`/api/research/data-sources${path}`, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Request failed (${res.status})`);
    }
    return res.status === 204 ? null : res.json();
  }, [token]);

  const loadSources = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setApiError('');
    try {
      const data = await apiFetch('');
      setSources(data.sources || []);
    } catch (e) {
      setApiError(e.message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, token]);

  useEffect(() => { loadSources(); }, [loadSources]);

  const handleOpenDialog = (source = null) => {
    if (source) {
      setEditingSource(source);
      setFormData({
        name: source.name,
        source_type: source.source_type,
        url: source.url || '',
        api_key: source.api_key || '',
        asset_uid: source.asset_uid || '',
        description: source.description || '',
        is_active: source.is_active,
      });
    } else {
      setEditingSource(null);
      setFormData(EMPTY_FORM);
    }
    setFormError('');
    setShowApiKey(false);
    setOpenDialog(true);
    setAnchorEl(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSource(null);
    setFormError('');
  };

  const handleSaveSource = async () => {
    if (!formData.name.trim() || !formData.source_type) {
      setFormError('Name and source type are required');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editingSource) {
        const updated = await apiFetch(`/${editingSource.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: formData.name,
            url: formData.url || null,
            api_key: formData.api_key || null,
            asset_uid: formData.asset_uid || null,
            description: formData.description || null,
            is_active: formData.is_active,
          }),
        });
        setSources(s => s.map(x => x.id === updated.id ? updated : x));
      } else {
        const created = await apiFetch('', {
          method: 'POST',
          body: JSON.stringify({
            name: formData.name,
            source_type: formData.source_type,
            url: formData.url || null,
            api_key: formData.api_key || null,
            asset_uid: formData.asset_uid || null,
            description: formData.description || null,
            is_active: formData.is_active,
          }),
        });
        setSources(s => [created, ...s]);
      }
      handleCloseDialog();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMenuOpen = (event, source) => {
    setAnchorEl(event.currentTarget);
    setSelectedSource(source);
  };

  const handleMenuClose = () => { setAnchorEl(null); };

  const handleSync = async () => {
    if (!selectedSource) return;
    handleMenuClose();
    try {
      const updated = await apiFetch(`/${selectedSource.id}/sync`, { method: 'POST' });
      setSources(s => s.map(x => x.id === updated.id ? updated : x));
    } catch (_) {}
  };

  const handleDeleteSource = async () => {
    if (!selectedSource) return;
    if (!confirm(`Delete "${selectedSource.name}"? This cannot be undone.`)) { handleMenuClose(); return; }
    handleMenuClose();
    try {
      await apiFetch(`/${selectedSource.id}`, { method: 'DELETE' });
      setSources(s => s.filter(x => x.id !== selectedSource.id));
    } catch (_) {}
  };

  const getTypeInfo = (typeId) =>
    DATA_SOURCE_TYPES.find(t => t.id === typeId) || { name: typeId, icon: KoboIcon, color: '#6b7280', description: '' };

  const filtered = searchTerm
    ? sources.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        getTypeInfo(s.source_type).name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : sources;

  const activeCount = sources.filter(s => s.is_active).length;
  const totalRecords = sources.reduce((sum, s) => sum + (s.record_count || 0), 0);

  const grouped = DATA_SOURCE_TYPES.map(type => {
    const typeSources = filtered.filter(s => s.source_type === type.id);
    return {
      ...type,
      sources: typeSources,
      count: typeSources.length,
      activeCount: typeSources.filter(s => s.is_active).length,
      totalRecords: typeSources.reduce((sum, s) => sum + (s.record_count || 0), 0),
    };
  }).filter(g => g.sources.length > 0);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>Data Sources</Typography>
            <Typography variant="body2" color="text.secondary">
              Connect and manage external data sources for your research
            </Typography>
          </Box>
          <Button
            variant="contained" startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ bgcolor: '#1ca7a1', '&:hover': { bgcolor: '#158f8a' }, textTransform: 'none', px: 3, borderRadius: 2 }}
          >
            Add Data Source
          </Button>
        </Box>

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Sources', value: sources.length, grad: 'linear-gradient(135deg,#1ca7a1,#158f8a)' },
            { label: 'Active Sources', value: activeCount, grad: 'linear-gradient(135deg,#34a853,#2d8e47)' },
            { label: 'Total Records', value: totalRecords.toLocaleString(), grad: 'linear-gradient(135deg,#3b82f6,#2563eb)' },
          ].map(card => (
            <Paper key={card.label} sx={{ flex: '1 1 200px', p: 2.5, background: card.grad, color: 'white', borderRadius: 2 }}>
              <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5, fontSize: 13 }}>{card.label}</Typography>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>{card.value}</Typography>
            </Paper>
          ))}
        </Box>

        <TextField
          fullWidth placeholder="Search data sources..."
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment> }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'background.paper' } }}
        />
      </Box>

      {loading && <LinearProgress sx={{ borderRadius: 1, mb: 2 }} />}
      {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}

      {!loading && filtered.length === 0 ? (
        <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 2 }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {searchTerm ? 'No sources found matching your search' : 'No data sources configured yet'}
          </Typography>
          {!searchTerm && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}
              sx={{ bgcolor: '#1ca7a1', '&:hover': { bgcolor: '#158f8a' } }}>
              Add Your First Source
            </Button>
          )}
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {grouped.map((group) => {
            const Icon = group.icon;
            const gPage = groupPages[group.id] || 0;
            const pagedSources = group.sources.slice(gPage * rowsPerPage, gPage * rowsPerPage + rowsPerPage);
            return (
              <Accordion key={group.id} defaultExpanded
                sx={{ borderRadius: 2, '&:before': { display: 'none' }, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}
                  sx={{ bgcolor: `${group.color}08`, borderRadius: 2, '&:hover': { bgcolor: `${group.color}12` } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                    <Avatar sx={{ width: 40, height: 40, bgcolor: `${group.color}15`, color: group.color }}>
                      <Icon />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 16 }}>{group.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{group.description}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 3, mr: 2 }}>
                      {[
                        { val: group.count, label: 'Sources', color: group.color },
                        { val: group.activeCount, label: 'Active', color: '#34a853' },
                        { val: group.totalRecords.toLocaleString(), label: 'Records', color: '#3b82f6' },
                      ].map(s => (
                        <Box key={s.label} sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: s.color }}>{s.val}</Typography>
                          <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                          {['SOURCE NAME', 'CONNECTION', 'RECORDS', 'LAST SYNC', 'STATUS', 'ACTIONS'].map(h => (
                            <TableCell key={h} sx={{ fontWeight: 600, fontSize: 13, color: 'text.secondary', ...(h === 'ACTIONS' ? { width: 80 } : {}) }}>
                              {h}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pagedSources.map((source) => {
                          const ti = getTypeInfo(source.source_type);
                          const TIcon = ti.icon;
                          return (
                            <TableRow key={source.id} hover sx={{ '&:hover': { bgcolor: 'grey.50' }, transition: 'background-color 0.2s' }}>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                  <Avatar sx={{ width: 36, height: 36, bgcolor: `${ti.color}15`, color: ti.color }}>
                                    <TIcon sx={{ fontSize: 20 }} />
                                  </Avatar>
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>{source.name}</Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                                      {source.description || '—'}
                                    </Typography>
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell>
                                {source.url ? (
                                  <Tooltip title={source.url}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <LinkIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                      <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {source.url}
                                      </Typography>
                                    </Box>
                                  </Tooltip>
                                ) : (
                                  <Typography variant="caption" color="text.disabled">—</Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {source.record_count != null ? source.record_count.toLocaleString() : '—'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {source.last_sync ? (
                                  <>
                                    <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                                      {new Date(source.last_sync).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled' }}>
                                      {new Date(source.last_sync).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                    </Typography>
                                  </>
                                ) : (
                                  <Typography variant="caption" color="text.disabled">Never</Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  icon={<DotIcon sx={{ fontSize: 12 }} />}
                                  label={source.is_active ? 'Active' : 'Inactive'} size="small"
                                  sx={{
                                    bgcolor: source.is_active ? '#34a85315' : '#9ca3af15',
                                    color: source.is_active ? '#34a853' : '#6b7280',
                                    fontWeight: 600, fontSize: 11, borderRadius: 1.5,
                                    '& .MuiChip-icon': { color: source.is_active ? '#34a853' : '#6b7280' },
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <IconButton size="small" onClick={(e) => handleMenuOpen(e, source)} sx={{ '&:hover': { bgcolor: 'grey.100' } }}>
                                  <MoreIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  <TablePagination
                    component="div"
                    count={group.sources.length}
                    page={gPage}
                    onPageChange={(_, p) => setGroupPages(prev => ({ ...prev, [group.id]: p }))}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setGroupPages({}); }}
                    rowsPerPageOptions={[5, 10, 25]}
                  />
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}

      {/* Action Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}
        PaperProps={{ sx: { borderRadius: 2, minWidth: 180 } }}>
        <MenuItem onClick={handleSync}>
          <ListItemIcon><SyncIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Sync Now</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleOpenDialog(selectedSource)}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit Source</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteSource} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Delete Source</ListItemText>
        </MenuItem>
      </Menu>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {editingSource ? 'Edit Data Source' : 'Add Data Source'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {editingSource ? 'Update source configuration' : 'Connect a new data source'}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Source Name" fullWidth required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Field Survey - Nairobi"
            />
            <TextField
              label="Description" fullWidth multiline rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this data source"
            />
            <FormControl fullWidth required disabled={!!editingSource}>
              <InputLabel>Source Type</InputLabel>
              <Select
                value={formData.source_type}
                onChange={(e) => setFormData({ ...formData, source_type: e.target.value })}
                label="Source Type"
              >
                {DATA_SOURCE_TYPES.map(t => (
                  <MenuItem key={t.id} value={t.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <t.icon sx={{ fontSize: 18, color: t.color }} />
                      {t.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {formData.source_type === 'kobo_collect' && (
              <TextField
                label="Asset UID (Form ID)" fullWidth
                value={formData.asset_uid}
                onChange={(e) => setFormData({ ...formData, asset_uid: e.target.value })}
                placeholder="aXXXXXXXXXXXXXXXXXXXX"
                helperText="Found in KoboToolbox → your form → Settings"
              />
            )}
            {formData.source_type !== 'excel' && (
              <TextField
                label={formData.source_type === 'kobo_collect' ? 'Server URL' : 'Spreadsheet URL'}
                fullWidth
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder={formData.source_type === 'kobo_collect' ? 'https://kf.kobotoolbox.org' : 'https://docs.google.com/spreadsheets/d/...'}
                helperText={formData.source_type === 'google_sheets' ? 'Must be shared with "Anyone with the link"' : 'KoboToolbox server URL'}
              />
            )}
            {formData.source_type !== 'excel' && (
              <TextField
                label="API Key / Token" fullWidth
                type={showApiKey ? 'text' : 'password'}
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                helperText={formData.source_type === 'kobo_collect' ? 'KoboToolbox → Account Settings → API token' : 'OAuth token or service account key'}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowApiKey(v => !v)}>
                        {showApiKey ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            )}
            <FormControlLabel
              control={<Switch checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />}
              label="Active"
            />
            {formError && <Alert severity="error">{formError}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseDialog} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained" onClick={handleSaveSource}
            disabled={saving || !formData.name || !formData.source_type}
            sx={{ bgcolor: '#1ca7a1', '&:hover': { bgcolor: '#158f8a' }, textTransform: 'none', px: 3 }}
          >
            {saving ? 'Saving...' : editingSource ? 'Update Source' : 'Add Source'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
