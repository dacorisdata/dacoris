'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box, Typography, TextField, Button, Link as MuiLink,
  Divider, Alert, CircularProgress, Chip,
} from '@mui/material';
import { ArrowForward, Science, BarChart, Link as LinkIcon } from '@mui/icons-material';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { orcidAPI } from '../../lib/api';
import { COLORS } from '../../contexts/ThemeContext';

// ── Animated network canvas (same as register) ──────────────────────────────
function NetworkCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let nodes = [], W = 0, H = 0, raf = 0;
    const resize = () => { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; };
    const init = () => {
      resize();
      nodes = Array.from({ length: 38 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2.5 + 1, pulse: Math.random() * Math.PI * 2,
      }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const t = Date.now() / 1000;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const dx = m.x - n.x, dy = m.y - n.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y);
            ctx.strokeStyle = `rgba(28,167,161,${(1 - dist / 110) * 0.14})`;
            ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
        const glow = 0.5 + 0.5 * Math.sin(t * 1.5 + n.pulse);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + glow * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(28,167,161,${0.3 + glow * 0.4})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    const obs = new ResizeObserver(resize);
    obs.observe(canvas); init(); draw();
    return () => { cancelAnimationFrame(raf); obs.disconnect(); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
}

// ── Token Handler Component ──────────────────────────────────────────────────
function TokenHandler({ setToken, fetchUser, router }) {
  const searchParams = useSearchParams();
  const hasProcessedToken = useRef(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token || hasProcessedToken.current) return;
    hasProcessedToken.current = true;
    setToken(token);
    fetchUser().then((u) => {
      if (u?.is_global_admin)           router.push('/global-admin/dashboard');
      else if (u?.is_institution_admin)  router.push('/institution-admin/dashboard');
      else if (u?.primary_account_type === 'RESEARCHER') router.push('/researcher/dashboard');
      else if (['ADMIN_STAFF','GRANT_MANAGER','FINANCE_OFFICER','ETHICS_COMMITTEE_MEMBER','DATA_STEWARD','DATA_ENGINEER','INSTITUTIONAL_LEADERSHIP','EXTERNAL_REVIEWER','GUEST_COLLABORATOR','EXTERNAL_FUNDER'].includes(u?.primary_account_type)) router.push('/admin-staff/dashboard');
      else                               router.push('/onboarding');
    });
  }, [searchParams, setToken, fetchUser, router]);

  return null;
}

