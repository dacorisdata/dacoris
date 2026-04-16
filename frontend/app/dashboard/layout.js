'use client';

import { Box } from '@mui/material';
import DashboardSidebar from '@/components/DashboardSidebar';

export default function DashboardLayout({ children }) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <DashboardSidebar />
      <Box sx={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {children}
      </Box>
    </Box>
  );
}
