'use client';
import { Box, Container, Typography, useTheme as useMuiTheme, alpha } from '@mui/material';
import Image from 'next/image';
import { COLORS } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

const tl = COLORS.teal;
const sl = COLORS.slate;
const am = COLORS.amber;

function SectionHeader({ title, intro }) {
  const words = (title || '').split(' ');
  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        sx={{
          fontSize: { xs: 26, md: 32 },
          fontWeight: 800,
          color: 'text.primary',
          letterSpacing: '-0.01em',
        }}
      >
        <Box component="span" sx={{ color: tl[600], textDecoration: 'underline' }}>{words[0]}</Box>
        {words.length > 1 ? ` ${words.slice(1).join(' ')}` : null}
      </Typography>
      <Box sx={{ height: 3, width: '100%', bgcolor: tl[600], mt: 1.5, mb: 2 }} />
      {intro && (
        <Typography
          sx={{ fontSize: { xs: 14, md: 15.5 }, fontStyle: 'italic', color: 'text.secondary', lineHeight: 1.7 }}
        >
          {intro}
        </Typography>
      )}
    </Box>
  );
}

function DataTable({ table, dark, theme }) {
  if (!table) return null;
  return (
    <Box sx={{ border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '260px 1fr' }, bgcolor: sl[900] }}>
        {table.headers.map((h, i) => (
          <Typography
            key={i}
            sx={{
              fontSize: 13, fontWeight: 700, color: '#fff', px: 2, py: 1.25,
              display: { xs: i === 1 ? 'none' : 'block', sm: 'block' },
            }}
          >
            {h}
          </Typography>
        ))}
      </Box>
      {table.rows.map((row, ri) => (
        <Box
          key={ri}
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '260px 1fr' },
            bgcolor: ri % 2 === 0 ? (dark ? alpha(tl[900], 0.15) : alpha(tl[50], 0.5)) : 'background.paper',
            borderTop: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: 'text.primary', px: 2, py: 1.5 }}>
            {row[0]}
          </Typography>
          <Typography sx={{ fontSize: 13.5, lineHeight: 1.7, color: 'text.secondary', px: 2, py: 1.5, pt: { xs: 0, sm: 1.5 } }}>
            {row[1]}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function AudienceGrid({ rows, dark, theme }) {
  if (!rows?.length) return null;
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
      }}
    >
      {rows.map((row, i) => (
        <Box
          key={i}
          sx={{
            bgcolor: dark ? alpha(tl[900], 0.15) : alpha(tl[50], 0.5),
            border: `1px solid ${theme.palette.divider}`,
            px: 2.5,
            py: 2,
          }}
        >
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', lineHeight: 1.5 }}>
            {row[0]}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function Bullets({ items }) {
  if (!items) return null;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      {items.map((b, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 1.25 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: tl[500], mt: '9px', flexShrink: 0 }} />
          <Typography sx={{ fontSize: 14, lineHeight: 1.8, color: 'text.secondary' }}>{b}</Typography>
        </Box>
      ))}
    </Box>
  );
}

