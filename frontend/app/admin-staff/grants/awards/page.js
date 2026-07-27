'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, useTheme, TextField, MenuItem, Select, FormControl, InputLabel,
  IconButton, Tooltip, TableSortLabel,
} from '@mui/material';
import {
  EmojiEvents as AwardsIcon, Search as SearchIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../lib/api';

const ACCENT = '#10b981';

const STATUS_META = {
  pending:    { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
  active:     { bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
  suspended:  { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444' },
  completed:  { bg: 'rgba(100,116,139,0.12)', color: '#64748b' },
  terminated: { bg: 'rgba(239,68,68,0.08)',   color: '#dc2626' },
};

export default function GrantAwardsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme  = useTheme();
  const dark   = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [awards, setAwards]   = useState([]);
  const [error, setError]     = useState('');
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey]       = useState('issued_at');
  const [sortDir, setSortDir]       = useState('desc');

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin)      { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    try {
      const res = await api.get('/grants/awards').catch(() => ({ data: [] }));
      setAwards(res.data || []);
    } catch (e) { setError('Failed to load awards'); }
    setLoading(false);
  };

  const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const fmtMoney = (amt, cur) => amt ? `${cur || 'KES'} ${Number(amt).toLocaleString()}` : '—';

  const handleSort = (key) => {
    if (sortKey === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filteredAwards = useMemo(() => {
    let data = [...awards];
    if (statusFilter !== 'all') data = data.filter(a => a.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(a =>
        (a.award_number || `AWD-${a.id}`).toLowerCase().includes(q) ||
        (a.proposal_title || '').toLowerCase().includes(q) ||
        (a.funder_name || '').toLowerCase().includes(q) ||
        (a.opportunity_title || '').toLowerCase().includes(q)
      );
    }
    data.sort((x, y) => {
      let vx, vy;
      switch (sortKey) {
        case 'award_number': vx = x.award_number || `AWD-${x.id}`; vy = y.award_number || `AWD-${y.id}`; break;
        case 'total_amount':  vx = x.total_amount || 0; vy = y.total_amount || 0; break;
        case 'start_date':    vx = x.start_date ? new Date(x.start_date).getTime() : 0; vy = y.start_date ? new Date(y.start_date).getTime() : 0; break;
        case 'end_date':      vx = x.end_date ? new Date(x.end_date).getTime() : 0; vy = y.end_date ? new Date(y.end_date).getTime() : 0; break;
        case 'issued_at':
        default:              vx = x.issued_at ? new Date(x.issued_at).getTime() : 0; vy = y.issued_at ? new Date(y.issued_at).getTime() : 0;
      }
      if (vx < vy) return sortDir === 'asc' ? -1 : 1;
      if (vx > vy) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [awards, search, statusFilter, sortKey, sortDir]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ color: 'text.primary', fontSize: 26, fontWeight: 700, mb: 0.5 }}>Awards</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>Track all issued awards and their post-award status</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Summary */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_META).map(([key, meta]) => {
          const count = awards.filter(a => a.status === key).length;
          const isSelected = statusFilter === key;
          return (
            <Box key={key} onClick={() => setStatusFilter(isSelected ? 'all' : key)}
              sx={{ flex: '1 1 120px', bgcolor: 'background.paper', borderRadius: 2.5, p: 2, cursor: 'pointer',
                border: `1px solid ${isSelected ? meta.color : theme.palette.divider}`, transition: 'all 0.15s',
                '&:hover': { borderColor: meta.color, transform: 'translateY(-1px)' } }}>
              <Typography sx={{ color: meta.color, fontSize: 22, fontWeight: 700 }}>{count}</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{key}</Typography>
            </Box>
          );
        })}
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          size="small" placeholder="Search award #, proposal, funder…" value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon sx={{ color: 'text.disabled', mr: 1, fontSize: 18 }} /> }}
          sx={{ flex: '1 1 260px', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)} sx={{ borderRadius: 2 }}>
            <MenuItem value="all">All Statuses</MenuItem>
            {Object.keys(STATUS_META).map(k => (
              <MenuItem key={k} value={k} sx={{ textTransform: 'capitalize' }}>{k}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, bgcolor: 'background.paper' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderBottom: `1px solid ${theme.palette.divider}` } }}>
              <TableCell>
                <TableSortLabel active={sortKey === 'award_number'} direction={sortKey === 'award_number' ? sortDir : 'asc'} onClick={() => handleSort('award_number')}>
                  Award #
                </TableSortLabel>
              </TableCell>
              <TableCell>Funder / Proposal</TableCell>
              <TableCell>
                <TableSortLabel active={sortKey === 'total_amount'} direction={sortKey === 'total_amount' ? sortDir : 'asc'} onClick={() => handleSort('total_amount')}>
                  Total Amount
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={sortKey === 'start_date'} direction={sortKey === 'start_date' ? sortDir : 'asc'} onClick={() => handleSort('start_date')}>
                  Start Date
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={sortKey === 'end_date'} direction={sortKey === 'end_date' ? sortDir : 'asc'} onClick={() => handleSort('end_date')}>
                  End Date
                </TableSortLabel>
              </TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAwards.length === 0 ? (
              <TableRow><TableCell colSpan={7}>
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <AwardsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {awards.length === 0 ? 'No awards yet' : 'No awards match your filters'}
                  </Typography>
                  <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>
                    {awards.length === 0 ? 'Awards will appear here once proposals are approved.' : 'Try adjusting your search or status filter.'}
                  </Typography>
                </Box>
              </TableCell></TableRow>
            ) : filteredAwards.map(a => {
              const sm = STATUS_META[a.status] || STATUS_META.pending;
              return (
                <TableRow key={a.id} hover
                  onClick={() => router.push(`/admin-staff/grants/awards/${a.id}`)}
                  sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 'none' }, '&:hover': { bgcolor: `${ACCENT}06` } }}>
                  <TableCell><Typography sx={{ fontWeight: 600, fontSize: 14 }}>{a.award_number || `AWD-${a.id}`}</Typography></TableCell>
                  <TableCell sx={{ maxWidth: 220 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: ACCENT, lineHeight: 1.3 }}>
                      {a.funder_name || a.opportunity_sponsor || '—'}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.3 }} noWrap>
                      {a.proposal_title || ''}
                    </Typography>
                  </TableCell>
                  <TableCell><Typography sx={{ fontSize: 13.5 }}>{fmtMoney(a.total_amount, a.currency)}</Typography></TableCell>
                  <TableCell><Typography sx={{ fontSize: 13.5 }}>{fmtDate(a.start_date)}</Typography></TableCell>
                  <TableCell><Typography sx={{ fontSize: 13.5 }}>{fmtDate(a.end_date)}</Typography></TableCell>
                  <TableCell><Chip label={a.status} size="small" sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 600, fontSize: 11, textTransform: 'capitalize' }} /></TableCell>
                  <TableCell align="right">
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); router.push(`/admin-staff/grants/awards/${a.id}`); }}
                        sx={{ color: ACCENT, '&:hover': { bgcolor: ACCENT + '18' } }}>
                        <ViewIcon sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Tooltip>
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
