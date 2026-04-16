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
import { globalAdminAPI } from '../../../lib/api';

export default function AnalyticsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  
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
        <Typography sx={{ color: '#fff', fontSize: 24, fontWeight: 700, mb: 0.5 }}>Analytics</Typography>
        <Typography sx={{ color: '#2c3035', fontSize: 14 }}>Platform statistics and insights</Typography>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Stats Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3 }}>
        <Box sx={{ bgcolor: '#1e293b', borderRadius: 3, p: 4, border: '1px solid #334155' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: 'rgba(79, 70, 229, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SchoolIcon sx={{ color: '#4f46e5', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography sx={{ color: '#2c3035', fontSize: 13, fontWeight: 600, mb: 0.5 }}>Total Institutions</Typography>
              <Typography sx={{ color: '#fff', fontSize: 32, fontWeight: 700 }}>{analytics?.total_institutions || 0}</Typography>
            </Box>
          </Box>
          <Typography sx={{ color: '#2c3035', fontSize: 12 }}>
            Registered organizations
          </Typography>
        </Box>

        <Box sx={{ bgcolor: '#1e293b', borderRadius: 3, p: 4, border: '1px solid #334155' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PeopleIcon sx={{ color: '#22c55e', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography sx={{ color: '#2c3035', fontSize: 13, fontWeight: 600, mb: 0.5 }}>Total Users</Typography>
              <Typography sx={{ color: '#fff', fontSize: 32, fontWeight: 700 }}>{analytics?.total_users || 0}</Typography>
            </Box>
          </Box>
          <Typography sx={{ color: '#2c3035', fontSize: 12 }}>
            All registered users
          </Typography>
        </Box>

        <Box sx={{ bgcolor: '#1e293b', borderRadius: 3, p: 4, border: '1px solid #334155' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUpIcon sx={{ color: '#10b981', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography sx={{ color: '#2c3035', fontSize: 13, fontWeight: 600, mb: 0.5 }}>Active Users</Typography>
              <Typography sx={{ color: '#fff', fontSize: 32, fontWeight: 700 }}>{analytics?.active_users || 0}</Typography>
            </Box>
          </Box>
          <Typography sx={{ color: '#22c55e', fontSize: 12 }}>
            ↑ {analytics?.total_users > 0 ? Math.round((analytics.active_users / analytics.total_users) * 100) : 0}% of total
          </Typography>
        </Box>

        <Box sx={{ bgcolor: '#1e293b', borderRadius: 3, p: 4, border: '1px solid #334155' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: 'rgba(251, 191, 36, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PersonAddIcon sx={{ color: '#fbbf24', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography sx={{ color: '#2c3035', fontSize: 13, fontWeight: 600, mb: 0.5 }}>Pending Users</Typography>
              <Typography sx={{ color: '#fff', fontSize: 32, fontWeight: 700 }}>{analytics?.pending_users || 0}</Typography>
            </Box>
          </Box>
          <Typography sx={{ color: '#2c3035', fontSize: 12 }}>
            Awaiting approval
          </Typography>
        </Box>

        <Box sx={{ bgcolor: '#1e293b', borderRadius: 3, p: 4, border: '1px solid #334155' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PeopleIcon sx={{ color: '#3b82f6', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography sx={{ color: '#2c3035', fontSize: 13, fontWeight: 600, mb: 0.5 }}>ORCID Users</Typography>
              <Typography sx={{ color: '#fff', fontSize: 32, fontWeight: 700 }}>{analytics?.total_orcid_users || 0}</Typography>
            </Box>
          </Box>
          <Typography sx={{ color: '#2c3035', fontSize: 12 }}>
            Researchers with ORCID
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
