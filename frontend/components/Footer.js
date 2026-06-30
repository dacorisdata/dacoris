'use client';

import { Box, Container, Typography, Link, IconButton } from '@mui/material';
import { LinkedIn, Twitter, GitHub, Email, ArrowForward, Verified } from '@mui/icons-material';
import { COLORS } from '@/contexts/ThemeContext';

const C = COLORS.slate;



export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{ bgcolor: C[900], color: '#f1f5f9', position: 'relative', overflow: 'hidden' }}
    >
      {/* Top teal accent bar */}
      <Box sx={{ height: 3, background: 'linear-gradient(90deg, #0f766e 0%, #14b8a6 50%, #0d9488 100%)' }} />

      <Container maxWidth="lg" sx={{ py: 1 }}>
        {/* ── Bottom bar ───────────────────────────────────────────── */}
        <Box
          sx={{
            borderTop: '1px solid rgba(255,255,255,0.07)',
            mt: 6, pt: 3,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography sx={{ fontSize: '0.8125rem', color: C[500] }}>
            © {new Date().getFullYear()} DACORIS. All rights reserved.
          </Typography>
          <Box sx={{ display: 'flex', gap: 3 }}>
            {['Privacy Policy', 'Terms of Service', 'Compliance'].map((label) => (
              <Link
                key={label}
                href="#"
                sx={{
                  fontSize: '0.8125rem', color: C[500], textDecoration: 'none',
                  transition: 'color 0.15s',
                  '&:hover': { color: COLORS.teal[400] },
                }}
              >
                {label}
              </Link>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
