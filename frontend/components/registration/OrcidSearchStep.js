import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  Card,
  CardContent,
  Avatar,
  Divider,
  CircularProgress
} from '@mui/material';
import { Search as SearchIcon, CheckCircle } from '@mui/icons-material';

export default function OrcidSearchStep({ onOrcidAuthenticated, orcidData }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleOrcidLogin = () => {
    setLoading(true);
    setError(null);

    // Redirect to ORCID OAuth
    const clientId = process.env.NEXT_PUBLIC_ORCID_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/auth/orcid/callback`;
    const scope = '/authenticate';
    
    const orcidAuthUrl = `https://orcid.org/oauth/authorize?client_id=${clientId}&response_type=code&scope=${scope}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    // Store registration flow state
    sessionStorage.setItem('orcid_registration_flow', 'true');
    
    window.location.href = orcidAuthUrl;
  };

  if (orcidData) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom fontWeight="bold">
          ORCID Authentication
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Your ORCID profile has been successfully authenticated.
        </Typography>

        <Card sx={{ mb: 3, bgcolor: 'success.light', borderColor: 'success.main', border: 1 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56 }}>
                <CheckCircle />
              </Avatar>
              <Box flex={1}>
                <Typography variant="h6" fontWeight="bold">
                  {orcidData.name || 'ORCID User'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ORCID iD: {orcidData.orcid_id}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Alert severity="success">
          ORCID authentication successful! You can proceed to the next step.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        ORCID Authentication Required
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        This account type requires ORCID authentication. ORCID provides a persistent digital identifier that distinguishes you from other researchers and supports automated linkages between you and your professional activities.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            What is ORCID?
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            ORCID (Open Researcher and Contributor ID) is a free, unique, persistent identifier for researchers. It helps distinguish your work from others with similar names and ensures you get credit for all your contributions.
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="h6" gutterBottom>
            Why do we need it?
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            ORCID authentication allows us to:
          </Typography>
          <Box component="ul" sx={{ mt: 1, pl: 2 }}>
            <Typography component="li" variant="body2" color="text.secondary">
              Automatically sync your publications and research outputs
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Link your grants, projects, and datasets to your profile
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Ensure accurate attribution of your research contributions
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Facilitate collaboration and networking
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Box display="flex" flexDirection="column" gap={2}>
        <Button
          variant="contained"
          size="large"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
          onClick={handleOrcidLogin}
          disabled={loading}
          sx={{
            bgcolor: '#A6CE39',
            color: 'white',
            '&:hover': {
              bgcolor: '#8DB82E'
            }
          }}
        >
          {loading ? 'Redirecting to ORCID...' : 'Sign in with ORCID'}
        </Button>

        <Button
          variant="outlined"
          size="large"
          href="https://orcid.org/register"
          target="_blank"
          rel="noopener noreferrer"
        >
          Don't have an ORCID? Create one (free)
        </Button>
      </Box>

      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Note:</strong> You will be redirected to ORCID.org to authenticate. After authentication, you'll return here to complete your registration.
        </Typography>
      </Alert>
    </Box>
  );
}
