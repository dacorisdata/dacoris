'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Box, Typography, TextField, Button, Alert, CircularProgress, InputAdornment,
} from '@mui/material';
import { ArrowBack, Email, MarkEmailRead } from '@mui/icons-material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { useLanguage } from '../../contexts/LanguageContext';
import { authAPI } from '../../lib/api';

export default function ForgotPasswordPage() {
  const muiTheme = useMuiTheme();
  const isDark = muiTheme.palette.mode === 'dark';
  const { t, dir } = useLanguage();
  const isRtl = dir === 'rtl';

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setError(t('forgotPassword.errorEmailRequired')); return; }
    setError('');
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(err.response?.data?.detail || t('forgotPassword.errorGeneric'));
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
          {submitted ? (
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: 56, height: 56, borderRadius: '50%', mx: 'auto', mb: 2.5,
                  bgcolor: isDark ? 'rgba(13,148,136,0.15)' : 'rgba(13,148,136,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <MarkEmailRead sx={{ fontSize: 28, color: 'primary.main' }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.5, letterSpacing: '-0.02em' }}>
                {t('forgotPassword.successTitle')}
              </Typography>
              <Typography sx={{ fontSize: '0.9375rem', color: 'text.secondary', lineHeight: 1.6, mb: 3.5 }}>
                {t('forgotPassword.successMessage')}
              </Typography>
              <Button
                component={Link}
                href="/login"
                variant="contained"
                color="primary"
                fullWidth
                startIcon={<ArrowBack sx={{ transform: isRtl ? 'scaleX(-1)' : 'none' }} />}
                sx={{ py: 1.375, borderRadius: '10px', fontWeight: 700 }}
              >
                {t('forgotPassword.backToLogin')}
              </Button>
            </Box>
          ) : (
            <>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.02em' }}>
                {t('forgotPassword.title')}
              </Typography>
              <Typography sx={{ fontSize: '0.9375rem', color: 'text.secondary', mb: 3.5, lineHeight: 1.6 }}>
                {t('forgotPassword.subtitle')}
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: '10px' }} onClose={() => setError('')}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.primary', mb: 0.75 }}>
                    {t('forgotPassword.emailLabel')}
                  </Typography>
                  <TextField
                    fullWidth
                    type="email"
                    placeholder={t('forgotPassword.emailPlaceholder')}
                    required
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email sx={{ fontSize: 18, color: 'text.disabled' }} />
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
                  {isLoading ? <CircularProgress size={20} sx={{ color: 'inherit' }} /> : t('forgotPassword.sendButton')}
                </Button>

                <Box sx={{ textAlign: 'center', pt: 1 }}>
                  <Button
                    component={Link}
                    href="/login"
                    startIcon={<ArrowBack sx={{ fontSize: 17, transform: isRtl ? 'scaleX(-1)' : 'none' }} />}
                    sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.875rem' }}
                  >
                    {t('forgotPassword.backToLogin')}
                  </Button>
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
