'use client';

import { Box } from '@mui/material';
import ResearcherSidebar from '@/components/ResearcherSidebar';

export default function ResearcherLayout({ children }) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <ResearcherSidebar />
      <Box sx={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {children}
      </Box>
    </Box>
  );
}
