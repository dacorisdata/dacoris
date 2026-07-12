'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box, Typography, CircularProgress, useTheme, Chip, Alert, Tabs, Tab,
} from '@mui/material';
import { RateReview as ReviewIcon } from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { isReviewerUser } from '../../../lib/authRouting';
import api from '../../../lib/api';

const LOCALE_MAP = { en: 'en-GB', fr: 'fr-FR', ar: 'ar' };

const STATUS_COLORS = {
  assigned:    { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6' },
  in_progress: { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
  submitted:   { bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
  declined:    { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444' },
};

const TYPE_SHORT_KEYS = { proposal: 'proposalShort', project: 'projectShort', ethics: 'ethicsShort' };

function ReviewsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenRedirect = searchParams.get('token');
  const { fetchUser } = useAuth();
  const { t, locale } = useLanguage();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const ACCENT = dark ? '#2dd4bf' : '#0d9488';
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0);

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString(LOCALE_MAP[locale] || 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

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
      setError(t('reviewer.reviews.errorLoad'));
    }
    setLoading(false);
  };

  const filtered = reviews.filter(r => {
    if (tab === 0) return ['assigned', 'in_progress'].includes(r.status);
    if (tab === 1) return r.status === 'submitted';
    return true;
  });

  const activeCount = reviews.filter(r => ['assigned', 'in_progress'].includes(r.status)).length;
  const completedCount = reviews.filter(r => r.status === 'submitted').length;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, width: '100%' }}>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: 26, fontWeight: 700, mb: 0.5 }}>{t('reviewer.reviews.title')}</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
          {t('reviewer.reviews.subtitle')}
        </Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} indicatorColor="primary" textColor="primary" sx={{ mb: 3, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 } }}>
        <Tab label={t('reviewer.reviews.tabActive', { count: activeCount })} />
        <Tab label={t('reviewer.reviews.tabCompleted', { count: completedCount })} />
        <Tab label={t('reviewer.reviews.tabAll', { count: reviews.length })} />
      </Tabs>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {filtered.length === 0 ? (
        <Box sx={{
          bgcolor: 'background.paper', borderRadius: 3, p: 6,
          border: `1px solid ${theme.palette.divider}`, textAlign: 'center',
          boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <ReviewIcon sx={{ fontSize: 48, color: ACCENT, mb: 2 }} />
          <Typography sx={{ fontWeight: 600, mb: 1 }}>{t('reviewer.reviews.emptyTitle')}</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filtered.map(r => {
            const sc = STATUS_COLORS[r.status] || STATUS_COLORS.assigned;
            const typeKey = TYPE_SHORT_KEYS[r.review_type] || 'proposalShort';
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
                    <Chip
                      label={t(`reviewer.type.${typeKey}`)}
                      size="small"
                      sx={{ fontSize: 10, fontWeight: 600, bgcolor: `${ACCENT}15`, color: ACCENT }}
                    />
                    <Chip
                      label={t(`reviewer.status.${r.status}`)}
                      size="small"
                      sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 600, fontSize: 10 }}
                    />
                  </Box>
                  <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{r.entity_title}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {t('reviewer.reviews.assignedDate', { date: fmtDate(r.assigned_at) })}
                  </Typography>
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
