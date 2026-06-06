'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, CircularProgress, Alert, Chip, useTheme, Button,
  TextField, InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon, School as CourseIcon, Schedule as TimeIcon,
  Person as InstructorIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import { trainingAPI } from '../../../../lib/api';

const ACCENT = '#1ca7a1';

const LEVEL_COLORS = {
  beginner: '#10b981', intermediate: '#3b82f6', advanced: '#7c3aed',
};

export default function TrainingCatalogPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState([]);
  const [enrolledIds, setEnrolledIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [enrolling, setEnrolling] = useState(null);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    try {
      const [progRes, enrollRes] = await Promise.all([
        trainingAPI.listPrograms({ published_only: true }),
        trainingAPI.myEnrollments(),
      ]);
      setPrograms(progRes.data || []);
      setEnrolledIds(new Set(
        (enrollRes.data || []).filter(e => e.status !== 'dropped').map(e => e.program_id),
      ));
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (programId) => {
    setEnrolling(programId); setError('');
    try {
      await trainingAPI.enroll({ program_id: programId });
      setEnrolledIds(prev => new Set([...prev, programId]));
      setSuccess('Enrolled successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      const detail = e.response?.data?.detail || '';
      if (detail.toLowerCase().includes('already enrolled')) {
        setEnrolledIds(prev => new Set([...prev, programId]));
        setSuccess('You are already enrolled in this programme.');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(detail || 'Enrollment failed');
        try {
          const enrollRes = await trainingAPI.myEnrollments();
          const ids = new Set(
            (enrollRes.data || []).filter(en => en.status !== 'dropped').map(en => en.program_id),
          );
          if (ids.has(programId)) {
            setEnrolledIds(ids);
            setError('');
            setSuccess('Enrolled successfully!');
            setTimeout(() => setSuccess(''), 3000);
          }
        } catch {
          // keep original error
        }
      }
    } finally {
      setEnrolling(null);
    }
  };

  const filtered = programs.filter(p =>
    !search || p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

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
        <Typography sx={{ fontSize: 24, fontWeight: 700 }}>Training Catalog</Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Browse available capacity building programmes</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <TextField
        size="small" placeholder="Search programmes…" value={search}
        onChange={e => setSearch(e.target.value)} sx={{ mb: 3, maxWidth: 360 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment> }}
      />

      {filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          No programmes available yet.
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          {filtered.map(p => {
            const isEnrolled = enrolledIds.has(p.id);
            const levelColor = LEVEL_COLORS[p.level] || ACCENT;
            return (
              <Box key={p.id} sx={{
                bgcolor: 'background.paper', borderRadius: 3, p: 3,
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.05)',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                  <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: `${ACCENT}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CourseIcon sx={{ color: ACCENT }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 0.5 }}>{p.title}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {p.category && <Chip label={p.category} size="small" sx={{ fontSize: 10 }} />}
                      <Chip label={p.level} size="small" sx={{ fontSize: 10, color: levelColor, bgcolor: `${levelColor}15` }} />
                      <Chip label={`${p.cpd_hours} CPD hrs`} size="small" sx={{ fontSize: 10, color: ACCENT, bgcolor: `${ACCENT}12` }} />
                    </Box>
                  </Box>
                </Box>
                {p.description && (
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.5, lineHeight: 1.6 }}>
                    {p.description.length > 160 ? p.description.slice(0, 160) + '…' : p.description}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  {p.instructor_name && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <InstructorIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{p.instructor_name}</Typography>
                    </Box>
                  )}
                  {p.duration_hours && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TimeIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{p.duration_hours} hrs</Typography>
                    </Box>
                  )}
                </Box>
                {(p.learning_outcomes || []).length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    {(p.learning_outcomes || []).slice(0, 2).map((o, i) => (
                      <Typography key={i} sx={{ fontSize: 11, color: 'text.secondary', pl: 1, borderLeft: `2px solid ${ACCENT}40`, mb: 0.5 }}>
                        {o}
                      </Typography>
                    ))}
                  </Box>
                )}
                <Button
                  variant={isEnrolled ? 'outlined' : 'contained'}
                  size="small"
                  disabled={isEnrolled || enrolling === p.id}
                  onClick={() => handleEnroll(p.id)}
                  sx={isEnrolled ? { borderColor: '#10b981', color: '#10b981' } : { bgcolor: ACCENT, '&:hover': { bgcolor: '#15968f' } }}
                >
                  {isEnrolled ? 'Enrolled' : enrolling === p.id ? 'Enrolling…' : 'Enroll'}
                </Button>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
