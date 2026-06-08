'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box, Typography, TextField, Button, Alert, CircularProgress,
  InputAdornment, IconButton, useTheme,
} from '@mui/material';
import { Visibility, VisibilityOff, Person, Lock, Email, RateReview } from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../lib/api';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { setToken, fetchUser } = useAuth();

  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const ACCENT = dark ? '#2dd4bf' : '#0d9488';
  const HOVER  = dark ? '#1ca7a1' : '#0f766e';
  const [invitation, setInvitation] = useState(null);
  const [form, setForm] = useState({ name: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Missing invitation token. Check your email for the correct link.');
      setLoadingInvite(false);
      return;
    }
    api.get(`/reviewer/invitation/${token}`)
      .then(res => {
        setInvitation(res.data);
        if (res.data.name) setForm(f => ({ ...f, name: res.data.name }));
      })
      .catch(() => setError('Invalid or expired invitation link.'))
      .finally(() => setLoadingInvite(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/reviewer/register', {
        token,
        name: form.name,
        password: form.password,
      });
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('refreshToken', res.data.refresh_token);
      setToken(res.data.access_token);
      await fetchUser();
      router.push(res.data.assignment_id
        ? `/reviewer/reviews/${res.data.assignment_id}`
        : '/reviewer/tasks');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  if (loadingInvite) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: 'background.default', p: 3,
    }}>
      <Box sx={{
        width: '100%', maxWidth: 440,
        bgcolor: 'background.paper', borderRadius: 3, p: 4,
        border: 1, borderColor: 'divider',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box sx={{
            width: 56, height: 56, borderRadius: 2, bgcolor: `${ACCENT}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2,
          }}>
            <RateReview sx={{ fontSize: 28, color: ACCENT }} />
          </Box>
          <Typography sx={{ fontSize: 22, fontWeight: 700, mb: 0.5 }}>
            Create Reviewer Account
          </Typography>
          {invitation && (
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              {invitation.institution_name && `${invitation.institution_name} · `}
              {invitation.entity_title && `Review: ${invitation.entity_title}`}
            </Typography>
          )}
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {invitation && (
          <Box sx={{ mb: 2, p: 2, bgcolor: `${ACCENT}08`, borderRadius: 2, border: `1px solid ${ACCENT}30` }}>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Account email</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Email sx={{ fontSize: 16, color: ACCENT }} /> {invitation.email}
            </Typography>
          </Box>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth label="Full Name" margin="normal" required
            value={form.name}
            onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
            InputProps={{ startAdornment: <InputAdornment position="start"><Person sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> }}
          />
          <TextField
            fullWidth label="Password" type={showPassword ? 'text' : 'password'} margin="normal" required
            value={form.password}
            onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
            helperText="Minimum 8 characters"
            InputProps={{
              startAdornment: <InputAdornment position="start"><Lock sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment>,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(v => !v)} edge="end" size="small">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            fullWidth label="Confirm Password" type="password" margin="normal" required
            value={form.confirmPassword}
            onChange={(e) => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
          />
          <Button
            type="submit" fullWidth variant="contained" disabled={loading || !invitation}
            sx={{ mt: 2.5, py: 1.3, bgcolor: ACCENT, '&:hover': { bgcolor: HOVER }, textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Create Account & Continue'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

export default function ReviewerRegisterPage() {
  return (
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>}>
      <RegisterForm />
    </Suspense>
  );
}
