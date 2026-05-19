'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Chip, CircularProgress,
  useTheme, LinearProgress,
} from '@mui/material';
import {
  Handshake as MouIcon, Add as AddIcon,
  CheckCircle as ActiveIcon, Schedule as PendingIcon,
  Warning as ExpiryIcon, Cancel as ExpiredIcon,
  People as PartnersIcon, Assignment as ActivityIcon,
  BarChart as AnalyticsIcon, ArrowForward as ArrowIcon,
  Gavel as LegalIcon, Autorenew as RenewalIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../lib/api';

const ACCENT = '#7c3aed';

const STATUS_CONFIG = {
  DRAFT:            { label: 'Draft',          color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  INTERNAL_REVIEW:  { label: 'Internal Review',color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  LEGAL_REVIEW:     { label: 'Legal Review',   color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  EXEC_APPROVAL:    { label: 'Exec Approval',  color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  PENDING_SIGNING:  { label: 'Pending Signing',color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  ACTIVE:           { label: 'Active',         color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  PENDING_RENEWAL:  { label: 'Pending Renewal',color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  SUSPENDED:        { label: 'Suspended',      color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  EXPIRED:          { label: 'Expired',        color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  CLOSED:           { label: 'Closed',         color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  ARCHIVED:         { label: 'Archived',       color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
};

export default function MouDashboard() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentMous, setRecentMous] = useState([]);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin) { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    if (u.primary_account_type === 'RESEARCHER') { router.push('/researcher/dashboard'); return; }
    setUser(u);
    try {
      const [dashRes, listRes] = await Promise.all([
        api.get('/mou/analytics/dashboard').catch(() => ({ data: {} })),
        api.get('/mou/').catch(() => ({ data: [] })),
      ]);
      setStats(dashRes.data);
      setRecentMous((listRes.data || []).slice(0, 5));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const Card = ({ children, sx = {}, onClick }) => (
    <Box onClick={onClick} sx={{
      bgcolor: 'background.paper', borderRadius: 3, p: 3,
      border: `1px solid ${theme.palette.divider}`,
      boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'border-color 0.2s',
      ...(onClick ? { '&:hover': { borderColor: ACCENT } } : {}),
      ...sx,
    }}>{children}</Box>
  );

  const StatCard = ({ icon: Icon, label, value, color, bg, path }) => (
    <Card onClick={() => router.push(path)} sx={{ flex: '1 1 160px', minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ width: 46, height: 46, borderRadius: 2, bgcolor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon sx={{ color, fontSize: 22 }} />
        </Box>
        <Box>
          <Typography sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Typography>
          <Typography sx={{ color: 'text.primary', fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>{value ?? '—'}</Typography>
        </Box>
      </Box>
    </Card>
  );

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress sx={{ color: ACCENT }} />
    </Box>
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <MouIcon sx={{ color: ACCENT, fontSize: 28 }} />
            <Typography sx={{ fontSize: 26, fontWeight: 700, color: 'text.primary' }}>
              {greeting}, {user?.name?.split(' ')[0] || 'there'}
            </Typography>
            <Chip label="MoU / Collaboration Agreement Tracker" size="small"
              sx={{ bgcolor: `${ACCENT}18`, color: ACCENT, fontWeight: 700, fontSize: 11 }} />
          </Box>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
            Manage the full lifecycle of your institution's Memoranda of Understanding and partnerships.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => router.push('/admin-staff/mou/create')}
          sx={{ bgcolor: ACCENT, borderRadius: 2, textTransform: 'none', fontWeight: 600,
            '&:hover': { bgcolor: '#6d28d9' } }}>
          New MoU
        </Button>
      </Box>

      {/* Stat Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <StatCard icon={MouIcon}     label="Total MoUs"       value={stats?.total}            color="#7c3aed" bg="rgba(124,58,237,0.1)"  path="/admin-staff/mou/list" />
        <StatCard icon={ActiveIcon}  label="Active"           value={stats?.active}           color="#10b981" bg="rgba(16,185,129,0.1)" path="/admin-staff/mou/list?status=ACTIVE" />
        <StatCard icon={PendingIcon} label="Pending Signing"  value={stats?.pending_signing}  color="#3b82f6" bg="rgba(59,130,246,0.1)"  path="/admin-staff/mou/list?status=PENDING_SIGNING" />
        <StatCard icon={RenewalIcon} label="Pending Renewal"  value={stats?.pending_renewal}  color="#f59e0b" bg="rgba(245,158,11,0.1)"  path="/admin-staff/mou/list?status=PENDING_RENEWAL" />
        <StatCard icon={ExpiredIcon} label="Expired"          value={stats?.expired}          color="#ef4444" bg="rgba(239,68,68,0.1)"   path="/admin-staff/mou/list?status=EXPIRED" />
      </Box>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Recent MoUs */}
        <Card sx={{ flex: '2 1 360px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
            <Box>
              <Typography sx={{ color: ACCENT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Recent</Typography>
              <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'text.primary' }}>MoUs</Typography>
            </Box>
            <Button size="small" endIcon={<ArrowIcon />} onClick={() => router.push('/admin-staff/mou/list')}
              sx={{ color: ACCENT, textTransform: 'none', fontWeight: 600 }}>View all</Button>
          </Box>
          {recentMous.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <MouIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary" fontSize={13}>No MoUs yet. Create your first MoU.</Typography>
              <Button variant="outlined" size="small" startIcon={<AddIcon />}
                onClick={() => router.push('/admin-staff/mou/create')}
                sx={{ mt: 2, borderColor: ACCENT, color: ACCENT, textTransform: 'none', borderRadius: 2 }}>
                Create MoU
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {recentMous.map(mou => {
                const cfg = STATUS_CONFIG[mou.status] || STATUS_CONFIG.DRAFT;
                return (
                  <Box key={mou.id} onClick={() => router.push(`/admin-staff/mou/${mou.id}`)}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2,
                      cursor: 'pointer', border: `1px solid ${theme.palette.divider}`,
                      '&:hover': { borderColor: ACCENT, bgcolor: `${ACCENT}06` } }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {mou.title}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{mou.mou_number}</Typography>
                    </Box>
                    <Chip label={cfg.label} size="small"
                      sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: 10, height: 22 }} />
                  </Box>
                );
              })}
            </Box>
          )}
        </Card>

        {/* Activity Summary + Quick Actions */}
        <Box sx={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Activity */}
          <Card>
            <Typography sx={{ color: '#10b981', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>Deliverables</Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'text.primary', mb: 2 }}>Progress</Typography>
            <Box sx={{ mb: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Completion Rate</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>{stats?.completion_rate ?? 0}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={stats?.completion_rate ?? 0}
                sx={{ borderRadius: 2, height: 8, bgcolor: 'rgba(16,185,129,0.1)',
                  '& .MuiLinearProgress-bar': { bgcolor: '#10b981', borderRadius: 2 } }} />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'text.primary' }}>{stats?.completed_activities ?? 0}</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Completed</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'text.primary' }}>{stats?.total_activities ?? 0}</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Total</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'text.primary' }}>{stats?.total_partners ?? 0}</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Partners</Typography>
              </Box>
            </Box>
          </Card>

          {/* Quick Actions */}
          <Card>
            <Typography sx={{ color: ACCENT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>Quick</Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'text.primary', mb: 2 }}>Actions</Typography>
            {[
              { label: 'New MoU',          icon: AddIcon,       path: '/admin-staff/mou/create' },
              { label: 'MoU Repository',   icon: MouIcon,       path: '/admin-staff/mou/list' },
              { label: 'Partners',         icon: PartnersIcon,  path: '/admin-staff/mou/partners' },
              { label: 'Approval Console', icon: LegalIcon,     path: '/admin-staff/mou/approvals' },
              { label: 'Analytics',        icon: AnalyticsIcon, path: '/admin-staff/mou/analytics' },
            ].map(({ label, icon: Icon, path }) => (
              <Box key={label} onClick={() => router.push(path)}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.2, borderRadius: 2,
                  cursor: 'pointer', mb: 0.5,
                  '&:hover': { bgcolor: `${ACCENT}08` } }}>
                <Box sx={{ width: 30, height: 30, borderRadius: 1.5, bgcolor: `${ACCENT}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon sx={{ fontSize: 15, color: ACCENT }} />
                </Box>
                <Typography sx={{ fontSize: 13, color: 'text.primary', flex: 1 }}>{label}</Typography>
                <ArrowIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              </Box>
            ))}
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
