'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, CircularProgress, Alert, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, Avatar, Button,
  TextField, InputAdornment, useTheme, Tooltip, IconButton,
} from '@mui/material';
import {
  Search as SearchIcon, Person as PersonIcon, Visibility as ViewIcon,
  Email as EmailIcon, School as ExpertiseIcon, CalendarToday as CalIcon,
  Assignment as AssignmentIcon, Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../lib/api';

const ACCENT = '#16a699';

const fmtDate = d => d
  ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

export default function ReviewersPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [reviewers, setReviewers] = useState([]);
  const [filteredReviewers, setFilteredReviewers] = useState([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin) { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    await loadReviewers();
  };

  const loadReviewers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin-staff/reviewers');
      setReviewers(res.data || []);
      setFilteredReviewers(res.data || []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load reviewers');
      setReviewers([]);
      setFilteredReviewers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      setFilteredReviewers(reviewers);
    } else {
      setFilteredReviewers(
        reviewers.filter(r =>
          r.name?.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q) ||
          r.expertise?.toLowerCase().includes(q)
        )
      );
    }
  }, [search, reviewers]);

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
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ color: 'text.primary', fontSize: 26, fontWeight: 700, mb: 0.5 }}>
            Reviewers
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
            Manage reviewers and view their assignment history
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadReviewers}
            sx={{ textTransform: 'none', borderColor: ACCENT, color: ACCENT, '&:hover': { borderColor: '#14958a', bgcolor: 'rgba(22,166,153,0.04)' } }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <PersonIcon sx={{ fontSize: 20, color: ACCENT }} />
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Total Reviewers
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'text.primary' }}>
            {reviewers.length}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <AssignmentIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Proposal Reviews
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'text.primary' }}>
            {reviewers.reduce((sum, r) => sum + (r.proposal_reviews || 0), 0)}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <AssignmentIcon sx={{ fontSize: 20, color: '#10b981' }} />
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Project Reviews
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'text.primary' }}>
            {reviewers.reduce((sum, r) => sum + (r.project_reviews || 0), 0)}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <AssignmentIcon sx={{ fontSize: 20, color: '#8b5cf6' }} />
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Ethics Reviews
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'text.primary' }}>
            {reviewers.reduce((sum, r) => sum + (r.ethics_reviews || 0), 0)}
          </Typography>
        </Paper>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search by name, email, or expertise..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 500, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
      </Box>

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Table>
          <TableHead sx={{ bgcolor: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
            <TableRow>
              <TableCell sx={headCell}>Reviewer</TableCell>
              <TableCell sx={headCell}>Expertise</TableCell>
              <TableCell sx={headCell}>Proposals</TableCell>
              <TableCell sx={headCell}>Projects</TableCell>
              <TableCell sx={headCell}>Ethics</TableCell>
              <TableCell sx={headCell}>Total</TableCell>
              <TableCell sx={headCell}>Last Assignment</TableCell>
              <TableCell sx={headCell} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredReviewers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
                    {search ? 'No reviewers match your search' : 'No reviewers found'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredReviewers.map(reviewer => (
                <TableRow
                  key={reviewer.id}
                  hover
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: dark ? 'rgba(22,166,153,0.04)' : 'rgba(22,166,153,0.02)' } }}
                  onClick={() => router.push(`/admin-staff/admin/reviewers/${reviewer.id}`)}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: ACCENT, fontSize: 14, fontWeight: 700 }}>
                        {reviewer.name?.charAt(0) || '?'}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>
                          {reviewer.name || 'Unknown'}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                          {reviewer.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {reviewer.expertise || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={reviewer.proposal_reviews || 0} size="small" sx={{ bgcolor: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontWeight: 600, fontSize: 11 }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={reviewer.project_reviews || 0} size="small" sx={{ bgcolor: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 600, fontSize: 11 }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={reviewer.ethics_reviews || 0} size="small" sx={{ bgcolor: 'rgba(139,92,246,0.1)', color: '#8b5cf6', fontWeight: 600, fontSize: 11 }} />
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>
                      {reviewer.total_reviews || 0}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {reviewer.last_assignment ? fmtDate(reviewer.last_assignment) : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View Profile">
                      <IconButton size="small" sx={{ color: ACCENT }}>
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