// ── Page ─────────────────────────────────────────────────────────────────────
function LoginPageContent() {
  const router = useRouter();
  const { login, setToken, fetchUser } = useAuth();
  const muiTheme = useMuiTheme();

  const [form, setForm]         = useState({ email: '', password: '' });
  const [error, setError]       = useState('');
  const [isLoading, setLoading] = useState(false);

  const handleChange = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Please enter both email and password'); return; }
    setLoading(true);
    try {
      const u = await login(form.email, form.password);
      if (!u) { 
        setError('Login succeeded but no user data received'); 
        setLoading(false);
        return; 
      }
      console.log('Login successful, redirecting...', u);
      // Use setTimeout to ensure all state updates complete before redirect
      setTimeout(() => {
        if (u.is_global_admin) {
          console.log('Redirecting to global admin dashboard');
          window.location.href = '/global-admin/dashboard';
        } else if (u.is_institution_admin) {
          console.log('Redirecting to institution admin dashboard');
          window.location.href = '/institution-admin/dashboard';
        } else if (u.primary_account_type === 'RESEARCHER') {
          console.log('Redirecting to researcher dashboard');
          window.location.href = '/researcher/dashboard';
        } else if (['ADMIN_STAFF','GRANT_MANAGER','FINANCE_OFFICER','ETHICS_COMMITTEE_MEMBER','DATA_STEWARD','DATA_ENGINEER','INSTITUTIONAL_LEADERSHIP','EXTERNAL_REVIEWER','GUEST_COLLABORATOR','EXTERNAL_FUNDER'].includes(u.primary_account_type)) {
          console.log('Redirecting to admin staff dashboard');
          window.location.href = '/admin-staff/dashboard';
        } else {
          console.log('Redirecting to onboarding');
          window.location.href = '/onboarding';
        }
      }, 100);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.detail || 'Invalid email or password');
      setLoading(false);
    }
  };

  return (
    <>
      <Suspense fallback={null}>
        <TokenHandler setToken={setToken} fetchUser={fetchUser} router={router} />
      </Suspense>
      <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default', overflow: 'hidden' }}>

        {/* ── Left Panel ── */}
        <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          width: '48%',
          flexShrink: 0,
          position: 'relative',
          bgcolor: 'background.paper',
          borderRight: 1,
          borderColor: 'divider',
          flexDirection: 'column',
          justifyContent: 'space-between',
          px: 6,
          py: 4,
          overflow: 'hidden',
        }}
      >
        <NetworkCanvas />

        {/* Main Content */}
        <Box sx={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Typography variant="h2" sx={{ fontWeight: 700, mb: 2, lineHeight: 1.2, fontSize: { xs: '2rem', lg: '2.5rem' } }}>
            Welcome Back to DACORIS
          </Typography>
          <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 600, mb: 4, fontSize: { xs: '1.25rem', lg: '1.5rem' } }}>
            Your Institution's Research Intelligence Hub
          </Typography>
          <Typography sx={{ fontSize: '1.125rem', color: 'text.secondary', lineHeight: 1.8, mb: 5 }}>
            DACORIS brings together your entire research lifecycle — from funding opportunities and grant management through to data stewardship, research outputs, and institutional reporting — in one unified, secure platform.
          </Typography>

          {/* Feature Highlights */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Science sx={{ fontSize: 28, color: 'primary.main', mt: 0.5 }} />
              <Typography sx={{ fontSize: '1rem', color: 'text.secondary', lineHeight: 1.7 }}>
                Manage grants, projects, ethics workflows & researcher profiles
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <BarChart sx={{ fontSize: 28, color: 'primary.main', mt: 0.5 }} />
              <Typography sx={{ fontSize: '1rem', color: 'text.secondary', lineHeight: 1.7 }}>
                Access real-time dashboards, financial tracking & compliance tools
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <LinkIcon sx={{ fontSize: 28, color: 'primary.main', mt: 0.5 }} />
              <Typography sx={{ fontSize: '1rem', color: 'text.secondary', lineHeight: 1.7 }}>
                Integrated with ORCID, Web of Science, HR & Finance systems
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── Right Panel — Form ── */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
          px: 3,
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 400 }}>

          {/* Mobile logo */}
          <Box sx={{ display: { xs: 'flex', lg: 'none' }, alignItems: 'center', gap: 1.5, mb: 4 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: '#fff' }}>
              DC
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: 14, letterSpacing: 2, color: 'text.primary' }}>DACORIS</Typography>
          </Box>

          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            Sign In to Your Workspace
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', mb: 4 }}>
            Access your research management dashboard
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Email */}
            <Box>
              <Typography variant="overline" sx={{ mb: 1, display: 'block', color: 'text.secondary' }}>
                Email address
              </Typography>
              <TextField
                fullWidth
                type="email"
                placeholder="you@institution.ac.ke"
                required
                autoComplete="email"
                value={form.email}
                onChange={handleChange('email')}
              />
            </Box>

            {/* Password */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                  Password
                </Typography>
                <MuiLink href="#" sx={{ fontSize: '0.75rem', color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                  Forgot password?
                </MuiLink>
              </Box>
              <TextField
                fullWidth
                type="password"
                placeholder="Your password"
                required
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange('password')}
              />
            </Box>

            {/* Submit */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              disabled={isLoading}
              sx={{ mt: 0.5, py: 1.5 }}
            >
              {isLoading
                ? <CircularProgress size={18} sx={{ color: 'inherit' }} />
                : <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    Sign In <ArrowForward sx={{ fontSize: 16 }} />
                  </Box>
              }
            </Button>

            {/* Divider */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flex: 1, height: 1, bgcolor: 'divider' }} />
              <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>or</Typography>
              <Box sx={{ flex: 1, height: 1, bgcolor: 'divider' }} />
            </Box>

            {/* ORCID */}
            <Button
              type="button"
              fullWidth
              variant="outlined"
              onClick={() => orcidAPI.initiateLogin()}
              sx={{ py: 1.5 }}
            >
              <Chip
                label="iD"
                size="small"
                sx={{ fontFamily: 'monospace', fontSize: '0.625rem', mr: 1, height: 20, letterSpacing: 1 }}
              />
              Continue with ORCID
            </Button>

            {/* SSO Note */}
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', textAlign: 'center', lineHeight: 1.6, fontStyle: 'italic' }}>
              Using institutional credentials? Sign in with your organization's SSO
            </Typography>

            {/* Bottom CTA */}
            <Box sx={{ textAlign: 'center', mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
              <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                Don't have an account?{' '}
                <MuiLink component={Link} href="/register" sx={{ color: 'primary.main', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                  Register your institution →
                </MuiLink>
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
    </>
  );
}

export default function LoginPage() {
  return <LoginPageContent />;
}
