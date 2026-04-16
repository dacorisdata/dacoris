'use client';

import { Box, AppBar, Toolbar, IconButton, Typography, Drawer, List, ListItem, ListItemIcon, ListItemButton, ListItemText, Badge, Menu, MenuItem, Avatar, Divider } from '@mui/material';
import { Menu as MenuIcon, Notifications, AccountCircle, Dashboard, Science, Assessment, Storage, Settings, Logout } from '@mui/icons-material';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useAppStore from '@/store/appStore';

const DRAWER_WIDTH = 260;

const moduleNavigation = [
  { label: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { label: 'Grants', icon: <Assessment />, path: '/grants' },
  { label: 'Research', icon: <Science />, path: '/research' },
  { label: 'Data Capture', icon: <Storage />, path: '/data' },
];

export default function AppShell({ children, currentModule = 'dashboard' }) {
  const router = useRouter();
  const { sidebarOpen, toggleSidebar, notifications } = useAppStore();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifAnchor, setNotifAnchor] = useState(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleProfileMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleNotifMenu = (event) => {
    setNotifAnchor(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setNotifAnchor(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 1
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={toggleSidebar}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
            DACORIS
          </Typography>

          <IconButton color="inherit" onClick={handleNotifMenu}>
            <Badge badgeContent={unreadCount} color="error">
              <Notifications />
            </Badge>
          </IconButton>

          <IconButton onClick={handleProfileMenu} sx={{ ml: 1 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              <AccountCircle />
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="persistent"
        open={sidebarOpen}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            bgcolor: 'background.default',
            borderRight: 1,
            borderColor: 'divider',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', mt: 2 }}>
          <List>
            {moduleNavigation.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  selected={currentModule === item.path.substring(1)}
                  onClick={() => router.push(item.path)}
                  sx={{
                    mx: 1,
                    borderRadius: 1,
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'primary.contrastText',
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          ml: sidebarOpen ? 0 : `-${DRAWER_WIDTH}px`,
          transition: (theme) => theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        {children}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={() => { handleClose(); router.push('/settings'); }}>
          <ListItemIcon><Settings fontSize="small" /></ListItemIcon>
          Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon><Logout fontSize="small" /></ListItemIcon>
          Logout
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={notifAnchor}
        open={Boolean(notifAnchor)}
        onClose={handleClose}
        PaperProps={{
          sx: { width: 320, maxHeight: 400 }
        }}
      >
        {notifications.length === 0 ? (
          <MenuItem disabled>No notifications</MenuItem>
        ) : (
          notifications.slice(0, 5).map((notif) => (
            <MenuItem key={notif.id} onClick={handleClose}>
              <Box>
                <Typography variant="body2" fontWeight={notif.is_read ? 400 : 600}>
                  {notif.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {notif.message}
                </Typography>
              </Box>
            </MenuItem>
          ))
        )}
      </Menu>
    </Box>
  );
}
