'use client';

import { Box, Typography } from '@mui/material';
import {
  Assignment as TaskIcon,
  RateReview as ReviewIcon,
  ExitToApp as LogoutIcon,
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { subtleScrollbarSx } from '../lib/scrollStyles';
import { sidebarTheme, SIDEBAR_FONTS } from '../lib/sidebarTheme';

const NAV_PATHS = [
  { icon: TaskIcon, labelKey: 'reviewer.sidebar.newTasks', path: '/reviewer/tasks' },
  { icon: ReviewIcon, labelKey: 'reviewer.sidebar.myReviews', path: '/reviewer/reviews' },
];

export default function ReviewerSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const theme = useMuiTheme();
  const dark = theme.palette.mode === 'dark';
  const tokens = sidebarTheme(dark);
  const { accent } = tokens;

  const handleLogout = () => {
    logout();
    router.push('/reviewer/login');
  };

  const NavItem = ({ icon: Icon, label, path }) => {
    const isActive = pathname === path || pathname.startsWith(path + '/');
    return (
      <Box onClick={() => router.push(path)} sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: 1.5, py: 1, mx: 0.5, cursor: 'pointer', borderRadius: '8px',
        bgcolor: isActive ? tokens.accentSoft : 'transparent',
        color: isActive ? tokens.navActive : tokens.nav,
        position: 'relative',
        transition: 'all 0.15s',
        '&:hover': {
          bgcolor: isActive ? tokens.accentHover : tokens.itemHoverBg,
          color: isActive ? tokens.navActive : tokens.navHover,
        },
        '&::before': isActive ? {
          content: '""',
          position: 'absolute', left: -4, top: '20%', bottom: '20%',
          width: 3, borderRadius: 4,
          bgcolor: accent,
        } : {},
      }}>
        <Icon sx={{ fontSize: SIDEBAR_FONTS.itemIcon, flexShrink: 0 }} />
        <Typography sx={{ fontSize: SIDEBAR_FONTS.item, fontWeight: isActive ? 650 : 500 }}>{label}</Typography>
      </Box>
    );
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'R';

  return (
    <Box sx={{
      width: 300, bgcolor: tokens.bg,
      borderRight: 1, borderColor: tokens.border,
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0,
      flexShrink: 0,
    }}>
      <Box sx={{
        p: 2, borderBottom: 1, borderColor: tokens.border,
        background: tokens.headerBg,
      }}>
        <Box sx={{
          display: 'inline-flex', alignItems: 'center', width: '100%',
          px: 1.25, py: 0.5, mb: 1.5, borderRadius: 1.5,
          bgcolor: tokens.accentBadgeBg,
          border: `1px solid ${tokens.accentBorder}`,
        }}>
          <Typography sx={{
            fontSize: SIDEBAR_FONTS.badge, fontWeight: 700, color: accent,
            width: '100%', textAlign: 'center',
          }}>
            {t('reviewer.sidebar.externalReviewer')}
          </Typography>
        </Box>
        {user?.institution_name && (
          <Typography sx={{
            fontSize: SIDEBAR_FONTS.badge, color: tokens.muted,
            mb: 1.5, textAlign: 'center',
          }}>
            {user.institution_name}
          </Typography>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '10px',
            background: `linear-gradient(135deg, ${accent} 0%, #0891b2 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: SIDEBAR_FONTS.userName, color: '#fff',
            boxShadow: `0 2px 8px ${accent}40`,
          }}>
            {initials}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: SIDEBAR_FONTS.userName, fontWeight: 650, color: tokens.name, lineHeight: 1.2 }} noWrap>
              {user?.name || t('reviewer.sidebar.reviewerFallback')}
            </Typography>
            <Typography sx={{ fontSize: SIDEBAR_FONTS.userRole, color: tokens.muted }} noWrap>
              {user?.email}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', py: 1, ...subtleScrollbarSx(dark) }}>
        <Typography sx={{
          px: 2, pt: 1.5, pb: 0.75,
          fontSize: SIDEBAR_FONTS.section, fontWeight: 700,
          letterSpacing: 1.2, textTransform: 'uppercase',
          color: tokens.section,
        }}>
          Main
        </Typography>
        {NAV_PATHS.map(item => (
          <NavItem key={item.path} icon={item.icon} label={t(item.labelKey)} path={item.path} />
        ))}
      </Box>

      <Box sx={{ p: 1.5, borderTop: 1, borderColor: tokens.border }}>
        <Box onClick={handleLogout} sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          px: 1.5, py: 1, cursor: 'pointer', borderRadius: '8px',
          color: tokens.signOut,
          '&:hover': { bgcolor: 'rgba(239,68,68,0.08)', color: '#ef4444' },
        }}>
          <LogoutIcon sx={{ fontSize: SIDEBAR_FONTS.itemIcon }} />
          <Typography sx={{ fontSize: SIDEBAR_FONTS.signOut, fontWeight: 500 }}>{t('reviewer.sidebar.logOut')}</Typography>
        </Box>
      </Box>
    </Box>
  );
}
