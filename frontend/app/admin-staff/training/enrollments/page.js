'use client';

import { Fragment, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, CircularProgress, Alert, Chip, useTheme,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, IconButton, MenuItem, Select, FormControl, InputLabel,
  Collapse, Button,
} from '@mui/material';
import {
  CheckCircle as ConfirmIcon, Cancel as RejectIcon,
  WorkspacePremium as CertIcon, ExpandMore as ExpandIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import { trainingAPI } from '../../../../lib/api';

const ACCENT = '#16a699';

const STATUS_META = {
  active:    { label: 'Active',    color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  completed: { label: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  dropped:   { label: 'Dropped',   color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  suspended: { label: 'Suspended', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
};

const ATTEND_STATUS = {
  pending:   { label: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  confirmed: { label: 'Confirmed', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  rejected:  { label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function AdminTrainingEnrollmentsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState([]);
  const [pending, setPending] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expanded, setExpanded] = useState({});

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
      const [enrRes, pendRes] = await Promise.all([
        trainingAPI.listEnrollments(params),
        trainingAPI.listPendingAttendance(),
      ]);
      setEnrollments(enrRes.data || []);
      setPending(pendRes.data || []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load enrollments');
    }
  };

  useEffect(() => { if (!loading) load(); }, [statusFilter]);

  const confirmAttendance = async (id) => {
    try {
      await trainingAPI.confirmAttendance(id);
      setSuccess('Attendance confirmed');
      await load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to confirm attendance');
    }
  };

  const rejectAttendance = async (id) => {
    const notes = window.prompt('Reason for rejection (optional):') || '';
    try {
      await trainingAPI.rejectAttendance(id, { manager_notes: notes || undefined });
      setSuccess('Attendance rejected — learner can resubmit');
      await load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to reject attendance');
    }
  };

  const toggleExpand = (id) => setExpanded(s => ({ ...s, [id]: !s[id] }));

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
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
          Confirm learner attendance submissions. Progress and certificates are issued when all sessions are confirmed.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {pending.length > 0 && (
        <Box sx={{ mb: 3, p: 2.5, bgcolor: 'rgba(245,158,11,0.08)', borderRadius: 3, border: '1px solid rgba(245,158,11,0.25)' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 1.5, color: '#d97706' }}>
            Pending Attendance Confirmations ({pending.length})
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {pending.map(p => (
              <Box key={p.id} sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1,
                bgcolor: 'background.paper', borderRadius: 2, px: 2, py: 1.25,
                border: `1px solid ${theme.palette.divider}`,
              }}>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{p.learner_name} — {p.program_title}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                    Session {p.session_number} · {fmtDate(p.attendance_date)} · Submitted {fmtDate(p.marked_at)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Button size="small" variant="contained" startIcon={<ConfirmIcon />}
                    onClick={() => confirmAttendance(p.id)}
                    sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' }, textTransform: 'none' }}>
                    Confirm
                  </Button>
                  <Button size="small" variant="outlined" color="error" startIcon={<RejectIcon />}
                    onClick={() => rejectAttendance(p.id)}
                    sx={{ textTransform: 'none' }}>
                    Reject
                  </Button>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

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
              <TableCell sx={{ fontWeight: 700, width: 36 }} />
              <TableCell sx={{ fontWeight: 700 }}>Learner</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Programme</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Attendance</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {enrollments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  No enrollments yet.
                </TableCell>
              </TableRow>
            ) : enrollments.map(e => {
              const sm = STATUS_META[e.status] || STATUS_META.active;
              const summary = e.attendance_summary || {};
              const isOpen = expanded[e.id];
              const pendingForEnr = (e.attendance || []).filter(a => a.status === 'pending');
              return (
                <Fragment key={e.id}>
                  <TableRow hover>
                    <TableCell>
                      <IconButton size="small" onClick={() => toggleExpand(e.id)}>
                        <ExpandIcon sx={{
                          fontSize: 18, transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                          transition: 'transform 0.2s',
                        }} />
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{e.user_name || '—'}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{e.user_email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13 }}>{e.program_title}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{e.cpd_hours} CPD hrs</Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 140 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress variant="determinate" value={e.progress_percentage || 0}
                          sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'action.hover',
                            '& .MuiLinearProgress-bar': { bgcolor: ACCENT } }} />
                        <Typography sx={{ fontSize: 11, minWidth: 48 }}>
                          {summary.confirmed || 0}/{summary.session_count || 0}
                        </Typography>
                      </Box>
                      {summary.pending > 0 && (
                        <Typography sx={{ fontSize: 10, color: '#f59e0b', mt: 0.25 }}>
                          {summary.pending} pending review
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={sm.label} size="small" sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 600, fontSize: 11 }} />
                      {e.has_certificate && <CertIcon sx={{ fontSize: 14, color: '#10b981', ml: 0.5, verticalAlign: 'middle' }} />}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={5} sx={{ py: 0, borderBottom: isOpen ? undefined : 'none' }}>
                      <Collapse in={isOpen}>
                        <Box sx={{ py: 1.5, pl: 5 }}>
                          {(e.attendance || []).length === 0 ? (
                            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>No attendance records yet.</Typography>
                          ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                              {(e.attendance || []).map(rec => {
                                const am = ATTEND_STATUS[rec.status] || ATTEND_STATUS.pending;
                                return (
                                  <Box key={rec.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                    <Typography sx={{ fontSize: 12, minWidth: 200 }}>
                                      Session {rec.session_number} · {fmtDate(rec.attendance_date)}
                                    </Typography>
                                    <Chip label={am.label} size="small" sx={{ bgcolor: am.bg, color: am.color, fontSize: 10, height: 20 }} />
                                    {rec.status === 'pending' && (
                                      <>
                                        <IconButton size="small" title="Confirm" onClick={() => confirmAttendance(rec.id)}>
                                          <ConfirmIcon fontSize="small" sx={{ color: '#10b981' }} />
                                        </IconButton>
                                        <IconButton size="small" title="Reject" onClick={() => rejectAttendance(rec.id)}>
                                          <RejectIcon fontSize="small" sx={{ color: '#ef4444' }} />
                                        </IconButton>
                                      </>
                                    )}
                                  </Box>
                                );
                              })}
                            </Box>
                          )}
                          {pendingForEnr.length > 0 && (
                            <Typography sx={{ fontSize: 11, color: '#f59e0b', mt: 1 }}>
                              Confirm pending sessions to update learner progress.
                            </Typography>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
