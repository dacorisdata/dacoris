'use client';

import { Box, Container, Typography, useTheme as useMuiTheme, alpha } from '@mui/material';
import { COLORS } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

const tl = COLORS.teal;
const am = COLORS.amber;
const sl = COLORS.slate;

export default function CompliancePage() {
  const theme = useMuiTheme();
  const dark = theme.palette.mode === 'dark';
  const { t } = useLanguage();
  const compliance = t('complianceTrust');
  const sections = Array.isArray(compliance?.sections) ? compliance.sections : [];

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
          {compliance?.title}
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
          {compliance?.intro}
        </Typography>

        {/* ───── Important compliance statement callout ───── */}
        <Box
          sx={{
            display: 'flex',
            bgcolor: dark ? alpha(am[900], 0.28) : alpha(am[50], 0.9),
            border: `1px solid ${alpha(am[500], 0.3)}`,
            borderRadius: 1.5,
            overflow: 'hidden',
            mb: 5,
          }}
        >
          <Box sx={{ width: 5, bgcolor: am[600], flexShrink: 0 }} />
          <Box sx={{ p: { xs: 2.5, md: 3 } }}>
            <Typography
              sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 1 }}
            >
              {compliance?.noticeTitle}
            </Typography>
            <Typography sx={{ fontSize: 14, lineHeight: 1.75, color: 'text.secondary' }}>
              {compliance?.noticeBody}
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
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: section.bullets || section.table ? 2 : 0 }}>
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

              {section.table && (
                <Box
                  sx={{
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 1.5,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '220px 1fr' },
                      bgcolor: dark ? sl[900] : sl[900],
                    }}
                  >
                    {section.table.headers.map((h, i) => (
                      <Typography
                        key={i}
                        sx={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#fff',
                          px: 2,
                          py: 1.25,
                          display: { xs: i === 1 ? 'none' : 'block', sm: 'block' },
                        }}
                      >
                        {h}
                      </Typography>
                    ))}
                  </Box>
                  {section.table.rows.map((row, ri) => (
                    <Box
                      key={ri}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '220px 1fr' },
                        bgcolor: ri % 2 === 0 ? (dark ? alpha(tl[900], 0.15) : alpha(tl[50], 0.5)) : 'background.paper',
                        borderTop: `1px solid ${theme.palette.divider}`,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 13.5,
                          fontWeight: 700,
                          color: 'text.primary',
                          px: 2,
                          py: 1.5,
                        }}
                      >
                        {row[0]}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: 13.5,
                          lineHeight: 1.7,
                          color: 'text.secondary',
                          px: 2,
                          py: 1.5,
                          pt: { xs: 0, sm: 1.5 },
                        }}
                      >
                        {row[1]}
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
