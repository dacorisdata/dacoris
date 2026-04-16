'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  useTheme,
} from '@mui/material';
import {
  Person as PersonIcon,
  Science as ScienceIcon,
  Assignment as AssignmentIcon,
  LibraryBooks as LibraryIcon,
  Groups as GroupsIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  School as SchoolIcon,
  Badge as BadgeIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';

export default function ResearcherOverview() {
  const router = useRouter();
  const { fetchUser, user: cachedUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [user, setUser] = useState(null);
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
    if (userData.is_global_admin) {
      router.push('/global-admin/dashboard');
      return;
    }
    if (userData.is_institution_admin) {
      router.push('/institution-admin/dashboard');
      return;
    }
    setUser(userData);
    setLoading(false);
  };

  const Card = ({ children, sx = {} }) => (
    <Box sx={{
      bgcolor: 'background.paper',
      borderRadius: 3,
      p: 3,
      border: `1px solid ${theme.palette.divider}`,
      boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
      ...sx,
    }}>
      {children}
    </Box>
  );

  const StatCard = ({ icon: Icon, iconColor, iconBg, label, value, sub, onClick }) => (
    <Card sx={{ flex: '1 1 200px', cursor: onClick ? 'pointer' : 'default', '&:hover': onClick ? { borderColor: iconColor } : {} }}
      onClick={onClick}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
        <Box sx={{ width: 46, height: 46, borderRadius: 2, bgcolor: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon sx={{ color: iconColor, fontSize: 22 }} />
        </Box>
        <Box>
          <Typography sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Typography>
          <Typography sx={{ color: 'text.primary', fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}>{value}</Typography>
        </Box>
      </Box>
      {sub && <Typography sx={{ color: 'text.disabled', fontSize: 12 }}>{sub}</Typography>}
    </Card>
  );

  const profileFields = [
    { label: 'Department', value: user?.department, icon: BusinessIcon },
    { label: 'Job Title', value: user?.job_title, icon: BadgeIcon },
    { label: 'Email', value: user?.email, icon: EmailIcon },
    { label: 'ORCID iD', value: user?.orcid_id, icon: SchoolIcon },
  ];

  const filledFields = profileFields.filter(f => f.value).length;
  const profileCompletion = Math.round((filledFields / profileFields.length) * 100);

  const quickActions = [
    { label: 'Complete My Profile', icon: PersonIcon, path: '/researcher/profile', color: '#1ca7a1', desc: 'Update your research profile' },
    { label: 'Browse Grants', icon: AssignmentIcon, path: '/researcher/grants', color: '#8b5cf6', desc: 'Explore funding opportunities' },
    { label: 'My Projects', icon: ScienceIcon, path: '/researcher/projects', color: '#f59e0b', desc: 'Manage active research projects' },
    { label: 'Publications', icon: LibraryIcon, path: '/researcher/publications', color: '#10b981', desc: 'Track your research output' },
    { label: 'Collaborations', icon: GroupsIcon, path: '/researcher/collaborations', color: '#ef4444', desc: 'Connect with other researchers' },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const firstName = user?.name?.split(' ')[0] || 'Researcher';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography sx={{ color: 'text.primary', fontSize: 26, fontWeight: 700, mb: 0.5 }}>
              {greeting}, {firstName} 👋
            </Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
              Welcome to your research dashboard. Here's an overview of your activity.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<PersonIcon />}
            onClick={() => router.push('/researcher/profile')}
            sx={{
              bgcolor: '#1ca7a1',
              textTransform: 'none',
              borderRadius: 2,
              fontWeight: 600,
              '&:hover': { bgcolor: '#0e7490' },
            }}
          >
            Edit Profile
          </Button>
        </Box>
      </Box>

      {/* Stat Cards */}
      <Box sx={{ display: 'flex', gap: 2.5, mb: 3.5, flexWrap: 'wrap' }}>
        <StatCard
          icon={AssignmentIcon}
          iconColor="#8b5cf6"
          iconBg="rgba(139,92,246,0.1)"
          label="Active Grants"
          value="0"
          sub="No active grants yet"
          onClick={() => router.push('/researcher/grants')}
        />
        <StatCard
          icon={ScienceIcon}
          iconColor="#f59e0b"
          iconBg="rgba(245,158,11,0.1)"
          label="Projects"
          value="0"
          sub="No projects yet"
          onClick={() => router.push('/researcher/projects')}
        />
        <StatCard
          icon={LibraryIcon}
          iconColor="#10b981"
          iconBg="rgba(16,185,129,0.1)"
          label="Publications"
          value="0"
          sub="No publications yet"
          onClick={() => router.push('/researcher/publications')}
        />
        <StatCard
          icon={GroupsIcon}
          iconColor="#ef4444"
          iconBg="rgba(239,68,68,0.1)"
          label="Collaborators"
          value="0"
          sub="No collaborations yet"
          onClick={() => router.push('/researcher/collaborations')}
        />
      </Box>

      {/* Two-column layout */}
      <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>

        {/* Profile Completion */}
        <Card sx={{ flex: '1 1 340px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography sx={{ color: '#1ca7a1', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', mb: 0.5 }}>
                Profile
              </Typography>
              <Typography sx={{ color: 'text.primary', fontSize: 16, fontWeight: 600 }}>
                Profile Completion
              </Typography>
            </Box>
            <Typography sx={{ color: 'text.primary', fontSize: 22, fontWeight: 700 }}>{profileCompletion}%</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={profileCompletion}
            sx={{
              mb: 2.5,
              height: 8,
              borderRadius: 4,
              bgcolor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              '& .MuiLinearProgress-bar': { bgcolor: '#1ca7a1', borderRadius: 4 },
            }}
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {profileFields.map(({ label, value, icon: Icon }) => (
              <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{
                  width: 32, height: 32, borderRadius: 1.5,
                  bgcolor: value ? 'rgba(28,167,161,0.1)' : (dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {value
                    ? <CheckCircleIcon sx={{ fontSize: 16, color: '#1ca7a1' }} />
                    : <Icon sx={{ fontSize: 16, color: 'text.disabled' }} />
                  }
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 600 }}>{label}</Typography>
                  <Typography sx={{ color: value ? 'text.primary' : 'text.disabled', fontSize: 13, fontWeight: value ? 500 : 400 }}>
                    {value || 'Not set'}
                  </Typography>
                </Box>
                {!value && (
                  <Chip label="Add" size="small" onClick={() => router.push('/researcher/profile')}
                    sx={{ fontSize: 11, height: 22, bgcolor: 'rgba(28,167,161,0.1)', color: '#1ca7a1', cursor: 'pointer', border: 'none' }} />
                )}
              </Box>
            ))}
          </Box>
          {profileCompletion < 100 && (
            <Button
              fullWidth
              variant="outlined"
              endIcon={<ArrowForwardIcon />}
              onClick={() => router.push('/researcher/profile')}
              sx={{
                mt: 2.5,
                borderColor: '#1ca7a1',
                color: '#1ca7a1',
                textTransform: 'none',
                borderRadius: 2,
                fontWeight: 600,
                '&:hover': { bgcolor: 'rgba(28,167,161,0.05)', borderColor: '#0e7490' },
              }}
            >
              Complete Profile
            </Button>
          )}
        </Card>

        {/* Quick Actions */}
        <Card sx={{ flex: '1 1 300px' }}>
          <Typography sx={{ color: '#f97316', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', mb: 0.5 }}>
            Quick
          </Typography>
          <Typography sx={{ color: 'text.primary', fontSize: 16, fontWeight: 600, mb: 2.5 }}>
            Actions
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {quickActions.map(({ label, icon: Icon, path, color, desc }) => (
              <Box
                key={label}
                onClick={() => router.push(path)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1.5,
                  borderRadius: 2,
                  cursor: 'pointer',
                  border: `1px solid ${theme.palette.divider}`,
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: color, bgcolor: `${color}08` },
                }}
              >
                <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon sx={{ color, fontSize: 18 }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ color: 'text.primary', fontSize: 13, fontWeight: 600 }}>{label}</Typography>
                  <Typography sx={{ color: 'text.secondary', fontSize: 11 }}>{desc}</Typography>
                </Box>
                <ArrowForwardIcon sx={{ color: 'text.disabled', fontSize: 16 }} />
              </Box>
            ))}
          </Box>
        </Card>

      </Box>

      {/* Institution Info */}
      {user?.primary_institution_id && (
        <Card sx={{ mt: 2.5 }}>
          <Typography sx={{ color: '#0ea5e9', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', mb: 0.5 }}>
            Institution
          </Typography>
          <Typography sx={{ color: 'text.primary', fontSize: 16, fontWeight: 600, mb: 2 }}>
            Your Affiliation
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BusinessIcon sx={{ color: '#0ea5e9', fontSize: 20 }} />
              <Typography sx={{ color: 'text.primary', fontSize: 14, fontWeight: 600 }}>
                {user.institution_name || `Institution ID: ${user.primary_institution_id}`}
              </Typography>
            </Box>
            {user.department && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScienceIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>{user.department}</Typography>
              </Box>
            )}
            <Chip
              label="Account Active"
              size="small"
              icon={<CheckCircleIcon />}
              sx={{ bgcolor: 'rgba(16,185,129,0.1)', color: '#10b981', '& .MuiChip-icon': { color: '#10b981' } }}
            />
          </Box>
        </Card>
      )}
    </Box>
  );
}
