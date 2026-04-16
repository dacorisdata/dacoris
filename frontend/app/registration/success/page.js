'use client';

import React from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Alert,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  CheckCircle,
  Email,
  Schedule,
  Info
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

export default function RegistrationSuccessPage() {
  const router = useRouter();

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <Box sx={{ mb: 3 }}>
          <CheckCircle sx={{ fontSize: 80, color: 'success.main' }} />
        </Box>

        <Typography variant="h4" gutterBottom fontWeight="bold">
          Registration Successful!
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          Thank you for registering with DACORIS. Your account has been created and is pending approval.
        </Typography>

        <Alert severity="info" sx={{ my: 3, textAlign: 'left' }}>
          <Typography variant="body2" fontWeight="bold" gutterBottom>
            What happens next?
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <Email color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Email Confirmation"
                secondary="You will receive a confirmation email shortly"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Schedule color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Admin Review"
                secondary="Your institution administrator will review and approve your account"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Info color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Account Activation"
                secondary="Once approved, you'll receive an email notification and can log in"
              />
            </ListItem>
          </List>
        </Alert>

        <Card sx={{ mb: 3, bgcolor: 'grey.50' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              While You Wait
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Approval typically takes 1-2 business days. In the meantime:
            </Typography>
            <Box component="ul" sx={{ textAlign: 'left', pl: 3 }}>
              <Typography component="li" variant="body2" color="text.secondary">
                Check your email for the confirmation message
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                If you haven't received it, check your spam folder
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                Contact your institution administrator if approval takes longer than expected
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            onClick={() => router.push('/login')}
            size="large"
          >
            Go to Login
          </Button>
          <Button
            variant="outlined"
            onClick={() => router.push('/')}
            size="large"
          >
            Return to Home
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
