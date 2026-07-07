'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Box, Typography, TextField, Button, Alert, CircularProgress, InputAdornment, IconButton,
} from '@mui/material';
import {
  Lock, Visibility, VisibilityOff, CheckCircle, ErrorOutline,
} from '@mui/icons-material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { useLanguage } from '../../contexts/LanguageContext';
import { authAPI } from '../../lib/api';

function ResetPasswordCard() {
  const muiTheme = useMuiTheme();
  const isDark = muiTheme.palette.mode === 'dark';
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [checking, setChecking] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setChecking(false);
      setTokenValid(false);
      return undefined;
    }
    authAPI.validateResetToken(token)
      .then((res) => {
        if (!cancelled) setTokenValid(Boolean(res.data?.valid));
      })
      .catch(() => {
        if (!cancelled) setTokenValid(false);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => { cancelled = true; };
  }, [token]);

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) { setError(t('resetPassword.errorPasswordTooShort')); return; }
    if (form.password !== form.confirmPassword) { setError(t('resetPassword.errorPasswordsNoMatch')); return; }

    setLoading(true);
    setError('');
    try {
      await authAPI.resetPassword(token, form.password);
      setSuccess(true);
    } catch (err) {
      console.error('Reset password error:', err);
      setError(err.response?.data?.detail || t('resetPassword.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        py: 6,
        px: 3,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 440 }}>

        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 5 }}>
          <Box
            sx={{
              width: 34, height: 34, borderRadius: '9px', bgcolor: 'primary.main',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 12, color: '#fff', letterSpacing: 0.5,
            }}
          >
            DC
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: 14, letterSpacing: 2.5, color: 'text.primary', textTransform: 'uppercase' }}>
            DACORIS
          </Typography>
        </Box>

        <Box
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '14px',
            p: { xs: 3, sm: 4.5 },
            boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.35)' : '0 8px 32px rgba(15,23,42,0.06)',
          }}
        >
          {checking ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <CircularProgress size={28} sx={{ mb: 2 }} />
              <Typography sx={{ fontSize: '0.9375rem', color: 'text.secondary' }}>
                {t('resetPassword.validating')}
              </Typography>
            </Box>
          ) : success ? (
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: 56, height: 56, borderRadius: '50%', mx: 'auto', mb: 2.5,
                  bgcolor: isDark ? 'rgba(13,148,136,0.15)' : 'rgba(13,148,136,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <CheckCircle sx={{ fontSize: 28, color: 'primary.main' }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.5, letterSpacing: '-0.02em' }}>
                {t('resetPassword.successTitle')}
              </Typography>
              <Typography sx={{ fontSize: '0.9375rem', color: 'text.secondary', lineHeight: 1.6, mb: 3.5 }}>
                {t('resetPassword.successMessage')}
              </Typography>
              <Button
                component={Link}
                href="/login"
                variant="contained"
                color="primary"
                fullWidth
                sx={{ py: 1.375, borderRadius: '10px', fontWeight: 700 }}
              >
                {t('resetPassword.goToLogin')}
              </Button>
            </Box>
          ) : !tokenValid ? (
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: 56, height: 56, borderRadius: '50%', mx: 'auto', mb: 2.5,
                  bgcolor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <ErrorOutline sx={{ fontSize: 28, color: 'error.main' }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.5, letterSpacing: '-0.02em' }}>
                {t('resetPassword.invalidTokenTitle')}
              </Typography>
              <Typography sx={{ fontSize: '0.9375rem', color: 'text.secondary', lineHeight: 1.6, mb: 3.5 }}>
                {t('resetPassword.invalidTokenMessage')}
              </Typography>
              <Button
                component={Link}
                href="/forgot-password"
                variant="contained"
                color="primary"
                fullWidth
                sx={{ py: 1.375, borderRadius: '10px', fontWeight: 700 }}
              >
                {t('resetPassword.requestNewLink')}
              </Button>
            </Box>
          ) : (
            <>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.02em' }}>
                {t('resetPassword.title')}
              </Typography>
              <Typography sx={{ fontSize: '0.9375rem', color: 'text.secondary', mb: 3.5, lineHeight: 1.6 }}>
                {t('resetPassword.subtitle')}
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: '10px' }} onClose={() => setError('')}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.primary', mb: 0.75 }}>
                    {t('resetPassword.newPasswordLabel')}
                  </Typography>
                  <TextField
                    fullWidth
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('resetPassword.newPasswordPlaceholder')}
                    required
                    autoComplete="new-password"
                    autoFocus
                    value={form.password}
                    onChange={handleChange('password')}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ fontSize: 18, color: 'text.disabled' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword((v) => !v)}
                            edge="end"
                            size="small"
                            sx={{ color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}
                          >
                            {showPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                  />
                </Box>

                <Box>
                  <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.primary', mb: 0.75 }}>
                    {t('resetPassword.confirmPasswordLabel')}
                  </Typography>
                  <TextField
                    fullWidth
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                    required
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={handleChange('confirmPassword')}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ fontSize: 18, color: 'text.disabled' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                  />
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  disabled={isLoading}
                  sx={{
                    mt: 1, py: 1.5, borderRadius: '10px',
                    fontSize: '0.9375rem', fontWeight: 700,
                    boxShadow: '0 4px 14px rgba(13,148,136,0.35)',
                    '&:hover': { boxShadow: '0 6px 20px rgba(13,148,136,0.45)' },
                  }}
                >
                  {isLoading ? <CircularProgress size={20} sx={{ color: 'inherit' }} /> : t('resetPassword.submitButton')}
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordCard />
    </Suspense>
  );
}
