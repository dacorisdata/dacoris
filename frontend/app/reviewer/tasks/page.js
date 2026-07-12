'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, CircularProgress, useTheme, Button, Chip, Alert,
} from '@mui/material';
import {
  RateReview as ReviewIcon, ArrowForward as ArrowIcon,
  Description as ProposalIcon, Science as ProjectIcon, Gavel as EthicsIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { isReviewerUser } from '../../../lib/authRouting';
import api from '../../../lib/api';

const LOCALE_MAP = { en: 'en-GB', fr: 'fr-FR', ar: 'ar' };

const TYPE_ICONS = {
  proposal: { icon: ProposalIcon, color: '#16a699' },
  project:  { icon: ProjectIcon, color: '#3b82f6' },
  ethics:   { icon: EthicsIcon, color: '#8b5cf6' },
};

const STATUS_COLORS = {
  pending_signup: { bg: 'rgba(100,116,139,0.12)', color: '#64748b' },
  assigned:       { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6' },
  in_progress:    { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
  submitted:      { bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
  declined:       { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444' },
};

function ReviewCard({ item, onOpen, t, fmtDate, isRtl }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const ACCENT = dark ? '#2dd4bf' : '#0d9488';
  const HOVER  = dark ? '#1ca7a1' : '#0f766e';
  const sc = STATUS_COLORS[item.status] || STATUS_COLORS.assigned;
  const statusKey = item.status === 'assigned' ? 'new' : item.status;
  const statusLabel = t(`reviewer.status.${statusKey}`);
  const ti = TYPE_ICONS[item.review_type] || TYPE_ICONS.proposal;
  const TypeIcon = ti.icon;
  const isActive = ['assigned', 'in_progress'].includes(item.status);

  return (
    <Box sx={{
      bgcolor: 'background.paper', borderRadius: 3, p: 3,
      border: `1px solid ${theme.palette.divider}`,
      boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap',
      transition: 'border-color 0.18s', '&:hover': { borderColor: ACCENT },
    }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75, flexWrap: 'wrap' }}>
          <Chip
            icon={<TypeIcon sx={{ fontSize: '14px !important' }} />}
            label={t(`reviewer.type.${item.review_type}`)}
            size="small"
            sx={{ bgcolor: `${ti.color}18`, color: ti.color, fontWeight: 600, fontSize: 11 }}
          />
          <Chip label={statusLabel} size="small" sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 600, fontSize: 11 }} />
        </Box>
        <Typography sx={{ color: 'text.primary', fontWeight: 600, fontSize: 15, mb: 0.5 }}>
          {item.entity_title || t('reviewer.tasks.untitled')}
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
          {t('reviewer.tasks.assignedDate', { date: fmtDate(item.assigned_at) })}
          {item.started_at && !item.submitted_at && ` · ${t('reviewer.tasks.startedDate', { date: fmtDate(item.started_at) })}`}
          {item.submitted_at && ` · ${t('reviewer.tasks.submittedDate', { date: fmtDate(item.submitted_at) })}`}
        </Typography>
      </Box>
      <Button
        variant={isActive ? 'contained' : 'outlined'}
        endIcon={<ArrowIcon sx={{ transform: isRtl ? 'scaleX(-1)' : 'none' }} />}
        size="small"
        onClick={() => onOpen(item.id)}
        sx={{
          ...(isActive
            ? { bgcolor: ACCENT, '&:hover': { bgcolor: HOVER } }
            : { borderColor: ACCENT, color: ACCENT }),
          textTransform: 'none', borderRadius: 2, fontWeight: 600, flexShrink: 0,
        }}
      >
        {isActive ? t('reviewer.tasks.startReview') : t('reviewer.tasks.view')}
      </Button>
    </Box>
  );
}

export default function ReviewerTasksPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const { t, locale, dir } = useLanguage();
  const isRtl = dir === 'rtl';
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const ACCENT = dark ? '#2dd4bf' : '#0d9488';
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString(LOCALE_MAP[locale] || 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/reviewer/login'); return; }
    if (!isReviewerUser(u)) { router.push('/login'); return; }
    try {
      const res = await api.get('/reviewer/assignments/new');
      setTasks(res.data || []);
    } catch {
      setError(t('reviewer.tasks.errorLoad'));
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, width: '100%' }}>
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ color: 'text.primary', fontSize: 26, fontWeight: 700, mb: 0.5 }}>
          {t('reviewer.tasks.title')}
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
          {t('reviewer.tasks.subtitle')}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {tasks.length === 0 ? (
        <Box sx={{
          bgcolor: 'background.paper', borderRadius: 3, p: 6,
          border: `1px solid ${theme.palette.divider}`, textAlign: 'center',
          boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <Box sx={{
            width: 72, height: 72, borderRadius: 3, bgcolor: `${ACCENT}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2,
          }}>
            <ReviewIcon sx={{ fontSize: 36, color: ACCENT }} />
          </Box>
          <Typography sx={{ fontSize: 18, fontWeight: 600, mb: 1 }}>{t('reviewer.tasks.emptyTitle')}</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14, maxWidth: 440, mx: 'auto' }}>
            {t('reviewer.tasks.emptyBody')}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {tasks.map(task => (
            <ReviewCard
              key={task.id}
              item={task}
              onOpen={(id) => router.push(`/reviewer/reviews/${id}`)}
              t={t}
              fmtDate={fmtDate}
              isRtl={isRtl}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
