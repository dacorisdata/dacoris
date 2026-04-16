import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  Alert,
  MenuItem,
  CircularProgress,
  Grid
} from '@mui/material';

export default function AccountDetailsForm({ 
  formData, 
  onChange, 
  errors, 
  institutionDomain,
  orcidData 
}) {
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [emailValidation, setEmailValidation] = useState({ valid: null, message: '' });
  const [validatingEmail, setValidatingEmail] = useState(false);

  useEffect(() => {
    if (institutionDomain) {
      fetchDepartments();
    }
  }, [institutionDomain]);

  useEffect(() => {
    if (orcidData) {
      onChange({
        ...formData,
        name: orcidData.name || formData.name
      });
    }
  }, [orcidData]);

  const fetchDepartments = async () => {
    setLoadingDepartments(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/registration/departments/${institutionDomain}`
      );
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments || []);
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    } finally {
      setLoadingDepartments(false);
    }
  };

  const validateEmail = async (email) => {
    if (!email || !institutionDomain) return;

    setValidatingEmail(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/registration/validate-email`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, institution_domain: institutionDomain })
        }
      );

      const data = await response.json();
      
      if (response.ok) {
        setEmailValidation({ valid: true, message: `Valid email for ${data.institution_name}` });
      } else {
        setEmailValidation({ valid: false, message: data.detail || 'Invalid email' });
      }
    } catch (err) {
      setEmailValidation({ valid: false, message: 'Failed to validate email' });
    } finally {
      setValidatingEmail(false);
    }
  };

  const handleEmailBlur = () => {
    if (formData.email) {
      validateEmail(formData.email);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Account Details
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Please provide your account information. Fields marked with * are required.
      </Typography>

      {orcidData && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Some fields have been pre-filled from your ORCID profile. You can edit them if needed.
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Full Name"
            name="name"
            value={formData.name || ''}
            onChange={(e) => onChange({ ...formData, name: e.target.value })}
            error={!!errors.name}
            helperText={errors.name}
            required
            disabled={!!orcidData}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Institutional Email"
            name="email"
            type="email"
            value={formData.email || ''}
            onChange={(e) => onChange({ ...formData, email: e.target.value })}
            onBlur={handleEmailBlur}
            error={!!errors.email || emailValidation.valid === false}
            helperText={
              errors.email || 
              emailValidation.message || 
              'Must be your institutional email address'
            }
            required
            InputProps={{
              endAdornment: validatingEmail && <CircularProgress size={20} />
            }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            select
            label="Department/Faculty"
            name="department"
            value={formData.department || ''}
            onChange={(e) => onChange({ ...formData, department: e.target.value })}
            error={!!errors.department}
            helperText={errors.department || 'Select your department or faculty'}
            disabled={loadingDepartments}
          >
            {departments.map((dept) => (
              <MenuItem key={dept} value={dept}>
                {dept}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Job Title"
            name="job_title"
            value={formData.job_title || ''}
            onChange={(e) => onChange({ ...formData, job_title: e.target.value })}
            error={!!errors.job_title}
            helperText={errors.job_title || 'e.g., Research Fellow, Lecturer, etc.'}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Phone Number"
            name="phone"
            type="tel"
            value={formData.phone || ''}
            onChange={(e) => onChange({ ...formData, phone: e.target.value })}
            error={!!errors.phone}
            helperText={errors.phone || 'Optional'}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Expertise Keywords"
            name="expertise_keywords"
            value={formData.expertise_keywords || ''}
            onChange={(e) => onChange({ ...formData, expertise_keywords: e.target.value })}
            error={!!errors.expertise_keywords}
            helperText={
              errors.expertise_keywords || 
              'Comma-separated keywords (e.g., Climate Change, Data Science, Public Health)'
            }
            multiline
            rows={2}
          />
        </Grid>
      </Grid>

      {emailValidation.valid === true && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Email validated successfully!
        </Alert>
      )}
    </Box>
  );
}
