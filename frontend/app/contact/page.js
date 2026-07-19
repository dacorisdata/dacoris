'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  useTheme as useMuiTheme,
  TextField,
  MenuItem,
  Button,
  Alert,
  alpha,
} from '@mui/material';
import { Email, Phone, LocationOn, Send as SendIcon } from '@mui/icons-material';
import { COLORS } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

const tl = COLORS.teal;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTACT_EMAIL = 'info@dacoris.com';
const CONTACT_PHONE = '+254 732 436 199';

const VALID_ENQUIRY_TYPES = ['general', 'demo', 'privacy', 'security', 'partnership'];

function getInitialForm(searchParams) {
  const requestedType = searchParams?.get('type');
  const enquiryType = VALID_ENQUIRY_TYPES.includes(requestedType) ? requestedType : 'general';
  return {
    name: '',
    email: '',
    institution: '',
    phone: '',
    enquiryType,
    message: '',
  };
}

export default function ContactUsPage() {
  return (
    <Suspense fallback={null}>
      <ContactUsForm />
    </Suspense>
  );
}

function ContactUsForm() {
  const theme = useMuiTheme();
  const dark = theme.palette.mode === 'dark';
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const contact = t('contactUs');
  const form = contact?.form;
  const sideInfo = contact?.sideInfo;
  const enquiryTypes = Array.isArray(form?.enquiryTypes) ? form.enquiryTypes : [];

  const [values, setValues] = useState(() => getInitialForm(searchParams));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const selectedType = enquiryTypes.find((et) => et.value === values.enquiryType) || enquiryTypes[0];

  const handleChange = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setError('');
    setSuccess(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSuccess(false);

    if (!values.name.trim() || !values.email.trim() || !values.message.trim()) {
      setError(form?.requiredError);
      return;
    }
    if (!EMAIL_RE.test(values.email.trim())) {
      setError(form?.invalidEmailError);
      return;
    }
    setError('');

    const subject = selectedType?.subject || 'DACORIS CRIS Enquiry';
    const bodyLines = [
      `Name: ${values.name}`,
      `Email: ${values.email}`,
      values.institution ? `Institution: ${values.institution}` : null,
      values.phone ? `Telephone: ${values.phone}` : null,
      '',
      values.message,
    ].filter(Boolean);

    const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
    window.location.href = mailto;
    setSuccess(true);
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 1.5,
    },
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
        {/* ───── Title ───── */}
        <Typography
          sx={{
            fontSize: { xs: 26, md: 34 },
            fontWeight: 800,
            color: 'text.primary',
            letterSpacing: '-0.01em',
          }}
        >
          {contact?.title}
        </Typography>

        <Box
          sx={{
            height: 3,
            width: 120,
            bgcolor: tl[600],
            mt: 1.5,
            mb: 2,
            borderRadius: 1,
          }}
        />

        <Typography
          sx={{
            fontSize: { xs: 15, md: 17 },
            fontWeight: 600,
            color: 'text.primary',
            mb: 2,
            lineHeight: 1.5,
            maxWidth: 760,
          }}
        >
          {contact?.intro}
        </Typography>

        <Typography
          sx={{
            fontSize: 14.5,
            lineHeight: 1.85,
            color: 'text.secondary',
            mb: 5,
            maxWidth: 760,
          }}
        >
          {contact?.body}
        </Typography>

        {/* ───── Form + side info ───── */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: { xs: 4, md: 5 },
            alignItems: 'flex-start',
          }}
        >
          {/* Form */}
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              flex: '1 1 62%',
              width: '100%',
              bgcolor: 'background.paper',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2.5,
              p: { xs: 2.5, md: 4 },
              boxShadow: dark ? '0 8px 28px rgba(0,0,0,0.25)' : '0 8px 28px rgba(0,0,0,0.06)',
            }}
          >
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'text.primary', mb: 3 }}>
              {form?.heading}
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2.5 }}>
                <TextField
                  fullWidth
                  required
                  label={form?.nameLabel}
                  placeholder={form?.namePlaceholder}
                  value={values.name}
                  onChange={handleChange('name')}
                  sx={fieldSx}
                />
                <TextField
                  fullWidth
                  required
                  type="email"
                  label={form?.emailLabel}
                  placeholder={form?.emailPlaceholder}
                  value={values.email}
                  onChange={handleChange('email')}
                  sx={fieldSx}
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2.5 }}>
                <TextField
                  fullWidth
                  label={form?.institutionLabel}
                  placeholder={form?.institutionPlaceholder}
                  value={values.institution}
                  onChange={handleChange('institution')}
                  sx={fieldSx}
                />
                <TextField
                  fullWidth
                  label={form?.phoneLabel}
                  placeholder={form?.phonePlaceholder}
                  value={values.phone}
                  onChange={handleChange('phone')}
                  sx={fieldSx}
                />
              </Box>

              <TextField
                fullWidth
                select
                label={form?.enquiryTypeLabel}
                value={values.enquiryType}
                onChange={handleChange('enquiryType')}
                sx={fieldSx}
              >
                {enquiryTypes.map((et) => (
                  <MenuItem key={et.value} value={et.value}>
                    {et.label}
                  </MenuItem>
                ))}
              </TextField>

              {selectedType?.helper && (
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: -1.5, fontStyle: 'italic' }}>
                  {selectedType.helper}
                </Typography>
              )}

              <TextField
                fullWidth
                required
                multiline
                minRows={5}
                label={form?.messageLabel}
                placeholder={form?.messagePlaceholder}
                value={values.message}
                onChange={handleChange('message')}
                sx={fieldSx}
              />

              {error && <Alert severity="error">{error}</Alert>}
              {success && <Alert severity="success">{form?.successMessage}</Alert>}

              <Button
                type="submit"
                variant="contained"
                size="large"
                endIcon={<SendIcon sx={{ fontSize: 18 }} />}
                sx={{
                  alignSelf: 'flex-start',
                  bgcolor: tl[600],
                  fontWeight: 700,
                  px: 4,
                  py: 1.2,
                  borderRadius: 1.5,
                  '&:hover': { bgcolor: tl[700] },
                }}
              >
                {form?.submitButton}
              </Button>

              <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.6 }}>
                {form?.privacyNote}
              </Typography>
            </Box>
          </Box>

          {/* Side info card */}
          <Box
            sx={{
              flex: '1 1 34%',
              width: '100%',
              bgcolor: dark ? alpha(tl[900], 0.25) : alpha(tl[50], 0.7),
              border: `1px solid ${alpha(tl[500], 0.25)}`,
              borderRadius: 2.5,
              p: { xs: 2.5, md: 3 },
              position: { md: 'sticky' },
              top: { md: 24 },
            }}
          >
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary', mb: 2.5 }}>
              {sideInfo?.heading}
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Email sx={{ fontSize: 20, color: tl[600], mt: 0.2 }} />
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>
                    {sideInfo?.emailLabel}
                  </Typography>
                  <Typography
                    component="a"
                    href={`mailto:${CONTACT_EMAIL}`}
                    sx={{ fontSize: 13.5, color: tl[dark ? 400 : 700], textDecoration: 'none' }}
                  >
                    {CONTACT_EMAIL}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Phone sx={{ fontSize: 20, color: tl[600], mt: 0.2 }} />
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>
                    {sideInfo?.phoneLabel}
                  </Typography>
                  <Typography
                    component="a"
                    href={`tel:${CONTACT_PHONE.replace(/\s+/g, '')}`}
                    sx={{ fontSize: 13.5, color: tl[dark ? 400 : 700], textDecoration: 'none' }}
                  >
                    {CONTACT_PHONE}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <LocationOn sx={{ fontSize: 20, color: tl[600], mt: 0.2 }} />
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>
                    {sideInfo?.locationLabel}
                  </Typography>
                  <Typography sx={{ fontSize: 13.5, color: 'text.primary', lineHeight: 1.6 }}>
                    {sideInfo?.locationValue}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
