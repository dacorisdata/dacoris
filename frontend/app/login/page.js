'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box, Typography, TextField, Button, Link as MuiLink,
  Alert, CircularProgress, InputAdornment, IconButton,
} from '@mui/material';
import {
  ArrowForward, Science, BarChart, Link as LinkIcon,
  Visibility, VisibilityOff, Lock, Email, CheckCircle,
} from '@mui/icons-material';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { orcidAPI } from '../../lib/api';
import { COLORS } from '../../contexts/ThemeContext';
import { getDashboardRoute } from '../../lib/authRouting';

// ── Animated network canvas ──────────────────────────────────────────────────
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
          if (dist < 120) {
            ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y);
            ctx.strokeStyle = `rgba(255,255,255,${(1 - dist / 120) * 0.12})`;
            ctx.lineWidth = 0.6; ctx.stroke();
          }
        }
        const glow = 0.5 + 0.5 * Math.sin(t * 1.5 + n.pulse);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + glow * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.2 + glow * 0.3})`;
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

// ── ORCID Icon SVG ────────────────────────────────────────────────────────────
function OrcidIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      <circle cx="128" cy="128" r="128" fill="#A6CE39" />
      <path d="M86.3 186.2H70.9V79.1h15.4v107.1zM108.9 79.1h41.6c39.6 0 57 28.3 57 53.6 0 27.5-21.5 53.6-56.8 53.6h-41.8V79.1zm15.4 93.3h24.5c34.9 0 42.9-26.5 42.9-39.7C191.7 111.2 178 93 148 93h-23.7v79.4zM88.7 56.8c0 5.5-4.5 9.9-10 9.9s-10-4.4-10-9.9c0-5.5 4.5-9.9 10-9.9s10 4.4 10 9.9z" fill="#fff" />
    </svg>
  );
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
      router.push(getDashboardRoute(u));
    });
  }, [searchParams, setToken, fetchUser, router]);

  return null;
}

// ── Page ─────────────────────────────────────────────────────────────────────
function LoginPageContent() {
  const router = useRouter();
  const { login, setToken, fetchUser } = useAuth();
  const muiTheme = useMuiTheme();
  const isDark = muiTheme.palette.mode === 'dark';

  const [form, setForm]             = useState({ email: '', password: '' });
  const [error, setError]           = useState('');
  const [isLoading, setLoading]     = useState(false);
  const [showPassword, setShowPwd]  = useState(false);

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
      setTimeout(() => {
        window.location.href = getDashboardRoute(u);
      }, 100);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.detail || 'Invalid email or password. Please try again.');
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <Science sx={{ fontSize: 20 }} />,
      title: 'End-to-End Research Lifecycle',
      desc: 'Grants, projects, ethics workflows & researcher profiles in one platform',
    },
    {
      icon: <BarChart sx={{ fontSize: 20 }} />,
      title: 'Real-Time Intelligence',
      desc: 'Live dashboards, financial tracking, compliance monitoring & audit trails',
    },
    {
      icon: <LinkIcon sx={{ fontSize: 20 }} />,
      title: 'Seamless Integrations',
      desc: 'Connected with ORCID, HR systems, finance platforms & external data sources',
    },
  ];

  return (
    <>
      <Suspense fallback={null}>
        <TokenHandler setToken={setToken} fetchUser={fetchUser} router={router} />
      </Suspense>

      <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default', overflow: 'hidden' }}>

        {/* ── Left Panel ─────────────────────────────────────────────────────── */}
        <Box
          sx={{
            display: { xs: 'none', lg: 'flex' },
            width: '46%',
            flexShrink: 0,
            position: 'relative',
            background: isDark
              ? 'linear-gradient(145deg, #0f2027 0%, #134e4a 50%, #0d9488 100%)'
              : 'linear-gradient(145deg, #0f766e 0%, #0d9488 45%, #14b8a6 100%)',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            px: 6,
            py: 3,
            overflow: 'hidden',
          }}
        >
          <NetworkCanvas />

          {/* Top branding */}
          <Box sx={{ position: 'relative', zIndex: 10 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 36, height: 36, borderRadius: '10px',
                  bgcolor: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 13, color: '#fff', letterSpacing: 0.5,
                }}
              >
                DC
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: 15, letterSpacing: 3, color: 'rgba(255,255,255,0.95)', textTransform: 'uppercase' }}>
                DACORIS
              </Typography>
            </Box>
          </Box>

          {/* Main content */}
          <Box sx={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 2 }}>
            <Box
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 1,
                bgcolor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 99, px: 2, py: 0.5, mb: 1.5, width: 'fit-content',
              }}
            >
              <CheckCircle sx={{ fontSize: 13, color: 'rgba(255,255,255,0.9)' }} />
              <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Research Management Platform
              </Typography>
            </Box>

            <Typography
              sx={{
                fontWeight: 800, mb: 1.25, lineHeight: 1.15, color: '#fff',
                fontSize: { lg: '1.75rem', xl: '2rem' },
                letterSpacing: '-0.03em',
              }}
            >
              Welcome Back to Your Research Hub
            </Typography>

            <Typography sx={{ fontSize: '0.9375rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, mb: 2.5, maxWidth: 380 }}>
              Manage your institution's research operations with confidence - from grant applications to final reporting.
            </Typography>

            {/* Feature cards */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {features.map((f, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex', gap: 1.5, alignItems: 'center',
                    bgcolor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '10px', p: 1.5,
                    transition: 'background 0.2s',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
                  }}
                >
                  <Box
                    sx={{
                      width: 32, height: 32, borderRadius: '8px',
                      bgcolor: 'rgba(255,255,255,0.18)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', flexShrink: 0,
                    }}
                  >
                    {f.icon}
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', mb: 0.25, lineHeight: 1.4 }}>
                      {f.title}
                    </Typography>
                    <Typography sx={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
                      {f.desc}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

        </Box>

        {/* ── Right Panel — Form ──────────────────────────────────────────────── */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            py: 6,
            px: 3,
            bgcolor: 'background.default',
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 420 }}>

            {/* Desktop logo (right panel) */}
            <Box sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', gap: 1.5, mb: 6 }}>
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

            {/* Mobile logo */}
            <Box sx={{ display: { xs: 'flex', lg: 'none' }, alignItems: 'center', gap: 1.5, mb: 5 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: '#fff' }}>
                DC
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: 14, letterSpacing: 2, color: 'text.primary', textTransform: 'uppercase' }}>DACORIS</Typography>
            </Box>

            {/* Heading */}
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.03em', fontSize: { xs: '1.75rem', sm: '2rem' } }}>
              Sign in
            </Typography>
            <Typography sx={{ fontSize: '0.9375rem', color: 'text.secondary', mb: 4, lineHeight: 1.6 }}>
              Access your research management workspace
            </Typography>

            {error && (
              <Alert
                severity="error"
                sx={{ mb: 3, borderRadius: '10px' }}
                onClose={() => setError('')}
              >
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

              {/* Email */}
              <Box>
                <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.primary', mb: 0.75 }}>
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

              {/* Password */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                  <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.primary' }}>
                    Password
                  </Typography>
                  <MuiLink
                    href="#"
                    sx={{
                      fontSize: '0.8125rem', fontWeight: 500, color: 'primary.main',
                      textDecoration: 'none',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    Forgot password?
                  </MuiLink>
                </Box>
                <TextField
                  fullWidth
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
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
                          onClick={() => setShowPwd(v => !v)}
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

              {/* Sign in button */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                disabled={isLoading}
                sx={{
                  mt: 1, py: 1.5, borderRadius: '10px',
                  fontSize: '0.9375rem', fontWeight: 700,
                  letterSpacing: '0.01em',
                  boxShadow: '0 4px 14px rgba(13,148,136,0.35)',
                  '&:hover': { boxShadow: '0 6px 20px rgba(13,148,136,0.45)' },
                }}
              >
                {isLoading ? (
                  <CircularProgress size={20} sx={{ color: 'inherit' }} />
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Sign In <ArrowForward sx={{ fontSize: 17 }} />
                  </Box>
                )}
              </Button>

              {/* Divider */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 0.5 }}>
                <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
                <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', fontWeight: 500 }}>or continue with</Typography>
                <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
              </Box>

              {/* ORCID button */}
              <Button
                type="button"
                fullWidth
                variant="outlined"
                onClick={() => orcidAPI.initiateLogin()}
                sx={{
                  py: 1.375, borderRadius: '10px',
                  borderColor: 'divider', fontWeight: 600,
                  fontSize: '0.875rem',
                  gap: 1.25,
                  '&:hover': {
                    borderColor: '#A6CE39',
                    bgcolor: 'rgba(166,206,57,0.06)',
                  },
                }}
              >
                <OrcidIcon size={22} />
                Continue with ORCID
              </Button>

              {/* SSO callout */}
              <Box
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  p: 1.75, borderRadius: '10px',
                  bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(13,148,136,0.05)',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(13,148,136,0.15)',
                }}
              >
                <Box
                  sx={{
                    width: 28, height: 28, borderRadius: '7px', flexShrink: 0,
                    bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(13,148,136,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <LinkIcon sx={{ fontSize: 15, color: 'primary.main' }} />
                </Box>
                <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', lineHeight: 1.5 }}>
                  Using institutional credentials?{' '}
                  <MuiLink href="#" sx={{ color: 'primary.main', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                    Sign in with SSO
                  </MuiLink>
                </Typography>
              </Box>

              {/* Bottom CTA */}
              <Box sx={{ textAlign: 'center', pt: 2.5, mt: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                  Don't have an account?{' '}
                  <MuiLink
                    component={Link}
                    href="/register"
                    sx={{ color: 'primary.main', fontWeight: 700, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                  >
                    Create account →
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
