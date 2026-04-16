'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  useTheme,
} from '@mui/material';
import {
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { institutionAdminAPI } from '../../../lib/api';

export default function InstitutionAdminOverview() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const userData = await fetchUser();
    if (!userData) {
      router.push('/login');
      return;
    }
    if (!userData.is_institution_admin) {
      if (userData.is_global_admin) {
        router.push('/global-admin/dashboard');
      } else {
        router.push('/login');
      }
      return;
    }
    loadData();
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        institutionAdminAPI.getUsers(),
        institutionAdminAPI.getStats(),
      ]);
      setUsers(usersRes.data);
      setStats(statsRes.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load institution admin data:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.detail || 'Failed to load data');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ color: theme.palette.text.primary, fontSize: 28, fontWeight: 700, mb: 0.5 }}>
          Institution Dashboard
        </Typography>
        <Typography sx={{ color: theme.palette.text.secondary, fontSize: 14 }}>
          Manage your institution's users and settings
        </Typography>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
        <Box sx={{ 
          flex: '1 1 250px', 
          bgcolor: theme.palette.background.paper, 
          borderRadius: 3, 
          p: 3, 
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.palette.mode === 'light' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: 'rgba(28, 167, 161, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PeopleIcon sx={{ color: '#1ca7a1', fontSize: 24 }} />
            </Box>
            <Box>
              <Typography sx={{ color: theme.palette.text.secondary, fontSize: 12, fontWeight: 600 }}>TOTAL USERS</Typography>
              <Typography sx={{ color: theme.palette.text.primary, fontSize: 24, fontWeight: 700 }}>{stats?.total_users || 0}</Typography>
            </Box>
          </Box>
          <Button
            size="small"
            onClick={() => router.push('/institution-admin/users')}
            sx={{
              color: '#1ca7a1',
              textTransform: 'none',
              fontSize: 12,
              fontWeight: 600,
              '&:hover': { bgcolor: 'rgba(8, 145, 178, 0.1)' },
            }}
          >
            View All →
          </Button>
        </Box>

        <Box sx={{ 
          flex: '1 1 250px', 
          bgcolor: theme.palette.background.paper, 
          borderRadius: 3, 
          p: 3, 
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.palette.mode === 'light' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircleIcon sx={{ color: '#22c55e', fontSize: 24 }} />
            </Box>
            <Box>
              <Typography sx={{ color: theme.palette.text.secondary, fontSize: 12, fontWeight: 600 }}>ACTIVE USERS</Typography>
              <Typography sx={{ color: theme.palette.text.primary, fontSize: 24, fontWeight: 700 }}>{stats?.active_users || 0}</Typography>
            </Box>
          </Box>
          <Typography sx={{ color: '#22c55e', fontSize: 12 }}>
            ↑ {stats?.total_users > 0 ? Math.round((stats.active_users / stats.total_users) * 100) : 0}% of total
          </Typography>
        </Box>

        <Box sx={{ 
          flex: '1 1 250px', 
          bgcolor: theme.palette.background.paper, 
          borderRadius: 3, 
          p: 3, 
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.palette.mode === 'light' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: 'rgba(251, 191, 36, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ScheduleIcon sx={{ color: '#fbbf24', fontSize: 24 }} />
            </Box>
            <Box>
              <Typography sx={{ color: theme.palette.text.secondary, fontSize: 12, fontWeight: 600 }}>PENDING</Typography>
              <Typography sx={{ color: theme.palette.text.primary, fontSize: 24, fontWeight: 700 }}>{stats?.pending_users || 0}</Typography>
            </Box>
          </Box>
          <Button
            size="small"
            onClick={() => router.push('/institution-admin/pending-users')}
            sx={{
              color: '#fbbf24',
              textTransform: 'none',
              fontSize: 12,
              fontWeight: 600,
              '&:hover': { bgcolor: 'rgba(251, 191, 36, 0.1)' },
            }}
          >
            Review Pending →
          </Button>
        </Box>
      </Box>

      {/* Two Column Layout */}
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Recent Users */}
        <Box sx={{ 
          flex: '1 1 400px', 
          bgcolor: theme.palette.background.paper, 
          borderRadius: 3, 
          p: 3, 
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.palette.mode === 'light' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
        }}>
          <Typography sx={{ color: '#1ca7a1', fontSize: 12, fontWeight: 700, mb: 1 }}>RECENT</Typography>
          <Typography sx={{ color: theme.palette.text.primary, fontSize: 16, fontWeight: 600, mb: 3 }}>Users</Typography>
          {users.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {users.slice(0, 5).map((user) => (
                <Box
                  key={user.id}
                  sx={{
                    p: 2,
                    bgcolor: theme.palette.mode === 'dark' ? '#0f172a' : theme.palette.background.default,
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: '#1ca7a1' },
                  }}
                  onClick={() => router.push('/institution-admin/users')}
                >
                  <Typography sx={{ color: theme.palette.text.primary, fontSize: 14, fontWeight: 600, mb: 0.5 }}>
                    {user.name || 'No name'}
                  </Typography>
                  <Typography sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>
                    {user.email}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography sx={{ color: theme.palette.text.secondary, fontSize: 14 }}>No users yet</Typography>
          )}
        </Box>

        {/* Quick Actions */}
        <Box sx={{ 
          flex: '1 1 300px', 
          bgcolor: theme.palette.background.paper, 
          borderRadius: 3, 
          p: 3, 
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.palette.mode === 'light' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
        }}>
          <Typography sx={{ color: '#f97316', fontSize: 12, fontWeight: 700, mb: 1 }}>QUICK</Typography>
          <Typography sx={{ color: theme.palette.text.primary, fontSize: 16, fontWeight: 600, mb: 3 }}>Actions</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={() => router.push('/institution-admin/users')}
              sx={{
                bgcolor: '#1ca7a1',
                color: '#fff',
                textTransform: 'none',
                borderRadius: 2,
                py: 1.5,
                fontSize: 14,
                fontWeight: 600,
                justifyContent: 'flex-start',
                '&:hover': { bgcolor: '#0e7490' },
              }}
            >
              Manage Users
            </Button>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ScheduleIcon />}
              onClick={() => router.push('/institution-admin/pending-users')}
              sx={{
                borderColor: stats?.pending_users > 0 ? '#fbbf24' : theme.palette.divider,
                color: stats?.pending_users > 0 ? '#fbbf24' : theme.palette.text.secondary,
                textTransform: 'none',
                borderRadius: 2,
                py: 1.5,
                fontSize: 14,
                fontWeight: 600,
                justifyContent: 'flex-start',
                '&:hover': { borderColor: '#fbbf24', bgcolor: 'rgba(251, 191, 36, 0.05)' },
              }}
            >
              Review Pending ({stats?.pending_users || 0})
            </Button>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => router.push('/institution-admin/roles')}
              sx={{
                borderColor: theme.palette.divider,
                color: theme.palette.text.secondary,
                textTransform: 'none',
                borderRadius: 2,
                py: 1.5,
                fontSize: 14,
                fontWeight: 600,
                justifyContent: 'flex-start',
                '&:hover': { borderColor: theme.palette.mode === 'dark' ? '#475569' : theme.palette.divider, bgcolor: theme.palette.mode === 'dark' ? 'rgba(148, 163, 184, 0.05)' : 'rgba(0, 0, 0, 0.02)' },
              }}
            >
              Manage Roles
            </Button>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => router.push('/institution-admin/settings')}
              sx={{
                borderColor: theme.palette.divider,
                color: theme.palette.text.secondary,
                textTransform: 'none',
                borderRadius: 2,
                py: 1.5,
                fontSize: 14,
                fontWeight: 600,
                justifyContent: 'flex-start',
                '&:hover': { borderColor: theme.palette.mode === 'dark' ? '#475569' : theme.palette.divider, bgcolor: theme.palette.mode === 'dark' ? 'rgba(148, 163, 184, 0.05)' : 'rgba(0, 0, 0, 0.02)' },
              }}
            >
              Institution Settings
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
