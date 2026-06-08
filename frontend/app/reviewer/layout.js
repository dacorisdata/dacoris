'use client';

import { Box } from '@mui/material';
import { usePathname } from 'next/navigation';
import ReviewerSidebar from '@/components/ReviewerSidebar';

const PUBLIC_PATHS = ['/reviewer/login', '/reviewer/register'];

export default function ReviewerLayout({ children }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));

  if (isPublic) {
    return <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{children}</Box>;
  }

  return (
    <Box sx={{ display: 'flex', flex: 1, minHeight: 0, height: '100%', bgcolor: 'background.default', overflow: 'hidden' }}>
      <ReviewerSidebar />
      <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </Box>
    </Box>
  );
}
