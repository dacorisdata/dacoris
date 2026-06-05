'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, CircularProgress, Button, useTheme, Alert, Chip,
} from '@mui/material';
import {
  School as TrainingIcon, MenuBook as ProgramsIcon,
  Groups as EnrollmentsIcon, Assignment as NeedsIcon,
  ArrowForward as ArrowIcon, WorkspacePremium as CertIcon,
  Schedule as CpdIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { trainingAPI } from '../../../lib/api';

const ACCENT = '#16a699';

const STAT_CARDS = [
  { key: 'published_programs', label: 'Published Programs', icon: ProgramsIcon, color: ACCENT },
  { key: 'active_enrollments', label: 'Active Enrollments', icon: EnrollmentsIcon, color: '#3b82f6' },
  { key: 'completed_enrollments', label: 'Completed', icon: CertIcon, color: '#10b981' },
  { key: 'pending_needs_assessments', label: 'Pending Needs Reviews', icon: NeedsIcon, color: '#f59e0b' },
  { key: 'total_cpd_hours', label: 'Institution CPD Hours', icon: CpdIcon, color: '#06b6d4', suffix: ' hrs' },
];

const QUICK_LINKS = [
  { label: 'Manage Programs', path: '/admin-staff/training/programs', icon: ProgramsIcon, desc: 'Create and publish training programmes' },
  { label: 'Enrollments', path: '/admin-staff/training/enrollments', icon: EnrollmentsIcon, desc: 'Track learner progress and completions' },
  { label: 'Needs Assessments', path: '/admin-staff/training/needs-assessment', icon: NeedsIcon, desc: 'Review staff training needs submissions' },
];

export default function AdminTrainingOverviewPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin) { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    try {
      const res = await trainingAPI.adminStats();
      setStats(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load training statistics');
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

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <TrainingIcon sx={{ color: ACCENT, fontSize: 28 }} />
          <Typography sx={{ color: 'text.primary', fontSize: 26, fontWeight: 700 }}>
            Capacity Building
          </Typography>
        </Box>
        <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
          Manage institutional training programmes, CPD tracking, and skills development
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' }, gap: 2, mb: 4 }}>
        {STAT_CARDS.map(({ key, label, icon: Icon, color, suffix = '' }) => (
          <Box key={key} sx={{
            bgcolor: 'background.paper', borderRadius: 3, p: 2.5,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.05)',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Icon sx={{ fontSize: 18, color }} />
              <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>{label}</Typography>
            </Box>
            <Typography sx={{ fontSize: 28, fontWeight: 800, color }}>
              {stats?.[key] ?? 0}{suffix}
            </Typography>
          </Box>
        ))}
      </Box>

      <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2, color: 'text.primary' }}>Quick Actions</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        {QUICK_LINKS.map(({ label, path, icon: Icon, desc }) => (
          <Box
            key={path}
            onClick={() => router.push(path)}
            sx={{
              bgcolor: 'background.paper', borderRadius: 3, p: 3, cursor: 'pointer',
              border: `1px solid ${theme.palette.divider}`,
              transition: 'all 0.18s',
              '&:hover': { borderColor: ACCENT, transform: 'translateY(-2px)' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: `${ACCENT}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon sx={{ fontSize: 18, color: ACCENT }} />
                </Box>
                <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{label}</Typography>
              </Box>
              <ArrowIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
            </Box>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{desc}</Typography>
          </Box>
        ))}
      </Box>

      {stats?.total_programs > 0 && (
        <Box sx={{ mt: 4, p: 2.5, bgcolor: `${ACCENT}08`, borderRadius: 2, border: `1px solid ${ACCENT}30` }}>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            <Chip label={`${stats.total_programs} total programmes`} size="small" sx={{ mr: 1, bgcolor: `${ACCENT}20`, color: ACCENT, fontWeight: 600 }} />
            {stats.total_enrollments} total enrollments across all programmes.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
