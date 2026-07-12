'use client';

import { Box } from '@mui/material';
import { CacheProvider } from '@emotion/react';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { cacheLtr } from '@/contexts/ThemeContext';

export default function DashboardLayout({ children }) {
  const { dir } = useLanguage();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default', direction: 'ltr' }}>
      {/* Sidebar chrome stays physically fixed regardless of language direction. */}
      <CacheProvider value={cacheLtr}>
        <DashboardSidebar />
      </CacheProvider>
      <Box sx={{ flex: 1, overflow: 'auto', minWidth: 0, direction: dir }}>
        {children}
      </Box>
    </Box>
  );
}
