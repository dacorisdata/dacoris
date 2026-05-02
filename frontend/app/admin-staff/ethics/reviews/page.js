'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, CircularProgress, useTheme, Button, Chip, Alert } from '@mui/material';
import {
  Gavel as EthicsIcon, ArrowForward as ArrowIcon,
  Person as PersonIcon, Warning as RiskIcon,
  Group as ParticipantIcon, CalendarToday as CalIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../lib/api';

const ACCENT = '#8b5cf6';

const STATUS_META = {
  assigned:    { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6',  label: 'Assigned'        },
  in_progress: { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b',  label: 'In Progress'     },
  submitted:   { bg: 'rgba(16,185,129,0.12)',  color: '#10b981',  label: 'Review Submitted' },
  withdrawn:   { bg: 'rgba(100,116,139,0.12)', color: '#64748b',  label: 'Withdrawn'       },
};

const RISK_COLORS = {
  High:   { bg: 'rgba(239,68,68,0.1)',   color: '#ef4444' },
  Medium: { bg: 'rgba(249,115,22,0.1)',  color: '#f97316' },
  Low:    { bg: 'rgba(16,185,129,0.1)',  color: '#10b981' },
};

const MOCK = [
  {
    id: 1,
    application_title: 'Ethical Review for Genomic Biomarker Study in HIV-positive Adults',
    pi_name: 'Dr. Amina Odhiambo',
    institution: 'University of Nairobi',
    application_type: 'Initial Review',
    participants: 120,
    risk_level: 'High',
    assigned_at: '2026-04-15',
    status: 'assigned',
    stage_name: 'Scientific & Ethical Merit',
    ref: 'ETHICS-APP-2026-001',
  },
  {
    id: 2,
    application_title: 'Ethics Application — Maternal Mental Health in Post-Conflict Regions',
    pi_name: 'Dr. Lena Akello',
    institution: 'Makerere University',
    application_type: 'Full Review',
    participants: 200,
    risk_level: 'Medium',
    assigned_at: '2026-04-18',
    status: 'in_progress',
    stage_name: 'Informed Consent & Privacy Review',
    ref: 'ETHICS-APP-2026-002',
  },
  {
    id: 3,
    application_title: 'Expedited Review — Survey of Food Security Among Urban Poor',
    pi_name: 'Prof. Samuel Weru',
    institution: 'University of Nairobi',
    application_type: 'Expedited Review',
    participants: 350,
    risk_level: 'Low',
    assigned_at: '2026-04-10',
    status: 'submitted',
    stage_name: 'Final Decision',
    ref: 'ETHICS-APP-2026-003',
  },
];

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function EthicsReviewsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark  = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [error,   setError]   = useState('');

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin)      { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    try {
      const res = await api.get('/research/ethics/reviews/my').catch(() => ({ data: [] }));
      const live = res.data || [];
      setReviews(live.length > 0 ? live : MOCK);
    } catch { setReviews(MOCK); }
    setLoading(false);
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress sx={{ color: ACCENT }} />
    </Box>
  );

  const pendingCount = reviews.filter(r => ['assigned', 'in_progress'].includes(r.status)).length;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ color: 'text.primary', fontSize: 26, fontWeight: 700, mb: 0.5 }}>Ethics Reviews</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>Ethics applications assigned to you as a committee reviewer</Typography>
        </Box>
        {pendingCount > 0 && (
          <Chip label={`${pendingCount} Pending`} sx={{ bgcolor: `${ACCENT}18`, color: ACCENT, fontWeight: 700, fontSize: 12 }} />
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {reviews.length === 0 ? (
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 6, border: `1px solid ${theme.palette.divider}`, textAlign: 'center', boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)' }}>
          <Box sx={{ width: 72, height: 72, borderRadius: 3, bgcolor: `${ACCENT}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
            <EthicsIcon sx={{ fontSize: 36, color: ACCENT }} />
          </Box>
          <Typography sx={{ color: 'text.primary', fontSize: 18, fontWeight: 600, mb: 1 }}>No ethics reviews assigned yet</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14, maxWidth: 440, mx: 'auto', mb: 1 }}>
            The Ethics Committee Chair will assign applications for review based on your area of expertise and declaration of no conflict of interest.
          </Typography>
          <Typography sx={{ color: 'text.disabled', fontSize: 13, maxWidth: 440, mx: 'auto' }}>
            COI declarations and scoring rubrics will be presented within the individual review interface once assigned.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {reviews.map(r => {
            const sm = STATUS_META[r.status] || STATUS_META.assigned;
            const rm = RISK_COLORS[r.risk_level] || RISK_COLORS.Medium;
            return (
              <Box key={r.id} sx={{
                bgcolor: 'background.paper', borderRadius: 3, p: 3,
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
                transition: 'border-color 0.18s', '&:hover': { borderColor: ACCENT },
              }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75, flexWrap: 'wrap' }}>
                      <Typography sx={{ color: 'text.primary', fontWeight: 700, fontSize: 15 }}>
                        {r.application_title}
                      </Typography>
                      <Chip label={sm.label} size="small" sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 600, fontSize: 11 }} />
                      <Chip label={`${r.risk_level} Risk`} size="small" sx={{ bgcolor: rm.bg, color: rm.color, fontWeight: 700, fontSize: 10 }} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PersonIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                        <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>{r.pi_name} · {r.institution}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ParticipantIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                        <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>{r.participants} participants · {r.application_type}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                        <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                          Assigned {fmtDate(r.assigned_at)} · Stage: {r.stage_name || '—'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Button variant="outlined" endIcon={<ArrowIcon />} size="small"
                    onClick={() => router.push(`/admin-staff/ethics/reviews/${r.id}`)}
                    sx={{ borderColor: ACCENT, color: ACCENT, textTransform: 'none', borderRadius: 2, fontWeight: 600, flexShrink: 0 }}>
                    Open Review
                  </Button>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
