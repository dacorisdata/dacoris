'use client';

import React from 'react';
import {
  Box,
  TextField,
  Typography,
  Alert,
  Button,
  FormControl,
  Select,
  MenuItem,
  alpha,
  CircularProgress,
} from '@mui/material';
import { Badge, CheckCircleOutline, InfoOutlined, CheckCircle, Cancel, Close } from '@mui/icons-material';

const institutions = [
  'University of Nairobi',
  'Kenyatta University',
  'KEMRI',
  'Strathmore University',
  'Moi University',
  'Egerton University',
  'Maseno University',
  'Other',
];

function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const PW_COLORS = ['#ef4444', '#f59e0b', '#14b8a6', '#34d399'];

const OrcidIcon = () => (
  <svg width="20" height="20" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
    <path fill="#A6CE39" d="M256 128c0 70.7-57.3 128-128 128S0 198.7 0 128 57.3 0 128 0s128 57.3 128 128z"/>
    <path fill="#FFF" d="M86.3 186.2H70.9V79.1h15.4v107.1zM108.9 79.1h41.6c39.6 0 57 28.3 57 53.6 0 27.5-21.5 53.6-56.8 53.6h-41.8V79.1zm15.4 93.3h24.5c34.9 0 42.9-26.5 42.9-39.7C191.7 111.2 178 93 148 93h-23.7v79.4zM71.3 54.8c0 5.2-4.2 9.4-9.4 9.4s-9.4-4.2-9.4-9.4 4.2-9.4 9.4-9.4 9.4 4.2 9.4 9.4z"/>
  </svg>
);

