'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme,
  Alert, TextField, InputAdornment, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TablePagination,
  IconButton, Tooltip, LinearProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Science as ScienceIcon,
  OpenInNew as OpenIcon,
  Refresh as RefreshIcon,
  AccountBalance as FunderIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#1ca7a1';

const STATUS_META = {
  draft:     { label: 'Draft',     color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  proposed:  { label: 'Proposed',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  active:    { label: 'Active',    color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  suspended: { label: 'Suspended', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  completed: { label: 'Completed', color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
};

const ETHICS_META = {
  approved: '#10b981',
  rejected: '#ef4444',
  under_review: '#0ea5e9',
  submitted: '#f59e0b',
  draft: '#64748b',
};

const fmtDate = d => d
  ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const fmtMoney = (amt, cur = 'KES') => {
  if (amt == null || amt === '') return '—';
  return `${cur} ${Number(amt).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

const fmtPeriod = (start, end) => {
  if (!start && !end) return '—';
  return `${fmtDate(start)} – ${fmtDate(end)}`;
};

function StatusChip({ status }) {
  const key = status?.toLowerCase();
  const meta = STATUS_META[key] || { label: status || '—', color: '#64748b', bg: 'rgba(100,116,139,0.12)' };
  return (
    <Chip
      label={meta.label}
      size="small"
      sx={{
        fontSize: 11,
        fontWeight: 700,
        height: 24,
        bgcolor: meta.bg,
        color: meta.color,
        border: `1px solid ${meta.color}33`,
      }}
    />
  );
}

export default function ResearcherProjects() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchUser().then(u => { if (!u) router.push('/login'); else loadProjects(); });
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/research/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const live = res.data || [];
      setProjects(live.filter(p => p.status === 'proposed' || p.status === 'draft'));
    } catch {
      setProjects([]);
      setError('Failed to load projects.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = projects.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [
      p.title,
      p.project_code,
      p.funder_name,
      p.pi_name,
      p.research_area,
      p.award_number,
    ].some(v => v?.toLowerCase().includes(q));
  });

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const stats = {
    total: projects.length,
    draft: projects.filter(p => p.status === 'draft').length,
    proposed: projects.filter(p => p.status === 'proposed').length,
    funded: projects.filter(p => p.award_id).length,
  };

  const openProject = (p) => {
    if (p.status === 'draft') router.push(`/researcher/projects/${p.id}/setup`);
    else router.push(`/researcher/projects/${p.id}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 700 }}>My Projects</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.3 }}>
            Draft projects open the setup wizard; submitted projects open a read-only details view
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
          onClick={loadProjects}
          sx={{ textTransform: 'none', borderRadius: 2 }}
        >
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {projects.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
          {[
            { label: 'Total', value: stats.total, color: ACCENT },
            { label: 'Draft', value: stats.draft, color: '#64748b' },
            { label: 'Proposed', value: stats.proposed, color: '#f59e0b' },
            { label: 'Funded', value: stats.funded, color: '#8b5cf6' },
          ].map(s => (
            <Box
              key={s.label}
              sx={{
                flex: '1 1 120px',
                bgcolor: 'background.paper',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                px: 2,
                py: 1.5,
              }}
            >
              <Typography sx={{ fontSize: 20, fontWeight: 700, color: s.color, lineHeight: 1.2 }}>{s.value}</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600, mt: 0.25 }}>{s.label}</Typography>
            </Box>
          ))}
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search by title, funder, code, or PI…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: '100%', sm: 360 }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
          {filtered.length} project{filtered.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {filtered.length === 0 ? (
        <Paper
          elevation={0}
          variant="outlined"
          sx={{ textAlign: 'center', py: 8, borderRadius: 2 }}
        >
          <ScienceIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
            {projects.length === 0 ? 'No projects in draft or proposed status' : 'No results found'}
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', maxWidth: 420, mx: 'auto' }}>
            {projects.length === 0
              ? 'Save a project as draft from the setup wizard, or submit one for review — it will appear here.'
              : 'Try a different search term.'}
          </Typography>
        </Paper>
      ) : (
        <Paper elevation={0} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 960 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
                  <TableCell sx={headCell}>Project</TableCell>
                  <TableCell sx={headCell}>Funded By</TableCell>
                  <TableCell sx={headCell} align="right">Award Amount</TableCell>
                  <TableCell sx={headCell}>Period</TableCell>
                  <TableCell sx={headCell}>Ethics</TableCell>
                  <TableCell sx={headCell}>Progress</TableCell>
                  <TableCell sx={headCell}>Status</TableCell>
                  <TableCell sx={headCell} align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginated.map(p => {
                  const milestonePct = p.milestone_count
                    ? Math.round((p.done_milestone_count / p.milestone_count) * 100)
                    : 0;
                  const ethicsKey = p.ethics_status?.toLowerCase();
                  const ethicsColor = ETHICS_META[ethicsKey] || '#64748b';

                  return (
                    <TableRow
                      key={p.id}
                      hover
                      onClick={() => openProject(p)}
                      sx={{
                        cursor: 'pointer',
                        '&:last-child td': { borderBottom: 0 },
                        '&:hover': { bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(28,167,161,0.04)' },
                      }}
                    >
                      <TableCell sx={{ py: 1.75, maxWidth: 280 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4, color: 'text.primary' }}>
                          {p.title || 'Untitled project'}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mt: 0.5, flexWrap: 'wrap' }}>
                          <Typography sx={{ fontSize: 11, color: 'text.disabled', fontFamily: 'monospace' }}>
                            {p.project_code || p.id.slice(0, 8).toUpperCase()}
                          </Typography>
                          {p.research_area && (
                            <Chip
                              label={p.research_area}
                              size="small"
                              sx={{ fontSize: 10, height: 20, fontWeight: 600, bgcolor: 'rgba(28,167,161,0.08)', color: ACCENT }}
                            />
                          )}
                        </Box>
                      </TableCell>

                      <TableCell sx={{ py: 1.75, maxWidth: 180 }}>
                        {p.funder_name ? (
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
                            <FunderIcon sx={{ fontSize: 15, color: 'text.disabled', mt: 0.2, flexShrink: 0 }} />
                            <Box>
                              <Typography sx={{ fontSize: 12, fontWeight: 600, lineHeight: 1.35 }}>
                                {p.funder_name}
                              </Typography>
                              {p.award_number && (
                                <Typography sx={{ fontSize: 10, color: 'text.disabled', mt: 0.25 }}>
                                  {p.award_number}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        ) : (
                          <Typography sx={{ fontSize: 12, color: 'text.disabled', fontStyle: 'italic' }}>
                            {p.project_type === 'funded' ? 'Pending award link' : 'Unfunded'}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell align="right" sx={{ py: 1.75, whiteSpace: 'nowrap' }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: p.total_amount ? 'text.primary' : 'text.disabled' }}>
                          {fmtMoney(p.total_amount, p.currency)}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ py: 1.75, whiteSpace: 'nowrap' }}>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                          {fmtPeriod(p.start_date, p.end_date)}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ py: 1.75 }}>
                        {p.ethics_status ? (
                          <Chip
                            label={p.ethics_status.replace(/_/g, ' ')}
                            size="small"
                            sx={{
                              fontSize: 10,
                              fontWeight: 700,
                              height: 22,
                              textTransform: 'capitalize',
                              bgcolor: `${ethicsColor}18`,
                              color: ethicsColor,
                            }}
                          />
                        ) : (
                          <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>—</Typography>
                        )}
                      </TableCell>

                      <TableCell sx={{ py: 1.75, minWidth: 120 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={milestonePct}
                            sx={{
                              flex: 1,
                              height: 5,
                              borderRadius: 3,
                              bgcolor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                              '& .MuiLinearProgress-bar': { bgcolor: ACCENT, borderRadius: 3 },
                            }}
                          />
                          <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', minWidth: 36 }}>
                            {p.done_milestone_count}/{p.milestone_count}
                          </Typography>
                        </Box>
                      </TableCell>

                      <TableCell sx={{ py: 1.75 }}>
                        <StatusChip status={p.status} />
                      </TableCell>

                      <TableCell align="right" sx={{ py: 1.75 }} onClick={e => e.stopPropagation()}>
                        <Tooltip title={p.status === 'draft' ? 'Continue setup' : 'View project'} arrow>
                          <Button
                            size="small"
                            variant="outlined"
                            endIcon={<OpenIcon sx={{ fontSize: 14 }} />}
                            onClick={() => openProject(p)}
                            sx={{
                              textTransform: 'none',
                              fontSize: 12,
                              fontWeight: 600,
                              borderRadius: 1.5,
                              borderColor: `${ACCENT}66`,
                              color: ACCENT,
                              whiteSpace: 'nowrap',
                              '&:hover': { borderColor: ACCENT, bgcolor: 'rgba(28,167,161,0.06)' },
                            }}
                          >
                            {p.status === 'draft' ? 'Continue' : 'Open'}
                          </Button>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filtered.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[5, 10, 25]}
            sx={{
              borderTop: `1px solid ${theme.palette.divider}`,
              '.MuiTablePagination-toolbar': { minHeight: 48 },
              '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': { fontSize: 12 },
            }}
          />
        </Paper>
      )}
    </Box>
  );
}

const headCell = {
  fontWeight: 700,
  fontSize: 12,
  color: 'text.secondary',
  textTransform: 'uppercase',
  letterSpacing: 0.4,
  whiteSpace: 'nowrap',
  py: 1.5,
  borderBottom: `1px solid`,
  borderColor: 'divider',
};

/** @deprecated Fallback for legacy pages — prefer live API data */
export const SAMPLE_PROJECTS = [];
