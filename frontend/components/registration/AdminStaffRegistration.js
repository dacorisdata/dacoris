'use client';

import React from 'react';
import {
  Box,
  TextField,
  Typography,
  Alert,
  FormControl,
  Select,
  MenuItem,
  alpha,
  CircularProgress,
} from '@mui/material';
import { InfoOutlined, CheckCircle, Cancel } from '@mui/icons-material';

const departments = [
  'Research Office',
  'Grant Management',
  'Finance Department',
  'Data Management',
  'Ethics Committee',
  'Administration',
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

export default function AdminStaffRegistration({ formData, onChange, errors }) {
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

  return (
    <Box>
      <Typography 
        variant="h5" 
        fontWeight="600"
        sx={{ 
          fontSize: '1.375rem',
          mb: 4,
          color: 'text.primary'
        }}
      >
        Administrative Staff Registration
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Full Name */}
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
            Full Name *
          </Typography>
          <TextField
            fullWidth
            placeholder="Dr. Jane Doe"
            required
            value={formData.name || ''}
            onChange={handleChange('name')}
            error={!!errors.name}
            helperText={errors.name}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'background.paper',
              },
            }}
          />
        </Box>

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
            placeholder="jane.doe@university.edu"
            required
            value={formData.email || ''}
            onChange={handleChange('email')}
            onBlur={handleEmailBlur}
            error={!!errors.email || (verificationMessage && !emailVerified)}
            helperText={verificationMessage || errors.email || 'Must be a valid institutional email address'}
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

        {/* Department */}
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
            Department
          </Typography>
          <FormControl fullWidth>
            <Select
              value={formData.department || ''}
              onChange={handleChange('department')}
              displayEmpty
              MenuProps={{
                disableScrollLock: true,
                PaperProps: {
                  sx: {
                    maxHeight: 300,
                    mt: 1,
                  },
                },
                anchorOrigin: {
                  vertical: 'bottom',
                  horizontal: 'left',
                },
                transformOrigin: {
                  vertical: 'top',
                  horizontal: 'left',
                },
                disablePortal: false,
              }}
              sx={{
                bgcolor: 'background.paper',
                '& .MuiSelect-select': {
                  fontStyle: !formData.department ? 'italic' : 'normal',
                },
              }}
            >
              <MenuItem value="" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                Select department
              </MenuItem>
              {departments.map((dept) => (
                <MenuItem key={dept} value={dept}>
                  {dept}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

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
