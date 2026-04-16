'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  useTheme,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { institutionAdminAPI } from '../../../lib/api';

export default function InstitutionAdminSettingsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  
  const [institution, setInstitution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    domain: '',
    verified_domains: '',
    auto_approve: false,
  });

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
      const response = await institutionAdminAPI.getInstitutionSettings();
      setInstitution(response.data);
      setSettingsForm({
        name: response.data.name || '',
        domain: response.data.domain || '',
        verified_domains: response.data.verified_domains || '',
        auto_approve: response.data.auto_approve || false,
      });
      setLoading(false);
    } catch (err) {
      setError('Failed to load institution settings');
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await institutionAdminAPI.updateInstitutionSettings(settingsForm);
      setSuccess('Settings updated successfully');
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update settings');
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
        <Typography sx={{ color: theme.palette.text.primary, fontSize: 24, fontWeight: 700, mb: 0.5 }}>Institution Settings</Typography>
        <Typography sx={{ color: theme.palette.text.secondary, fontSize: 14 }}>Configure your institution's settings and preferences</Typography>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Settings Form */}
      <Box sx={{ maxWidth: 800 }}>
        <Box sx={{ 
          bgcolor: theme.palette.background.paper, 
          borderRadius: 3, 
          p: 4, 
          border: `1px solid ${theme.palette.divider}`, 
          mb: 3,
          boxShadow: theme.palette.mode === 'light' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
        }}>
          <Typography sx={{ color: '#1ca7a1', fontSize: 12, fontWeight: 700, mb: 1 }}>GENERAL</Typography>
          <Typography sx={{ color: theme.palette.text.primary, fontSize: 16, fontWeight: 600, mb: 3 }}>Institution Information</Typography>
          
          <TextField
            fullWidth
            label="Institution Name"
            value={settingsForm.name}
            onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
            sx={{ mb: 3 }}
          />

          <TextField
            fullWidth
            label="Primary Domain"
            value={settingsForm.domain}
            onChange={(e) => setSettingsForm({ ...settingsForm, domain: e.target.value })}
            helperText="e.g., university.edu"
            sx={{ mb: 3 }}
          />

          <TextField
            fullWidth
            label="Verified Domains"
            value={settingsForm.verified_domains}
            onChange={(e) => setSettingsForm({ ...settingsForm, verified_domains: e.target.value })}
            helperText="Comma-separated list of email domains for auto-approval"
            multiline
            rows={2}
            sx={{ mb: 3 }}
          />
        </Box>

        <Box sx={{ 
          bgcolor: theme.palette.background.paper, 
          borderRadius: 3, 
          p: 4, 
          border: `1px solid ${theme.palette.divider}`, 
          mb: 3,
          boxShadow: theme.palette.mode === 'light' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
        }}>
          <Typography sx={{ color: '#1ca7a1', fontSize: 12, fontWeight: 700, mb: 1 }}>USER MANAGEMENT</Typography>
          <Typography sx={{ color: theme.palette.text.primary, fontSize: 16, fontWeight: 600, mb: 3 }}>Access Control</Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={settingsForm.auto_approve}
                onChange={(e) => setSettingsForm({ ...settingsForm, auto_approve: e.target.checked })}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#1ca7a1',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#1ca7a1',
                  },
                }}
              />
            }
            label={
              <Box>
                <Typography sx={{ color: theme.palette.text.primary, fontSize: 14, fontWeight: 600 }}>
                  Auto-approve users with verified domains
                </Typography>
                <Typography sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>
                  Automatically approve users who register with verified email domains
                </Typography>
              </Box>
            }
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            onClick={() => loadData()}
            sx={{
              color: theme.palette.text.secondary,
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1.5,
              '&:hover': { bgcolor: theme.palette.mode === 'dark' ? 'rgba(148, 163, 184, 0.1)' : 'rgba(0,0,0,0.05)' },
            }}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSaveSettings}
            sx={{
              bgcolor: '#1ca7a1',
              color: '#fff',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1.5,
              '&:hover': { bgcolor: '#0e7490' },
            }}
          >
            Save Changes
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
