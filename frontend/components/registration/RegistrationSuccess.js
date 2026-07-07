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
import { useLanguage } from '../../contexts/LanguageContext';

export default function RegistrationSuccess({ tier }) {
  const { t } = useLanguage();
  const isAdminStaff = tier === 'admin_staff';

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 3 }} />

        <Typography variant="h4" gutterBottom fontWeight="bold">
          {t('registerSuccess.title')}
        </Typography>

        {isAdminStaff ? (
          <>
            <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="body2">
                {t('registerSuccess.adminInfoMessage')}
              </Typography>
            </Alert>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {t('registerSuccess.adminAfterVerification')}
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('registerSuccess.adminCheckEmail')}
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
                {t('registerSuccess.goToLogin')}
              </Button>

              <Button
                component={Link}
                href="/register"
                variant="outlined"
                size="large"
              >
                {t('registerSuccess.registerAnotherAccount')}
              </Button>
            </Box>
          </>
        ) : (
          <>
            <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="body2">
                {t('registerSuccess.researcherInfoMessage')}
              </Typography>
            </Alert>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {t('registerSuccess.researcherAfterVerification')}
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
                {t('registerSuccess.verifyEmailNow')}
              </Button>

              <Button
                component={Link}
                href="/login"
                variant="outlined"
                size="large"
                startIcon={<Login />}
              >
                {t('registerSuccess.goToLogin')}
              </Button>

              <Button
                component={Link}
                href="/register"
                variant="outlined"
                size="large"
              >
                {t('registerSuccess.registerAnother')}
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Container>
  );
}
