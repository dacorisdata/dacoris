'use client';

import { Box } from '@mui/material';
import { usePathname } from 'next/navigation';
import ResearcherSidebar from '@/components/ResearcherSidebar';

export default function ResearcherLayout({ children }) {
  const pathname = usePathname();
  const isProjectSetup = /^\/researcher\/projects\/[^/]+$/.test(pathname)
    && !['/researcher/projects/create', '/researcher/projects/new', '/researcher/projects/milestones'].includes(pathname);
  const isEthicsWizard = pathname === '/researcher/ethics/new';
  const isFullHeightWizard = isProjectSetup || isEthicsWizard;

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default', overflow: 'hidden' }}>
      <ResearcherSidebar />
      <Box sx={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        overflow: isFullHeightWizard ? 'hidden' : 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {children}
      </Box>
    </Box>
  );
}
