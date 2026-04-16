import React, { useState, useEffect } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Paper,
  Container,
  Alert,
  CircularProgress
} from '@mui/material';
import { useRouter } from 'next/router';
import AccountTypeSelector from './AccountTypeSelector';
import OrcidSearchStep from './OrcidSearchStep';
import AccountDetailsForm from './AccountDetailsForm';
import PasswordSetupForm from './PasswordSetupForm';

const steps = ['Account Type', 'ORCID (if required)', 'Account Details', 'Password'];

export default function RegistrationStepper({ institutionDomain }) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    account_type: '',
    orcid_id: null,
    name: '',
    email: '',
    institution_domain: institutionDomain,
    department: '',
    job_title: '',
    phone: '',
    expertise_keywords: '',
    password: '',
    confirm_password: '',
    accept_terms: false
  });
  const [orcidData, setOrcidData] = useState(null);
  const [requiresOrcid, setRequiresOrcid] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    // Check if returning from ORCID OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const orcidCode = urlParams.get('code');
    const isOrcidFlow = sessionStorage.getItem('orcid_registration_flow');

    if (orcidCode && isOrcidFlow) {
      handleOrcidCallback(orcidCode);
      sessionStorage.removeItem('orcid_registration_flow');
    }
  }, []);

  const handleOrcidCallback = async (code) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/orcid/callback?code=${code}`);
      const data = await response.json();
      
      if (response.ok) {
        setOrcidData({
          orcid_id: data.orcid_id,
          name: data.name,
          access_token: data.access_token,
          refresh_token: data.refresh_token
        });
        setFormData(prev => ({
          ...prev,
          orcid_id: data.orcid_id,
          name: data.name || prev.name
        }));
        setActiveStep(2); // Move to account details step
      }
    } catch (err) {
      console.error('ORCID callback error:', err);
    }
  };

  const validateStep = async (step) => {
    const newErrors = {};

    switch (step) {
      case 0: // Account Type
        if (!formData.account_type) {
          newErrors.account_type = 'Please select an account type';
          return newErrors;
        }
        
        // Check if ORCID is required
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/registration/validate-step1`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ account_type: formData.account_type })
            }
          );
          const data = await response.json();
          setRequiresOrcid(data.requires_orcid);
        } catch (err) {
          newErrors.account_type = 'Failed to validate account type';
        }
        break;

      case 1: // ORCID (if required)
        if (requiresOrcid && !formData.orcid_id) {
          newErrors.orcid = 'ORCID authentication is required for this account type';
        }
        break;

      case 2: // Account Details
        if (!formData.name?.trim()) {
          newErrors.name = 'Name is required';
        }
        if (!formData.email?.trim()) {
          newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Invalid email format';
        }
        break;

      case 3: // Password
        if (!formData.password) {
          newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        }
        if (formData.password !== formData.confirm_password) {
          newErrors.confirm_password = 'Passwords do not match';
        }
        if (!formData.accept_terms) {
          newErrors.accept_terms = 'You must accept the terms and conditions';
        }
        break;
    }

    setErrors(newErrors);
    return newErrors;
  };

  const handleNext = async () => {
    const validationErrors = await validateStep(activeStep);
    
    if (Object.keys(validationErrors).length === 0) {
      // Skip ORCID step if not required
      if (activeStep === 0 && !requiresOrcid) {
        setActiveStep(2);
      } else if (activeStep === steps.length - 1) {
        await handleSubmit();
      } else {
        setActiveStep((prevStep) => prevStep + 1);
      }
    }
  };

  const handleBack = () => {
    // Skip ORCID step if not required when going back
    if (activeStep === 2 && !requiresOrcid) {
      setActiveStep(0);
    } else {
      setActiveStep((prevStep) => prevStep - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        account_type: formData.account_type,
        orcid_id: formData.orcid_id,
        name: formData.name,
        email: formData.email,
        institution_domain: formData.institution_domain,
        department: formData.department || null,
        job_title: formData.job_title || null,
        phone: formData.phone || null,
        expertise_keywords: formData.expertise_keywords 
          ? formData.expertise_keywords.split(',').map(k => k.trim()).filter(k => k)
          : null,
        password: formData.password,
        confirm_password: formData.confirm_password,
        accept_terms: formData.accept_terms
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/registration/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      if (response.ok) {
        router.push('/registration/success');
      } else {
        setSubmitError(data.detail || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setSubmitError('An error occurred during registration. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <AccountTypeSelector
            selectedType={formData.account_type}
            onSelect={(type) => setFormData({ ...formData, account_type: type })}
          />
        );
      case 1:
        return (
          <OrcidSearchStep
            onOrcidAuthenticated={setOrcidData}
            orcidData={orcidData}
          />
        );
      case 2:
        return (
          <AccountDetailsForm
            formData={formData}
            onChange={setFormData}
            errors={errors}
            institutionDomain={institutionDomain}
            orcidData={orcidData}
          />
        );
      case 3:
        return (
          <PasswordSetupForm
            formData={formData}
            onChange={setFormData}
            errors={errors}
          />
        );
      default:
        return null;
    }
  };

  const getStepLabels = () => {
    if (!requiresOrcid && activeStep >= 1) {
      return ['Account Type', 'Account Details', 'Password'];
    }
    return steps;
  };

  const getCurrentStepIndex = () => {
    if (!requiresOrcid && activeStep >= 2) {
      return activeStep - 1;
    }
    return activeStep;
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Stepper activeStep={getCurrentStepIndex()} sx={{ mb: 4 }}>
          {getStepLabels().map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {submitError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {submitError}
          </Alert>
        )}

        <Box sx={{ mb: 4 }}>
          {renderStepContent(activeStep)}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            disabled={activeStep === 0 || submitting}
            onClick={handleBack}
            variant="outlined"
          >
            Back
          </Button>
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={submitting || (activeStep === 0 && !formData.account_type)}
            startIcon={submitting && <CircularProgress size={20} />}
          >
            {submitting 
              ? 'Submitting...' 
              : activeStep === steps.length - 1 
                ? 'Complete Registration' 
                : 'Next'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
