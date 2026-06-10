'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip, Paper,
  Stepper, Step, StepLabel, StepConnector, stepConnectorClasses,
  Avatar, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Tooltip, LinearProgress, useTheme, Collapse,
  List, ListItem, ListItemText, ListItemAvatar, Badge, Tab, Tabs,
  Checkbox, FormControlLabel, Radio, RadioGroup, FormControl, FormLabel,
} from '@mui/material';
import {
  ArrowBack as BackIcon, CheckCircle as CheckIcon,
  ArrowForward as AdvanceIcon, Undo as ReturnIcon,
  Cancel as DeclineIcon, Description as DocIcon,
  RadioButtonUnchecked as PendingIcon, ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon, Comment as CommentIcon, Send as SendIcon,
  Visibility as PreviewIcon, OpenInNew as OpenIcon,
  AttachMoney as MoneyIcon, CalendarToday as CalIcon,
  Business as OrgIcon, VerifiedUser as EligIcon,
  Assignment as AssignIcon, Close as CloseIcon,
  HourglassEmpty as WaitIcon, EmojiEvents as AwardIcon2,
  PersonPin as PIIcon, Groups as TeamIcon,
  Schedule as ClockIcon, Warning as WarnIcon, Error as OverdueIcon,
  PersonAdd as ReviewerIcon, AccessTime as DurationIcon,
  FiberManualRecord as DotIcon, AddCircle as AddIcon, RemoveCircle as RemoveIcon,
} from '@mui/icons-material';
import api from '../../../../../lib/api';
import { useAuth } from '../../../../../contexts/AuthContext';

const ACCENT = '#16a699';

const WORKFLOW_STEPS = [
  { step: 0, label: 'Received',       desc: 'Submitted & intake' },
  { step: 1, label: 'Eligibility',    desc: 'Step 1/5: Eligibility check' },
  { step: 2, label: 'Technical',      desc: 'Step 2/5: Expert review' },
  { step: 3, label: 'Budget',         desc: 'Step 3/5: Finance review' },
  { step: 4, label: 'Panel',          desc: 'Step 4/5: Panel decision' },
  { step: 5, label: 'Final Approval', desc: 'Step 5/5: Institutional sign-off' },
];

const STATUS_COLORS = {
  draft:           { bg: '#94a3b822', color: '#94a3b8', label: 'Draft' },
  submitted:       { bg: '#f59e0b22', color: '#f59e0b', label: 'Submitted' },
  internal_review: { bg: '#3b82f622', color: '#3b82f6', label: 'Eligibility Review' },
  under_review:    { bg: '#8b5cf622', color: '#8b5cf6', label: 'Under Review' },
  returned:        { bg: '#ef444422', color: '#ef4444', label: 'Returned for Revision' },
  awarded:         { bg: '#10b98122', color: '#10b981', label: 'Awarded' },
  declined:        { bg: '#ef444422', color: '#ef4444', label: 'Declined' },
};

