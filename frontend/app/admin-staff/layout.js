'use client';

import { Box } from '@mui/material';
import AdminStaffSidebar from '@/components/AdminStaffSidebar';

export default function AdminStaffLayout({ children }) {
  return (
    <Box sx={{ display: 'flex', flex: 1, minHeight: 0, height: '100%', bgcolor: 'background.default' }}>
      <AdminStaffSidebar />
      <Box sx={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {children}
      </Box>
    </Box>
  );
}
