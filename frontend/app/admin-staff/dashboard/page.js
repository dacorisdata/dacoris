'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';

export default function AdminStaffDashboardRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/admin-staff/overview'); }, [router]);
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress />
    </Box>
  );
}
