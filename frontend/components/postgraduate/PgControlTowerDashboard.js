'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  useTheme,
} from '@mui/material';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { Refresh as RefreshIcon } from '@mui/icons-material';

const ACCENT = '#006D5B';
const ACCENT_LIGHT = '#0d9488';
const CHART_COLORS = ['#006D5B', '#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4'];

function KpiCard({ label, value, onClick }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: 2,
        flex: '1 1 140px',
        minWidth: 0,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: dark ? 'background.paper' : 'rgba(248,250,252,0.9)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': onClick ? { borderColor: ACCENT, boxShadow: `0 2px 8px ${ACCENT}22` } : {},
      }}
    >
      <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.75, lineHeight: 1.3 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'text.primary', lineHeight: 1.1 }}>
        {value}
      </Typography>
    </Paper>
  );
}

function ChartPanel({ title, description, children, action }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        height: '100%',
        borderRadius: 2,
        border: '2px solid',
        borderColor: dark ? 'rgba(0,109,91,0.35)' : ACCENT,
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1, gap: 1 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary' }}>
          {title}
        </Typography>
        {action}
      </Box>
      <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2, lineHeight: 1.5 }}>
        {description}
      </Typography>
      <Box sx={{ flex: 1, minHeight: 220 }}>{children}</Box>
    </Paper>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, px: 1.5, py: 1 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, mb: 0.5 }}>{label}</Typography>
      {payload.map((entry) => (
        <Typography key={entry.name} sx={{ fontSize: 12, color: entry.color || ACCENT }}>
          {entry.name}: <strong>{entry.value}</strong>
        </Typography>
      ))}
    </Box>
  );
}

function EmptyChart({ message = 'No data available' }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200 }}>
      <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>{message}</Typography>
    </Box>
  );
}

