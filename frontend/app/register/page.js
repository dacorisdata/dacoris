'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Link as MuiLink
} from '@mui/material';
import { ArrowForward, ArrowBack, School, LocalHospital, Public, AccountBalance } from '@mui/icons-material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import TierSelector from '@/components/registration/TierSelector';
import ResearcherMethodSelector from '@/components/registration/ResearcherMethodSelector';
import AdminStaffRegistration from '@/components/registration/AdminStaffRegistration';
import ResearcherRegistration from '@/components/registration/ResearcherRegistration';
import RegistrationSuccess from '@/components/registration/RegistrationSuccess';


// Network Canvas Component
function NetworkCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let nodes = [];
    let W = 0, H = 0, raf = 0;

    const resize = () => {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    };

    const init = () => {
      resize();
      nodes = Array.from({ length: 40 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2.5 + 1,
        pulse: Math.random() * Math.PI * 2,
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
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(m.x, m.y);
            ctx.strokeStyle = `rgba(28,167,161,${(1 - dist / 110) * 0.14})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
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

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    init();
    draw();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
      }}
    />
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const theme = useMuiTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [tier, setTier] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    first_name: '',
    given_name: '',
    affiliation: '',
    email: '',
    institution: '',
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
    const isOrcidFlow = sessionStorage.getItem('orcid_registration_flow');

    // Check if we have ORCID callback data
    if (orcidId && isOrcidFlow) {
      // Set tier to researcher and populate ORCID data
      setTier('researcher');
      setFormData(prev => ({
        ...prev,
        orcid_id: orcidId,
        first_name: firstName || '',
        given_name: givenName || '',
        affiliation: affiliation || '',
      }));
      
      // Move to step 1 (ORCID Details) - user can review/edit the data
      setActiveStep(1);
      
      // Clean up session storage and URL
      sessionStorage.removeItem('orcid_registration_flow');
      window.history.replaceState({}, '', '/register');
    }
  }, []);

  const getSteps = () => {
    if (tier === 'admin_staff') {
      return ['Select Type', 'Account Details'];
    } else if (tier === 'researcher') {
      return ['Select Type', 'ORCID Details', 'Institution Email', 'Password'];
    }
    return ['Select Type'];
  };

  const validateStep = () => {
    const newErrors = {};

    // Step 0: Tier selection
    if (activeStep === 0 && !tier) {
      newErrors.tier = 'Please select an account type';
    }

    // Step 1: ORCID Details (researcher only)
    if (tier === 'researcher' && activeStep === 1) {
      if (!formData.first_name?.trim()) {
        newErrors.first_name = 'First name is required';
      }
      if (!formData.given_name?.trim()) {
        newErrors.given_name = 'Given name is required';
      }
    }

    // Step 2: Institution Email (researcher only)
    if (tier === 'researcher' && activeStep === 2) {
      if (!formData.email?.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Invalid email format';
      }
      if (!formData.institution) {
        newErrors.institution = 'Institution is required';
      }
    }

    // Step 3: Password (researcher only) or Step 1: Account Details (admin_staff)
    const isPasswordStep = (tier === 'researcher' && activeStep === 3) || 
                           (tier === 'admin_staff' && activeStep === 1);

    if (isPasswordStep) {
      if (tier === 'admin_staff') {
        if (!formData.name?.trim()) {
          newErrors.name = 'Name is required';
        }
        if (!formData.email?.trim()) {
          newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Invalid email format';
        }
      }
      
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }
      if (formData.password !== formData.confirm_password) {
        newErrors.confirm_password = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep()) {
      return;
    }

    const isLastStep = (tier === 'admin_staff' && activeStep === 1) || 
                       (tier === 'researcher' && activeStep === 3);

    if (isLastStep) {
      await handleSubmit();
    } else {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

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
        department: formData.department || null,
        phone: formData.phone || null,
        ...(tier === 'admin_staff' && { 
          name: formData.name,
          job_title: formData.job_title || null,
        }),
        ...(tier === 'researcher' && { 
          first_name: formData.first_name,
          given_name: formData.given_name,
          affiliation: formData.affiliation || null,
          institution: formData.institution,
          orcid_id: formData.orcid_id,
        }),
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setRegistrationComplete(true);
      } else {
        setError(data.detail || data.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError('An error occurred during registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    if (activeStep === 0) {
      return <TierSelector selectedTier={tier} onSelect={setTier} />;
    }

    if (tier === 'admin_staff' && activeStep === 1) {
      return <AdminStaffRegistration formData={formData} onChange={setFormData} errors={errors} />;
    }

    if (tier === 'researcher' && activeStep === 1) {
      return <ResearcherRegistration formData={formData} onChange={setFormData} errors={errors} method="orcid" step={1} />;
    }

    if (tier === 'researcher' && activeStep === 2) {
      return <ResearcherRegistration formData={formData} onChange={setFormData} errors={errors} method="orcid" step={2} />;
    }

    if (tier === 'researcher' && activeStep === 3) {
      return <ResearcherRegistration formData={formData} onChange={setFormData} errors={errors} method="orcid" step={3} />;
    }

    return null;
  };

  if (registrationComplete) {
    return <RegistrationSuccess tier={tier} />;
  }

  const steps = getSteps();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* Left Panel */}
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          width: '42%',
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
            Join the DACORIS Platform
          </Typography>
          <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 600, mb: 4, fontSize: { xs: '1.25rem', lg: '1.5rem' } }}>
            Built for Research-Intensive Organizations
          </Typography>
          <Typography sx={{ fontSize: '1.125rem', color: 'text.secondary', lineHeight: 1.8, mb: 5 }}>
            Whether you're a university, hospital, NGO, or national institution, DACORIS gives your team the tools to govern research operations, manage grants end-to-end, steward your data responsibly, and report with confidence.
          </Typography>

          {/* Who It's For */}
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2.5, color: 'text.primary', fontSize: '1.125rem' }}>
            Who It's For:
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mb: 4 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <School sx={{ fontSize: 24, color: 'primary.main', mt: 0.25, flexShrink: 0 }} />
              <Box>
                <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: 'text.primary', mb: 0.25, lineHeight: 1.4 }}>
                  Universities & Research Institutes
                </Typography>
                <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', lineHeight: 1.5 }}>
                  CRIS with ethics workflows and output tracking
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <LocalHospital sx={{ fontSize: 24, color: 'primary.main', mt: 0.25, flexShrink: 0 }} />
              <Box>
                <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: 'text.primary', mb: 0.25, lineHeight: 1.4 }}>
                  Hospitals & Clinical Organizations
                </Typography>
                <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', lineHeight: 1.5 }}>
                  IRB/ethics with HIPAA-aligned controls
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Public sx={{ fontSize: 24, color: 'primary.main', mt: 0.25, flexShrink: 0 }} />
              <Box>
                <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: 'text.primary', mb: 0.25, lineHeight: 1.4 }}>
                  NGOs & Development Organizations
                </Typography>
                <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', lineHeight: 1.5 }}>
                  Grant management from proposal to closeout
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <AccountBalance sx={{ fontSize: 24, color: 'primary.main', mt: 0.25, flexShrink: 0 }} />
              <Box>
                <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: 'text.primary', mb: 0.25, lineHeight: 1.4 }}>
                  Government & Statistics Bureaus
                </Typography>
                <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', lineHeight: 1.5 }}>
                  Data integration, pipelines & analytics
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Trust Line */}
          <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', fontStyle: 'italic', lineHeight: 1.7 }}>
            Aligned with FAIR principles, GDPR standards, and internationally recognized research information frameworks.
          </Typography>
        </Box>
      </Box>

      {/* Right Panel - Multi-Step Form */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 3,
          px: 2,
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 800 }}>

          {/* Mobile logo */}
          <Box sx={{ display: { xs: 'flex', lg: 'none' }, alignItems: 'center', gap: 1, mb: 3 }}>
            <Box sx={{ width: 32, height: 32, bgcolor: 'primary.main', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: '#fff' }}>
              DC
            </Box>
            <Typography sx={{ fontWeight: 'bold', fontSize: 14, letterSpacing: 2, color: 'text.primary' }}>
              DACORIS
            </Typography>
          </Box>

          <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
            Create Your Account
          </Typography>

          <Paper elevation={3} sx={{ p: 4, mb: 3 }}>
            {/* Stepper */}
            {tier && (
              <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            )}

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Step Content */}
            <Box sx={{ mb: 4 }}>
              {renderStepContent()}
            </Box>

            {/* Navigation Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
              <Button
                disabled={activeStep === 0 || loading}
                onClick={handleBack}
                variant="outlined"
                startIcon={<ArrowBack />}
              >
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={loading || (activeStep === 0 && !tier)}
                endIcon={loading ? <CircularProgress size={20} /> : <ArrowForward />}
              >
                {loading 
                  ? 'Submitting...' 
                  : ((tier === 'admin_staff' && activeStep === 1) || (tier === 'researcher' && activeStep === 3))
                    ? 'Complete Registration' 
                    : 'Next'}
              </Button>
            </Box>

            {/* Consent Note */}
            {((tier === 'admin_staff' && activeStep === 1) || (tier === 'researcher' && activeStep === 3)) && (
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.7, fontStyle: 'italic', p: 2, bgcolor: 'action.hover', borderRadius: 1, border: 1, borderColor: 'divider', mt: 3 }}>
                By registering, you agree to DACORIS's data processing terms. Your institutional data is stored securely with role-based access controls and full audit logging.
              </Typography>
            )}
          </Paper>

          {/* Bottom CTA */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
              Already have an account?{' '}
              <MuiLink component={Link} href="/login" sx={{ color: 'primary.main', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                Sign in →
              </MuiLink>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
