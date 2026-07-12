'use client';

import Image from 'next/image';
import {
  AppBar, Toolbar, Box, Button, IconButton, Avatar, Menu, MenuItem, Typography, Divider, Chip, Tooltip, ListItemIcon,
  Drawer, List, ListItem, ListItemButton, ListItemText, useMediaQuery, useTheme as useMuiTheme,
} from '@mui/material';
import {
  LightMode, DarkMode, Dashboard as DashboardIcon, ExitToApp as LogoutIcon, Language as LanguageIcon, Check as CheckIcon,
  Menu as MenuIcon, Close as CloseIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import NotificationBell from './notifications/NotificationBell';
import { getDashboardRoute } from '../lib/authRouting';
import { isDemoAccount, DEMO_ROLES, getActiveDemoRole } from '../lib/demoRoles';

export default function Navbar() {
  const router = useRouter();
  const { user, logout, loading, switchDemoRole } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const { locale, setLocale, t, locales, hasSelectedLocale } = useLanguage();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = useState(null);
  const [langAnchorEl, setLangAnchorEl] = useState(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);

  const isDemo = isDemoAccount(user);
  const activeDemoRole = isDemo ? getActiveDemoRole(user) : null;

  const handleMobileDrawerOpen  = () => setMobileDrawerOpen(true);
  const handleMobileDrawerClose = () => setMobileDrawerOpen(false);

  const handleMenuOpen  = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = ()  => setAnchorEl(null);

  const handleLangMenuOpen  = (e) => setLangAnchorEl(e.currentTarget);
  const handleLangMenuClose = ()  => setLangAnchorEl(null);

  const handleSelectLocale = (code) => {
    setLocale(code);
    handleLangMenuClose();
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
    router.push('/login');
  };

  const handleSwitchRole = async (roleId) => {
    if (!isDemo || switchingRole || activeDemoRole?.id === roleId) return;
    setSwitchingRole(true);
    try {
      const role = DEMO_ROLES.find((r) => r.id === roleId);
      await switchDemoRole(roleId);
      handleMenuClose();
      if (role?.dashboardRoute) {
        router.push(role.dashboardRoute);
      }
    } catch (err) {
      console.error('Failed to switch demo role:', err);
    } finally {
      setSwitchingRole(false);
    }
  };

  const getDashboardLink = () => getDashboardRoute(user);

  return (
    <AppBar position="static">
      <Toolbar sx={{ gap: 0.5 }}>

        {/* Logo */}
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
            <Image src="/logo.png" alt="DACORIS" width={isMobile ? 140 : 180} height={isMobile ? 42 : 54} priority />
          </Link>
        </Box>

        {/* Nav links (desktop) */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5 }}>
          <Button color="inherit" component={Link} href="/login">{t('navbar.home')}</Button>
          <Button color="inherit" component={Link} href="/about">{t('navbar.about')}</Button>
          <Button color="inherit" component={Link} href="/research-output">{t('navbar.researchOutput')}</Button>
        </Box>

        {/* Language selector (desktop) */}
        <Tooltip title={t('navbar.language')}>
          <Button
            color="inherit"
            onClick={handleLangMenuOpen}
            size="small"
            startIcon={<LanguageIcon fontSize="small" />}
            sx={{ display: { xs: 'none', md: 'inline-flex' }, mx: 0.5, minWidth: 0, px: 1, fontWeight: 700, letterSpacing: 0.5 }}
          >
            {hasSelectedLocale ? locale.toUpperCase() : 'Languages'}
          </Button>
        </Tooltip>
        <Menu
          anchorEl={langAnchorEl}
          open={Boolean(langAnchorEl)}
          onClose={handleLangMenuClose}
          disableScrollLock
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          slotProps={{ paper: { sx: { mt: 1.5, minWidth: 200, boxShadow: 3, borderRadius: 2 } } }}
        >
          {locales.map((l) => (
            <MenuItem key={l.code} selected={l.code === locale} onClick={() => handleSelectLocale(l.code)}>
              {l.code === locale && (
                <ListItemIcon sx={{ minWidth: 28 }}>
                  <CheckIcon fontSize="small" color="primary" />
                </ListItemIcon>
              )}
              <Typography
                variant="body2"
                sx={{ fontWeight: l.code === locale ? 700 : 500, ml: l.code === locale ? 0 : '28px' }}
              >
                {l.nativeLabel}
              </Typography>
            </MenuItem>
          ))}
        </Menu>

        {/* Theme toggle (desktop) */}
        <Tooltip title={mode === 'dark' ? t('navbar.lightMode') : t('navbar.darkMode')}>
          <IconButton
            color="inherit"
            onClick={toggleTheme}
            size="small"
            sx={{ display: { xs: 'none', md: 'inline-flex' }, mx: 0.5 }}
          >
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
              sx={{ display: { xs: 'none', md: 'inline-flex' } }}
            >
              {t('navbar.dashboard')}
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
                      {t('navbar.institution')}
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

                {/* Demo role switcher */}
                {isDemo && (
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
                        mb: 0.75,
                      }}
                    >
                      {t('navbar.switchRole')}
                    </Typography>
                    {DEMO_ROLES.map((role) => {
                      const selected = activeDemoRole?.id === role.id;
                      return (
                        <MenuItem
                          key={role.id}
                          selected={selected}
                          disabled={switchingRole}
                          onClick={() => handleSwitchRole(role.id)}
                          sx={{
                            px: 0,
                            py: 0.75,
                            minHeight: 36,
                            borderRadius: 1,
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                        >
                          {selected ? (
                            <ListItemIcon sx={{ minWidth: 28 }}>
                              <CheckIcon fontSize="small" color="primary" />
                            </ListItemIcon>
                          ) : (
                            <Box sx={{ minWidth: 28 }} />
                          )}
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: selected ? 700 : 500, fontSize: '0.8125rem' }}
                          >
                            {t(role.labelKey)}
                          </Typography>
                        </MenuItem>
                      );
                    })}
                  </Box>
                )}

                {/* Role Badges */}
                {(user.is_global_admin || user.is_institution_admin) && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {user.is_global_admin && (
                      <Chip
                        label={t('navbar.globalAdmin')}
                        size="small"
                        color="primary"
                        sx={{ fontSize: '0.7rem', height: 22 }}
                      />
                    )}
                    {user.is_institution_admin && (
                      <Chip
                        label={t('navbar.institutionAdmin')}
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
                    {t('navbar.dashboard')}
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
                    {t('navbar.logout')}
                  </Typography>
                </MenuItem>
              </Box>
            </Menu>
          </>
        ) : (
          <>
            <Button color="inherit" component={Link} href="/login">{t('navbar.login')}</Button>
            <Button variant="contained" color="primary" component={Link} href="/register" sx={{ ml: 0.5 }}>
              {t('navbar.signUp')}
            </Button>
          </>
        )}

        {/* Hamburger menu (mobile) */}
        <IconButton
          color="inherit"
          onClick={handleMobileDrawerOpen}
          sx={{ display: { xs: 'inline-flex', md: 'none' }, ml: 0.5 }}
        >
          <MenuIcon />
        </IconButton>
      </Toolbar>

      {/* Mobile drawer: nav links, language picker, theme toggle */}
      <Drawer
        anchor="right"
        open={mobileDrawerOpen}
        onClose={handleMobileDrawerClose}
        sx={{ '& .MuiDrawer-paper': { width: 280 } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            {t('navbar.menu')}
          </Typography>
          <IconButton onClick={handleMobileDrawerClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Divider />

        <List>
          <ListItem disablePadding>
            <ListItemButton component={Link} href="/login" onClick={handleMobileDrawerClose}>
              <ListItemText primary={t('navbar.home')} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton component={Link} href="/about" onClick={handleMobileDrawerClose}>
              <ListItemText primary={t('navbar.about')} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton component={Link} href="/research-output" onClick={handleMobileDrawerClose}>
              <ListItemText primary={t('navbar.researchOutput')} />
            </ListItemButton>
          </ListItem>
        </List>

        <Divider />

        <Typography
          variant="caption"
          sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}
        >
          {t('navbar.language')}
        </Typography>
        <List>
          {locales.map((l) => (
            <ListItem key={l.code} disablePadding>
              <ListItemButton
                selected={l.code === locale}
                onClick={() => { setLocale(l.code); handleMobileDrawerClose(); }}
              >
                {l.code === locale && (
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <CheckIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                )}
                <ListItemText
                  primary={l.nativeLabel}
                  sx={{ ml: l.code === locale ? 0 : '28px' }}
                  primaryTypographyProps={{ fontWeight: l.code === locale ? 700 : 500 }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Divider />

        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={() => { toggleTheme(); handleMobileDrawerClose(); }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {mode === 'dark' ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
              </ListItemIcon>
              <ListItemText primary={mode === 'dark' ? t('navbar.lightMode') : t('navbar.darkMode')} />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>
    </AppBar>
  );
}
