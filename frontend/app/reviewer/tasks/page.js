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
import { isReviewerUser } from '../../../lib/authRouting';
import api from '../../../lib/api';

const STATUS_META = {
  pending_signup: { bg: 'rgba(100,116,139,0.12)', color: '#64748b', label: 'Pending Signup' },
  assigned:       { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6',  label: 'New' },
  in_progress:    { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b',  label: 'In Progress' },
  submitted:      { bg: 'rgba(16,185,129,0.12)',  color: '#10b981',  label: 'Submitted' },
  declined:       { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444',  label: 'Declined' },
};

const TYPE_META = {
  proposal: { label: 'Grant Proposal', icon: ProposalIcon, color: '#16a699' },
  project:  { label: 'Research Project', icon: ProjectIcon, color: '#3b82f6' },
  ethics:   { label: 'Ethics Review', icon: EthicsIcon, color: '#8b5cf6' },
};

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

function ReviewCard({ item, onOpen }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const ACCENT = dark ? '#2dd4bf' : '#0d9488';
  const HOVER  = dark ? '#1ca7a1' : '#0f766e';
  const sm = STATUS_META[item.status] || STATUS_META.assigned;
  const tm = TYPE_META[item.review_type] || TYPE_META.proposal;
  const TypeIcon = tm.icon;
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
            label={tm.label}
            size="small"
            sx={{ bgcolor: `${tm.color}18`, color: tm.color, fontWeight: 600, fontSize: 11 }}
          />
          <Chip label={sm.label} size="small" sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 600, fontSize: 11 }} />
        </Box>
        <Typography sx={{ color: 'text.primary', fontWeight: 600, fontSize: 15, mb: 0.5 }}>
          {item.entity_title || 'Untitled'}
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
          Assigned {fmtDate(item.assigned_at)}
          {item.started_at && !item.submitted_at && ` · Started ${fmtDate(item.started_at)}`}
          {item.submitted_at && ` · Submitted ${fmtDate(item.submitted_at)}`}
        </Typography>
      </Box>
      <Button
        variant={isActive ? 'contained' : 'outlined'}
        endIcon={<ArrowIcon />}
        size="small"
        onClick={() => onOpen(item.id)}
        sx={{
          ...(isActive
            ? { bgcolor: ACCENT, '&:hover': { bgcolor: HOVER } }
            : { borderColor: ACCENT, color: ACCENT }),
          textTransform: 'none', borderRadius: 2, fontWeight: 600, flexShrink: 0,
        }}
      >
        {isActive ? 'Start Review' : 'View'}
      </Button>
    </Box>
  );
}

export default function ReviewerTasksPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const ACCENT = dark ? '#2dd4bf' : '#0d9488';
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/reviewer/login'); return; }
    if (!isReviewerUser(u)) { router.push('/login'); return; }
    try {
      const res = await api.get('/reviewer/assignments/new');
      setTasks(res.data || []);
    } catch {
      setError('Failed to load review tasks');
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
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ color: 'text.primary', fontSize: 26, fontWeight: 700, mb: 0.5 }}>
          New Tasks to Review
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
          Proposals, projects, and ethics applications awaiting your review
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
          <Typography sx={{ fontSize: 18, fontWeight: 600, mb: 1 }}>No pending reviews</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14, maxWidth: 440, mx: 'auto' }}>
            When you are assigned to review a proposal, project, or ethics application,
            you will receive an email notification and the task will appear here.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {tasks.map(t => (
            <ReviewCard key={t.id} item={t} onOpen={(id) => router.push(`/reviewer/reviews/${id}`)} />
          ))}
        </Box>
      )}
    </Box>
  );
}
