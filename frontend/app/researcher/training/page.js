'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, CircularProgress, Alert, useTheme, Button, Chip,
} from '@mui/material';
import {
  School as TrainingIcon, MenuBook as CatalogIcon,
  PlayLesson as CoursesIcon, WorkspacePremium as CertIcon,
  Psychology as SkillsIcon, Assignment as NeedsIcon,
  ArrowForward as ArrowIcon, Schedule as CpdIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { trainingAPI } from '../../../lib/api';

const ACCENT = '#1ca7a1';

const STAT_CARDS = [
  { key: 'active_enrollments', label: 'Active Courses', icon: CoursesIcon, color: ACCENT },
  { key: 'completed_enrollments', label: 'Completed', icon: CertIcon, color: '#10b981' },
  { key: 'certificates', label: 'Certificates', icon: CertIcon, color: '#7c3aed' },
  { key: 'cpd_hours', label: 'CPD Hours', icon: CpdIcon, color: '#0ea5e9', suffix: ' hrs' },
  { key: 'skills_count', label: 'Skills Listed', icon: SkillsIcon, color: '#f59e0b' },
];

const QUICK_LINKS = [
  { label: 'Course Catalog', path: '/researcher/training/catalog', icon: CatalogIcon, desc: 'Browse and enroll in training programmes' },
  { label: 'My Courses', path: '/researcher/training/my-courses', icon: CoursesIcon, desc: 'Track your active and completed courses' },
  { label: 'My Certificates', path: '/researcher/training/certificates', icon: CertIcon, desc: 'View earned certificates and CPD credits' },
  { label: 'Skills Inventory', path: '/researcher/training/skills', icon: SkillsIcon, desc: 'Manage your research skills profile' },
  { label: 'Training Needs', path: '/researcher/training/needs-assessment', icon: NeedsIcon, desc: 'Submit your professional development needs' },
];

export default function ResearcherTrainingPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentEnrollments, setRecentEnrollments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    try {
      const [statsRes, enrollRes] = await Promise.all([
        trainingAPI.learnerStats(),
        trainingAPI.myEnrollments(),
      ]);
      setStats(statsRes.data);
      setRecentEnrollments((enrollRes.data || []).slice(0, 3));
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load training data');
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
          <Typography sx={{ fontSize: 26, fontWeight: 700 }}>Capacity Building</Typography>
        </Box>
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          Professional development, CPD tracking, and skills development for researchers
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

      {recentEnrollments.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 1.5 }}>Recent Courses</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {recentEnrollments.map(e => (
              <Box key={e.id} sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                bgcolor: 'background.paper', borderRadius: 2, p: 2,
                border: `1px solid ${theme.palette.divider}`,
              }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{e.program_title}</Typography>
                <Chip label={e.status} size="small" sx={{ fontSize: 11, textTransform: 'capitalize' }} />
              </Box>
            ))}
          </Box>
          <Button size="small" sx={{ mt: 1, color: ACCENT }} onClick={() => router.push('/researcher/training/my-courses')}>
            View all courses →
          </Button>
        </Box>
      )}

      <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2 }}>Explore</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
        {QUICK_LINKS.map(({ label, path, icon: Icon, desc }) => (
          <Box key={path} onClick={() => router.push(path)} sx={{
            bgcolor: 'background.paper', borderRadius: 3, p: 2.5, cursor: 'pointer',
            border: `1px solid ${theme.palette.divider}`,
            transition: 'all 0.18s',
            '&:hover': { borderColor: ACCENT },
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Icon sx={{ fontSize: 18, color: ACCENT }} />
                <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{label}</Typography>
              </Box>
              <ArrowIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
            </Box>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{desc}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
