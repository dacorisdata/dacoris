'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, TextField, MenuItem, Select, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, useTheme,
} from '@mui/material';
import { Search as SearchIcon, Science as EthicsIcon, Gavel as GavelIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../lib/api';

const ACCENT = '#10b981';

const STATUS_META = {
  submitted:    { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6',  label: 'Submitted' },
  under_review: { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b',  label: 'Under Review' },
  approved:     { bg: 'rgba(16,185,129,0.12)',  color: '#10b981',  label: 'Approved' },
  approved_with_modifications: { bg: 'rgba(16,185,129,0.08)', color: '#059669', label: 'Approved w/ Modifications' },
  deferred:     { bg: 'rgba(245,158,11,0.08)',  color: '#d97706',  label: 'Deferred' },
  rejected:     { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444',  label: 'Rejected' },
};

export default function EthicsApplicationsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme  = useTheme();
  const dark   = theme.palette.mode === 'dark';

  const [loading, setLoading]   = useState(true);
  const [apps, setApps]         = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [decisionDialog, setDecisionDialog] = useState(null);
  const [decisionForm, setDecisionForm]     = useState({ status: '', notes: '', approved_until: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { checkAuth(); }, []);
  useEffect(() => { applyFilter(); }, [apps, search, statusFilter]);

  const checkAuth = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin)      { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    await loadApps();
    setLoading(false);
  };

  const loadApps = async () => {
    try {
      const projRes = await api.get('/api/research/projects').catch(() => ({ data: [] }));
      const projects = projRes.data || [];
      const allApps = [];
      for (const proj of projects) {
        const ethRes = await api.get(`/api/research/ethics/project/${proj.id}`).catch(() => ({ data: [] }));
        (ethRes.data || []).forEach(app => allApps.push({ ...app, project_title: proj.title }));
      }
      setApps(allApps);
    } catch (e) {
      setError('Failed to load ethics applications');
    }
  };

  const applyFilter = () => {
    let data = [...apps];
    if (statusFilter !== 'all') data = data.filter(a => a.status === statusFilter);
    if (search) data = data.filter(a => a.title?.toLowerCase().includes(search.toLowerCase()) || a.project_title?.toLowerCase().includes(search.toLowerCase()));
    setFiltered(data);
  };

  const handleDecision = async () => {
    if (!decisionForm.status) { setError('Please select a decision'); return; }
    setSubmitting(true); setError('');
    try {
      await api.patch(`/api/research/ethics/${decisionDialog.id}/decision`, null, {
        params: { target_status: decisionForm.status, decision_notes: decisionForm.notes, approved_until: decisionForm.approved_until || undefined }
      });
      setSuccess('Decision recorded successfully');
      setTimeout(() => setSuccess(''), 3000);
      setDecisionDialog(null);
      await loadApps();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to record decision');
    } finally { setSubmitting(false); }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>;

  const pendingCount = apps.filter(a => ['submitted', 'under_review'].includes(a.status)).length;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ color: 'text.primary', fontSize: 26, fontWeight: 700, mb: 0.5 }}>Ethics Applications</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>Review and manage IRB / ethics committee applications</Typography>
        </Box>
        {pendingCount > 0 && (
          <Chip label={`${pendingCount} Pending Review`} sx={{ bgcolor: 'rgba(245,158,11,0.12)', color: '#f59e0b', fontWeight: 700, fontSize: 12 }} />
        )}
      </Box>

      {error   && <Alert severity="error"   sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      {/* Status Summary */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {['submitted', 'under_review', 'approved', 'rejected'].map(s => {
          const meta = STATUS_META[s];
          const count = apps.filter(a => a.status === s).length;
          return (
            <Box key={s} onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
              sx={{ flex: '1 1 120px', bgcolor: 'background.paper', borderRadius: 2.5, p: 2, border: `1px solid ${statusFilter === s ? meta.color : theme.palette.divider}`, cursor: 'pointer', transition: 'all 0.18s', '&:hover': { borderColor: meta.color } }}>
              <Typography sx={{ color: meta.color, fontSize: 22, fontWeight: 700 }}>{count}</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 600 }}>{meta.label}</Typography>
            </Box>
          );
        })}
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField size="small" placeholder="Search by title or project…" value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon sx={{ color: 'text.disabled', mr: 1, fontSize: 18 }} /> }}
          sx={{ flex: '1 1 240px', '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        <FormControl size="small" sx={{ minWidth: 180 }}>
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
              <TableCell>Application Title</TableCell>
              <TableCell>Project</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Submitted</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6}>
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <EthicsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>No ethics applications</Typography>
                  <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>Applications submitted by researchers will appear here.</Typography>
                </Box>
              </TableCell></TableRow>
            ) : filtered.map(app => {
              const sm = STATUS_META[app.status] || { bg: 'transparent', color: 'text.secondary', label: app.status };
              const canDecide = ['submitted', 'under_review'].includes(app.status);
              return (
                <TableRow key={app.id} hover sx={{ '&:last-child td': { borderBottom: 'none' }, '&:hover': { bgcolor: `${ACCENT}06` } }}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, fontSize: 14, color: 'text.primary' }}>{app.title}</Typography>
                  </TableCell>
                  <TableCell><Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>{app.project_title || `Project #${app.project_id}`}</Typography></TableCell>
                  <TableCell><Typography sx={{ fontSize: 13, textTransform: 'capitalize' }}>{app.application_type?.replace('_', ' ')}</Typography></TableCell>
                  <TableCell><Typography sx={{ fontSize: 13.5 }}>{fmtDate(app.submitted_at)}</Typography></TableCell>
                  <TableCell><Chip label={sm.label} size="small" sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 600, fontSize: 11 }} /></TableCell>
                  <TableCell>
                    {canDecide && (
                      <Button size="small" startIcon={<GavelIcon />} onClick={() => { setDecisionDialog(app); setDecisionForm({ status: '', notes: '', approved_until: '' }); }}
                        sx={{ color: ACCENT, textTransform: 'none', fontSize: 12, fontWeight: 600, '&:hover': { bgcolor: `${ACCENT}10` } }}>
                        Record Decision
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Decision Dialog */}
      <Dialog open={Boolean(decisionDialog)} onClose={() => setDecisionDialog(null)} maxWidth="sm" fullWidth disableScrollLock
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Record Ethics Decision</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ color: 'text.secondary', fontSize: 13, mb: 2 }}><b>{decisionDialog?.title}</b></Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Decision *</InputLabel>
              <Select value={decisionForm.status} label="Decision *" onChange={e => setDecisionForm(f => ({ ...f, status: e.target.value }))} sx={{ borderRadius: 2 }}>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="approved_with_modifications">Approved with Modifications</MenuItem>
                <MenuItem value="deferred">Deferred</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
              </Select>
            </FormControl>
            {decisionForm.status === 'approved' && (
              <TextField label="Approved Until" size="small" type="date" fullWidth InputLabelProps={{ shrink: true }}
                value={decisionForm.approved_until} onChange={e => setDecisionForm(f => ({ ...f, approved_until: e.target.value }))} />
            )}
            <TextField label="Decision Notes" size="small" fullWidth multiline rows={3}
              value={decisionForm.notes} onChange={e => setDecisionForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Rationale, conditions, or comments…" />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setDecisionDialog(null)} sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" onClick={handleDecision} disabled={submitting || !decisionForm.status}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <GavelIcon />}
            sx={{ bgcolor: ACCENT, textTransform: 'none', borderRadius: 2, fontWeight: 600, '&:hover': { bgcolor: '#059669' } }}>
            Submit Decision
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
