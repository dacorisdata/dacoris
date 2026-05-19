'use client';
// MoU / Collaboration Agreement Tracker — Agreement Detail
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Chip, CircularProgress, Tab, Tabs,
  Divider, Alert, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Select, MenuItem, FormControl,
  InputLabel, useTheme, LinearProgress, Tooltip,
} from '@mui/material';
import {
  ArrowBack as BackIcon, Send as SubmitIcon,
  CheckCircle, Reply as ReturnIcon,
  Gavel as SignIcon, Close as CloseIcon,
  Handshake as MouIcon, Add as AddIcon,
  Groups as PartnersIcon, Assignment as ActivityIcon,
  AttachMoney as BudgetIcon, ChecklistRtl as ComplianceIcon,
  Edit as EditIcon, PauseCircle as SuspendIcon,
  LockClock as SigningIcon, TaskAlt as ActiveIcon,
  NoteAdd as DraftIcon, RateReview as ReviewIcon,
  VerifiedUser as LegalIcon, HowToVote as ExecIcon,
  ArrowForward as NextIcon,
} from '@mui/icons-material';
import api from '../../../../lib/api';

const ACCENT = '#7c3aed';

// The main workflow pipeline stages in order
const PIPELINE = [
  { key: 'DRAFT',           label: 'Draft',          icon: DraftIcon,   color: '#64748b' },
  { key: 'INTERNAL_REVIEW', label: 'Internal Review',icon: ReviewIcon,  color: '#f59e0b' },
  { key: 'LEGAL_REVIEW',    label: 'Legal Review',   icon: LegalIcon,   color: '#f97316' },
  { key: 'EXEC_APPROVAL',   label: 'Exec Approval',  icon: ExecIcon,    color: '#8b5cf6' },
  { key: 'PENDING_SIGNING', label: 'Signing',        icon: SigningIcon, color: '#3b82f6' },
  { key: 'ACTIVE',          label: 'Active',         icon: ActiveIcon,  color: '#10b981' },
];

