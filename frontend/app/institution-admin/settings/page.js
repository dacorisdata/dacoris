'use client';

import { useEffect, useRef, useState } from 'react';
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
  Autocomplete,
  Chip,
  useTheme,
} from '@mui/material';
import {
  Save as SaveIcon,
  CloudUpload as CloudUploadIcon,
  DeleteOutline as DeleteOutlineIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { institutionAdminAPI } from '../../../lib/api';
import { INSTITUTION_TYPES } from '../../../lib/institutionTypes';
import { clearInstitutionLogoCache } from '../../../hooks/useInstitutionLogo';

export default function InstitutionAdminSettingsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const fileInputRef = useRef(null);
  const logoPreviewUrlRef = useRef(null);

  const [institution, setInstitution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    domain: '',
    verified_domains: '',
    institution_types: [],
    auto_approve: false,
  });

  useEffect(() => {
    checkAuth();
    return () => {
      if (logoPreviewUrlRef.current) {
        URL.revokeObjectURL(logoPreviewUrlRef.current);
      }
    };
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

  const clearLogoPreview = () => {
    if (logoPreviewUrlRef.current) {
      URL.revokeObjectURL(logoPreviewUrlRef.current);
      logoPreviewUrlRef.current = null;
    }
    setLogoPreviewUrl(null);
  };

  const loadLogoPreview = async (hasLogo) => {
    clearLogoPreview();
    if (!hasLogo) return;
    try {
      const response = await institutionAdminAPI.getInstitutionLogo();
      const url = URL.createObjectURL(response.data);
      logoPreviewUrlRef.current = url;
      setLogoPreviewUrl(url);
    } catch {
      clearLogoPreview();
    }
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
        institution_types: response.data.institution_types || [],
        auto_approve: response.data.auto_approve || false,
      });
      await loadLogoPreview(Boolean(response.data.has_logo));
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

  const handleLogoSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, GIF, or WebP)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be 2MB or smaller');
      return;
    }

    setLogoUploading(true);
    setError('');
    try {
      await institutionAdminAPI.uploadInstitutionLogo(file);
      clearInstitutionLogoCache();
      await fetchUser();
      setSuccess('Logo updated successfully');
      setInstitution((prev) => (prev ? { ...prev, has_logo: true } : prev));
      await loadLogoPreview(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    setLogoUploading(true);
    setError('');
    try {
      await institutionAdminAPI.deleteInstitutionLogo();
      clearInstitutionLogoCache();
      await fetchUser();
      setSuccess('Logo removed successfully');
      setInstitution((prev) => (prev ? { ...prev, has_logo: false } : prev));
      await loadLogoPreview(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to remove logo');
    } finally {
      setLogoUploading(false);
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

          <Box sx={{ mb: 3 }}>
            <Typography sx={{ color: theme.palette.text.primary, fontSize: 14, fontWeight: 600, mb: 1 }}>
              Institution Logo
            </Typography>
            <Typography sx={{ color: theme.palette.text.secondary, fontSize: 12, mb: 2 }}>
              Upload a square or wide logo (JPEG, PNG, GIF, or WebP, max 2MB). This will be used for institution branding.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Box
                sx={{
                  width: 96,
                  height: 96,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(148, 163, 184, 0.08)' : 'rgba(0,0,0,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {logoPreviewUrl ? (
                  <Box
                    component="img"
                    src={logoPreviewUrl}
                    alt={`${settingsForm.name || 'Institution'} logo`}
                    sx={{ width: '100%', height: '100%', objectFit: 'contain', p: 1 }}
                  />
                ) : (
                  <Typography sx={{ color: theme.palette.text.secondary, fontSize: 12, textAlign: 'center', px: 1 }}>
                    No logo
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  hidden
                  onChange={handleLogoSelect}
                />
                <Button
                  variant="outlined"
                  startIcon={logoUploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
                  disabled={logoUploading}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderColor: '#1ca7a1',
                    color: '#1ca7a1',
                    '&:hover': { borderColor: '#0e7490', bgcolor: 'rgba(28, 167, 161, 0.06)' },
                  }}
                >
                  {institution?.has_logo ? 'Replace Logo' : 'Upload Logo'}
                </Button>
                {institution?.has_logo && (
                  <Button
                    startIcon={<DeleteOutlineIcon />}
                    disabled={logoUploading}
                    onClick={handleRemoveLogo}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      color: theme.palette.error.main,
                      '&:hover': { bgcolor: 'rgba(211, 47, 47, 0.06)' },
                    }}
                  >
                    Remove
                  </Button>
                )}
              </Box>
            </Box>
          </Box>

          <TextField
            fullWidth
            label="Primary Domain"
            value={settingsForm.domain}
            onChange={(e) => setSettingsForm({ ...settingsForm, domain: e.target.value })}
            helperText="e.g., university.edu"
            sx={{ mb: 3 }}
          />

          <Autocomplete
            multiple
            options={INSTITUTION_TYPES}
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(option, value) => option.value === value.value}
            value={INSTITUTION_TYPES.filter((type) => settingsForm.institution_types.includes(type.value))}
            onChange={(event, newValue) =>
              setSettingsForm({
                ...settingsForm,
                institution_types: newValue.map((type) => type.value),
              })
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Institution Types"
                placeholder="Select one or more types..."
                helperText="An institution can have multiple types, e.g. University and Hospital"
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip {...getTagProps({ index })} key={option.value} label={option.label} size="small" />
              ))
            }
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
