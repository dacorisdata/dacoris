'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, CircularProgress, useTheme, Button, Chip, Alert,
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import {
  Grading as ReviewIcon, ArrowForward as ArrowIcon,
  Person as PersonIcon, AccountBalance as FunderIcon,
  CalendarToday as CalIcon, Groups as TeamIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../../contexts/AuthContext';
import api from '../../../../../lib/api';

const ACCENT = '#16a699';

const STATUS_META = {
  proposed:  { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b',  label: 'Pending Review' },
  draft:     { bg: 'rgba(100,116,139,0.12)', color: '#64748b',  label: 'Draft'            },
  active:    { bg: 'rgba(16,185,129,0.12)',  color: '#10b981',  label: 'Approved'         },
  suspended: { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444',  label: 'Suspended'        },
  completed: { bg: 'rgba(14,165,233,0.12)',  color: '#0ea5e9',  label: 'Completed'        },
};

const fmtDate = d => d
  ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const fmtMoney = (amt, cur = 'KES') => {
  if (amt == null || amt === '') return '—';
  return `${cur} ${Number(amt).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

export default function AdminProjectReviewPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState('');

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
      const res = await api.get('/research/projects');
      setProjects(res.data || []);
    } catch (e) {
      setProjects([]);
      setError(e.response?.data?.detail || 'Failed to load project reviews.');
    } finally {
      setLoading(false);
    }
  };

  const reviewQueue = useMemo(
    () => projects
      .filter(p => p.status === 'proposed')
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)),
    [projects],
  );

  const pendingCount = reviewQueue.length;

  const headCell = {
    fontWeight: 700,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: 'text.secondary',
    whiteSpace: 'nowrap',
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
            Project Reviews
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
            Research projects submitted by PIs and awaiting administrative approval
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {pendingCount > 0 && (
            <Chip
              label={`${pendingCount} Pending`}
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

      {pendingCount > 0 && (
        <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
          <Box sx={{
            flex: '1 1 140px',
            bgcolor: 'background.paper',
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            px: 2,
            py: 1.5,
          }}>
            <Typography sx={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{pendingCount}</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>Awaiting Review</Typography>
          </Box>
          <Box sx={{
            flex: '1 1 140px',
            bgcolor: 'background.paper',
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            px: 2,
            py: 1.5,
          }}>
            <Typography sx={{ fontSize: 22, fontWeight: 700, color: '#10b981' }}>
              {projects.filter(p => p.status === 'active').length}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>Active Projects</Typography>
          </Box>
          <Box sx={{
            flex: '1 1 140px',
            bgcolor: 'background.paper',
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            px: 2,
            py: 1.5,
          }}>
            <Typography sx={{ fontSize: 22, fontWeight: 700, color: ACCENT }}>
              {projects.filter(p => p.involves_human_subjects).length}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>Human Subjects</Typography>
          </Box>
        </Box>
      )}

      {reviewQueue.length === 0 ? (
        <Box sx={{
          bgcolor: 'background.paper',
          borderRadius: 3,
          p: 6,
          border: `1px solid ${theme.palette.divider}`,
          textAlign: 'center',
          boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
        }}>
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
            <ReviewIcon sx={{ fontSize: 36, color: ACCENT }} />
          </Box>
          <Typography sx={{ color: 'text.primary', fontSize: 18, fontWeight: 600, mb: 1 }}>
            No projects pending review
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14, maxWidth: 440, mx: 'auto', mb: 1 }}>
            When a PI submits a project from the setup wizard, it appears here with status &ldquo;proposed&rdquo; for your review.
          </Typography>
          <Typography sx={{ color: 'text.disabled', fontSize: 13, maxWidth: 440, mx: 'auto' }}>
            {projects.length > 0
              ? `${projects.length} project${projects.length !== 1 ? 's' : ''} registered at your institution — none currently awaiting approval.`
              : 'No research projects have been registered at your institution yet.'}
          </Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            {reviewQueue.map(p => {
              const sm = STATUS_META[p.status] || STATUS_META.proposed;
              const needsEthics = p.involves_human_subjects || p.involves_animal_subjects;
              return (
                <Box
                  key={p.id}
                  sx={{
                    bgcolor: 'background.paper',
                    borderRadius: 3,
                    p: 3,
                    border: `1px solid ${theme.palette.divider}`,
                    boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
                    transition: 'border-color 0.18s',
                    '&:hover': { borderColor: ACCENT },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75, flexWrap: 'wrap' }}>
                        <Typography sx={{ color: 'text.primary', fontWeight: 700, fontSize: 15 }}>
                          {p.title}
                        </Typography>
                        <Chip label={sm.label} size="small" sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 600, fontSize: 11 }} />
                        {needsEthics && (
                          <Chip label="Ethics Required" size="small" sx={{ bgcolor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 700, fontSize: 10 }} />
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PersonIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                          <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                            {p.pi_name || p.pi_full_name || '—'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <FunderIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                          <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                            {p.funder_name || 'No award'} · {p.award_number || p.project_code || '—'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <TeamIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                          <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                            {p.member_count || 0} members · {p.milestone_count || 0} milestones
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CalIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                          <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                            Submitted {fmtDate(p.created_at)} · {fmtMoney(p.total_amount, p.currency)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Button
                      variant="outlined"
                      endIcon={<ArrowIcon />}
                      size="small"
                      onClick={() => router.push(`/admin-staff/research/projects/${p.id}`)}
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
                </Box>
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
                    <TableCell sx={headCell}>Project</TableCell>
                    <TableCell sx={headCell}>PI</TableCell>
                    <TableCell sx={headCell}>Funder</TableCell>
                    <TableCell sx={headCell} align="right">Budget</TableCell>
                    <TableCell sx={headCell}>Submitted</TableCell>
                    <TableCell sx={headCell}>Ethics</TableCell>
                    <TableCell sx={headCell} align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reviewQueue.map(p => (
                    <TableRow
                      key={p.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/admin-staff/research/projects/${p.id}`)}
                    >
                      <TableCell>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{p.title}</Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{p.project_code}</Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{p.pi_name || p.pi_full_name || '—'}</TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{p.funder_name || '—'}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                        {fmtMoney(p.total_amount, p.currency)}
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, whiteSpace: 'nowrap' }}>{fmtDate(p.created_at)}</TableCell>
                      <TableCell>
                        <Chip
                          label={p.ethics_status || (p.involves_human_subjects ? 'Required' : 'N/A')}
                          size="small"
                          sx={{ fontSize: 10, fontWeight: 700, height: 22 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <ArrowIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Box>
  );
}
