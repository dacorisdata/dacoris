'use client';

import { Box } from '@mui/material';
import GlobalAdminSidebar from '@/components/GlobalAdminSidebar';

export default function GlobalAdminLayout({ children }) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <GlobalAdminSidebar />
      <Box sx={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {children}
      </Box>
    </Box>
  );
}
