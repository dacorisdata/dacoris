'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, CircularProgress, Alert, Button, Chip, useTheme,
  ToggleButton, ToggleButtonGroup, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper,
} from '@mui/material';
import {
  Assessment as ReportsIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendIcon,
  Science as ProjectsIcon,
  Description as ProposalsIcon,
  Gavel as EthicsIcon,
  MenuBook as PublicationsIcon,
  Business as DepartmentIcon,
  ArrowForward as ArrowIcon,
  Download as DownloadIcon,
  Lightbulb as InsightIcon,
  EmojiEvents as LeaderIcon,
  Biotech as AreaIcon,
} from '@mui/icons-material';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line,
} from 'recharts';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../lib/api';

const ACCENT = '#0d9488';
const CHART_TOOLTIP_STYLE = {
  borderRadius: 8,
  border: '1px solid rgba(148,163,184,0.2)',
  fontSize: 12,
};

const fmtMoney = (n) =>
  n ? `KES ${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function ChartCard({ title, subtitle, children, action }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '12px',
        p: { xs: 2, md: 2.5 },
        height: '100%',
        boxShadow: dark ? 'none' : '0 1px 3px rgba(15,23,42,0.06)',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, gap: 1 }}>
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: ACCENT, mb: 0.25 }}>
            {subtitle}
          </Typography>
          <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary' }}>{title}</Typography>
        </Box>
        {action}
      </Box>
      {children}
    </Box>
  );
}

function KpiTile({ label, value, sub, color, icon: Icon, onClick }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        flex: '1 1 160px',
        minWidth: 0,
        p: 2,
        borderRadius: '12px',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.2s, transform 0.15s',
        '&:hover': onClick ? { borderColor: color, transform: 'translateY(-1px)' } : {},
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Box sx={{ width: 34, height: 34, borderRadius: '9px', bgcolor: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon sx={{ fontSize: 18, color }} />
        </Box>
        <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: 'text.secondary' }}>{label}</Typography>
      </Box>
      <Typography sx={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</Typography>
      {sub && <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.5 }}>{sub}</Typography>}
    </Box>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, px: 1.5, py: 1 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, mb: 0.5 }}>{label}</Typography>
      {payload.map((entry) => (
        <Typography key={entry.name} sx={{ fontSize: 12, color: entry.color }}>
          {entry.name}: <strong>{entry.value}</strong>
        </Typography>
      ))}
    </Box>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;
  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, px: 1.5, py: 1 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{item.label}</Typography>
      <Typography sx={{ fontSize: 12, color: item.color }}>{item.count} records</Typography>
    </Box>
  );
}

function EmptyChart({ message = 'No data available yet' }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 220 }}>
      <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>{message}</Typography>
    </Box>
  );
}

function InsightBox({ text }) {
  if (!text) return null;
  return (
    <Box sx={{
      mt: 2, p: 1.5, borderRadius: 2,
      bgcolor: 'rgba(13,148,136,0.06)', border: '1px solid rgba(13,148,136,0.18)',
      display: 'flex', gap: 1, alignItems: 'flex-start',
    }}>
      <InsightIcon sx={{ fontSize: 18, color: ACCENT, mt: 0.15, flexShrink: 0 }} />
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.55 }}>{text}</Typography>
    </Box>
  );
}

function InsightsPanel({ insights }) {
  if (!insights?.length) return null;
  return (
    <Box sx={{ mb: 3 }}>
      <ChartCard title="Decision Insights" subtitle="For research leadership">
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {insights.map((text, i) => (
            <Box key={i} sx={{
              display: 'flex', gap: 1.25, p: 1.5, borderRadius: 2,
              bgcolor: i === 0 ? 'rgba(13,148,136,0.08)' : 'transparent',
              border: '1px solid', borderColor: i === 0 ? 'rgba(13,148,136,0.22)' : 'divider',
            }}>
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: ACCENT, minWidth: 20 }}>{i + 1}.</Typography>
              <Typography sx={{ fontSize: 13, color: 'text.primary', lineHeight: 1.55 }}>{text}</Typography>
            </Box>
          ))}
        </Box>
      </ChartCard>
    </Box>
  );
}

export default function ReportsAnalyticsPage() {
  const router = useRouter();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const { fetchUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [trendMetric, setTrendMetric] = useState('all');
  const [downloading, setDownloading] = useState(null);

  const downloadReport = async (format) => {
    setDownloading(format);
    try {
      const res = await api.get(`/admin-staff/analytics/reports/download?format=${format}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: format === 'json' ? 'application/json' : 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const inst = (data?.institution_name || 'institution').replace(/\s+/g, '_');
      link.href = url;
      link.download = `${inst}_reports_${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download report.');
    } finally {
      setDownloading(null);
    }
  };

  const loadReports = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError('');
    try {
      const res = await api.get('/admin-staff/analytics/reports');
      setData(res.data);
    } catch {
      setError('Failed to load institutional reports.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin) { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    await loadReports();
    setLoading(false);
  };

  const summary = data?.summary;
  const charts = data?.charts;

  const trendData = useMemo(() => charts?.monthly_trend || [], [charts]);

  const pieData = useMemo(() => {
    const source = charts?.portfolio_mix || [];
    return source.map((d) => ({ ...d, name: d.label }));
  }, [charts]);

  const gridStroke = dark ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.25)';
  const axisColor = dark ? '#94a3b8' : '#64748b';

  const headCell = { fontSize: 11, fontWeight: 700, color: 'text.secondary', py: 1, whiteSpace: 'nowrap' };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 3 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.5 }}>
            <ReportsIcon sx={{ color: ACCENT, fontSize: 28 }} />
            <Typography sx={{ fontSize: 24, fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em' }}>
              Reports & Analytics
            </Typography>
          </Box>
          <Typography sx={{ color: 'text.secondary', fontSize: 13.5, maxWidth: 560 }}>
            High-level institutional insights across departments, projects, proposals, ethics compliance, and publications — designed for leadership decision-making.
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.25 }}>
            {data?.institution_name && (
              <Chip label={data.institution_name} size="small" sx={{ bgcolor: `${ACCENT}14`, color: ACCENT, fontWeight: 700 }} />
            )}
            {data?.generated_at && (
              <Chip
                label={`Updated ${new Date(data.generated_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: 11 }}
              />
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
            onClick={() => downloadReport('csv')}
            disabled={!!downloading}
            sx={{ textTransform: 'none', borderRadius: '9px', fontWeight: 600 }}
          >
            {downloading === 'csv' ? 'Downloading…' : 'Download CSV'}
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
            onClick={() => downloadReport('json')}
            disabled={!!downloading}
            sx={{ textTransform: 'none', borderRadius: '9px', fontWeight: 600 }}
          >
            {downloading === 'json' ? 'Downloading…' : 'Download JSON'}
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
            onClick={() => loadReports(true)}
            disabled={refreshing}
            sx={{ textTransform: 'none', borderRadius: '9px', fontWeight: 600 }}
          >
            {refreshing ? 'Refreshing…' : 'Refresh data'}
          </Button>
        </Box>
      </Box>

      {/* KPI row */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 3 }}>
        <KpiTile
          label="Proposal success"
          value={`${summary?.proposal_success_rate ?? 0}%`}
          sub={`${summary?.approved_proposals ?? 0} approved · ${summary?.total_proposals ?? 0} total`}
          color="#16a699"
          icon={ProposalsIcon}
          onClick={() => router.push('/admin-staff/grants/proposals')}
        />
        <KpiTile
          label="Funder award rate"
          value={`${summary?.funder_success_rate ?? 0}%`}
          sub={`${summary?.awarded_proposals ?? 0} awarded · ${summary?.applying_proposals ?? 0} applying`}
          color="#059669"
          icon={TrendIcon}
          onClick={() => router.push('/admin-staff/grants/awards')}
        />
        <KpiTile
          label="Active projects"
          value={summary?.active_projects ?? 0}
          sub={`${summary?.total_projects ?? 0} in portfolio · ${summary?.completed_projects ?? 0} completed · ${summary?.cancelled_projects ?? 0} cancelled`}
          color="#3b82f6"
          icon={ProjectsIcon}
          onClick={() => router.push('/admin-staff/research/projects')}
        />
        <KpiTile
          label="Ethics approval rate"
          value={`${summary?.ethics_approval_rate ?? 0}%`}
          sub={`${summary?.ethics_pending ?? 0} pending · ${summary?.ethics_expiring_soon ?? 0} expiring soon`}
          color="#10b981"
          icon={EthicsIcon}
          onClick={() => router.push('/admin-staff/ethics/reviews')}
        />
        <KpiTile
          label="Publications"
          value={summary?.total_publications ?? 0}
          sub={`${summary?.published_outputs ?? 0} published outputs`}
          color="#8b5cf6"
          icon={PublicationsIcon}
          onClick={() => router.push('/admin-staff/research/outputs')}
        />
        <KpiTile
          label="Total funding"
          value={fmtMoney(summary?.total_funding)}
          sub={`${summary?.active_awards ?? 0} active awards`}
          color="#f59e0b"
          icon={TrendIcon}
          onClick={() => router.push('/admin-staff/grants/awards')}
        />
      </Box>

      <InsightsPanel insights={data?.insights} />

      {/* Monthly trend */}
      <Box sx={{ mb: 3 }}>
        <ChartCard
          title="12-Month Activity Trend"
          subtitle="Institutional pipeline"
          action={
            <ToggleButtonGroup
              size="small"
              value={trendMetric}
              exclusive
              onChange={(_, v) => v && setTrendMetric(v)}
              sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontSize: 11, px: 1.25, py: 0.25 } }}
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="proposals">Proposals</ToggleButton>
              <ToggleButton value="projects">Projects</ToggleButton>
              <ToggleButton value="ethics">Ethics</ToggleButton>
              <ToggleButton value="publications">Publications</ToggleButton>
            </ToggleButtonGroup>
          }
        >
          {!trendData.length ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              {trendMetric === 'all' ? (
                <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradProposals" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a699" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#16a699" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradProjects" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="proposals" name="Proposals" stroke="#16a699" fill="url(#gradProposals)" strokeWidth={2} />
                  <Area type="monotone" dataKey="projects" name="Projects" stroke="#3b82f6" fill="url(#gradProjects)" strokeWidth={2} />
                  <Line type="monotone" dataKey="ethics" name="Ethics" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="publications" name="Publications" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </AreaChart>
              ) : (
                <LineChart data={trendData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey={trendMetric}
                    name={trendMetric.charAt(0).toUpperCase() + trendMetric.slice(1)}
                    stroke={trendMetric === 'proposals' ? '#16a699' : trendMetric === 'projects' ? '#3b82f6' : trendMetric === 'ethics' ? '#10b981' : '#8b5cf6'}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
          <InsightBox text={data?.insights?.[0]} />
        </ChartCard>
      </Box>

      {/* Research areas + funding */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 calc(50% - 8px)' }, minWidth: 0 }}>
          <ChartCard title="Top Research Areas" subtitle="Activity by focus area" action={<AreaIcon sx={{ color: ACCENT, fontSize: 20 }} />}>
            {!charts?.research_areas?.length ? (
              <EmptyChart message="Tag projects with research areas to unlock this view." />
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(260, charts.research_areas.length * 34)}>
                <BarChart data={charts.research_areas} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 11, fill: axisColor }} tickLine={false} axisLine={false} />
                  <Tooltip content={<PieTooltip />} cursor={{ fill: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }} />
                  <Bar dataKey="count" name="Activity score" radius={[0, 6, 6, 0]} barSize={18}>
                    {charts.research_areas.map((entry) => (
                      <Cell key={entry.label} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <InsightBox text={data?.insights?.[1]} />
          </ChartCard>
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 calc(50% - 8px)' }, minWidth: 0 }}>
          <ChartCard title="Highly Funded Areas" subtitle="Award totals by research area">
            {!charts?.funding_by_area?.length ? (
              <EmptyChart message="Funding by area appears once projects are linked to awards." />
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(260, charts.funding_by_area.length * 34)}>
                <BarChart
                  data={charts.funding_by_area.map(d => ({
                    ...d,
                    funding_m: Math.round((d.count || 0) / 1_000_000 * 10) / 10,
                  }))}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 11, fill: axisColor }} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(v, _n, props) => [
                      `${props.payload.currency || 'KES'} ${Number(props.payload.count).toLocaleString()}`,
                      'Total funding',
                    ]}
                    contentStyle={CHART_TOOLTIP_STYLE}
                  />
                  <Bar dataKey="count" name="Funding" radius={[0, 6, 6, 0]} barSize={18}>
                    {charts.funding_by_area.map((entry) => (
                      <Cell key={entry.label} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <InsightBox text={data?.insights?.[0]} />
          </ChartCard>
        </Box>
      </Box>

      {/* Department + portfolio mix */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box sx={{ flex: { xs: '1 1 100%', lg: '2 1 0' }, minWidth: 0 }}>
          <ChartCard title="Department Activity" subtitle="Cross-module output">
            {!data?.departments?.length ? (
              <EmptyChart message="Department data will appear once projects and researchers are tagged." />
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(260, data.departments.length * 36)}>
                <BarChart data={data.departments} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11, fill: axisColor }} tickLine={false} axisLine={false} />
                  <Tooltip content={<PieTooltip />} cursor={{ fill: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
                    {data.departments.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 320px' }, minWidth: 0 }}>
          <ChartCard title="Research Portfolio Mix" subtitle="Volume by module">
            {!pieData.length ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={96}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Box>
      </Box>

      {/* Status breakdown charts */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        {[
          { title: 'Proposals by Status', subtitle: 'Grant pipeline', data: charts?.proposals_by_status, path: '/admin-staff/grants/proposals' },
          { title: 'Projects by Status', subtitle: 'Research portfolio', data: charts?.projects_by_status, path: '/admin-staff/research/projects' },
          { title: 'Ethics Compliance', subtitle: 'Application outcomes', data: charts?.ethics_by_status, path: '/admin-staff/ethics/reviews' },
          { title: 'Publications & Manuscripts', subtitle: 'Output lifecycle', data: charts?.publications_by_status, path: '/admin-staff/research/outputs' },
        ].map((chart) => (
          <Box key={chart.title} sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 8px)', xl: '1 1 calc(25% - 12px)' }, minWidth: 0 }}>
            <ChartCard
              title={chart.title}
              subtitle={chart.subtitle}
              action={
                <Button size="small" endIcon={<ArrowIcon sx={{ fontSize: 14 }} />} onClick={() => router.push(chart.path)}
                  sx={{ textTransform: 'none', fontSize: 11, color: ACCENT, minWidth: 0, px: 0 }}>
                  View
                </Button>
              }
            >
              {!chart.data?.length ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chart.data} margin={{ top: 4, right: 4, left: -20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: axisColor }} tickLine={false} axisLine={false} angle={-35} textAnchor="end" height={50} interval={0} />
                    <YAxis tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<PieTooltip />} cursor={{ fill: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={28}>
                      {chart.data.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </Box>
        ))}
      </Box>

      {/* Top researchers */}
      <Box sx={{ mb: 3 }}>
        <ChartCard
          title="Top Researchers"
          subtitle="Publications, manuscripts, grants & projects"
          action={<LeaderIcon sx={{ color: '#f59e0b', fontSize: 22 }} />}
        >
          {!data?.top_researchers?.length ? (
            <EmptyChart message="Researcher metrics appear once faculty start publishing and applying for grants." />
          ) : (
            <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
                    <TableCell sx={headCell}>#</TableCell>
                    <TableCell sx={headCell}>Researcher</TableCell>
                    <TableCell sx={headCell}>Department</TableCell>
                    <TableCell sx={headCell} align="center">Publications</TableCell>
                    <TableCell sx={headCell} align="center">Manuscripts</TableCell>
                    <TableCell sx={headCell} align="center">Proposals</TableCell>
                    <TableCell sx={headCell} align="center">Success</TableCell>
                    <TableCell sx={headCell} align="center">Grants Won</TableCell>
                    <TableCell sx={headCell} align="center">Ongoing</TableCell>
                    <TableCell sx={headCell} align="center">Completed</TableCell>
                    <TableCell sx={headCell} align="center">Cancelled</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.top_researchers.map((r, idx) => (
                    <TableRow key={r.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                      <TableCell sx={{ fontSize: 12, fontWeight: 800, color: idx < 3 ? '#f59e0b' : 'text.secondary' }}>
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{r.name}</Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{r.email}</Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{r.department}</TableCell>
                      <TableCell align="center" sx={{ fontSize: 13, fontWeight: 600 }}>{r.publications}</TableCell>
                      <TableCell align="center" sx={{ fontSize: 13 }}>{r.manuscripts}</TableCell>
                      <TableCell align="center" sx={{ fontSize: 13 }}>{r.proposals_total}</TableCell>
                      <TableCell align="center">
                        <Chip label={`${r.proposal_success_rate}%`} size="small"
                          sx={{ height: 22, fontSize: 10.5, fontWeight: 700,
                            bgcolor: r.proposal_success_rate >= 50 ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                            color: r.proposal_success_rate >= 50 ? '#10b981' : '#f59e0b' }} />
                      </TableCell>
                      <TableCell align="center" sx={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>{r.grants_won}</TableCell>
                      <TableCell align="center" sx={{ fontSize: 13, color: '#3b82f6' }}>{r.projects_ongoing}</TableCell>
                      <TableCell align="center" sx={{ fontSize: 13, color: '#0ea5e9' }}>{r.projects_completed}</TableCell>
                      <TableCell align="center" sx={{ fontSize: 13, color: '#ef4444' }}>{r.projects_cancelled}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          <InsightBox text={data?.insights?.[2]} />
        </ChartCard>
      </Box>

      {/* Key projects table */}
      <ChartCard
        title="Key Projects"
        subtitle="Active & proposed"
        action={
          <Button size="small" endIcon={<ArrowIcon sx={{ fontSize: 14 }} />} onClick={() => router.push('/admin-staff/research/projects')}
            sx={{ textTransform: 'none', fontSize: 11, color: ACCENT }}>
            All projects
          </Button>
        }
      >
        {!data?.key_projects?.length ? (
          <EmptyChart message="No active or proposed projects yet." />
        ) : (
          <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
                  <TableCell sx={headCell}>Project</TableCell>
                  <TableCell sx={headCell}>Department</TableCell>
                  <TableCell sx={headCell}>Research area</TableCell>
                  <TableCell sx={headCell}>Status</TableCell>
                  <TableCell sx={headCell}>Timeline</TableCell>
                  <TableCell sx={headCell} align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {data.key_projects.map((project) => (
                  <TableRow
                    key={project.id}
                    hover
                    onClick={() => router.push(`/admin-staff/research/projects/${project.id}`)}
                    sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
                  >
                    <TableCell>
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }} noWrap>{project.title}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                        <DepartmentIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography sx={{ fontSize: 12 }}>{project.department}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }} noWrap>
                        {project.research_area || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={(project.status || '').replace(/_/g, ' ')}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: 10.5,
                          fontWeight: 700,
                          textTransform: 'capitalize',
                          bgcolor: project.status === 'active' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                          color: project.status === 'active' ? '#10b981' : '#f59e0b',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap', color: 'text.secondary' }}>
                      {fmtDate(project.start_date)} – {fmtDate(project.end_date)}
                    </TableCell>
                    <TableCell align="right">
                      <ArrowIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </ChartCard>
    </Box>
  );
}
