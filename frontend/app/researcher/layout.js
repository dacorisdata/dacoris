'use client';

import { useEffect } from 'react';
import { Box } from '@mui/material';
import { CacheProvider } from '@emotion/react';
import { usePathname, useRouter } from 'next/navigation';
import ResearcherSidebar from '@/components/ResearcherSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cacheLtr } from '@/contexts/ThemeContext';
import { isSupervisorAccount, isSupervisorAllowedPath } from '@/lib/institutionTypes';

export default function ResearcherLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { dir } = useLanguage();
  const isProjectSetup = /\/researcher\/projects\/[^/]+\/setup$/.test(pathname);
  const isEthicsWizard = pathname === '/researcher/ethics/new';
  const isFullHeightWizard = isProjectSetup || isEthicsWizard;

  useEffect(() => {
    if (!user || !isSupervisorAccount(user)) return;
    if (isSupervisorAllowedPath(pathname)) return;
    router.replace('/researcher/postgraduate/supervisor');
  }, [user, pathname, router]);

  return (
    <Box sx={{ display: 'flex', flex: 1, minHeight: 0, height: '100%', bgcolor: 'background.default', overflow: 'hidden', direction: 'ltr' }}>
      {/* Sidebar chrome stays physically fixed regardless of language direction. */}
      <CacheProvider value={cacheLtr}>
        <ResearcherSidebar />
      </CacheProvider>
      <Box sx={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        overflow: isFullHeightWizard ? 'hidden' : 'auto',
        display: 'flex',
        flexDirection: 'column',
        direction: dir,
      }}>
        {children}
      </Box>
    </Box>
  );
}
