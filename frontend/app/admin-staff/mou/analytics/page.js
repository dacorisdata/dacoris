'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Chip, CircularProgress, useTheme, Alert } from '@mui/material';
import { BarChart as AnalyticsIcon, Handshake as MouIcon, People as PartnersIcon } from '@mui/icons-material';
import api from '../../../../lib/api';

const ACCENT = '#16a699';

const STATUS_COLORS = {
  DRAFT:           '#64748b',
  INTERNAL_REVIEW: '#f59e0b',
  LEGAL_REVIEW:    '#f97316',
  EXEC_APPROVAL:   '#0b3c5d',
  PENDING_SIGNING: '#3b82f6',
  ACTIVE:          '#10b981',
  MID_TERM_REVIEW: '#06b6d4',
  PENDING_RENEWAL: '#f59e0b',
  SUSPENDED:       '#ef4444',
  EXPIRED:         '#ef4444',
  CLOSED:          '#94a3b8',
  ARCHIVED:        '#94a3b8',
};

const TYPE_COLORS = {
  GENERAL_COLLABORATION: '#16a699',
  ACADEMIC_EXCHANGE:     '#3b82f6',
  RESEARCH_PARTNERSHIP:  '#10b981',
  DATA_SHARING:          '#06b6d4',
  JOINT_DEGREE:          '#f59e0b',
  CLINICAL:              '#ef4444',
  INDUSTRY:              '#f97316',
  CONSORTIUM:            '#0b3c5d',
  CO_FUNDING:            '#ec4899',
};

const TYPE_LABELS = {
  GENERAL_COLLABORATION: 'General Collab',
  ACADEMIC_EXCHANGE: 'Academic Exchange',
  RESEARCH_PARTNERSHIP: 'Research Partnership',
  DATA_SHARING: 'Data Sharing',
  JOINT_DEGREE: 'Joint Degree',
  CLINICAL: 'Clinical',
  INDUSTRY: 'Industry',
  CONSORTIUM: 'Consortium',
  CO_FUNDING: 'Co-Funding',
};

export default function MouAnalyticsPage() {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const router = useRouter();

  const [dashboard, setDashboard] = useState(null);
  const [byStatus, setByStatus] = useState([]);
  const [byType, setByType] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [d, s, t] = await Promise.all([
        api.get('/mou/analytics/dashboard').catch(() => ({ data: {} })),
        api.get('/mou/analytics/by-status').catch(() => ({ data: [] })),
        api.get('/mou/analytics/by-type').catch(() => ({ data: [] })),
      ]);
      setDashboard(d.data || {});
      setByStatus(s.data || []);
      setByType(t.data || []);
    } catch (e) {
      setError('Failed to load analytics.');
    }
    setLoading(false);
  };

  const Card = ({ children, sx = {} }) => (
    <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 3,
      border: `1px solid ${theme.palette.divider}`,
      boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
      ...sx }}>
      {children}
    </Box>
  );

  const BarChart = ({ data, colorMap, labelMap, title, subtitle, colorKey }) => {
    if (!data.length) return (
      <Typography sx={{ color: 'text.disabled', fontSize: 13, textAlign: 'center', py: 3 }}>No data</Typography>
    );
    const maxCount = Math.max(...data.map(d => d.count), 1);
    return (
      <Box>
        {data.map(item => {
          const key = item[colorKey];
          const color = colorMap[key] || '#64748b';
          const label = labelMap?.[key] || key?.replace(/_/g, ' ') || key;
          const pct = (item.count / maxCount) * 100;
          return (
            <Box key={key} sx={{ mb: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={{ fontSize: 12, color: 'text.primary', fontWeight: 500 }}>{label}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color }}>{item.count}</Typography>
              </Box>
              <Box sx={{ height: 8, bgcolor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: color, borderRadius: 2, transition: 'width 0.4s' }} />
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  };

  const Stat = ({ label, value, color = 'text.primary', bg, path }) => (
    <Box onClick={path ? () => router.push(path) : undefined}
      sx={{ flex: '1 1 120px', minWidth: 0, textAlign: 'center', p: 2, borderRadius: 2.5,
        bgcolor: bg || (dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
        cursor: path ? 'pointer' : 'default',
        border: `1px solid ${theme.palette.divider}`,
        transition: 'border-color 0.2s',
        ...(path ? { '&:hover': { borderColor: color } } : {}) }}>
      <Typography sx={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1.2 }}>{value ?? '—'}</Typography>
      <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.3, fontWeight: 500 }}>{label}</Typography>
    </Box>
  );

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <CircularProgress sx={{ color: ACCENT }} />
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
        <AnalyticsIcon sx={{ color: ACCENT }} />
        <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'text.primary' }}>MoU Analytics</Typography>
      </Box>
      <Typography sx={{ color: 'text.secondary', fontSize: 13, mb: 3 }}>
        Portfolio-level metrics for your MoU programme.
      </Typography>

      {/* Top KPI row */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Stat label="Total MoUs"       value={dashboard?.total}           color="#16a699"  bg="rgba(22,166,153,0.06)" path="/admin-staff/mou/list" />
        <Stat label="Active"           value={dashboard?.active}          color="#10b981"  bg="rgba(16,185,129,0.06)" path="/admin-staff/mou/list?status=ACTIVE" />
        <Stat label="Draft"            value={dashboard?.draft}           color="#64748b"  path="/admin-staff/mou/list?status=DRAFT" />
        <Stat label="Pending Signing"  value={dashboard?.pending_signing} color="#3b82f6"  path="/admin-staff/mou/list?status=PENDING_SIGNING" />
        <Stat label="Pending Renewal"  value={dashboard?.pending_renewal} color="#f59e0b"  path="/admin-staff/mou/list?status=PENDING_RENEWAL" />
        <Stat label="Expired"          value={dashboard?.expired}         color="#ef4444"  path="/admin-staff/mou/list?status=EXPIRED" />
        <Stat label="Partners"         value={dashboard?.total_partners}  color={ACCENT}   path="/admin-staff/mou/partners" />
      </Box>

      {/* Charts */}
      <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
        <Card sx={{ flex: '1 1 320px' }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.3 }}>By Status</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>MoU count per lifecycle stage</Typography>
          <BarChart data={byStatus} colorMap={STATUS_COLORS} labelMap={null} colorKey="status" />
        </Card>

        <Card sx={{ flex: '1 1 320px' }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.3 }}>By Type</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>Distribution across agreement types</Typography>
          <BarChart data={byType} colorMap={TYPE_COLORS} labelMap={TYPE_LABELS} colorKey="type" />
        </Card>

        <Card sx={{ flex: '1 1 240px' }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.3 }}>Deliverables</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 3 }}>Activity completion across active MoUs</Typography>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography sx={{ fontSize: 52, fontWeight: 800, color: '#10b981', lineHeight: 1 }}>
              {dashboard?.completion_rate ?? 0}<span style={{ fontSize: 24 }}>%</span>
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>Overall completion rate</Typography>
          </Box>
          <Box sx={{ height: 10, bgcolor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: 5, overflow: 'hidden', mb: 2 }}>
            <Box sx={{ height: '100%', width: `${dashboard?.completion_rate ?? 0}%`, bgcolor: '#10b981', borderRadius: 5, transition: 'width 0.5s' }} />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>{dashboard?.completed_activities ?? 0}</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Completed</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: 20, fontWeight: 700, color: 'text.primary' }}>{dashboard?.total_activities ?? 0}</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Total</Typography>
            </Box>
          </Box>
        </Card>
      </Box>
    </Box>
  );
}
