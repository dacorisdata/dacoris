'use client';

import { Box, Container, Typography, Link, IconButton } from '@mui/material';
import { LinkedIn, Twitter, GitHub, Email, ArrowForward, Verified } from '@mui/icons-material';
import { COLORS } from '@/contexts/ThemeContext';

const C = COLORS.slate;

const footerLinks = {
  Product: [
    { label: 'Features', href: '#' },
    { label: 'Pricing', href: '#' },
    { label: 'Security', href: '#' },
    { label: 'Roadmap', href: '#' },
  ],
  Resources: [
    { label: 'Documentation', href: '#' },
    { label: 'API Reference', href: '#' },
    { label: 'Support', href: '#' },
    { label: 'Blog', href: '#' },
  ],
  Company: [
    { label: 'About Us', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Contact', href: '#' },
    { label: 'Partners', href: '#' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Cookie Policy', href: '#' },
    { label: 'Compliance', href: '#' },
  ],
};

const socials = [
  { Icon: LinkedIn, href: '#', label: 'LinkedIn' },
  { Icon: Twitter, href: '#', label: 'Twitter' },
  { Icon: GitHub, href: '#', label: 'GitHub' },
  { Icon: Email, href: '#', label: 'Email' },
];

const badges = ['FAIR Compliant', 'GDPR Aligned', 'ISO 27001'];

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{ bgcolor: C[900], color: '#f1f5f9', position: 'relative', overflow: 'hidden' }}
    >
      {/* Top teal accent bar */}
      <Box sx={{ height: 3, background: 'linear-gradient(90deg, #0f766e 0%, #14b8a6 50%, #0d9488 100%)' }} />

      <Container maxWidth="lg" sx={{ py: 7 }}>
        <Box sx={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>

          {/* ── Brand column ─────────────────────────────────────────── */}
          <Box sx={{ flex: '1 1 270px', minWidth: 240, maxWidth: 310 }}>
            {/* Logomark */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
              <Box
                sx={{
                  width: 36, height: 36, borderRadius: '10px',
                  background: 'linear-gradient(135deg, #0d9488, #14b8a6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 13, color: '#fff', letterSpacing: 0.5,
                  flexShrink: 0,
                }}
              >
                DC
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: 15, letterSpacing: 3, color: '#fff', textTransform: 'uppercase' }}>
                DACORIS
              </Typography>
            </Box>

            <Typography sx={{ fontSize: '0.875rem', color: C[400], lineHeight: 1.75, mb: 3, maxWidth: 268 }}>
              Where Grants, Research, and Data Converge — the unified platform for research-intensive organizations.
            </Typography>

            {/* Social icons */}
            <Box sx={{ display: 'flex', gap: 1, mb: 3.5 }}>
              {socials.map(({ Icon, href, label }) => (
                <IconButton
                  key={label}
                  component="a"
                  href={href}
                  size="small"
                  aria-label={label}
                  sx={{
                    color: C[400],
                    bgcolor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    width: 34, height: 34,
                    transition: 'all 0.2s',
                    '&:hover': {
                      color: COLORS.teal[400],
                      bgcolor: 'rgba(20,184,166,0.12)',
                      borderColor: 'rgba(20,184,166,0.35)',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <Icon sx={{ fontSize: 16 }} />
                </IconButton>
              ))}
            </Box>

            {/* Trust badges */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {badges.map((badge) => (
                <Box
                  key={badge}
                  sx={{
                    display: 'inline-flex', alignItems: 'center', gap: 0.5,
                    px: 1.25, py: 0.4,
                    bgcolor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '6px',
                    fontSize: '0.6875rem', fontWeight: 600,
                    color: C[400], letterSpacing: '0.03em',
                  }}
                >
                  <Verified sx={{ fontSize: 11, color: COLORS.teal[400] }} />
                  {badge}
                </Box>
              ))}
            </Box>
          </Box>

          {/* ── Link columns ─────────────────────────────────────────── */}
          <Box sx={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {Object.entries(footerLinks).map(([section, links]) => (
              <Box key={section} sx={{ flex: '1 1 120px', minWidth: 110 }}>
                <Typography
                  sx={{
                    fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.09em',
                    textTransform: 'uppercase', color: '#fff', mb: 2.5,
                  }}
                >
                  {section}
                </Typography>
                {links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    sx={{
                      display: 'flex', alignItems: 'center',
                      color: C[400],
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      mb: 1.5,
                      transition: 'all 0.18s ease',
                      '& .link-arrow': {
                        fontSize: 11,
                        opacity: 0,
                        transform: 'translateX(-6px)',
                        transition: 'all 0.18s ease',
                        flexShrink: 0,
                      },
                      '&:hover': {
                        color: COLORS.teal[400],
                        pl: '6px',
                        '& .link-arrow': { opacity: 1, transform: 'translateX(0)' },
                      },
                    }}
                  >
                    <ArrowForward className="link-arrow" />
                    {link.label}
                  </Link>
                ))}
              </Box>
            ))}
          </Box>
        </Box>

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
