'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme, Alert,
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, TextField, InputAdornment, Tooltip,
} from '@mui/material';
import {
  Refresh as RefreshIcon, Search as SearchIcon, OpenInNew as ViewIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../lib/api';

const ACCENT = '#16a699';
const STAGE_DAYS = [3, 7, 14, 7, 14, 7];
const STAGE_LABELS = ['Received', 'Eligibility', 'Technical', 'Budget', 'Panel', 'Final Approval'];
const STAGE_COLORS = { 0: '#f59e0b', 1: '#3b82f6', 2: '#8b5cf6', 3: '#f97316', 4: '#0ea5e9', 5: ACCENT };

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function getReviewHealth(proposal) {
  const s = proposal.status;
  if (s === 'awarded' || s === 'declined')
    return { key: 'completed', label: 'Completed', color: '#10b981', bg: '#ecfdf5' };
  if (s === 'returned')
    return { key: 'on_hold', label: 'On Hold', color: '#f97316', bg: '#fff7ed' };
  if (s === 'draft')
    return { key: 'draft', label: 'Draft', color: '#94a3b8', bg: '#f8fafc' };

  const step = proposal.review_step ?? 0;
  const history = (proposal.stage_history || []).find(h => h.stage_step === step);
  if (!history?.entered_at)
    return { key: 'healthy', label: 'On Track', color: ACCENT, bg: '#f0fdf9' };

  const intendedDays = history.intended_days ?? STAGE_DAYS[step] ?? 7;
  const daysSpent = Math.floor((Date.now() - new Date(history.entered_at)) / 86400000);
  if (daysSpent > intendedDays)
    return { key: 'overdue', label: 'Overdue', color: '#ef4444', bg: '#fef2f2' };
  if (daysSpent > intendedDays * 0.75)
    return { key: 'near_due', label: 'Near Due', color: '#f59e0b', bg: '#fffbeb' };
  return { key: 'healthy', label: 'On Track', color: ACCENT, bg: '#f0fdf9' };
}

function getLastUpdated(proposal) {
  let latest = null;
  (proposal.stage_history || []).forEach(h => {
    if (h.exited_at && (!latest || new Date(h.exited_at) > new Date(latest))) latest = h.exited_at;
    if (h.entered_at && (!latest || new Date(h.entered_at) > new Date(latest))) latest = h.entered_at;
  });
  return latest || proposal.submitted_at || proposal.updated_at;
}

function getStageLabelForProposal(p) {
  if (p.status === 'submitted') return 'Received';
  if (p.status === 'awarded')   return 'Awarded';
  if (p.status === 'declined')  return 'Declined';
  if (p.status === 'returned')  return 'Returned';
  return p.review_stage_name || STAGE_LABELS[p.review_step ?? 0] || `Step ${p.review_step}`;
}

function getStageColor(p) {
  if (p.status === 'submitted') return '#f59e0b';
  if (p.status === 'awarded')   return '#10b981';
  if (p.status === 'declined')  return '#ef4444';
  if (p.status === 'returned')  return '#f97316';
  return STAGE_COLORS[p.review_step ?? 0] || ACCENT;
}

const HEALTH_FILTERS = [
  { key: 'all',       label: 'All' },
  { key: 'healthy',   label: 'On Track' },
  { key: 'near_due',  label: 'Near Due' },
  { key: 'overdue',   label: 'Overdue' },
  { key: 'on_hold',   label: 'On Hold' },
  { key: 'completed', label: 'Completed' },
];

const COLS = [
  { id: 'title',        label: 'Proposal Title' },
  { id: 'stage',        label: 'Stage',           width: 140 },
  { id: 'submitted_at', label: 'Date Received',   width: 120 },
  { id: 'last_updated', label: 'Last Updated',    width: 120 },
  { id: 'health',       label: 'Review Status',   width: 130 },
];

export default function GrantPipelinePage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('submitted_at');
  const [sortDir, setSortDir] = useState('desc');
  const [healthFilter, setHealthFilter] = useState('all');

  useEffect(() => {
    fetchUser().then(u => {
      if (!u) { router.push('/login'); return; }
      loadProposals();
    });
  }, []);

  const loadProposals = async () => {
    try {
      setLoading(true);
      const res = await api.get('/grants/proposals');
      setProposals(res.data || []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load proposals');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = col => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const stats = useMemo(() => {
    const active = proposals.filter(p => !['draft', 'awarded', 'declined', 'returned'].includes(p.status));
    return {
      total:     proposals.filter(p => p.status !== 'draft').length,
      active:    active.length,
      overdue:   proposals.filter(p => getReviewHealth(p).key === 'overdue').length,
      on_hold:   proposals.filter(p => p.status === 'returned').length,
      completed: proposals.filter(p => ['awarded', 'declined'].includes(p.status)).length,
    };
  }, [proposals]);

  const rows = useMemo(() => {
    let list = proposals.filter(p => p.status !== 'draft');

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.lead_pi?.name?.toLowerCase().includes(q) ||
        p.opportunity?.sponsor?.toLowerCase().includes(q)
      );
    }

    if (healthFilter !== 'all') {
      list = list.filter(p => getReviewHealth(p).key === healthFilter);
    }

    list = [...list].sort((a, b) => {
      let av, bv;
      if (sortBy === 'title')        { av = a.title || ''; bv = b.title || ''; }
      else if (sortBy === 'stage')   { av = a.review_step ?? 0; bv = b.review_step ?? 0; }
      else if (sortBy === 'submitted_at') { av = new Date(a.submitted_at || 0); bv = new Date(b.submitted_at || 0); }
      else if (sortBy === 'last_updated') { av = new Date(getLastUpdated(a) || 0); bv = new Date(getLastUpdated(b) || 0); }
      else if (sortBy === 'health')  { av = getReviewHealth(a).key; bv = getReviewHealth(b).key; }
      else return 0;
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [proposals, search, healthFilter, sortBy, sortDir]);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 700 }}>Application Pipeline</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.3 }}>
            {stats.active} active · {stats.overdue} overdue · {stats.on_hold} on hold
          </Typography>
        </Box>
        <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={loadProposals}
          sx={{ textTransform: 'none', borderRadius: 2 }}>
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Summary stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 1.5, mb: 3 }}>
        {[
          { label: 'Total',     value: stats.total,     color: '#64748b' },
          { label: 'Active',    value: stats.active,    color: ACCENT },
          { label: 'Overdue',   value: stats.overdue,   color: '#ef4444' },
          { label: 'On Hold',   value: stats.on_hold,   color: '#f97316' },
          { label: 'Completed', value: stats.completed, color: '#10b981' },
        ].map(s => (
          <Paper key={s.label} elevation={0} variant="outlined" sx={{ p: 1.5, borderRadius: 2, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{s.label}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Search + health filter */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small" placeholder="Search by title, PI or sponsor…"
          value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: 'text.disabled' }} /></InputAdornment> }}
          sx={{ width: 260, '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: 13 } }}
        />
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
          {HEALTH_FILTERS.map(f => (
            <Chip key={f.key} label={f.label} size="small" clickable
              onClick={() => setHealthFilter(f.key)}
              sx={{
                fontWeight: healthFilter === f.key ? 700 : 500,
                fontSize: 11,
                bgcolor: healthFilter === f.key ? ACCENT : 'transparent',
                color: healthFilter === f.key ? '#fff' : 'text.secondary',
                border: '1px solid',
                borderColor: healthFilter === f.key ? ACCENT : 'divider',
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 2.5 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.03)' : '#f8fafc' }}>
              {COLS.map(col => (
                <TableCell key={col.id} sx={{ fontWeight: 700, fontSize: 12, py: 1.5, minWidth: col.width }}>
                  <TableSortLabel
                    active={sortBy === col.id}
                    direction={sortBy === col.id ? sortDir : 'asc'}
                    onClick={() => handleSort(col.id)}>
                    {col.label}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell sx={{ width: 48 }} />
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 6, color: 'text.disabled', fontSize: 13 }}>
                  No proposals match your filters
                </TableCell>
              </TableRow>
            ) : rows.map(p => {
              const health      = getReviewHealth(p);
              const stageColor  = getStageColor(p);
              const lastUpdated = getLastUpdated(p);

              return (
                <TableRow key={p.id}
                  onClick={() => router.push(`/admin-staff/grants/proposals/${p.id}`)}
                  sx={{
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                    '&:hover': { bgcolor: dark ? 'rgba(255,255,255,0.03)' : '#f0fdf9' },
                    '&:last-child td': { borderBottom: 0 },
                  }}>

                  {/* Title + PI */}
                  <TableCell sx={{ py: 1.5 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35, mb: 0.3 }}>
                      {p.title}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                      {p.lead_pi?.name || '—'}
                      {(p.opportunity?.sponsor || p.opportunity?.title) && (
                        <> · {p.opportunity?.sponsor || p.opportunity?.title}</>
                      )}
                    </Typography>
                  </TableCell>

                  {/* Stage */}
                  <TableCell sx={{ py: 1.5 }}>
                    <Chip
                      label={getStageLabelForProposal(p)} size="small"
                      sx={{ bgcolor: stageColor + '18', color: stageColor, fontWeight: 700, fontSize: 11, height: 22 }}
                    />
                  </TableCell>

                  {/* Date Received */}
                  <TableCell sx={{ py: 1.5 }}>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {fmtDate(p.submitted_at)}
                    </Typography>
                  </TableCell>

                  {/* Last Updated */}
                  <TableCell sx={{ py: 1.5 }}>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {fmtDate(lastUpdated)}
                    </Typography>
                  </TableCell>

                  {/* Review Status */}
                  <TableCell sx={{ py: 1.5 }}>
                    <Chip
                      label={health.label} size="small"
                      sx={{ bgcolor: health.bg, color: health.color, fontWeight: 700, fontSize: 11, height: 22 }}
                    />
                  </TableCell>

                  {/* Arrow */}
                  <TableCell sx={{ py: 1.5, pr: 2 }}>
                    <Tooltip title="View pipeline">
                      <ViewIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
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
