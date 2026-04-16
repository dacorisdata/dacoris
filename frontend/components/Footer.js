'use client';

import { Box, Container, Typography, Link, IconButton } from '@mui/material';
import { LinkedIn, Twitter, GitHub, Email } from '@mui/icons-material';
import Image from 'next/image';
import { COLORS } from '@/contexts/ThemeContext';

const C = COLORS.slate;

export default function Footer() {
  const footerLinks = {
    product: [
      { label: 'Features', href: '#' },
      { label: 'Pricing', href: '#' },
      { label: 'Security', href: '#' },
      { label: 'Roadmap', href: '#' }
    ],
    resources: [
      { label: 'Documentation', href: '#' },
      { label: 'API Reference', href: '#' },
      { label: 'Support', href: '#' },
      { label: 'Blog', href: '#' }
    ],
    company: [
      { label: 'About Us', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: '#' },
      { label: 'Partners', href: '#' }
    ],
    legal: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Cookie Policy', href: '#' },
      { label: 'Compliance', href: '#' }
    ]
  };

  return (
    <Box component="footer" sx={{ bgcolor: C[800], color: '#f1f5f9', py: 6, mt: 8 }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {/* Logo and Description */}
          <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
            <Box sx={{ mb: 2 }}>
              <Image 
                src="/logo.png" 
                alt="DACORIS Logo" 
                width={180} 
                height={45}
              />
            </Box>
            <Typography variant="body2" sx={{ color: C[400], mb: 2 }}>
              Where Grants, Research and Data Converge
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {[LinkedIn, Twitter, GitHub, Email].map((Icon, i) => (
                <IconButton key={i} size="small" sx={{ color: COLORS.teal[500], '&:hover': { color: COLORS.teal[400] } }}>
                  <Icon fontSize="small" />
                </IconButton>
              ))}
            </Box>
          </Box>

          {Object.entries(footerLinks).map(([section, links]) => (
            <Box key={section} sx={{ flex: '1 1 150px', minWidth: '140px' }}>
              <Typography
                variant="overline"
                sx={{ color: C[400], mb: 2, display: 'block', fontSize: '0.6875rem', letterSpacing: '0.08em' }}
              >
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </Typography>
              {links.map((link, i) => (
                <Link
                  key={i}
                  href={link.href}
                  sx={{
                    display: 'block',
                    color: C[400],
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    mb: 1.5,
                    transition: 'color 0.15s',
                    '&:hover': { color: COLORS.teal[400] },
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </Box>
          ))}
        </Box>

        {/* Copyright */}
        <Box sx={{ borderTop: `1px solid ${C[700]}`, mt: 4, pt: 3, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: C[500] }}>
            © {new Date().getFullYear()} DACORIS. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
