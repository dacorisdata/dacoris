'use client';

import { useState, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  Analytics as AnalyticsIcon,
  WorkOutline as OpportunitiesIcon,
  Category as CategoryIcon,
  ExitToApp as LogoutIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { subtleScrollbarSx } from '../lib/scrollStyles';
import { sidebarTheme, SIDEBAR_FONTS } from '../lib/sidebarTheme';

const NAV_SECTIONS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    items: [
      { icon: DashboardIcon, label: 'Overview', path: '/global-admin/overview' },
      { icon: AnalyticsIcon, label: 'Analytics', path: '/global-admin/analytics' },
    ],
  },
  {
    key: 'platform',
    label: 'Platform Management',
    items: [
      { icon: BusinessIcon, label: 'Institutions', path: '/global-admin/institutions' },
      { icon: PeopleIcon, label: 'All Users', path: '/global-admin/users' },
    ],
  },
  {
    key: 'curation',
    label: 'Opportunity Curation',
    items: [
      { icon: OpportunitiesIcon, label: 'Opportunities', path: '/global-admin/opportunities' },
      { icon: CategoryIcon, label: 'Categories', path: '/global-admin/categories' },
    ],
  },
];

export default function GlobalAdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const theme = useMuiTheme();
  const dark = theme.palette.mode === 'dark';
  const tokens = sidebarTheme(dark);
  const { accent } = tokens;

  const [open, setOpen] = useState(() =>
    Object.fromEntries(NAV_SECTIONS.map(s => [s.key, true])),
  );

  const toggleSection = useCallback((key) => {
    setOpen(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const isActive = (path) => pathname === path || pathname.startsWith(path + '/');

  const NavItem = ({ icon: Icon, label, path }) => {
    const active = isActive(path);
    return (
      <Box
        onClick={() => router.push(path)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          px: 1.5, py: 1, mx: 0.5, cursor: 'pointer', borderRadius: '8px',
          bgcolor: active ? tokens.accentSoft : 'transparent',
          color: active ? tokens.navActive : tokens.nav,
          position: 'relative',
          transition: 'all 0.15s ease',
          '&:hover': {
            bgcolor: active ? tokens.accentHover : tokens.itemHoverBg,
            color: active ? tokens.navActive : tokens.navHover,
          },
          '&::before': active ? {
            content: '""',
            position: 'absolute', left: -4, top: '20%', bottom: '20%',
            width: 3, borderRadius: 4, bgcolor: accent,
          } : {},
        }}
      >
        <Icon sx={{ fontSize: SIDEBAR_FONTS.itemIcon }} />
        <Typography sx={{ fontSize: SIDEBAR_FONTS.item, fontWeight: active ? 650 : 500 }}>{label}</Typography>
      </Box>
    );
  };

  const initials = user?.name?.charAt(0)?.toUpperCase() || 'G';

  return (
    <Box sx={{
      width: 300, bgcolor: tokens.bg,
      borderRight: 1, borderColor: tokens.border,
      display: 'flex', flexDirection: 'column',
      minHeight: '100vh', flexShrink: 0,
    }}>
      <Box sx={{
        p: 2.5, borderBottom: 1, borderColor: tokens.border,
        background: tokens.headerBg,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '10px',
            background: `linear-gradient(135deg, ${accent} 0%, #0891b2 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: SIDEBAR_FONTS.userName, fontWeight: 700, color: '#fff',
            flexShrink: 0, boxShadow: `0 2px 8px ${accent}40`,
          }}>
            {initials}
          </Box>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography sx={{
              color: tokens.name, fontSize: SIDEBAR_FONTS.userName, fontWeight: 650,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {user?.name || 'Global Admin'}
            </Typography>
            <Typography sx={{ color: tokens.role, fontSize: SIDEBAR_FONTS.userRole, fontWeight: 500 }}>
              Global Admin
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ flex: 1, py: 0.5, overflowY: 'auto', ...subtleScrollbarSx(dark) }}>
        {NAV_SECTIONS.map(({ key, label, items }) => {
          const hasActive = items.some(item => isActive(item.path));
          const isOpen = open[key] !== false;
          return (
            <Box key={key} sx={{ mb: 0.5 }}>
              <Box
                onClick={() => toggleSection(key)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  px: 2, pt: 2.5, pb: 0.75, cursor: 'pointer', userSelect: 'none',
                }}
              >
                <Typography sx={{
                  fontSize: SIDEBAR_FONTS.section, fontWeight: 700,
                  letterSpacing: 1.2, textTransform: 'uppercase', flex: 1,
                  color: hasActive ? tokens.sectionActive : tokens.section,
                }}>
                  {label}
                </Typography>
                {isOpen
                  ? <CollapseIcon sx={{ fontSize: 16, color: hasActive ? tokens.sectionActive : tokens.muted }} />
                  : <ExpandIcon sx={{ fontSize: 16, color: hasActive ? tokens.sectionActive : tokens.muted }} />}
              </Box>
              {isOpen && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                  {items.map(item => <NavItem key={item.path} {...item} />)}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      <Box sx={{ p: 1.5, borderTop: 1, borderColor: tokens.border }}>
        <Box onClick={handleLogout} sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          px: 1.5, py: 1, cursor: 'pointer', borderRadius: '8px',
          color: tokens.signOut, transition: 'all 0.15s',
          '&:hover': { bgcolor: 'rgba(239,68,68,0.08)', color: '#ef4444' },
        }}>
          <LogoutIcon sx={{ fontSize: SIDEBAR_FONTS.itemIcon }} />
          <Typography sx={{ fontSize: SIDEBAR_FONTS.signOut, fontWeight: 500 }}>Logout</Typography>
        </Box>
      </Box>
    </Box>
  );
}
