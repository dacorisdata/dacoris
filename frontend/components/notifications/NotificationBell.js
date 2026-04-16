'use client';

import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  Button,
  CircularProgress,
  Chip,
  alpha,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Circle,
  CheckCircle,
  Error,
  Info,
  Warning,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

const priorityColors = {
  urgent: '#d32f2f',
  high: '#f57c00',
  medium: '#1976d2',
  low: '#757575',
};

const typeIcons = {
  new_registration: Info,
  account_approved: CheckCircle,
  account_rejected: Error,
  role_assigned: CheckCircle,
  system_announcement: Warning,
};

export default function NotificationBell() {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const open = Boolean(anchorEl);

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/notifications/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/notifications/?limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchNotifications();
        fetchUnreadCount();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/notifications/mark-all-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchNotifications();
        fetchUnreadCount();
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    fetchNotifications();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    if (notification.action_url) {
      router.push(notification.action_url);
    }
    handleClose();
  };

  useEffect(() => {
    fetchUnreadCount();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getNotificationIcon = (type) => {
    const IconComponent = typeIcons[type] || Info;
    return <IconComponent sx={{ fontSize: 20, mr: 1.5, color: '#1ca7a1' }} />;
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        sx={{
          color: 'inherit',
          '&:hover': {
            bgcolor: alpha('#1ca7a1', 0.1),
          },
        }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        disableScrollLock
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 500,
            mt: 1.5,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="600">
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={markAllAsRead}>
              Mark all read
            </Button>
          )}
        </Box>
        
        <Divider />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={30} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No notifications
            </Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            {notifications.map((notification) => (
              <MenuItem
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  py: 1.5,
                  px: 2,
                  bgcolor: notification.is_read ? 'transparent' : alpha('#1ca7a1', 0.05),
                  borderLeft: notification.is_read ? 'none' : `3px solid ${priorityColors[notification.priority]}`,
                  '&:hover': {
                    bgcolor: alpha('#1ca7a1', 0.1),
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
                  {getNotificationIcon(notification.type)}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="subtitle2" fontWeight="600" noWrap>
                        {notification.title}
                      </Typography>
                      {!notification.is_read && (
                        <Circle sx={{ fontSize: 8, color: '#1ca7a1' }} />
                      )}
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        mb: 0.5,
                      }}
                    >
                      {notification.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatTimeAgo(notification.created_at)}
                    </Typography>
                  </Box>
                </Box>
              </MenuItem>
            ))}
          </Box>
        )}

        <Divider />
        
        <Box sx={{ p: 1, textAlign: 'center' }}>
          <Button
            fullWidth
            size="small"
            onClick={() => {
              router.push('/notifications');
              handleClose();
            }}
          >
            View All Notifications
          </Button>
        </Box>
      </Menu>
    </>
  );
}
