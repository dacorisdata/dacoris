'use client';

import { Box } from '@mui/material';
import GlobalAdminSidebar from '@/components/GlobalAdminSidebar';

export default function GlobalAdminLayout({ children }) {
  return (
    <Box sx={{ display: 'flex', flex: 1, minHeight: 0, height: '100%', bgcolor: 'background.default' }}>
      <GlobalAdminSidebar />
      <Box sx={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {children}
      </Box>
    </Box>
  );
}
