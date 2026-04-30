'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  School as SchoolIcon,
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '@mui/material/styles';
import { globalAdminAPI } from '../../../lib/api';

export default function AnalyticsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  
  const [analytics, setAnalytics] = useState(null);
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
    if (!userData.is_global_admin) {
      if (userData.is_institution_admin) {
        router.push('/institution-admin/dashboard');
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
      const response = await globalAdminAPI.getAnalytics();
      setAnalytics(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load analytics');
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
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>Analytics</Typography>
        <Typography variant="body2" color="text.secondary">Platform statistics and insights</Typography>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Stats Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3 }}>
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 4, border: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.15 }}>
              <SchoolIcon sx={{ color: 'primary.main', fontSize: 28, opacity: 1 }} />
            </Box>
            <Box>
              <Typography variant="overline" color="text.secondary">Total Institutions</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{analytics?.total_institutions || 0}</Typography>
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Registered organizations
          </Typography>
        </Box>

        <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 4, border: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.15 }}>
              <PeopleIcon sx={{ color: 'success.main', fontSize: 28, opacity: 1 }} />
            </Box>
            <Box>
              <Typography variant="overline" color="text.secondary">Total Users</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{analytics?.total_users || 0}</Typography>
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary">
            All registered users
          </Typography>
        </Box>

        <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 4, border: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.15 }}>
              <TrendingUpIcon sx={{ color: 'success.main', fontSize: 28, opacity: 1 }} />
            </Box>
            <Box>
              <Typography variant="overline" color="text.secondary">Active Users</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{analytics?.active_users || 0}</Typography>
            </Box>
          </Box>
          <Typography variant="caption" color="success.main">
            ↑ {analytics?.total_users > 0 ? Math.round((analytics.active_users / analytics.total_users) * 100) : 0}% of total
          </Typography>
        </Box>

        <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 4, border: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: 'warning.main', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.15 }}>
              <PersonAddIcon sx={{ color: 'warning.main', fontSize: 28, opacity: 1 }} />
            </Box>
            <Box>
              <Typography variant="overline" color="text.secondary">Pending Users</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{analytics?.pending_users || 0}</Typography>
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Awaiting approval
          </Typography>
        </Box>

        <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 4, border: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: 'info.main', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.15 }}>
              <PeopleIcon sx={{ color: 'info.main', fontSize: 28, opacity: 1 }} />
            </Box>
            <Box>
              <Typography variant="overline" color="text.secondary">ORCID Users</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{analytics?.total_orcid_users || 0}</Typography>
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Researchers with ORCID
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
