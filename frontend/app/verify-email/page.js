'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import { CheckCircle, Email } from '@mui/icons-material';
import Link from 'next/link';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email');
  const codeParam = searchParams.get('code');
  
  const [email, setEmail] = useState(emailParam || '');
  const [code, setCode] = useState(codeParam || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [autoVerifying, setAutoVerifying] = useState(false);

  // Auto-verify if email and code are in URL parameters
  useEffect(() => {
    if (emailParam && codeParam && !autoVerifying && !success && !error) {
      setAutoVerifying(true);
      verifyCode(emailParam, codeParam);
    }
  }, [emailParam, codeParam]);

  const verifyCode = async (emailToVerify, codeToVerify) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/verification/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToVerify, code: codeToVerify }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(data.message || 'Invalid or expired verification code. Please try again.');
      }
    } catch (err) {
      setError('An error occurred during verification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    await verifyCode(email, code);
  };

  const handleResendCode = async () => {
    setResending(true);
    setError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/verification/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setError('');
        alert('A new verification code has been sent to your email.');
      } else {
        setError(data.message || 'Failed to resend verification code. Please try again.');
      }
    } catch (err) {
      setError('An error occurred while resending the code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 3 }} />
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Email Verified!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Your email has been successfully verified. Redirecting you to login...
          </Typography>
          <CircularProgress />
        </Paper>
      </Container>
    );
  }

  if (loading && autoVerifying) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Verifying Your Email...
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Please wait while we verify your email address.
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Email sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Verify Your Email
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {codeParam ? 'Click the button below to verify, or enter your code manually.' : 'Enter the 6-digit verification code sent to your email address.'}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleVerify}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={!!emailParam}
            />

            <TextField
              fullWidth
              label="Verification Code"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              inputProps={{
                maxLength: 6,
                style: { fontSize: '1.5rem', letterSpacing: '0.5rem', textAlign: 'center' }
              }}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading || code.length !== 6}
              fullWidth
            >
              {loading ? <CircularProgress size={24} /> : 'Verify Email'}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Didn't receive the code?
              </Typography>
              <Button
                variant="text"
                onClick={handleResendCode}
                disabled={resending || !email}
                size="small"
              >
                {resending ? 'Sending...' : 'Resend Code'}
              </Button>
            </Box>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Already verified?{' '}
                <Link href="/login" style={{ color: '#1976d2', textDecoration: 'none' }}>
                  Sign in →
                </Link>
              </Typography>
            </Box>
          </Box>
        </form>
      </Paper>
    </Container>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Loading...
          </Typography>
        </Paper>
      </Container>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
