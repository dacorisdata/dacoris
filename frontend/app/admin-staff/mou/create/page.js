'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, TextField, Select, MenuItem,
  FormControl, InputLabel, FormControlLabel, Switch,
  Stepper, Step, StepLabel, Paper, Alert, CircularProgress,
  useTheme, Divider,
} from '@mui/material';
import {
  ArrowBack as BackIcon, ArrowForward as NextIcon,
  Save as SaveIcon, Handshake as MouIcon,
} from '@mui/icons-material';
import api from '../../../../lib/api';

const ACCENT = '#16a699';
const STEPS = ['Basic Info', 'Scope & Obligations', 'Terms & Settings', 'Review'];

const MOU_TYPES = [
  { value: 'GENERAL_COLLABORATION', label: 'General Collaboration Agreement' },
  { value: 'ACADEMIC_EXCHANGE', label: 'Academic Exchange Agreement' },
  { value: 'RESEARCH_PARTNERSHIP', label: 'Research Partnership Agreement' },
  { value: 'DATA_SHARING', label: 'Data-Sharing Agreement' },
  { value: 'JOINT_DEGREE', label: 'Joint Degree / Sandwich Programme' },
  { value: 'CLINICAL', label: 'Clinical / Hospital Collaboration' },
  { value: 'INDUSTRY', label: 'Industry Partnership Agreement' },
  { value: 'CONSORTIUM', label: 'Consortium Agreement' },
  { value: 'CO_FUNDING', label: 'Co-Funding / Joint Grant Agreement' },
];

const RISK_LEVELS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

const CONF_LEVELS = [
  { value: 'PUBLIC', label: 'Public' },
  { value: 'INTERNAL', label: 'Internal' },
  { value: 'RESTRICTED', label: 'Restricted' },
  { value: 'CONFIDENTIAL', label: 'Confidential' },
];

