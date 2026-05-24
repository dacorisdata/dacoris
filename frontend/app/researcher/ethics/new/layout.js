'use client';

import { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';

export default function EthicsApplicationLayout({ children }) {
  return (
    <Box sx={{
      flex: 1,
      minHeight: 0,
      height: '100%',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Suspense fallback={(
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: 0 }}>
          <CircularProgress sx={{ color: '#1ca7a1' }} />
        </Box>
      )}>
        <Box sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {children}
        </Box>
      </Suspense>
    </Box>
  );
}
