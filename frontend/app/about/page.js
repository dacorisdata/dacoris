'use client';
import { Box, Container, Typography, useTheme as useMuiTheme, alpha, Divider } from '@mui/material';
import {
  Hub as HubIcon,
  Storage as StorageIcon,
  AccountTree as WorkflowIcon,
  Visibility as VisibilityIcon,
  Security as ComplianceIcon,
  BarChart as AnalyticsIcon,
  RequestQuote as GrantIcon,
  Biotech as ResearchIcon,
  DatasetLinked as DataIcon,
  Insights as InsightsIcon,
  CheckCircleOutline as CheckIcon,
} from '@mui/icons-material';
import Image from 'next/image';
import { COLORS } from '@/contexts/ThemeContext';

const tl = COLORS.teal;
const sl = COLORS.slate;

const FEATURES = [
  {
    icon: HubIcon,
    title: 'Comprehensive Integration',
    desc: 'Connects external systems (ORCID, Web of Science, HR, Finance) with internal workflows into one seamless platform.',
    color: tl[500],
  },
  {
    icon: StorageIcon,
    title: 'Centralized Data Hub',
    desc: 'Single source of truth for all research information, project management, and institutional knowledge.',
    color: COLORS.blue[600],
  },
  {
    icon: WorkflowIcon,
    title: 'Automated Workflows',
    desc: 'Streamlines approvals, compliance monitoring, and budget management to eliminate manual bottlenecks.',
    color: COLORS.amber[600],
  },
  {
    icon: VisibilityIcon,
    title: 'Real-time Visibility',
    desc: 'Unified dashboards and live reporting give decision-makers an up-to-the-minute view of the research portfolio.',
    color: COLORS.green[600],
  },
  {
    icon: ComplianceIcon,
    title: 'Ethics & Compliance',
    desc: 'Built-in governance tracks ethics submissions, policy adherence, and audit trails across every project.',
    color: COLORS.red[500],
  },
  {
    icon: AnalyticsIcon,
    title: 'Reporting & Analytics',
    desc: 'Rich analytics on outputs, funding trends, and performance metrics power evidence-based strategy.',
    color: COLORS.orange[500],
  },
];

const STATS = [
  { value: 'End-to-End', label: 'Research Lifecycle' },
  { value: 'Unified', label: 'Data Platform' },
  { value: 'Real-time', label: 'Dashboards' },
  { value: 'Automated', label: 'Workflows' },
];

