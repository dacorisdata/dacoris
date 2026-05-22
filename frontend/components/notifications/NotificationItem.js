'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  alpha,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Circle,
  CheckCircle,
  Error,
  Info,
  Warning,
  Check,
  Close,
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
  proposal_invitation: Info,
};

/**
 * NotificationItem Component
 * Displays individual notifications with special handling for collaboration invites
 * Shows Accept/Decline buttons for proposal collaboration invitations
 */
export default function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  onRefresh 
}) {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const isCollaborationInvite = 
    notification.title?.toLowerCase().includes('collaboration invite') ||
    notification.message?.toLowerCase().includes('collaborate on') ||
    notification.type === 'proposal_invitation';

  /**
   * Extract proposal_id and collaborator_id from action_url
   * Format: /researcher/grants/proposals/{proposal_id}/collab/{collaborator_id}
   */
  const extractIds = (actionUrl) => {
    if (!actionUrl) return null;
    const match = actionUrl.match(/proposals\/([^/]+)\/collab\/([^/]+)/);
    if (match) {
      return {
        proposalId: match[1],
        collaboratorId: match[2],
      };
    }
    return null;
  };

  const ids = extractIds(notification.action_url);

  const handleAccept = async () => {
    if (!ids) return;

    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/grants/proposals/${ids.proposalId}/collaborators/${ids.collaboratorId}/accept`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setActionResult({ type: 'success', message: 'Invitation accepted successfully!' });
        setSnackbarOpen(true);
        
        // Mark notification as read
        await onMarkAsRead(notification.id);
        
        // Refresh notifications list
        if (onRefresh) onRefresh();

        // Navigate to proposal after a short delay
        setTimeout(() => {
          router.push(`/researcher/grants/proposals/${data.proposal_id}`);
        }, 1500);
      } else {
        const errorData = await response.json();
        setActionResult({ 
          type: 'error', 
          message: errorData.detail || 'Failed to accept invitation' 
        });
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      setActionResult({ 
        type: 'error', 
        message: 'Network error. Please try again.' 
      });
      setSnackbarOpen(true);
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!ids) return;

    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/grants/proposals/${ids.proposalId}/collaborators/${ids.collaboratorId}/decline`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        setActionResult({ type: 'success', message: 'Invitation declined.' });
        setSnackbarOpen(true);
        
        // Mark notification as read
        await onMarkAsRead(notification.id);
        
        // Refresh notifications list
        if (onRefresh) onRefresh();
      } else {
        const errorData = await response.json();
        setActionResult({ 
          type: 'error', 
          message: errorData.detail || 'Failed to decline invitation' 
        });
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error declining invitation:', error);
      setActionResult({ 
        type: 'error', 
        message: 'Network error. Please try again.' 
      });
      setSnackbarOpen(true);
    } finally {
      setProcessing(false);
    }
  };

  const handleDefaultClick = () => {
    onMarkAsRead(notification.id);
    if (notification.action_url) {
      router.push(notification.action_url);
    }
  };

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
      <Box
        sx={{
          py: 1.5,
          px: 2,
          bgcolor: notification.is_read ? 'transparent' : alpha('#1ca7a1', 0.05),
          borderLeft: notification.is_read ? 'none' : `3px solid ${priorityColors[notification.priority || 'medium']}`,
          cursor: isCollaborationInvite && ids ? 'default' : 'pointer',
          '&:hover': {
            bgcolor: alpha('#1ca7a1', 0.1),
          },
        }}
        onClick={isCollaborationInvite && ids ? undefined : handleDefaultClick}
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

            {/* Accept/Decline Buttons for Collaboration Invites */}
            {isCollaborationInvite && ids && !notification.is_read && (
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={processing ? <CircularProgress size={16} color="inherit" /> : <Check />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAccept();
                  }}
                  disabled={processing}
                  sx={{
                    bgcolor: '#10b981',
                    color: 'white',
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 2,
                    '&:hover': {
                      bgcolor: '#059669',
                    },
                    '&:disabled': {
                      bgcolor: alpha('#10b981', 0.5),
                      color: 'white',
                    },
                  }}
                >
                  Accept
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={processing ? <CircularProgress size={16} color="inherit" /> : <Close />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDecline();
                  }}
                  disabled={processing}
                  sx={{
                    borderColor: '#ef4444',
                    color: '#ef4444',
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 2,
                    '&:hover': {
                      bgcolor: alpha('#ef4444', 0.1),
                      borderColor: '#dc2626',
                    },
                    '&:disabled': {
                      borderColor: alpha('#ef4444', 0.5),
                      color: alpha('#ef4444', 0.5),
                    },
                  }}
                >
                  Decline
                </Button>
              </Box>
            )}

            {/* Show message if already responded */}
            {isCollaborationInvite && notification.is_read && (
              <Typography 
                variant="caption" 
                sx={{ 
                  display: 'block', 
                  mt: 1, 
                  color: 'text.secondary',
                  fontStyle: 'italic' 
                }}
              >
                ✓ You responded to this invitation
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={actionResult?.type || 'info'}
          sx={{ width: '100%' }}
        >
          {actionResult?.message}
        </Alert>
      </Snackbar>
    </>
  );
}
