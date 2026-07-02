'use client';

import { Box, Typography } from '@mui/material';

export default function PgPageShell({ title, subtitle, children }) {
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, width: '100%', boxSizing: 'border-box' }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: subtitle ? 0.5 : 2 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography sx={{ color: 'text.secondary', mb: 3 }}>{subtitle}</Typography>
      )}
      {children}
    </Box>
  );
}
