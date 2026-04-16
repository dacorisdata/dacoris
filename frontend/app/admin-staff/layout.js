'use client';

import { Box } from '@mui/material';
import AdminStaffSidebar from '@/components/AdminStaffSidebar';

export default function AdminStaffLayout({ children }) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AdminStaffSidebar />
      <Box sx={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {children}
      </Box>
    </Box>
  );
}
