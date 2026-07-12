'use client';

import { Box } from '@mui/material';
import { CacheProvider } from '@emotion/react';
import { usePathname } from 'next/navigation';
import ReviewerSidebar from '@/components/ReviewerSidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { cacheLtr } from '@/contexts/ThemeContext';

const PUBLIC_PATHS = ['/reviewer/login', '/reviewer/register'];

export default function ReviewerLayout({ children }) {
  const pathname = usePathname();
  const { dir } = useLanguage();
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));

  if (isPublic) {
    return <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{children}</Box>;
  }

  return (
    <Box sx={{ display: 'flex', flex: 1, minHeight: 0, height: '100%', bgcolor: 'background.default', overflow: 'hidden', direction: 'ltr' }}>
      {/* Sidebar chrome stays physically fixed regardless of language direction. */}
      <CacheProvider value={cacheLtr}>
        <ReviewerSidebar />
      </CacheProvider>
      <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', direction: dir }}>
        {children}
      </Box>
    </Box>
  );
}
