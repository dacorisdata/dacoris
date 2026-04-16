'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Select, FormControl, InputLabel, useTheme, Menu, ListItemIcon, ListItemText, Checkbox, Autocomplete, IconButton, TablePagination,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, Assignment as AssignmentIcon, ExpandMore as ExpandIcon,
  Edit as ManualIcon, UploadFile as ExcelIcon, CloudDownload as APIIcon, GetApp as DownloadIcon, Delete as DeleteIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../lib/api';

const STATUS_COLORS = {
  open:     { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  upcoming: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  closed:   { bg: 'rgba(100,116,139,0.12)', color: '#64748b' },
  archived: { bg: 'rgba(100,116,139,0.08)', color: '#94a3b8' },
};

const ACCENT = '#8b5cf6';

export default function GrantOpportunitiesPage() {
  const router  = useRouter();
  const { fetchUser } = useAuth();
  const theme   = useTheme();
  const dark    = theme.palette.mode === 'dark';

  const [loading, setLoading]   = useState(true);
  const [opps, setOpps]         = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showExcel, setShowExcel] = useState(false);
  const [showAPI, setShowAPI] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [apiUrl, setApiUrl] = useState('http://localhost:8000/api/grants/opportunities/mock/external-opportunities');
  const [form, setForm] = useState({ 
    title: '', sponsor: '', description: '', categories: [], funding_type: '', 
    currency: 'KES', amount_min: '', amount_max: '', deadline: '', 
    eligibility: '', criteria: '', contact_email: '' 
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState([]);

  useEffect(() => { checkAuth(); }, []);
  useEffect(() => { applyFilter(); }, [opps, search, statusFilter]);
  useEffect(() => { setPage(0); }, [filtered]);

  const checkAuth = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin)      { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    await loadOpps();
    setLoading(false);
  };

  const loadOpps = async () => {
    try {
      const res = await api.get('/grants/opportunities');
      setOpps(res.data || []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load opportunities');
    }
  };

  const applyFilter = () => {
    let data = [...opps];
    if (statusFilter !== 'all') data = data.filter(o => o.status === statusFilter);
    if (search) data = data.filter(o => o.title?.toLowerCase().includes(search.toLowerCase()) || o.sponsor?.toLowerCase().includes(search.toLowerCase()));
    setFiltered(data);
  };

  const handleCreate = async () => {
    if (!form.title) { setError('Title is required'); return; }
    setCreating(true); setError('');
    try {
      const payload = {
        ...form,
        category: form.categories.join(', '),
        amount_min: form.amount_min ? parseFloat(form.amount_min) : null,
        amount_max: form.amount_max ? parseFloat(form.amount_max) : null,
        deadline: form.deadline || null,
      };
      await api.post('/grants/opportunities', payload);
      setShowCreate(false);
      setForm({ title: '', sponsor: '', description: '', categories: [], funding_type: '', currency: 'KES', amount_min: '', amount_max: '', deadline: '', eligibility: '', criteria: '', contact_email: '' });
      setSuccess('Opportunity created successfully');
      setTimeout(() => setSuccess(''), 3000);
      await loadOpps();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create opportunity');
    } finally { setCreating(false); }
  };

  const handleExcelImport = async () => {
    if (!excelFile) { setError('Please select an Excel file'); return; }
    setImporting(true); setError('');
    try {
      const formData = new FormData();
      formData.append('file', excelFile);
      const res = await api.post('/grants/opportunities/import/excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowExcel(false);
      setExcelFile(null);
      setSuccess(`Successfully imported ${res.data.imported_count} of ${res.data.total_rows} opportunities`);
      setTimeout(() => setSuccess(''), 5000);
      await loadOpps();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to import Excel file');
    } finally { setImporting(false); }
  };

  const handleDelete = async (id, title) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await api.delete(`/grants/opportunities/${id}`);
      setSuccess('Opportunity deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
      await loadOpps();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to delete opportunity');
    }
  };

  const handleBatchDelete = async () => {
    if (selected.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selected.length} selected opportunities?`)) return;
    try {
      await Promise.all(selected.map(id => api.delete(`/grants/opportunities/${id}`)));
      setSuccess(`Successfully deleted ${selected.length} opportunities`);
      setTimeout(() => setSuccess(''), 3000);
      setSelected([]);
      await loadOpps();
    } catch (e) {
      setError('Failed to delete some opportunities');
    }
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const newSelected = paginatedOpps.map(opp => opp.id);
      setSelected(newSelected);
    } else {
      setSelected([]);
    }
  };

  const handleSelectOne = (id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];
    if (selectedIndex === -1) {
      newSelected = [...selected, id];
    } else {
      newSelected = selected.filter(item => item !== id);
    }
    setSelected(newSelected);
  };

  const isSelected = (id) => selected.indexOf(id) !== -1;

  const handleAPIImport = async () => {
    if (!apiUrl) { setError('API URL is required'); return; }
    setImporting(true); setError('');
    try {
      const res = await api.post('/grants/opportunities/import/api', { api_url: apiUrl });
      setShowAPI(false);
      setSuccess(`Successfully imported ${res.data.imported_count} opportunities from external API`);
      setTimeout(() => setSuccess(''), 5000);
      await loadOpps();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to import from API');
    } finally { setImporting(false); }
  };

  const downloadTemplate = async () => {
    try {
      const res = await api.get('/grants/opportunities/template/excel', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'grant_opportunities_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      setError('Failed to download template');
    }
  };

  const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  
  const paginatedOpps = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const fmtMoney = (o) => {
    if (!o.amount_min && !o.amount_max) return '—';
    const fmt = (n) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}K` : n;
    if (o.amount_min && o.amount_max) return `${o.currency} ${fmt(o.amount_min)} – ${fmt(o.amount_max)}`;
    return `${o.currency} ${fmt(o.amount_min || o.amount_max)}`;
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ color: 'text.primary', fontSize: 26, fontWeight: 700, mb: 0.5 }}>Grant Opportunities</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>Manage and publish funding opportunities for your institution</Typography>
        </Box>
        <Button variant="contained" endIcon={<ExpandIcon />} 
          onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); }}
          sx={{ bgcolor: ACCENT, textTransform: 'none', borderRadius: 2, fontWeight: 600, '&:hover': { bgcolor: '#7c3aed' } }}>
          New Opportunity
        </Button>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{ sx: { borderRadius: 2, minWidth: 220, mt: 0.5 } }}>
          <MenuItem onClick={() => { setAnchorEl(null); setShowCreate(true); }}>
            <ListItemIcon><ManualIcon fontSize="small" sx={{ color: ACCENT }} /></ListItemIcon>
            <ListItemText primary="Manual Entry" secondary="Create one opportunity" primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }} secondaryTypographyProps={{ fontSize: 12 }} />
          </MenuItem>
          <MenuItem onClick={() => { setAnchorEl(null); setShowExcel(true); }}>
            <ListItemIcon><ExcelIcon fontSize="small" sx={{ color: '#10b981' }} /></ListItemIcon>
            <ListItemText primary="Excel Import" secondary="Batch upload from file" primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }} secondaryTypographyProps={{ fontSize: 12 }} />
          </MenuItem>
          <MenuItem onClick={() => { setAnchorEl(null); setShowAPI(true); }}>
            <ListItemIcon><APIIcon fontSize="small" sx={{ color: '#0ea5e9' }} /></ListItemIcon>
            <ListItemText primary="External API" secondary="Pull from grant databases" primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }} secondaryTypographyProps={{ fontSize: 12 }} />
          </MenuItem>
        </Menu>
      </Box>

      {error   && <Alert severity="error"   sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField size="small" placeholder="Search by title or sponsor…" value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon sx={{ color: 'text.disabled', mr: 1, fontSize: 18 }} /> }}
          sx={{ flex: '1 1 240px', '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)} sx={{ borderRadius: 2 }}>
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="open">Open</MenuItem>
            <MenuItem value="upcoming">Upcoming</MenuItem>
            <MenuItem value="closed">Closed</MenuItem>
            <MenuItem value="archived">Archived</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Batch Actions Bar */}
      {selected.length > 0 && (
        <Box sx={{ mb: 2, p: 2, bgcolor: dark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.05)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontWeight: 600, color: ACCENT }}>
            {selected.length} selected
          </Typography>
          <Button variant="outlined" startIcon={<DeleteIcon />} onClick={handleBatchDelete}
            sx={{ textTransform: 'none', borderColor: '#ef4444', color: '#ef4444', '&:hover': { borderColor: '#dc2626', bgcolor: 'rgba(239,68,68,0.04)' } }}>
            Delete Selected
          </Button>
        </Box>
      )}

      {/* Summary chips */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        {['open', 'upcoming', 'closed'].map(s => {
          const count = opps.filter(o => o.status === s).length;
          const c = STATUS_COLORS[s] || STATUS_COLORS.closed;
          return <Chip key={s} label={`${count} ${s.charAt(0).toUpperCase() + s.slice(1)}`} size="small"
            sx={{ bgcolor: c.bg, color: c.color, fontWeight: 600, fontSize: 12 }} />;
        })}
        <Chip label={`${opps.length} Total`} size="small" sx={{ bgcolor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: 'text.secondary', fontWeight: 600 }} />
      </Box>

      {/* Table */}
      <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, bgcolor: 'background.paper' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderBottom: `1px solid ${theme.palette.divider}` } }}>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selected.length > 0 && selected.length < paginatedOpps.length}
                  checked={paginatedOpps.length > 0 && selected.length === paginatedOpps.length}
                  onChange={handleSelectAll}
                  sx={{ color: ACCENT, '&.Mui-checked': { color: ACCENT } }}
                />
              </TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Sponsor</TableCell>
              <TableCell>Funding Range</TableCell>
              <TableCell>Deadline</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <AssignmentIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                    <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>No opportunities found</Typography>
                    <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>Create your first funding opportunity to get started.</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : paginatedOpps.map(opp => {
              const sc = STATUS_COLORS[opp.status] || STATUS_COLORS.closed;
              const isItemSelected = isSelected(opp.id);
              return (
                <TableRow key={opp.id} hover selected={isItemSelected} sx={{ '&:last-child td': { borderBottom: 'none' }, '&:hover': { bgcolor: `${ACCENT}06` } }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isItemSelected}
                      onChange={() => handleSelectOne(opp.id)}
                      sx={{ color: ACCENT, '&.Mui-checked': { color: ACCENT } }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, fontSize: 14, color: 'text.primary' }}>{opp.title}</Typography>
                    {opp.category && <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>{opp.category}</Typography>}
                  </TableCell>
                  <TableCell><Typography sx={{ fontSize: 13.5 }}>{opp.sponsor || '—'}</Typography></TableCell>
                  <TableCell><Typography sx={{ fontSize: 13.5 }}>{fmtMoney(opp)}</Typography></TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: 13.5, color: opp.deadline && new Date(opp.deadline) < new Date() ? '#ef4444' : 'text.primary' }}>
                      {fmtDate(opp.deadline)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={opp.status?.charAt(0).toUpperCase() + opp.status?.slice(1)} size="small"
                      sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 600, fontSize: 11 }} />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => router.push(`/admin-staff/grants/opportunities/${opp.id}`)} sx={{ color: ACCENT }}>
                      <ViewIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete(opp.id, opp.title); }} sx={{ color: '#ef4444' }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          sx={{ borderTop: `1px solid ${theme.palette.divider}` }}
        />
      </TableContainer>

      {/* Create Dialog */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)} maxWidth="sm" fullWidth disableScrollLock
        PaperProps={{ sx: { borderRadius: 3, bgcolor: 'background.paper' } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 18 }}>New Grant Opportunity</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Title *" fullWidth size="small" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <TextField label="Sponsor / Funder" fullWidth size="small" value={form.sponsor} onChange={e => setForm(f => ({ ...f, sponsor: e.target.value }))} />
            <TextField label="Description" fullWidth multiline rows={3} size="small" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <Autocomplete
              multiple
              freeSolo
              options={['Health', 'Agriculture', 'Environment', 'Technology', 'STEM', 'Education', 'Social Sciences', 'Engineering', 'Multi-disciplinary']}
              value={form.categories}
              onChange={(e, newValue) => setForm(f => ({ ...f, categories: newValue }))}
              renderInput={(params) => <TextField {...params} label="Categories" size="small" placeholder="Select or type custom categories" />}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip label={option} size="small" {...getTagProps({ index })} />
                ))
              }
            />
            <TextField label="Funding Type" fullWidth size="small" value={form.funding_type} onChange={e => setForm(f => ({ ...f, funding_type: e.target.value }))} placeholder="e.g. Grant, Contract, Fellowship" />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Min Amount" fullWidth size="small" type="number" value={form.amount_min} onChange={e => setForm(f => ({ ...f, amount_min: e.target.value }))} />
              <TextField label="Max Amount" fullWidth size="small" type="number" value={form.amount_max} onChange={e => setForm(f => ({ ...f, amount_max: e.target.value }))} />
              <FormControl size="small" sx={{ minWidth: 90 }}>
                <InputLabel>Currency</InputLabel>
                <Select value={form.currency} label="Currency" onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                  {['KES','USD','GBP','EUR'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
            <TextField label="Application Deadline" fullWidth size="small" type="date" value={form.deadline}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} InputLabelProps={{ shrink: true }} />
            <TextField label="Eligibility Criteria" fullWidth multiline rows={2} size="small" value={form.criteria}
              onChange={e => setForm(f => ({ ...f, criteria: e.target.value }))} placeholder="Who can apply? e.g., Universities, NGOs, Research institutions" />
            <TextField label="Detailed Requirements" fullWidth multiline rows={2} size="small" value={form.eligibility}
              onChange={e => setForm(f => ({ ...f, eligibility: e.target.value }))} placeholder="Additional eligibility details" />
            <TextField label="Contact Email" fullWidth size="small" type="email" value={form.contact_email}
              onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} placeholder="grants@example.org" />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setShowCreate(false)} sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating}
            startIcon={creating ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
            sx={{ bgcolor: ACCENT, textTransform: 'none', borderRadius: 2, fontWeight: 600, '&:hover': { bgcolor: '#7c3aed' } }}>
            Create Opportunity
          </Button>
        </DialogActions>
      </Dialog>

      {/* Excel Import Dialog */}
      <Dialog open={showExcel} onClose={() => setShowExcel(false)} maxWidth="sm" fullWidth disableScrollLock
        PaperProps={{ sx: { borderRadius: 3, bgcolor: 'background.paper' } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 18 }}>Import from Excel</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Alert severity="info" sx={{ fontSize: 13 }}>
              Upload an Excel file (.xlsx or .xls) with grant opportunities. Download the template below to see the required format.
            </Alert>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadTemplate}
              sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, borderColor: '#10b981', color: '#10b981', '&:hover': { borderColor: '#059669', bgcolor: 'rgba(16,185,129,0.04)' } }}>
              Download Excel Template
            </Button>
            <Box sx={{ border: `2px dashed ${theme.palette.divider}`, borderRadius: 2, p: 3, textAlign: 'center', bgcolor: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
              <input type="file" accept=".xlsx,.xls" onChange={(e) => setExcelFile(e.target.files[0])}
                style={{ display: 'none' }} id="excel-upload" />
              <label htmlFor="excel-upload">
                <Button component="span" variant="contained" startIcon={<ExcelIcon />}
                  sx={{ bgcolor: '#10b981', textTransform: 'none', borderRadius: 2, fontWeight: 600, '&:hover': { bgcolor: '#059669' } }}>
                  Select Excel File
                </Button>
              </label>
              {excelFile && <Typography sx={{ mt: 2, fontSize: 13, color: 'text.secondary' }}>Selected: {excelFile.name}</Typography>}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => { setShowExcel(false); setExcelFile(null); }} sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" onClick={handleExcelImport} disabled={importing || !excelFile}
            startIcon={importing ? <CircularProgress size={16} color="inherit" /> : <ExcelIcon />}
            sx={{ bgcolor: '#10b981', textTransform: 'none', borderRadius: 2, fontWeight: 600, '&:hover': { bgcolor: '#059669' } }}>
            {importing ? 'Importing...' : 'Import Opportunities'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* API Import Dialog */}
      <Dialog open={showAPI} onClose={() => setShowAPI(false)} maxWidth="sm" fullWidth disableScrollLock
        PaperProps={{ sx: { borderRadius: 3, bgcolor: 'background.paper' } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 18 }}>Import from External API</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Alert severity="info" sx={{ fontSize: 13 }}>
              Connect to external grant databases like Grants.gov, Research Professional, or custom APIs. The mock API demonstrates integration capability.
            </Alert>
            <TextField label="API Endpoint URL" fullWidth size="small" value={apiUrl}
              onChange={e => setApiUrl(e.target.value)}
              placeholder="http://localhost:8000/api/grants/opportunities/mock/external-opportunities"
              helperText="Default: Mock external grant opportunities API" />
            <Box sx={{ bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderRadius: 2, p: 2 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 1 }}>MOCK API PREVIEW</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.disabled', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                GET {apiUrl}
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 1 }}>
                Returns 6 sample opportunities from Wellcome Trust, Gates Foundation, AfDB, USAID, UNESCO, and EDCTP
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setShowAPI(false)} sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" onClick={handleAPIImport} disabled={importing}
            startIcon={importing ? <CircularProgress size={16} color="inherit" /> : <APIIcon />}
            sx={{ bgcolor: '#0ea5e9', textTransform: 'none', borderRadius: 2, fontWeight: 600, '&:hover': { bgcolor: '#0284c7' } }}>
            {importing ? 'Importing...' : 'Import from API'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
