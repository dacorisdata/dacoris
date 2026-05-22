'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, CircularProgress, Alert,
  Chip, Divider, LinearProgress, useTheme,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Grid, Card as MuiCard, CardContent,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  AccountBalance as FinanceIcon,
  Science as EthicsIcon,
  Folder as ProjectsIcon,
  Storage as DataIcon,
  BarChart as AnalyticsIcon,
  RateReview as ReviewIcon,
  Person as PersonIcon,
  ArrowForward as ArrowIcon,
  CheckCircle as CheckIcon,
  Schedule as PendingIcon,
  Warning as WarningIcon,
  EmojiEvents as AwardsIcon,
  Gavel as ComplianceIcon,
  Groups as TeamsIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../lib/api';

const ROLE_CONFIG = {
  GRANT_MANAGER: {
    label: 'Grant Manager', color: '#16a699',
    description: 'Manage the full grant lifecycle — from opportunity discovery to award closeout.',
    modules: [
      { label: 'Active Opportunities', icon: AssignmentIcon, color: '#16a699', bg: 'rgba(22,166,153,0.1)', path: '/admin-staff/grants/opportunities', stat: 'opportunities' },
      { label: 'Open Proposals',       icon: ProjectsIcon,   color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  path: '/admin-staff/grants/proposals',     stat: 'proposals' },
      { label: 'Active Awards',        icon: AwardsIcon,     color: '#10b981', bg: 'rgba(16,185,129,0.1)',  path: '/admin-staff/grants/awards',        stat: 'awards' },
    ],
    actions: [
      { label: 'Post New Opportunity',   path: '/admin-staff/grants/opportunities', icon: AssignmentIcon },
      { label: 'Review Proposals',       path: '/admin-staff/grants/proposals',     icon: ProjectsIcon },
      { label: 'Manage Awards',          path: '/admin-staff/grants/awards',        icon: AwardsIcon },
      { label: 'Analytics Dashboard',    path: '/admin-staff/analytics',            icon: AnalyticsIcon },
    ],
  },
  FINANCE_OFFICER: {
    label: 'Finance Officer', color: '#16a699',
    description: 'Oversee budgets, disbursements, and financial compliance across all active awards.',
    modules: [
      { label: 'Active Budgets',       icon: FinanceIcon,    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  path: '/admin-staff/finance/budgets',       stat: 'budgets' },
      { label: 'Pending Disbursements',icon: PendingIcon,    color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   path: '/admin-staff/finance/disbursements',  stat: 'disbursements' },
      { label: 'Expense Reports',      icon: ComplianceIcon, color: '#10b981', bg: 'rgba(16,185,129,0.1)', path: '/admin-staff/finance/expenses',       stat: 'expenses' },
    ],
    actions: [
      { label: 'Review Disbursements', path: '/admin-staff/finance/disbursements', icon: FinanceIcon },
      { label: 'Approve Expenses',     path: '/admin-staff/finance/expenses',      icon: ComplianceIcon },
      { label: 'Budget Overview',      path: '/admin-staff/finance/budgets',       icon: AnalyticsIcon },
      { label: 'View Awards',          path: '/admin-staff/grants/awards',         icon: AwardsIcon },
    ],
  },
  ETHICS_COMMITTEE_MEMBER: {
    label: 'Ethics Committee', color: '#16a699',
    description: 'Review ethics applications, manage IRB workflows, and issue committee decisions.',
    modules: [
      { label: 'Pending Applications', icon: EthicsIcon,   color: '#10b981', bg: 'rgba(16,185,129,0.1)',  path: '/admin-staff/ethics/applications', stat: 'pending_ethics' },
      { label: 'My Assigned Reviews',  icon: ReviewIcon,   color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  path: '/admin-staff/ethics/reviews',      stat: 'assigned_reviews' },
      { label: 'Decisions Issued',     icon: CheckIcon,    color: '#16a699', bg: 'rgba(22,166,153,0.1)',  path: '/admin-staff/ethics/decisions',    stat: 'decisions' },
    ],
    actions: [
      { label: 'Review Applications',  path: '/admin-staff/ethics/applications', icon: EthicsIcon },
      { label: 'My Reviews',           path: '/admin-staff/ethics/reviews',      icon: ReviewIcon },
      { label: 'Issue Decisions',      path: '/admin-staff/ethics/decisions',    icon: CheckIcon },
      { label: 'Browse Projects',      path: '/admin-staff/research/projects',   icon: ProjectsIcon },
    ],
  },
  DATA_STEWARD: {
    label: 'Data Steward', color: '#16a699',
    description: 'Curate datasets, manage data access policies, and oversee repository quality.',
    modules: [
      { label: 'Managed Datasets', icon: DataIcon,     color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)',  path: '/admin-staff/data/datasets',  stat: 'datasets' },
      { label: 'Pending Access',   icon: PendingIcon,  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  path: '/admin-staff/data/datasets',  stat: 'pending_access' },
      { label: 'Active Projects',  icon: ProjectsIcon, color: '#10b981', bg: 'rgba(16,185,129,0.1)', path: '/admin-staff/research/projects', stat: 'projects' },
    ],
    actions: [
      { label: 'Manage Datasets',     path: '/admin-staff/data/datasets',        icon: DataIcon },
      { label: 'Research Projects',   path: '/admin-staff/research/projects',    icon: ProjectsIcon },
      { label: 'Access Requests',     path: '/admin-staff/data/datasets',        icon: ComplianceIcon },
    ],
  },
  DATA_ENGINEER: {
    label: 'Data Engineer', color: '#16a699',
    description: 'Build and manage data pipelines, ETL workflows, and analytics infrastructure.',
    modules: [
      { label: 'Data Pipelines',   icon: DataIcon,      color: '#06b6d4', bg: 'rgba(6,182,212,0.1)',   path: '/admin-staff/data/pipelines', stat: 'pipelines' },
      { label: 'Managed Datasets', icon: AnalyticsIcon, color: '#16a699', bg: 'rgba(22,166,153,0.1)', path: '/admin-staff/data/datasets',  stat: 'datasets' },
    ],
    actions: [
      { label: 'Data Pipelines', path: '/admin-staff/data/pipelines', icon: DataIcon },
      { label: 'Datasets',       path: '/admin-staff/data/datasets',  icon: AnalyticsIcon },
    ],
  },
  INSTITUTIONAL_LEADERSHIP: {
    label: 'Institutional Lead', color: '#16a699',
    description: 'Strategic oversight of the institution\'s research portfolio, grants, and compliance.',
    modules: [
      { label: 'Active Grants',    icon: AssignmentIcon, color: '#16a699', bg: 'rgba(22,166,153,0.1)', path: '/admin-staff/grants/opportunities', stat: 'opportunities' },
      { label: 'Active Projects',  icon: ProjectsIcon,   color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', path: '/admin-staff/research/projects',    stat: 'projects' },
      { label: 'Ethics Pending',   icon: EthicsIcon,     color: '#10b981', bg: 'rgba(16,185,129,0.1)', path: '/admin-staff/ethics/applications',  stat: 'pending_ethics' },
      { label: 'Total Budget',     icon: FinanceIcon,    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', path: '/admin-staff/finance/budgets',      stat: 'total_budget', prefix: '$' },
    ],
    actions: [
      { label: 'Grant Portfolio',    path: '/admin-staff/grants/proposals',      icon: AssignmentIcon },
      { label: 'Research Projects',  path: '/admin-staff/research/projects',     icon: ProjectsIcon },
      { label: 'Ethics Overview',    path: '/admin-staff/ethics/applications',   icon: EthicsIcon },
      { label: 'Financial Reports',  path: '/admin-staff/analytics',             icon: FinanceIcon },
      { label: 'Analytics',          path: '/admin-staff/analytics',             icon: AnalyticsIcon },
    ],
  },
  EXTERNAL_REVIEWER: {
    label: 'External Reviewer', color: '#16a699',
    description: 'Review and score assigned grant applications within your area of expertise.',
    modules: [
      { label: 'Assigned Reviews', icon: ReviewIcon,  color: '#f97316', bg: 'rgba(249,115,22,0.1)', path: '/admin-staff/reviews', stat: 'assigned_reviews' },
      { label: 'Completed Reviews',icon: CheckIcon,   color: '#10b981', bg: 'rgba(16,185,129,0.1)', path: '/admin-staff/reviews', stat: 'completed_reviews' },
    ],
    actions: [
      { label: 'My Reviews', path: '/admin-staff/reviews', icon: ReviewIcon },
      { label: 'My Profile', path: '/admin-staff/profile', icon: PersonIcon },
    ],
  },
  ADMIN_STAFF: {
    label: 'Admin Staff', color: '#16a699',
    description: 'Administrative support across research operations and platform functions.',
    modules: [],
    actions: [
      { label: 'My Profile', path: '/admin-staff/profile', icon: PersonIcon },
    ],
  },
  MOU_ADMIN: {
    label: 'MoU Administrator', color: '#7c3aed',
    description: 'Manage the full lifecycle of Memoranda of Understanding and institutional partnerships.',
    modules: [
      { label: 'Active MoUs',       icon: TeamsIcon,      color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', path: '/admin-staff/mou/list',       stat: 'active_mous' },
      { label: 'Pending Signing',   icon: PendingIcon,    color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', path: '/admin-staff/mou/approvals',  stat: 'pending_mous' },
      { label: 'Total Partners',    icon: TeamsIcon,      color: '#10b981', bg: 'rgba(16,185,129,0.1)', path: '/admin-staff/mou/partners',   stat: 'partners' },
    ],
    actions: [
      { label: 'New MoU',            path: '/admin-staff/mou/create',    icon: AssignmentIcon },
      { label: 'MoU Repository',     path: '/admin-staff/mou/list',      icon: ProjectsIcon },
      { label: 'Partner Registry',   path: '/admin-staff/mou/partners',  icon: TeamsIcon },
      { label: 'Approval Console',   path: '/admin-staff/mou/approvals', icon: ComplianceIcon },
      { label: 'Analytics',          path: '/admin-staff/mou/analytics', icon: AnalyticsIcon },
    ],
  },
  LEGAL_OFFICER: {
    label: 'Legal Officer', color: '#7c3aed',
    description: 'Review MoU legal terms, IP clauses, and data-sharing compliance.',
    modules: [
      { label: 'Pending Legal Review', icon: ComplianceIcon, color: '#f97316', bg: 'rgba(249,115,22,0.1)', path: '/admin-staff/mou/approvals', stat: 'legal_pending' },
      { label: 'Active MoUs',          icon: TeamsIcon,      color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', path: '/admin-staff/mou/list',      stat: 'active_mous' },
    ],
    actions: [
      { label: 'Approval Console',   path: '/admin-staff/mou/approvals', icon: ComplianceIcon },
      { label: 'MoU Repository',     path: '/admin-staff/mou/list',      icon: ProjectsIcon },
      { label: 'Analytics',          path: '/admin-staff/mou/analytics', icon: AnalyticsIcon },
    ],
  },
  PARTNERSHIP_COORDINATOR: {
    label: 'Partnership Coordinator', color: '#7c3aed',
    description: 'Coordinate partnership activities, communications, and deliverables.',
    modules: [
      { label: 'Active MoUs',     icon: TeamsIcon,   color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', path: '/admin-staff/mou/list',     stat: 'active_mous' },
      { label: 'Partner Registry',icon: TeamsIcon,   color: '#10b981', bg: 'rgba(16,185,129,0.1)', path: '/admin-staff/mou/partners', stat: 'partners' },
    ],
    actions: [
      { label: 'MoU Repository',     path: '/admin-staff/mou/list',     icon: ProjectsIcon },
      { label: 'Partner Registry',   path: '/admin-staff/mou/partners', icon: TeamsIcon },
      { label: 'Analytics',          path: '/admin-staff/mou/analytics',icon: AnalyticsIcon },
    ],
  },
};

export default function AdminStaffOverview() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [stats, setStats]   = useState({});
  const [institutionalMetrics, setInstitutionalMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin)      { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    if (u.primary_account_type === 'RESEARCHER') { router.push('/researcher/dashboard'); return; }
    setUser(u);
    await Promise.all([loadStats(u), loadInstitutionalMetrics()]);
    setLoading(false);
  };

  const loadStats = async (u) => {
    try {
      const role = u.primary_account_type;
      const s = {};
      if (['MOU_ADMIN', 'LEGAL_OFFICER', 'PARTNERSHIP_COORDINATOR'].includes(role)) {
        const mouDash = await api.get('/mou/analytics/dashboard').catch(() => ({ data: {} }));
        s.active_mous  = mouDash.data?.active ?? 0;
        s.pending_mous = mouDash.data?.pending_signing ?? 0;
        s.partners     = mouDash.data?.total_partners ?? 0;
        s.legal_pending = (await api.get('/mou/?status=LEGAL_REVIEW').catch(() => ({ data: [] }))).data?.length ?? 0;
      }
      if (['GRANT_MANAGER', 'INSTITUTIONAL_LEADERSHIP', 'FINANCE_OFFICER'].includes(role)) {
        const oppsRes = await api.get('/grants/opportunities').catch(() => ({ data: [] }));
        s.opportunities = oppsRes.data?.filter(o => o.status === 'open')?.length ?? 0;
        const propsRes = await api.get('/grants/proposals').catch(() => ({ data: [] }));
        s.proposals = propsRes.data?.filter(p => ['draft','in_review','submitted'].includes(p.status))?.length ?? 0;
        s.awards    = propsRes.data?.filter(p => p.status === 'approved')?.length ?? 0;
      }
      if (['ETHICS_COMMITTEE_MEMBER', 'INSTITUTIONAL_LEADERSHIP'].includes(role)) {
        const ethicsRes = await api.get('/research/ethics').catch(() => ({ data: [] }));
        s.pending_ethics  = ethicsRes.data?.filter(e => ['submitted','under_review'].includes(e.status))?.length ?? 0;
        s.assigned_reviews = ethicsRes.data?.filter(e => e.status === 'assigned')?.length ?? 0;
        s.decisions       = ethicsRes.data?.filter(e => ['approved','rejected','deferred'].includes(e.status))?.length ?? 0;
      }
      if (['DATA_STEWARD', 'DATA_ENGINEER', 'INSTITUTIONAL_LEADERSHIP'].includes(role)) {
        const projRes = await api.get('/research/projects').catch(() => ({ data: [] }));
        s.projects = projRes.data?.length ?? 0;
        s.datasets = 0;
        s.pipelines = 0;
      }
      setStats(s);
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  };

  const loadInstitutionalMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const response = await api.get('/admin-staff/analytics/overview');
      setInstitutionalMetrics(response.data);
    } catch (e) {
      console.error('Failed to load institutional metrics:', e);
      setError('Failed to load institutional metrics');
    } finally {
      setLoadingMetrics(false);
    }
  };

  const Card = ({ children, sx = {} }) => (
    <Box sx={{
      bgcolor: 'background.paper', borderRadius: 3, p: 3,
      border: `1px solid ${theme.palette.divider}`,
      boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
      ...sx,
    }}>
      {children}
    </Box>
  );

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress />
    </Box>
  );

  const role   = user?.primary_account_type || 'ADMIN_STAFF';
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.ADMIN_STAFF;
  const hour   = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography sx={{ color: 'text.primary', fontSize: 26, fontWeight: 700 }}>
              {greeting}, {firstName}
            </Typography>
            <Chip label={config.label} size="small"
              sx={{ bgcolor: `${config.color}18`, color: config.color, fontWeight: 700, fontSize: 11 }} />
          </Box>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>{config.description}</Typography>
        </Box>
        <Button variant="outlined" startIcon={<PersonIcon />} onClick={() => router.push('/admin-staff/profile')}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, borderColor: config.color, color: config.color,
            '&:hover': { bgcolor: `${config.color}0d`, borderColor: config.color } }}>
          My Profile
        </Button>
      </Box>

      {/* Institutional Overview Section - Visible to all admin staff */}
      {institutionalMetrics && (
        <>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'text.primary', mb: 2, mt: 4 }}>
            Institutional Overview
          </Typography>
          
          {/* Key Metrics Grid */}
          <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
            {/* Total Proposals */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ cursor: 'pointer', transition: 'all 0.2s', '&:hover': { borderColor: '#16a699', transform: 'translateY(-2px)' } }}
                onClick={() => router.push('/admin-staff/grants/proposals')}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 50, height: 50, borderRadius: 2, bgcolor: 'rgba(22,166,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <AssignmentIcon sx={{ color: '#16a699', fontSize: 24 }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
                      Total Proposals
                    </Typography>
                    <Typography sx={{ color: 'text.primary', fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
                      {institutionalMetrics.proposals.total}
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', fontSize: 11, mt: 0.5 }}>
                      {institutionalMetrics.proposals.awarded} awarded
                    </Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>

            {/* Active Projects */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ cursor: 'pointer', transition: 'all 0.2s', '&:hover': { borderColor: '#3b82f6', transform: 'translateY(-2px)' } }}
                onClick={() => router.push('/admin-staff/research/projects')}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 50, height: 50, borderRadius: 2, bgcolor: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ProjectsIcon sx={{ color: '#3b82f6', fontSize: 24 }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
                      Active Projects
                    </Typography>
                    <Typography sx={{ color: 'text.primary', fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
                      {institutionalMetrics.projects.active}
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', fontSize: 11, mt: 0.5 }}>
                      of {institutionalMetrics.projects.total} total
                    </Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>

            {/* Submissions for Review */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ cursor: 'pointer', transition: 'all 0.2s', '&:hover': { borderColor: '#f59e0b', transform: 'translateY(-2px)' } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 50, height: 50, borderRadius: 2, bgcolor: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ReviewIcon sx={{ color: '#f59e0b', fontSize: 24 }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
                      Pending Reviews
                    </Typography>
                    <Typography sx={{ color: 'text.primary', fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
                      {institutionalMetrics.submissions_for_review.total}
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', fontSize: 11, mt: 0.5 }}>
                      across all modules
                    </Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>

            {/* Success Rate */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ cursor: 'pointer', transition: 'all 0.2s', '&:hover': { borderColor: '#10b981', transform: 'translateY(-2px)' } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 50, height: 50, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <AwardsIcon sx={{ color: '#10b981', fontSize: 24 }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
                      Success Rate
                    </Typography>
                    <Typography sx={{ color: 'text.primary', fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
                      {institutionalMetrics.proposals.success_rate}%
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', fontSize: 11, mt: 0.5 }}>
                      proposals awarded
                    </Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>
          </Grid>

          {/* Detailed Breakdown Tables */}
          <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
            {/* Proposals Breakdown */}
            <Grid item xs={12} md={6}>
              <Card>
                <Box sx={{ p: 2.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
                  <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary' }}>
                    Proposals by Status
                  </Typography>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Status</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Count</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>%</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#94a3b8' }} />
                            <Typography sx={{ fontSize: 13 }}>Draft</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 13, fontWeight: 600 }}>
                          {institutionalMetrics.proposals.draft}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, color: 'text.secondary' }}>
                          {institutionalMetrics.proposals.total > 0 
                            ? Math.round((institutionalMetrics.proposals.draft / institutionalMetrics.proposals.total) * 100)
                            : 0}%
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                            <Typography sx={{ fontSize: 13 }}>In Review</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 13, fontWeight: 600 }}>
                          {institutionalMetrics.proposals.in_review}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, color: 'text.secondary' }}>
                          {institutionalMetrics.proposals.total > 0 
                            ? Math.round((institutionalMetrics.proposals.in_review / institutionalMetrics.proposals.total) * 100)
                            : 0}%
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981' }} />
                            <Typography sx={{ fontSize: 13 }}>Awarded</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 13, fontWeight: 600 }}>
                          {institutionalMetrics.proposals.awarded}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, color: 'text.secondary' }}>
                          {institutionalMetrics.proposals.total > 0 
                            ? Math.round((institutionalMetrics.proposals.awarded / institutionalMetrics.proposals.total) * 100)
                            : 0}%
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444' }} />
                            <Typography sx={{ fontSize: 13 }}>Declined</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 13, fontWeight: 600 }}>
                          {institutionalMetrics.proposals.declined}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, color: 'text.secondary' }}>
                          {institutionalMetrics.proposals.total > 0 
                            ? Math.round((institutionalMetrics.proposals.declined / institutionalMetrics.proposals.total) * 100)
                            : 0}%
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            </Grid>

            {/* Submissions for Review Breakdown */}
            <Grid item xs={12} md={6}>
              <Card>
                <Box sx={{ p: 2.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
                  <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary' }}>
                    Submissions for Review
                  </Typography>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Type</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Count</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>%</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AssignmentIcon sx={{ fontSize: 16, color: '#16a699' }} />
                            <Typography sx={{ fontSize: 13 }}>Proposals</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 13, fontWeight: 600 }}>
                          {institutionalMetrics.submissions_for_review.proposals}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, color: 'text.secondary' }}>
                          {institutionalMetrics.submissions_for_review.total > 0 
                            ? Math.round((institutionalMetrics.submissions_for_review.proposals / institutionalMetrics.submissions_for_review.total) * 100)
                            : 0}%
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ProjectsIcon sx={{ fontSize: 16, color: '#3b82f6' }} />
                            <Typography sx={{ fontSize: 13 }}>Projects</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 13, fontWeight: 600 }}>
                          {institutionalMetrics.submissions_for_review.projects}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, color: 'text.secondary' }}>
                          {institutionalMetrics.submissions_for_review.total > 0 
                            ? Math.round((institutionalMetrics.submissions_for_review.projects / institutionalMetrics.submissions_for_review.total) * 100)
                            : 0}%
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <EthicsIcon sx={{ fontSize: 16, color: '#10b981' }} />
                            <Typography sx={{ fontSize: 13 }}>Ethics Applications</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 13, fontWeight: 600 }}>
                          {institutionalMetrics.submissions_for_review.ethics}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, color: 'text.secondary' }}>
                          {institutionalMetrics.submissions_for_review.total > 0 
                            ? Math.round((institutionalMetrics.submissions_for_review.ethics / institutionalMetrics.submissions_for_review.total) * 100)
                            : 0}%
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <DataIcon sx={{ fontSize: 16, color: '#0ea5e9' }} />
                            <Typography sx={{ fontSize: 13 }}>Data Management Plans</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 13, fontWeight: 600 }}>
                          {institutionalMetrics.submissions_for_review.dmps}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, color: 'text.secondary' }}>
                          {institutionalMetrics.submissions_for_review.total > 0 
                            ? Math.round((institutionalMetrics.submissions_for_review.dmps / institutionalMetrics.submissions_for_review.total) * 100)
                            : 0}%
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            </Grid>

            {/* Projects Status */}
            <Grid item xs={12} md={6}>
              <Card>
                <Box sx={{ p: 2.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
                  <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary' }}>
                    Projects Overview
                  </Typography>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Status</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Count</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>%</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#3b82f6' }} />
                            <Typography sx={{ fontSize: 13 }}>Active</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 13, fontWeight: 600 }}>
                          {institutionalMetrics.projects.active}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, color: 'text.secondary' }}>
                          {institutionalMetrics.projects.total > 0 
                            ? Math.round((institutionalMetrics.projects.active / institutionalMetrics.projects.total) * 100)
                            : 0}%
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                            <Typography sx={{ fontSize: 13 }}>Proposed</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 13, fontWeight: 600 }}>
                          {institutionalMetrics.projects.proposed}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, color: 'text.secondary' }}>
                          {institutionalMetrics.projects.total > 0 
                            ? Math.round((institutionalMetrics.projects.proposed / institutionalMetrics.projects.total) * 100)
                            : 0}%
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981' }} />
                            <Typography sx={{ fontSize: 13 }}>Completed</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 13, fontWeight: 600 }}>
                          {institutionalMetrics.projects.completed}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, color: 'text.secondary' }}>
                          {institutionalMetrics.projects.total > 0 
                            ? Math.round((institutionalMetrics.projects.completed / institutionalMetrics.projects.total) * 100)
                            : 0}%
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            </Grid>

            {/* Recent Activity */}
            <Grid item xs={12} md={6}>
              <Card>
                <Box sx={{ p: 2.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
                  <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary' }}>
                    Recent Activity (Last 30 Days)
                  </Typography>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Type</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>New Items</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AssignmentIcon sx={{ fontSize: 16, color: '#16a699' }} />
                            <Typography sx={{ fontSize: 13 }}>Proposals</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 13, fontWeight: 600 }}>
                          {institutionalMetrics.recent_activity.proposals}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ProjectsIcon sx={{ fontSize: 16, color: '#3b82f6' }} />
                            <Typography sx={{ fontSize: 13 }}>Projects</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 13, fontWeight: 600 }}>
                          {institutionalMetrics.recent_activity.projects}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <EthicsIcon sx={{ fontSize: 16, color: '#10b981' }} />
                            <Typography sx={{ fontSize: 13 }}>Ethics Applications</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 13, fontWeight: 600 }}>
                          {institutionalMetrics.recent_activity.ethics}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            </Grid>
          </Grid>

          <Divider sx={{ my: 4 }} />
        </>
      )}

      {/* Role-specific stat cards */}
      {config.modules.length > 0 && (
        <Box sx={{ display: 'flex', gap: 2.5, mb: 3.5, flexWrap: 'wrap' }}>
          {config.modules.map(({ label, icon: Icon, color, bg, path, stat, prefix = '' }) => (
            <Card key={label} sx={{ flex: '1 1 180px', cursor: 'pointer', transition: 'border-color 0.2s', '&:hover': { borderColor: color } }}
              onClick={() => router.push(path)}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon sx={{ color, fontSize: 22 }} />
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Typography>
                  <Typography sx={{ color: 'text.primary', fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>
                    {prefix}{stats[stat] ?? '—'}
                  </Typography>
                </Box>
              </Box>
            </Card>
          ))}
        </Box>
      )}

      {/* Two-column: Quick Actions + Profile completion */}
      <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>

        {/* Quick Actions */}
        <Card sx={{ flex: '1 1 300px' }}>
          <Typography sx={{ color: config.color, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', mb: 0.5 }}>Quick</Typography>
          <Typography sx={{ color: 'text.primary', fontSize: 16, fontWeight: 600, mb: 2.5 }}>Actions</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {config.actions.map(({ label, path, icon: Icon }) => (
              <Box key={label} onClick={() => router.push(path)} sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2,
                cursor: 'pointer', border: `1px solid ${theme.palette.divider}`, transition: 'all 0.18s',
                '&:hover': { borderColor: config.color, bgcolor: `${config.color}08` },
              }}>
                <Box sx={{ width: 34, height: 34, borderRadius: 1.5, bgcolor: `${config.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon sx={{ color: config.color, fontSize: 17 }} />
                </Box>
                <Typography sx={{ color: 'text.primary', fontSize: 13.5, fontWeight: 500, flex: 1 }}>{label}</Typography>
                <ArrowIcon sx={{ color: 'text.disabled', fontSize: 15 }} />
              </Box>
            ))}
          </Box>
        </Card>

        {/* Profile Status */}
        <Card sx={{ flex: '1 1 280px' }}>
          <Typography sx={{ color: '#f97316', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', mb: 0.5 }}>Account</Typography>
          <Typography sx={{ color: 'text.primary', fontSize: 16, fontWeight: 600, mb: 2.5 }}>Profile Status</Typography>

          {[
            { label: 'Full Name',   value: user?.name,       icon: PersonIcon },
            { label: 'Job Title',   value: user?.job_title,  icon: ComplianceIcon },
            { label: 'Department',  value: user?.department, icon: TeamsIcon },
            { label: 'Email',       value: user?.email,      icon: AssignmentIcon },
          ].map(({ label, value, icon: Icon }) => (
            <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.2, borderBottom: `1px solid ${theme.palette.divider}`, '&:last-child': { borderBottom: 'none' } }}>
              <Box sx={{ width: 30, height: 30, borderRadius: 1, bgcolor: value ? `${config.color}14` : (dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {value ? <CheckIcon sx={{ fontSize: 15, color: config.color }} /> : <Icon sx={{ fontSize: 15, color: 'text.disabled' }} />}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ color: 'text.secondary', fontSize: 11 }}>{label}</Typography>
                <Typography sx={{ color: value ? 'text.primary' : 'text.disabled', fontSize: 13 }}>{value || 'Not set'}</Typography>
              </Box>
            </Box>
          ))}

          <Button fullWidth variant="outlined" onClick={() => router.push('/admin-staff/profile')} endIcon={<ArrowIcon />}
            sx={{ mt: 2, borderColor: config.color, color: config.color, borderRadius: 2, textTransform: 'none', fontWeight: 600,
              '&:hover': { bgcolor: `${config.color}08`, borderColor: config.color } }}>
            Edit Profile
          </Button>
        </Card>

        {/* Role Permissions Info */}
        <Card sx={{ flex: '2 1 400px' }}>
          <Typography sx={{ color: '#0ea5e9', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', mb: 0.5 }}>Role</Typography>
          <Typography sx={{ color: 'text.primary', fontSize: 16, fontWeight: 600, mb: 0.5 }}>Your Access & Permissions</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 13, mb: 2.5 }}>
            As a <strong>{config.label}</strong>, you have access to the following platform modules.
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {PERMISSION_CHIPS[role]?.map(({ label, color }) => (
              <Chip key={label} label={label} size="small"
                sx={{ bgcolor: `${color}15`, color, fontWeight: 600, fontSize: 11 }} />
            ))}
          </Box>
        </Card>
      </Box>
    </Box>
  );
}

const PERMISSION_CHIPS = {
  GRANT_MANAGER: [
    { label: 'Create Opportunities', color: '#16a699' },
    { label: 'Manage Proposals',     color: '#16a699' },
    { label: 'Assign Reviewers',     color: '#3b82f6' },
    { label: 'Issue Awards',         color: '#10b981' },
    { label: 'View Audit Log',       color: '#f59e0b' },
    { label: 'Amend Awards',         color: '#ef4444' },
  ],
  FINANCE_OFFICER: [
    { label: 'Manage Budgets',       color: '#f59e0b' },
    { label: 'Approve Disbursements',color: '#f59e0b' },
    { label: 'Review Expense Reports', color: '#10b981' },
    { label: 'Budget vs Actuals',    color: '#3b82f6' },
    { label: 'View Audit Log',       color: '#16a699' },
    { label: 'Amend Awards',         color: '#ef4444' },
  ],
  ETHICS_COMMITTEE_MEMBER: [
    { label: 'Review Ethics Applications', color: '#10b981' },
    { label: 'Declare COI',          color: '#ef4444' },
    { label: 'Issue Decisions',      color: '#10b981' },
    { label: 'Assign Reviewers (Chair)', color: '#16a699' },
    { label: 'View Projects',        color: '#3b82f6' },
  ],
  DATA_STEWARD: [
    { label: 'Curate Datasets',      color: '#0ea5e9' },
    { label: 'Manage Access Policies', color: '#0ea5e9' },
    { label: 'Mint DOIs',            color: '#16a699' },
    { label: 'Metadata Validation',  color: '#10b981' },
    { label: 'QA Oversight',         color: '#f59e0b' },
    { label: 'Approve Data Access',  color: '#ef4444' },
  ],
  DATA_ENGINEER: [
    { label: 'Build ETL Pipelines',  color: '#06b6d4' },
    { label: 'Manage Data Lake',     color: '#06b6d4' },
    { label: 'ML Model Deployment',  color: '#16a699' },
    { label: 'Access Analytics',     color: '#3b82f6' },
    { label: 'QA Data',              color: '#10b981' },
  ],
  INSTITUTIONAL_LEADERSHIP: [
    { label: 'Strategic Dashboards', color: '#ef4444' },
    { label: 'Approve Key Decisions',color: '#ef4444' },
    { label: 'Portfolio Reporting',  color: '#16a699' },
    { label: 'View All Grants',      color: '#f59e0b' },
    { label: 'View All Projects',    color: '#3b82f6' },
    { label: 'Ethics Oversight',     color: '#10b981' },
  ],
  EXTERNAL_REVIEWER: [
    { label: 'Score Applications',   color: '#f97316' },
    { label: 'Declare COI',          color: '#ef4444' },
    { label: 'Submit Reviews',       color: '#10b981' },
  ],
  ADMIN_STAFF: [
    { label: 'Platform Access',      color: '#6366f1' },
  ],
  MOU_ADMIN: [
    { label: 'Create & Manage MoUs', color: '#7c3aed' },
    { label: 'Manage Partners',      color: '#7c3aed' },
    { label: 'Approve Stages',       color: '#10b981' },
    { label: 'Workflow Admin',       color: '#3b82f6' },
    { label: 'Analytics & Reports',  color: '#f59e0b' },
  ],
  LEGAL_OFFICER: [
    { label: 'Legal Review',         color: '#7c3aed' },
    { label: 'IP & Compliance',      color: '#f97316' },
    { label: 'Approve Legal Stage',  color: '#10b981' },
    { label: 'View All MoUs',        color: '#64748b' },
  ],
  PARTNERSHIP_COORDINATOR: [
    { label: 'Manage Partnerships',  color: '#7c3aed' },
    { label: 'Track Deliverables',   color: '#10b981' },
    { label: 'Manage Partners',      color: '#3b82f6' },
    { label: 'Log Communications',   color: '#f59e0b' },
    { label: 'Analytics',            color: '#06b6d4' },
  ],
  GUEST_COLLABORATOR: [
    { label: 'Time-bounded Access',  color: '#64748b' },
    { label: 'Scoped View',          color: '#64748b' },
  ],
};
