'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, CircularProgress, Alert, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, TextField, MenuItem, Select, FormControl, InputLabel, useTheme,
  Avatar, Tooltip, IconButton,
} from '@mui/material';
import {
  Search as SearchIcon, Folder as FolderIcon, Visibility as ViewIcon,
  PersonAdd as AssignIcon, Warning as WarnIcon,
  Error as OverdueIcon, Schedule as ClockIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../lib/api';
import { collabAvatarSx } from '../../../../lib/pendingAvatar';
import { canAssignGrantReviewers } from '../../../../lib/adminStaffRoles';
import AssignStageReviewerDialog from '../../../../components/grants/AssignStageReviewerDialog';

const ACCENT = '#16a699';

const STATUS_META = {
  draft:           { bg: 'rgba(100,116,139,0.12)', color: '#64748b', label: 'Draft' },
  submitted:       { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', label: 'Submitted' },
  internal_review: { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6', label: 'In Review' },
  under_review:    { bg: 'rgba(139,92,246,0.12)',  color: '#8b5cf6', label: 'Section Review' },
  returned:        { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', label: 'Returned' },
  approved:        { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', label: 'Approved' },
  applying:        { bg: 'rgba(6,182,212,0.12)',   color: '#06b6d4', label: 'Applying' },
  awarded:         { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', label: 'Funder Awarded' },
  funding_unsuccessful: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', label: 'Not Funded' },
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

export default function GrantProposalsPage() {
  const router = useRouter();
  const { fetchUser, user } = useAuth();
  const theme  = useTheme();
  const dark   = theme.palette.mode === 'dark';
  const [canAssign, setCanAssign] = useState(false);

  const [loading, setLoading]     = useState(true);
  const [proposals, setProposals] = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [assignTarget, setAssignTarget] = useState(null);

  useEffect(() => { checkAuth(); }, []);
  useEffect(() => { applyFilter(); }, [proposals, search, statusFilter]);

  const checkAuth = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin)      { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    setCanAssign(canAssignGrantReviewers(u));
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

  const openAssign = (proposal) => {
    if (!canAssign) return;
    setAssignTarget(proposal);
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
    !(p.stage_assignments || []).filter(a => a.status === 'active' && a.stage_step === (p.review_step ?? 0)).length
  ).length;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 24, fontWeight: 800, mb: 0.3 }}>Grant Proposals</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
            {canAssign
              ? 'View institutional proposals, review teams, and assign stage reviewers'
              : 'View institutional proposals and review teams'}
          </Typography>
        </Box>
        {canAssign && needsReviewerCount > 0 && (
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

              // All reviewers for current stage
              const currentAssignments = (p.stage_assignments || []).filter(
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
                        <Tooltip
                          key={i}
                          title={`${c.user?.name || c.invited_name || 'Pending'}${c.status !== 'accepted' ? ' · Invite pending' : ''}`}
                          arrow
                        >
                          <Avatar sx={collabAvatarSx(c.status, {
                            bgcolor: '#8b5cf6', width: 28, height: 28, fontSize: 11,
                            border: `2px solid ${theme.palette.background.paper}`,
                          })}>
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
                    {currentAssignments.length > 0 ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                        {currentAssignments.map((assignment, idx) => (
                          <Tooltip key={idx} title={`${assignment.reviewer?.name || 'Reviewer'} - Stage ${assignment.stage_step}`}>
                            <Avatar sx={{ bgcolor: '#8b5cf6', width: 26, height: 26, fontSize: 11 }}>
                              {assignment.reviewer?.name?.charAt(0) || '?'}
                            </Avatar>
                          </Tooltip>
                        ))}
                        {currentAssignments.length > 1 && (
                          <Typography sx={{ fontSize: 10, color: 'text.secondary', ml: 0.5 }}>
                            ({currentAssignments.length})
                          </Typography>
                        )}
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
                      {canAssign && isActive && (
                        <Tooltip title={currentAssignments.length > 0 ? 'Add Another Reviewer' : 'Assign Reviewer'}>
                          <IconButton size="small" onClick={() => openAssign(p)}
                            sx={{ color: currentAssignments.length > 0 ? 'text.secondary' : '#f59e0b',
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

      {canAssign && (
        <AssignStageReviewerDialog
          open={!!assignTarget}
          proposal={assignTarget}
          stages={WORKFLOW_STAGES}
          currentStep={assignTarget?.review_step ?? 0}
          onClose={() => setAssignTarget(null)}
          onAssigned={async () => {
            setSuccess('Reviewer assigned successfully.');
            await loadProposals();
          }}
        />
      )}
    </Box>
  );
}
