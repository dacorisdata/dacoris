'use client';

import { Box } from '@mui/material';
import InstitutionAdminSidebar from '@/components/InstitutionAdminSidebar';

export default function InstitutionAdminLayout({ children }) {
  return (
    <Box sx={{ display: 'flex', flex: 1, minHeight: 0, height: '100%', bgcolor: 'background.default' }}>
      <InstitutionAdminSidebar />
      <Box sx={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {children}
      </Box>
    </Box>
  );
}
