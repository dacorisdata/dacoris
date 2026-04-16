'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';

export default function InstitutionAdminDashboard() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to overview page
    router.push('/institution-admin/overview');
  }, []);
  
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress />
    </Box>
  );
}
