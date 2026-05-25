'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  useTheme,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Link,
} from '@mui/material';
import {
  Science as ScienceIcon,
  Assignment as AssignmentIcon,
  Gavel as EthicsIcon,
  AccountBalance as AwardIcon,
  OpenInNew as OpenIcon,
  Refresh as RefreshIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#1ca7a1';

const PROJECT_STATUS_META = {
  draft:     { label: 'Draft',     color: '#64748b' },
  proposed:  { label: 'Proposed',  color: '#f59e0b' },
  active:    { label: 'Active',    color: '#10b981' },
  suspended: { label: 'Suspended', color: '#ef4444' },
  completed: { label: 'Completed', color: '#0ea5e9' },
};

const PROPOSAL_STATUS_META = {
  draft:           { label: 'Draft',              color: '#f59e0b' },
  returned:        { label: 'Revision Requested', color: '#f97316' },
  submitted:       { label: 'Submitted',          color: ACCENT },
  internal_review: { label: 'In Review',          color: '#3b82f6' },
  under_review:    { label: 'In Review',          color: '#0ea5e9' },
  awarded:         { label: 'Awarded',            color: '#10b981' },
  declined:        { label: 'Not Awarded',        color: '#ef4444' },
};

const ETHICS_STATUS_META = {
  draft:          { label: 'Draft',         color: '#64748b' },
  submitted:      { label: 'Submitted',     color: '#f59e0b' },
  assigned:       { label: 'Assigned',      color: '#0ea5e9' },
  screened:       { label: 'Screened',      color: '#f59e0b' },
  under_review:   { label: 'Under Review',  color: '#0ea5e9' },
  decision:       { label: 'Decision',      color: '#f97316' },
  approved:       { label: 'Approved',      color: '#10b981' },
  final_approval: { label: 'Approved',      color: '#10b981' },
  rejected:       { label: 'Rejected',      color: '#ef4444' },
};

const TERMINAL_PROPOSAL = new Set(['awarded', 'declined']);
const TERMINAL_ETHICS = new Set(['approved', 'final_approval', 'rejected']);

const fmtDate = d => d
  ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const fmtMoney = (amt, cur = 'KES') => {
  if (amt == null || amt === '') return '—';
  return `${cur} ${Number(amt).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

const normalize = s => (s || '').toLowerCase();

function countBy(items, keyFn) {
  const map = {};
  items.forEach(item => {
    const key = keyFn(item);
    if (!key) return;
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

function StatusChip({ label, color }) {
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        fontSize: 11,
        fontWeight: 700,
        height: 24,
        bgcolor: `${color}18`,
        color,
        border: `1px solid ${color}33`,
      }}
    />
  );
}

function BarChart({ data, colorMap, labelMap, dark }) {
  if (!data.length) {
    return (
      <Typography sx={{ color: 'text.disabled', fontSize: 13, textAlign: 'center', py: 4 }}>
        No data yet
      </Typography>
    );
  }
  const maxCount = Math.max(...data.map(d => d.count), 1);
  return (
    <Box>
      {data.map(item => {
        const color = colorMap[item.key] || '#64748b';
        const label = labelMap?.[item.key] || item.key.replace(/_/g, ' ');
        const pct = (item.count / maxCount) * 100;
        return (
          <Box key={item.key} sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography sx={{ fontSize: 12, color: 'text.primary', fontWeight: 500 }}>{label}</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color }}>{item.count}</Typography>
            </Box>
            <Box sx={{
              height: 8,
              bgcolor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              borderRadius: 2,
              overflow: 'hidden',
            }}>
              <Box sx={{
                height: '100%',
                width: `${pct}%`,
                bgcolor: color,
                borderRadius: 2,
                transition: 'width 0.4s',
              }} />
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

export default function ResearcherOverview() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [ethicsApps, setEthicsApps] = useState([]);
  const [awards, setAwards] = useState([]);

  useEffect(() => {
    init();
  }, []);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  const init = async () => {
    const userData = await fetchUser();
    if (!userData) {
      router.push('/login');
      return;
    }
    if (userData.is_global_admin) {
      router.push('/global-admin/dashboard');
      return;
    }
    if (userData.is_institution_admin) {
      router.push('/institution-admin/dashboard');
      return;
    }
    setUser(userData);
    await loadDashboard();
  };

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = authHeaders();
      const [projectsRes, proposalsRes, ethicsRes, awardsRes] = await Promise.all([
        axios.get(`${API}/research/projects`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/grants/proposals`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/research/ethics/my`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/grants/awards`, { headers }).catch(() => ({ data: [] })),
      ]);
      setProjects(projectsRes.data || []);
      setProposals(proposalsRes.data || []);
      setEthicsApps(ethicsRes.data || []);
      setAwards(awardsRes.data || []);
    } catch {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const activeProjects = useMemo(
    () => projects.filter(p => normalize(p.status) === 'active'),
    [projects],
  );

  const submissions = useMemo(() => {
    const items = [];

    proposals
      .filter(p => !TERMINAL_PROPOSAL.has(normalize(p.status)))
      .forEach(p => {
        const status = normalize(p.status);
        const meta = PROPOSAL_STATUS_META[status] || { label: p.status || 'Unknown', color: '#64748b' };
        items.push({
          id: p.id,
          kind: 'grant',
          kindLabel: 'Grant Proposal',
          title: p.title,
          ref: p.opportunity?.title || 'Proposal',
          status,
          statusLabel: meta.label,
          statusColor: meta.color,
          date: p.submitted_at || p.created_at,
          path: `/researcher/grants/proposals/${p.id}`,
        });
      });

    ethicsApps
      .filter(a => !TERMINAL_ETHICS.has(normalize(a.status)))
      .forEach(a => {
        const status = normalize(a.status);
        const meta = ETHICS_STATUS_META[status] || { label: a.status || 'Unknown', color: '#64748b' };
        items.push({
          id: a.id,
          kind: 'ethics',
          kindLabel: 'Ethics Application',
          title: a.title || a.project_title || 'Ethics application',
          ref: a.ref,
          status,
          statusLabel: meta.label,
          statusColor: meta.color,
          date: a.submitted_at || a.created_at,
          path: `/researcher/ethics/${a.id}`,
        });
      });

    return items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [proposals, ethicsApps]);

  const projectChartData = useMemo(
    () => countBy(projects, p => normalize(p.status)),
    [projects],
  );

  const submissionChartData = useMemo(() => {
    const grantDraft = proposals.filter(p => normalize(p.status) === 'draft').length;
    const grantReview = proposals.filter(p => ['returned', 'submitted', 'internal_review', 'under_review'].includes(normalize(p.status))).length;
    const ethicsDraft = ethicsApps.filter(a => normalize(a.status) === 'draft').length;
    const ethicsReview = ethicsApps.filter(a => ['submitted', 'assigned', 'screened', 'under_review', 'decision'].includes(normalize(a.status))).length;
    return [
      { key: 'grant_draft', count: grantDraft },
      { key: 'grant_review', count: grantReview },
      { key: 'ethics_draft', count: ethicsDraft },
      { key: 'ethics_review', count: ethicsReview },
    ].filter(d => d.count > 0);
  }, [proposals, ethicsApps]);

  const stats = useMemo(() => ({
    activeProjects: activeProjects.length,
    activeAwards: awards.filter(a => normalize(a.status) === 'active').length,
    openSubmissions: submissions.length,
    ethicsApproved: ethicsApps.filter(a => TERMINAL_ETHICS.has(normalize(a.status)) && normalize(a.status) !== 'rejected').length,
  }), [activeProjects, awards, submissions, ethicsApps]);

  const projectColorMap = Object.fromEntries(
    Object.entries(PROJECT_STATUS_META).map(([k, v]) => [k, v.color]),
  );
  const projectLabelMap = Object.fromEntries(
    Object.entries(PROJECT_STATUS_META).map(([k, v]) => [k, v.label]),
  );
  const submissionColorMap = {
    grant_draft: '#f59e0b',
    grant_review: ACCENT,
    ethics_draft: '#64748b',
    ethics_review: '#0ea5e9',
  };
  const submissionLabelMap = {
    grant_draft: 'Grant — Draft',
    grant_review: 'Grant — In Review',
    ethics_draft: 'Ethics — Draft',
    ethics_review: 'Ethics — In Review',
  };

  const Card = ({ children, sx = {} }) => (
    <Box sx={{
      bgcolor: 'background.paper',
      borderRadius: 3,
      p: 3,
      border: `1px solid ${theme.palette.divider}`,
      boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
      ...sx,
    }}>
      {children}
    </Box>
  );

  const StatCard = ({ icon: Icon, iconColor, iconBg, label, value, sub, onClick }) => (
    <Card
      sx={{
        flex: '1 1 180px',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { borderColor: iconColor } : {},
      }}
      onClick={onClick}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{
          width: 44,
          height: 44,
          borderRadius: 2,
          bgcolor: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon sx={{ color: iconColor, fontSize: 22 }} />
        </Box>
        <Box>
          <Typography sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {label}
          </Typography>
          <Typography sx={{ color: 'text.primary', fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}>
            {value}
          </Typography>
          {sub && (
            <Typography sx={{ color: 'text.disabled', fontSize: 12, mt: 0.25 }}>{sub}</Typography>
          )}
        </Box>
      </Box>
    </Card>
  );

  const headCell = { fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary', whiteSpace: 'nowrap' };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  const firstName = user?.name?.split(' ')[0] || 'Researcher';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3.5, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ color: 'text.primary', fontSize: 26, fontWeight: 700, mb: 0.5 }}>
            {greeting}, {firstName}
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
            Live snapshot of your projects, submissions, and funding activity.
          </Typography>
          <Link
            component="button"
            underline="hover"
            onClick={() => router.push('/researcher/profile')}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              mt: 1,
              fontSize: 13,
              fontWeight: 600,
              color: ACCENT,
              cursor: 'pointer',
            }}
          >
            View profile
            <ArrowForwardIcon sx={{ fontSize: 14 }} />
          </Link>
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
          onClick={loadDashboard}
          sx={{ textTransform: 'none', borderRadius: 2 }}
        >
          Refresh
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <StatCard
          icon={ScienceIcon}
          iconColor="#10b981"
          iconBg="rgba(16,185,129,0.1)"
          label="Active Projects"
          value={stats.activeProjects}
          sub={stats.activeProjects === 1 ? '1 running project' : `${stats.activeProjects} running projects`}
          onClick={() => router.push('/researcher/projects')}
        />
        <StatCard
          icon={AwardIcon}
          iconColor="#8b5cf6"
          iconBg="rgba(139,92,246,0.1)"
          label="Active Awards"
          value={stats.activeAwards}
          sub="Funded grants in progress"
          onClick={() => router.push('/researcher/grants/awards')}
        />
        <StatCard
          icon={AssignmentIcon}
          iconColor={ACCENT}
          iconBg="rgba(28,167,161,0.1)"
          label="Open Submissions"
          value={stats.openSubmissions}
          sub="Proposals & ethics pending"
        />
        <StatCard
          icon={EthicsIcon}
          iconColor="#0ea5e9"
          iconBg="rgba(14,165,233,0.1)"
          label="Ethics Cleared"
          value={stats.ethicsApproved}
          sub="Approved applications"
          onClick={() => router.push('/researcher/ethics')}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 2.5, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ flex: '1 1 280px' }}>
          <Typography sx={{ color: ACCENT, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', mb: 0.5 }}>
            Portfolio
          </Typography>
          <Typography sx={{ color: 'text.primary', fontSize: 16, fontWeight: 600, mb: 2 }}>
            Projects by Status
          </Typography>
          <BarChart
            data={projectChartData}
            colorMap={projectColorMap}
            labelMap={projectLabelMap}
            dark={dark}
          />
        </Card>
        <Card sx={{ flex: '1 1 280px' }}>
          <Typography sx={{ color: '#f97316', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', mb: 0.5 }}>
            Pipeline
          </Typography>
          <Typography sx={{ color: 'text.primary', fontSize: 16, fontWeight: 600, mb: 2 }}>
            Submissions Overview
          </Typography>
          <BarChart
            data={submissionChartData}
            colorMap={submissionColorMap}
            labelMap={submissionLabelMap}
            dark={dark}
          />
        </Card>
      </Box>

      <Card sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography sx={{ color: '#10b981', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', mb: 0.5 }}>
              Running
            </Typography>
            <Typography sx={{ color: 'text.primary', fontSize: 16, fontWeight: 600 }}>
              Active Projects
            </Typography>
          </Box>
          <Button
            size="small"
            endIcon={<OpenIcon sx={{ fontSize: 14 }} />}
            onClick={() => router.push('/researcher/projects')}
            sx={{ textTransform: 'none', color: ACCENT }}
          >
            All projects
          </Button>
        </Box>

        {activeProjects.length === 0 ? (
          <Typography sx={{ color: 'text.secondary', fontSize: 13, py: 3, textAlign: 'center' }}>
            No active projects yet. Convert an award or complete project setup to get started.
          </Typography>
        ) : (
          <Paper elevation={0} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
                    <TableCell sx={headCell}>Project</TableCell>
                    <TableCell sx={headCell}>Funder</TableCell>
                    <TableCell sx={headCell} align="right">Award</TableCell>
                    <TableCell sx={headCell}>Period</TableCell>
                    <TableCell sx={headCell}>Ethics</TableCell>
                    <TableCell sx={headCell}>Progress</TableCell>
                    <TableCell sx={headCell} align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activeProjects.slice(0, 8).map(p => {
                    const total = p.milestone_count || 0;
                    const done = p.done_milestone_count || 0;
                    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                    const ethicsColor = ETHICS_STATUS_META[normalize(p.ethics_status)]?.color || '#64748b';
                    return (
                      <TableRow
                        key={p.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => router.push(`/researcher/projects/${p.id}`)}
                      >
                        <TableCell>
                          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{p.title}</Typography>
                          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{p.project_code}</Typography>
                        </TableCell>
                        <TableCell sx={{ fontSize: 13 }}>{p.funder_name || '—'}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                          {fmtMoney(p.total_amount, p.currency)}
                        </TableCell>
                        <TableCell sx={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                          {fmtDate(p.start_date)} – {fmtDate(p.end_date)}
                        </TableCell>
                        <TableCell>
                          {p.ethics_status
                            ? <StatusChip label={ETHICS_STATUS_META[normalize(p.ethics_status)]?.label || p.ethics_status} color={ethicsColor} />
                            : <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>—</Typography>}
                        </TableCell>
                        <TableCell sx={{ minWidth: 120 }}>
                          <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.5 }}>
                            {done}/{total} milestones · {pct}%
                          </Typography>
                          <Box sx={{
                            height: 6,
                            bgcolor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            borderRadius: 3,
                            overflow: 'hidden',
                          }}>
                            <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: ACCENT, borderRadius: 3 }} />
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <OpenIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Card>

      <Card>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography sx={{ color: '#f59e0b', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', mb: 0.5 }}>
              In Progress
            </Typography>
            <Typography sx={{ color: 'text.primary', fontSize: 16, fontWeight: 600 }}>
              Submissions
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              onClick={() => router.push('/researcher/grants/proposals')}
              sx={{ textTransform: 'none', color: ACCENT }}
            >
              Proposals
            </Button>
            <Button
              size="small"
              onClick={() => router.push('/researcher/ethics')}
              sx={{ textTransform: 'none', color: ACCENT }}
            >
              Ethics
            </Button>
          </Box>
        </Box>

        {submissions.length === 0 ? (
          <Typography sx={{ color: 'text.secondary', fontSize: 13, py: 3, textAlign: 'center' }}>
            No open submissions. Draft a grant proposal or submit an ethics application to see it here.
          </Typography>
        ) : (
          <Paper elevation={0} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
                    <TableCell sx={headCell}>Type</TableCell>
                    <TableCell sx={headCell}>Title</TableCell>
                    <TableCell sx={headCell}>Reference</TableCell>
                    <TableCell sx={headCell}>Status</TableCell>
                    <TableCell sx={headCell}>Updated</TableCell>
                    <TableCell sx={headCell} align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {submissions.slice(0, 10).map(item => (
                    <TableRow
                      key={`${item.kind}-${item.id}`}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => router.push(item.path)}
                    >
                      <TableCell>
                        <Chip
                          label={item.kindLabel}
                          size="small"
                          sx={{
                            fontSize: 10,
                            fontWeight: 700,
                            height: 22,
                            bgcolor: item.kind === 'grant' ? 'rgba(139,92,246,0.1)' : 'rgba(14,165,233,0.1)',
                            color: item.kind === 'grant' ? '#8b5cf6' : '#0ea5e9',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }} noWrap>{item.title}</Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: 'text.secondary', maxWidth: 180 }} noWrap>
                        {item.ref || '—'}
                      </TableCell>
                      <TableCell>
                        <StatusChip label={item.statusLabel} color={item.statusColor} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, whiteSpace: 'nowrap' }}>{fmtDate(item.date)}</TableCell>
                      <TableCell align="right">
                        <OpenIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Card>
    </Box>
  );
}
