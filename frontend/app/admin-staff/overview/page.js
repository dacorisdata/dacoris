'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip, Divider, useTheme,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress,
} from '@mui/material';
import {
  Assignment as AssignmentIcon, AccountBalance as FinanceIcon, Science as EthicsIcon,
  Folder as ProjectsIcon, Storage as DataIcon, BarChart as AnalyticsIcon,
  RateReview as ReviewIcon, Person as PersonIcon, ArrowForward as ArrowIcon,
  Schedule as PendingIcon, EmojiEvents as AwardsIcon,
  Gavel as ComplianceIcon, Groups as TeamsIcon, Refresh as RefreshIcon,
  Warning as WarningIcon, Business as InstitutionIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../lib/api';

const ACCENT = '#0d9488';

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
      { label: 'Assigned Reviews', icon: ReviewIcon, color: '#f97316', bg: 'rgba(249,115,22,0.1)', path: '/reviewer/tasks', stat: 'assigned_reviews' },
    ],
    actions: [{ label: 'My Reviews', path: '/reviewer/reviews', icon: ReviewIcon }],
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

function KpiCard({ label, value, sub, color, icon: Icon, onClick }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
        borderLeft: `4px solid ${color}`, borderRadius: '10px',
        px: 2, py: 1.75, height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.18s',
        '&:hover': onClick ? { borderColor: color, bgcolor: `${color}06` } : {},
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box>
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.6 }}>
            {label}
          </Typography>
          <Typography sx={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</Typography>
          {sub && <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>{sub}</Typography>}
        </Box>
        <Box sx={{ width: 36, height: 36, borderRadius: '9px', bgcolor: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.25 }}>
          <Icon sx={{ color, fontSize: 19 }} />
        </Box>
      </Box>
    </Box>
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

  const submissionTypeColor = (type) => {
    if (type === 'proposal') return '#3b82f6';
    if (type === 'project')  return ACCENT;
    if (type === 'ethics')   return '#10b981';
    return '#8b5cf6';
  };

  const priorityColor = (p) => {
    if (p === 'high')   return '#ef4444';
    if (p === 'medium') return '#f59e0b';
    return '#94a3b8';
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '10px' }} onClose={() => setError('')}>{error}</Alert>}

      {/* ── Greeting banner ─────────────────────────────────────── */}
      <Box sx={{
        mb: 3, p: { xs: 2.5, md: 3 }, borderRadius: '14px',
        background: `linear-gradient(135deg, ${config.color}14 0%, ${config.color}05 100%)`,
        border: `1px solid ${config.color}28`,
        borderLeft: `5px solid ${config.color}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap',
      }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 23, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {greeting}, {firstName}
            </Typography>
            <Box sx={{ px: 1.25, py: 0.4, borderRadius: '7px', bgcolor: `${config.color}20`, color: config.color, fontSize: 11.5, fontWeight: 700 }}>
              {config.label}
            </Box>
          </Box>
          <Typography sx={{ fontSize: 13.5, color: 'text.secondary', mb: institutionName ? 1.25 : 0 }}>
            {config.description}
          </Typography>
          {institutionName && (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, px: 1.25, py: 0.4, borderRadius: '7px', bgcolor: `${ACCENT}12`, color: ACCENT, fontSize: 12, fontWeight: 600 }}>
              <InstitutionIcon sx={{ fontSize: 14 }} />{institutionName}
            </Box>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <Button size="small" variant="outlined" startIcon={<RefreshIcon sx={{ fontSize: 15 }} />}
            onClick={() => loadAll(user)} disabled={refreshing}
            sx={{ textTransform: 'none', borderRadius: '9px', fontWeight: 600, fontSize: 13 }}>
            {refreshing ? 'Loading…' : 'Refresh'}
          </Button>
          <Button size="small" variant="outlined" startIcon={<PersonIcon sx={{ fontSize: 15 }} />}
            onClick={() => router.push('/admin-staff/profile')}
            sx={{ textTransform: 'none', borderRadius: '9px', fontWeight: 600, fontSize: 13, borderColor: ACCENT, color: ACCENT, '&:hover': { bgcolor: `${ACCENT}08` } }}>
            Profile
          </Button>
        </Box>
      </Box>

      {metrics && (
        <>
          {/* ── KPI Row ──────────────────────────────────────────── */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 3 }}>
            {[
              { label: 'Pending Reviews',   value: metrics.submissions_for_review?.total ?? 0, sub: 'Across all modules',             color: '#f59e0b', icon: ReviewIcon,   path: '/admin-staff/grants/proposals' },
              { label: 'Active Projects',   value: metrics.projects?.active ?? 0,              sub: `${metrics.projects?.total ?? 0} total`, color: '#3b82f6', icon: ProjectsIcon, path: '/admin-staff/research/projects' },
              { label: 'Proposal Success',  value: `${metrics.proposals?.success_rate ?? 0}%`, sub: `${metrics.proposals?.awarded ?? 0} awarded`,  color: '#10b981', icon: AwardsIcon,  path: '/admin-staff/grants/proposals' },
              { label: 'Total Funding',     value: fmtMoney(metrics.awards?.total_amount),     sub: `${metrics.awards?.active ?? 0} active awards`, color: ACCENT,    icon: FinanceIcon, path: '/admin-staff/grants/awards' },
            ].map(kpi => (
              <Box key={kpi.label} sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 6px)', md: '1 1 calc(25% - 9px)' }, minWidth: 0 }}>
                <KpiCard label={kpi.label} value={kpi.value} sub={kpi.sub} color={kpi.color} icon={kpi.icon} onClick={() => router.push(kpi.path)} />
              </Box>
            ))}
          </Box>

          {/* ── Charts ───────────────────────────────────────────── */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            {[
              { title: 'Proposals by Status',    data: metrics.charts?.proposals_by_status },
              { title: 'Projects by Status',     data: metrics.charts?.projects_by_status },
              { title: 'Review Queue Breakdown', data: metrics.charts?.submissions_by_type?.filter(d => d.count > 0) },
            ].map(chart => (
              <Box key={chart.title} sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.333% - 11px)' }, minWidth: 0 }}>
                <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '10px', p: 2.25, height: '100%' }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, mb: 2, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }}>
                    {chart.title}
                  </Typography>
                  <BarChart data={chart.data} dark={dark} />
                </Box>
              </Box>
            ))}
          </Box>

          {/* ── Submissions + Due Tasks ───────────────────────────── */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, alignItems: 'stretch' }}>
            {/* Submissions */}
            <Box sx={{ flex: { xs: '1 1 100%', lg: '7 1 0' }, minWidth: 0, display: 'flex' }}>
              <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '12px', overflow: 'hidden', flex: 1 }}>
                <Box sx={{ px: 2.5, py: 1.75, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Submissions for Review</Typography>
                    <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>Live queue — click a row to open</Typography>
                  </Box>
                  <Box sx={{ px: 1.25, py: 0.4, borderRadius: '7px', bgcolor: `${ACCENT}12`, color: ACCENT, fontSize: 11, fontWeight: 700 }}>
                    {metrics.pending_submissions?.length ?? 0} items
                  </Box>
                </Box>
                {!metrics.pending_submissions?.length ? (
                  <Typography sx={{ p: 4, textAlign: 'center', color: 'text.secondary', fontSize: 13 }}>No pending submissions right now.</Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)' }}>
                          <TableCell sx={headCell}>Type</TableCell>
                          <TableCell sx={headCell}>Title</TableCell>
                          <TableCell sx={headCell}>Status</TableCell>
                          <TableCell sx={headCell}>Submitted</TableCell>
                          <TableCell sx={headCell} align="right"></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {metrics.pending_submissions.map(item => {
                          const tc = submissionTypeColor(item.type);
                          return (
                            <TableRow key={`${item.type}-${item.id}`} hover onClick={() => router.push(submissionPath(item))}
                              sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 }, transition: 'background 0.15s', '&:hover': { bgcolor: dark ? 'rgba(255,255,255,0.03)' : `${ACCENT}06` } }}>
                              <TableCell>
                                <Box sx={{ display: 'inline-flex', px: 1, py: 0.2, borderRadius: '5px', bgcolor: `${tc}14`, color: tc, fontSize: 10.5, fontWeight: 700 }}>
                                  {item.type_label}
                                </Box>
                              </TableCell>
                              <TableCell><Typography sx={{ fontSize: 13, fontWeight: 600 }} noWrap>{item.title}</Typography></TableCell>
                              <TableCell>
                                <Typography sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'capitalize' }}>
                                  {(item.status || '').replace(/_/g, ' ')}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap', color: 'text.secondary' }}>{fmtDate(item.submitted_at)}</TableCell>
                              <TableCell align="right"><ArrowIcon sx={{ fontSize: 15, color: 'text.disabled' }} /></TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </Box>

            {/* Due Tasks */}
            <Box sx={{ flex: { xs: '1 1 100%', lg: '5 1 0' }, minWidth: 0, display: 'flex' }}>
              <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '12px', overflow: 'hidden', flex: 1 }}>
                <Box sx={{ px: 2.5, py: 1.75, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Due & Upcoming Tasks</Typography>
                    <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>Milestones due within 30 days</Typography>
                  </Box>
                  {overdueCount > 0 && (
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1.25, py: 0.4, borderRadius: '7px', bgcolor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 11, fontWeight: 700 }}>
                      <WarningIcon sx={{ fontSize: 13 }} />{overdueCount} overdue
                    </Box>
                  )}
                </Box>
                {!metrics.due_tasks?.length ? (
                  <Typography sx={{ p: 4, textAlign: 'center', color: 'text.secondary', fontSize: 13 }}>No milestones due in the next 30 days.</Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)' }}>
                          <TableCell sx={headCell}>Milestone</TableCell>
                          <TableCell sx={headCell}>Due</TableCell>
                          <TableCell sx={headCell}>Priority</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {metrics.due_tasks.map(task => (
                          <TableRow key={task.id} hover onClick={() => router.push(`/admin-staff/research/projects/${task.project_id}`)}
                            sx={{
                              cursor: 'pointer',
                              '&:last-child td': { borderBottom: 0 },
                              borderLeft: task.is_overdue ? '3px solid #ef4444' : '3px solid transparent',
                              transition: 'background 0.15s',
                              '&:hover': { bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' },
                            }}>
                            <TableCell>
                              <Typography sx={{ fontSize: 12.5, fontWeight: 600 }} noWrap>{task.title}</Typography>
                              <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }} noWrap>{task.project_title}</Typography>
                            </TableCell>
                            <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap', color: task.is_overdue ? '#ef4444' : 'text.primary', fontWeight: task.is_overdue ? 700 : 400 }}>
                              {fmtDate(task.due_date)}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'inline-flex', px: 0.875, py: 0.2, borderRadius: '5px', bgcolor: `${priorityColor(task.priority)}14`, color: priorityColor(task.priority), fontSize: 10.5, fontWeight: 700, textTransform: 'capitalize' }}>
                                {task.priority || 'medium'}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </Box>
          </Box>

          {/* ── Institution snapshot ─────────────────────────────── */}
          <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: 2.25, mb: 3 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary', mb: 2 }}>Institution Snapshot</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              {[
                { label: 'Proposals',    value: metrics.proposals?.total,  detail: `${metrics.proposals?.in_review ?? 0} in review`,     color: '#3b82f6' },
                { label: 'Projects',     value: metrics.projects?.total,   detail: `${metrics.projects?.proposed ?? 0} awaiting approval`, color: ACCENT },
                { label: 'Ethics Apps',  value: metrics.ethics?.total,     detail: `${metrics.ethics?.pending_review ?? 0} pending`,        color: '#10b981' },
                { label: 'Recent (30d)', value: (metrics.recent_activity?.proposals ?? 0) + (metrics.recent_activity?.projects ?? 0) + (metrics.recent_activity?.ethics ?? 0), detail: 'new submissions', color: '#8b5cf6' },
              ].map(row => (
                <Box key={row.label} sx={{ flex: { xs: '1 1 calc(50% - 6px)', sm: '1 1 calc(25% - 9px)' }, minWidth: 0 }}>
                  <Box sx={{ p: 1.75, borderRadius: '9px', border: '1px solid', borderColor: 'divider', borderLeft: `4px solid ${row.color}`, height: '100%' }}>
                    <Typography sx={{ fontSize: 24, fontWeight: 800, color: row.color, lineHeight: 1 }}>{row.value ?? 0}</Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 600, mt: 0.5 }}>{row.label}</Typography>
                    <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.25 }}>{row.detail}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </>
      )}

      <Divider sx={{ my: 3 }} />

      {/* ── Role workspace modules ────────────────────────────── */}
      {config.modules.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary', mb: 1.75 }}>Your Workspace</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {config.modules.map(({ label, icon: Icon, color, path, stat, prefix = '' }) => (
              <Box key={label} sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 6px)', md: '1 1 calc(33.333% - 8px)' }, minWidth: 0 }}>
                <Box onClick={() => router.push(path)} sx={{
                  bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
                  borderLeft: `4px solid ${color}`, borderRadius: '10px',
                  p: 2, cursor: 'pointer', height: '100%',
                  transition: 'all 0.18s', '&:hover': { borderColor: color, bgcolor: `${color}06` },
                }}>
                  <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.5 }}>{label}</Typography>
                  <Typography sx={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{prefix}{stats[stat] ?? '—'}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                    <Icon sx={{ color, fontSize: 14 }} />
                    <Typography sx={{ fontSize: 11, color, fontWeight: 600 }}>View →</Typography>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* ── Quick actions + permissions ───────────────────────── */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'stretch' }}>
        <Box sx={{ flex: { xs: '1 1 100%', md: '5 1 0' }, minWidth: 0, display: 'flex' }}>
          <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: 2.25, flex: 1 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary', mb: 1.75 }}>Quick Actions</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.875 }}>
              {config.actions.map(({ label, path, icon: Icon }) => (
                <Box key={label} onClick={() => router.push(path)} sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.1, borderRadius: '9px', cursor: 'pointer',
                  border: `1px solid ${theme.palette.divider}`,
                  transition: 'all 0.15s',
                  '&:hover': { borderColor: config.color, bgcolor: `${config.color}07`, '& .qa-icon': { color: config.color } },
                }}>
                  <Icon className="qa-icon" sx={{ color: 'text.secondary', fontSize: 17, transition: 'color 0.15s' }} />
                  <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{label}</Typography>
                  <ArrowIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', md: '7 1 0' }, minWidth: 0, display: 'flex' }}>
          <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: 2.25, flex: 1 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary', mb: 0.75 }}>Your Permissions</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.75 }}>As a {config.label}, you can access:</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {(PERMISSION_CHIPS[role] || []).map(({ label, color }) => (
                <Box key={label} sx={{ display: 'inline-flex', px: 1.25, py: 0.4, borderRadius: '7px', bgcolor: `${color}14`, color, fontSize: 11.5, fontWeight: 600, border: `1px solid ${color}20` }}>
                  {label}
                </Box>
              ))}
            </Box>
            <Box sx={{ mt: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Profile completeness</Typography>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: ACCENT }}>
                  {[user?.name, user?.job_title, user?.department, user?.email].filter(Boolean).length * 25}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={[user?.name, user?.job_title, user?.department, user?.email].filter(Boolean).length / 4 * 100}
                sx={{ height: 6, borderRadius: 3, bgcolor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', '& .MuiLinearProgress-bar': { bgcolor: ACCENT, borderRadius: 3 } }}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