export default function AboutPage() {
  const theme = useMuiTheme();
  const dark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>

      {/* ───── Hero Banner ───── */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          background: dark
            ? `linear-gradient(160deg, ${sl[900]} 0%, ${sl[800]} 50%, ${tl[900]} 100%)`
            : `linear-gradient(160deg, ${tl[700]} 0%, ${tl[600]} 40%, ${tl[700]} 100%)`,
          py: { xs: 7, md: 10 },
          px: 2,
        }}
      >
        {/* Decorative circles */}
        {[
          { size: 420, top: -120, right: -80, opacity: 0.06 },
          { size: 260, bottom: -60, left: -40, opacity: 0.08 },
          { size: 140, top: '40%', left: '55%', opacity: 0.05 },
        ].map((c, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              width: c.size,
              height: c.size,
              borderRadius: '50%',
              border: `2px solid ${alpha('#fff', c.opacity)}`,
              top: c.top,
              right: c.right,
              bottom: c.bottom,
              left: c.left,
              pointerEvents: 'none',
            }}
          />
        ))}

        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <Typography
            variant="overline"
            sx={{
              color: alpha('#fff', 0.7),
              fontSize: { xs: '0.65rem', md: '0.75rem' },
              letterSpacing: '0.15em',
              mb: 1.5,
              display: 'block',
            }}
          >
            Research Management Platform
          </Typography>

          <Typography
            sx={{
              fontSize: { xs: 36, md: 54 },
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              mb: 2,
            }}
          >
            DACORIS
          </Typography>

          <Typography
            sx={{
              fontSize: { xs: 16, md: 22 },
              fontWeight: 500,
              color: alpha('#fff', 0.92),
              mb: 1,
            }}
          >
            Data Conveyance Research Information System
          </Typography>

          <Typography
            sx={{
              fontSize: { xs: 13, md: 15 },
              fontWeight: 400,
              color: alpha('#fff', 0.7),
              fontStyle: 'italic',
              maxWidth: 540,
              mx: 'auto',
            }}
          >
            End-to-End Research Lifecycle Workflow &middot; Research Management
          </Typography>

          {/* Stats row */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: { xs: 3, md: 6 },
              mt: { xs: 4, md: 5 },
              flexWrap: 'wrap',
            }}
          >
            {STATS.map((s, i) => (
              <Box key={i} sx={{ textAlign: 'center' }}>
                <Typography
                  sx={{ fontSize: { xs: 18, md: 22 }, fontWeight: 800, color: '#fff' }}
                >
                  {s.value}
                </Typography>
                <Typography
                  sx={{ fontSize: { xs: 10, md: 12 }, fontWeight: 500, color: alpha('#fff', 0.6), mt: 0.25 }}
                >
                  {s.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ───── About Description ───── */}
      <Container maxWidth="md" sx={{ mt: { xs: -4, md: -5 }, position: 'relative', zIndex: 2, px: { xs: 2, md: 3 } }}>
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: dark
              ? '0 12px 40px rgba(0,0,0,0.35)'
              : '0 12px 40px rgba(0,0,0,0.08)',
            p: { xs: 3, md: 5 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box
              sx={{
                width: 4,
                height: 28,
                borderRadius: 2,
                bgcolor: tl[500],
              }}
            />
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
              About the Platform
            </Typography>
          </Box>

          <Typography
            variant="body1"
            sx={{
              lineHeight: 1.85,
              color: 'text.secondary',
              textAlign: 'justify',
            }}
          >
            DACORIS is a comprehensive Current Research Information System (CRIS) that manages the entire
            research lifecycle – from initial grant proposals and projects through to final research outputs and
            dissemination. It serves as a central hub for an institution's research information, integrating various
            internal workflows (e.g. approvals, reporting) and aggregating data from external and internal sources
            into a single platform. By automating processes and linking systems, DACORIS provides visibility, clarity,
            and efficiency for research operations. Decision-makers (management, IT, research administrators) can
            thus obtain a unified, real-time view of research activities, compliance, and performance across the
            institution.
          </Typography>
        </Box>
      </Container>

      {/* ───── Why DACORIS? ───── */}
      <Box
        sx={{
          mt: 8,
          py: { xs: 6, md: 8 },
          background: dark
            ? `linear-gradient(180deg, ${alpha(tl[900], 0.4)} 0%, ${alpha(sl[900], 0)} 100%)`
            : `linear-gradient(180deg, ${alpha(tl[50], 0.7)} 0%, ${alpha('#fff', 0)} 100%)`,
        }}
      >
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography
              variant="overline"
              sx={{ color: tl[500], letterSpacing: '0.12em', display: 'block', mb: 0.5 }}
            >
              Objectives
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>
              Why DACORIS?
            </Typography>
            <Typography
              variant="body1"
              sx={{ lineHeight: 1.85, color: 'text.secondary', textAlign: 'center', maxWidth: 720, mx: 'auto' }}
            >
              Modern institutions face increasing pressure to meet strict funder reporting requirements,
              uphold ethics and regulatory compliance, manage research data responsibly, reduce
              administrative burden, and provide transparent institutional reporting.
            </Typography>
          </Box>

          <Box
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 4,
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: dark
                ? '0 8px 28px rgba(0,0,0,0.25)'
                : '0 8px 28px rgba(0,0,0,0.06)',
              p: { xs: 3, md: 4 },
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                'Meet strict funder reporting requirements with automated, audit-ready outputs',
                'Uphold ethics and regulatory compliance through built-in governance workflows',
                'Manage research data responsibly with full lifecycle data stewardship',
                'Reduce administrative burden by automating repetitive manual processes',
                'Provide transparent institutional reporting via real-time dashboards',
              ].map((item, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <CheckIcon sx={{ fontSize: 20, color: tl[500], mt: 0.2, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: 14, lineHeight: 1.65, color: 'text.primary' }}>
                    {item}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography
              sx={{ fontSize: 14, lineHeight: 1.8, color: 'text.secondary', textAlign: 'center' }}
            >
              DACORIS addresses these challenges by bringing all these processes into a single, coordinated
              platform, creating a true &ldquo;single source of truth&rdquo; for research and innovation while improving
              efficiency, accountability, and strategic oversight.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* ───── Core Modules ───── */}
      <Container maxWidth="lg" sx={{ mt: 8, px: { xs: 2, md: 3 } }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            variant="overline"
            sx={{ color: tl[500], letterSpacing: '0.12em', display: 'block', mb: 0.5 }}
          >
            Platform
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Core Modules
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr 1fr' },
            gap: 3,
          }}
        >
          {[
            {
              icon: GrantIcon,
              title: 'Grant Application & Management',
              subtitle: 'Manage the Full Grant Lifecycle in One Place',
              color: tl[500],
              gradient: `linear-gradient(135deg, ${tl[600]}, ${tl[700]})`,
            },
            {
              icon: ResearchIcon,
              title: 'Research Management',
              subtitle: 'Coordinate the Entire Research Lifecycle',
               color: tl[500],
              gradient: `linear-gradient(135deg, ${tl[600]}, ${tl[700]})`,
            },
            {
              icon: DataIcon,
              title: 'Data Management',
              subtitle: 'Capture, Curate, Govern, and Reuse Trusted Research Data',
               color: tl[500],
              gradient: `linear-gradient(135deg, ${tl[600]}, ${tl[700]})`,
            },
            {
              icon: InsightsIcon,
              title: 'Analytics, Reporting & Visibility',
              subtitle: 'Transform Institutional Data into Insight, Reporting, and Visibility',
               color: tl[500],
              gradient: `linear-gradient(135deg, ${tl[600]}, ${tl[700]})`,
            },
          ].map((mod, idx) => {
            const Icon = mod.icon;
            return (
              <Box
                key={idx}
                sx={{
                  bgcolor: 'background.paper',
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 4,
                  overflow: 'hidden',
                  transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
                  '&:hover': {
                    borderColor: alpha(mod.color, 0.4),
                    boxShadow: `0 12px 32px ${alpha(mod.color, dark ? 0.18 : 0.12)}`,
                    transform: 'translateY(-3px)',
                  },
                }}
              >
                {/* Colored top bar */}
                <Box
                  sx={{
                    background: mod.gradient,
                    height: 6,
                  }}
                />
                <Box sx={{ p: 3 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(mod.color, dark ? 0.15 : 0.1),
                      mb: 2,
                    }}
                  >
                    <Icon sx={{ fontSize: 26, color: mod.color }} />
                  </Box>
                  <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary', mb: 0.75 }}>
                    {mod.title}
                  </Typography>
                  <Typography sx={{ fontSize: 13, lineHeight: 1.6, color: 'text.secondary' }}>
                    {mod.subtitle}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Container>

      {/* ───── Workflow Diagram ───── */}
      <Container maxWidth="lg" sx={{ mt: 6, px: { xs: 2, md: 3 } }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography
            variant="overline"
            sx={{ color: tl[500], letterSpacing: '0.12em', display: 'block', mb: 0.5 }}
          >
            System Architecture
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
            End-to-End Research Lifecycle Workflow
          </Typography>
        </Box>

        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 4,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: dark
              ? '0 8px 32px rgba(0,0,0,0.25)'
              : '0 8px 32px rgba(0,0,0,0.06)',
            p: { xs: 2, sm: 3, md: 4 },
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Image
            src="/about/lifecycle.png"
            alt="DACORIS Research Lifecycle Workflow Diagram"
            width={900}
            height={560}
            style={{
              width: '100%',
              height: 'auto',
              maxWidth: 900,
              objectFit: 'contain',
            }}
            priority
          />
        </Box>
      </Container>

      {/* ───── Key Features ───── */}
      <Container maxWidth="lg" sx={{ mt: 8, mb: 8, px: { xs: 2, md: 3 } }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            variant="overline"
            sx={{ color: tl[500], letterSpacing: '0.12em', display: 'block', mb: 0.5 }}
          >
            Capabilities
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Key Features
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' },
            gap: 3,
          }}
        >
          {FEATURES.map((f, idx) => {
            const Icon = f.icon;
            return (
              <Box
                key={idx}
                sx={{
                  bgcolor: 'background.paper',
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 3.5,
                  p: 3,
                  transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
                  '&:hover': {
                    borderColor: alpha(f.color, 0.45),
                    boxShadow: `0 8px 24px ${alpha(f.color, dark ? 0.15 : 0.1)}`,
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(f.color, dark ? 0.15 : 0.1),
                    mb: 2,
                  }}
                >
                  <Icon sx={{ fontSize: 22, color: f.color }} />
                </Box>
                <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary', mb: 0.75 }}>
                  {f.title}
                </Typography>
                <Typography sx={{ fontSize: 13, lineHeight: 1.65, color: 'text.secondary' }}>
                  {f.desc}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Container>
    </Box>
  );
}
