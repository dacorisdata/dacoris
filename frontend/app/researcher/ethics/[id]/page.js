'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme, Alert,
  Paper, Divider, Stepper, Step, StepLabel, Avatar, Tooltip,
  Table, TableBody, TableCell, TableRow, LinearProgress,
} from '@mui/material';
import {
  ArrowBack as BackIcon, Gavel as EthicsIcon, Person as PersonIcon,
  Article as ProtocolIcon, CalendarToday as CalIcon,
  CheckCircle as ApproveIcon, Cancel as RejectIcon,
  Schedule as PendingIcon, Warning as WarnIcon,
  Edit as EditIcon, Group as TeamIcon, FactCheck as ScoreIcon,
  Download as DownloadIcon, Lock as PrivacyIcon,
  AccountBalance as FundingIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../../../contexts/AuthContext';

const API    = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#1ca7a1';

const ETHICS_STAGES = ['Submitted', 'Screened', 'Assigned', 'Under Review', 'Decision', 'Approved'];

const STATUS_META = {
  approved:      { label: 'Approved',      color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  final_approval:{ label: 'Approved',      color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  under_review:  { label: 'Under Review',  color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)'  },
  assigned:      { label: 'Assigned',      color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)'  },
  submitted:     { label: 'Submitted',     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  screened:      { label: 'Screened',      color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  decision:      { label: 'Decision',      color: '#f97316', bg: 'rgba(249,115,22,0.1)'  },
  rejected:      { label: 'Rejected',      color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
  draft:         { label: 'Draft',         color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
};

const TYPE_META = {
  initial_review:   { label: 'Initial Review',   color: '#8b5cf6' },
  amendment:        { label: 'Amendment',         color: '#f97316' },
  renewal:          { label: 'Renewal',           color: '#0ea5e9' },
  full_review:      { label: 'Full Review',       color: '#8b5cf6' },
  expedited_review: { label: 'Expedited Review',  color: '#0ea5e9' },
  exempt:           { label: 'Exempt',            color: '#10b981' },
};

const SAMPLE_APP = {
  id: 1,
  ref: 'ETHICS-APP-2026-001',
  title: 'Ethical Review for Genomic Biomarker Study in HIV-positive Adults',
  project_title: 'Genomic Analysis of Antibiotic Resistance in Kenyan Hospitals',
  project_id: 1,
  application_type: 'initial_review',
  status: 'under_review',
  stage_index: 3,
  submitted_at: '2026-04-10',
  approved_until: null,
  pi: 'Dr. Amina Odhiambo',
  pi_orcid: '0000-0002-1234-5678',
  pi_institution: 'University of Nairobi',
  ethics_lead: 'Dr. Grace Njoroge',
  ethics_lead_email: 'g.njoroge@ku.ac.ke',
  study_type: 'Observational / Cohort',
  participants: 120,
  age_range: '18–65',
  gender_profile: 'All genders',
  vulnerable_groups: ['Individuals with HIV/AIDS'],
  risk_level: 'High',
  risk_categories: ['Physical', 'Psychological', 'Privacy'],
  risk_mitigation: 'All samples collected by trained clinical staff. Psychological support available via KNH counselling services. Data de-identified at point of collection.',
  adverse_event_protocol: 'Immediate reporting to IRB within 24hrs. Independent safety monitoring committee reviews quarterly.',
  consent_type: 'written',
  identifiability: 'coded',
  ethical_codes: ['Declaration of Helsinki', 'Belmont Report', 'ICH-GCP'],
  funder: 'Wellcome Trust',
  financial_disclosure: 'None',
  direct_benefits: 'Participants receive free HIV viral load monitoring and antimicrobial resistance counselling.',
  indirect_benefits: 'Data will inform national antimicrobial stewardship policy across East Africa.',
  documents: [
    { id: 1, name: 'Protocol_v2.pdf', type: 'Protocol', uploaded: '2026-04-09' },
    { id: 2, name: 'Consent_Form_EN.pdf', type: 'Consent Form', uploaded: '2026-04-09' },
    { id: 3, name: 'Consent_Form_SW.pdf', type: 'Consent Form (Swahili)', uploaded: '2026-04-09' },
    { id: 4, name: 'CITI_Training_Certificate.pdf', type: 'Training Certificate', uploaded: '2026-04-08' },
  ],
  review_scores: {
    scientific_merit: 78,
    ethical_design: 82,
    informed_consent: 90,
    risk_benefit: 74,
    privacy: 88,
  },
  reviewer_notes: 'Strong protocol with well-designed consent process. Recommend minor revision to adverse event reporting timeline — currently states 72hrs, should be 24hrs per IRB policy. Risk mitigation plan is comprehensive.',
  timeline: [
    { date: '2026-04-10', event: 'Application submitted', actor: 'Dr. Amina Odhiambo', type: 'submit' },
    { date: '2026-04-12', event: 'Administrative screening passed', actor: 'Ethics Secretariat', type: 'screen' },
    { date: '2026-04-15', event: 'Assigned to reviewer: Dr. K. Wanjiku', actor: 'Committee Chair', type: 'assign' },
    { date: '2026-04-22', event: 'Review in progress', actor: 'Dr. K. Wanjiku', type: 'review' },
  ],
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const overallScore = scores => Math.round(Object.values(scores).reduce((s, v) => s + v, 0) / Object.values(scores).length);

function InfoCard({ label, value, wide }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  return (
    <Paper elevation={0} sx={{
      px: 2, py: 1.5, borderRadius: 2, flex: wide ? '2 1 260px' : '1 1 160px',
      bgcolor: dark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
      border: '1px solid', borderColor: 'divider',
    }}>
      <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.3 }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{value || '—'}</Typography>
    </Paper>
  );
}

export default function EthicsApplicationDetailPage() {
  const router = useRouter();
  const { id }  = useParams();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark  = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [app, setApp]         = useState(null);
  const [error, setError]     = useState('');

  useEffect(() => {
    fetchUser().then(async u => {
      if (!u) { router.push('/login'); return; }
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API}/research/ethics/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setApp(res.data);
      } catch {
        setApp(SAMPLE_APP);
      } finally {
        setLoading(false);
      }
    });
  }, [id]);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress sx={{ color: ACCENT }} />
    </Box>
  );

  if (!app) return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography sx={{ fontSize: 15, color: 'text.secondary' }}>Application not found.</Typography>
      <Button sx={{ mt: 2, textTransform: 'none' }} onClick={() => router.push('/researcher/ethics')}>Back to Ethics</Button>
    </Box>
  );

  const sm = STATUS_META[app.status] || STATUS_META.draft;
  const tm = TYPE_META[app.application_type] || TYPE_META.initial_review;
  const scores = app.review_scores || {};
  const hasScores = Object.values(scores).some(v => v > 0);

  const SCORE_LABELS = {
    scientific_merit: 'Scientific Merit',
    ethical_design:   'Ethical Design',
    informed_consent: 'Informed Consent',
    risk_benefit:     'Risk–Benefit Ratio',
    privacy:          'Privacy & Data Protection',
  };

  const timelineIcons = {
    submit: <EthicsIcon sx={{ fontSize: 14, color: ACCENT }} />,
    screen: <PendingIcon sx={{ fontSize: 14, color: '#f59e0b' }} />,
    assign: <PersonIcon sx={{ fontSize: 14, color: '#8b5cf6' }} />,
    review: <ScoreIcon sx={{ fontSize: 14, color: '#0ea5e9' }} />,
    approve: <ApproveIcon sx={{ fontSize: 14, color: '#10b981' }} />,
    reject: <RejectIcon sx={{ fontSize: 14, color: '#ef4444' }} />,
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>

      {/* Top bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button size="small" startIcon={<BackIcon sx={{ fontSize: 14 }} />}
            onClick={() => router.push('/researcher/ethics')}
            sx={{ textTransform: 'none', color: 'text.secondary', borderRadius: 2 }}>
            Ethics Applications
          </Button>
          <Typography sx={{ color: 'divider' }}>|</Typography>
          <Typography sx={{ fontSize: 12, color: ACCENT, fontWeight: 700 }}>{app.ref}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {app.status === 'draft' && (
            <Button size="small" variant="contained" startIcon={<EditIcon sx={{ fontSize: 14 }} />}
              onClick={() => router.push(`/researcher/ethics/${id}/edit`)}
              sx={{ textTransform: 'none', borderRadius: 2, bgcolor: ACCENT, '&:hover': { bgcolor: '#0e8a85' } }}>
              Continue Editing
            </Button>
          )}
        </Box>
      </Box>

      {/* Header card */}
      <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
        <Box sx={{ px: 3, py: 2.5, background: dark ? 'rgba(255,255,255,0.02)' : '#f8fafc', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Chip label={tm.label} size="small" sx={{ bgcolor: `${tm.color}18`, color: tm.color, fontWeight: 700, fontSize: 10, height: 20 }} />
                <Chip label={sm.label} size="small" sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 700, fontSize: 10, height: 20 }} />
              </Box>
              <Typography sx={{ fontSize: 18, fontWeight: 800, lineHeight: 1.3, mb: 0.5 }}>{app.title}</Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                Linked project: <span style={{ fontWeight: 600 }}>{app.project_title}</span>
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Progress stepper */}
        <Box sx={{ px: 3, py: 2.5 }}>
          <Stepper activeStep={app.stage_index ?? 0} alternativeLabel sx={{
            '& .MuiStepLabel-label': { fontSize: 11 },
            '& .MuiStepIcon-root.Mui-completed': { color: '#10b981' },
            '& .MuiStepIcon-root.Mui-active': { color: ACCENT },
          }}>
            {ETHICS_STAGES.map(l => <Step key={l}><StepLabel>{l}</StepLabel></Step>)}
          </Stepper>
        </Box>
      </Paper>

      {app.status === 'approved' && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
          <strong>Ethics Clearance Approved.</strong> Valid until {fmtDate(app.approved_until)}. You may now proceed with data collection.
        </Alert>
      )}
      {app.status === 'rejected' && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          <strong>Application Rejected.</strong> {app.decision_notes}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Main content */}
        <Box sx={{ flex: '1 1 500px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2.5 }}>

          {/* Key Details */}
          <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon sx={{ fontSize: 16, color: ACCENT }} /> Investigator Details
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <InfoCard label="Principal Investigator" value={app.pi} wide />
              <InfoCard label="PI ORCID" value={app.pi_orcid} />
              <InfoCard label="Institution" value={app.pi_institution} wide />
              <InfoCard label="Ethics Lead" value={app.ethics_lead} wide />
              <InfoCard label="Ethics Lead Email" value={app.ethics_lead_email} wide />
            </Box>
          </Paper>

          {/* Participants */}
          <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TeamIcon sx={{ fontSize: 16, color: ACCENT }} /> Participant Profile
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <InfoCard label="Total Participants" value={app.participants} />
              <InfoCard label="Age Range" value={app.age_range} />
              <InfoCard label="Gender Profile" value={app.gender_profile} />
              <InfoCard label="Risk Level" value={app.risk_level} />
              <InfoCard label="Study Type" value={app.study_type} wide />
            </Box>
            {app.vulnerable_groups?.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.75 }}>Vulnerable Groups</Typography>
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                  {app.vulnerable_groups.map(g => (
                    <Chip key={g} label={g} size="small" sx={{ fontSize: 11, bgcolor: 'rgba(249,115,22,0.1)', color: '#f97316', fontWeight: 600 }} />
                  ))}
                </Box>
              </Box>
            )}
          </Paper>

          {/* Risk & Benefits */}
          <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarnIcon sx={{ fontSize: 16, color: '#f97316' }} /> Risk & Benefit Analysis
            </Typography>
            {app.risk_categories?.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.75 }}>Risk Categories</Typography>
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                  {app.risk_categories.map(r => (
                    <Chip key={r} label={r} size="small" sx={{ fontSize: 11, bgcolor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 600 }} />
                  ))}
                </Box>
              </Box>
            )}
            {app.risk_mitigation && (
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.5 }}>Mitigation</Typography>
                <Typography sx={{ fontSize: 13, lineHeight: 1.6 }}>{app.risk_mitigation}</Typography>
              </Box>
            )}
            {app.direct_benefits && (
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 220px' }}>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.5 }}>Direct Benefits</Typography>
                  <Typography sx={{ fontSize: 13, lineHeight: 1.6 }}>{app.direct_benefits}</Typography>
                </Box>
                <Box sx={{ flex: '1 1 220px' }}>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.5 }}>Indirect Benefits</Typography>
                  <Typography sx={{ fontSize: 13, lineHeight: 1.6 }}>{app.indirect_benefits}</Typography>
                </Box>
              </Box>
            )}
          </Paper>

          {/* Consent & Privacy */}
          <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PrivacyIcon sx={{ fontSize: 16, color: '#8b5cf6' }} /> Consent & Privacy
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: app.ethical_codes?.length > 0 ? 2 : 0 }}>
              <InfoCard label="Consent Type" value={app.consent_type?.replace(/_/g, ' ')} />
              <InfoCard label="Data Identifiability" value={app.identifiability?.replace(/_/g, ' ')} />
              <InfoCard label="Financial Disclosure" value={app.financial_disclosure} wide />
            </Box>
            {app.ethical_codes?.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.75 }}>Ethical Codes</Typography>
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                  {app.ethical_codes.map(c => (
                    <Chip key={c} label={c} size="small" sx={{ fontSize: 11, bgcolor: `${ACCENT}18`, color: ACCENT, fontWeight: 600 }} />
                  ))}
                </Box>
              </Box>
            )}
          </Paper>

          {/* Review Scores */}
          {hasScores && (
            <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScoreIcon sx={{ fontSize: 16, color: ACCENT }} /> Reviewer Scores
                </Typography>
                <Paper elevation={0} sx={{ px: 2, py: 0.75, borderRadius: 2, bgcolor: `${ACCENT}10`, border: `1px solid ${ACCENT}30` }}>
                  <Typography sx={{ fontSize: 18, fontWeight: 800, color: ACCENT, lineHeight: 1 }}>
                    {overallScore(scores)}<Typography component="span" sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 400 }}>/100</Typography>
                  </Typography>
                </Paper>
              </Box>
              {Object.entries(SCORE_LABELS).map(([key, label]) => scores[key] !== undefined && (
                <Box key={key} sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                    <Typography sx={{ fontSize: 12.5 }}>{label}</Typography>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: ACCENT }}>{scores[key]}</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={scores[key]}
                    sx={{ height: 5, borderRadius: 3, bgcolor: 'divider',
                      '& .MuiLinearProgress-bar': { bgcolor: scores[key] >= 70 ? ACCENT : scores[key] >= 50 ? '#f97316' : '#ef4444' } }} />
                </Box>
              ))}
              {app.reviewer_notes && (
                <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: dark ? 'rgba(255,255,255,0.03)' : '#f8fafc', border: '1px solid', borderColor: 'divider' }}>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.5 }}>Reviewer Notes</Typography>
                  <Typography sx={{ fontSize: 13, lineHeight: 1.6 }}>{app.reviewer_notes}</Typography>
                </Box>
              )}
            </Paper>
          )}
        </Box>

        {/* Right sidebar */}
        <Box sx={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* Documents */}
          <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ProtocolIcon sx={{ fontSize: 16, color: ACCENT }} /> Documents
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {(app.documents || []).map(doc => (
                <Box key={doc.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5,
                  p: 1.25, borderRadius: 1.5, border: '1px solid', borderColor: 'divider',
                  '&:hover': { borderColor: ACCENT }, transition: 'all 0.15s', cursor: 'pointer' }}>
                  <ProtocolIcon sx={{ fontSize: 15, color: ACCENT, flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 600 }} noWrap>{doc.name}</Typography>
                    <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{doc.type} · {fmtDate(doc.uploaded)}</Typography>
                  </Box>
                  <DownloadIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                </Box>
              ))}
            </Box>
          </Paper>

          {/* Key dates */}
          <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalIcon sx={{ fontSize: 16, color: ACCENT }} /> Key Dates
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[
                { label: 'Submitted',       value: fmtDate(app.submitted_at) },
                { label: 'Valid Until',     value: app.approved_until ? fmtDate(app.approved_until) : 'Pending approval' },
                { label: 'Funder',          value: app.funder || '—' },
              ].map(({ label, value }) => (
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px dashed', borderColor: 'divider' }}>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{label}</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{value}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>

          {/* Timeline */}
          <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5 }}>Activity Timeline</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {(app.timeline || []).map((event, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                  <Box sx={{ width: 26, height: 26, borderRadius: '50%', bgcolor: dark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {timelineIcons[event.type] || <EthicsIcon sx={{ fontSize: 13, color: 'text.disabled' }} />}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{event.event}</Typography>
                    <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{event.actor} · {fmtDate(event.date)}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
