'use client';

import { Box } from '@mui/material';

export default function ProjectSetupLayout({ children }) {
  return (
    <Box sx={{
      flex: 1,
      minHeight: 0,
      height: '100%',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {children}
    </Box>
  );
}
