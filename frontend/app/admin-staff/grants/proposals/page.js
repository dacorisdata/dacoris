'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, TextField, MenuItem, Select, FormControl, InputLabel, useTheme,
} from '@mui/material';
import { Search as SearchIcon, Folder as FolderIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../lib/api';

const ACCENT = '#3b82f6';

const STATUS_META = {
  draft:       { bg: 'rgba(100,116,139,0.12)', color: '#64748b', label: 'Draft' },
  in_review:   { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6', label: 'In Review' },
  submitted:   { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', label: 'Submitted' },
  returned:    { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', label: 'Returned' },
  approved:    { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', label: 'Approved' },
  rejected:    { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', label: 'Rejected' },
};

export default function GrantProposalsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme  = useTheme();
  const dark   = theme.palette.mode === 'dark';

  const [loading, setLoading]   = useState(true);
  const [proposals, setProposals] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError]       = useState('');

  useEffect(() => { checkAuth(); }, []);
  useEffect(() => { applyFilter(); }, [proposals, search, statusFilter]);

  const checkAuth = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin)      { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    await loadProposals();
    setLoading(false);
  };

  const loadProposals = async () => {
    try {
      const res = await api.get('/api/grants/proposals');
      setProposals(res.data || []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load proposals');
    }
  };

  const applyFilter = () => {
    let data = [...proposals];
    if (statusFilter !== 'all') data = data.filter(p => p.status === statusFilter);
    if (search) data = data.filter(p => p.title?.toLowerCase().includes(search.toLowerCase()));
    setFiltered(data);
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>;

  const counts = Object.keys(STATUS_META).reduce((acc, s) => ({ ...acc, [s]: proposals.filter(p => p.status === s).length }), {});

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ color: 'text.primary', fontSize: 26, fontWeight: 700, mb: 0.5 }}>Grant Proposals</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>Track and manage all grant proposals within your institution</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Status summary cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <Box key={key} onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
            sx={{ flex: '1 1 120px', bgcolor: 'background.paper', borderRadius: 2.5, p: 2, border: `1px solid ${statusFilter === key ? meta.color : theme.palette.divider}`, cursor: 'pointer', transition: 'all 0.18s', '&:hover': { borderColor: meta.color } }}>
            <Typography sx={{ color: meta.color, fontSize: 22, fontWeight: 700 }}>{counts[key] || 0}</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 600 }}>{meta.label}</Typography>
          </Box>
        ))}
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField size="small" placeholder="Search proposals…" value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon sx={{ color: 'text.disabled', mr: 1, fontSize: 18 }} /> }}
          sx={{ flex: '1 1 240px', '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)} sx={{ borderRadius: 2 }}>
            <MenuItem value="all">All Statuses</MenuItem>
            {Object.entries(STATUS_META).map(([k, m]) => <MenuItem key={k} value={k}>{m.label}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, bgcolor: 'background.paper' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderBottom: `1px solid ${theme.palette.divider}` } }}>
              <TableCell>Proposal Title</TableCell>
              <TableCell>Opportunity</TableCell>
              <TableCell>Submitted</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <FolderIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                    <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>No proposals found</Typography>
                    <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>Proposals submitted by researchers will appear here.</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : filtered.map(p => {
              const sm = STATUS_META[p.status] || STATUS_META.draft;
              return (
                <TableRow key={p.id} hover sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 'none' }, '&:hover': { bgcolor: `${ACCENT}06` } }}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, fontSize: 14, color: 'text.primary' }}>{p.title}</Typography>
                    <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>v{p.current_version}</Typography>
                  </TableCell>
                  <TableCell><Typography sx={{ fontSize: 13.5 }}>#{p.opportunity_id}</Typography></TableCell>
                  <TableCell><Typography sx={{ fontSize: 13.5 }}>{fmtDate(p.submitted_at)}</Typography></TableCell>
                  <TableCell>
                    <Chip label={sm.label} size="small" sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 600, fontSize: 11 }} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
