'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, CircularProgress, Alert, Chip, useTheme,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, IconButton, MenuItem, Select, FormControl, InputLabel,
} from '@mui/material';
import { CheckCircle as CompleteIcon, WorkspacePremium as CertIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import { trainingAPI } from '../../../../lib/api';

const ACCENT = '#16a699';

const STATUS_META = {
  active:    { label: 'Active',    color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  completed: { label: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  dropped:   { label: 'Dropped',   color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  suspended: { label: 'Suspended', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function AdminTrainingEnrollmentsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    await load();
    setLoading(false);
  };

  const load = async () => {
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const res = await trainingAPI.listEnrollments(params);
      setEnrollments(res.data || []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load enrollments');
    }
  };

  useEffect(() => { if (!loading) load(); }, [statusFilter]);

  const markComplete = async (id) => {
    try {
      await trainingAPI.updateEnrollment(id, { status: 'completed', progress_percentage: 100 });
      setSuccess('Marked complete — certificate issued if applicable');
      await load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to update enrollment');
    }
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
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: 24, fontWeight: 700 }}>Training Enrollments</Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Monitor learner progress and issue completions</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <FormControl size="small" sx={{ mb: 2, minWidth: 140 }}>
        <InputLabel>Status</InputLabel>
        <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)}>
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="completed">Completed</MenuItem>
          <MenuItem value="dropped">Dropped</MenuItem>
        </Select>
      </FormControl>

      <TableContainer sx={{ bgcolor: 'background.paper', borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Learner</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Programme</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Progress</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Enrolled</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {enrollments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  No enrollments yet.
                </TableCell>
              </TableRow>
            ) : enrollments.map(e => {
              const sm = STATUS_META[e.status] || STATUS_META.active;
              return (
                <TableRow key={e.id} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{e.user_name || '—'}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{e.user_email}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: 13 }}>{e.program_title}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{e.cpd_hours} CPD hrs</Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 120 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress variant="determinate" value={e.progress_percentage || 0}
                        sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'action.hover',
                          '& .MuiLinearProgress-bar': { bgcolor: ACCENT } }} />
                      <Typography sx={{ fontSize: 11, minWidth: 32 }}>{Math.round(e.progress_percentage || 0)}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{fmtDate(e.enrolled_at)}</TableCell>
                  <TableCell>
                    <Chip label={sm.label} size="small" sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 600, fontSize: 11 }} />
                    {e.has_certificate && <CertIcon sx={{ fontSize: 14, color: '#10b981', ml: 0.5, verticalAlign: 'middle' }} />}
                  </TableCell>
                  <TableCell align="right">
                    {e.status === 'active' && (
                      <IconButton size="small" onClick={() => markComplete(e.id)} title="Mark complete">
                        <CompleteIcon fontSize="small" sx={{ color: '#10b981' }} />
                      </IconButton>
                    )}
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