const fmt = v => v ? new Intl.NumberFormat().format(v) : null;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/* ── Expandable section with content viewer + comment box ── */
function SectionRow({ section, proposalId, dark }) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [sending, setSending] = useState(false);
  const hasContent = (section.word_count || 0) > 50;

  const submitComment = async () => {
    if (!comment.trim()) return;
    setSending(true);
    try {
      // Store locally for now (backend comment endpoint can be added later)
      setComments(prev => [...prev, { text: comment.trim(), time: new Date() }]);
      setComment('');
    } finally {
      setSending(false);
    }
  };

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', mb: 1.5 }}>
      {/* Row header */}
      <Box
        onClick={() => setOpen(o => !o)}
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2, py: 1.5, cursor: 'pointer',
          bgcolor: open ? (dark ? 'rgba(22,166,153,0.08)' : 'rgba(22,166,153,0.05)') : 'transparent',
          '&:hover': { bgcolor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {hasContent
            ? <CheckIcon sx={{ fontSize: 17, color: ACCENT }} />
            : <PendingIcon sx={{ fontSize: 17, color: 'text.disabled' }} />}
          <Box>
            <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{section.title}</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{section.word_count || 0} words</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {comments.length > 0 && (
            <Chip label={`${comments.length} note${comments.length > 1 ? 's' : ''}`} size="small"
              sx={{ height: 20, fontSize: 10, bgcolor: '#f59e0b22', color: '#f59e0b' }} />
          )}
          {open ? <CollapseIcon sx={{ fontSize: 18, color: 'text.secondary' }} /> : <ExpandIcon sx={{ fontSize: 18, color: 'text.secondary' }} />}
        </Box>
      </Box>

      {/* Expanded content */}
      <Collapse in={open}>
        <Divider />
        {/* Section HTML content */}
        {section.content_html ? (
          <Box sx={{ px: 3, py: 2.5, fontSize: 13.5, lineHeight: 1.75, color: 'text.primary',
            '& p': { mb: 1 }, '& h1,h2,h3': { fontWeight: 700, mb: 1 },
            '& ul,ol': { pl: 2.5 }, '& li': { mb: 0.4 },
            '& strong': { fontWeight: 700 },
          }}
            dangerouslySetInnerHTML={{ __html: section.content_html }}
          />
        ) : (
          <Box sx={{ px: 3, py: 3, textAlign: 'center', color: 'text.disabled', fontSize: 13 }}>
            No content written yet.
          </Box>
        )}

        {/* Reviewer notes / comments */}
        <Divider />
        <Box sx={{ px: 3, py: 2, bgcolor: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CommentIcon sx={{ fontSize: 14 }} /> Reviewer Notes
          </Typography>
          {comments.map((c, i) => (
            <Box key={i} sx={{ mb: 1, p: 1.5, borderRadius: 1.5, bgcolor: dark ? 'rgba(22,166,153,0.1)' : '#f0fdf9', border: '1px solid', borderColor: ACCENT + '33' }}>
              <Typography sx={{ fontSize: 13 }}>{c.text}</Typography>
              <Typography sx={{ fontSize: 10, color: 'text.disabled', mt: 0.3 }}>{c.time.toLocaleTimeString()}</Typography>
            </Box>
          ))}
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <TextField
              fullWidth size="small" placeholder="Leave a note on this section…"
              value={comment} onChange={e => setComment(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: 13 } }}
            />
            <IconButton onClick={submitComment} disabled={!comment.trim() || sending}
              sx={{ bgcolor: ACCENT, color: '#fff', borderRadius: 2, '&:hover': { bgcolor: '#14958a' }, '&:disabled': { bgcolor: 'action.disabledBackground' } }}>
              <SendIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}

/* ── Document row with preview (blob fetch to carry auth header) ── */
function DocRow({ doc, proposalId, dark }) {
  const [previewing, setPreviewing] = useState(false);
  const [blobUrl, setBlobUrl]       = useState(null);
  const [loadingBlob, setLoadingBlob] = useState(false);
  const isPdf = doc.mime_type === 'application/pdf' || doc.original_filename?.endsWith('.pdf');
  const isImage = doc.mime_type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.original_filename || '');

  const openPreview = async () => {
    if (blobUrl) { setPreviewing(true); return; }
    setLoadingBlob(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const resp = await fetch(`/api/grants/proposals/${proposalId}/documents/${doc.id}/preview`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
      setPreviewing(true);
    } catch (e) {
      console.error('Preview failed', e);
    } finally {
      setLoadingBlob(false);
    }
  };

  const docTypeLabel = (doc.document_type || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const fileSize = doc.file_size_bytes ? `${Math.round(doc.file_size_bytes / 1024)} KB` : '';

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 2, py: 1.5, borderRadius: 2, mb: 1,
        border: '1px solid', borderColor: 'divider',
        '&:hover': { borderColor: ACCENT + '66', bgcolor: dark ? 'rgba(22,166,153,0.05)' : 'rgba(22,166,153,0.03)' },
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: ACCENT + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DocIcon sx={{ fontSize: 18, color: ACCENT }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{doc.original_filename || 'Document'}</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{docTypeLabel}{fileSize ? ` · ${fileSize}` : ''}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {(isPdf || isImage) && (
            <Tooltip title="Preview">
              <IconButton size="small" onClick={openPreview} disabled={loadingBlob}
                sx={{ color: ACCENT, '&:hover': { bgcolor: ACCENT + '18' } }}>
                {loadingBlob ? <CircularProgress size={13} sx={{ color: ACCENT }} /> : <PreviewIcon sx={{ fontSize: 17 }} />}
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Preview modal */}
      <Dialog open={previewing} onClose={() => setPreviewing(false)} maxWidth="lg" fullWidth
        PaperProps={{ sx: { borderRadius: 3, height: '90vh' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{doc.original_filename}</Typography>
          <IconButton size="small" onClick={() => setPreviewing(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
          {blobUrl && isPdf && (
            <iframe src={blobUrl} title="Document Preview" width="100%" height="100%"
              style={{ border: 'none', display: 'block' }} />
          )}
          {blobUrl && isImage && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 2 }}>
              <img src={blobUrl} alt={doc.original_filename} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

const STAGE_INTENDED_DAYS = [3, 7, 14, 7, 14, 7];

/* ── Stage Timeline Card ── */
function StageTimeline({ stageHistory, stageAssignments, currentStep, isTerminal }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const STAGES = [
    { step: 0, label: 'Received',       days: 3  },
    { step: 1, label: 'Eligibility',    days: 7  },
    { step: 2, label: 'Technical',      days: 14 },
    { step: 3, label: 'Budget',         days: 7  },
    { step: 4, label: 'Panel',          days: 14 },
    { step: 5, label: 'Final Approval', days: 7  },
  ];

  const historyMap = {};
  (stageHistory || []).forEach(h => { historyMap[h.stage_step] = h; });
  const assignMap = {};
  (stageAssignments || []).filter(a => a.status === 'active').forEach(a => { assignMap[a.stage_step] = a; });

  const dateDiff = (start, end) => {
    if (!start) return null;
    const d = Math.floor((new Date(end || Date.now()) - new Date(start)) / 86400000);
    return d;
  };

  return (
    <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
        <ClockIcon sx={{ fontSize: 17, color: ACCENT }} />
        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Stage Timeline</Typography>
      </Box>

      <Box>
        {STAGES.map((stage, idx) => {
          const h = historyMap[stage.step];
          const assignment = assignMap[stage.step];
          const isActive  = !isTerminal && stage.step === currentStep;
          const isPast    = isTerminal ? stage.step <= currentStep : stage.step < currentStep;
          const isFuture  = !isPast && !isActive;

          let daysSpent = null;
          let isOverdue = false;
          let isNearDue = false;

          if (h) {
            daysSpent = dateDiff(h.entered_at, h.exited_at);
            const limit = h.intended_days ?? stage.days;
            if (h.exited_at) {
              isOverdue = daysSpent > limit;
            } else {
              isOverdue = daysSpent > limit;
              isNearDue = !isOverdue && daysSpent > limit * 0.8;
            }
          }

          const dotColor = isOverdue ? '#ef4444' : isNearDue ? '#f59e0b' : isPast ? ACCENT : isActive ? ACCENT : '#d1d5db';

          return (
            <Box key={stage.step} sx={{ display: 'flex', gap: 1.5, mb: idx < STAGES.length - 1 ? 0 : undefined }}>
              {/* Connector column */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 18, flexShrink: 0 }}>
                <Box sx={{
                  width: 12, height: 12, borderRadius: '50%', flexShrink: 0, mt: 0.3,
                  bgcolor: dotColor,
                  border: isActive ? `2px solid ${ACCENT}` : 'none',
                  boxShadow: isActive ? `0 0 0 3px ${ACCENT}33` : 'none',
                }} />
                {idx < STAGES.length - 1 && (
                  <Box sx={{ flex: 1, width: 2, bgcolor: isPast ? ACCENT + '55' : 'divider', my: 0.3 }} />
                )}
              </Box>

              {/* Content */}
              <Box sx={{ flex: 1, pb: idx < STAGES.length - 1 ? 2.5 : 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography sx={{
                    fontSize: 12.5, fontWeight: isActive ? 800 : 600,
                    color: isFuture ? 'text.disabled' : 'text.primary',
                  }}>
                    {stage.label}
                    {isActive && (
                      <Chip label="Active" size="small"
                        sx={{ ml: 0.8, height: 16, fontSize: 9, bgcolor: ACCENT + '22', color: ACCENT, fontWeight: 700 }} />
                    )}
                    {isOverdue && (
                      <Chip label="Overdue" size="small"
                        sx={{ ml: 0.8, height: 16, fontSize: 9, bgcolor: '#fef2f2', color: '#ef4444', fontWeight: 700 }} />
                    )}
                    {isNearDue && (
                      <Chip label="Due soon" size="small"
                        sx={{ ml: 0.8, height: 16, fontSize: 9, bgcolor: '#fffbeb', color: '#f59e0b', fontWeight: 700 }} />
                    )}
                  </Typography>
                  {h && (
                    <Typography sx={{ fontSize: 10, color: isOverdue ? '#ef4444' : 'text.disabled', flexShrink: 0, ml: 0.5 }}>
                      {daysSpent != null ? `${daysSpent}d / ${h.intended_days ?? stage.days}d` : `~${stage.days}d`}
                    </Typography>
                  )}
                  {!h && !isFuture && (
                    <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>~{stage.days}d</Typography>
                  )}
                </Box>

                {/* Dates */}
                {h && (
                  <Box sx={{ display: 'flex', gap: 2, mt: 0.3, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                      In: {new Date(h.entered_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </Typography>
                    {h.exited_at ? (
                      <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                        Out: {new Date(h.exited_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </Typography>
                    ) : isActive ? (
                      <Typography sx={{ fontSize: 10.5, color: ACCENT }}>In progress</Typography>
                    ) : null}
                  </Box>
                )}

                {/* Reviewer */}
                {assignment && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.5 }}>
                    <Avatar sx={{ width: 18, height: 18, fontSize: 9, bgcolor: '#8b5cf6', flexShrink: 0 }}>
                      {assignment.reviewer?.name?.charAt(0) || '?'}
                    </Avatar>
                    <Typography sx={{ fontSize: 10.5, color: '#8b5cf6', fontWeight: 600 }}>
                      {assignment.reviewer?.name || 'Reviewer'}
                    </Typography>
                  </Box>
                )}
                {!assignment && isActive && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                    <Typography sx={{ fontSize: 10.5, color: '#f59e0b', fontWeight: 600 }}>No reviewer assigned</Typography>
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

export default function AdminProposalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [proposal, setProposal] = useState(null);
  const [workflow, setWorkflow] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState(0); // 0=Sections, 1=Documents

  // Action dialog
  const [actionDialog, setActionDialog] = useState(null);
  const [actionNotes, setActionNotes] = useState('');
  const [acting, setActing] = useState(false);

  // Inline reviewer assignment
  const [assignOpen, setAssignOpen]       = useState(false);
  const [reviewers, setReviewers]         = useState([]);
  const [reviewersLoading, setRvLoading]  = useState(false);
  const [selReviewer, setSelReviewer]     = useState(null);
  const [assignNotes, setAssignNotes]     = useState('');
  const [assigning, setAssigning]         = useState(false);
  const [selectedStages, setSelectedStages] = useState([]);
  const [useNewReviewer, setUseNewReviewer] = useState(false);
  const [newReviewerEmail, setNewReviewerEmail] = useState('');
  const [newReviewerName, setNewReviewerName] = useState('');
  const [newReviewerExpertise, setNewReviewerExpertise] = useState(['']);

  useEffect(() => {
    fetchUser().then(u => {
      if (!u) { router.push('/login'); return; }
      loadAll();
    });
  }, [params.id]);

  const loadReviewers = async () => {
    if (reviewers.length) return;
    setRvLoading(true);
    try {
      const r = await api.get('/grants/proposals/reviewers/available');
      setReviewers(r.data || []);
    } catch { setReviewers([]); }
    finally { setRvLoading(false); }
  };

  const openAssignDialog = async () => {
    setSelReviewer(null);
    setAssignNotes('');
    setSelectedStages([currentStep]);
    setUseNewReviewer(false);
    setNewReviewerEmail('');
    setNewReviewerName('');
    setNewReviewerExpertise(['']);
    setAssignOpen(true);
    await loadReviewers();
  };

  const handleAssign = async () => {
    if (!useNewReviewer && !selReviewer) return;
    if (useNewReviewer && !newReviewerEmail) return;
    if (selectedStages.length === 0) return;
    
    setAssigning(true);
    try {
      const payload = {
        stage_steps: selectedStages,
        notes: assignNotes || undefined,
      };
      
      if (useNewReviewer) {
        payload.new_reviewer_email = newReviewerEmail;
        payload.new_reviewer_name = newReviewerName || undefined;
        payload.new_reviewer_expertise = newReviewerExpertise.filter(e => e.trim());
      } else {
        payload.reviewer_id = selReviewer.id;
      }
      
      const response = await api.post(`/grants/proposals/${params.id}/stage-reviewers`, payload);
      const stagesText = selectedStages.map(s => WORKFLOW_STEPS[s]?.label).join(', ');
      const reviewerName = response.data.reviewer_name;
      setSuccess(`${reviewerName} assigned to stage(s): ${stagesText}${response.data.is_new_reviewer ? ' (invitation email sent)' : ''}`);
      setAssignOpen(false);
      await loadAll();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to assign reviewer');
    } finally { setAssigning(false); }
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      const [pRes, wRes] = await Promise.all([
        api.get(`/grants/proposals/${params.id}`),
        api.get(`/grants/proposals/${params.id}/workflow`),
      ]);
      setProposal(pRes.data);
      setWorkflow(wRes.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load proposal');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!actionDialog) return;
    try {
      setActing(true);
      await api.post(`/grants/proposals/${params.id}/workflow/advance`, {
        action: actionDialog,
        notes: actionNotes || undefined,
      });
      setSuccess(`Proposal ${actionDialog === 'advance' ? 'advanced' : actionDialog === 'return' ? 'returned' : 'declined'} successfully.`);
      setActionDialog(null);
      setActionNotes('');
      await loadAll();
    } catch (e) {
      setError(e.response?.data?.detail || `Failed to ${actionDialog} proposal`);
    } finally {
      setActing(false);
    }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress />
    </Box>
  );
  if (!proposal) return null;

  const currentStep = workflow?.review_step ?? 0;
  const isTerminal = ['awarded', 'declined'].includes(proposal.status);
  const isSubmitted = proposal.status !== 'draft';
  const sm = STATUS_COLORS[proposal.status] || STATUS_COLORS.draft;
  const opp = proposal.opportunity || {};

  // Check if current stage has an active reviewer
  const currentStageAssignment = (proposal.stage_assignments || []).find(
    a => a.status === 'active' && a.stage_step === currentStep
  );
  // Stage 0 (Received) doesn't require a reviewer to advance — just intake
  const requiresReviewer = currentStep > 0;
  const reviewerMissing  = requiresReviewer && !currentStageAssignment;

  const canAdvance = isSubmitted && !isTerminal;
  const canReturn  = isSubmitted && !isTerminal && proposal.status !== 'returned';
  const canDecline = isSubmitted && !isTerminal;

  const sectionsDone = (proposal.sections || []).filter(s => (s.word_count || 0) > 50).length;
  const sectionsTotal = (proposal.sections || []).length;
  const sectionPct = sectionsTotal > 0 ? Math.round(sectionsDone / sectionsTotal * 100) : 0;

  const nextStep = WORKFLOW_STEPS[Math.min(currentStep + 1, 5)];

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Back nav */}
      <Button startIcon={<BackIcon />} onClick={() => router.push('/admin-staff/grants/proposals')}
        sx={{ mb: 2.5, color: 'text.secondary', textTransform: 'none', fontWeight: 500 }}>
        Back to All Proposals
      </Button>

      {error   && <Alert severity="error"   sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* ── HEADER CARD ─────────────────────────────────────── */}
      <Paper elevation={0} variant="outlined" sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 21, fontWeight: 800, lineHeight: 1.3, mb: 1 }}>
              {proposal.title}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
              <Chip label={sm.label} size="small" sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 700, fontSize: 11 }} />
              {proposal.review_stage_name && !isTerminal && (
                <Chip label={proposal.review_stage_name} size="small" variant="outlined" sx={{ fontSize: 11 }} />
              )}
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                Submitted {fmtDate(proposal.submitted_at)}
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>·</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                Created {fmtDate(proposal.created_at)}
              </Typography>
            </Box>
            {proposal.stage_notes && (
              <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#fff8e1', borderRadius: 1.5, border: '1px solid #f59e0b44', fontSize: 12.5, color: '#92400e' }}>
                <strong>⚠️ Reviewer Note:</strong> {proposal.stage_notes}
              </Box>
            )}
          </Box>

          {/* Action buttons */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {canReturn && (
              <Button variant="outlined" color="warning" startIcon={<ReturnIcon />}
                onClick={() => setActionDialog('return')} sx={{ textTransform: 'none', fontWeight: 600 }}>
                Return
              </Button>
            )}
            {canDecline && (
              <Button variant="outlined" color="error" startIcon={<DeclineIcon />}
                onClick={() => setActionDialog('decline')} sx={{ textTransform: 'none', fontWeight: 600 }}>
                Decline
              </Button>
            )}
            {isTerminal && (
              <Chip
                label={proposal.status === 'awarded' ? '🏆 Awarded' : '❌ Declined'}
                sx={{ fontWeight: 700, fontSize: 13,
                  bgcolor: proposal.status === 'awarded' ? '#10b98122' : '#ef444422',
                  color:  proposal.status === 'awarded' ? '#10b981'   : '#ef4444' }}
              />
            )}
          </Box>
        </Box>
      </Paper>

      {/* ── AWARD AMOUNT NOT SET ALERT ───────────────────────── */}
      {proposal.status === 'awarded' && !proposal.award && (
        <Alert
          severity="success"
          icon={<AwardIcon2 />}
          sx={{ mb: 3, borderRadius: 2.5, bgcolor: '#10b98111', border: '1px solid #10b98144', '& .MuiAlert-message': { width: '100%' } }}
          action={
            <Button size="small" variant="contained"
              onClick={() => router.push(`/admin-staff/grants/awards/issue?proposal_id=${params.id}`)}
              sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' }, textTransform: 'none', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', ml: 1 }}>
              Set Award Amount
            </Button>
          }
        >
          <strong>Proposal marked as Awarded.</strong>
          {' '}No award amount has been recorded yet. Set the award amount so the researcher can see it.
        </Alert>
      )}

      {/* ── REVIEWER MISSING ALERT ───────────────────────────── */}
      {reviewerMissing && (
        <Alert
          severity="warning"
          sx={{ mb: 3, borderRadius: 2.5, '& .MuiAlert-message': { width: '100%' } }}
          action={
            <Button size="small" variant="contained" startIcon={<ReviewerIcon sx={{ fontSize: 14 }} />}
              onClick={openAssignDialog}
              sx={{ bgcolor: '#f59e0b', '&:hover': { bgcolor: '#d97706' }, textTransform: 'none', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', ml: 1 }}>
              Assign Now
            </Button>
          }
        >
          <strong>Reviewer required before advancing.</strong>
          {' '}No reviewer has been assigned to the <strong>{WORKFLOW_STEPS[currentStep]?.label}</strong> stage.
          Assign a reviewer to unlock stage progression.
        </Alert>
      )}

      {/* ── REVIEW PIPELINE STEPPER ─────────────────────────── */}
      {isSubmitted && (
        <Paper elevation={0} variant="outlined" sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Review Pipeline</Typography>
            {!isTerminal && (
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                Stage {currentStep + 1} of {WORKFLOW_STEPS.length}
              </Typography>
            )}
          </Box>
          <Stepper activeStep={currentStep} alternativeLabel
            connector={<StepConnector sx={{
              [`&.${stepConnectorClasses.active} .${stepConnectorClasses.line}`]:    { borderColor: ACCENT },
              [`&.${stepConnectorClasses.completed} .${stepConnectorClasses.line}`]: { borderColor: ACCENT },
              [`& .${stepConnectorClasses.line}`]: { borderTopWidth: 2, borderColor: 'divider' },
            }} />}
          >
            {WORKFLOW_STEPS.map((s, i) => (
              <Step key={s.step} completed={!isTerminal && i < currentStep}>
                <StepLabel
                  sx={{
                    '& .MuiStepLabel-label': { fontSize: 11, mt: 0.5, fontWeight: i === currentStep ? 700 : 400 },
                    '& .MuiStepIcon-root.Mui-active':    { color: ACCENT },
                    '& .MuiStepIcon-root.Mui-completed': { color: ACCENT },
                  }}
                >
                  <Box>
                    <Box sx={{ fontWeight: i === currentStep ? 700 : 400 }}>{s.label}</Box>
                    <Box sx={{ fontSize: 9.5, color: i === currentStep ? ACCENT : 'text.disabled', lineHeight: 1.2, mt: 0.3 }}>{s.desc}</Box>
                  </Box>
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* What happens next hint */}
          {!isTerminal && (
            <Box sx={{ mt: 2.5, p: 1.5, borderRadius: 2, bgcolor: dark ? 'rgba(22,166,153,0.07)' : 'rgba(22,166,153,0.06)', border: '1px solid', borderColor: ACCENT + '33', display: 'flex', alignItems: 'center', gap: 1 }}>
              <WaitIcon sx={{ fontSize: 16, color: ACCENT }} />
              <Typography sx={{ fontSize: 12, color: ACCENT }}>
                <strong>Current stage:</strong> {WORKFLOW_STEPS[currentStep]?.desc}.
                {currentStep < 5 && ` Next: ${nextStep?.desc}.`}
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* ── MAIN BODY: two columns ────────────────────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 340px' }, gap: 3, alignItems: 'start' }}>

        {/* LEFT column */}
        <Box>
          {/* Sections + Docs tabbed panel */}
          <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, mb: 3, overflow: 'hidden' }}>
            <Box sx={{ px: 3, pt: 3, pb: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography sx={{ fontSize: 15, fontWeight: 700 }}>Proposal Content</Typography>
                <Chip label={`${sectionsDone}/${sectionsTotal} sections complete`} size="small"
                  sx={{ bgcolor: sectionPct === 100 ? '#10b98122' : '#f59e0b22', color: sectionPct === 100 ? '#10b981' : '#f59e0b', fontWeight: 600, fontSize: 11 }} />
              </Box>
              <LinearProgress variant="determinate" value={sectionPct}
                sx={{ height: 5, borderRadius: 3, mb: 2, bgcolor: 'divider',
                  '& .MuiLinearProgress-bar': { bgcolor: sectionPct === 100 ? '#10b981' : ACCENT } }} />
              <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
                borderBottom: '1px solid', borderColor: 'divider',
                '& .MuiTab-root': { textTransform: 'none', fontSize: 13, fontWeight: 600, minWidth: 100 },
                '& .Mui-selected': { color: ACCENT },
                '& .MuiTabs-indicator': { bgcolor: ACCENT },
              }}>
                <Tab label={`Sections (${sectionsTotal})`} />
                <Tab label={`Documents (${(proposal.documents || []).length})`} />
              </Tabs>
            </Box>

            <Box sx={{ p: 3 }}>
              {/* Sections tab */}
              {tab === 0 && (
                <Box>
                  {(proposal.sections || []).length === 0 ? (
                    <Typography sx={{ fontSize: 13, color: 'text.disabled', textAlign: 'center', py: 4 }}>
                      No sections found.
                    </Typography>
                  ) : (
                    (proposal.sections || []).map(s => (
                      <SectionRow key={s.id} section={s} proposalId={params.id} dark={dark} />
                    ))
                  )}
                </Box>
              )}

              {/* Documents tab */}
              {tab === 1 && (
                <Box>
                  {(proposal.documents || []).length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 5 }}>
                      <DocIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                      <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>No documents uploaded.</Typography>
                    </Box>
                  ) : (
                    (proposal.documents || []).map(d => (
                      <DocRow key={d.id} doc={d} proposalId={params.id} dark={dark} />
                    ))
                  )}
                </Box>
              )}
            </Box>
          </Paper>
        </Box>

        {/* RIGHT column */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

          {/* Stage Timeline */}
          {isSubmitted && (
            <Box>
              <StageTimeline
                stageHistory={proposal.stage_history || []}
                stageAssignments={proposal.stage_assignments || []}
                currentStep={currentStep}
                isTerminal={isTerminal}
              />
              {!isTerminal && (
                <Button
                  fullWidth size="small" variant="outlined" startIcon={<ReviewerIcon sx={{ fontSize: 14 }} />}
                  onClick={() => router.push(`/admin-staff/grants/proposals?assign=${params.id}`)}
                  sx={{ mt: 1, textTransform: 'none', fontSize: 12, borderRadius: 2, borderColor: '#8b5cf644', color: '#8b5cf6',
                    '&:hover': { borderColor: '#8b5cf6', bgcolor: '#8b5cf611' } }}>
                  Manage Reviewer Assignments
                </Button>
              )}
            </Box>
          )}

          {/* Award Details — shown when awarded */}
          {proposal.status === 'awarded' && proposal.award && (
            <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3, borderColor: '#10b98155', bgcolor: dark ? 'rgba(16,185,129,0.05)' : 'rgba(16,185,129,0.03)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AwardIcon2 sx={{ fontSize: 17, color: '#10b981' }} />
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>Award Issued</Typography>
                <Chip label={proposal.award.award_number || `AWD-${proposal.award.id}`} size="small"
                  sx={{ ml: 'auto', bgcolor: '#10b98122', color: '#10b981', fontWeight: 700, fontSize: 10 }} />
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 1.5 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: dark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.08)' }}>
                  <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Total Award</Typography>
                  <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#10b981' }}>
                    {proposal.award.currency} {new Intl.NumberFormat().format(proposal.award.total_amount)}
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: dark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.08)' }}>
                  <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Date Issued</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{fmtDate(proposal.award.issued_at)}</Typography>
                </Box>
              </Box>
              {proposal.award.funder_name && (
                <Box sx={{ mb: 1 }}>
                  <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Funder</Typography>
                  <Typography sx={{ fontSize: 13 }}>{proposal.award.funder_name}</Typography>
                </Box>
              )}
              {(proposal.award.start_date || proposal.award.end_date) && (
                <Box sx={{ mb: 1 }}>
                  <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Period</Typography>
                  <Typography sx={{ fontSize: 13 }}>
                    {fmtDate(proposal.award.start_date)} → {fmtDate(proposal.award.end_date)}
                  </Typography>
                </Box>
              )}
              {proposal.award.conditions && (
                <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 1.5, bgcolor: '#fff8e1', border: '1px solid #f59e0b44' }}>
                  <Typography sx={{ fontSize: 10, color: '#92400e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.5 }}>Conditions</Typography>
                  <Typography sx={{ fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>{proposal.award.conditions}</Typography>
                </Box>
              )}
              <Button
                fullWidth size="small" variant="outlined"
                onClick={() => router.push(`/admin-staff/grants/awards`)}
                sx={{ mt: 2, textTransform: 'none', fontSize: 12, borderRadius: 2, borderColor: '#10b98144', color: '#10b981', '&:hover': { borderColor: '#10b981', bgcolor: '#10b98111' } }}>
                View in Awards Manager
              </Button>
            </Paper>
          )}

          {/* Research Team */}
          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TeamIcon sx={{ fontSize: 17, color: ACCENT }} />
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Research Team</Typography>
            </Box>
            {/* Lead PI */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, p: 1.5, borderRadius: 2, bgcolor: dark ? 'rgba(22,166,153,0.07)' : 'rgba(22,166,153,0.05)', border: '1px solid', borderColor: ACCENT + '33' }}>
              <Avatar sx={{ bgcolor: ACCENT, width: 38, height: 38, fontSize: 15, fontWeight: 700 }}>
                {proposal.lead_pi?.name?.charAt(0) || 'L'}
              </Avatar>
              <Box>
                <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{proposal.lead_pi?.name || 'Lead PI'}</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{proposal.lead_pi?.email || ''}</Typography>
                <Chip label="Lead PI" size="small" sx={{ height: 17, fontSize: 10, mt: 0.3, bgcolor: ACCENT + '22', color: ACCENT, fontWeight: 700 }} />
              </Box>
            </Box>
            {(proposal.collaborators || []).map((c, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, opacity: c.status === 'pending' ? 0.65 : 1 }}>
                <Avatar sx={{ bgcolor: '#8b5cf6', width: 32, height: 32, fontSize: 12 }}>
                  {c.user?.name?.charAt(0) || c.invited_name?.charAt(0) || '?'}
                </Avatar>
                <Box>
                  <Typography sx={{ fontSize: 13 }}>{c.user?.name || c.invited_name || 'Pending'}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                    {(c.role || 'Co-Investigator').replace(/_/g, ' ')}
                    {c.status === 'pending' && ' · Invite pending'}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Paper>

          {/* Grant Opportunity details */}
          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            {/* Header row */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AssignIcon sx={{ fontSize: 17, color: ACCENT }} />
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Grant Opportunity</Typography>
              </Box>
              {opp.status && (
                <Chip
                  label={opp.status.charAt(0).toUpperCase() + opp.status.slice(1)}
                  size="small"
                  sx={{
                    fontWeight: 700, fontSize: 10.5,
                    bgcolor: opp.status === 'open' ? '#10b98122' : opp.status === 'closed' ? '#ef444422' : '#94a3b822',
                    color:   opp.status === 'open' ? '#10b981'   : opp.status === 'closed' ? '#ef4444'   : '#64748b',
                  }}
                />
              )}
            </Box>

            {!opp.title ? (
              /* Opportunity not loaded — show ID + loading hint */
              <Box sx={{ py: 3, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 13, color: ACCENT, fontWeight: 700, mb: 0.5 }}>
                  Opportunity #{proposal.opportunity_id}
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                  Opportunity details unavailable
                </Typography>
              </Box>
            ) : (
              <>
                {/* Title */}
                <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: ACCENT, lineHeight: 1.4, mb: 0.5, mt: 1 }}>
                  {opp.title}
                </Typography>
                {opp.is_curated && (
                  <Chip label="Published" size="small" sx={{ height: 18, fontSize: 10, bgcolor: '#10b98122', color: '#10b981', fontWeight: 700, mb: 1 }} />
                )}

                <Divider sx={{ my: 1.5 }} />

                {/* Organisation & sponsor type */}
                {(opp.sponsor || opp.sponsor_type) && (
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.2, mb: 1.5 }}>
                    <OrgIcon sx={{ fontSize: 14, color: 'text.disabled', mt: 0.2, flexShrink: 0 }} />
                    <Box>
                      <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Organisation</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{opp.sponsor}</Typography>
                      {opp.sponsor_type && (
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{opp.sponsor_type}</Typography>
                      )}
                    </Box>
                  </Box>
                )}

                {/* Funding range */}
                {(opp.amount_min || opp.amount_max) && (
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.2, mb: 1.5 }}>
                    <MoneyIcon sx={{ fontSize: 14, color: 'text.disabled', mt: 0.2, flexShrink: 0 }} />
                    <Box>
                      <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Funding Range</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                        {opp.currency || 'KES'}{' '}
                        {opp.amount_min && opp.amount_max
                          ? `${fmt(opp.amount_min)} – ${fmt(opp.amount_max)}`
                          : opp.amount_min ? `From ${fmt(opp.amount_min)}`
                          : `Up to ${fmt(opp.amount_max)}`}
                      </Typography>
                      {opp.funding_type && (
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{opp.funding_type}</Typography>
                      )}
                    </Box>
                  </Box>
                )}

                {/* Category & Geography row */}
                {(opp.category || opp.geography) && (
                  <Box sx={{ display: 'flex', gap: 2, mb: 1.5, flexWrap: 'wrap' }}>
                    {opp.category && (
                      <Box>
                        <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Category</Typography>
                        <Typography sx={{ fontSize: 12.5 }}>{opp.category}</Typography>
                      </Box>
                    )}
                    {opp.geography && (
                      <Box>
                        <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Geography</Typography>
                        <Typography sx={{ fontSize: 12.5 }}>{opp.geography}</Typography>
                      </Box>
                    )}
                  </Box>
                )}

                {/* Eligible applicants */}
                {(opp.applicant_type || opp.eligible_applicants) && (
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.2, mb: 1.5 }}>
                    <EligIcon sx={{ fontSize: 14, color: 'text.disabled', mt: 0.2, flexShrink: 0 }} />
                    <Box>
                      <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Eligible Applicants</Typography>
                      <Typography sx={{ fontSize: 12.5 }}>{opp.applicant_type || opp.eligible_applicants}</Typography>
                    </Box>
                  </Box>
                )}

                {/* Dates */}
                <Box sx={{ display: 'flex', gap: 2, mb: 1.5, flexWrap: 'wrap' }}>
                  {opp.open_date && (
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.8 }}>
                      <CalIcon sx={{ fontSize: 13, color: 'text.disabled', mt: 0.2, flexShrink: 0 }} />
                      <Box>
                        <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Opens</Typography>
                        <Typography sx={{ fontSize: 12.5 }}>{fmtDate(opp.open_date)}</Typography>
                      </Box>
                    </Box>
                  )}
                  {opp.deadline && (
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.8 }}>
                      <CalIcon sx={{ fontSize: 13,
                        color: new Date(opp.deadline) < new Date() ? '#ef4444' : 'text.disabled',
                        mt: 0.2, flexShrink: 0 }} />
                      <Box>
                        <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Deadline</Typography>
                        <Typography sx={{ fontSize: 12.5,
                          color: new Date(opp.deadline) < new Date() ? '#ef4444' : 'text.primary',
                          fontWeight: new Date(opp.deadline) < new Date() ? 700 : 400 }}>
                          {fmtDate(opp.deadline)}
                          {new Date(opp.deadline) < new Date() && (
                            <Box component="span" sx={{ ml: 0.5, fontSize: 10, color: '#ef4444' }}>Closed</Box>
                          )}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>

                {/* Description */}
                {opp.description && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.5 }}>Description</Typography>
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.6 }}>
                      {opp.description}
                    </Typography>
                  </>
                )}

                {/* Eligibility */}
                {opp.eligibility && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <EligIcon sx={{ fontSize: 14, color: 'text.disabled', mt: 0.2, flexShrink: 0 }} />
                      <Box>
                        <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.4 }}>Eligibility Criteria</Typography>
                        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.6 }}>{opp.eligibility}</Typography>
                      </Box>
                    </Box>
                  </>
                )}

                {/* Evaluation criteria */}
                {opp.criteria && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.4 }}>Evaluation Criteria</Typography>
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.6 }}>{opp.criteria}</Typography>
                  </>
                )}

                {/* Links & contact */}
                {(opp.application_url || opp.url || opp.contact_email) && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {(opp.application_url || opp.url) && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                          <OpenIcon sx={{ fontSize: 13, color: ACCENT }} />
                          <a
                            href={opp.application_url || opp.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 12, color: ACCENT, fontWeight: 600, textDecoration: 'none' }}
                          >
                            Apply / Learn more
                          </a>
                        </Box>
                      )}
                      {opp.contact_email && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                            Contact:{' '}
                            <a href={`mailto:${opp.contact_email}`} style={{ color: ACCENT }}>{opp.contact_email}</a>
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </>
                )}
              </>
            )}
          </Paper>
        </Box>
      </Box>

      {/* ── ASSIGN REVIEWER DIALOG ─────────────────────────────── */}
      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800, fontSize: 16 }}>
          Assign Reviewer
          <IconButton size="small" onClick={() => setAssignOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ mb: 2.5, p: 1.5, borderRadius: 2, bgcolor: dark ? 'rgba(22,166,153,0.08)' : 'rgba(22,166,153,0.05)', border: '1px solid', borderColor: ACCENT + '33' }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.3 }}>{proposal.title}</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
              Assign a reviewer to one or more review stages
            </Typography>
          </Box>

          {/* Stage Selection */}
          <Box sx={{ mb: 2.5 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 1.5 }}>
              Select Review Stage(s) *
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {WORKFLOW_STEPS.slice(1).map((stage) => (
                <FormControlLabel
                  key={stage.step}
                  control={
                    <Checkbox
                      checked={selectedStages.includes(stage.step)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStages([...selectedStages, stage.step]);
                        } else {
                          setSelectedStages(selectedStages.filter(s => s !== stage.step));
                        }
                      }}
                      sx={{ '&.Mui-checked': { color: ACCENT } }}
                    />
                  }
                  label={
                    <Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{stage.label}</Typography>
                      <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>~{[3,7,14,7,14,7][stage.step]}d</Typography>
                    </Box>
                  }
                  sx={{ 
                    m: 0, 
                    p: 1, 
                    borderRadius: 1.5, 
                    border: '1px solid', 
                    borderColor: selectedStages.includes(stage.step) ? ACCENT : 'divider',
                    bgcolor: selectedStages.includes(stage.step) ? (dark ? 'rgba(22,166,153,0.08)' : 'rgba(22,166,153,0.05)') : 'transparent',
                  }}
                />
              ))}
            </Box>
          </Box>

          <Divider sx={{ my: 2.5 }} />

          {/* Reviewer Selection Mode */}
          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <FormLabel sx={{ fontSize: 12, fontWeight: 700, color: 'text.primary', mb: 1 }}>
              Reviewer Selection *
            </FormLabel>
            <RadioGroup value={useNewReviewer ? 'new' : 'existing'} onChange={(e) => setUseNewReviewer(e.target.value === 'new')}>
              <FormControlLabel value="existing" control={<Radio sx={{ '&.Mui-checked': { color: ACCENT } }} />} 
                label={<Typography sx={{ fontSize: 13 }}>Select from existing reviewers</Typography>} />
              <FormControlLabel value="new" control={<Radio sx={{ '&.Mui-checked': { color: ACCENT } }} />} 
                label={<Typography sx={{ fontSize: 13 }}>Add new reviewer by email</Typography>} />
            </RadioGroup>
          </FormControl>

          {/* Existing Reviewer Selection */}
          {!useNewReviewer && (
            <Box sx={{ mb: 2.5 }}>
              {reviewersLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
              ) : reviewers.length === 0 ? (
                <Alert severity="info" sx={{ fontSize: 12 }}>
                  No existing reviewers found. You can add a new reviewer by email.
                </Alert>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 200, overflow: 'auto', p: 0.5 }}>
                  {reviewers.map(r => (
                    <Box key={r.id}
                      onClick={() => setSelReviewer(selReviewer?.id === r.id ? null : r)}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1.5,
                        p: 1.5, borderRadius: 2, cursor: 'pointer',
                        border: '1px solid',
                        borderColor: selReviewer?.id === r.id ? ACCENT : 'divider',
                        bgcolor: selReviewer?.id === r.id
                          ? (dark ? 'rgba(22,166,153,0.12)' : 'rgba(22,166,153,0.07)')
                          : 'transparent',
                        '&:hover': { borderColor: ACCENT + '88' },
                      }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: selReviewer?.id === r.id ? ACCENT : '#8b5cf6', fontSize: 12, flexShrink: 0 }}>
                        {r.name?.charAt(0)}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{r.name}</Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{r.email}</Typography>
                      </Box>
                      {selReviewer?.id === r.id && (
                        <CheckIcon sx={{ fontSize: 16, color: ACCENT, flexShrink: 0 }} />
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* New Reviewer Form */}
          {useNewReviewer && (
            <Box sx={{ mb: 2.5, p: 2, borderRadius: 2, bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: '1px solid', borderColor: 'divider' }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1.5, color: 'text.secondary' }}>
                New Reviewer Details
              </Typography>
              <TextField
                fullWidth
                size="small"
                label="Email Address *"
                type="email"
                value={newReviewerEmail}
                onChange={(e) => setNewReviewerEmail(e.target.value)}
                placeholder="reviewer@university.edu"
                sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <TextField
                fullWidth
                size="small"
                label="Full Name (optional)"
                value={newReviewerName}
                onChange={(e) => setNewReviewerName(e.target.value)}
                placeholder="Dr. Jane Smith"
                sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <Typography sx={{ fontSize: 11, fontWeight: 700, mb: 1, color: 'text.secondary' }}>
                Areas of Expertise (optional)
              </Typography>
              {newReviewerExpertise.map((exp, idx) => (
                <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={exp}
                    onChange={(e) => {
                      const updated = [...newReviewerExpertise];
                      updated[idx] = e.target.value;
                      setNewReviewerExpertise(updated);
                    }}
                    placeholder="e.g., Machine Learning, Climate Science"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  {idx === newReviewerExpertise.length - 1 ? (
                    <IconButton
                      size="small"
                      onClick={() => setNewReviewerExpertise([...newReviewerExpertise, ''])}
                      sx={{ color: ACCENT }}>
                      <AddIcon />
                    </IconButton>
                  ) : (
                    <IconButton
                      size="small"
                      onClick={() => setNewReviewerExpertise(newReviewerExpertise.filter((_, i) => i !== idx))}
                      sx={{ color: 'error.main' }}>
                      <RemoveIcon />
                    </IconButton>
                  )}
                </Box>
              ))}
              <Alert severity="info" sx={{ mt: 1.5, fontSize: 11 }}>
                An invitation email will be sent with a link to create their account and choose a password.
              </Alert>
            </Box>
          )}

          <TextField fullWidth size="small" multiline rows={2}
            label="Assignment notes (optional)"
            value={assignNotes} onChange={e => setAssignNotes(e.target.value)}
            placeholder="Any specific instructions for this reviewer…"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setAssignOpen(false)} sx={{ textTransform: 'none', color: 'text.secondary' }}>Cancel</Button>
          <Button 
            variant="contained" 
            disabled={assigning || selectedStages.length === 0 || (!useNewReviewer && !selReviewer) || (useNewReviewer && !newReviewerEmail)} 
            onClick={handleAssign}
            startIcon={assigning ? <CircularProgress size={13} sx={{ color: 'inherit' }} /> : <ReviewerIcon />}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}>
            {assigning ? 'Assigning…' : 'Assign Reviewer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── ACTION DIALOG ──────────────────────────────────────── */}
      <Dialog open={!!actionDialog} onClose={() => { setActionDialog(null); setActionNotes(''); }} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, fontSize: 17 }}>
          {actionDialog === 'advance' && (currentStep >= 5 ? '🏆 Issue Award' : `Advance → ${nextStep?.label}`)}
          {actionDialog === 'return'  && '↩ Return for Revision'}
          {actionDialog === 'decline' && '❌ Decline Proposal'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, p: 1.5, borderRadius: 2,
            bgcolor: actionDialog === 'advance' ? '#ecfdf5' : actionDialog === 'return' ? '#fffbeb' : '#fef2f2',
            border: '1px solid',
            borderColor: actionDialog === 'advance' ? '#6ee7b7' : actionDialog === 'return' ? '#fcd34d' : '#fca5a5',
          }}>
            <Typography sx={{ fontSize: 13, color: actionDialog === 'advance' ? '#065f46' : actionDialog === 'return' ? '#92400e' : '#991b1b' }}>
              {actionDialog === 'advance' && currentStep >= 5 && 'This marks the proposal as Awarded. The applicant will be notified with the award decision.'}
              {actionDialog === 'advance' && currentStep < 5 && `This moves the proposal from "${WORKFLOW_STEPS[currentStep]?.label}" to "${nextStep?.label}" and notifies the team.`}
              {actionDialog === 'return'  && 'This returns the proposal to the applicant for revision. They will be notified with your feedback.'}
              {actionDialog === 'decline' && 'This permanently declines the proposal. The applicant will be notified. This action cannot be undone.'}
            </Typography>
          </Box>
          <TextField
            fullWidth multiline rows={4} size="small"
            label={actionDialog === 'return' ? 'Revision instructions (required)' : actionDialog === 'decline' ? 'Reason for declining (recommended)' : 'Notes (optional)'}
            value={actionNotes}
            onChange={e => setActionNotes(e.target.value)}
            placeholder={
              actionDialog === 'return'  ? 'Describe specifically what needs to be revised or corrected…' :
              actionDialog === 'decline' ? 'Briefly explain the reason for declining…' :
              'Any additional notes for this stage transition…'
            }
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => { setActionDialog(null); setActionNotes(''); }}
            sx={{ textTransform: 'none', color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" disabled={acting || (actionDialog === 'return' && !actionNotes.trim())}
            onClick={handleAction}
            startIcon={acting ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : null}
            color={actionDialog === 'decline' ? 'error' : actionDialog === 'return' ? 'warning' : 'primary'}
            sx={actionDialog === 'advance'
              ? { bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' }, textTransform: 'none', fontWeight: 700 }
              : { textTransform: 'none', fontWeight: 700 }}
          >
            {acting ? 'Processing…' :
              actionDialog === 'advance' ? (currentStep >= 5 ? 'Issue Award' : 'Advance') :
              actionDialog === 'return'  ? 'Return to Applicant' : 'Decline Proposal'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
