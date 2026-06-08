'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';

/** Legacy route — external reviewers now use the dedicated reviewer portal. */
export default function ExternalReviewsRedirectPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/reviewer/tasks'); }, [router]);
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <CircularProgress sx={{ color: '#f97316' }} />
    </Box>
  );
}