export default function ResearcherRegistration({ 
  formData, 
  onChange, 
  errors, 
  method,
  onOrcidAuth,
  step = 1 // 1: ORCID details, 2: Institution email, 3: Password
}) {
  const [verifyingEmail, setVerifyingEmail] = React.useState(false);
  const [emailVerified, setEmailVerified] = React.useState(false);
  const [verificationMessage, setVerificationMessage] = React.useState('');
  const pwScore = passwordStrength(formData.password || '');

  const handleChange = (field) => (e) => {
    onChange({ ...formData, [field]: e.target.value });
  };

  const verifyEmailDomain = async (email) => {
    if (!email || !email.includes('@')) {
      setEmailVerified(false);
      setVerificationMessage('');
      onChange({ ...formData, institution: '', institution_id: null });
      return;
    }

    setVerifyingEmail(true);
    setEmailVerified(false);
    setVerificationMessage('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/registration/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.valid) {
        setEmailVerified(true);
        setVerificationMessage(data.message);
        onChange({ 
          ...formData, 
          institution: data.institution_name,
          institution_id: data.institution_id 
        });
      } else {
        setEmailVerified(false);
        setVerificationMessage(data.message);
        onChange({ ...formData, institution: '', institution_id: null });
      }
    } catch (error) {
      console.error('Email verification error:', error);
      setVerificationMessage('Failed to verify email domain. Please try again.');
      onChange({ ...formData, institution: '', institution_id: null });
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleEmailBlur = () => {
    verifyEmailDomain(formData.email);
  };

  const handleOrcidClick = () => {
    sessionStorage.setItem('orcid_registration_flow', 'true');
    const clientId = process.env.NEXT_PUBLIC_ORCID_CLIENT_ID;
    
    if (!clientId) {
      console.error('ORCID Client ID not configured');
      alert('ORCID authentication is not properly configured. Please contact support.');
      return;
    }
    
    // Use the exact redirect URI registered with ORCID
    // This should match the ORCID_REDIRECT_URI in backend environment
    const redirectUri = 'http://192.168.100.90/api/auth/orcid/callback';
    const scope = '/authenticate';
    const state = 'registration'; // Tell backend this is a registration flow
    const orcidAuthUrl = `https://orcid.org/oauth/authorize?client_id=${clientId}&response_type=code&scope=${scope}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    window.location.href = orcidAuthUrl;
  };

  // Step 1: ORCID Details
  if (step === 1) {
    return (
      <Box>
        <Typography 
          variant="h5" 
          fontWeight="600"
          sx={{ 
            fontSize: '1.25rem',
            mb: 0.5,
            color: 'text.primary'
          }}
        >
          ORCID Details
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            mb: 3,
            fontSize: '0.875rem',
            lineHeight: 1.5
          }}
        >
          Enter your ORCID information to create your researcher account.
        </Typography>

        {method === 'orcid' && !formData.orcid_id && (
          <Box sx={{ mb: 3 }}>
            <Alert 
              severity="info" 
              icon={<InfoOutlined />}
              sx={{ 
                mb: 2,
                py: 1,
                bgcolor: alpha('#0288d1', 0.08),
                border: 1,
                borderColor: alpha('#0288d1', 0.2),
                '& .MuiAlert-icon': {
                  color: '#0288d1',
                },
              }}
            >
              <Typography variant="body2" sx={{ fontSize: '0.8125rem', lineHeight: 1.5 }}>
                <strong>ORCID Authentication:</strong> Authenticate with ORCID to auto-populate your profile.
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.75rem', lineHeight: 1.4, mt: 0.5, fontStyle: 'italic', color: 'text.secondary' }}>
                You can skip and add ORCID details later.
              </Typography>
            </Alert>
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<OrcidIcon />}
                onClick={handleOrcidClick}
                fullWidth
                sx={{ py: 1.25, fontWeight: 600 }}
              >
                Authenticate with ORCID
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                fullWidth
                onClick={() => {
                  // Clear any partial ORCID data and allow user to proceed manually
                  onChange({ ...formData, orcid_id: null });
                }}
                sx={{ py: 1.25, fontWeight: 600 }}
              >
                Skip for now
              </Button>
            </Box>
          </Box>
        )}

        {method === 'orcid' && formData.orcid_id && (
          <Box sx={{ mb: 3 }}>
            <Alert 
              severity="success" 
              icon={<CheckCircleOutline />}
              sx={{ 
                mb: 2,
                py: 1,
                bgcolor: alpha('#2e7d32', 0.08),
                border: 1,
                borderColor: alpha('#2e7d32', 0.2),
                '& .MuiAlert-icon': {
                  color: '#2e7d32',
                },
              }}
            >
              <Typography variant="body2" sx={{ fontSize: '0.8125rem', lineHeight: 1.5 }}>
                <strong>ORCID Authenticated:</strong> {formData.orcid_id}
              </Typography>
            </Alert>
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<Close />}
              onClick={() => {
                onChange({ 
                  ...formData, 
                  orcid_id: null,
                  first_name: '',
                  given_name: '',
                  affiliation: ''
                });
              }}
              sx={{ fontWeight: 600 }}
            >
              Cancel & Re-authenticate
            </Button>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* First Name and Given Name Row */}
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <Box sx={{ flex: 1 }}>
              <Typography 
                variant="caption" 
                sx={{ 
                  mb: 0.75, 
                  display: 'block', 
                  color: 'text.primary',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                First Name *
              </Typography>
              <TextField
                fullWidth
                placeholder="John"
                required
                value={formData.first_name || ''}
                onChange={handleChange('first_name')}
                error={!!errors.first_name}
                helperText={errors.first_name}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'background.paper',
                  },
                }}
              />
            </Box>

            <Box sx={{ flex: 1 }}>
              <Typography 
                variant="caption" 
                sx={{ 
                  mb: 0.75, 
                  display: 'block', 
                  color: 'text.primary',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Given Name (Last Name) *
              </Typography>
              <TextField
                fullWidth
                placeholder="Smith"
                required
                value={formData.given_name || ''}
                onChange={handleChange('given_name')}
                error={!!errors.given_name}
                helperText={errors.given_name}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'background.paper',
                  },
                }}
              />
            </Box>
          </Box>

          {/* Affiliation (Optional) */}
          <Box>
            <Typography 
              variant="caption" 
              sx={{ 
                mb: 0.75, 
                display: 'block', 
                color: 'text.primary',
                fontWeight: 600,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              Affiliation (Optional)
            </Typography>
            <TextField
              fullWidth
              placeholder="University of Nairobi"
              value={formData.affiliation || ''}
              onChange={handleChange('affiliation')}
              helperText="Your primary institutional affiliation from ORCID"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'background.paper',
                },
              }}
            />
          </Box>

          {/* ORCID ID (Read-only) */}
          {formData.orcid_id && (
            <Box>
              <Typography 
                variant="caption" 
                sx={{ 
                  mb: 0.75, 
                  display: 'block', 
                  color: 'text.primary',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                ORCID ID
              </Typography>
              <TextField
                fullWidth
                value={formData.orcid_id || ''}
                disabled
                helperText="Your unique ORCID identifier"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: alpha('#2e7d32', 0.05),
                  },
                  '& .Mui-disabled': {
                    color: 'text.primary',
                    WebkitTextFillColor: 'text.primary',
                  },
                }}
              />
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  // Step 2: Institution Email
  if (step === 2) {
    return (
      <Box>
        <Typography 
          variant="h5" 
          fontWeight="600"
          sx={{ 
            fontSize: '1.375rem',
            mb: 1,
            color: 'text.primary'
          }}
        >
          Institution Email
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            mb: 4,
            fontSize: '0.9375rem',
            lineHeight: 1.6
          }}
        >
          Enter your institutional email address. This must match a verified domain.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Institutional Email */}
          <Box>
            <Typography 
              variant="caption" 
              sx={{ 
                mb: 1, 
                display: 'block', 
                color: 'text.primary',
                fontWeight: 600,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              Institutional Email *
            </Typography>
            <TextField
              fullWidth
              type="email"
              placeholder="john.smith@university.edu"
              required
              value={formData.email || ''}
              onChange={handleChange('email')}
              onBlur={handleEmailBlur}
              error={!!errors.email || (verificationMessage && !emailVerified)}
              helperText={verificationMessage || errors.email || 'Must be a valid institutional email address from a verified domain'}
              InputProps={{
                endAdornment: verifyingEmail ? (
                  <CircularProgress size={20} />
                ) : verificationMessage ? (
                  emailVerified ? (
                    <CheckCircle sx={{ color: '#2e7d32', fontSize: 24 }} />
                  ) : (
                    <Cancel sx={{ color: '#d32f2f', fontSize: 24 }} />
                  )
                ) : null,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'background.paper',
                  ...(emailVerified && verificationMessage && {
                    '& fieldset': {
                      borderColor: '#2e7d32',
                      borderWidth: 2,
                    },
                    '&:hover fieldset': {
                      borderColor: '#2e7d32',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#2e7d32',
                    },
                  }),
                  ...(verificationMessage && !emailVerified && {
                    '& fieldset': {
                      borderColor: '#d32f2f',
                      borderWidth: 2,
                    },
                    '&:hover fieldset': {
                      borderColor: '#d32f2f',
                    },
                  }),
                },
              }}
            />
          </Box>

          {/* Institution (Auto-populated from email verification) */}
          {formData.institution && (
            <Box>
              <Typography 
                variant="caption" 
                sx={{ 
                  mb: 1, 
                  display: 'block', 
                  color: 'text.primary',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Institution *
              </Typography>
              <TextField
                fullWidth
                value={formData.institution || ''}
                disabled
                helperText="Auto-populated based on your email domain"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: alpha('#2e7d32', 0.05),
                  },
                  '& .Mui-disabled': {
                    color: 'text.primary',
                    WebkitTextFillColor: 'text.primary',
                  },
                }}
              />
            </Box>
          )}

        </Box>
      </Box>
    );
  }

  // Step 3: Password
  return (

    <Box>
      <Typography 
        variant="h5" 
        fontWeight="600"
        sx={{ 
          fontSize: '1.375rem',
          mb: 1,
          color: 'text.primary'
        }}
      >
        Set Your Password
      </Typography>
      <Typography 
        variant="body2" 
        color="text.secondary" 
        sx={{ 
          mb: 4,
          fontSize: '0.9375rem',
          lineHeight: 1.6
        }}
      >
        Create a secure password for your account.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Password and Confirm Password Row */}
        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="caption" 
              sx={{ 
                mb: 1, 
                display: 'block', 
                color: 'text.primary',
                fontWeight: 600,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              Password *
            </Typography>
            <TextField
              fullWidth
              type="password"
              placeholder="Min. 8 characters"
              required
              value={formData.password || ''}
              onChange={handleChange('password')}
              error={!!errors.password}
              helperText={errors.password}
              InputProps={{
                endAdornment: formData.password && formData.password.length >= 8 ? (
                  <CheckCircle sx={{ color: '#2e7d32', fontSize: 24 }} />
                ) : formData.password && formData.password.length > 0 ? (
                  <Cancel sx={{ color: '#d32f2f', fontSize: 24 }} />
                ) : null,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'background.paper',
                  ...(formData.password && formData.password.length >= 8 && {
                    '& fieldset': {
                      borderColor: '#2e7d32',
                      borderWidth: 2,
                    },
                    '&:hover fieldset': {
                      borderColor: '#2e7d32',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#2e7d32',
                    },
                  }),
                },
              }}
            />
          </Box>

          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="caption" 
              sx={{ 
                mb: 1, 
                display: 'block', 
                color: 'text.primary',
                fontWeight: 600,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              Confirm Password *
            </Typography>
            <TextField
              fullWidth
              type="password"
              placeholder="Re-enter password"
              required
              value={formData.confirm_password || ''}
              onChange={handleChange('confirm_password')}
              error={!!errors.confirm_password}
              helperText={errors.confirm_password}
              InputProps={{
                endAdornment: formData.confirm_password && formData.password && formData.confirm_password === formData.password ? (
                  <CheckCircle sx={{ color: '#2e7d32', fontSize: 24 }} />
                ) : formData.confirm_password && formData.confirm_password.length > 0 ? (
                  <Cancel sx={{ color: '#d32f2f', fontSize: 24 }} />
                ) : null,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'background.paper',
                  ...(formData.confirm_password && formData.password && formData.confirm_password === formData.password && {
                    '& fieldset': {
                      borderColor: '#2e7d32',
                      borderWidth: 2,
                    },
                    '&:hover fieldset': {
                      borderColor: '#2e7d32',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#2e7d32',
                    },
                  }),
                },
              }}
            />
          </Box>
        </Box>

        {/* Password Strength Indicator */}
        {formData.password && (
          <Box>
            <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
              {[0, 1, 2, 3].map((i) => (
                <Box
                  key={i}
                  sx={{
                    height: 4,
                    flex: 1,
                    borderRadius: 999,
                    transition: 'all 0.3s',
                    bgcolor: i < pwScore ? PW_COLORS[Math.min(pwScore - 1, 3)] : alpha('#000', 0.1),
                  }}
                />
              ))}
            </Box>
            <Typography 
              sx={{ 
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: PW_COLORS[Math.min(pwScore - 1, 3)] || 'text.secondary' 
              }}
            >
              {['Too weak', 'Weak', 'Fair', 'Strong'][pwScore - 1] || 'Enter a password'}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
