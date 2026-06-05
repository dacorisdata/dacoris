'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, CircularProgress, Alert, Chip, useTheme,
  LinearProgress, Button,
} from '@mui/material';
import { WorkspacePremium as CertIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import { trainingAPI } from '../../../../lib/api';

const ACCENT = '#1ca7a1';

const STATUS_META = {
  active:    { label: 'In Progress', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  completed: { label: 'Completed',   color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  dropped:   { label: 'Dropped',     color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function MyCoursesPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    try {
      const res = await trainingAPI.myEnrollments();
      setEnrollments(res.data || []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (id, progress) => {
    try {
      const payload = { progress_percentage: progress };
      if (progress >= 100) payload.status = 'completed';
      await trainingAPI.updateEnrollment(id, payload);
      await init();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to update progress');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  const active = enrollments.filter(e => e.status === 'active');
  const completed = enrollments.filter(e => e.status === 'completed');

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography sx={{ fontSize: 24, fontWeight: 700 }}>My Courses</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Track your training progress and completions</Typography>
        </Box>
        <Button size="small" variant="outlined" onClick={() => router.push('/researcher/training/catalog')}
          sx={{ borderColor: ACCENT, color: ACCENT }}>
          Browse Catalog
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {enrollments.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, bgcolor: 'background.paper', borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
          <Typography sx={{ color: 'text.secondary', mb: 2 }}>You haven't enrolled in any courses yet.</Typography>
          <Button variant="contained" onClick={() => router.push('/researcher/training/catalog')}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#15968f' } }}>
            Browse Training Catalog
          </Button>
        </Box>
      ) : (
        <>
          {active.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2 }}>In Progress ({active.length})</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {active.map(e => {
                  const sm = STATUS_META[e.status] || STATUS_META.active;
                  return (
                    <Box key={e.id} sx={{
                      bgcolor: 'background.paper', borderRadius: 3, p: 3,
                      border: `1px solid ${theme.palette.divider}`,
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{e.program_title}</Typography>
                          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{e.program_category} · {e.cpd_hours} CPD hrs · Enrolled {fmtDate(e.enrolled_at)}</Typography>
                        </Box>
                        <Chip label={sm.label} size="small" sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 600 }} />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <LinearProgress variant="determinate" value={e.progress_percentage || 0}
                          sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: 'action.hover',
                            '& .MuiLinearProgress-bar': { bgcolor: ACCENT } }} />
                        <Typography sx={{ fontSize: 12, fontWeight: 700, minWidth: 36 }}>{Math.round(e.progress_percentage || 0)}%</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {[25, 50, 75, 100].map(pct => (
                          <Button key={pct} size="small" variant="outlined"
                            disabled={(e.progress_percentage || 0) >= pct}
                            onClick={() => updateProgress(e.id, pct)}
                            sx={{ fontSize: 11, py: 0.25 }}>
                            {pct}%
                          </Button>
                        ))}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}

          {completed.length > 0 && (
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2 }}>Completed ({completed.length})</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {completed.map(e => (
                  <Box key={e.id} sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    bgcolor: 'background.paper', borderRadius: 2, p: 2.5,
                    border: `1px solid ${theme.palette.divider}`,
                  }}>
                    <Box>
                      <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{e.program_title}</Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Completed {fmtDate(e.completed_at)} · {e.cpd_hours} CPD hrs</Typography>
                    </Box>
                    {e.has_certificate && (
                      <Button size="small" startIcon={<CertIcon />} onClick={() => router.push('/researcher/training/certificates')}
                        sx={{ color: '#10b981' }}>
                        Certificate
                      </Button>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
