'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip, Divider, useTheme,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  LinearProgress,
} from '@mui/material';
import {
  Assignment as AssignmentIcon, AccountBalance as FinanceIcon, Science as EthicsIcon,
  Folder as ProjectsIcon, Storage as DataIcon, BarChart as AnalyticsIcon,
  RateReview as ReviewIcon, Person as PersonIcon, ArrowForward as ArrowIcon,
  CheckCircle as CheckIcon, Schedule as PendingIcon, EmojiEvents as AwardsIcon,
  Gavel as ComplianceIcon, Groups as TeamsIcon, Refresh as RefreshIcon,
  Warning as WarningIcon, Business as InstitutionIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../lib/api';

const ACCENT = '#16a699';

const ROLE_CONFIG = {
  GRANT_MANAGER: {
    label: 'Grant Manager', color: ACCENT,
    description: 'Manage the full grant lifecycle — from opportunity discovery to award closeout.',
    modules: [
      { label: 'Open Opportunities', icon: AssignmentIcon, color: ACCENT, bg: 'rgba(22,166,153,0.1)', path: '/admin-staff/grants/opportunities', stat: 'opportunities' },
      { label: 'Open Proposals', icon: ProjectsIcon, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', path: '/admin-staff/grants/proposals', stat: 'proposals' },
      { label: 'Active Awards', icon: AwardsIcon, color: '#10b981', bg: 'rgba(16,185,129,0.1)', path: '/admin-staff/grants/awards', stat: 'awards' },
    ],
    actions: [
      { label: 'Review Proposals', path: '/admin-staff/grants/proposals', icon: ProjectsIcon },
      { label: 'Manage Awards', path: '/admin-staff/grants/awards', icon: AwardsIcon },
      { label: 'Analytics', path: '/admin-staff/analytics', icon: AnalyticsIcon },
    ],
  },
  FINANCE_OFFICER: {
    label: 'Finance Officer', color: ACCENT,
    description: 'Oversee budgets, disbursements, and financial compliance across active awards.',
    modules: [
      { label: 'Active Budgets', icon: FinanceIcon, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', path: '/admin-staff/finance/budgets', stat: 'budgets' },
      { label: 'Disbursements', icon: PendingIcon, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', path: '/admin-staff/finance/disbursements', stat: 'disbursements' },
    ],
    actions: [
      { label: 'Review Disbursements', path: '/admin-staff/finance/disbursements', icon: FinanceIcon },
      { label: 'Budget Overview', path: '/admin-staff/finance/budgets', icon: AnalyticsIcon },
    ],
  },
  ETHICS_COMMITTEE_MEMBER: {
    label: 'Ethics Committee', color: ACCENT,
    description: 'Review ethics applications and manage IRB workflows.',
    modules: [
      { label: 'Pending Applications', icon: EthicsIcon, color: '#10b981', bg: 'rgba(16,185,129,0.1)', path: '/admin-staff/ethics/applications', stat: 'pending_ethics' },
      { label: 'My Reviews', icon: ReviewIcon, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', path: '/admin-staff/ethics/reviews', stat: 'assigned_reviews' },
    ],
    actions: [
      { label: 'Ethics Applications', path: '/admin-staff/ethics/applications', icon: EthicsIcon },
      { label: 'My Reviews', path: '/admin-staff/ethics/reviews', icon: ReviewIcon },
    ],
  },
  DATA_STEWARD: {
    label: 'Data Steward', color: ACCENT,
    description: 'Curate datasets and oversee repository quality.',
    modules: [
      { label: 'Active Projects', icon: ProjectsIcon, color: '#10b981', bg: 'rgba(16,185,129,0.1)', path: '/admin-staff/research/projects', stat: 'projects' },
    ],
    actions: [
      { label: 'Research Projects', path: '/admin-staff/research/projects', icon: ProjectsIcon },
      { label: 'Datasets', path: '/admin-staff/data/datasets', icon: DataIcon },
    ],
  },
  DATA_ENGINEER: {
    label: 'Data Engineer', color: ACCENT,
    description: 'Build pipelines and analytics infrastructure.',
    modules: [
      { label: 'Pipelines', icon: DataIcon, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', path: '/admin-staff/data/pipelines', stat: 'pipelines' },
    ],
    actions: [
      { label: 'Data Pipelines', path: '/admin-staff/data/pipelines', icon: DataIcon },
    ],
  },
  INSTITUTIONAL_LEADERSHIP: {
    label: 'Institutional Lead', color: ACCENT,
    description: 'Strategic oversight of research portfolio, grants, and compliance.',
    modules: [
      { label: 'Active Grants', icon: AssignmentIcon, color: ACCENT, bg: 'rgba(22,166,153,0.1)', path: '/admin-staff/grants/opportunities', stat: 'opportunities' },
      { label: 'Active Projects', icon: ProjectsIcon, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', path: '/admin-staff/research/projects', stat: 'projects' },
      { label: 'Ethics Pending', icon: EthicsIcon, color: '#10b981', bg: 'rgba(16,185,129,0.1)', path: '/admin-staff/ethics/applications', stat: 'pending_ethics' },
    ],
    actions: [
      { label: 'Grant Portfolio', path: '/admin-staff/grants/proposals', icon: AssignmentIcon },
      { label: 'Research Projects', path: '/admin-staff/research/projects', icon: ProjectsIcon },
      { label: 'Analytics', path: '/admin-staff/analytics', icon: AnalyticsIcon },
    ],
  },
  EXTERNAL_REVIEWER: {
    label: 'External Reviewer', color: ACCENT,
    description: 'Review and score assigned grant applications.',
    modules: [
      { label: 'Assigned Reviews', icon: ReviewIcon, color: '#f97316', bg: 'rgba(249,115,22,0.1)', path: '/admin-staff/reviews', stat: 'assigned_reviews' },
    ],
    actions: [{ label: 'My Reviews', path: '/admin-staff/reviews', icon: ReviewIcon }],
  },
  ADMIN_STAFF: {
    label: 'Admin Staff', color: ACCENT,
    description: 'Administrative support across research operations.',
    modules: [],
    actions: [{ label: 'My Profile', path: '/admin-staff/profile', icon: PersonIcon }],
  },
  MOU_ADMIN: {
    label: 'MoU Administrator', color: '#7c3aed',
    description: 'Manage MoU lifecycle and institutional partnerships.',
    modules: [
      { label: 'Active MoUs', icon: TeamsIcon, color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', path: '/admin-staff/mou/list', stat: 'active_mous' },
      { label: 'Pending Signing', icon: PendingIcon, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', path: '/admin-staff/mou/approvals', stat: 'pending_mous' },
    ],
    actions: [
      { label: 'MoU Repository', path: '/admin-staff/mou/list', icon: ProjectsIcon },
      { label: 'Analytics', path: '/admin-staff/mou/analytics', icon: AnalyticsIcon },
    ],
  },
  LEGAL_OFFICER: {
    label: 'Legal Officer', color: '#7c3aed',
    description: 'Review MoU legal terms and compliance.',
    modules: [
      { label: 'Legal Review', icon: ComplianceIcon, color: '#f97316', bg: 'rgba(249,115,22,0.1)', path: '/admin-staff/mou/approvals', stat: 'legal_pending' },
    ],
    actions: [{ label: 'Approval Console', path: '/admin-staff/mou/approvals', icon: ComplianceIcon }],
  },
  PARTNERSHIP_COORDINATOR: {
    label: 'Partnership Coordinator', color: '#7c3aed',
    description: 'Coordinate partnership activities and deliverables.',
    modules: [
      { label: 'Active MoUs', icon: TeamsIcon, color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', path: '/admin-staff/mou/list', stat: 'active_mous' },
    ],
    actions: [{ label: 'Partner Registry', path: '/admin-staff/mou/partners', icon: TeamsIcon }],
  },
};

const PERMISSION_CHIPS = {
  GRANT_MANAGER: [
    { label: 'Manage Proposals', color: ACCENT }, { label: 'Issue Awards', color: '#10b981' }, { label: 'Assign Reviewers', color: '#3b82f6' },
  ],
  FINANCE_OFFICER: [
    { label: 'Manage Budgets', color: '#f59e0b' }, { label: 'Approve Disbursements', color: '#10b981' },
  ],
  ETHICS_COMMITTEE_MEMBER: [
    { label: 'Review Ethics', color: '#10b981' }, { label: 'Issue Decisions', color: ACCENT },
  ],
  DATA_STEWARD: [{ label: 'Curate Datasets', color: '#0ea5e9' }, { label: 'QA Oversight', color: '#f59e0b' }],
  DATA_ENGINEER: [{ label: 'ETL Pipelines', color: '#06b6d4' }, { label: 'Analytics', color: '#3b82f6' }],
  INSTITUTIONAL_LEADERSHIP: [
    { label: 'Portfolio Reporting', color: ACCENT }, { label: 'Ethics Oversight', color: '#10b981' }, { label: 'Strategic Dashboards', color: '#ef4444' },
  ],
  EXTERNAL_REVIEWER: [{ label: 'Score Applications', color: '#f97316' }],
  ADMIN_STAFF: [{ label: 'Platform Access', color: '#6366f1' }],
  MOU_ADMIN: [{ label: 'Manage MoUs', color: '#7c3aed' }, { label: 'Partners', color: '#10b981' }],
  LEGAL_OFFICER: [{ label: 'Legal Review', color: '#7c3aed' }],
  PARTNERSHIP_COORDINATOR: [{ label: 'Partnerships', color: '#7c3aed' }],
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtMoney = n => n ? `KES ${Number(n).toLocaleString()}` : '—';

const submissionPath = (item) => {
  if (item.type === 'proposal') return `/admin-staff/grants/proposals/${item.id}`;
  if (item.type === 'project') return `/admin-staff/research/projects/${item.id}`;
  if (item.type === 'ethics') return `/admin-staff/ethics/reviews/${item.id}`;
  return '#';
};

function BarChart({ data, dark }) {
  if (!data?.length) {
    return <Typography sx={{ color: 'text.disabled', fontSize: 13, textAlign: 'center', py: 4 }}>No data yet</Typography>;
  }
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <Box>
      {data.map(item => (
        <Box key={item.key} sx={{ mb: 1.75 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 500 }}>{item.label}</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: item.color || ACCENT }}>{item.count}</Typography>
          </Box>
          <Box sx={{ height: 8, bgcolor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ height: '100%', width: `${(item.count / max) * 100}%`, bgcolor: item.color || ACCENT, borderRadius: 2, transition: 'width 0.4s' }} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function KpiCard({ label, value, sub, color, icon: Icon, onClick, dark, theme }) {
  return (
    <Paper
      elevation={0}
      variant="outlined"
      onClick={onClick}
      sx={{
        p: 2.5,
        borderRadius: 2.5,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
        height: '100%',
        '&:hover': onClick ? { borderColor: color, transform: 'translateY(-2px)' } : {},
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon sx={{ color, fontSize: 24 }} />
        </Box>
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
            {label}
          </Typography>
          <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>{value}</Typography>
          {sub && <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>{sub}</Typography>}
        </Box>
      </Box>
    </Paper>
  );
}

export default function AdminStaffOverview() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({});
  const [metrics, setMetrics] = useState(null);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin) { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    if (u.primary_account_type === 'RESEARCHER') { router.push('/researcher/overview'); return; }
    setUser(u);
    await loadAll(u);
    setLoading(false);
  };

  const loadAll = async (u) => {
    setRefreshing(true);
    setError('');
    try {
      const overviewRes = await api.get('/admin-staff/analytics/overview');
      setMetrics(overviewRes.data);
      await loadRoleStats(u);
    } catch {
      setError('Failed to load institutional dashboard data.');
    } finally {
      setRefreshing(false);
    }
  };

  const loadRoleStats = async (u) => {
    const role = u.primary_account_type;
    const s = {};
    try {
      if (['MOU_ADMIN', 'LEGAL_OFFICER', 'PARTNERSHIP_COORDINATOR'].includes(role)) {
        const mouDash = await api.get('/mou/analytics/dashboard').catch(() => ({ data: {} }));
        s.active_mous = mouDash.data?.active ?? 0;
        s.pending_mous = mouDash.data?.pending_signing ?? 0;
        s.legal_pending = (await api.get('/mou/?status=LEGAL_REVIEW').catch(() => ({ data: [] }))).data?.length ?? 0;
      }
      if (['GRANT_MANAGER', 'INSTITUTIONAL_LEADERSHIP', 'FINANCE_OFFICER'].includes(role)) {
        const oppsRes = await api.get('/grants/opportunities').catch(() => ({ data: [] }));
        s.opportunities = oppsRes.data?.filter(o => o.status === 'open')?.length ?? 0;
        const propsRes = await api.get('/grants/proposals').catch(() => ({ data: [] }));
        s.proposals = propsRes.data?.filter(p => ['draft', 'submitted', 'internal_review', 'under_review', 'returned'].includes(p.status))?.length ?? 0;
        s.awards = (await api.get('/grants/awards').catch(() => ({ data: [] }))).data?.filter(a => a.status === 'active')?.length ?? 0;
      }
      if (['ETHICS_COMMITTEE_MEMBER', 'INSTITUTIONAL_LEADERSHIP'].includes(role)) {
        const ethicsRes = await api.get('/research/ethics/reviews/my').catch(() => ({ data: [] }));
        s.pending_ethics = ethicsRes.data?.length ?? 0;
        s.assigned_reviews = ethicsRes.data?.length ?? 0;
      }
      if (['DATA_STEWARD', 'DATA_ENGINEER', 'INSTITUTIONAL_LEADERSHIP'].includes(role)) {
        s.projects = (await api.get('/research/projects').catch(() => ({ data: [] }))).data?.length ?? 0;
      }
      setStats(s);
    } catch { /* role stats are optional */ }
  };

  const role = user?.primary_account_type || 'ADMIN_STAFF';
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.ADMIN_STAFF;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] || 'there';
  const institutionName = metrics?.institution_name || user?.institution_name;

  const overdueCount = useMemo(
    () => (metrics?.due_tasks || []).filter(t => t.is_overdue).length,
    [metrics],
  );

  const headCell = { fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary', whiteSpace: 'nowrap' };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 26, fontWeight: 800 }}>{greeting}, {firstName}</Typography>
            <Chip label={config.label} size="small" sx={{ bgcolor: `${config.color}18`, color: config.color, fontWeight: 700, fontSize: 11 }} />
          </Box>
          <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 1 }}>{config.description}</Typography>
          {institutionName && (
            <Chip
              icon={<InstitutionIcon sx={{ fontSize: '16px !important' }} />}
              label={institutionName}
              size="small"
              sx={{ bgcolor: `${ACCENT}12`, color: ACCENT, fontWeight: 600 }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={() => loadAll(user)} disabled={refreshing} sx={{ textTransform: 'none', borderRadius: 2 }}>
            Refresh
          </Button>
          <Button size="small" variant="outlined" startIcon={<PersonIcon />} onClick={() => router.push('/admin-staff/profile')} sx={{ textTransform: 'none', borderRadius: 2, borderColor: ACCENT, color: ACCENT }}>
            Profile
          </Button>
        </Box>
      </Box>

      {metrics && (
        <>
          {/* KPI Row */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            {[
              { label: 'Pending Reviews', value: metrics.submissions_for_review?.total ?? 0, sub: 'Across all modules', color: '#f59e0b', icon: ReviewIcon, path: '/admin-staff/grants/proposals' },
              { label: 'Active Projects', value: metrics.projects?.active ?? 0, sub: `${metrics.projects?.total ?? 0} total`, color: '#3b82f6', icon: ProjectsIcon, path: '/admin-staff/research/projects' },
              { label: 'Proposal Success', value: `${metrics.proposals?.success_rate ?? 0}%`, sub: `${metrics.proposals?.awarded ?? 0} awarded`, color: '#10b981', icon: AwardsIcon, path: '/admin-staff/grants/proposals' },
              { label: 'Total Funding', value: fmtMoney(metrics.awards?.total_amount), sub: `${metrics.awards?.active ?? 0} active awards`, color: ACCENT, icon: FinanceIcon, path: '/admin-staff/grants/awards' },
            ].map(kpi => (
              <Box key={kpi.label} sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)', md: '1 1 calc(25% - 12px)' }, minWidth: 0 }}>
                <KpiCard label={kpi.label} value={kpi.value} sub={kpi.sub} color={kpi.color} icon={kpi.icon} onClick={() => router.push(kpi.path)} />
              </Box>
            ))}
          </Box>

          {/* Charts */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5, mb: 3 }}>
            {[
              { title: 'Proposals by Status', data: metrics.charts?.proposals_by_status },
              { title: 'Projects by Status', data: metrics.charts?.projects_by_status },
              { title: 'Review Queue Breakdown', data: metrics.charts?.submissions_by_type?.filter(d => d.count > 0) },
            ].map(chart => (
              <Box key={chart.title} sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.333% - 14px)' }, minWidth: 0 }}>
                <Paper elevation={0} variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, height: '100%' }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>{chart.title}</Typography>
                  <BarChart data={chart.data} dark={dark} />
                </Paper>
              </Box>
            ))}
          </Box>

          {/* Submissions + Due Tasks */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5, mb: 3, alignItems: 'stretch' }}>
            <Box sx={{ flex: { xs: '1 1 100%', lg: '7 1 0' }, minWidth: 0, display: 'flex' }}>
              <Paper elevation={0} variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden', flex: 1 }}>
                <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Submissions for Review</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Live queue — click a row to open</Typography>
                  </Box>
                  <Chip label={`${metrics.pending_submissions?.length ?? 0} items`} size="small" sx={{ fontWeight: 700, bgcolor: `${ACCENT}14`, color: ACCENT }} />
                </Box>
                {!metrics.pending_submissions?.length ? (
                  <Typography sx={{ p: 4, textAlign: 'center', color: 'text.secondary', fontSize: 13 }}>No pending submissions right now.</Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
                          <TableCell sx={headCell}>Type</TableCell>
                          <TableCell sx={headCell}>Title</TableCell>
                          <TableCell sx={headCell}>Status</TableCell>
                          <TableCell sx={headCell}>Submitted</TableCell>
                          <TableCell sx={headCell} align="right">Open</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {metrics.pending_submissions.map(item => (
                          <TableRow key={`${item.type}-${item.id}`} hover sx={{ cursor: 'pointer' }} onClick={() => router.push(submissionPath(item))}>
                            <TableCell><Chip label={item.type_label} size="small" sx={{ fontSize: 10, height: 22, fontWeight: 700 }} /></TableCell>
                            <TableCell><Typography sx={{ fontSize: 13, fontWeight: 600 }} noWrap>{item.title}</Typography></TableCell>
                            <TableCell><Chip label={(item.status || '').replace(/_/g, ' ')} size="small" sx={{ fontSize: 10, height: 22, textTransform: 'capitalize' }} /></TableCell>
                            <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(item.submitted_at)}</TableCell>
                            <TableCell align="right"><ArrowIcon sx={{ fontSize: 16, color: 'text.disabled' }} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </Box>

            <Box sx={{ flex: { xs: '1 1 100%', lg: '5 1 0' }, minWidth: 0, display: 'flex' }}>
              <Paper elevation={0} variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden', flex: 1 }}>
                <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Due & Upcoming Tasks</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Milestones due within 30 days</Typography>
                  </Box>
                  {overdueCount > 0 && (
                    <Chip icon={<WarningIcon sx={{ fontSize: '14px !important' }} />} label={`${overdueCount} overdue`} size="small" color="error" sx={{ fontWeight: 700 }} />
                  )}
                </Box>
                {!metrics.due_tasks?.length ? (
                  <Typography sx={{ p: 4, textAlign: 'center', color: 'text.secondary', fontSize: 13 }}>No milestones due in the next 30 days.</Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
                          <TableCell sx={headCell}>Milestone</TableCell>
                          <TableCell sx={headCell}>Due</TableCell>
                          <TableCell sx={headCell}>Priority</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {metrics.due_tasks.map(task => (
                          <TableRow
                            key={task.id}
                            hover
                            sx={{ cursor: 'pointer', bgcolor: task.is_overdue ? (dark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.04)') : 'inherit' }}
                            onClick={() => router.push(`/admin-staff/research/projects/${task.project_id}`)}
                          >
                            <TableCell>
                              <Typography sx={{ fontSize: 12.5, fontWeight: 600 }} noWrap>{task.title}</Typography>
                              <Typography sx={{ fontSize: 10, color: 'text.secondary' }} noWrap>{task.project_title}</Typography>
                            </TableCell>
                            <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap', color: task.is_overdue ? 'error.main' : 'text.primary', fontWeight: task.is_overdue ? 700 : 400 }}>
                              {fmtDate(task.due_date)}
                            </TableCell>
                            <TableCell>
                              <Chip label={task.priority || 'medium'} size="small" sx={{ fontSize: 10, height: 20, textTransform: 'capitalize' }} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </Box>
          </Box>

          {/* Institution snapshot */}
          <Paper elevation={0} variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, mb: 3 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>Institution Snapshot</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {[
                { label: 'Proposals', value: metrics.proposals?.total, detail: `${metrics.proposals?.in_review ?? 0} in review` },
                { label: 'Projects', value: metrics.projects?.total, detail: `${metrics.projects?.proposed ?? 0} awaiting approval` },
                { label: 'Ethics Apps', value: metrics.ethics?.total, detail: `${metrics.ethics?.pending_review ?? 0} pending` },
                { label: 'Recent (30d)', value: (metrics.recent_activity?.proposals ?? 0) + (metrics.recent_activity?.projects ?? 0) + (metrics.recent_activity?.ethics ?? 0), detail: 'new submissions' },
              ].map(row => (
                <Box key={row.label} sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' }, minWidth: 0 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
                    <Typography sx={{ fontSize: 22, fontWeight: 800, color: ACCENT }}>{row.value ?? 0}</Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{row.label}</Typography>
                    <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{row.detail}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </>
      )}

      <Divider sx={{ my: 3 }} />

      {/* Role modules */}
      {config.modules.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 1.5 }}>Your Workspace</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {config.modules.map(({ label, icon: Icon, color, bg, path, stat, prefix = '' }) => (
              <Box key={label} sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)', md: '1 1 calc(33.333% - 11px)' }, minWidth: 0 }}>
                <Paper elevation={0} variant="outlined" onClick={() => router.push(path)} sx={{ p: 2, borderRadius: 2.5, cursor: 'pointer', height: '100%', '&:hover': { borderColor: color } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon sx={{ color, fontSize: 20 }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>{label}</Typography>
                      <Typography sx={{ fontSize: 22, fontWeight: 800 }}>{prefix}{stats[stat] ?? '—'}</Typography>
                    </Box>
                  </Box>
                </Paper>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Quick actions + permissions */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5, alignItems: 'stretch' }}>
        <Box sx={{ flex: { xs: '1 1 100%', md: '5 1 0' }, minWidth: 0, display: 'flex' }}>
          <Paper elevation={0} variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, flex: 1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>Quick Actions</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {config.actions.map(({ label, path, icon: Icon }) => (
                <Box key={label} onClick={() => router.push(path)} sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25, borderRadius: 2, cursor: 'pointer',
                  border: `1px solid ${theme.palette.divider}`, '&:hover': { borderColor: config.color, bgcolor: `${config.color}06` },
                }}>
                  <Icon sx={{ color: config.color, fontSize: 18 }} />
                  <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{label}</Typography>
                  <ArrowIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', md: '7 1 0' }, minWidth: 0, display: 'flex' }}>
          <Paper elevation={0} variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, flex: 1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>Your Permissions</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>As a {config.label}, you can access:</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {(PERMISSION_CHIPS[role] || []).map(({ label, color }) => (
                <Chip key={label} label={label} size="small" sx={{ bgcolor: `${color}15`, color, fontWeight: 600, fontSize: 11 }} />
              ))}
            </Box>
            <Box sx={{ mt: 2.5 }}>
              <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.75 }}>Profile completeness</Typography>
              <LinearProgress
                variant="determinate"
                value={[user?.name, user?.job_title, user?.department, user?.email].filter(Boolean).length / 4 * 100}
                sx={{ height: 6, borderRadius: 3, bgcolor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', '& .MuiLinearProgress-bar': { bgcolor: ACCENT } }}
              />
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
