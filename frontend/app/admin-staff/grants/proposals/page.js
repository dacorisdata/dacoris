'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, TextField, MenuItem, Select, FormControl, InputLabel, useTheme,
  Avatar, Tooltip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Autocomplete, Divider, Badge,
} from '@mui/material';
import {
  Search as SearchIcon, Folder as FolderIcon, Visibility as ViewIcon,
  PersonAdd as AssignIcon, CheckCircle as CheckIcon, Warning as WarnIcon,
  Error as OverdueIcon, Schedule as ClockIcon, Close as CloseIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../lib/api';

const ACCENT = '#16a699';

const STATUS_META = {
  draft:           { bg: 'rgba(100,116,139,0.12)', color: '#64748b', label: 'Draft' },
  submitted:       { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', label: 'Submitted' },
  internal_review: { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6', label: 'Eligibility Review' },
  under_review:    { bg: 'rgba(139,92,246,0.12)',  color: '#8b5cf6', label: 'Under Review' },
  returned:        { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', label: 'Returned' },
  awarded:         { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', label: 'Awarded' },
  declined:        { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', label: 'Declined' },
};

const WORKFLOW_STAGES = [
  { step: 0, label: 'Received',       days: 3  },
  { step: 1, label: 'Eligibility',    days: 7  },
  { step: 2, label: 'Technical',      days: 14 },
  { step: 3, label: 'Budget',         days: 7  },
  { step: 4, label: 'Panel',          days: 14 },
  { step: 5, label: 'Final Approval', days: 7  },
];

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function daysAgo(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr)) / 86400000);
}

/* ── Assign Reviewer Dialog ── */
function AssignReviewerDialog({ open, proposal, reviewers, onClose, onAssigned }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const currentStep = proposal?.review_step ?? 0;
  const currentStage = WORKFLOW_STAGES[currentStep] || WORKFLOW_STAGES[0];

  const [selectedStep, setSelectedStep] = useState(currentStep);
  const [selectedReviewer, setSelectedReviewer] = useState(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setSelectedStep(currentStep); setSelectedReviewer(null); setNotes(''); setError(''); }
  }, [open, currentStep]);

  const handleSave = async () => {
    if (!selectedReviewer) { setError('Select a reviewer'); return; }
    setSaving(true);
    try {
      const stage = WORKFLOW_STAGES[selectedStep];
      await api.post(`/grants/proposals/${proposal.id}/stage-reviewers`, {
        reviewer_id: selectedReviewer.id,
        stage_step: selectedStep,
        stage_name: stage?.label,
        notes: notes || undefined,
      });
      onAssigned();
      onClose();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to assign reviewer');
    } finally {
      setSaving(false);
    }
  };

  if (!proposal) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800, fontSize: 16 }}>
        Assign Reviewer
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {/* Proposal info */}
        <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: dark ? 'rgba(22,166,153,0.08)' : 'rgba(22,166,153,0.05)', border: '1px solid', borderColor: ACCENT + '33' }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.3 }}>{proposal.title}</Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
            {proposal.opportunity?.title || `Opportunity #${proposal.opportunity_id}`} · Submitted {fmtDate(proposal.submitted_at)}
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError('')}>{error}</Alert>}

        {/* Stage selection */}
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Review Stage</InputLabel>
          <Select value={selectedStep} label="Review Stage" onChange={e => setSelectedStep(Number(e.target.value))}
            sx={{ borderRadius: 2 }}>
            {WORKFLOW_STAGES.filter(s => s.step > 0).map(s => (
              <MenuItem key={s.step} value={s.step}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {s.step === currentStep && <Chip label="Current" size="small" sx={{ height: 16, fontSize: 9, bgcolor: ACCENT + '22', color: ACCENT }} />}
                  Stage {s.step}: {s.label}
                  <Typography sx={{ fontSize: 11, color: 'text.disabled', ml: 0.5 }}>(~{s.days} days)</Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Reviewer autocomplete */}
        {reviewers.length === 1 && (
          <Alert severity="info" sx={{ mb: 2, fontSize: 12 }}>
            No users with reviewer roles found. Defaulting to you as the reviewer.
          </Alert>
        )}
        <Autocomplete
          options={reviewers}
          getOptionLabel={r => `${r.name} (${r.email})`}
          value={selectedReviewer}
          onChange={(_, v) => setSelectedReviewer(v)}
          renderOption={(props, r) => (
            <li {...props} key={r.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: ACCENT }}>{r.name.charAt(0)}</Avatar>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{r.name}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{r.roles}</Typography>
                </Box>
              </Box>
            </li>
          )}
          renderInput={(params) => (
            <TextField {...params} label="Select Reviewer" size="small" sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          )}
          noOptionsText="No reviewers available."
        />

        <TextField fullWidth size="small" multiline rows={2} label="Assignment notes (optional)"
          value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any specific review instructions…"
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: 'text.secondary' }}>Cancel</Button>
        <Button variant="contained" disabled={saving || !selectedReviewer} onClick={handleSave}
          startIcon={saving ? <CircularProgress size={13} sx={{ color: 'inherit' }} /> : <AssignIcon />}
          sx={{ textTransform: 'none', fontWeight: 700, bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}>
          {saving ? 'Assigning…' : 'Assign Reviewer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function GrantProposalsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme  = useTheme();
  const dark   = theme.palette.mode === 'dark';

  const [loading, setLoading]     = useState(true);
  const [proposals, setProposals] = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  // Reviewer assignment dialog
  const [reviewers, setReviewers]           = useState([]);
  const [assignTarget, setAssignTarget]     = useState(null); // proposal being assigned
  const [reviewersLoading, setReviewersLoading] = useState(false);

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
      const res = await api.get('/grants/proposals');
      setProposals(res.data || []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load proposals');
    }
  };

  const loadReviewers = async () => {
    if (reviewers.length > 0) return;
    setReviewersLoading(true);
    try {
      const res = await api.get('/grants/proposals/reviewers/available');
      setReviewers(res.data || []);
    } catch {
      setReviewers([]);
    } finally {
      setReviewersLoading(false);
    }
  };

  const openAssign = async (proposal) => {
    setAssignTarget(proposal);
    await loadReviewers();
  };

  const applyFilter = () => {
    let data = [...proposals];
    if (statusFilter !== 'all') data = data.filter(p => p.status === statusFilter);
    if (search) data = data.filter(p => p.title?.toLowerCase().includes(search.toLowerCase()));
    setFiltered(data);
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress />
    </Box>
  );

  const counts = Object.keys(STATUS_META).reduce((acc, s) => ({
    ...acc, [s]: proposals.filter(p => p.status === s).length
  }), {});

  const needsReviewerCount = proposals.filter(p =>
    !['draft','awarded','declined'].includes(p.status) &&
    !(p.stage_assignments || []).some(a => a.status === 'active' && a.stage_step === (p.review_step ?? 0))
  ).length;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 24, fontWeight: 800, mb: 0.3 }}>Grant Proposals</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
            Track, review and assign reviewers to all submitted proposals
          </Typography>
        </Box>
        {needsReviewerCount > 0 && (
          <Chip
            icon={<WarnIcon sx={{ fontSize: 15 }} />}
            label={`${needsReviewerCount} proposal${needsReviewerCount > 1 ? 's' : ''} awaiting reviewer assignment`}
            sx={{ bgcolor: '#fff8e1', color: '#92400e', border: '1px solid #fcd34d', fontWeight: 600, fontSize: 12 }}
          />
        )}
      </Box>

      {error   && <Alert severity="error"   sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Status summary cards */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <Box key={key} onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
            sx={{ flex: '1 1 110px', bgcolor: 'background.paper', borderRadius: 2, p: 1.5,
              border: `1px solid ${statusFilter === key ? meta.color : theme.palette.divider}`,
              cursor: 'pointer', transition: 'all 0.15s',
              '&:hover': { borderColor: meta.color, transform: 'translateY(-1px)' } }}>
            <Typography sx={{ color: meta.color, fontSize: 20, fontWeight: 800 }}>{counts[key] || 0}</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 600, lineHeight: 1.3 }}>{meta.label}</Typography>
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

      <TableContainer component={Paper} elevation={0}
        sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, bgcolor: 'background.paper' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12.5, color: 'text.secondary',
              bgcolor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
              borderBottom: `1px solid ${theme.palette.divider}` } }}>
              <TableCell>Proposal</TableCell>
              <TableCell>Grant Opportunity</TableCell>
              <TableCell>Team</TableCell>
              <TableCell>Stage & Status</TableCell>
              <TableCell>Reviewer</TableCell>
              <TableCell>Timeline</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <FolderIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                    <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>No proposals found</Typography>
                    <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>
                      Proposals submitted by researchers will appear here.
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : filtered.map(p => {
              const sm = STATUS_META[p.status] || STATUS_META.draft;
              const step = p.review_step ?? 0;
              const stageInfo = WORKFLOW_STAGES[step];
              const isActive = !['draft','awarded','declined'].includes(p.status);

              // Reviewer for current stage
              const currentAssignment = (p.stage_assignments || []).find(
                a => a.status === 'active' && a.stage_step === step
              );

              // Overdue check based on submitted_at + accumulated stage days
              const submittedDays = daysAgo(p.submitted_at);
              const totalExpectedDays = WORKFLOW_STAGES.slice(0, step + 1).reduce((s, st) => s + st.days, 0);
              const isOverdue = isActive && submittedDays != null && submittedDays > totalExpectedDays;
              const isNearDue = isActive && !isOverdue && submittedDays != null && (submittedDays > totalExpectedDays * 0.8);

              return (
                <TableRow key={p.id} hover
                  sx={{ '&:last-child td': { borderBottom: 'none' },
                    '&:hover': { bgcolor: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' },
                    borderLeft: isOverdue ? '3px solid #ef4444' : isNearDue ? '3px solid #f59e0b' : '3px solid transparent',
                  }}>
                  {/* Proposal */}
                  <TableCell sx={{ maxWidth: 220 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: 'text.primary', lineHeight: 1.3 }}>
                      {p.title}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.3 }}>
                      {p.status === 'draft' ? `Created ${fmtDate(p.created_at)}` : `Submitted ${fmtDate(p.submitted_at)}`}
                    </Typography>
                  </TableCell>

                  {/* Opportunity */}
                  <TableCell sx={{ maxWidth: 160 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: ACCENT, lineHeight: 1.3 }}>
                      {p.opportunity?.title || `#${p.opportunity_id}`}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                      {p.opportunity?.sponsor || '—'}
                    </Typography>
                  </TableCell>

                  {/* Team */}
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Tooltip title={`${p.lead_pi?.name || 'Lead PI'} – Lead PI`} arrow>
                        <Avatar sx={{ bgcolor: ACCENT, width: 28, height: 28, fontSize: 11,
                          border: `2px solid ${theme.palette.background.paper}` }}>
                          {p.lead_pi?.name?.charAt(0) || 'L'}
                        </Avatar>
                      </Tooltip>
                      {(p.collaborators || []).slice(0, 2).map((c, i) => (
                        <Tooltip key={i} title={c.user?.name || c.invited_name || 'Pending'} arrow>
                          <Avatar sx={{ bgcolor: '#8b5cf6', width: 28, height: 28, fontSize: 11,
                            border: `2px solid ${theme.palette.background.paper}`,
                            opacity: c.status === 'pending' ? 0.6 : 1 }}>
                            {(c.user?.name || c.invited_name || '?').charAt(0)}
                          </Avatar>
                        </Tooltip>
                      ))}
                      {(p.collaborators || []).length > 2 && (
                        <Avatar sx={{ bgcolor: 'action.selected', width: 28, height: 28, fontSize: 10 }}>
                          +{p.collaborators.length - 2}
                        </Avatar>
                      )}
                    </Box>
                    <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mt: 0.3 }}>
                      {1 + (p.collaborators?.length || 0)} member{(1 + (p.collaborators?.length || 0)) > 1 ? 's' : ''}
                    </Typography>
                  </TableCell>

                  {/* Stage & Status */}
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                      <Chip label={sm.label} size="small"
                        sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 700, fontSize: 10.5, width: 'fit-content' }} />
                      {isActive && stageInfo && (
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                          Stage {step}: {stageInfo.label}
                        </Typography>
                      )}
                      {isOverdue && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                          <OverdueIcon sx={{ fontSize: 13, color: '#ef4444' }} />
                          <Typography sx={{ fontSize: 10.5, color: '#ef4444', fontWeight: 700 }}>Overdue</Typography>
                        </Box>
                      )}
                      {isNearDue && !isOverdue && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                          <WarnIcon sx={{ fontSize: 13, color: '#f59e0b' }} />
                          <Typography sx={{ fontSize: 10.5, color: '#f59e0b', fontWeight: 600 }}>Due soon</Typography>
                        </Box>
                      )}
                    </Box>
                  </TableCell>

                  {/* Reviewer */}
                  <TableCell>
                    {currentAssignment ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: '#8b5cf6', width: 26, height: 26, fontSize: 11 }}>
                          {currentAssignment.reviewer?.name?.charAt(0) || '?'}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                            {currentAssignment.reviewer?.name || 'Reviewer'}
                          </Typography>
                          <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
                            Stage {currentAssignment.stage_step}
                          </Typography>
                        </Box>
                      </Box>
                    ) : isActive ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b', flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>Unassigned</Typography>
                      </Box>
                    ) : (
                      <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>—</Typography>
                    )}
                  </TableCell>

                  {/* Timeline */}
                  <TableCell>
                    {isActive && p.submitted_at ? (
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <ClockIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                            {submittedDays}d in review
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: 10.5, color: isOverdue ? '#ef4444' : 'text.disabled' }}>
                          Target: {totalExpectedDays}d total
                        </Typography>
                      </Box>
                    ) : (
                      <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                        {fmtDate(p.created_at)}
                      </Typography>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      {isActive && (
                        <Tooltip title="Assign Reviewer">
                          <IconButton size="small" onClick={() => openAssign(p)}
                            sx={{ color: currentAssignment ? 'text.secondary' : '#f59e0b',
                              '&:hover': { bgcolor: 'rgba(245,158,11,0.1)' } }}>
                            <AssignIcon sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="View Details">
                        <IconButton size="small"
                          onClick={() => router.push(`/admin-staff/grants/proposals/${p.id}`)}
                          sx={{ color: ACCENT, '&:hover': { bgcolor: ACCENT + '18' } }}>
                          <ViewIcon sx={{ fontSize: 17 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Assign Reviewer Dialog */}
      <AssignReviewerDialog
        open={!!assignTarget}
        proposal={assignTarget}
        reviewers={reviewers}
        onClose={() => setAssignTarget(null)}
        onAssigned={async () => {
          setSuccess('Reviewer assigned successfully.');
          await loadProposals();
        }}
      />
    </Box>
  );
}
