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
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  AccountBalance as AwardIcon,
  OpenInNew as OpenIcon,
  Refresh as RefreshIcon,
  RocketLaunch as RocketIcon,
  Handshake as HandshakeIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { isSupervisorAccount } from '../../../lib/institutionTypes';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#1ca7a1';
const LOCALE_MAP = { en: 'en-GB', sw: 'sw-KE', fr: 'fr-FR', ar: 'ar' };
const DATE_LOCALE_MAP = { en: 'en-US', sw: 'sw-KE', fr: 'fr-FR', ar: 'ar' };

const PROJECT_STATUS_COLORS = {
  draft: '#64748b',
  proposed: '#f59e0b',
  active: '#10b981',
  suspended: '#ef4444',
  completed: '#0ea5e9',
};

const PROPOSAL_STATUS_COLORS = {
  draft: '#f59e0b',
  returned: '#f97316',
  submitted: ACCENT,
  internal_review: '#3b82f6',
  under_review: '#0ea5e9',
  awarded: '#10b981',
  declined: '#ef4444',
};

const ETHICS_STATUS_COLORS = {
  draft: '#64748b',
  submitted: '#f59e0b',
  assigned: '#0ea5e9',
  screened: '#f59e0b',
  under_review: '#0ea5e9',
  decision: '#f97316',
  approved: '#10b981',
  final_approval: '#10b981',
  rejected: '#ef4444',
};

const TERMINAL_PROPOSAL = new Set(['awarded', 'declined']);
const TERMINAL_ETHICS = new Set(['approved', 'final_approval', 'rejected']);

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

