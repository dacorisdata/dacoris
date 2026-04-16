'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Button, CircularProgress, Alert, Chip, useTheme } from '@mui/material';
import { RateReview as ReviewIcon, ArrowForward as ArrowIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';

const ACCENT = '#3b82f6';

export default function EthicsReviewsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark  = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);

  useEffect(() => { init(); }, []);
  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin)      { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    setLoading(false);
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ color: 'text.primary', fontSize: 26, fontWeight: 700, mb: 0.5 }}>My Ethics Reviews</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>Applications assigned to you for review</Typography>
      </Box>
      <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 6, border: `1px solid ${theme.palette.divider}`, textAlign: 'center', boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Box sx={{ width: 72, height: 72, borderRadius: 3, bgcolor: `${ACCENT}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
          <ReviewIcon sx={{ fontSize: 36, color: ACCENT }} />
        </Box>
        <Typography sx={{ color: 'text.primary', fontSize: 18, fontWeight: 600, mb: 1 }}>No reviews assigned</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 14, maxWidth: 420, mx: 'auto', mb: 3 }}>
          When the Ethics Committee Chair assigns applications to you for review, they will appear here.
          COI declarations and scoring rubrics will also be managed from this page.
        </Typography>
        <Button variant="outlined" onClick={() => router.push('/admin-staff/ethics/applications')} endIcon={<ArrowIcon />}
          sx={{ borderColor: ACCENT, color: ACCENT, textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>
          View All Applications
        </Button>
      </Box>
    </Box>
  );
}
