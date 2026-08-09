'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Link as MuiLink,
} from '@mui/material';
import {
  ArrowForward, ArrowBack,
  School, LocalHospital, Public, AccountBalance,
  CheckCircle, Shield,
} from '@mui/icons-material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { useLanguage } from '@/contexts/LanguageContext';
import TierSelector from '@/components/registration/TierSelector';
import AdminStaffRegistration from '@/components/registration/AdminStaffRegistration';
import ResearcherRegistration from '@/components/registration/ResearcherRegistration';
import RegistrationSuccess from '@/components/registration/RegistrationSuccess';

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
            ctx.strokeStyle = `rgba(24,165,157,${(1 - dist / 120) * 0.35})`;
            ctx.lineWidth = 0.6; ctx.stroke();
          }
        }
        const glow = 0.5 + 0.5 * Math.sin(t * 1.5 + n.pulse);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + glow * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(24,165,157,${0.5 + glow * 0.5})`;
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

export default function RegisterPage() {
  const router = useRouter();
  const muiTheme = useMuiTheme();
  const isDark = muiTheme.palette.mode === 'dark';
  const { t, dir } = useLanguage();

  useEffect(() => {
    try {
      const invitation = new URLSearchParams(window.location.search).get('invitation');
      if (invitation) {
        sessionStorage.setItem('proposalInvitationToken', invitation);
      }
    } catch (_) { /* ignore */ }
  }, []);

  const [activeStep, setActiveStep] = useState(0);
  const [tier, setTier] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    first_name: '',
    given_name: '',
    affiliation: '',
    email: '',
    institution: '',
    institution_types: [],
    role: '',
    department: '',
    job_title: '',
    phone: '',
    password: '',
    confirm_password: '',
    orcid_id: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [registrationComplete, setRegistrationComplete] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orcidId = urlParams.get('orcid_id');
    const firstName = urlParams.get('first_name');
    const givenName = urlParams.get('given_name');
    const affiliation = urlParams.get('affiliation');
    const orcidToken = urlParams.get('orcid_token');

    if (orcidId) {
      console.log('ORCID callback detected:', { orcidId, firstName, givenName, affiliation });
      setTier('researcher');
      setFormData(prev => ({
        ...prev,
        orcid_id: orcidId,
        first_name: firstName || '',
        given_name: givenName || '',
        affiliation: affiliation || '',
      }));
      setActiveStep(1);
      sessionStorage.removeItem('orcid_registration_flow');
      window.history.replaceState({}, '', '/register');
    }
  }, []);

  const getSteps = () => {
    if (tier === 'admin_staff') return [t('register.stepSelectType'), t('register.stepAccountDetails')];
    if (tier === 'researcher') return [t('register.stepSelectType'), t('register.stepOrcidDetails'), t('register.stepInstitutionEmail'), t('register.stepPassword')];
    return [t('register.stepSelectType')];
  };

  const validateStep = () => {
    const newErrors = {};
    if (activeStep === 0 && !tier) newErrors.tier = t('register.errorSelectTier');

    if (tier === 'researcher' && activeStep === 1) {
      if (!formData.first_name?.trim()) newErrors.first_name = t('register.errorFirstNameRequired');
      if (!formData.given_name?.trim()) newErrors.given_name = t('register.errorGivenNameRequired');
    }

    if (tier === 'researcher' && activeStep === 2) {
      if (!formData.email?.trim()) newErrors.email = t('register.errorEmailRequired');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = t('register.errorEmailInvalid');
      if (!formData.institution) newErrors.institution = t('register.errorInstitutionRequired');
      if (!formData.department?.trim()) newErrors.department = t('register.errorDepartmentRequired');
    }

    const isPasswordStep = (tier === 'researcher' && activeStep === 3) ||
                           (tier === 'admin_staff' && activeStep === 1);

    if (isPasswordStep) {
      if (tier === 'admin_staff') {
        if (!formData.name?.trim()) newErrors.name = t('register.errorNameRequired');
        if (!formData.email?.trim()) newErrors.email = t('register.errorEmailRequired');
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = t('register.errorEmailInvalid');
        if (!formData.role?.trim()) newErrors.role = t('register.errorRoleRequired');
        if (!formData.department?.trim()) newErrors.department = t('register.errorDepartmentRequired');
      }
      if (!formData.password) newErrors.password = t('register.errorPasswordRequired');
      else if (formData.password.length < 8) newErrors.password = t('register.errorPasswordTooShort');
      if (formData.password !== formData.confirm_password) newErrors.confirm_password = t('register.errorPasswordsNoMatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep()) return;
    const isLastStep = (tier === 'admin_staff' && activeStep === 1) ||
                       (tier === 'researcher' && activeStep === 3);
    if (isLastStep) await handleSubmit();
    else setActiveStep(prev => prev + 1);
  };

  const handleBack = () => setActiveStep(prev => prev - 1);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const endpoint = tier === 'admin_staff'
        ? '/registration/admin-staff'
        : '/registration/researcher/orcid';
      const payload = {
        email: formData.email,
        password: formData.password,
        confirm_password: formData.confirm_password,
        role: formData.role || null,
        department: formData.department || null,
        phone: formData.phone || null,
        ...(tier === 'admin_staff' && { name: formData.name, job_title: formData.job_title || null }),
        ...(tier === 'researcher' && {
          first_name: formData.first_name,
          given_name: formData.given_name,
          affiliation: formData.affiliation || null,
          institution: formData.institution,
          orcid_id: formData.orcid_id,
          department: formData.department || null,
        }),
      };
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (response.ok) setRegistrationComplete(true);
      else setError(data.detail || data.message || t('register.errorRegistrationFailed'));
    } catch (err) {
      setError(t('register.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    if (activeStep === 0) return <TierSelector selectedTier={tier} onSelect={setTier} />;
    if (tier === 'admin_staff' && activeStep === 1) return <AdminStaffRegistration formData={formData} onChange={setFormData} errors={errors} />;
    if (tier === 'researcher' && activeStep === 1) return <ResearcherRegistration formData={formData} onChange={setFormData} errors={errors} method="orcid" step={1} />;
    if (tier === 'researcher' && activeStep === 2) return <ResearcherRegistration formData={formData} onChange={setFormData} errors={errors} method="orcid" step={2} />;
    if (tier === 'researcher' && activeStep === 3) return <ResearcherRegistration formData={formData} onChange={setFormData} errors={errors} method="orcid" step={3} />;
    return null;
  };

  if (registrationComplete) return <RegistrationSuccess tier={tier} />;

  const steps = getSteps();
  const isLastStep = (tier === 'admin_staff' && activeStep === 1) || (tier === 'researcher' && activeStep === 3);

  const orgTypes = [
    { icon: <School sx={{ fontSize: 18 }} />, label: t('register.orgType1Label'), desc: t('register.orgType1Desc') },
    { icon: <LocalHospital sx={{ fontSize: 18 }} />, label: t('register.orgType2Label'), desc: t('register.orgType2Desc') },
    { icon: <Public sx={{ fontSize: 18 }} />, label: t('register.orgType3Label'), desc: t('register.orgType3Desc') },
    { icon: <AccountBalance sx={{ fontSize: 18 }} />, label: t('register.orgType4Label'), desc: t('register.orgType4Desc') },
  ];

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default', overflow: 'hidden' }}>

      {/* ── Left Panel ─────────────────────────────────────────────────────── */}
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          width: '42%',
          flexShrink: 0,
          position: 'relative',
          background: '#0b3c5d',
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
              {t('register.badge')}
            </Typography>
          </Box>

          <Typography
            sx={{
              fontWeight: 800, mb: 1.25, lineHeight: 1.15, color: '#fff',
              fontSize: { lg: '1.75rem', xl: '2rem' },
              letterSpacing: '-0.03em',
            }}
          >
            {t('register.heroTitle')}
          </Typography>

          <Typography sx={{ fontSize: '0.9375rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, mb: 2.5, maxWidth: 360 }}>
            {t('register.heroSubtitle')}
          </Typography>

          {/* Org type cards */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {orgTypes.map((o, i) => (
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
                  {o.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff', lineHeight: 1.4 }}>
                    {o.label}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                    {o.desc}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

      </Box>

      {/* ── Right Panel ─────────────────────────────────────────────────────── */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          py: 5,
          px: 3,
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 680 }}>

          {/* Desktop logo */}
          <Box sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', gap: 1.5, mb: 5 }}>
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
          <Box sx={{ display: { xs: 'flex', lg: 'none' }, alignItems: 'center', gap: 1.5, mb: 4 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: '#fff' }}>
              DC
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: 14, letterSpacing: 2, color: 'text.primary', textTransform: 'uppercase' }}>DACORIS</Typography>
          </Box>

          {/* Heading */}
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 0.75, letterSpacing: '-0.03em', fontSize: { xs: '1.625rem', sm: '1.875rem' } }}>
            {t('register.createAccount')}
          </Typography>
          <Typography sx={{ fontSize: '0.9375rem', color: 'text.secondary', mb: 4, lineHeight: 1.6 }}>
            {t('register.createAccountSubtitle')}
          </Typography>

          {/* Stepper — only show when tier is selected */}
          {tier && (
            <Box sx={{ mb: 3.5 }}>
              <Stepper activeStep={activeStep} alternativeLabel>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel
                      sx={{
                        '& .MuiStepLabel-label': { fontSize: '0.75rem', fontWeight: 600, mt: 0.5 },
                      }}
                    >
                      {label}
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>
          )}

          {/* Form card */}
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '14px',
              bgcolor: 'background.paper',
              p: { xs: 3, sm: 4 },
              mb: 2,
            }}
          >
            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: '10px' }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            {/* Step content */}
            <Box sx={{ mb: 3.5 }}>
              {renderStepContent()}
            </Box>

            {/* Navigation */}
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                disabled={activeStep === 0 || loading}
                onClick={handleBack}
                variant="outlined"
                startIcon={<ArrowBack />}
                sx={{ borderRadius: '10px', px: 2.5, py: 1.25, fontWeight: 600, borderColor: 'divider', minWidth: 100 }}
              >
                {t('register.back')}
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleNext}
                disabled={loading || (activeStep === 0 && !tier)}
                endIcon={loading ? undefined : isLastStep ? undefined : <ArrowForward />}
                sx={{
                  borderRadius: '10px', px: 3, py: 1.25, fontWeight: 700,
                  fontSize: '0.9375rem', flex: 1, maxWidth: 280,
                  boxShadow: '0 4px 14px rgba(13,148,136,0.3)',
                  '&:hover': { boxShadow: '0 6px 20px rgba(13,148,136,0.4)' },
                }}
              >
                {loading ? (
                  <CircularProgress size={20} sx={{ color: 'inherit' }} />
                ) : isLastStep ? t('register.completeRegistration') : t('register.continueButton')}
              </Button>
            </Box>

            {/* Consent note — shown on final step */}
            {isLastStep && (
              <Box
                sx={{
                  display: 'flex', gap: 1.5, alignItems: 'flex-start',
                  mt: 3, p: 1.75, borderRadius: '10px',
                  bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(13,148,136,0.04)',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(13,148,136,0.15)',
                }}
              >
                <Shield sx={{ fontSize: 16, color: 'primary.main', mt: 0.25, flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', lineHeight: 1.6 }}>
                  {t('register.consentNote')}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Bottom CTA */}
          <Box sx={{ textAlign: 'center', pt: 1 }}>
            <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
              {t('register.alreadyHaveAccount')}{' '}
              <MuiLink
                component={Link}
                href="/login"
                sx={{ color: 'primary.main', fontWeight: 700, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                {t('register.signIn')} {dir === 'rtl' ? '←' : '→'}
              </MuiLink>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

