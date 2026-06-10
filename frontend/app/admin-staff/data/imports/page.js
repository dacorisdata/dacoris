'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, CircularProgress, Alert, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, Button,
  TextField, InputAdornment, MenuItem, Select, FormControl, InputLabel,
  Tooltip, IconButton,
} from '@mui/material';
import {
  Search as SearchIcon, Storage as StorageIcon, Visibility as ViewIcon,
  Refresh as RefreshIcon, Person as PersonIcon, Science as ProjectIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../lib/api';

const ACCENT = '#16a699';

const INGEST_STATUS_META = {
  pending:   { bg: 'rgba(100,116,139,0.12)', color: '#64748b', label: 'Pending' },
  queued:    { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6', label: 'Queued' },
  ingesting: { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', label: 'Ingesting' },
  ingested:  { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', label: 'Ingested' },
  failed:    { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', label: 'Failed' },
};

const SOURCE_LABELS = {
  google_sheets: 'Google Sheets',
  kobo_collect: 'KoboCollect',
  excel: 'Excel',
  file_upload: 'File Upload',
  url: 'URL',
  api_feed: 'API Feed',
};

const fmtDate = d =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function StatusChip({ status }) {
  const meta = INGEST_STATUS_META[status] || { bg: 'rgba(100,116,139,0.12)', color: '#64748b', label: status };
  return (
    <Chip
      label={meta.label}
      size="small"
      sx={{ bgcolor: meta.bg, color: meta.color, fontWeight: 600, fontSize: 11 }}
    />
  );
}

export default function InstitutionalImportsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [imports, setImports] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [latestOnly, setLatestOnly] = useState('true');

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin) { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    await loadImports();
  };

  const loadImports = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter) params.set('status_filter', statusFilter);
      params.set('latest_only', latestOnly);
      params.set('page_size', '100');
      const res = await api.get(`/admin-staff/data-imports?${params.toString()}`);
      setImports(res.data?.imports || []);
      setTotal(res.data?.total || 0);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load imported data');
      setImports([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading) loadImports();
    }, 350);
    return () => clearTimeout(timer);
  }, [search, statusFilter, latestOnly]);

  const stats = useMemo(() => ({
    total: imports.length,
    ingested: imports.filter(i => i.ingest_status === 'ingested').length,
    pending: imports.filter(i => ['pending', 'queued', 'ingesting'].includes(i.ingest_status)).length,
    failed: imports.filter(i => i.ingest_status === 'failed').length,
  }), [imports]);

  const headCell = {
    fontWeight: 700,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: 'text.secondary',
    whiteSpace: 'nowrap',
  };

  if (loading && imports.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ color: 'text.primary', fontSize: 26, fontWeight: 700, mb: 0.5 }}>
            Imported Data
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
            View all datasets imported across the institution — linked researcher, project, and proposal
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadImports}
          sx={{ textTransform: 'none', borderColor: ACCENT, color: ACCENT }}
        >
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        {[
          { label: 'Showing', value: stats.total, sub: `${total} total` },
          { label: 'Ingested', value: stats.ingested, color: '#10b981' },
          { label: 'In Progress', value: stats.pending, color: '#f59e0b' },
          { label: 'Failed', value: stats.failed, color: '#ef4444' },
        ].map(({ label, value, sub, color }) => (
          <Paper key={label} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>{label}</Typography>
            <Typography sx={{ fontSize: 28, fontWeight: 700, color: color || 'text.primary' }}>{value}</Typography>
            {sub && <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>{sub}</Typography>}
          </Paper>
        ))}
      </Box>

      <Paper sx={{ p: 2, mb: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search dataset, researcher, or project…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>
              ),
            }}
            sx={{ minWidth: 280, flex: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <MenuItem value="">All statuses</MenuItem>
              <MenuItem value="ingested">Ingested</MenuItem>
              <MenuItem value="pending,queued,ingesting">In progress</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Versions</InputLabel>
            <Select label="Versions" value={latestOnly} onChange={e => setLatestOnly(e.target.value)}>
              <MenuItem value="true">Latest only</MenuItem>
              <MenuItem value="false">All versions</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={headCell}>Dataset</TableCell>
              <TableCell sx={headCell}>Researcher</TableCell>
              <TableCell sx={headCell}>Project</TableCell>
              <TableCell sx={headCell}>Subject</TableCell>
              <TableCell sx={headCell}>Proposal</TableCell>
              <TableCell sx={headCell}>Status</TableCell>
              <TableCell sx={headCell}>Records</TableCell>
              <TableCell sx={headCell}>Imported</TableCell>
              <TableCell sx={headCell} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {imports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  <StorageIcon sx={{ fontSize: 40, mb: 1, opacity: 0.4 }} />
                  <Typography>No imported datasets found</Typography>
                </TableCell>
              </TableRow>
            ) : imports.map(row => (
              <TableRow
                key={row.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => router.push(`/admin-staff/data/imports/${row.id}`)}
              >
                <TableCell>
                  <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{row.source_tag}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                    {SOURCE_LABELS[row.source_type] || row.source_type}
                    {row.version_number > 1 ? ` · v${row.version_number}` : ''}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Box>
                      <Typography sx={{ fontSize: 13 }}>{row.researcher_name || '—'}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{row.researcher_email}</Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  {row.project_title ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <ProjectIcon sx={{ fontSize: 15, color: ACCENT }} />
                      <Typography sx={{ fontSize: 13, maxWidth: 180 }} noWrap>{row.project_title}</Typography>
                    </Box>
                  ) : (
                    <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>—</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography sx={{ fontSize: 12, maxWidth: 140 }} noWrap>{row.subject || '—'}</Typography>
                </TableCell>
                <TableCell>
                  <Typography sx={{ fontSize: 13, maxWidth: 160 }} noWrap>
                    {row.proposal_title || '—'}
                  </Typography>
                </TableCell>
                <TableCell><StatusChip status={row.ingest_status} /></TableCell>
                <TableCell>
                  {row.record_count != null ? row.record_count.toLocaleString() : '—'}
                </TableCell>
                <TableCell>{fmtDate(row.ingest_completed_at || row.created_at)}</TableCell>
                <TableCell align="right" onClick={e => e.stopPropagation()}>
                  <Tooltip title="View details">
                    <IconButton
                      size="small"
                      onClick={() => router.push(`/admin-staff/data/imports/${row.id}`)}
                      sx={{ color: ACCENT }}
                    >
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
