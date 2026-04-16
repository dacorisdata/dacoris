'use client';

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Alert,
} from '@mui/material';
import { CheckCircle, Login } from '@mui/icons-material';
import Link from 'next/link';

export default function RegistrationSuccess({ tier }) {
  const isAdminStaff = tier === 'admin_staff';

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 3 }} />
        
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Registration Successful!
        </Typography>

        {isAdminStaff ? (
          <>
            <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="body2">
                A verification link has been sent to your email. Please verify your email address.
              </Typography>
            </Alert>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              After verification, an administrator will review and approve your account.
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Check your email for updates on your account status.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                component={Link}
                href="/login"
                variant="contained"
                color="primary"
                size="large"
                startIcon={<Login />}
              >
                Go to Login
              </Button>
              
              <Button
                component={Link}
                href="/register"
                variant="outlined"
                size="large"
              >
                Register Another Account
              </Button>
            </Box>
          </>
        ) : (
          <>
            <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="body2">
                A verification link has been sent to your email. Please verify your email address to activate your account.
              </Typography>
            </Alert>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Once verified, you can log in and start using the platform.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                component={Link}
                href="/verify-email"
                variant="contained"
                color="primary"
                size="large"
                startIcon={<CheckCircle />}
              >
                Verify Email Now
              </Button>
              
              <Button
                component={Link}
                href="/login"
                variant="outlined"
                size="large"
                startIcon={<Login />}
              >
                Go to Login
              </Button>

              <Button
                component={Link}
                href="/register"
                variant="outlined"
                size="large"
              >
                Register Another
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Container>
  );
}