export default function CreateMouPage() {
  const router = useRouter();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    mou_type: 'GENERAL_COLLABORATION',
    thematic_area: '',
    lead_department: '',
    scope_objectives: '',
    obligations_institution: '',
    obligations_partner: '',
    governing_law: '',
    confidentiality_level: 'INTERNAL',
    effective_date: '',
    expiry_date: '',
    duration_years: '',
    auto_renew: false,
    renewal_notice_days: 90,
    financial_commitment: false,
    ip_clauses: false,
    data_sharing: false,
    risk_rating: 'LOW',
  });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const Field = ({ label, name, type = 'text', multiline = false, rows = 3, required = false, children, ...rest }) => (
    <Box sx={{ mb: 2.5 }}>
      {children ? (
        <FormControl fullWidth size="small" {...rest}>
          <InputLabel>{label}{required ? ' *' : ''}</InputLabel>
          {children}
        </FormControl>
      ) : (
        <TextField fullWidth size="small" label={label + (required ? ' *' : '')}
          type={type} multiline={multiline} rows={multiline ? rows : undefined}
          value={form[name]} onChange={e => set(name, e.target.value)}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} {...rest} />
      )}
    </Box>
  );

  const Card = ({ children, title, subtitle }) => (
    <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 3,
      border: `1px solid ${theme.palette.divider}`, mb: 2.5 }}>
      {title && <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary', mb: 0.5 }}>{title}</Typography>}
      {subtitle && <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 2.5 }}>{subtitle}</Typography>}
      {!title && !subtitle && null}
      {(title || subtitle) && <Divider sx={{ mb: 2.5 }} />}
      {children}
    </Box>
  );

  const handleNext = () => {
    if (step === 0 && !form.title.trim()) { setError('Title is required.'); return; }
    setError('');
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    if (!form.title || !form.mou_type) { setError('Title and type are required.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = { ...form };
      if (!payload.effective_date) delete payload.effective_date;
      if (!payload.expiry_date) delete payload.expiry_date;
      if (!payload.duration_years) delete payload.duration_years;
      else payload.duration_years = parseFloat(payload.duration_years);
      if (!payload.risk_rating) delete payload.risk_rating;
      const res = await api.post('/mou/', payload);
      router.push(`/admin-staff/mou/${res.data.id}`);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create MoU. Please try again.');
    }
    setSaving(false);
  };

  const ReviewRow = ({ label, value }) => (
    <Box sx={{ display: 'flex', py: 1.2, borderBottom: `1px solid ${theme.palette.divider}`, '&:last-child': { borderBottom: 'none' } }}>
      <Typography sx={{ fontSize: 12, color: 'text.secondary', width: 180, flexShrink: 0 }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.primary', fontWeight: value ? 500 : 400 }}>
        {value || <span style={{ color: theme.palette.text.disabled }}>Not set</span>}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1100, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => router.push('/admin-staff/mou/list')}
          sx={{ color: 'text.secondary', textTransform: 'none', mr: 1 }}>Back</Button>
        <MouIcon sx={{ color: ACCENT }} />
        <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'text.primary' }}>Create New MoU</Typography>
      </Box>

      {/* Stepper */}
      <Stepper activeStep={step} sx={{ mb: 4 }}>
        {STEPS.map((label, i) => (
          <Step key={label} completed={i < step}>
            <StepLabel StepIconProps={{ sx: { '&.Mui-active': { color: ACCENT }, '&.Mui-completed': { color: ACCENT } } }}>
              <Typography sx={{ fontSize: 12, fontWeight: step === i ? 700 : 500 }}>{label}</Typography>
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Step 0: Basic Info */}
      {step === 0 && (
        <Card title="Basic Information" subtitle="Enter the core identification details for this MoU.">
          <TextField fullWidth size="small" label="Title *" value={form.title}
            onChange={e => set('title', e.target.value)}
            sx={{ mb: 2.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <FormControl fullWidth size="small" sx={{ mb: 2.5 }}>
            <InputLabel>MoU Type *</InputLabel>
            <Select value={form.mou_type} label="MoU Type *" onChange={e => set('mou_type', e.target.value)} sx={{ borderRadius: 2 }}>
              {MOU_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField fullWidth size="small" label="Thematic Area(s)"
            value={form.thematic_area} onChange={e => set('thematic_area', e.target.value)}
            placeholder="e.g. Research, Training, Student Exchange"
            sx={{ mb: 2.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <TextField fullWidth size="small" label="Lead Department"
            value={form.lead_department} onChange={e => set('lead_department', e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        </Card>
      )}

      {/* Step 1: Scope & Obligations */}
      {step === 1 && (
        <Card title="Scope & Obligations" subtitle="Define the objectives and mutual obligations under this MoU.">
          <TextField fullWidth size="small" label="Scope & Objectives" multiline rows={4}
            value={form.scope_objectives} onChange={e => set('scope_objectives', e.target.value)}
            sx={{ mb: 2.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <TextField fullWidth size="small" label="Our Institution's Obligations" multiline rows={3}
            value={form.obligations_institution} onChange={e => set('obligations_institution', e.target.value)}
            sx={{ mb: 2.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <TextField fullWidth size="small" label="Partner's Obligations" multiline rows={3}
            value={form.obligations_partner} onChange={e => set('obligations_partner', e.target.value)}
            sx={{ mb: 2.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <TextField fullWidth size="small" label="Governing Law"
            value={form.governing_law} onChange={e => set('governing_law', e.target.value)}
            placeholder="e.g. Kenya, UK"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        </Card>
      )}

      {/* Step 2: Terms & Settings */}
      {step === 2 && (
        <>
          <Card title="Term & Dates" subtitle="Set the duration and key dates for this MoU.">
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2.5 }}>
              <TextField size="small" label="Effective Date" type="date" value={form.effective_date}
                onChange={e => set('effective_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1, minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              <TextField size="small" label="Expiry Date" type="date" value={form.expiry_date}
                onChange={e => set('expiry_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1, minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              <TextField size="small" label="Duration (years)" type="number" value={form.duration_years}
                onChange={e => set('duration_years', e.target.value)}
                sx={{ flex: 1, minWidth: 140, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <FormControlLabel label="Auto-Renew" control={
                <Switch checked={form.auto_renew} onChange={e => set('auto_renew', e.target.checked)}
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: ACCENT },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: ACCENT } }} />
              } />
              <TextField size="small" label="Renewal Notice (days)" type="number"
                value={form.renewal_notice_days} onChange={e => set('renewal_notice_days', parseInt(e.target.value) || 90)}
                sx={{ width: 170, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            </Box>
          </Card>

          <Card title="Governance" subtitle="Risk, confidentiality, and legal flags.">
            <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ flex: 1, minWidth: 160 }}>
                <InputLabel>Risk Rating</InputLabel>
                <Select value={form.risk_rating} label="Risk Rating" onChange={e => set('risk_rating', e.target.value)} sx={{ borderRadius: 2 }}>
                  {RISK_LEVELS.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ flex: 1, minWidth: 160 }}>
                <InputLabel>Confidentiality</InputLabel>
                <Select value={form.confidentiality_level} label="Confidentiality" onChange={e => set('confidentiality_level', e.target.value)} sx={{ borderRadius: 2 }}>
                  {CONF_LEVELS.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <FormControlLabel label="Financial Commitment" control={
                <Switch checked={form.financial_commitment} onChange={e => set('financial_commitment', e.target.checked)}
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: ACCENT },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: ACCENT } }} />
              } />
              <FormControlLabel label="IP Clauses" control={
                <Switch checked={form.ip_clauses} onChange={e => set('ip_clauses', e.target.checked)}
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: ACCENT },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: ACCENT } }} />
              } />
              <FormControlLabel label="Data Sharing" control={
                <Switch checked={form.data_sharing} onChange={e => set('data_sharing', e.target.checked)}
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: ACCENT },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: ACCENT } }} />
              } />
            </Box>
          </Card>
        </>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <Card title="Review Your MoU" subtitle="Please confirm the details before creating the draft.">
          <ReviewRow label="Title" value={form.title} />
          <ReviewRow label="Type" value={MOU_TYPES.find(t => t.value === form.mou_type)?.label} />
          <ReviewRow label="Thematic Area" value={form.thematic_area} />
          <ReviewRow label="Lead Department" value={form.lead_department} />
          <ReviewRow label="Effective Date" value={form.effective_date} />
          <ReviewRow label="Expiry Date" value={form.expiry_date} />
          <ReviewRow label="Duration" value={form.duration_years ? `${form.duration_years} years` : null} />
          <ReviewRow label="Governing Law" value={form.governing_law} />
          <ReviewRow label="Risk Rating" value={form.risk_rating} />
          <ReviewRow label="Confidentiality" value={form.confidentiality_level} />
          <ReviewRow label="Auto-Renew" value={form.auto_renew ? 'Yes' : 'No'} />
          <ReviewRow label="Financial Commitment" value={form.financial_commitment ? 'Yes' : 'No'} />
          <ReviewRow label="IP Clauses" value={form.ip_clauses ? 'Yes' : 'No'} />
          <ReviewRow label="Data Sharing" value={form.data_sharing ? 'Yes' : 'No'} />
        </Card>
      )}

      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
        <Button startIcon={<BackIcon />} onClick={() => step === 0 ? router.push('/admin-staff/mou/list') : setStep(s => s - 1)}
          sx={{ textTransform: 'none', color: 'text.secondary' }}>
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button variant="contained" endIcon={<NextIcon />} onClick={handleNext}
            sx={{ bgcolor: ACCENT, borderRadius: 2, textTransform: 'none', fontWeight: 600,
              '&:hover': { bgcolor: '#138f82' } }}>
            Next
          </Button>
        ) : (
          <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={handleSubmit} disabled={saving}
            sx={{ bgcolor: ACCENT, borderRadius: 2, textTransform: 'none', fontWeight: 600,
              '&:hover': { bgcolor: '#138f82' } }}>
            {saving ? 'Creating…' : 'Create MoU Draft'}
          </Button>
        )}
      </Box>
    </Box>
  );
}
