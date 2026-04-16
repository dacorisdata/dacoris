'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Autocomplete,
  TextField
} from '@mui/material';
import Image from 'next/image';
import { onboardingAPI } from '../../lib/api';
import useAuthStore from '../../store/authStore';

// Token Handler Component
function TokenHandler({ setToken, fetchUser, router, loadInstitutions }) {
  const searchParams = useSearchParams();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    
    const initOnboarding = async () => {
      // Get token from URL or localStorage
      const urlToken = searchParams.get('token');
      if (urlToken) {
        setToken(urlToken);
      }
      
      // Check if user is already authenticated and needs onboarding
      const user = await fetchUser();
      console.log('Onboarding: User fetched', user);
      if (user) {
        // If user already has an institution, redirect to dashboard
        if (user.primary_institution_id) {
          console.log('Onboarding: User has institution, redirecting to dashboard');
          router.push('/dashboard');
          return;
        }
        // User needs to select institution
        console.log('Onboarding: User needs to select institution');
        loadInstitutions();
      } else if (!urlToken) {
        // No token and no user, redirect to login
        console.log('Onboarding: No user and no token, redirecting to login');
        router.push('/login');
      } else {
        // Has URL token but fetch failed, try loading institutions anyway
        console.log('Onboarding: Has token but fetch failed, loading institutions');
        loadInstitutions();
      }
    };
    
    initOnboarding();
  }, [searchParams, setToken, fetchUser, router, loadInstitutions]);

  return null;
}

function OnboardingPageContent() {
  const router = useRouter();
  const { setToken, fetchUser } = useAuthStore();
  
  const [activeStep, setActiveStep] = useState(0);
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const steps = ['Select Institution', 'Confirmation'];

  const loadInstitutions = async () => {
    try {
      const response = await onboardingAPI.getInstitutions();
      setInstitutions(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load institutions');
      setLoading(false);
    }
  };

  const handleSelectInstitution = async () => {
    if (!selectedInstitution) {
      setError('Please select an institution');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await onboardingAPI.selectInstitution(selectedInstitution.id);
      
      if (response.data.requires_approval) {
        setSuccess('Institution selected! Your account is pending approval from your institution admin.');
        setActiveStep(1);
      } else {
        setSuccess('Institution selected! Your account is now active.');
        setActiveStep(1);
        
        // Fetch user data and redirect to dashboard
        await fetchUser();
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      }
      
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to select institution');
      setLoading(false);
    }
  };

  if (loading && institutions.length === 0) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <>
      <Suspense fallback={null}>
        <TokenHandler 
          setToken={setToken} 
          fetchUser={fetchUser} 
          router={router} 
          loadInstitutions={loadInstitutions}
        />
      </Suspense>
      <Container maxWidth="md">
        <Box sx={{ minHeight: '80vh', py: 4 }}>
        <Paper elevation={0} sx={{ p: 4, bgcolor: 'background.paper' }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Image 
              src="/logo.png" 
              alt="DACORIS Logo" 
              width={200} 
              height={50}
              style={{ marginBottom: '16px' }}
            />
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
              Welcome to DACORIS
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Complete your profile setup
            </Typography>
          </Box>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          {activeStep === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                Select Your Institution
              </Typography>
              
              <Autocomplete
                fullWidth
                options={institutions}
                getOptionLabel={(option) => `${option.name} (${option.domain})`}
                value={selectedInstitution}
                onChange={(event, newValue) => {
                  setSelectedInstitution(newValue);
                  setError('');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search Institution"
                    placeholder="Type to search..."
                    variant="outlined"
                  />
                )}
                noOptionsText="No institutions found"
                sx={{ mb: 3 }}
              />

              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Search and select the institution you are affiliated with. If your email domain matches the institution's domain, 
                your account will be activated immediately. Otherwise, it will require approval from your institution admin.
              </Typography>

              <Button
                variant="contained"
                color="primary"
                size="large"
                fullWidth
                onClick={handleSelectInstitution}
                disabled={loading || !selectedInstitution}
              >
                {loading ? <CircularProgress size={24} /> : 'Continue'}
              </Button>
            </Box>
          )}

          {activeStep === 1 && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Setup Complete!
              </Typography>
              
              {success.includes('pending') ? (
                <>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Your account is pending approval. You will receive a notification once your institution admin 
                    approves your access.
                  </Typography>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => router.push('/login')}
                  >
                    Return to Login
                  </Button>
                </>
              ) : (
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Redirecting to dashboard...
                </Typography>
              )}
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
    </>
  );
}

export default function OnboardingPage() {
  return <OnboardingPageContent />;
}