function BarChart({ data, colorMap, labelMap, dark, emptyLabel }) {
  if (!data.length) {
    return (
      <Typography sx={{ color: 'text.disabled', fontSize: 13, textAlign: 'center', py: 4 }}>
        {emptyLabel}
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
  const { t, locale } = useLanguage();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [ethicsApps, setEthicsApps] = useState([]);
  const [awards, setAwards] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString(LOCALE_MAP[locale] || 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  const statusLabel = (group, status) => {
    const key = `researcher.overview.${group}.${status}`;
    const translated = t(key);
    return translated !== key ? translated : t('researcher.overview.unknown');
  };

  const projectLabelMap = useMemo(
    () => Object.fromEntries(Object.keys(PROJECT_STATUS_COLORS).map(k => [k, statusLabel('projectStatus', k)])),
    [t],
  );

  const submissionLabelMap = useMemo(
    () => ({
      grant_draft: t('researcher.overview.submissionChart.grant_draft'),
      grant_review: t('researcher.overview.submissionChart.grant_review'),
      ethics_draft: t('researcher.overview.submissionChart.ethics_draft'),
      ethics_review: t('researcher.overview.submissionChart.ethics_review'),
    }),
    [t],
  );

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
    if (isSupervisorAccount(userData)) {
      router.push('/researcher/postgraduate/supervisor');
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
      setLastUpdated(new Date());
    } catch {
      setError(t('researcher.overview.errorLoad'));
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
        items.push({
          id: p.id,
          kind: 'grant',
          kindLabel: t('researcher.overview.kind.grantProposal'),
          title: p.title,
          ref: p.opportunity?.title || t('researcher.overview.kind.proposal'),
          status,
          statusLabel: statusLabel('proposalStatus', status),
          statusColor: PROPOSAL_STATUS_COLORS[status] || '#64748b',
          date: p.submitted_at || p.created_at,
          path: `/researcher/grants/proposals/${p.id}`,
        });
      });

    ethicsApps
      .filter(a => !TERMINAL_ETHICS.has(normalize(a.status)))
      .forEach(a => {
        const status = normalize(a.status);
        items.push({
          id: a.id,
          kind: 'ethics',
          kindLabel: t('researcher.overview.kind.ethicsApplication'),
          title: a.title || a.project_title || t('researcher.overview.kind.ethicsApplicationFallback'),
          ref: a.ref,
          status,
          statusLabel: statusLabel('ethicsStatus', status),
          statusColor: ETHICS_STATUS_COLORS[status] || '#64748b',
          date: a.submitted_at || a.created_at,
          path: `/researcher/ethics/${a.id}`,
        });
      });

    return items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [proposals, ethicsApps, t]);

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

  const stats = useMemo(() => {
    const proposedProjects = projects.filter(p => normalize(p.status) === 'proposed').length;
    const activeAwardsList = awards.filter(a => normalize(a.status) === 'active');
    const totalAwardValue = activeAwardsList.reduce((s, a) => s + (a.total_amount || 0), 0);
    const awardCurrency = activeAwardsList[0]?.currency || 'USD';

    const grantDraft = proposals.filter(p => !TERMINAL_PROPOSAL.has(normalize(p.status)) && normalize(p.status) === 'draft').length;
    const grantInReview = proposals.filter(p => !TERMINAL_PROPOSAL.has(normalize(p.status)) && normalize(p.status) !== 'draft').length;
    const ethicsDraft = ethicsApps.filter(a => !TERMINAL_ETHICS.has(normalize(a.status)) && normalize(a.status) === 'draft').length;
    const ethicsInReview = ethicsApps.filter(a => !TERMINAL_ETHICS.has(normalize(a.status)) && normalize(a.status) !== 'draft').length;

    const ethicsApproved = ethicsApps.filter(a => ['approved', 'final_approval'].includes(normalize(a.status))).length;
    const ethicsPending = ethicsApps.filter(a => !TERMINAL_ETHICS.has(normalize(a.status))).length;

    return {
      activeProjects: activeProjects.length,
      proposedProjects,
      activeAwards: activeAwardsList.length,
      totalAwardValue,
      awardCurrency,
      openSubmissions: submissions.length,
      draftSubmissions: grantDraft + ethicsDraft,
      inReviewSubmissions: grantInReview + ethicsInReview,
      ethicsApproved,
      ethicsPending,
    };
  }, [activeProjects, awards, submissions, proposals, ethicsApps, projects]);

  const submissionColorMap = {
    grant_draft: '#f59e0b',
    grant_review: ACCENT,
    ethics_draft: '#64748b',
    ethics_review: '#0ea5e9',
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

  const MetricCard = ({ icon: Icon, iconColor, iconBg, label, value, valueWord, valueWordColor, footer, progress, onClick }) => (
    <Box
      onClick={onClick}
      sx={{
        flex: '1 1 200px',
        bgcolor: 'background.paper',
        borderRadius: 2.5,
        px: 2,
        py: 1.5,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: dark ? 'none' : '0 1px 3px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.04)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
        '&:hover': onClick ? {
          borderColor: `${iconColor}55`,
          boxShadow: dark ? 'none' : `0 6px 18px ${iconColor}18`,
          transform: 'translateY(-1px)',
        } : {},
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.75 }}>
        <Box sx={{
          width: 32, height: 32, borderRadius: 2,
          bgcolor: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon sx={{ color: iconColor, fontSize: 18 }} />
        </Box>
        <Typography sx={{ color: 'text.secondary', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, flex: 1, lineHeight: 1.2 }}>
          {label}
        </Typography>
        {onClick && <OpenIcon sx={{ fontSize: 14, color: 'text.disabled', opacity: 0.5 }} />}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: progress || footer ? 0.75 : 0 }}>
        <Typography component="span" sx={{ color: 'text.primary', fontSize: 26, fontWeight: 800, lineHeight: 1, letterSpacing: -0.5 }}>
          {value}
        </Typography>
        {valueWord && (
          <Typography component="span" sx={{ color: valueWordColor, fontSize: 15, fontWeight: 600, lineHeight: 1 }}>
            {valueWord}
          </Typography>
        )}
      </Box>

      {progress && (
        <Box sx={{ display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden', mb: 0.75, bgcolor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
          {progress.map((seg, i) => (
            <Box key={i} sx={{ width: `${seg.pct}%`, bgcolor: seg.color, minWidth: seg.pct > 0 ? 4 : 0 }} />
          ))}
        </Box>
      )}

      {footer}
    </Box>
  );

  const Dot = ({ color }) => (
    <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: color, display: 'inline-block', flexShrink: 0 }} />
  );

  const FooterRow = ({ items }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
      {items.map((item, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center' }}>
          {i > 0 && <Typography sx={{ fontSize: 11, color: 'text.disabled', mx: 0.5 }}>·</Typography>}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {item.dot && <Dot color={item.dot} />}
            {item.icon}
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', fontWeight: 500 }}>{item.text}</Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );

  const headCell = { fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary', whiteSpace: 'nowrap' };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  const firstName = user?.name?.split(' ')[0] || t('researcher.overview.fallbackName');
  const hour = new Date().getHours();
  const greeting = hour < 12
    ? t('researcher.overview.greetingMorning')
    : hour < 17
      ? t('researcher.overview.greetingAfternoon')
      : t('researcher.overview.greetingEvening');
  const todayLabel = new Date().toLocaleDateString(DATE_LOCALE_MAP[locale] || 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const institutionName = user?.institution_name || user?.institution?.name || t('researcher.overview.fallbackInstitution');

  const submissionTotal = stats.openSubmissions || 1;
  const draftPct = Math.round((stats.draftSubmissions / submissionTotal) * 100);
  const reviewPct = 100 - draftPct;

  const securedAmount = stats.totalAwardValue > 0
    ? t('researcher.overview.metrics.secured', {
      amount: `${stats.awardCurrency} ${stats.totalAwardValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
    })
    : t('researcher.overview.metrics.noFundingYet');

  return (
    <Box sx={{ px: { xs: 1.5, md: 2 }, py: { xs: 2, md: 2.5 }, width: '100%' }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3.5, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ color: ACCENT, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', mb: 1 }}>
            {t('researcher.overview.headerBadge', { date: todayLabel, institution: institutionName })}
          </Typography>
          <Typography sx={{ color: '#0f172a', fontSize: { xs: 28, md: 32 }, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.15, mb: 0.75, ...(dark && { color: 'text.primary' }) }}>
            {greeting}, {firstName}
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14.5, maxWidth: 520 }}>
            {t('researcher.overview.subtitle')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          {lastUpdated && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981' }} />
              <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {t('researcher.overview.updatedJustNow')}
              </Typography>
            </Box>
          )}
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
            onClick={loadDashboard}
            sx={{
              textTransform: 'none', borderRadius: 2, fontWeight: 600, px: 2,
              borderColor: theme.palette.divider, color: 'text.primary',
              '&:hover': { borderColor: ACCENT, bgcolor: `${ACCENT}08` },
            }}
          >
            {t('researcher.overview.refresh')}
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <MetricCard
          icon={RocketIcon}
          iconColor="#1ca7a1"
          iconBg="rgba(28,167,161,0.12)"
          label={t('researcher.overview.metrics.activeProjects')}
          value={stats.activeProjects}
          valueWord={t('researcher.overview.metrics.running')}
          valueWordColor="#10b981"
          onClick={() => router.push('/researcher/projects')}
          footer={
            <FooterRow items={[
              { dot: '#10b981', text: t('researcher.overview.metrics.runningCount', { count: stats.activeProjects }) },
              { dot: '#f59e0b', text: t('researcher.overview.metrics.proposedCount', { count: stats.proposedProjects }) },
            ]} />
          }
        />
        <MetricCard
          icon={AwardIcon}
          iconColor="#d97706"
          iconBg="rgba(217,119,6,0.12)"
          label={t('researcher.overview.metrics.activeAwards')}
          value={stats.activeAwards}
          valueWord={t('researcher.overview.metrics.funded')}
          valueWordColor="#d97706"
          onClick={() => router.push('/researcher/grants/awards')}
          footer={
            <FooterRow items={[{
              icon: <HandshakeIcon sx={{ fontSize: 15, color: '#d97706' }} />,
              text: securedAmount,
            }]} />
          }
        />
        <MetricCard
          icon={AssignmentIcon}
          iconColor="#6366f1"
          iconBg="rgba(99,102,241,0.12)"
          label={t('researcher.overview.metrics.openSubmissions')}
          value={stats.openSubmissions}
          valueWord={t('researcher.overview.metrics.open')}
          valueWordColor="#4338ca"
          progress={stats.openSubmissions > 0 ? [
            { pct: draftPct, color: '#6366f1' },
            { pct: reviewPct, color: ACCENT },
          ] : [{ pct: 100, color: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}
          footer={
            <FooterRow items={[
              { text: t('researcher.overview.metrics.draftCount', { count: stats.draftSubmissions }) },
              { text: t('researcher.overview.metrics.inReviewCount', { count: stats.inReviewSubmissions }) },
            ]} />
          }
        />
        <MetricCard
          icon={VerifiedIcon}
          iconColor="#10b981"
          iconBg="rgba(16,185,129,0.12)"
          label={t('researcher.overview.metrics.ethicsCleared')}
          value={stats.ethicsApproved}
          valueWord={t('researcher.overview.metrics.approved')}
          valueWordColor="#10b981"
          onClick={() => router.push('/researcher/ethics')}
          footer={
            <FooterRow items={[
              { dot: '#10b981', text: t('researcher.overview.metrics.approvedCount', { count: stats.ethicsApproved }) },
              { dot: stats.ethicsPending > 0 ? '#f59e0b' : '#cbd5e1', text: t('researcher.overview.metrics.pendingCount', { count: stats.ethicsPending }) },
            ]} />
          }
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 2.5, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ flex: '1 1 280px' }}>
          <Typography sx={{ color: ACCENT, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', mb: 0.5 }}>
            {t('researcher.overview.portfolio')}
          </Typography>
          <Typography sx={{ color: 'text.primary', fontSize: 16, fontWeight: 600, mb: 2 }}>
            {t('researcher.overview.projectsByStatus')}
          </Typography>
          <BarChart
            data={projectChartData}
            colorMap={PROJECT_STATUS_COLORS}
            labelMap={projectLabelMap}
            dark={dark}
            emptyLabel={t('researcher.overview.noDataYet')}
          />
        </Card>
        <Card sx={{ flex: '1 1 280px' }}>
          <Typography sx={{ color: '#f97316', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', mb: 0.5 }}>
            {t('researcher.overview.pipeline')}
          </Typography>
          <Typography sx={{ color: 'text.primary', fontSize: 16, fontWeight: 600, mb: 2 }}>
            {t('researcher.overview.submissionsOverview')}
          </Typography>
          <BarChart
            data={submissionChartData}
            colorMap={submissionColorMap}
            labelMap={submissionLabelMap}
            dark={dark}
            emptyLabel={t('researcher.overview.noDataYet')}
          />
        </Card>
      </Box>

      <Card sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography sx={{ color: '#10b981', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', mb: 0.5 }}>
              {t('researcher.overview.running')}
            </Typography>
            <Typography sx={{ color: 'text.primary', fontSize: 16, fontWeight: 600 }}>
              {t('researcher.overview.activeProjectsTitle')}
            </Typography>
          </Box>
          <Button
            size="small"
            endIcon={<OpenIcon sx={{ fontSize: 14 }} />}
            onClick={() => router.push('/researcher/projects')}
            sx={{ textTransform: 'none', color: ACCENT }}
          >
            {t('researcher.overview.allProjects')}
          </Button>
        </Box>

        {activeProjects.length === 0 ? (
          <Typography sx={{ color: 'text.secondary', fontSize: 13, py: 3, textAlign: 'center' }}>
            {t('researcher.overview.noActiveProjects')}
          </Typography>
        ) : (
          <Paper elevation={0} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
                    <TableCell sx={headCell}>{t('researcher.overview.table.project')}</TableCell>
                    <TableCell sx={headCell}>{t('researcher.overview.table.funder')}</TableCell>
                    <TableCell sx={headCell} align="right">{t('researcher.overview.table.award')}</TableCell>
                    <TableCell sx={headCell}>{t('researcher.overview.table.period')}</TableCell>
                    <TableCell sx={headCell}>{t('researcher.overview.table.ethics')}</TableCell>
                    <TableCell sx={headCell}>{t('researcher.overview.table.progress')}</TableCell>
                    <TableCell sx={headCell} align="right">{t('researcher.overview.table.action')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activeProjects.slice(0, 8).map(p => {
                    const total = p.milestone_count || 0;
                    const done = p.done_milestone_count || 0;
                    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                    const ethicsStatus = normalize(p.ethics_status);
                    const ethicsColor = ETHICS_STATUS_COLORS[ethicsStatus] || '#64748b';
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
                            ? (
                              <StatusChip
                                label={statusLabel('ethicsStatus', ethicsStatus)}
                                color={ethicsColor}
                              />
                            )
                            : <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>—</Typography>}
                        </TableCell>
                        <TableCell sx={{ minWidth: 120 }}>
                          <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.5 }}>
                            {t('researcher.overview.table.milestones', { done, total, pct })}
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
              {t('researcher.overview.inProgress')}
            </Typography>
            <Typography sx={{ color: 'text.primary', fontSize: 16, fontWeight: 600 }}>
              {t('researcher.overview.submissionsTitle')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              onClick={() => router.push('/researcher/grants/proposals')}
              sx={{ textTransform: 'none', color: ACCENT }}
            >
              {t('researcher.overview.proposals')}
            </Button>
            <Button
              size="small"
              onClick={() => router.push('/researcher/ethics')}
              sx={{ textTransform: 'none', color: ACCENT }}
            >
              {t('researcher.overview.ethics')}
            </Button>
          </Box>
        </Box>

        {submissions.length === 0 ? (
          <Typography sx={{ color: 'text.secondary', fontSize: 13, py: 3, textAlign: 'center' }}>
            {t('researcher.overview.noOpenSubmissions')}
          </Typography>
        ) : (
          <Paper elevation={0} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
                    <TableCell sx={headCell}>{t('researcher.overview.table.type')}</TableCell>
                    <TableCell sx={headCell}>{t('researcher.overview.table.title')}</TableCell>
                    <TableCell sx={headCell}>{t('researcher.overview.table.reference')}</TableCell>
                    <TableCell sx={headCell}>{t('researcher.overview.table.status')}</TableCell>
                    <TableCell sx={headCell}>{t('researcher.overview.table.updated')}</TableCell>
                    <TableCell sx={headCell} align="right">{t('researcher.overview.table.action')}</TableCell>
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
