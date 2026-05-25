'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box, Typography, CircularProgress, useTheme, Button, Chip, Paper, TextField,
} from '@mui/material';
import {
  ArrowBack as BackIcon, Gavel as EthicsIcon,
  Person as PersonIcon, Warning as RiskIcon,
  CalendarToday as CalIcon, CheckCircle as ApproveIcon,
  Cancel as RejectIcon, ChangeCircle as DeferIcon, Article as DocIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../../contexts/AuthContext';
import api from '../../../../../lib/api';

const ACCENT = '#8b5cf6';

const STATUS_META = {
  submitted:    { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'Submitted' },
  under_review: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', label: 'Under Review' },
  deferred:     { bg: 'rgba(249,115,22,0.12)', color: '#f97316', label: 'Deferred' },
};

const RISK_COLORS = {
  High:   { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
  Medium: { bg: 'rgba(249,115,22,0.1)', color: '#f97316' },
  Low:    { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
};

const fmtDate = d => d
  ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const typeLabel = t => (t || 'Review').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const normalizeReview = (data) => {
  if (!data) return null;
  return {
    ...data,
    application_title: data.application_title || data.title,
    pi_name: data.pi_name || data.submitted_by_name || data.pi,
    assigned_at: data.assigned_at || data.submitted_at || data.created_at,
    study_type: data.study_type || data.methodology_summary || '—',
    participant_details: data.participant_details || 'Not specified',
    consent_process: data.consent_process || data.data_handling || 'Not specified',
    risks: data.risks || data.risk_assessment || 'Not specified',
    benefits: data.benefits || data.lay_summary || 'Not specified',
    documents: (data.documents || []).map(d =>
      typeof d === 'string' ? d : d.original_filename
    ),
  };
};

export default function EthicsReviewDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin) { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    await loadReview();
  };

  const loadReview = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/research/ethics/reviews/${params.id}`);
      setReview(normalizeReview(res.data));
    } catch (e) {
      setReview(null);
      setError(e.response?.data?.detail || 'Failed to load ethics review.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  if (!review) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        {error && <Typography sx={{ color: 'error.main', mb: 1 }}>{error}</Typography>}
        <Typography>Ethics review not found</Typography>
        <Button onClick={() => router.push('/admin-staff/ethics/reviews')} sx={{ mt: 2, textTransform: 'none' }}>
          Back to reviews
        </Button>
      </Box>
    );
  }

  const sm = STATUS_META[review.status] || STATUS_META.submitted;
  const rm = RISK_COLORS[review.risk_level] || RISK_COLORS.Medium;
  const canReview = ['submitted', 'under_review', 'deferred'].includes(review.status);

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Button
        startIcon={<BackIcon />}
        onClick={() => router.push('/admin-staff/ethics/reviews')}
        sx={{ mb: 3, textTransform: 'none', color: 'text.secondary' }}
      >
        Back to Ethics Reviews
      </Button>

      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{
          width: 48, height: 48, borderRadius: 2.5, bgcolor: `${ACCENT}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <EthicsIcon sx={{ fontSize: 24, color: ACCENT }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 10, color: ACCENT, fontWeight: 700, letterSpacing: 0.5, mb: 0.5 }}>
            {review.ref}
          </Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 800, mb: 0.75 }}>
            {review.application_title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={sm.label} size="small" sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 600, fontSize: 11 }} />
            <Chip label={`${review.risk_level} Risk`} size="small" sx={{ bgcolor: rm.bg, color: rm.color, fontWeight: 700, fontSize: 10 }} />
            <Chip label={typeLabel(review.application_type)} size="small" sx={{ bgcolor: 'rgba(100,116,139,0.1)', color: '#64748b', fontWeight: 600, fontSize: 10 }} />
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>Study Details</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                { label: 'Study Design', value: review.study_type },
                { label: 'Target Population', value: review.participant_details },
                { label: 'Data Handling & Consent', value: review.consent_process },
                { label: 'Risk Assessment', value: review.risks },
                { label: 'Lay Summary / Benefits', value: review.benefits },
                { label: 'Methodology', value: review.methodology || review.methodology_summary },
              ].map(({ label, value }) => (
                <Box key={label}>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, mb: 0.5 }}>
                    {label.toUpperCase()}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.6 }}>
                    {value || 'Not provided'}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>

          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>Committee Notes</Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              disabled
              value={review.decision_notes || 'No committee notes recorded yet.'}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Paper>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>Key Information</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {[
                { label: 'Principal Investigator', value: review.pi_name, icon: <PersonIcon sx={{ fontSize: 14 }} /> },
                { label: 'Institution / Dept', value: review.institution || '—' },
                { label: 'Linked Project', value: review.project_title || '—' },
                { label: 'Risk Level', value: review.risk_level, icon: <RiskIcon sx={{ fontSize: 14 }} /> },
                { label: 'Submitted', value: fmtDate(review.assigned_at), icon: <CalIcon sx={{ fontSize: 14 }} /> },
                { label: 'Review Stage', value: review.stage_name },
              ].map(({ label, value, icon }) => (
                <Box key={label}>
                  <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.3 }}>
                    {label}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {icon && <Box sx={{ color: 'text.disabled' }}>{icon}</Box>}
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{value || '—'}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>

          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>Supporting Documents</Typography>
            {review.documents?.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {review.documents.map((doc, i) => (
                  <Chip
                    key={i}
                    icon={<DocIcon sx={{ fontSize: 13 }} />}
                    label={doc}
                    size="small"
                    sx={{
                      justifyContent: 'flex-start',
                      borderRadius: 1.5,
                      fontSize: 11,
                      bgcolor: dark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                    }}
                  />
                ))}
              </Box>
            ) : (
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No documents uploaded.</Typography>
            )}
          </Paper>

          {canReview && (
            <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>Review Actions</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>
                Record decisions from the Applications page or use the actions below when workflow is enabled.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<ApproveIcon />}
                  onClick={() => router.push('/admin-staff/ethics/applications')}
                  sx={{ textTransform: 'none', borderRadius: 2, bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
                >
                  Go to Applications
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<DeferIcon />}
                  onClick={() => router.push('/admin-staff/ethics/applications')}
                  sx={{ textTransform: 'none', borderRadius: 2, borderColor: '#8b5cf6', color: '#8b5cf6' }}
                >
                  Record Decision
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<RejectIcon />}
                  onClick={() => router.push('/admin-staff/ethics/applications')}
                  sx={{ textTransform: 'none', borderRadius: 2, borderColor: '#ef4444', color: '#ef4444' }}
                >
                  View All Applications
                </Button>
              </Box>
            </Paper>
          )}
        </Box>
      </Box>
    </Box>
  );
}
