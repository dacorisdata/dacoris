'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  School as SchoolIcon,
  People as PeopleIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { globalAdminAPI } from '../../../lib/api';

export default function OverviewPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useMuiTheme();
  
  const [analytics, setAnalytics] = useState(null);
  const [institutions, setInstitutions] = useState([]);
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
      const [institutionsRes, analyticsRes] = await Promise.all([
        globalAdminAPI.listInstitutions(),
        globalAdminAPI.getAnalytics(),
      ]);
      setInstitutions(institutionsRes.data);
      setAnalytics(analyticsRes.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load data');
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
        <Typography variant="h3" sx={{ mb: 0.5 }}>
          Global Admin Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Welcome back! Here's what's happening with your platform.
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
        <Box sx={{ flex: '1 1 250px', bgcolor: 'background.paper', borderRadius: 3, p: 3, border: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.15 }}>
              <SchoolIcon sx={{ color: 'primary.main', fontSize: 24, opacity: 1 }} />
            </Box>
            <Box>
              <Typography variant="overline" color="text.secondary">Institutions</Typography>
              <Typography variant="h4">{analytics?.total_institutions || 0}</Typography>
            </Box>
          </Box>
          <Button
            size="small"
            onClick={() => router.push('/global-admin/institutions')}
            sx={{ color: 'primary.main', fontSize: '0.75rem', fontWeight: 600 }}
          >
            View All →
          </Button>
        </Box>

        <Box sx={{ flex: '1 1 250px', bgcolor: 'background.paper', borderRadius: 3, p: 3, border: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.15 }}>
              <PeopleIcon sx={{ color: 'success.main', fontSize: 24, opacity: 1 }} />
            </Box>
            <Box>
              <Typography variant="overline" color="text.secondary">Total Users</Typography>
              <Typography variant="h4">{analytics?.total_users || 0}</Typography>
            </Box>
          </Box>
          <Button
            size="small"
            onClick={() => router.push('/global-admin/users')}
            sx={{ color: 'primary.main', fontSize: '0.75rem', fontWeight: 600 }}
          >
            View All →
          </Button>
        </Box>

        <Box sx={{ flex: '1 1 250px', bgcolor: 'background.paper', borderRadius: 3, p: 3, border: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: 'warning.main', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.15 }}>
              <TrendingUpIcon sx={{ color: 'warning.main', fontSize: 24, opacity: 1 }} />
            </Box>
            <Box>
              <Typography variant="overline" color="text.secondary">Active Users</Typography>
              <Typography variant="h4">{analytics?.active_users || 0}</Typography>
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {analytics?.pending_users || 0} pending approval
          </Typography>
        </Box>
      </Box>

      {/* Two Column Layout */}
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Recent Institutions */}
        <Box sx={{ flex: '1 1 400px', bgcolor: 'background.paper', borderRadius: 3, p: 3, border: 1, borderColor: 'divider' }}>
          <Typography variant="overline" color="success.main" sx={{ mb: 1, display: 'block' }}>Recent</Typography>
          <Typography variant="h6" sx={{ mb: 3 }}>Institutions</Typography>
          {institutions.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {institutions.slice(0, 5).map((institution) => (
                <Box
                  key={institution.id}
                  sx={{
                    p: 2,
                    bgcolor: 'surface.raised',
                    borderRadius: 2,
                    border: 1,
                    borderColor: 'divider',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                  }}
                  onClick={() => router.push('/global-admin/institutions')}
                >
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    {institution.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {institution.domain}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">No institutions yet</Typography>
          )}
        </Box>

        {/* Quick Actions */}
        <Box sx={{ flex: '1 1 300px', bgcolor: 'background.paper', borderRadius: 3, p: 3, border: 1, borderColor: 'divider' }}>
          <Typography variant="overline" color="warning.main" sx={{ mb: 1, display: 'block' }}>Quick</Typography>
          <Typography variant="h6" sx={{ mb: 3 }}>Actions</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => router.push('/global-admin/institutions')}
              sx={{ py: 1.5, justifyContent: 'flex-start' }}
            >
              Create Institution
            </Button>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => router.push('/global-admin/users')}
              sx={{ py: 1.5, justifyContent: 'flex-start' }}
            >
              View All Users
            </Button>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => router.push('/global-admin/analytics')}
              sx={{ py: 1.5, justifyContent: 'flex-start' }}
            >
              View Analytics
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
