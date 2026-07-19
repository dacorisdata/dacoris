'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Box, Container, Typography, Button, alpha } from '@mui/material';
import { ArrowForward as ArrowForwardIcon } from '@mui/icons-material';
import { COLORS } from '@/contexts/ThemeContext';

const tl = COLORS.teal;

export default function Home() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* ───── Hero Section ───── */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          minHeight: { xs: 340, sm: 420, md: 500 },
          display: 'flex',
          alignItems: 'center',
          backgroundImage: `url('/banner.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: { xs: 8, md: 0 } }}>
          <Box sx={{ maxWidth: 640 }}>
            <Typography
              sx={{
                fontSize: { xs: 18, sm: 22, md: 28 },
                fontWeight: 400,
                color: '#fff',
                lineHeight: 1.25,
                mb: 1,
              }}
            >
              An
              <br />
              <Box component="span" sx={{ fontWeight: 800 }}>
                End-to-End Research Lifecycle Workflow and Research Management System
              </Box>
            </Typography>

            <Typography
              sx={{
                fontSize: { xs: 15, md: 18 },
                fontWeight: 400,
                color: alpha('#fff', 0.85),
                mb: 4,
              }}
            >
              a comprehensive Current Research Information System (CRIS)
            </Typography>

            <Button
              component={Link}
              href="/login"
              variant="contained"
              size="large"
              endIcon={<ArrowForwardIcon />}
              sx={{
                bgcolor: '#fff',
                color: tl[700],
                fontWeight: 700,
                px: 4,
                py: 1.4,
                borderRadius: 0,
                '&:hover': {
                  bgcolor: alpha('#fff', 0.9),
                },
              }}
            >
              Get Started
            </Button>
          </Box>
        </Container>
      </Box>

      {/* ───── Introducing Section ───── */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            gap: { xs: 4, md: 8 },
          }}
        >
          <Box
            sx={{
              flex: '1 1 50%',
              width: '100%',
              borderRadius: 0,
              overflow: 'hidden',
              border: (theme) => `1px solid ${theme.palette.divider}`,
              boxShadow: '0 12px 32px rgba(0,0,0,0.08)',
            }}
          >
            <Image
              src="/about/lifecycle.png"
              alt="DACORIS research lifecycle overview"
              width={900}
              height={560}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </Box>

          <Box sx={{ flex: '1 1 50%' }}>
            <Typography
              variant="overline"
              sx={{
                color: tl[500],
                fontWeight: 700,
                letterSpacing: '0.12em',
                display: 'block',
                mb: 1.5,
              }}
            >
              Introducing
            </Typography>

            <Typography
              sx={{
                fontSize: { xs: 22, md: 28 },
                fontWeight: 700,
                color: 'text.primary',
                lineHeight: 1.3,
                mb: 3,
              }}
            >
              Data Conveyance Research Information System{' '}
              <Box component="span" sx={{ color: tl[500] }}>
                DACORIS
              </Box>
            </Typography>

            <Typography
              sx={{
                fontSize: { xs: 14, md: 15.5 },
                lineHeight: 1.85,
                color: 'text.secondary',
              }}
            >
              DACORIS is a comprehensive Current Research Information System (CRIS) that manages
              the entire research lifecycle &ndash; from initial grant proposals and projects
              through to final research outputs and dissemination. It serves as a central hub for
              an institution&apos;s research information, integrating various internal workflows
              (e.g. approvals, reporting) and aggregating data from external and internal sources
              into a single platform. By automating processes and linking systems, DACORIS
              provides visibility, clarity, and efficiency for research operations.
              Decision-makers (management, IT, research administrators) can thus obtain a
              unified, real-time view of research activities, compliance, and performance across
              the institution.
            </Typography>
          </Box>
        </Box>
      </Container>

      {/* ───── Positioning strip ───── */}
      <Box sx={{ bgcolor: tl[700] }}>
        <Container maxWidth="lg" sx={{ py: { xs: 3.5, md: 4 } }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'flex-start', md: 'center' },
              justifyContent: 'space-between',
              gap: { xs: 2.5, md: 4 },
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: 15, md: 16.5 },
                fontWeight: 500,
                color: '#fff',
                lineHeight: 1.6,
                maxWidth: 760,
              }}
            >
              A modular, API-first Research Information Management System (RIMS) purpose-built
              for universities, research institutes, and funding bodies in Africa and beyond.
            </Typography>

            <Button
              component={Link}
              href="/contact?type=demo"
              variant="contained"
              size="large"
              sx={{
                flexShrink: 0,
                bgcolor: '#fff',
                color: tl[700],
                fontWeight: 700,
                px: 4,
                py: 1.2,
                borderRadius: 0,
                whiteSpace: 'nowrap',
                '&:hover': {
                  bgcolor: alpha('#fff', 0.9),
                },
              }}
            >
              Book Demo
            </Button>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
