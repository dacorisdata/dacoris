'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box, Typography, CircularProgress, useTheme, Chip, Alert, Tabs, Tab,
} from '@mui/material';
import { RateReview as ReviewIcon } from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { isReviewerUser } from '../../../lib/authRouting';
import api from '../../../lib/api';

const STATUS_META = {
  assigned:    { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6',  label: 'Assigned' },
  in_progress: { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b',  label: 'In Progress' },
  submitted:   { bg: 'rgba(16,185,129,0.12)',  color: '#10b981',  label: 'Submitted' },
  declined:    { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444',  label: 'Declined' },
};

const TYPE_LABELS = { proposal: 'Proposal', project: 'Project', ethics: 'Ethics' };

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

function ReviewsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenRedirect = searchParams.get('token');
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const ACCENT = dark ? '#2dd4bf' : '#0d9488';
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/reviewer/login'); return; }
    if (!isReviewerUser(u)) { router.push('/login'); return; }
    try {
      const res = await api.get('/reviewer/assignments/my');
      setReviews(res.data || []);
      if (tokenRedirect) {
        const match = (res.data || []).find(r => r.invitation_token === tokenRedirect);
        if (match) router.replace(`/reviewer/reviews/${match.id}`);
      }
    } catch {
      setError('Failed to load reviews');
    }
    setLoading(false);
  };

  const filtered = reviews.filter(r => {
    if (tab === 0) return ['assigned', 'in_progress'].includes(r.status);
    if (tab === 1) return r.status === 'submitted';
    return true;
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: 26, fontWeight: 700, mb: 0.5 }}>My Reviews</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
          All review assignments — active and completed
        </Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} indicatorColor="primary" textColor="primary" sx={{ mb: 3, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 } }}>
        <Tab label={`Active (${reviews.filter(r => ['assigned', 'in_progress'].includes(r.status)).length})`} />
        <Tab label={`Completed (${reviews.filter(r => r.status === 'submitted').length})`} />
        <Tab label={`All (${reviews.length})`} />
      </Tabs>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {filtered.length === 0 ? (
        <Box sx={{
          bgcolor: 'background.paper', borderRadius: 3, p: 6,
          border: `1px solid ${theme.palette.divider}`, textAlign: 'center',
          boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <ReviewIcon sx={{ fontSize: 48, color: ACCENT, mb: 2 }} />
          <Typography sx={{ fontWeight: 600, mb: 1 }}>No reviews in this category</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filtered.map(r => {
            const sm = STATUS_META[r.status] || STATUS_META.assigned;
            return (
              <Box
                key={r.id}
                onClick={() => router.push(`/reviewer/reviews/${r.id}`)}
                sx={{
                  bgcolor: 'background.paper', borderRadius: 2, p: 2.5,
                  border: `1px solid ${theme.palette.divider}`, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2,
                  '&:hover': { borderColor: ACCENT },
                }}
              >
                <Box>
                  <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                    <Chip label={TYPE_LABELS[r.review_type] || r.review_type} size="small"
                      sx={{ fontSize: 10, fontWeight: 600, bgcolor: `${ACCENT}15`, color: ACCENT }} />
                    <Chip label={sm.label} size="small" sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 600, fontSize: 10 }} />
                  </Box>
                  <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{r.entity_title}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Assigned {fmtDate(r.assigned_at)}</Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

export default function ReviewerReviewsPage() {
  return (
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><CircularProgress /></Box>}>
      <ReviewsContent />
    </Suspense>
  );
}
