'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, CircularProgress, useTheme, Button, Chip, Alert } from '@mui/material';
import { RateReview as ReviewIcon, ArrowForward as ArrowIcon } from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../lib/api';

const ACCENT = '#f97316';

const STATUS_META = {
  assigned:    { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6',  label: 'Assigned' },
  in_progress: { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b',  label: 'In Progress' },
  submitted:   { bg: 'rgba(16,185,129,0.12)',  color: '#10b981',  label: 'Submitted' },
  withdrawn:   { bg: 'rgba(100,116,139,0.12)', color: '#64748b',  label: 'Withdrawn' },
};

export default function ExternalReviewsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark  = theme.palette.mode === 'dark';
  const [loading, setLoading]   = useState(true);
  const [reviews, setReviews]   = useState([]);
  const [error, setError]       = useState('');

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin)      { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    try {
      const res = await api.get('/api/grants/reviews/my').catch(() => ({ data: [] }));
      setReviews(res.data || []);
    } catch (e) { setError('Failed to load assigned reviews'); }
    setLoading(false);
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>;

  const pendingCount = reviews.filter(r => ['assigned', 'in_progress'].includes(r.status)).length;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ color: 'text.primary', fontSize: 26, fontWeight: 700, mb: 0.5 }}>My Assigned Reviews</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>Score grant applications assigned to you as an external reviewer</Typography>
        </Box>
        {pendingCount > 0 && (
          <Chip label={`${pendingCount} Pending`} sx={{ bgcolor: `${ACCENT}18`, color: ACCENT, fontWeight: 700, fontSize: 12 }} />
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {reviews.length === 0 ? (
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 6, border: `1px solid ${theme.palette.divider}`, textAlign: 'center', boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)' }}>
          <Box sx={{ width: 72, height: 72, borderRadius: 3, bgcolor: `${ACCENT}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
            <ReviewIcon sx={{ fontSize: 36, color: ACCENT }} />
          </Box>
          <Typography sx={{ color: 'text.primary', fontSize: 18, fontWeight: 600, mb: 1 }}>No reviews assigned yet</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14, maxWidth: 440, mx: 'auto', mb: 1 }}>
            Grant Officers will assign specific proposals for you to review based on your area of expertise.
            You will receive a notification when a new review is assigned.
          </Typography>
          <Typography sx={{ color: 'text.disabled', fontSize: 13, maxWidth: 440, mx: 'auto' }}>
            COI declarations and configurable scoring rubrics will be managed here once the Grant Review module (Phase G3) is deployed.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {reviews.map(r => {
            const sm = STATUS_META[r.status] || STATUS_META.assigned;
            return (
              <Box key={r.id} sx={{
                bgcolor: 'background.paper', borderRadius: 3, p: 3,
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap',
                transition: 'border-color 0.18s', '&:hover': { borderColor: ACCENT },
              }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                    <Typography sx={{ color: 'text.primary', fontWeight: 600, fontSize: 15 }}>
                      {r.proposal_title || `Proposal #${r.proposal_id}`}
                    </Typography>
                    <Chip label={sm.label} size="small" sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 600, fontSize: 11 }} />
                  </Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                    Assigned {fmtDate(r.assigned_at)} · Stage: {r.stage_name || '—'}
                  </Typography>
                </Box>
                <Button variant="outlined" endIcon={<ArrowIcon />} size="small"
                  sx={{ borderColor: ACCENT, color: ACCENT, textTransform: 'none', borderRadius: 2, fontWeight: 600, flexShrink: 0 }}>
                  Open Review
                </Button>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