function truncateLabel(value, max = 14) {
  if (!value) return '—';
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export default function PgControlTowerDashboard({ data, onRefresh, refreshing }) {
  const router = useRouter();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const stageData = useMemo(
    () => (data?.stage_distribution || []).map((row) => ({
      name: truncateLabel(row.stage, 12),
      fullName: row.stage,
      count: row.count,
    })),
    [data?.stage_distribution],
  );

  const deptData = useMemo(
    () => (data?.department_bottlenecks || []).map((row) => ({
      name: truncateLabel(row.department, 16),
      fullName: row.department,
      overdue: row.overdue_count,
      blockStage: row.top_block_stage,
    })),
    [data?.department_bottlenecks],
  );

  const supervisorData = useMemo(
    () => (data?.supervisor_workload || []).map((row) => ({
      name: truncateLabel(row.supervisor, 18),
      fullName: row.supervisor,
      assigned: row.assigned_students,
      atRisk: row.at_risk,
      overdue: row.overdue,
    })),
    [data?.supervisor_workload],
  );

  const interventionData = useMemo(
    () => (data?.interventions_by_category || []).map((row) => ({
      name: truncateLabel(row.category, 16),
      fullName: row.category,
      count: row.count,
    })),
    [data?.interventions_by_category],
  );

  const clearanceData = useMemo(() => {
    const summary = data?.clearance_summary || {};
    return [
      { name: 'Publication', count: summary.publication_cleared || 0 },
      { name: 'Thesis', count: summary.thesis_cleared || 0 },
      { name: 'Defense', count: summary.defense_cleared || 0 },
      { name: 'Fully cleared', count: summary.fully_cleared || 0 },
    ];
  }, [data?.clearance_summary]);

  const forecastData = useMemo(() => {
    const forecast = data?.completion_forecast || {};
    return [
      { name: 'Expected defenses', count: forecast.expected_defenses || 0 },
      { name: 'Graduation ready', count: forecast.graduation_ready || 0 },
      { name: 'Senior intervention', count: forecast.needs_senior_intervention || 0 },
    ];
  }, [data?.completion_forecast]);

  const kpis = [
    { label: 'Total Postgraduates', value: data?.total_students ?? '—', path: '/admin-staff/postgraduate/students' },
    { label: 'Active MSc', value: data?.active_msc ?? '—', path: '/admin-staff/postgraduate/students' },
    { label: 'Active PhD', value: data?.active_phd ?? '—', path: '/admin-staff/postgraduate/students' },
    { label: 'At-risk cases', value: data?.at_risk_count ?? '—', path: '/admin-staff/postgraduate/students' },
    { label: 'Overdue supervisor reports', value: data?.overdue_supervisor_reports ?? '—', path: '/admin-staff/postgraduate/interventions' },
    { label: 'Publication-compliant', value: data?.publication_compliant_pct != null ? `${data.publication_compliant_pct}%` : '—', path: '/admin-staff/postgraduate/clearance' },
  ];

  const gridStroke = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const axisColor = dark ? '#94a3b8' : '#64748b';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={onRefresh}
          disabled={refreshing}
          sx={{ borderColor: ACCENT, color: ACCENT }}
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 3 }}>
        {kpis.map((kpi, index) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            onClick={() => router.push(kpi.path)}
          />
        ))}
      </Box>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={4}>
          <ChartPanel
            title="Stage Distribution"
            description="Coursework | Proposal | Ethics | Data | Thesis | Defense | Corrections | Graduation"
          >
            {stageData.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stageData} margin={{ top: 4, right: 4, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: axisColor }} angle={-35} textAnchor="end" interval={0} height={60} />
                  <YAxis tick={{ fontSize: 11, fill: axisColor }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(bar) => router.push('/admin-staff/postgraduate/students')}>
                    {stageData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartPanel>
        </Grid>

        <Grid item xs={12} md={4}>
          <ChartPanel
            title="Department Bottlenecks"
            description="Which departments have the highest overdue students and where the block occurs"
          >
            {deptData.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={deptData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: axisColor }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: axisColor }} width={90} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0]?.payload;
                      return (
                        <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, px: 1.5, py: 1 }}>
                          <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{row?.fullName}</Typography>
                          <Typography sx={{ fontSize: 12 }}>Overdue: {row?.overdue}</Typography>
                          <Typography sx={{ fontSize: 12, color: ACCENT }}>Top block: {row?.blockStage || '—'}</Typography>
                        </Box>
                      );
                    }}
                  />
                  <Bar dataKey="overdue" name="Overdue students" fill={ACCENT} radius={[0, 4, 4, 0]} cursor="pointer" onClick={() => router.push('/admin-staff/postgraduate/students')} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="No overdue bottlenecks detected" />
            )}
          </ChartPanel>
        </Grid>

        <Grid item xs={12} md={4}>
          <ChartPanel
            title="Supervisor Workload & Risk"
            description="Assigned students, overdue feedback, average response time, stuck-case reports"
          >
            {supervisorData.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={supervisorData} margin={{ top: 4, right: 4, left: -16, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: axisColor }} angle={-30} textAnchor="end" interval={0} height={55} />
                  <YAxis tick={{ fontSize: 11, fill: axisColor }} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0]?.payload;
                      return (
                        <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, px: 1.5, py: 1 }}>
                          <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{row?.fullName}</Typography>
                          <Typography sx={{ fontSize: 12 }}>Assigned: {row?.assigned}</Typography>
                          <Typography sx={{ fontSize: 12, color: '#f59e0b' }}>At risk: {row?.atRisk}</Typography>
                          <Typography sx={{ fontSize: 12, color: '#ef4444' }}>Overdue: {row?.overdue}</Typography>
                        </Box>
                      );
                    }}
                  />
                  <Bar dataKey="assigned" name="Assigned" fill={ACCENT_LIGHT} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="atRisk" name="At risk" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartPanel>
        </Grid>

        <Grid item xs={12} md={4}>
          <ChartPanel
            title="Intervention Queue"
            description="Fees, coursework, supervisor delay, analysis support, data access, ethics delay"
            action={(
              <Button size="small" sx={{ color: ACCENT, fontSize: 11 }} onClick={() => router.push('/admin-staff/postgraduate/interventions')}>
                View all
              </Button>
            )}
          >
            {interventionData.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={interventionData} margin={{ top: 4, right: 4, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: axisColor }} angle={-25} textAnchor="end" interval={0} height={55} />
                  <YAxis tick={{ fontSize: 11, fill: axisColor }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="count"
                    name="Open cases"
                    fill={ACCENT}
                    radius={[4, 4, 0, 0]}
                    cursor="pointer"
                    onClick={() => router.push('/admin-staff/postgraduate/interventions')}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="No open interventions" />
            )}
          </ChartPanel>
        </Grid>

        <Grid item xs={12} md={4}>
          <ChartPanel
            title="Publication & Thesis Clearance"
            description="Papers submitted, accepted, published, DOI/ORCID verification, thesis repository status"
            action={(
              <Button size="small" sx={{ color: ACCENT, fontSize: 11 }} onClick={() => router.push('/admin-staff/postgraduate/clearance')}>
                View clearance
              </Button>
            )}
          >
            {clearanceData.some((row) => row.count > 0) ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={clearanceData} margin={{ top: 4, right: 4, left: -16, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: axisColor }} />
                  <YAxis tick={{ fontSize: 11, fill: axisColor }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Students cleared" fill={ACCENT_LIGHT} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="Clearance data will populate as students progress" />
            )}
          </ChartPanel>
        </Grid>

        <Grid item xs={12} md={4}>
          <ChartPanel
            title="Completion Forecast"
            description="Expected defenses, graduation readiness, cases needing senior intervention"
          >
            {forecastData.some((row) => row.count > 0) ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={forecastData} margin={{ top: 4, right: 4, left: -16, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: axisColor }} interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: axisColor }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
                    {forecastData.map((row, i) => (
                      <Cell
                        key={row.name}
                        fill={row.name.includes('intervention') ? '#ef4444' : CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartPanel>
        </Grid>
      </Grid>
    </Box>
  );
}
