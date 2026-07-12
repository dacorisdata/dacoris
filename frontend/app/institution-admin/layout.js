'use client';

import { Box } from '@mui/material';
import { CacheProvider } from '@emotion/react';
import InstitutionAdminSidebar from '@/components/InstitutionAdminSidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { cacheLtr } from '@/contexts/ThemeContext';

export default function InstitutionAdminLayout({ children }) {
  const { dir } = useLanguage();

  return (
    <Box sx={{ display: 'flex', flex: 1, minHeight: 0, height: '100%', bgcolor: 'background.default', direction: 'ltr' }}>
      {/* Sidebar chrome stays physically fixed regardless of language direction. */}
      <CacheProvider value={cacheLtr}>
        <InstitutionAdminSidebar />
      </CacheProvider>
      <Box sx={{ flex: 1, overflow: 'auto', minWidth: 0, direction: dir }}>
        {children}
      </Box>
    </Box>
  );
}
