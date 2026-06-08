'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box, Typography, TextField, Button, Alert, CircularProgress,
  InputAdornment, IconButton, Link as MuiLink, useTheme,
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock, RateReview } from '@mui/icons-material';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';
import { getDashboardRoute, isReviewerUser } from '../../../lib/authRouting';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assignmentToken = searchParams.get('assignment');
  const { login, fetchUser, user } = useAuth();

  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const ACCENT = dark ? '#2dd4bf' : '#0d9488';
  const HOVER  = dark ? '#1ca7a1' : '#0f766e';
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user && isReviewerUser(user)) {
      const dest = assignmentToken
        ? `/reviewer/reviews?token=${assignmentToken}`
        : '/reviewer/tasks';
      router.replace(dest);
    }
  }, [user, router, assignmentToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please enter both email and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const u = await login(form.email, form.password);
      if (!u) {
        setError('Login succeeded but no user data received');
        setLoading(false);
        return;
      }
      if (!isReviewerUser(u)) {
        setError('This login page is for external reviewers only. Use the main login for other accounts.');
        setLoading(false);
        return;
      }
      const dest = assignmentToken
        ? `/reviewer/reviews?token=${assignmentToken}`
        : getDashboardRoute(u);
      window.location.href = dest;
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password.');
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: 'background.default', p: 3,
    }}>
      <Box sx={{
        width: '100%', maxWidth: 420,
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
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
            Reviewer Login
          </Typography>
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            Sign in to access your assigned reviews
          </Typography>
        </Box>

        {assignmentToken && (
          <Alert severity="info" sx={{ mb: 2, fontSize: 13 }}>
            You have a pending review assignment. Log in to continue.
          </Alert>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth label="Email" type="email" margin="normal" required
            value={form.email}
            onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
            InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> }}
          />
          <TextField
            fullWidth label="Password" type={showPassword ? 'text' : 'password'} margin="normal" required
            value={form.password}
            onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
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
          <Button
            type="submit" fullWidth variant="contained" disabled={loading}
            sx={{ mt: 2.5, py: 1.3, bgcolor: ACCENT, '&:hover': { bgcolor: HOVER }, textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
          </Button>
        </Box>

        <Typography sx={{ mt: 3, textAlign: 'center', fontSize: 13, color: 'text.secondary' }}>
          Invited but don&apos;t have an account?{' '}
          <MuiLink component={Link} href="/reviewer/register" sx={{ color: ACCENT, fontWeight: 600 }}>
            Create reviewer account
          </MuiLink>
        </Typography>
        <Typography sx={{ mt: 1.5, textAlign: 'center', fontSize: 12, color: 'text.disabled' }}>
          <MuiLink component={Link} href="/login" sx={{ color: 'text.disabled' }}>
            Main login for researchers & staff
          </MuiLink>
        </Typography>
      </Box>
    </Box>
  );
}

export default function ReviewerLoginPage() {
  return (
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>}>
      <LoginForm />
    </Suspense>
  );
}
