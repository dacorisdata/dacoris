'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, CircularProgress, useTheme, Chip } from '@mui/material';
import {
  BarChart as BarChartIcon,
  Assignment as AssignmentIcon,
  AccountBalance as FinanceIcon,
  Science as EthicsIcon,
  Folder as ProjectsIcon,
  EmojiEvents as AwardsIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../lib/api';

const ACCENT = '#6366f1';

export default function AnalyticsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark  = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [stats, setStats]     = useState({ opps: 0, proposals: 0, awards: 0, projects: 0, ethics: 0 });

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin)      { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }

    const [oppsRes, propsRes, projRes] = await Promise.all([
      api.get('/api/grants/opportunities').catch(() => ({ data: [] })),
      api.get('/api/grants/proposals').catch(() => ({ data: [] })),
      api.get('/api/research/projects').catch(() => ({ data: [] })),
    ]);

    const projects = projRes.data || [];
    let ethicsTotal = 0;
    for (const proj of projects.slice(0, 10)) {
      const r = await api.get(`/api/research/ethics/project/${proj.id}`).catch(() => ({ data: [] }));
      ethicsTotal += (r.data || []).length;
    }

    setStats({
      opps:      (oppsRes.data || []).filter(o => o.status === 'open').length,
      proposals: (propsRes.data || []).length,
      awards:    (propsRes.data || []).filter(p => p.status === 'approved').length,
      projects:  projects.length,
      ethics:    ethicsTotal,
    });
    setLoading(false);
  };

  const KPICard = ({ icon: Icon, label, value, color, bg, sub }) => (
    <Box sx={{
      flex: '1 1 200px', bgcolor: 'background.paper', borderRadius: 3, p: 3,
      border: `1px solid ${theme.palette.divider}`,
      boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
        <Box sx={{ width: 46, height: 46, borderRadius: 2, bgcolor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon sx={{ color, fontSize: 22 }} />
        </Box>
        <Box>
          <Typography sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Typography>
          <Typography sx={{ color: 'text.primary', fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>{value}</Typography>
        </Box>
      </Box>
      {sub && <Typography sx={{ color: 'text.disabled', fontSize: 12 }}>{sub}</Typography>}
    </Box>
  );

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ color: 'text.primary', fontSize: 26, fontWeight: 700, mb: 0.5 }}>Analytics</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>Institution-wide research and grants portfolio overview</Typography>
        </Box>
        <Chip label="Live Data" size="small" sx={{ bgcolor: 'rgba(16,185,129,0.12)', color: '#10b981', fontWeight: 700, fontSize: 11, ml: 'auto' }} />
      </Box>

      {/* KPI Cards */}
      <Box sx={{ display: 'flex', gap: 2.5, mb: 4, flexWrap: 'wrap' }}>
        <KPICard icon={AssignmentIcon} label="Open Opportunities" value={stats.opps}      color="#8b5cf6" bg="rgba(139,92,246,0.1)" sub="Active funding calls" />
        <KPICard icon={ProjectsIcon}   label="Total Proposals"   value={stats.proposals}  color="#3b82f6" bg="rgba(59,130,246,0.1)"  sub="Across all statuses" />
        <KPICard icon={AwardsIcon}     label="Awards Issued"     value={stats.awards}     color="#10b981" bg="rgba(16,185,129,0.1)"  sub="Approved proposals" />
        <KPICard icon={ProjectsIcon}   label="Research Projects" value={stats.projects}   color="#f59e0b" bg="rgba(245,158,11,0.1)"  sub="Registered projects" />
        <KPICard icon={EthicsIcon}     label="Ethics Records"    value={stats.ethics}     color="#06b6d4" bg="rgba(6,182,212,0.1)"   sub="Applications logged" />
      </Box>

      {/* Charts placeholder */}
      <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
        {[
          { title: 'Grant Pipeline by Stage', sub: 'Opportunity → Proposal → Award', color: '#8b5cf6' },
          { title: 'Budget vs. Actuals',       sub: 'Real-time spend tracking',        color: '#f59e0b' },
          { title: 'Ethics Workload',           sub: 'Applications by committee stage', color: '#10b981' },
          { title: 'Research Output Trend',     sub: 'Publications, datasets, patents',  color: '#3b82f6' },
        ].map(({ title, sub, color }) => (
          <Box key={title} sx={{
            flex: '1 1 280px', bgcolor: 'background.paper', borderRadius: 3, p: 3,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
            minHeight: 200, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
            <Box>
              <Typography sx={{ color: 'text.primary', fontSize: 15, fontWeight: 600, mb: 0.5 }}>{title}</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>{sub}</Typography>
            </Box>
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1.5, py: 2 }}>
              <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChartIcon sx={{ color, fontSize: 24 }} />
              </Box>
              <Typography sx={{ color: 'text.disabled', fontSize: 12 }}>Chart rendering in Phase G4 / 3B</Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
