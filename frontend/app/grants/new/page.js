'use client';

import { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Card, 
  CardContent, 
  Grid, 
  MenuItem,
  Divider,
  Paper,
  Alert,
  Stepper,
  Step,
  StepLabel,
  InputAdornment,
  Chip
} from '@mui/material';
import { 
  Save, 
  ArrowBack, 
  Business,
  Description,
  AttachMoney,
  CalendarMonth,
  Public,
  Category as CategoryIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { grantsAPI } from '@/lib/apiModules';

export default function NewOpportunityPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    sponsor: '',
    description: '',
    category: '',
    geography: '',
    applicant_type: '',
    funding_type: '',
    amount_min: '',
    amount_max: '',
    currency: 'KES',
    open_date: '',
    deadline: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (formData.amount_min && formData.amount_max) {
      if (parseFloat(formData.amount_min) > parseFloat(formData.amount_max)) {
        newErrors.amount_max = 'Maximum amount must be greater than minimum';
      }
    }
    
    if (formData.open_date && formData.deadline) {
      if (new Date(formData.open_date) > new Date(formData.deadline)) {
        newErrors.deadline = 'Deadline must be after open date';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSaving(true);
    try {
      const response = await grantsAPI.createOpportunity({
        ...formData,
        amount_min: formData.amount_min ? parseFloat(formData.amount_min) : null,
        amount_max: formData.amount_max ? parseFloat(formData.amount_max) : null,
      });
      router.push(`/grants/${response.data.id}`);
    } catch (error) {
      console.error('Failed to create opportunity:', error);
      setErrors({ submit: 'Failed to create opportunity. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const categories = [
    'Health Technology',
    'Education',
    'Agriculture',
    'Climate & Environment',
    'Infrastructure',
    'Social Development',
    'Research & Innovation',
    'Other'
  ];

  const fundingTypes = [
    'Competitive Grant',
    'Direct Award',
    'Fellowship',
    'Scholarship',
    'Contract',
    'Cooperative Agreement'
  ];

  return (
    <AppShell currentModule="grants">
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.back()}
          sx={{ mb: 3 }}
          variant="text"
        >
          Back to Opportunities
        </Button>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Create Grant Opportunity
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Fill in the details below to create a new grant opportunity for your institution
          </Typography>
        </Box>

        {errors.submit && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errors.submit}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Basic Information Section */}
            <Grid item xs={12}>
              <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <Description color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    Basic Information
                  </Typography>
                </Box>
                
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Opportunity Title"
                      required
                      value={formData.title}
                      onChange={handleChange('title')}
                      error={!!errors.title}
                      helperText={errors.title || 'Enter a clear and descriptive title'}
                      placeholder="e.g., Digital Health Innovation Grant 2026"
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Sponsor Organization"
                      value={formData.sponsor}
                      onChange={handleChange('sponsor')}
                      placeholder="e.g., Kenya National Research Fund"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Business color="action" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      select
                      label="Category"
                      value={formData.category}
                      onChange={handleChange('category')}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CategoryIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                    >
                      {categories.map((cat) => (
                        <MenuItem key={cat} value={cat}>
                          {cat}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Description"
                      multiline
                      rows={4}
                      value={formData.description}
                      onChange={handleChange('description')}
                      placeholder="Provide a detailed description of the grant opportunity, including objectives, eligibility criteria, and expected outcomes..."
                      helperText={`${formData.description.length} characters`}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Funding Details Section */}
            <Grid item xs={12}>
              <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <AttachMoney color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    Funding Details
                  </Typography>
                </Box>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Minimum Amount"
                      type="number"
                      value={formData.amount_min}
                      onChange={handleChange('amount_min')}
                      placeholder="0"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            {formData.currency}
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Maximum Amount"
                      type="number"
                      value={formData.amount_max}
                      onChange={handleChange('amount_max')}
                      error={!!errors.amount_max}
                      helperText={errors.amount_max}
                      placeholder="0"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            {formData.currency}
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      select
                      label="Currency"
                      value={formData.currency}
                      onChange={handleChange('currency')}
                    >
                      <MenuItem value="KES">KES - Kenyan Shilling</MenuItem>
                      <MenuItem value="USD">USD - US Dollar</MenuItem>
                      <MenuItem value="EUR">EUR - Euro</MenuItem>
                      <MenuItem value="GBP">GBP - British Pound</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      select
                      label="Funding Type"
                      value={formData.funding_type}
                      onChange={handleChange('funding_type')}
                    >
                      {fundingTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Timeline & Eligibility Section */}
            <Grid item xs={12}>
              <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <CalendarMonth color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    Timeline & Eligibility
                  </Typography>
                </Box>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Opening Date"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={formData.open_date}
                      onChange={handleChange('open_date')}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Application Deadline"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={formData.deadline}
                      onChange={handleChange('deadline')}
                      error={!!errors.deadline}
                      helperText={errors.deadline}
                      required
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Geographic Focus"
                      value={formData.geography}
                      onChange={handleChange('geography')}
                      placeholder="e.g., Kenya, East Africa, Global"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Public color="action" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Eligible Applicants"
                      value={formData.applicant_type}
                      onChange={handleChange('applicant_type')}
                      placeholder="e.g., Research Institutions, NGOs, Individuals"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12}>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 3, 
                  bgcolor: 'background.default',
                  display: 'flex', 
                  gap: 2, 
                  justifyContent: 'flex-end',
                  position: 'sticky',
                  bottom: 0,
                  zIndex: 10
                }}
              >
                <Button
                  variant="outlined"
                  onClick={() => router.back()}
                  disabled={saving}
                  size="large"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<Save />}
                  disabled={saving}
                  size="large"
                >
                  {saving ? 'Creating...' : 'Create Opportunity'}
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </form>
      </Box>
    </AppShell>
  );
}
