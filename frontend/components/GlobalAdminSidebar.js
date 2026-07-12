'use client';

import { Box, Typography } from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  Analytics as AnalyticsIcon,
  WorkOutline as OpportunitiesIcon,
  Category as CategoryIcon,
  ExitToApp as LogoutIcon,
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { COLORS } from '@/contexts/ThemeContext';

export default function GlobalAdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const theme = useMuiTheme();
  const dark = theme.palette.mode === 'dark';
  const SL = COLORS.slate;
  const ACCENT = COLORS.teal;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const NavItem = ({ icon: Icon, label, path }) => {
    const isActive = pathname === path;
    
    return (
      <Box
        onClick={() => router.push(path)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.5,
          cursor: 'pointer',
          borderRadius: 2,
          bgcolor: isActive ? 'primary.main' : 'transparent',
          color: isActive ? '#fff' : 'text.secondary',
          transition: 'all 0.2s',
          '&:hover': {
            bgcolor: isActive ? 'primary.dark' : 'action.hover',
            color: isActive ? '#fff' : 'text.primary',
          },
        }}
      >
        <Icon sx={{ fontSize: 20 }} />
        <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{label}</Typography>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        width: 300,
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1.5,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {user?.name?.charAt(0)?.toUpperCase() || 'G'}
          </Box>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography sx={{ color: 'text.primary', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'Global Admin'}
            </Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: 11 }}>Global Admin</Typography>
          </Box>
        </Box>
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, p: 2, overflowY: 'auto' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Dashboard Section */}
          <Box>
            <Typography sx={{ px: 2, mb: 1, fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Dashboard
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <NavItem icon={DashboardIcon} label="Overview" path="/global-admin/overview" />
              <NavItem icon={AnalyticsIcon} label="Analytics" path="/global-admin/analytics" />
            </Box>
          </Box>

          {/* Platform Management Section */}
          <Box>
            <Typography sx={{ px: 2, mb: 1, fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Platform Management
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <NavItem icon={BusinessIcon} label="Institutions" path="/global-admin/institutions" />
              <NavItem icon={PeopleIcon} label="All Users" path="/global-admin/users" />
            </Box>
          </Box>

          {/* Opportunity Curation Section */}
          <Box>
            <Typography sx={{ px: 2, mb: 1, fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Opportunity Curation
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <NavItem icon={OpportunitiesIcon} label="Opportunities" path="/global-admin/opportunities" />
              <NavItem icon={CategoryIcon} label="Categories" path="/global-admin/categories" />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Logout */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box
          onClick={handleLogout}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2,
            py: 1.5,
            cursor: 'pointer',
            borderRadius: 2,
            color: 'text.secondary',
            transition: 'all 0.2s',
            '&:hover': {
              bgcolor: 'action.hover',
              color: 'error.main',
            },
          }}
        >
          <LogoutIcon sx={{ fontSize: 20 }} />
          <Typography sx={{ fontSize: 14, fontWeight: 500 }}>Logout</Typography>
        </Box>
      </Box>
    </Box>
  );
}