export default function AboutPage() {
  const theme = useMuiTheme();
  const dark = theme.palette.mode === 'dark';
  const { t } = useLanguage();
  const about = t('about');
  const s1 = about?.section1;
  const s2 = about?.section2;
  const arch = about?.architecture;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>

        {/* ═══════════ Section 1 — About ═══════════ */}
        <SectionHeader title={s1?.title} intro={s1?.intro} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 5 }}>
          {s1?.paragraphs?.map((p, i) => (
            <Typography key={i} sx={{ fontSize: 14.5, lineHeight: 1.85, color: 'text.secondary' }}>
              {p}
            </Typography>
          ))}
        </Box>

        {/* Hidden: The institutional problem DACORIS CRIS solves */}
        <Box sx={{ display: 'none' }}>
          <Typography sx={{ fontSize: { xs: 18, md: 20 }, fontWeight: 700, color: tl[dark ? 400 : 700], mb: 1.5 }}>
            {s1?.problemTitle}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 5 }}>
            {s1?.problemParagraphs?.map((p, i) => (
              <Typography key={i} sx={{ fontSize: 14.5, lineHeight: 1.85, color: 'text.secondary' }}>
                {p}
              </Typography>
            ))}
          </Box>
        </Box>

        {/* Hidden: What DACORIS CRIS manages */}
        <Box sx={{ display: 'none' }}>
          <Typography sx={{ fontSize: { xs: 18, md: 20 }, fontWeight: 700, color: tl[dark ? 400 : 700], mb: 1.5 }}>
            {s1?.managesTitle}
          </Typography>
          <Box sx={{ mb: 5 }}>
            <DataTable table={s1?.managesTable} dark={dark} theme={theme} />
          </Box>
        </Box>

        {/* Hidden: A connected research lifecycle */}
        <Box sx={{ display: 'none' }}>
          <Typography sx={{ fontSize: { xs: 18, md: 20 }, fontWeight: 700, color: tl[dark ? 400 : 700], mb: 1.5 }}>
            {s1?.lifecycleTitle}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', sm: `repeat(${s1?.lifecycleStages?.length || 7}, 1fr)` },
              mb: 2.5,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            {s1?.lifecycleStages?.map((stage, i) => (
              <Box
                key={i}
                sx={{
                  bgcolor: i % 2 === 0 ? tl[600] : sl[900],
                  color: '#fff',
                  textAlign: 'center',
                  px: 1.5,
                  py: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderLeft: i === 0 ? 'none' : `1px solid ${alpha('#fff', 0.15)}`,
                }}
              >
                <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', lineHeight: 1.3 }}>
                  {stage.toUpperCase()}
                </Typography>
              </Box>
            ))}
          </Box>
          <Typography sx={{ fontSize: 14.5, lineHeight: 1.85, color: 'text.secondary', mb: 5 }}>
            {s1?.lifecycleParagraph}
          </Typography>
        </Box>

        <Typography sx={{ fontSize: { xs: 18, md: 20 }, fontWeight: 700, color: tl[dark ? 400 : 700], mb: 1.5 }}>
          {s1?.valueTitle}
        </Typography>
        <Box sx={{ mb: 8 }}>
          <Bullets items={s1?.valueBullets} />
        </Box>

        {/* Hidden: Deployment and interoperability */}
        <Box sx={{ display: 'none' }}>
          <Typography sx={{ fontSize: { xs: 18, md: 20 }, fontWeight: 700, color: tl[dark ? 400 : 700], mb: 1.5 }}>
            {s1?.deploymentTitle}
          </Typography>
          <Typography sx={{ fontSize: 14.5, lineHeight: 1.85, color: 'text.secondary', mb: 3 }}>
            {s1?.deploymentParagraph}
          </Typography>

          <Box
            sx={{
              display: 'flex',
              bgcolor: dark ? alpha(am[900], 0.28) : alpha(am[50], 0.9),
              border: `1px solid ${alpha(am[500], 0.3)}`,
              mb: 8,
            }}
          >
            <Box sx={{ width: 5, bgcolor: am[600], flexShrink: 0 }} />
            <Box sx={{ p: { xs: 2.5, md: 3 } }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 1 }}>
                {s1?.principleTitle}
              </Typography>
              <Typography sx={{ fontSize: 14, lineHeight: 1.75, color: 'text.secondary' }}>
                {s1?.principleBody}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* ═══════════ Section 2 — Who We Serve ═══════════ */}
        <SectionHeader title={s2?.title} intro={s2?.intro} />

        <Box sx={{ mb: 5 }}>
          <AudienceGrid rows={s2?.audienceTable?.rows} dark={dark} theme={theme} />
        </Box>

        <Typography sx={{ fontSize: { xs: 18, md: 20 }, fontWeight: 700, color: tl[dark ? 400 : 700], mb: 2 }}>
          {s2?.rolesTitle}
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
            mb: 6,
          }}
        >
          {s2?.roles?.map((role, i) => (
            <Box
              key={i}
              sx={{
                bgcolor: dark ? alpha(tl[900], 0.15) : alpha(tl[50], 0.5),
                border: `1px solid ${theme.palette.divider}`,
                p: 2.5,
              }}
            >
              <Typography
                sx={{
                  fontSize: 13, fontWeight: 700, color: tl[dark ? 400 : 700], letterSpacing: '0.04em',
                  mb: 1, textTransform: 'uppercase', borderBottom: `2px solid ${tl[500]}`,
                  display: 'inline-block', pb: 0.5,
                }}
              >
                {role.title}
              </Typography>
              <Typography sx={{ fontSize: 13.5, lineHeight: 1.75, color: 'text.secondary' }}>
                {role.desc}
              </Typography>
            </Box>
          ))}
        </Box>

        <Typography sx={{ fontSize: { xs: 18, md: 20 }, fontWeight: 700, color: tl[dark ? 400 : 700], mb: 1.5 }}>
          {s2?.ownershipTitle}
        </Typography>
        <Typography sx={{ fontSize: 14.5, lineHeight: 1.85, color: 'text.secondary', mb: 8 }}>
          {s2?.ownershipParagraph}
        </Typography>

        {/* ═══════════ System Architecture (retained, last) ═══════════ */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography
            variant="overline"
            sx={{ color: tl[500], letterSpacing: '0.12em', display: 'block', mb: 0.5 }}
          >
            {arch?.overline}
          </Typography>
          <Typography sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 700, color: 'text.primary' }}>
            {arch?.title}
          </Typography>
        </Box>

        <Box
          sx={{
            border: `1px solid ${theme.palette.divider}`,
            p: { xs: 2, sm: 3, md: 4 },
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Image
            src="/about/lifecycle.png"
            alt={arch?.imageAlt}
            width={900}
            height={560}
            style={{ width: '100%', height: 'auto', maxWidth: 900, objectFit: 'contain' }}
            priority
          />
        </Box>
      </Container>
    </Box>
  );
}
