'use client';

import { Box, Typography, Chip } from '@mui/material';
import {
  Assignment as TaskIcon,
  RateReview as ReviewIcon,
  ExitToApp as LogoutIcon,
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { subtleScrollbarSx } from '../lib/scrollStyles';

const NAV_ITEMS = [
  { icon: TaskIcon, label: 'New Tasks to Review', path: '/reviewer/tasks' },
  { icon: ReviewIcon, label: 'My Reviews', path: '/reviewer/reviews' },
];

export default function ReviewerSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const theme = useMuiTheme();
  const dark = theme.palette.mode === 'dark';
  const accent = dark ? '#2dd4bf' : '#0d9488';

  const handleLogout = () => {
    logout();
    router.push('/reviewer/login');
  };

  const NavItem = ({ icon: Icon, label, path }) => {
    const isActive = pathname === path || pathname.startsWith(path + '/');
    return (
      <Box onClick={() => router.push(path)} sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: 1.5, py: 1, cursor: 'pointer', borderRadius: 2,
        bgcolor: isActive ? `${accent}18` : 'transparent',
        borderLeft: isActive ? `3px solid ${accent}` : '3px solid transparent',
        color: isActive ? accent : 'text.secondary',
        transition: 'all 0.15s',
        '&:hover': { bgcolor: isActive ? `${accent}18` : 'action.hover', color: isActive ? accent : 'text.primary' },
      }}>
        <Icon sx={{ fontSize: 15, flexShrink: 0 }} />
        <Typography sx={{ fontSize: 12.5, fontWeight: isActive ? 700 : 500 }}>{label}</Typography>
      </Box>
    );
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'R';

  return (
    <Box sx={{
      width: 230, bgcolor: 'background.paper',
      borderRight: 1, borderColor: 'divider',
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0,
      flexShrink: 0,
    }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Chip
          label="External Reviewer"
          size="small"
          sx={{
            width: '100%', mb: 1.5,
            bgcolor: accent, color: '#fff',
            fontWeight: 600, fontSize: 11, height: 24,
          }}
        />
        {user?.institution_name && (
          <Chip
            label={user.institution_name}
            size="small"
            variant="outlined"
            sx={{ width: '100%', mb: 1.5, fontSize: 10, height: 22 }}
          />
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: 2,
            bgcolor: `${accent}20`, color: accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 13,
          }}>
            {initials}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', lineHeight: 1.2 }} noWrap>
              {user?.name || 'Reviewer'}
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }} noWrap>
              {user?.email}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', py: 1, ...subtleScrollbarSx }}>
        {NAV_ITEMS.map(item => (
          <NavItem key={item.path} {...item} />
        ))}
      </Box>

      <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}>
        <Box onClick={handleLogout} sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          px: 1.5, py: 1, cursor: 'pointer', borderRadius: 2,
          color: 'text.secondary',
          '&:hover': { bgcolor: 'action.hover', color: 'error.main' },
        }}>
          <LogoutIcon sx={{ fontSize: 15 }} />
          <Typography sx={{ fontSize: 12.5, fontWeight: 500 }}>Log Out</Typography>
        </Box>
      </Box>
    </Box>
  );
}
