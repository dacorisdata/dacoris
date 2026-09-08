'use client';

import { Box, Typography } from '@mui/material';
import { Business as InstitutionIcon } from '@mui/icons-material';
import { useInstitutionLogo } from '../hooks/useInstitutionLogo';
import { SIDEBAR_FONTS } from '../lib/sidebarTheme';

/**
 * Shared institution logo + name for portal sidebars and page headers.
 *
 * variant:
 * - sidebar: compact badge for dark sidebar chrome
 * - page: larger branding row for overview headers
 */
export default function InstitutionBrand({
  variant = 'sidebar',
  accent = '#00ced1',
  accentBg = 'rgba(0,206,209,0.15)',
  accentBorder = 'rgba(0,206,209,0.3)',
  nameColor,
  showIconFallback = true,
  nameOverride,
  sx = {},
}) {
  const { name: authName, logoUrl, hasLogo } = useInstitutionLogo();
  const name = nameOverride || authName;

  if (!name && !hasLogo) return null;

  if (variant === 'page') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.75,
          mb: 1.5,
          ...sx,
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 2,
            border: `1px solid ${accentBorder}`,
            bgcolor: accentBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {logoUrl ? (
            <Box
              component="img"
              src={logoUrl}
              alt={name ? `${name} logo` : 'Institution logo'}
              sx={{ width: '100%', height: '100%', objectFit: 'contain', p: 0.75 }}
            />
          ) : showIconFallback ? (
            <InstitutionIcon sx={{ color: accent, fontSize: 28 }} />
          ) : null}
        </Box>
        {name && (
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                color: accent,
                mb: 0.35,
              }}
            >
              Institution
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: 18, md: 20 },
                fontWeight: 750,
                color: nameColor || 'text.primary',
                lineHeight: 1.25,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {name}
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

  // sidebar variant
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        width: '100%',
        px: 1.25,
        py: logoUrl ? 0.75 : 0.5,
        borderRadius: 1.5,
        bgcolor: accentBg,
        border: `1px solid ${accentBorder}`,
        ...sx,
      }}
    >
      {logoUrl ? (
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1,
            bgcolor: 'rgba(255,255,255,0.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <Box
            component="img"
            src={logoUrl}
            alt={name ? `${name} logo` : 'Institution logo'}
            sx={{ width: '100%', height: '100%', objectFit: 'contain', p: 0.35 }}
          />
        </Box>
      ) : showIconFallback ? (
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: accent, flexShrink: 0 }} />
      ) : null}
      {name && (
        <Typography
          sx={{
            fontSize: SIDEBAR_FONTS.badge,
            fontWeight: 700,
            color: nameColor || accent,
            letterSpacing: 0.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
        >
          {name}
        </Typography>
      )}
    </Box>
  );
}
