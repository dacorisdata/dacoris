'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Chip, CircularProgress, TextField,
  Select, MenuItem, FormControl, InputLabel, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, useTheme, InputAdornment, Tooltip,
} from '@mui/material';
import {
  Add as AddIcon, Search as SearchIcon, Handshake as MouIcon,
  OpenInNew as OpenIcon, FilterList as FilterIcon, Clear as ClearIcon,
} from '@mui/icons-material';
import api from '../../../../lib/api';

const ACCENT = '#7c3aed';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'INTERNAL_REVIEW', label: 'Internal Review' },
  { value: 'LEGAL_REVIEW', label: 'Legal Review' },
  { value: 'EXEC_APPROVAL', label: 'Exec Approval' },
  { value: 'PENDING_SIGNING', label: 'Pending Signing' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'MID_TERM_REVIEW', label: 'Mid-Term Review' },
  { value: 'PENDING_RENEWAL', label: 'Pending Renewal' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'GENERAL_COLLABORATION', label: 'General Collaboration' },
  { value: 'ACADEMIC_EXCHANGE', label: 'Academic Exchange' },
  { value: 'RESEARCH_PARTNERSHIP', label: 'Research Partnership' },
  { value: 'DATA_SHARING', label: 'Data Sharing' },
  { value: 'JOINT_DEGREE', label: 'Joint Degree' },
  { value: 'CLINICAL', label: 'Clinical' },
  { value: 'INDUSTRY', label: 'Industry' },
  { value: 'CONSORTIUM', label: 'Consortium' },
  { value: 'CO_FUNDING', label: 'Co-Funding' },
];

const STATUS_CONFIG = {
  DRAFT:            { label: 'Draft',           color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  INTERNAL_REVIEW:  { label: 'Internal Review', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  LEGAL_REVIEW:     { label: 'Legal Review',    color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  EXEC_APPROVAL:    { label: 'Exec Approval',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  PENDING_SIGNING:  { label: 'Pending Signing', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  ACTIVE:           { label: 'Active',          color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  MID_TERM_REVIEW:  { label: 'Mid-Term Review', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  PENDING_RENEWAL:  { label: 'Pending Renewal', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  SUSPENDED:        { label: 'Suspended',       color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  EXPIRED:          { label: 'Expired',         color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  CLOSED:           { label: 'Closed',          color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  ARCHIVED:         { label: 'Archived',        color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
};

const TYPE_LABELS = {
  GENERAL_COLLABORATION: 'General Collab',
  ACADEMIC_EXCHANGE: 'Academic Exchange',
  RESEARCH_PARTNERSHIP: 'Research Partnership',
  DATA_SHARING: 'Data Sharing',
  JOINT_DEGREE: 'Joint Degree',
  CLINICAL: 'Clinical',
  INDUSTRY: 'Industry',
  CONSORTIUM: 'Consortium',
  CO_FUNDING: 'Co-Funding',
};

export default function MouListPage() {
  const router = useRouter();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [mous, setMous] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => { fetchMous(); }, [statusFilter, typeFilter]);

  const fetchMous = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('mou_type', typeFilter);
      if (search) params.append('search', search);
      const res = await api.get(`/mou/?${params.toString()}`);
      setMous(res.data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter') fetchMous();
  };

  const filtered = mous.filter(m =>
    !search || m.title?.toLowerCase().includes(search.toLowerCase()) ||
    m.mou_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <MouIcon sx={{ color: ACCENT }} />
            <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'text.primary' }}>All Agreements</Typography>
          </Box>
          <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.3 }}>
            {filtered.length} agreement{filtered.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => router.push('/admin-staff/mou/create')}
          sx={{ bgcolor: ACCENT, borderRadius: 2, textTransform: 'none', fontWeight: 600,
            '&:hover': { bgcolor: '#6d28d9' } }}>
          New MoU
        </Button>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" placeholder="Search by title or number…"
          value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleSearch}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment>,
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => { setSearch(''); fetchMous(); }}>
                  <ClearIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{ minWidth: 260, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)}
            sx={{ borderRadius: 2 }}>
            {STATUS_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 190 }}>
          <InputLabel>Type</InputLabel>
          <Select value={typeFilter} label="Type" onChange={e => setTypeFilter(e.target.value)}
            sx={{ borderRadius: 2 }}>
            {TYPE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </Select>
        </FormControl>
        {(statusFilter || typeFilter) && (
          <Button size="small" startIcon={<ClearIcon />}
            onClick={() => { setStatusFilter(''); setTypeFilter(''); }}
            sx={{ color: 'text.secondary', textTransform: 'none' }}>
            Clear filters
          </Button>
        )}
      </Box>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: ACCENT }} />
        </Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <MouIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
          <Typography color="text.secondary">No MoUs found. Try adjusting your filters or create a new MoU.</Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => router.push('/admin-staff/mou/create')}
            sx={{ mt: 2, borderColor: ACCENT, color: ACCENT, textTransform: 'none', borderRadius: 2 }}>
            Create MoU
          </Button>
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={0}
          sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                {['MoU Number', 'Title', 'Type', 'Status', 'Expiry Date', 'Actions'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase',
                    letterSpacing: 0.5, color: 'text.secondary', borderBottom: `1px solid ${theme.palette.divider}` }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(mou => {
                const cfg = STATUS_CONFIG[mou.status] || STATUS_CONFIG.DRAFT;
                return (
                  <TableRow key={mou.id} hover
                    sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
                    onClick={() => router.push(`/admin-staff/mou/${mou.id}`)}>
                    <TableCell sx={{ fontSize: 12, color: ACCENT, fontWeight: 600 }}>
                      {mou.mou_number || `—`}
                    </TableCell>
                    <TableCell sx={{ fontSize: 13, fontWeight: 500, maxWidth: 280 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>
                        {mou.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                        {TYPE_LABELS[mou.mou_type] || mou.mou_type}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={cfg.label} size="small"
                        sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: 10, height: 22 }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {mou.expiry_date || '—'}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Open">
                        <IconButton size="small" onClick={e => { e.stopPropagation(); router.push(`/admin-staff/mou/${mou.id}`); }}>
                          <OpenIcon sx={{ fontSize: 16, color: ACCENT }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
