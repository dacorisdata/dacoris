import React, { useState } from 'react';
import {
  Box,
  TextField,
  Typography,
  FormControlLabel,
  Checkbox,
  Alert,
  LinearProgress,
  Grid,
  Link
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { IconButton, InputAdornment } from '@mui/material';

export default function PasswordSetupForm({ formData, onChange, errors }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (!password) return 0;

    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
    if (/\d/.test(password)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 10;

    return Math.min(strength, 100);
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    onChange({ ...formData, password: newPassword });
    setPasswordStrength(calculatePasswordStrength(newPassword));
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 40) return 'error';
    if (passwordStrength < 70) return 'warning';
    return 'success';
  };

  const getPasswordStrengthLabel = () => {
    if (passwordStrength < 40) return 'Weak';
    if (passwordStrength < 70) return 'Medium';
    return 'Strong';
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Password Setup
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Create a secure password for your account. You can use this password to log in directly without ORCID.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password || ''}
            onChange={handlePasswordChange}
            error={!!errors.password}
            helperText={errors.password || 'Minimum 8 characters, include uppercase, lowercase, and numbers'}
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          {formData.password && (
            <Box sx={{ mt: 1 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography variant="caption" color="text.secondary">
                  Password Strength:
                </Typography>
                <Typography variant="caption" color={`${getPasswordStrengthColor()}.main`} fontWeight="bold">
                  {getPasswordStrengthLabel()}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={passwordStrength}
                color={getPasswordStrengthColor()}
                sx={{ height: 6, borderRadius: 3 }}
              />
            </Box>
          )}
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Confirm Password"
            name="confirm_password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirm_password || ''}
            onChange={(e) => onChange({ ...formData, confirm_password: e.target.value })}
            error={!!errors.confirm_password}
            helperText={errors.confirm_password || 'Re-enter your password'}
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Grid>

        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.accept_terms || false}
                onChange={(e) => onChange({ ...formData, accept_terms: e.target.checked })}
                color="primary"
              />
            }
            label={
              <Typography variant="body2">
                I accept the{' '}
                <Link href="/terms" target="_blank" rel="noopener">
                  Terms and Conditions
                </Link>{' '}
                and{' '}
                <Link href="/privacy" target="_blank" rel="noopener">
                  Privacy Policy
                </Link>
              </Typography>
            }
          />
          {errors.accept_terms && (
            <Typography variant="caption" color="error" display="block" sx={{ mt: 0.5 }}>
              {errors.accept_terms}
            </Typography>
          )}
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Security Tips:</strong>
        </Typography>
        <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
          <Typography component="li" variant="body2">
            Use a unique password that you don't use elsewhere
          </Typography>
          <Typography component="li" variant="body2">
            Include a mix of uppercase, lowercase, numbers, and symbols
          </Typography>
          <Typography component="li" variant="body2">
            Avoid common words or personal information
          </Typography>
        </Box>
      </Alert>
    </Box>
  );
}
