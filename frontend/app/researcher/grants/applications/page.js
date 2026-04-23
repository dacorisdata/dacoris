'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme,
  Stepper, Step, StepLabel, StepConnector, stepConnectorClasses,
  Alert, Paper, Divider, LinearProgress, Avatar, AvatarGroup, Tooltip,
} from '@mui/material';
import {
  Send as SendIcon, Add as AddIcon, Refresh as RefreshIcon,
  CheckCircle as CheckIcon, EmojiEvents as AwardIcon,
  Cancel as DeclinedIcon, Undo as ReturnedIcon,
  HourglassEmpty as PendingIcon, OpenInNew as ViewIcon,
  Description as DocIcon, Groups as TeamIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../../../contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#16a699';

const PIPELINE_STAGES = [
  'Received',
  'Eligibility',
  'Technical',
  'Budget',
  'Panel',
  'Final Approval',
];

const STATUS_META = {
  draft:           { color: '#64748b', bg: '#64748b18', label: 'Draft',                icon: null },
  submitted:       { color: '#f59e0b', bg: '#f59e0b18', label: 'Submitted – Awaiting Review', icon: <PendingIcon sx={{ fontSize: 15 }} /> },
  internal_review: { color: '#3b82f6', bg: '#3b82f618', label: 'Eligibility Review',   icon: <PendingIcon sx={{ fontSize: 15 }} /> },
  under_review:    { color: '#8b5cf6', bg: '#8b5cf618', label: 'Under Review',         icon: <PendingIcon sx={{ fontSize: 15 }} /> },
  returned:        { color: '#f97316', bg: '#f9731618', label: 'Returned for Revision', icon: <ReturnedIcon sx={{ fontSize: 15 }} /> },
  awarded:         { color: '#10b981', bg: '#10b98118', label: 'Awarded',              icon: <AwardIcon sx={{ fontSize: 15 }} /> },
  declined:        { color: '#ef4444', bg: '#ef444418', label: 'Not Awarded',          icon: <DeclinedIcon sx={{ fontSize: 15 }} /> },
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function ProposalCard({ proposal, onView }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const meta = STATUS_META[proposal.status] || STATUS_META.draft;
  const step = proposal.review_step ?? 0;
  const isTerminal = ['awarded', 'declined'].includes(proposal.status);
  const isReturned = proposal.status === 'returned';
  const isDraft = proposal.status === 'draft';

  const sections = proposal.sections || [];
  const completedSections = sections.filter(s => (s.word_count || 0) > 50).length;
  const sectionPct = sections.length > 0 ? Math.round(completedSections / sections.length * 100) : 0;

  return (
    <Paper elevation={0} variant="outlined" sx={{
      borderRadius: 2.5,
      overflow: 'hidden',
      borderColor: isTerminal
        ? (proposal.status === 'awarded' ? '#10b98155' : '#ef444444')
        : isReturned ? '#f9731655' : 'divider',
      transition: 'box-shadow 0.15s',
      '&:hover': { boxShadow: dark ? 'none' : '0 4px 20px rgba(0,0,0,0.08)' },
    }}>
      {/* Status banner for terminal / returned */}
      {(isTerminal || isReturned) && (
        <Box sx={{
          px: 2.5, py: 1, display: 'flex', alignItems: 'center', gap: 1,
          bgcolor: proposal.status === 'awarded' ? '#ecfdf5' : isReturned ? '#fffbeb' : '#fef2f2',
          borderBottom: '1px solid',
          borderColor: proposal.status === 'awarded' ? '#6ee7b7' : isReturned ? '#fcd34d' : '#fca5a5',
        }}>
          {meta.icon}
          <Typography sx={{ fontSize: 12.5, fontWeight: 700,
            color: proposal.status === 'awarded' ? '#065f46' : isReturned ? '#92400e' : '#991b1b' }}>
            {proposal.status === 'awarded' && '🏆 Congratulations! Your proposal has been awarded.'}
            {proposal.status === 'declined' && '❌ Your proposal was not selected for funding.'}
            {isReturned && '↩ Your proposal has been returned for revision.'}
          </Typography>
        </Box>
      )}

      <Box sx={{ p: 2.5 }}>
        {/* Title row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, gap: 2 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 0.4, lineHeight: 1.35 }}>
              {proposal.title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                {proposal.opportunity?.sponsor || proposal.opportunity?.title || `Grant #${proposal.opportunity_id}`}
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>·</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                {isDraft ? `Created ${fmtDate(proposal.created_at)}` : `Submitted ${fmtDate(proposal.submitted_at)}`}
              </Typography>
            </Box>
          </Box>
          <Chip
            label={meta.label}
            size="small"
            sx={{ bgcolor: meta.bg, color: meta.color, fontWeight: 700, fontSize: 11, flexShrink: 0 }}
          />
        </Box>

        {/* Stage notes from admin */}
        {proposal.stage_notes && (
          <Box sx={{ mb: 1.5, p: 1.5, borderRadius: 1.5, bgcolor: '#fffbeb', border: '1px solid #fcd34d', fontSize: 12.5, color: '#92400e' }}>
            <strong>Admin note:</strong> {proposal.stage_notes}
          </Box>
        )}

        {/* Workflow stepper — only when in pipeline */}
        {!isDraft && !isTerminal && (
          <Box sx={{ my: 2 }}>
            {(() => {
              const STAGE_DAYS = [3, 7, 14, 7, 14, 7];
              const historyMap = {};
              (proposal.stage_history || []).forEach(h => { historyMap[h.stage_step] = h; });
              const assignMap = {};
              (proposal.stage_assignments || []).forEach(a => {
                if (!assignMap[a.stage_step] || a.status === 'active') assignMap[a.stage_step] = a;
              });
              const fmtShort = d => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

              return (
                <Stepper activeStep={step} alternativeLabel
                  connector={<StepConnector sx={{
                    [`&.${stepConnectorClasses.active} .${stepConnectorClasses.line}`]:    { borderColor: ACCENT },
                    [`&.${stepConnectorClasses.completed} .${stepConnectorClasses.line}`]: { borderColor: ACCENT },
                    [`& .${stepConnectorClasses.line}`]: { borderTopWidth: 2, borderColor: 'divider' },
                  }} />}
                  sx={{ px: 0 }}
                >
                  {PIPELINE_STAGES.map((label, i) => {
                    const h = historyMap[i];
                    const assignment = assignMap[i];
                    const reviewer = assignment?.reviewer;
                    const isStagePast = i < step;
                    const isStageActive = i === step;

                    let dateLabel = null;
                    let dateValue = null;
                    let dateColor = '#94a3b8';

                    if (isStagePast && h?.exited_at) {
                      dateLabel = 'Done';
                      dateValue = fmtShort(h.exited_at);
                    } else if ((isStageActive || isStagePast) && h?.entered_at) {
                      const intendedDays = h.intended_days ?? STAGE_DAYS[i] ?? 7;
                      const due = new Date(h.entered_at);
                      due.setDate(due.getDate() + intendedDays);
                      dateLabel = 'Due';
                      dateValue = fmtShort(due);
                      if (due < new Date() && !h?.exited_at) dateColor = '#ef4444';
                    }

                    return (
                      <Step key={label} completed={isStagePast}>
                        <StepLabel
                          optional={
                            <Box sx={{ textAlign: 'center', mt: 0.2 }}>
                              <Typography sx={{
                                fontSize: 9, lineHeight: 1.4,
                                color: reviewer ? '#8b5cf6' : '#94a3b8',
                                fontStyle: reviewer ? 'normal' : 'italic',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 70,
                              }}>
                                {reviewer ? reviewer.name : 'Unassigned'}
                              </Typography>
                              {dateValue && (
                                <Typography sx={{ fontSize: 9, color: dateColor, lineHeight: 1.4 }}>
                                  {dateLabel}: {dateValue}
                                </Typography>
                              )}
                            </Box>
                          }
                          sx={{
                            '& .MuiStepLabel-label': { fontSize: 10, mt: 0.3, fontWeight: isStageActive ? 700 : 400 },
                            '& .MuiStepIcon-root.Mui-active':    { color: ACCENT },
                            '& .MuiStepIcon-root.Mui-completed': { color: ACCENT },
                          }}>
                          {label}
                        </StepLabel>
                      </Step>
                    );
                  })}
                </Stepper>
              );
            })()}
            {proposal.review_stage_name && (
              <Typography sx={{ fontSize: 11.5, color: ACCENT, textAlign: 'center', mt: 1, fontWeight: 600 }}>
                Currently at: {proposal.review_stage_name}
              </Typography>
            )}
          </Box>
        )}

        {/* Stage History Timeline (compact) */}
        {!isDraft && (proposal.stage_history || []).length > 0 && (
          <Box sx={{ my: 1.5 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Stage History
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {(proposal.stage_history || []).map((h, i) => {
                const STAGE_DAYS = [3, 7, 14, 7, 14, 7];
                const intendedDays = h.intended_days ?? STAGE_DAYS[h.stage_step] ?? 7;
                const daysSpent = h.entered_at
                  ? Math.floor((new Date(h.exited_at || Date.now()) - new Date(h.entered_at)) / 86400000)
                  : null;
                const isOverdue = daysSpent != null && daysSpent > intendedDays;
                const isActive  = !h.exited_at;

                // Find reviewer for this stage
                const assignment = (proposal.stage_assignments || []).find(
                  a => a.status === 'active' && a.stage_step === h.stage_step
                );

                return (
                  <Box key={h.id} sx={{ display: 'flex', gap: 1.2 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14, flexShrink: 0 }}>
                      <Box sx={{
                        width: 10, height: 10, borderRadius: '50%', flexShrink: 0, mt: 0.3,
                        bgcolor: isOverdue ? '#ef4444' : isActive ? ACCENT : '#94a3b8',
                        boxShadow: isActive ? `0 0 0 2px ${ACCENT}44` : 'none',
                      }} />
                      {i < (proposal.stage_history || []).length - 1 && (
                        <Box sx={{ flex: 1, width: 1.5, bgcolor: 'divider', my: 0.2, minHeight: 12 }} />
                      )}
                    </Box>
                    <Box sx={{ flex: 1, pb: i < (proposal.stage_history || []).length - 1 ? 1.5 : 0 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography sx={{ fontSize: 11.5, fontWeight: isActive ? 700 : 500,
                          color: isActive ? 'text.primary' : 'text.secondary' }}>
                          {h.stage_name || `Stage ${h.stage_step}`}
                          {isActive && <Box component="span" sx={{ ml: 0.6, color: ACCENT, fontSize: 10, fontWeight: 700 }}>(Active)</Box>}
                        </Typography>
                        {daysSpent != null && (
                          <Typography sx={{ fontSize: 10, color: isOverdue ? '#ef4444' : 'text.disabled' }}>
                            {daysSpent}d / {intendedDays}d
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        {h.entered_at && (
                          <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
                            In: {new Date(h.entered_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </Typography>
                        )}
                        {h.exited_at && (
                          <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
                            Out: {new Date(h.exited_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </Typography>
                        )}
                        {isOverdue && (
                          <Typography sx={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>⚠ Overdue</Typography>
                        )}
                      </Box>
                      {assignment?.reviewer && (
                        <Typography sx={{ fontSize: 10, color: '#8b5cf6', mt: 0.2 }}>
                          Reviewer: {assignment.reviewer.name}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        {/* Draft completion bar */}
        {isDraft && sections.length > 0 && (
          <Box sx={{ my: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Sections completed</Typography>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: sectionPct === 100 ? '#10b981' : 'text.secondary' }}>
                {completedSections}/{sections.length}
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={sectionPct}
              sx={{ height: 5, borderRadius: 3, bgcolor: 'divider',
                '& .MuiLinearProgress-bar': { bgcolor: sectionPct === 100 ? '#10b981' : ACCENT } }} />
          </Box>
        )}

        <Divider sx={{ my: 1.5 }} />

        {/* Footer */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Team avatars */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: 11 } }}>
              <Tooltip title={`${proposal.lead_pi?.name || 'Lead PI'} (Lead PI)`}>
                <Avatar sx={{ bgcolor: ACCENT, width: 24, height: 24, fontSize: 11 }}>
                  {proposal.lead_pi?.name?.charAt(0) || 'L'}
                </Avatar>
              </Tooltip>
              {(proposal.collaborators || []).map((c, i) => (
                <Tooltip key={i} title={c.user?.name || c.invited_name || 'Collaborator'}>
                  <Avatar sx={{ bgcolor: '#8b5cf6', width: 24, height: 24, fontSize: 11, opacity: c.status === 'pending' ? 0.6 : 1 }}>
                    {(c.user?.name || c.invited_name || '?').charAt(0)}
                  </Avatar>
                </Tooltip>
              ))}
            </AvatarGroup>
            <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
              {1 + (proposal.collaborators?.length || 0)} member{(1 + (proposal.collaborators?.length || 0)) !== 1 ? 's' : ''}
            </Typography>
          </Box>

          {/* Action buttons */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" startIcon={<ViewIcon sx={{ fontSize: 13 }} />}
              onClick={() => onView(proposal.id)}
              sx={{ textTransform: 'none', fontSize: 12, borderRadius: 2, py: 0.5 }}>
              View
            </Button>
            {isDraft && (
              <Button size="small" variant="contained" startIcon={<SendIcon sx={{ fontSize: 13 }} />}
                onClick={() => onView(proposal.id)}
                sx={{ textTransform: 'none', fontSize: 12, borderRadius: 2, py: 0.5, bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}>
                Continue
              </Button>
            )}
            {isReturned && (
              <Button size="small" variant="contained" color="warning" startIcon={<SendIcon sx={{ fontSize: 13 }} />}
                onClick={() => onView(proposal.id)}
                sx={{ textTransform: 'none', fontSize: 12, borderRadius: 2, py: 0.5 }}>
                Revise & Resubmit
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}

export default function MyApplicationsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchUser().then(u => {
      if (!u) { router.push('/login'); return; }
      loadProposals();
    });
  }, []);

  const loadProposals = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/grants/proposals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProposals(res.data || []);
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
      } else {
        setError('Failed to load applications');
      }
    } finally {
      setLoading(false);
    }
  };

  const FILTERS = [
    { key: 'all',      label: 'All' },
    { key: 'draft',    label: 'Drafts' },
    { key: 'active',   label: 'In Review' },
    { key: 'returned', label: 'Returned' },
    { key: 'awarded',  label: 'Awarded' },
    { key: 'declined', label: 'Declined' },
  ];

  const filtered = proposals.filter(p => {
    if (filter === 'all')      return true;
    if (filter === 'draft')    return p.status === 'draft';
    if (filter === 'active')   return ['submitted','internal_review','under_review'].includes(p.status);
    if (filter === 'returned') return p.status === 'returned';
    if (filter === 'awarded')  return p.status === 'awarded';
    if (filter === 'declined') return p.status === 'declined';
    return true;
  });

  const counts = {
    all:      proposals.length,
    draft:    proposals.filter(p => p.status === 'draft').length,
    active:   proposals.filter(p => ['submitted','internal_review','under_review'].includes(p.status)).length,
    returned: proposals.filter(p => p.status === 'returned').length,
    awarded:  proposals.filter(p => p.status === 'awarded').length,
    declined: proposals.filter(p => p.status === 'declined').length,
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 800, mb: 0.4 }}>My Applications</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            Track your grant proposals through the full review pipeline
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" startIcon={<RefreshIcon sx={{ fontSize: 15 }} />}
            onClick={loadProposals} sx={{ textTransform: 'none', borderRadius: 2 }}>
            Refresh
          </Button>
          <Button size="small" variant="contained" startIcon={<AddIcon sx={{ fontSize: 15 }} />}
            onClick={() => router.push('/researcher/grants/proposals')}
            sx={{ textTransform: 'none', borderRadius: 2, bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}>
            New Proposal
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Summary stats */}
      {proposals.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 1.5, mb: 3 }}>
          {[
            { label: 'Total', count: counts.all,      color: '#64748b' },
            { label: 'In Review', count: counts.active,   color: ACCENT },
            { label: 'Returned', count: counts.returned, color: '#f97316' },
            { label: 'Awarded',  count: counts.awarded,  color: '#10b981' },
            { label: 'Drafts',   count: counts.draft,    color: '#94a3b8' },
          ].map(s => (
            <Paper key={s.label} elevation={0} variant="outlined" sx={{ p: 1.5, borderRadius: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{s.label}</Typography>
            </Paper>
          ))}
        </Box>
      )}

      {/* Filter tabs */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <Button key={f.key} size="small" onClick={() => setFilter(f.key)}
            variant={filter === f.key ? 'contained' : 'outlined'}
            sx={{
              textTransform: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, py: 0.5,
              ...(filter === f.key
                ? { bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' }, borderColor: ACCENT }
                : { borderColor: 'divider', color: 'text.secondary', '&:hover': { borderColor: ACCENT, color: ACCENT } }),
            }}>
            {f.label}
            {counts[f.key] > 0 && (
              <Chip label={counts[f.key]} size="small"
                sx={{ ml: 0.8, height: 16, fontSize: 10, fontWeight: 700,
                  bgcolor: filter === f.key ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.07)',
                  color: filter === f.key ? '#fff' : 'text.secondary' }} />
            )}
          </Button>
        ))}
      </Box>

      {/* Cards */}
      {filtered.length === 0 ? (
        <Paper elevation={0} variant="outlined" sx={{ p: 6, borderRadius: 3, textAlign: 'center' }}>
          <DocIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography sx={{ fontSize: 16, fontWeight: 600, mb: 0.5 }}>No applications found</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 3 }}>
            {filter === 'all'
              ? "You haven't started any proposals yet."
              : `No ${FILTERS.find(f => f.key === filter)?.label.toLowerCase()} applications.`}
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={() => router.push('/researcher/grants/discover')}
            sx={{ textTransform: 'none', bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' }, borderRadius: 2 }}>
            Discover Grant Opportunities
          </Button>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {filtered.map(p => (
            <ProposalCard
              key={p.id}
              proposal={p}
              onView={id => router.push(`/researcher/grants/proposals/${id}`)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
