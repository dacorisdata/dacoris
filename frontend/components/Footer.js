'use client';

import NextLink from 'next/link';
import Image from 'next/image';
import { Box, Container, Typography, Link, IconButton } from '@mui/material';
import {
  Facebook,
  Twitter,
  Instagram,
  LinkedIn,
  Email,
  Phone,
  LocationOn,
  AccessTime,
} from '@mui/icons-material';
import { COLORS } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

const USEFUL_LINKS = [
  { key: 'linkAbout', href: '/about' },
  { key: 'linkPrivacy', href: '/privacy-policy' },
  { key: 'linkTerms', href: '/terms-of-service' },
  { key: 'linkCompliance', href: '/compliance' },
  { key: 'linkContact', href: '/contact' },
];

const SOCIAL_LINKS = [
  { Icon: Facebook, label: 'Facebook', href: '#' },
  { Icon: Twitter, label: 'Twitter', href: '#' },
  { Icon: Instagram, label: 'Instagram', href: '#' },
  { Icon: LinkedIn, label: 'LinkedIn', href: '#' },
];

const C = COLORS.slate;
const tl = COLORS.teal;

const CONTACT_EMAIL = 'info@dacoris.com';
const CONTACT_PHONE = '+254 732 436 199';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <Box
      component="footer"
      sx={{ bgcolor: C[900], color: '#f1f5f9', position: 'relative', overflow: 'hidden' }}
    >
      {/* Top teal accent bar */}
      <Box sx={{ height: 3, background: 'linear-gradient(90deg, #0f766e 0%, #14b8a6 50%, #0d9488 100%)' }} />

      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 6 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1.2fr' },
            gap: { xs: 5, md: 4 },
          }}
        >
          {/* ── Column 1: logo + description ─────────────────────── */}
          <Box>
            <Box
              sx={{
                display: 'inline-flex',
                bgcolor: '#fff',
                borderRadius: 1.5,
                px: 1.5,
                py: 1,
                mb: 2,
              }}
            >
              <Image src="/logo.png" alt="DACORIS" width={150} height={45} style={{ height: 'auto', width: 150 }} />
            </Box>
            <Typography sx={{ fontSize: '0.8125rem', color: C[300], lineHeight: 1.7, maxWidth: 280 }}>
              {t('footer.description')}
            </Typography>
          </Box>

          {/* ── Column 2: Useful Links ───────────────────────────── */}
          <Box>
            <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#fff', mb: 1 }}>
              {t('footer.usefulLinksHeading')}
            </Typography>
            <Box sx={{ width: 40, height: 2, bgcolor: tl[500], mb: 2.5 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {USEFUL_LINKS.map(({ key, href }) => (
                <Link
                  key={key}
                  component={NextLink}
                  href={href}
                  sx={{
                    fontSize: '0.8125rem', color: C[200], textDecoration: 'none',
                    transition: 'color 0.15s',
                    '&:hover': { color: tl[300] },
                  }}
                >
                  {t(`footer.${key}`)}
                </Link>
              ))}
            </Box>
          </Box>

          {/* ── Column 3: contact + social ───────────────────────── */}
          <Box>
            <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#fff', mb: 1 }}>
              {t('footer.followHeading')}
            </Typography>
            <Box sx={{ width: 40, height: 2, bgcolor: tl[500], mb: 2.5 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <LocationOn sx={{ fontSize: 20, color: tl[400], mt: 0.2, flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.8125rem', color: C[200], lineHeight: 1.6 }}>
                  {t('footer.locationValue')}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Email sx={{ fontSize: 20, color: tl[400], flexShrink: 0 }} />
                <Link
                  href={`mailto:${CONTACT_EMAIL}`}
                  sx={{
                    fontSize: '0.8125rem', color: C[200], textDecoration: 'none',
                    '&:hover': { color: tl[300] },
                  }}
                >
                  {CONTACT_EMAIL}
                </Link>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Phone sx={{ fontSize: 20, color: tl[400], flexShrink: 0 }} />
                <Link
                  href={`tel:${CONTACT_PHONE.replace(/\s+/g, '')}`}
                  sx={{
                    fontSize: '0.8125rem', color: C[200], textDecoration: 'none',
                    '&:hover': { color: tl[300] },
                  }}
                >
                  {CONTACT_PHONE}
                </Link>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <AccessTime sx={{ fontSize: 20, color: tl[400], flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.8125rem', color: C[200] }}>
                  {t('footer.hoursValue')}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.08)', mt: 3, pt: 2.5 }}>
              <Typography sx={{ fontSize: '0.8125rem', color: C[300], mb: 1.5 }}>
                {t('footer.followHeading')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.25 }}>
                {SOCIAL_LINKS.map(({ Icon, label, href }) => (
                  <IconButton
                    key={label}
                    component="a"
                    href={href}
                    aria-label={label}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.08)',
                      color: '#fff',
                      '&:hover': { bgcolor: tl[600] },
                    }}
                  >
                    <Icon sx={{ fontSize: 18 }} />
                  </IconButton>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* ── Bottom bar ───────────────────────────────────────────── */}
        <Box
          sx={{
            borderTop: '1px solid rgba(255,255,255,0.07)',
            mt: 5, pt: 3,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Typography sx={{ fontSize: '0.8125rem', color: '#ffffff' }}>
            {t('common.copyright', { year: new Date().getFullYear() })}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
