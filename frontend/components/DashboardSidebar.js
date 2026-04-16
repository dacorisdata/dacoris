'use client';

import { Box, Typography } from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assessment as AssessmentIcon,
  Science as ScienceIcon,
  Storage as StorageIcon,
  ExitToApp as LogoutIcon,
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { COLORS } from '@/contexts/ThemeContext';

export default function DashboardSidebar() {
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
    const isActive = pathname === path || pathname.startsWith(path + '/');
    
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
        width: 220,
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
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </Box>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography sx={{ color: 'text.primary', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'User'}
            </Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: 11 }}>
              {user?.email || 'user@example.com'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, p: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <NavItem icon={DashboardIcon} label="Dashboard" path="/dashboard" />
          <NavItem icon={AssessmentIcon} label="Grants" path="/grants" />
          <NavItem icon={ScienceIcon} label="Research" path="/research" />
          <NavItem icon={StorageIcon} label="Data Capture" path="/data" />
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
