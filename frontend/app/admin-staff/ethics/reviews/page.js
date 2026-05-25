'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, CircularProgress, useTheme, Button, Chip, Alert,
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, InputAdornment, FormControl, Select, MenuItem,
} from '@mui/material';
import {
  Gavel as EthicsIcon, ArrowForward as ArrowIcon,
  Person as PersonIcon, CalendarToday as CalIcon,
  Refresh as RefreshIcon, Description as DocIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../lib/api';

const ACCENT = '#8b5cf6';

const STATUS_META = {
  submitted:    { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b',  label: 'Submitted'       },
  under_review: { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6',  label: 'Under Review'    },
  deferred:     { bg: 'rgba(249,115,22,0.12)',  color: '#f97316',  label: 'Deferred'        },
  draft:        { bg: 'rgba(100,116,139,0.12)', color: '#64748b',  label: 'Draft'           },
};

const TYPE_META = {
  initial_review:     { label: 'Initial Review',     color: '#8b5cf6' },
  full_review:        { label: 'Full Review',        color: '#8b5cf6' },
  expedited_review:   { label: 'Expedited Review',   color: '#0ea5e9' },
  amendment:          { label: 'Amendment',          color: '#f97316' },
  renewal:            { label: 'Renewal',            color: '#0ea5e9' },
  exempt:             { label: 'Exempt',             color: '#10b981' },
  existing_clearance: { label: 'Existing Clearance', color: '#10b981' },
};

const RISK_META = {
  High:   { bg: 'rgba(239,68,68,0.1)',  color: '#ef4444' },
  Medium: { bg: 'rgba(249,115,22,0.1)', color: '#f97316' },
  Low:    { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
};

const fmtDate = d => d
  ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const typeLabel = t =>
  TYPE_META[t]?.label || (t || 'Review').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function EthicsReviewsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin) { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    await loadReviews();
  };

  const loadReviews = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/research/ethics/reviews/my');
      setReviews(res.data || []);
    } catch (e) {
      setReviews([]);
      setError(e.response?.data?.detail || 'Failed to load ethics reviews.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reviews
      .filter(r => statusFilter === 'all' || r.status === statusFilter)
      .filter(r => {
        if (!q) return true;
        return [
          r.application_title,
          r.title,
          r.ref,
          r.pi_name,
          r.project_title,
          r.institution,
          r.application_type,
        ].some(v => v?.toLowerCase().includes(q));
      })
      .sort((a, b) => new Date(b.submitted_at || b.created_at || 0) - new Date(a.submitted_at || a.created_at || 0));
  }, [reviews, search, statusFilter]);

  const stats = useMemo(() => ({
    total: reviews.length,
    submitted: reviews.filter(r => r.status === 'submitted').length,
    underReview: reviews.filter(r => r.status === 'under_review').length,
    deferred: reviews.filter(r => r.status === 'deferred').length,
    highRisk: reviews.filter(r => r.risk_level === 'High').length,
  }), [reviews]);

  const headCell = {
    fontWeight: 700,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: 'text.secondary',
    whiteSpace: 'nowrap',
    py: 1.5,
  };

  if (loading) {
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
            Ethics Reviews
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
            IRB applications awaiting committee review at your institution
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {stats.total > 0 && (
            <Chip
              label={`${stats.total} In Queue`}
              sx={{ bgcolor: `${ACCENT}18`, color: ACCENT, fontWeight: 700, fontSize: 12 }}
            />
          )}
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
            onClick={loadReviews}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {reviews.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
          {[
            { label: 'In Queue', value: stats.total, color: ACCENT },
            { label: 'Submitted', value: stats.submitted, color: '#f59e0b' },
            { label: 'Under Review', value: stats.underReview, color: '#3b82f6' },
            { label: 'Deferred', value: stats.deferred, color: '#f97316' },
            { label: 'High Risk', value: stats.highRisk, color: '#ef4444' },
          ].map(s => (
            <Box
              key={s.label}
              sx={{
                flex: '1 1 120px',
                bgcolor: 'background.paper',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2.5,
                px: 2,
                py: 1.75,
              }}
            >
              <Typography sx={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1.1 }}>
                {s.value}
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600, mt: 0.35 }}>
                {s.label}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {reviews.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search application, PI, project, or reference…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EthicsIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: '100%', sm: 400 }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              sx={{ borderRadius: 2, fontSize: 13 }}
            >
              <MenuItem value="all">All statuses</MenuItem>
              <MenuItem value="submitted">Submitted</MenuItem>
              <MenuItem value="under_review">Under Review</MenuItem>
              <MenuItem value="deferred">Deferred</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}

      {filtered.length === 0 ? (
        <Paper
          elevation={0}
          variant="outlined"
          sx={{
            borderRadius: 3,
            p: 6,
            textAlign: 'center',
            boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <Box sx={{
            width: 72,
            height: 72,
            borderRadius: 3,
            bgcolor: `${ACCENT}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2,
          }}>
            <EthicsIcon sx={{ fontSize: 36, color: ACCENT }} />
          </Box>
          <Typography sx={{ color: 'text.primary', fontSize: 18, fontWeight: 600, mb: 1 }}>
            {reviews.length === 0 ? 'No ethics reviews in queue' : 'No matching applications'}
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14, maxWidth: 480, mx: 'auto' }}>
            {reviews.length === 0
              ? 'Submitted ethics applications from researchers will appear here for committee review. Applications with status submitted, under review, or deferred are shown.'
              : 'Try adjusting your search or status filter.'}
          </Typography>
        </Paper>
      ) : (
        <>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            {filtered.map(r => {
              const sm = STATUS_META[r.status] || STATUS_META.submitted;
              const rm = RISK_META[r.risk_level] || RISK_META.Medium;
              const tm = TYPE_META[r.application_type] || { label: typeLabel(r.application_type), color: '#64748b' };
              return (
                <Paper
                  key={r.id}
                  elevation={0}
                  variant="outlined"
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    transition: 'border-color 0.18s',
                    '&:hover': { borderColor: ACCENT },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 10, fontWeight: 700, color: ACCENT, letterSpacing: 0.5, mb: 0.5 }}>
                        {r.ref}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 15, color: 'text.primary' }}>
                          {r.application_title || r.title}
                        </Typography>
                        <Chip label={sm.label} size="small" sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 600, fontSize: 11 }} />
                        <Chip label={`${r.risk_level} Risk`} size="small" sx={{ bgcolor: rm.bg, color: rm.color, fontWeight: 700, fontSize: 10 }} />
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PersonIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                          <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                            {r.pi_name || '—'}
                            {r.project_title ? ` · ${r.project_title}` : ''}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CalIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                          <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                            Submitted {fmtDate(r.submitted_at || r.created_at)} · {r.stage_name}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <DocIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                          <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                            {r.document_count || 0} document{(r.document_count || 0) !== 1 ? 's' : ''} · {tm.label}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Button
                      variant="outlined"
                      endIcon={<ArrowIcon />}
                      size="small"
                      onClick={() => router.push(`/admin-staff/ethics/reviews/${r.id}`)}
                      sx={{
                        borderColor: ACCENT,
                        color: ACCENT,
                        textTransform: 'none',
                        borderRadius: 2,
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      Open Review
                    </Button>
                  </Box>
                </Paper>
              );
            })}
          </Box>

          <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Review Queue Summary</Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
                    <TableCell sx={headCell}>Reference</TableCell>
                    <TableCell sx={headCell}>Application</TableCell>
                    <TableCell sx={headCell}>PI / Project</TableCell>
                    <TableCell sx={headCell}>Type</TableCell>
                    <TableCell sx={headCell}>Risk</TableCell>
                    <TableCell sx={headCell}>Submitted</TableCell>
                    <TableCell sx={headCell}>Status</TableCell>
                    <TableCell sx={headCell} align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map(r => {
                    const sm = STATUS_META[r.status] || STATUS_META.submitted;
                    const rm = RISK_META[r.risk_level] || RISK_META.Medium;
                    return (
                      <TableRow
                        key={r.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => router.push(`/admin-staff/ethics/reviews/${r.id}`)}
                      >
                        <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', color: ACCENT, fontWeight: 600 }}>
                          {r.ref}
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: 13, fontWeight: 600 }} noWrap>
                            {r.application_title || r.title}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, color: 'text.secondary', maxWidth: 200 }}>
                          <Typography sx={{ fontSize: 12, fontWeight: 500 }} noWrap>{r.pi_name || '—'}</Typography>
                          <Typography sx={{ fontSize: 11, color: 'text.disabled' }} noWrap>{r.project_title || '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={typeLabel(r.application_type)} size="small" sx={{ fontSize: 10, height: 22 }} />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={r.risk_level}
                            size="small"
                            sx={{ fontSize: 10, fontWeight: 700, height: 22, bgcolor: rm.bg, color: rm.color }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                          {fmtDate(r.submitted_at || r.created_at)}
                        </TableCell>
                        <TableCell>
                          <Chip label={sm.label} size="small" sx={{ fontSize: 10, fontWeight: 700, height: 22, bgcolor: sm.bg, color: sm.color }} />
                        </TableCell>
                        <TableCell align="right">
                          <ArrowIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Box>
  );
}
