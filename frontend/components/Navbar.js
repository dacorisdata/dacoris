'use client';

import Image from 'next/image';
import { AppBar, Toolbar, Box, Button, IconButton, Avatar, Menu, MenuItem, Typography, Divider, Chip, Tooltip } from '@mui/material';
import { LightMode, DarkMode, Dashboard as DashboardIcon, ExitToApp as LogoutIcon } from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import NotificationBell from './notifications/NotificationBell';

export default function Navbar() {
  const router = useRouter();
  const { user, logout, loading } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen  = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = ()  => setAnchorEl(null);

  const handleLogout = () => {
    logout();
    handleMenuClose();
    router.push('/login');
  };

  const ADMIN_STAFF_ROLES = ['ADMIN_STAFF','GRANT_MANAGER','FINANCE_OFFICER','ETHICS_COMMITTEE_MEMBER','DATA_STEWARD','DATA_ENGINEER','INSTITUTIONAL_LEADERSHIP','EXTERNAL_REVIEWER','GUEST_COLLABORATOR','EXTERNAL_FUNDER'];

  const getDashboardLink = () => {
    if (user?.is_global_admin)       return '/global-admin/dashboard';
    if (user?.is_institution_admin)  return '/institution-admin/dashboard';
    if (user?.primary_account_type === 'RESEARCHER') return '/researcher/dashboard';
    if (ADMIN_STAFF_ROLES.includes(user?.primary_account_type)) return '/admin-staff/dashboard';
    return '/onboarding';
  };

  return (
    <AppBar position="static">
      <Toolbar sx={{ gap: 0.5 }}>

        {/* Logo */}
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
            <Image src="/logo.png" alt="DACORIS" width={180} height={54} priority />
          </Link>
        </Box>

        {/* Nav links */}
        <Button color="inherit" component={Link} href="/login">Home</Button>
        <Button color="inherit" component={Link} href="/about">About</Button>
        <Button color="inherit" component={Link} href="/research-output">Research Output</Button>

        {/* Theme toggle */}
        <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          <IconButton color="inherit" onClick={toggleTheme} size="small" sx={{ mx: 0.5 }}>
            {mode === 'dark' ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
          </IconButton>
        </Tooltip>

        {loading ? null : user ? (
          <>
            {/* Notification Bell */}
            <NotificationBell />

            <Button
              color="inherit"
              startIcon={<DashboardIcon />}
              component={Link}
              href={getDashboardLink()}
            >
              Dashboard
            </Button>

            <IconButton onClick={handleMenuOpen} sx={{ ml: 0.5 }}>
              <Avatar
                sx={{
                  width: 34, height: 34,
                  bgcolor: 'secondary.main',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                }}
              >
                {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              disableScrollLock
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              slotProps={{ 
                paper: { 
                  sx: { 
                    mt: 1.5, 
                    minWidth: 280,
                    boxShadow: 3,
                    borderRadius: 2,
                  } 
                } 
              }}
            >
              {/* User Info Section */}
              <Box sx={{ px: 2.5, py: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: 'primary.main',
                      fontSize: '1.25rem',
                      fontWeight: 700,
                    }}
                  >
                    {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography 
                      variant="subtitle1" 
                      sx={{ 
                        fontWeight: 600,
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {user.name || 'User'}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      sx={{ 
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {user.email}
                    </Typography>
                  </Box>
                </Box>

                {/* Institution Name */}
                {user.institution_name && (
                  <Box sx={{ mb: 1 }}>
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      sx={{ 
                        display: 'block',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        mb: 0.5,
                      }}
                    >
                      Institution
                    </Typography>
                    <Chip
                      label={user.institution_name}
                      size="small"
                      sx={{
                        bgcolor: 'action.selected',
                        fontWeight: 500,
                        fontSize: '0.75rem',
                        height: 24,
                        maxWidth: '100%',
                        '& .MuiChip-label': {
                          px: 1.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        },
                      }}
                    />
                  </Box>
                )}

                {/* Role Badges */}
                {(user.is_global_admin || user.is_institution_admin) && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {user.is_global_admin && (
                      <Chip 
                        label="Global Admin" 
                        size="small" 
                        color="primary"
                        sx={{ fontSize: '0.7rem', height: 22 }}
                      />
                    )}
                    {user.is_institution_admin && (
                      <Chip 
                        label="Institution Admin" 
                        size="small" 
                        color="secondary"
                        sx={{ fontSize: '0.7rem', height: 22 }}
                      />
                    )}
                  </Box>
                )}
              </Box>

              <Divider />

              {/* Menu Items */}
              <Box sx={{ py: 1 }}>
                <MenuItem 
                  onClick={() => { handleMenuClose(); router.push(getDashboardLink()); }}
                  sx={{ 
                    px: 2.5, 
                    py: 1.25,
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <DashboardIcon sx={{ mr: 1.5, fontSize: 20, color: 'text.secondary' }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Dashboard
                  </Typography>
                </MenuItem>
                <MenuItem 
                  onClick={handleLogout} 
                  sx={{ 
                    px: 2.5, 
                    py: 1.25,
                    color: 'error.main',
                    '&:hover': {
                      bgcolor: 'error.lighter',
                    },
                  }}
                >
                  <LogoutIcon sx={{ mr: 1.5, fontSize: 20 }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Logout
                  </Typography>
                </MenuItem>
              </Box>
            </Menu>
          </>
        ) : (
          <>
            <Button color="inherit" component={Link} href="/login">Login</Button>
            <Button variant="contained" color="primary" component={Link} href="/register" sx={{ ml: 0.5 }}>
              Sign Up
            </Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}
