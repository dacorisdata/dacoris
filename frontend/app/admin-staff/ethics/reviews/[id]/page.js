'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Box, Typography, CircularProgress, useTheme, Button, Chip, Paper, Divider, TextField, Slider } from '@mui/material';
import {
  ArrowBack as BackIcon, Gavel as EthicsIcon,
  Person as PersonIcon, Group as ParticipantIcon,
  Warning as RiskIcon, CalendarToday as CalIcon,
  CheckCircle as ApproveIcon, Cancel as RejectIcon,
  ChangeCircle as DeferIcon, Article as DocIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../../contexts/AuthContext';
import api from '../../../../../lib/api';

const ACCENT = '#8b5cf6';

const STATUS_META = {
  assigned:    { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', label: 'Assigned' },
  in_progress: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'In Progress' },
  submitted:   { bg: 'rgba(16,185,129,0.12)', color: '#10b981', label: 'Review Submitted' },
};

const RISK_COLORS = {
  High:   { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
  Medium: { bg: 'rgba(249,115,22,0.1)', color: '#f97316' },
  Low:    { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
};

const MOCK = {
  id: 1,
  ref: 'ETHICS-APP-2026-001',
  application_title: 'Ethical Review for Genomic Biomarker Study in HIV-positive Adults',
  pi_name: 'Dr. Amina Odhiambo',
  institution: 'University of Nairobi',
  application_type: 'Initial Review',
  participants: 120,
  risk_level: 'High',
  assigned_at: '2026-04-15',
  status: 'in_progress',
  stage_name: 'Scientific & Ethical Merit',
  study_type: 'Observational Cohort',
  participant_details: 'HIV-positive adults aged 18-65, recruited from 5 major Kenyan hospitals',
  consent_process: 'Written informed consent with separate consent for genetic data storage',
  risks: 'Minimal physical risk from blood draw; potential psychosocial risk from HIV status disclosure',
  benefits: 'Contribution to improved treatment protocols; potential for personalized medicine',
  documents: ['Protocol_v2.pdf', 'Consent_Form_EN.pdf', 'Consent_Form_SW.pdf', 'PI_CV.pdf'],
  review_notes: '',
  scores: {
    scientific_merit: 75,
    ethical_design: 80,
    informed_consent: 85,
    risk_benefit: 78,
    privacy: 82,
  },
};

const CRITERIA = [
  { key: 'scientific_merit', label: 'Scientific Merit & Validity' },
  { key: 'ethical_design', label: 'Ethical Study Design' },
  { key: 'informed_consent', label: 'Informed Consent Process' },
  { key: 'risk_benefit', label: 'Risk–Benefit Ratio' },
  { key: 'privacy', label: 'Privacy & Data Protection' },
];

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const overallScore = scores => Math.round(Object.values(scores).reduce((s, v) => s + v, 0) / Object.values(scores).length);

export default function EthicsReviewDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState(null);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin) { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    try {
      const res = await api.get(`/research/ethics/reviews/${params.id}`).catch(() => null);
      setReview(res?.data || MOCK);
    } catch { setReview(MOCK); }
    setLoading(false);
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress sx={{ color: ACCENT }} />
    </Box>
  );

  if (!review) return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography>Ethics review not found</Typography>
    </Box>
  );

  const sm = STATUS_META[review.status] || STATUS_META.assigned;
  const rm = RISK_COLORS[review.risk_level] || RISK_COLORS.Medium;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Button startIcon={<BackIcon />} onClick={() => router.push('/admin-staff/ethics/reviews')}
        sx={{ mb: 3, textTransform: 'none', color: 'text.secondary' }}>
        Back to Ethics Reviews
      </Button>

      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ width: 48, height: 48, borderRadius: 2.5, bgcolor: `${ACCENT}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <EthicsIcon sx={{ fontSize: 24, color: ACCENT }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 10, color: ACCENT, fontWeight: 700, letterSpacing: 0.5 }}>{review.ref}</Typography>
            <Typography sx={{ fontSize: 22, fontWeight: 800 }}>{review.application_title}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Chip label={sm.label} size="small" sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 600, fontSize: 11 }} />
            <Chip label={`${review.risk_level} Risk`} size="small" sx={{ bgcolor: rm.bg, color: rm.color, fontWeight: 700, fontSize: 10 }} />
            <Chip label={review.application_type} size="small" sx={{ bgcolor: 'rgba(100,116,139,0.1)', color: '#64748b', fontWeight: 600, fontSize: 10 }} />
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Study Details */}
          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>Study Details</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, mb: 0.5 }}>STUDY TYPE</Typography>
                <Typography sx={{ fontSize: 13 }}>{review.study_type}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, mb: 0.5 }}>PARTICIPANT DETAILS</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{review.participant_details}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, mb: 0.5 }}>CONSENT PROCESS</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{review.consent_process}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, mb: 0.5 }}>RISKS</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{review.risks}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, mb: 0.5 }}>BENEFITS</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{review.benefits}</Typography>
              </Box>
            </Box>
          </Paper>

          {/* Review Scoring */}
          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5 }}>Review Scoring</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2.5 }}>
              Score each criterion from 0 (Unacceptable) to 100 (Excellent)
            </Typography>
            {CRITERIA.map(c => (
              <Box key={c.key} sx={{ mb: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{c.label}</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 800, color: ACCENT }}>{review.scores[c.key]}</Typography>
                </Box>
                <Slider value={review.scores[c.key]} disabled min={0} max={100}
                  sx={{ color: ACCENT, py: 1 }} />
              </Box>
            ))}
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: `${ACCENT}08`, border: `1px solid ${ACCENT}30`, mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Overall Score</Typography>
                <Typography sx={{ fontSize: 24, fontWeight: 800, color: ACCENT }}>
                  {overallScore(review.scores)}<Typography component="span" sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 400 }}>/100</Typography>
                </Typography>
              </Box>
            </Paper>
          </Paper>

          {/* Review Notes */}
          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>Review Notes & Recommendations</Typography>
            <TextField fullWidth multiline rows={4} disabled
              value={review.review_notes || 'No notes provided yet.'}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          </Paper>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Key Info */}
          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>Key Information</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {[
                { label: 'Principal Investigator', value: review.pi_name, icon: <PersonIcon sx={{ fontSize: 14 }} /> },
                { label: 'Institution', value: review.institution },
                { label: 'Participants', value: review.participants, icon: <ParticipantIcon sx={{ fontSize: 14 }} /> },
                { label: 'Risk Level', value: review.risk_level, icon: <RiskIcon sx={{ fontSize: 14 }} /> },
                { label: 'Assigned', value: fmtDate(review.assigned_at), icon: <CalIcon sx={{ fontSize: 14 }} /> },
                { label: 'Stage', value: review.stage_name },
              ].map(({ label, value, icon }) => (
                <Box key={label}>
                  <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.3 }}>{label}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {icon && <Box sx={{ color: 'text.disabled' }}>{icon}</Box>}
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{value}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>

          {/* Documents */}
          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>Supporting Documents</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {review.documents?.map((doc, i) => (
                <Chip key={i} icon={<DocIcon sx={{ fontSize: 13 }} />} label={doc} size="small"
                  sx={{ justifyContent: 'flex-start', borderRadius: 1.5, fontSize: 11, bgcolor: dark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }} />
              ))}
            </Box>
          </Paper>

          {/* Actions */}
          {review.status !== 'submitted' && (
            <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>Review Actions</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button fullWidth variant="contained" startIcon={<ApproveIcon />}
                  sx={{ textTransform: 'none', borderRadius: 2, bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}>
                  Recommend Approval
                </Button>
                <Button fullWidth variant="outlined" startIcon={<DeferIcon />}
                  sx={{ textTransform: 'none', borderRadius: 2, borderColor: '#8b5cf6', color: '#8b5cf6' }}>
                  Defer
                </Button>
                <Button fullWidth variant="outlined" startIcon={<RejectIcon />}
                  sx={{ textTransform: 'none', borderRadius: 2, borderColor: '#ef4444', color: '#ef4444' }}>
                  Recommend Rejection
                </Button>
              </Box>
            </Paper>
          )}
        </Box>
      </Box>
    </Box>
  );
}
