'use client';

import { Box, Container, Typography, useTheme as useMuiTheme, alpha } from '@mui/material';
import { COLORS } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

const tl = COLORS.teal;

export default function PrivacyPolicyPage() {
  const theme = useMuiTheme();
  const dark = theme.palette.mode === 'dark';
  const { t } = useLanguage();
  const policy = t('privacyPolicy');
  const sections = Array.isArray(policy?.sections) ? policy.sections : [];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
        {/* ───── Title ───── */}
        <Typography
          sx={{
            fontSize: { xs: 26, md: 34 },
            fontWeight: 800,
            color: 'text.primary',
            letterSpacing: '-0.01em',
          }}
        >
          {policy?.title}
        </Typography>

        <Box
          sx={{
            height: 3,
            width: '100%',
            bgcolor: tl[600],
            mt: 1.5,
            mb: 2,
            borderRadius: 1,
          }}
        />

        <Typography
          sx={{
            fontSize: { xs: 13, md: 14 },
            fontStyle: 'italic',
            color: 'text.secondary',
            mb: 3,
          }}
        >
          {policy?.effectiveDate} &nbsp;|&nbsp; {policy?.lastUpdated}
        </Typography>

        {/* ───── Policy scope callout ───── */}
        <Box
          sx={{
            display: 'flex',
            bgcolor: dark ? alpha(tl[900], 0.35) : alpha(tl[50], 0.7),
            border: `1px solid ${alpha(tl[500], 0.25)}`,
            borderRadius: 1.5,
            overflow: 'hidden',
            mb: 5,
          }}
        >
          <Box sx={{ width: 5, bgcolor: tl[600], flexShrink: 0 }} />
          <Box sx={{ p: { xs: 2.5, md: 3 } }}>
            <Typography
              sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 1 }}
            >
              {policy?.scopeTitle}
            </Typography>
            <Typography sx={{ fontSize: 14, lineHeight: 1.75, color: 'text.secondary' }}>
              {policy?.scopeBody}
            </Typography>
          </Box>
        </Box>

        {/* ───── Sections ───── */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sections.map((section) => (
            <Box key={section.title}>
              <Typography
                sx={{
                  fontSize: { xs: 17, md: 19 },
                  fontWeight: 700,
                  color: tl[dark ? 400 : 700],
                  mb: 1.5,
                }}
              >
                {section.title}
              </Typography>

              {section.paragraphs && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {section.paragraphs.map((p, i) => (
                    <Typography
                      key={i}
                      sx={{ fontSize: 14.5, lineHeight: 1.85, color: 'text.secondary' }}
                    >
                      {p}
                    </Typography>
                  ))}
                </Box>
              )}

              {section.bullets && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  {section.bullets.map((b, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 1.25 }}>
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: tl[500],
                          mt: '9px',
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        sx={{ fontSize: 14.5, lineHeight: 1.8, color: 'text.secondary' }}
                      >
                        {b}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