const STATUS_CONFIG = {
  DRAFT:            { label: 'Draft',           color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  INTERNAL_REVIEW:  { label: 'Internal Review', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  LEGAL_REVIEW:     { label: 'Legal Review',    color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  EXEC_APPROVAL:    { label: 'Exec Approval',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  PENDING_SIGNING:  { label: 'Pending Signing', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  ACTIVE:           { label: 'Active',          color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  MID_TERM_REVIEW:  { label: 'Mid-Term Review', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  PENDING_RENEWAL:  { label: 'Pending Renewal', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  SUSPENDED:        { label: 'Suspended',       color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  EXPIRED:          { label: 'Expired',         color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  CLOSED:           { label: 'Closed',          color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  ARCHIVED:         { label: 'Archived',        color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
};

const ACTIVITY_STATUS_CONFIG = {
  PLANNED:            { label: 'Planned',           color: '#64748b' },
  IN_PROGRESS:        { label: 'In Progress',        color: '#3b82f6' },
  DELAYED:            { label: 'Delayed',            color: '#f97316' },
  EVIDENCE_SUBMITTED: { label: 'Evidence Submitted', color: '#8b5cf6' },
  VERIFIED:           { label: 'Verified',           color: '#06b6d4' },
  COMPLETED:          { label: 'Completed',          color: '#10b981' },
  CANCELLED:          { label: 'Cancelled',          color: '#ef4444' },
};

const TYPE_LABELS = {
  GENERAL_COLLABORATION: 'General Collaboration',
  ACADEMIC_EXCHANGE: 'Academic Exchange',
  RESEARCH_PARTNERSHIP: 'Research Partnership',
  DATA_SHARING: 'Data Sharing',
  JOINT_DEGREE: 'Joint Degree',
  CLINICAL: 'Clinical',
  INDUSTRY: 'Industry',
  CONSORTIUM: 'Consortium',
  CO_FUNDING: 'Co-Funding',
};

export default function MouDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [mou, setMou] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [wfDialog, setWfDialog] = useState({ open: false, action: '' });
  const [wfForm, setWfForm] = useState({ comments: '', signed_date: '', signatory_name: '', signatory_title: '' });

  const [actDialog, setActDialog] = useState(false);
  const [actForm, setActForm] = useState({ title: '', description: '', activity_type: 'OTHER', planned_start_date: '', planned_end_date: '' });

  const [partDialog, setPartDialog] = useState(false);
  const [partners, setPartners] = useState([]);
  const [partForm, setPartForm] = useState({ partner_id: '', role: 'CO_SIGNATORY' });

  useEffect(() => { fetchMou(); }, [id]);

  const fetchMou = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/mou/${id}`);
      setMou(res.data);
    } catch (e) {
      setError('Failed to load MoU.');
    }
    setLoading(false);
  };

  const fetchPartners = async () => {
    try {
      const res = await api.get('/mou/partners/');
      setPartners(res.data || []);
    } catch (e) {}
  };

  const doWorkflow = async () => {
    setActionLoading(true);
    try {
      const { action } = wfDialog;
      const payload = {};
      if (wfForm.comments) payload.comments = wfForm.comments;
      if (action === 'sign') {
        payload.signed_date = wfForm.signed_date || null;
        payload.signatory_name = wfForm.signatory_name;
        payload.signatory_title = wfForm.signatory_title;
      }
      await api.post(`/mou/${id}/workflow/${action}`, payload);
      setWfDialog({ open: false, action: '' });
      setWfForm({ comments: '', signed_date: '', signatory_name: '', signatory_title: '' });
      await fetchMou();
    } catch (e) {
      setError(e.response?.data?.detail || 'Action failed.');
    }
    setActionLoading(false);
  };

  const createActivity = async () => {
    try {
      const payload = { ...actForm };
      if (!payload.planned_start_date) delete payload.planned_start_date;
      if (!payload.planned_end_date) delete payload.planned_end_date;
      await api.post(`/mou/${id}/activities`, payload);
      setActDialog(false);
      setActForm({ title: '', description: '', activity_type: 'OTHER', planned_start_date: '', planned_end_date: '' });
      await fetchMou();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create activity.');
    }
  };

  const addParticipant = async () => {
    if (!partForm.partner_id) return;
    try {
      await api.post(`/mou/${id}/participants`, partForm);
      setPartDialog(false);
      setPartForm({ partner_id: '', role: 'CO_SIGNATORY' });
      await fetchMou();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to add partner.');
    }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <CircularProgress sx={{ color: ACCENT }} />
    </Box>
  );

  if (!mou) return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography color="error">MoU not found.</Typography>
      <Button onClick={() => router.push('/admin-staff/mou/list')} sx={{ mt: 2 }}>Back to List</Button>
    </Box>
  );

  const cfg = STATUS_CONFIG[mou.status] || STATUS_CONFIG.DRAFT;
  const pipelineIdx = PIPELINE.findIndex(p => p.key === mou.status);
  const inActivePipeline = pipelineIdx >= 0;

  // Visual pipeline bar — shows progress through main lifecycle stages
  const WorkflowPipeline = () => (
    <Box sx={{ bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`,
      borderRadius: 3, p: { xs: 2, md: 2.5 }, mb: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: 'text.disabled' }}>
          Agreement Lifecycle
        </Typography>
        {!inActivePipeline && (
          <Chip label={cfg.label} size="small" sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: 10 }} />
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {PIPELINE.map((stage, i) => {
          const done    = inActivePipeline && i < pipelineIdx;
          const current = inActivePipeline && i === pipelineIdx;
          const pending = !done && !current;
          const Icon    = stage.icon;
          const isLast  = i === PIPELINE.length - 1;
          return (
            <Box key={stage.key} sx={{ display: 'flex', alignItems: 'center', flex: isLast ? 'none' : 1, minWidth: 0 }}>
              <Tooltip title={stage.label} placement="top">
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.4,
                  cursor: 'default', minWidth: 0, px: 0.5 }}>
                  <Box sx={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: current ? stage.color : done ? `${stage.color}30` : (dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                    border: current ? `2px solid ${stage.color}` : done ? `2px solid ${stage.color}60` : `2px solid ${theme.palette.divider}`,
                    transition: 'all 0.2s',
                  }}>
                    {done
                      ? <CheckCircle sx={{ fontSize: 16, color: stage.color }} />
                      : <Icon sx={{ fontSize: 15, color: current ? '#fff' : pending ? 'text.disabled' : stage.color }} />
                    }
                  </Box>
                  <Typography sx={{ fontSize: 9.5, fontWeight: current ? 800 : done ? 600 : 400,
                    color: current ? stage.color : done ? stage.color : 'text.disabled',
                    whiteSpace: 'nowrap', display: { xs: 'none', sm: 'block' } }}>
                    {stage.label}
                  </Typography>
                </Box>
              </Tooltip>
              {!isLast && (
                <Box sx={{ flex: 1, height: 2, mx: 0.5,
                  bgcolor: done ? stage.color : (dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'),
                  transition: 'background-color 0.3s', borderRadius: 1 }} />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );

  // Context-aware action buttons for current stage
  const ActionButtons = () => {
    const s = mou.status;
    return (
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {s === 'DRAFT' && (
          <Button size="small" variant="contained" startIcon={<SubmitIcon />}
            onClick={() => setWfDialog({ open: true, action: 'submit' })}
            sx={{ bgcolor: '#3b82f6', textTransform: 'none', borderRadius: 2, fontSize: 12, fontWeight: 600,
              '&:hover': { bgcolor: '#2563eb' } }}>
            Submit for Review
          </Button>
        )}
        {['INTERNAL_REVIEW','LEGAL_REVIEW','EXEC_APPROVAL'].includes(s) && (<>
          <Button size="small" variant="contained" startIcon={<CheckCircle />}
            onClick={() => setWfDialog({ open: true, action: 'approve' })}
            sx={{ bgcolor: '#10b981', textTransform: 'none', borderRadius: 2, fontSize: 12, fontWeight: 600,
              '&:hover': { bgcolor: '#059669' } }}>
            Approve
          </Button>
          <Button size="small" variant="outlined" startIcon={<ReturnIcon />}
            onClick={() => setWfDialog({ open: true, action: 'return' })}
            sx={{ color: '#f59e0b', borderColor: '#f59e0b', textTransform: 'none', borderRadius: 2, fontSize: 12,
              '&:hover': { bgcolor: 'rgba(245,158,11,0.08)' } }}>
            Return
          </Button>
        </>)}
        {s === 'PENDING_SIGNING' && (
          <Button size="small" variant="contained" startIcon={<SignIcon />}
            onClick={() => setWfDialog({ open: true, action: 'sign' })}
            sx={{ bgcolor: '#3b82f6', textTransform: 'none', borderRadius: 2, fontSize: 12, fontWeight: 600,
              '&:hover': { bgcolor: '#2563eb' } }}>
            Record Signing
          </Button>
        )}
        {s === 'ACTIVE' && (
          <Button size="small" variant="outlined" startIcon={<SuspendIcon />}
            onClick={() => setWfDialog({ open: true, action: 'suspend' })}
            sx={{ color: '#f97316', borderColor: '#f97316', textTransform: 'none', borderRadius: 2, fontSize: 12,
              '&:hover': { bgcolor: 'rgba(249,115,22,0.08)' } }}>
            Suspend
          </Button>
        )}
        {['DRAFT','INTERNAL_REVIEW','LEGAL_REVIEW','EXEC_APPROVAL','PENDING_SIGNING','ACTIVE','SUSPENDED'].includes(s) && (
          <Button size="small" variant="outlined" startIcon={<CloseIcon />}
            onClick={() => setWfDialog({ open: true, action: 'close' })}
            sx={{ color: '#ef4444', borderColor: '#ef4444', textTransform: 'none', borderRadius: 2, fontSize: 12,
              '&:hover': { bgcolor: 'rgba(239,68,68,0.08)' } }}>
            Terminate
          </Button>
        )}
      </Box>
    );
  };

  const Card = ({ children, sx = {} }) => (
    <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 3,
      border: `1px solid ${theme.palette.divider}`, ...sx }}>
      {children}
    </Box>
  );

  const InfoRow = ({ label, value, chip }) => (
    <Box sx={{ display: 'flex', py: 1, borderBottom: `1px solid ${theme.palette.divider}`, '&:last-child': { borderBottom: 'none' } }}>
      <Typography sx={{ fontSize: 12, color: 'text.secondary', width: 190, flexShrink: 0 }}>{label}</Typography>
      {chip ? (
        <Chip label={value || '—'} size="small" sx={{ fontSize: 11, height: 22 }} />
      ) : (
        <Typography sx={{ fontSize: 13, color: value ? 'text.primary' : 'text.disabled', flex: 1 }}>
          {value || '—'}
        </Typography>
      )}
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Back + title row */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
        <Box>
          <Button startIcon={<BackIcon />} onClick={() => router.push('/admin-staff/mou/list')}
            sx={{ color: 'text.secondary', textTransform: 'none', mb: 0.5, fontSize: 12 }}>All Agreements</Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 21, fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}>{mou.title}</Typography>
            <Chip label={cfg.label} sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: 11 }} />
            {mou.risk_rating && (
              <Chip label={`${mou.risk_rating} Risk`} size="small"
                sx={{ bgcolor: mou.risk_rating === 'HIGH' ? 'rgba(239,68,68,0.1)' : mou.risk_rating === 'MEDIUM' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                  color: mou.risk_rating === 'HIGH' ? '#ef4444' : mou.risk_rating === 'MEDIUM' ? '#f59e0b' : '#10b981',
                  fontWeight: 600, fontSize: 10 }} />
            )}
          </Box>
          <Typography sx={{ color: 'text.secondary', fontSize: 12, mt: 0.3 }}>
            {mou.mou_number} · {TYPE_LABELS[mou.mou_type] || mou.mou_type}
            {mou.lead_department ? ` · ${mou.lead_department}` : ''}
          </Typography>
        </Box>
        <ActionButtons />
      </Box>

      {/* Visual workflow pipeline */}
      <WorkflowPipeline />

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)}
        sx={{ mb: 2.5, borderBottom: `1px solid ${theme.palette.divider}`,
          '& .MuiTab-root': { textTransform: 'none', fontSize: 13, minWidth: 0, px: 1.5 },
          '& .Mui-selected': { color: ACCENT, fontWeight: 700 },
          '& .MuiTabs-indicator': { bgcolor: ACCENT } }}>
        {['Overview', 'Partners', 'Approval History', 'Activities', 'Budget', 'Compliance'].map((t) => (
          <Tab key={t} label={t} />
        ))}
      </Tabs>

      {/* Tab 0: Overview */}
      {tab === 0 && (
        <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
          <Card sx={{ flex: '2 1 340px' }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: ACCENT, mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Details</Typography>
            <InfoRow label="MoU Number" value={mou.mou_number} />
            <InfoRow label="Type" value={TYPE_LABELS[mou.mou_type] || mou.mou_type} />
            <InfoRow label="Thematic Area" value={mou.thematic_area} />
            <InfoRow label="Lead Department" value={mou.lead_department} />
            <InfoRow label="Effective Date" value={mou.effective_date} />
            <InfoRow label="Expiry Date" value={mou.expiry_date} />
            <InfoRow label="Signed Date" value={mou.signed_date} />
            <InfoRow label="Duration (years)" value={mou.duration_years} />
            <InfoRow label="Governing Law" value={mou.governing_law} />
            <InfoRow label="Confidentiality" value={mou.confidentiality_level} />
            <InfoRow label="Auto-Renew" value={mou.auto_renew ? 'Yes' : 'No'} />
          </Card>
          <Box sx={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Card>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: ACCENT, mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Flags</Typography>
              {[
                { label: 'Financial Commitment', value: mou.financial_commitment },
                { label: 'IP Clauses', value: mou.ip_clauses },
                { label: 'Data Sharing', value: mou.data_sharing },
              ].map(({ label, value }) => (
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 1,
                  borderBottom: `1px solid ${theme.palette.divider}`, '&:last-child': { borderBottom: 'none' } }}>
                  <Typography sx={{ fontSize: 13, color: 'text.primary' }}>{label}</Typography>
                  <Chip label={value ? 'Yes' : 'No'} size="small"
                    sx={{ bgcolor: value ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                      color: value ? '#ef4444' : '#10b981', fontWeight: 700, fontSize: 10, height: 20 }} />
                </Box>
              ))}
            </Card>
            {mou.scope_objectives && (
              <Card>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: ACCENT, mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>Scope</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.6 }}>{mou.scope_objectives}</Typography>
              </Card>
            )}
          </Box>
        </Box>
      )}

      {/* Tab 1: Partners */}
      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="outlined" startIcon={<AddIcon />}
              onClick={async () => { await fetchPartners(); setPartDialog(true); }}
              sx={{ borderColor: ACCENT, color: ACCENT, textTransform: 'none', borderRadius: 2 }}>
              Link Partner
            </Button>
          </Box>
          {mou.participants?.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <PartnersIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">No partners linked yet.</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {mou.participants?.map(p => (
                <Card key={p.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                    <Box>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary' }}>{p.partner_name}</Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {p.partner_country} · {p.partner_type}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip label={p.role} size="small" sx={{ bgcolor: `${ACCENT}18`, color: ACCENT, fontWeight: 600, fontSize: 10 }} />
                      {p.signed_date && <Chip label={`Signed: ${p.signed_date}`} size="small" sx={{ fontSize: 10 }} />}
                    </Box>
                  </Box>
                  {p.signatory_name && (
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
                      Signatory: {p.signatory_name}{p.signatory_title ? ` (${p.signatory_title})` : ''}
                    </Typography>
                  )}
                </Card>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Tab 2: Approval History */}
      {tab === 2 && (
        <Box>
          {/* Current stage banner */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, mb: 2.5,
            bgcolor: `${cfg.color}0d`, border: `1px solid ${cfg.color}30`, borderRadius: 2.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: cfg.color, flexShrink: 0 }} />
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>
                Currently: {cfg.label}
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                {mou.status === 'DRAFT' && 'Ready to submit for internal review once complete.'}
                {mou.status === 'INTERNAL_REVIEW' && 'Awaiting internal reviewer approval before legal review.'}
                {mou.status === 'LEGAL_REVIEW' && 'Under review by the legal team for compliance and IP clauses.'}
                {mou.status === 'EXEC_APPROVAL' && 'Requires executive sign-off before proceeding to signing.'}
                {mou.status === 'PENDING_SIGNING' && 'Agreement approved. Awaiting formal signature from all parties.'}
                {mou.status === 'ACTIVE' && 'Agreement is active and operational.'}
                {mou.status === 'MID_TERM_REVIEW' && 'Mid-term performance review in progress.'}
                {mou.status === 'PENDING_RENEWAL' && 'Agreement nearing expiry — renewal process initiated.'}
                {mou.status === 'SUSPENDED' && 'Agreement is temporarily suspended.'}
                {mou.status === 'EXPIRED' && 'Agreement has expired. Consider renewal or archiving.'}
                {mou.status === 'CLOSED' && 'Agreement has been formally closed.'}
                {mou.status === 'ARCHIVED' && 'Agreement is archived for reference.'}
              </Typography>
            </Box>
            <ActionButtons />
          </Box>

          {/* Stage history */}
          {!mou.approval_stages?.length ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <ReviewIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary" fontSize={13}>
                No review stages recorded yet. Submit the agreement to begin the approval workflow.
              </Typography>
              {mou.status === 'DRAFT' && (
                <Button variant="contained" startIcon={<SubmitIcon />}
                  onClick={() => setWfDialog({ open: true, action: 'submit' })}
                  sx={{ mt: 2, bgcolor: '#3b82f6', textTransform: 'none', fontWeight: 600, borderRadius: 2,
                    '&:hover': { bgcolor: '#2563eb' } }}>
                  Submit for Review
                </Button>
              )}
            </Box>
          ) : (
            <Box sx={{ position: 'relative', pl: { sm: 4 } }}>
              {/* vertical line */}
              <Box sx={{ display: { xs: 'none', sm: 'block' }, position: 'absolute', left: 15, top: 8,
                bottom: 8, width: 2, bgcolor: theme.palette.divider }} />
              {mou.approval_stages.map((stage, idx) => {
                const done = stage.status === 'APPROVED';
                const ret  = stage.status === 'RETURNED';
                const pend = stage.status === 'PENDING' || stage.status === 'IN_PROGRESS';
                const dotColor = done ? '#10b981' : ret ? '#ef4444' : pend ? ACCENT : '#94a3b8';
                return (
                  <Box key={stage.id} sx={{ display: 'flex', gap: 2, mb: 2, position: 'relative' }}>
                    {/* dot */}
                    <Box sx={{ display: { xs: 'none', sm: 'flex' }, position: 'absolute', left: -28,
                      width: 28, alignItems: 'center', justifyContent: 'center', top: 0 }}>
                      <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: dotColor,
                        border: `2px solid background.paper`, boxShadow: `0 0 0 2px ${dotColor}40`,
                        zIndex: 1 }} />
                    </Box>
                    <Box sx={{ flex: 1, bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 2.5, p: 2, borderLeft: `3px solid ${dotColor}` }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>
                            {stage.stage_type?.replace(/_/g, ' ')}
                          </Typography>
                          <Chip label={stage.status?.replace(/_/g, ' ')} size="small"
                            sx={{ fontSize: 10, height: 20, fontWeight: 700,
                              bgcolor: done ? 'rgba(16,185,129,0.1)' : ret ? 'rgba(239,68,68,0.1)' : pend ? `${ACCENT}15` : 'rgba(148,163,184,0.1)',
                              color: done ? '#10b981' : ret ? '#ef4444' : pend ? ACCENT : '#94a3b8' }} />
                        </Box>
                        {stage.decided_at && (
                          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                            {new Date(stage.decided_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </Typography>
                        )}
                      </Box>
                      {stage.comments && (
                        <Box sx={{ mt: 1, p: 1.5, bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                          borderRadius: 1.5, borderLeft: `2px solid ${dotColor}60` }}>
                          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', fontStyle: 'italic', lineHeight: 1.6 }}>
                            "{stage.comments}"
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      )}

      {/* Tab 3: Activities */}
      {tab === 3 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setActDialog(true)}
              sx={{ borderColor: ACCENT, color: ACCENT, textTransform: 'none', borderRadius: 2 }}>
              Add Activity
            </Button>
          </Box>
          {mou.activities?.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <ActivityIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">No activities yet.</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {mou.activities?.map(a => {
                const acfg = ACTIVITY_STATUS_CONFIG[a.status] || ACTIVITY_STATUS_CONFIG.PLANNED;
                return (
                  <Card key={a.id}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary' }}>{a.title}</Typography>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.3 }}>
                          {a.activity_type?.replace(/_/g, ' ')}
                          {a.planned_start_date && ` · ${a.planned_start_date}`}
                          {a.planned_end_date && ` → ${a.planned_end_date}`}
                        </Typography>
                        {a.description && (
                          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5 }}>{a.description}</Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                        <Chip label={acfg.label} size="small"
                          sx={{ bgcolor: `${acfg.color}18`, color: acfg.color, fontWeight: 700, fontSize: 10 }} />
                        {a.completion_percentage > 0 && (
                          <Box sx={{ width: 120 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                              <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>Progress</Typography>
                              <Typography sx={{ fontSize: 10, fontWeight: 700, color: acfg.color }}>{a.completion_percentage}%</Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={a.completion_percentage}
                              sx={{ height: 5, borderRadius: 2,
                                bgcolor: `${acfg.color}20`,
                                '& .MuiLinearProgress-bar': { bgcolor: acfg.color } }} />
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Card>
                );
              })}
            </Box>
          )}
        </Box>
      )}

      {/* Tab 4: Budget */}
      {tab === 4 && (
        <Box>
          {mou.budgets?.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <BudgetIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">No budget records yet.</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {mou.budgets?.map(b => (
                <Card key={b.id} sx={{ flex: '1 1 250px' }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mb: 1 }}>
                    {b.description || 'Budget Record'}
                  </Typography>
                  <Chip label={b.status} size="small" sx={{ mb: 1.5, fontSize: 10 }} />
                  {[
                    { label: 'Currency', value: b.currency },
                    { label: 'Institution Committed', value: b.committed_by_institution?.toLocaleString() },
                    { label: 'Partner Committed', value: b.committed_by_partner?.toLocaleString() },
                    { label: 'Total Budget', value: b.total_budget?.toLocaleString() },
                  ].map(({ label, value }) => (
                    <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.8,
                      borderBottom: `1px solid ${theme.palette.divider}`, '&:last-child': { borderBottom: 'none' } }}>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{label}</Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.primary' }}>{value || '—'}</Typography>
                    </Box>
                  ))}
                </Card>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Tab 5: Compliance */}
      {tab === 5 && (
        <Box>
          {mou.compliance_items?.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <ComplianceIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">No compliance items yet.</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {mou.compliance_items?.map(c => {
                const color = c.status === 'COMPLIANT' ? '#10b981' : c.status === 'NON_COMPLIANT' ? '#ef4444' : c.status === 'WAIVED' ? '#64748b' : '#f59e0b';
                return (
                  <Card key={c.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography sx={{ fontSize: 13, color: 'text.primary' }}>{c.check_type}</Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        {c.required && <Chip label="Required" size="small" sx={{ fontSize: 10, bgcolor: 'rgba(239,68,68,0.1)', color: '#ef4444' }} />}
                        <Chip label={c.status} size="small" sx={{ bgcolor: `${color}18`, color, fontWeight: 700, fontSize: 10 }} />
                      </Box>
                    </Box>
                    {c.notes && <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>{c.notes}</Typography>}
                  </Card>
                );
              })}
            </Box>
          )}
        </Box>
      )}

      {/* Workflow Dialog */}
      <Dialog open={wfDialog.open} onClose={() => setWfDialog({ open: false, action: '' })} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
          {wfDialog.action === 'submit' && 'Submit for Internal Review'}
          {wfDialog.action === 'approve' && 'Approve Stage'}
          {wfDialog.action === 'return' && 'Return with Comments'}
          {wfDialog.action === 'sign' && 'Record Signing'}
          {wfDialog.action === 'close' && 'Close / Terminate MoU'}
          {wfDialog.action === 'suspend' && 'Suspend MoU'}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {wfDialog.action === 'sign' && (
            <>
              <TextField fullWidth size="small" label="Signed Date" type="date"
                value={wfForm.signed_date} onChange={e => setWfForm(p => ({ ...p, signed_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2, mt: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              <TextField fullWidth size="small" label="Signatory Name"
                value={wfForm.signatory_name} onChange={e => setWfForm(p => ({ ...p, signatory_name: e.target.value }))}
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              <TextField fullWidth size="small" label="Signatory Title / Role"
                value={wfForm.signatory_title} onChange={e => setWfForm(p => ({ ...p, signatory_title: e.target.value }))}
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            </>
          )}
          <TextField fullWidth size="small" multiline rows={3}
            label={wfDialog.action === 'return' ? 'Reason for returning *' : 'Comments (optional)'}
            value={wfForm.comments} onChange={e => setWfForm(p => ({ ...p, comments: e.target.value }))}
            sx={{ mt: wfDialog.action !== 'sign' ? 1 : 0, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setWfDialog({ open: false, action: '' })} sx={{ textTransform: 'none', color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={doWorkflow} disabled={actionLoading}
            sx={{ bgcolor: ACCENT, textTransform: 'none', fontWeight: 600, borderRadius: 2,
              '&:hover': { bgcolor: '#6d28d9' } }}>
            {actionLoading ? <CircularProgress size={16} color="inherit" /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Activity Dialog */}
      <Dialog open={actDialog} onClose={() => setActDialog(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Add Activity</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField fullWidth size="small" label="Title *" value={actForm.title}
            onChange={e => setActForm(p => ({ ...p, title: e.target.value }))}
            sx={{ mt: 1, mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Activity Type</InputLabel>
            <Select value={actForm.activity_type} label="Activity Type"
              onChange={e => setActForm(p => ({ ...p, activity_type: e.target.value }))} sx={{ borderRadius: 2 }}>
              {['JOINT_TRAINING','RESEARCH_PROJECT','STUDENT_EXCHANGE','PUBLICATION','GRANT_APPLICATION',
                'TECHNOLOGY_TRANSFER','POLICY_BRIEF','EVENT_WORKSHOP','CONSULTANCY','EQUIPMENT_SHARING','OTHER']
                .map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField size="small" label="Start Date" type="date" value={actForm.planned_start_date}
              onChange={e => setActForm(p => ({ ...p, planned_start_date: e.target.value }))}
              InputLabelProps={{ shrink: true }} fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <TextField size="small" label="End Date" type="date" value={actForm.planned_end_date}
              onChange={e => setActForm(p => ({ ...p, planned_end_date: e.target.value }))}
              InputLabelProps={{ shrink: true }} fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          </Box>
          <TextField fullWidth size="small" multiline rows={2} label="Description"
            value={actForm.description} onChange={e => setActForm(p => ({ ...p, description: e.target.value }))}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setActDialog(false)} sx={{ textTransform: 'none', color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={createActivity}
            disabled={!actForm.title}
            sx={{ bgcolor: ACCENT, textTransform: 'none', fontWeight: 600, borderRadius: 2,
              '&:hover': { bgcolor: '#6d28d9' } }}>
            Add Activity
          </Button>
        </DialogActions>
      </Dialog>

      {/* Link Partner Dialog */}
      <Dialog open={partDialog} onClose={() => setPartDialog(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Link Partner to MoU</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <FormControl fullWidth size="small" sx={{ mt: 1, mb: 2 }}>
            <InputLabel>Select Partner</InputLabel>
            <Select value={partForm.partner_id} label="Select Partner"
              onChange={e => setPartForm(p => ({ ...p, partner_id: e.target.value }))} sx={{ borderRadius: 2 }}>
              {partners.map(p => (
                <MenuItem key={p.id} value={p.id}>{p.organisation_name} {p.country ? `(${p.country})` : ''}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {partners.length === 0 && (
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              No partners found. <Button size="small" onClick={() => router.push('/admin-staff/mou/partners')} sx={{ color: 'primary.main', textTransform: 'none' }}>Create a partner first.</Button>
            </Alert>
          )}
          <FormControl fullWidth size="small">
            <InputLabel>Role</InputLabel>
            <Select value={partForm.role} label="Role"
              onChange={e => setPartForm(p => ({ ...p, role: e.target.value }))} sx={{ borderRadius: 2 }}>
              {['LEAD','CO_SIGNATORY','BENEFICIARY','OBSERVER'].map(r => (
                <MenuItem key={r} value={r}>{r.replace(/_/g, ' ')}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPartDialog(false)} sx={{ textTransform: 'none', color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={addParticipant} disabled={!partForm.partner_id}
            sx={{ bgcolor: ACCENT, textTransform: 'none', fontWeight: 600, borderRadius: 2,
              '&:hover': { bgcolor: '#6d28d9' } }}>
            Link Partner
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
