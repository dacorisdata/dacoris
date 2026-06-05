'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, CircularProgress, Alert, useTheme, Button, Chip,
  TextField, MenuItem, Select, FormControl, InputLabel, Autocomplete,
} from '@mui/material';
import { useAuth } from '../../../../contexts/AuthContext';
import { trainingAPI } from '../../../../lib/api';

const ACCENT = '#1ca7a1';

const CAREER_STAGES = [
  'Early Career Researcher', 'Mid-Career Researcher', 'Senior Researcher',
  'Postgraduate Student', 'Postdoctoral Fellow', 'Research Administrator',
  'Supervisor / PI', 'Technical Staff',
];

const FORMAT_OPTIONS = ['Online self-paced', 'Live workshops', 'Hybrid', 'In-person', 'Mentorship', 'Webinars'];

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function NeedsAssessmentPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    career_stage: '',
    research_areas: [],
    desired_skills: [],
    current_challenges: '',
    preferred_formats: [],
    available_hours_per_month: '',
  });

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    try {
      const [needsRes, catalogRes] = await Promise.all([
        trainingAPI.myNeedsAssessment(),
        trainingAPI.skillsCatalog(),
      ]);
      setExisting(needsRes.data);
      setCatalog((catalogRes.data || []).map(c => c.name));
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        available_hours_per_month: form.available_hours_per_month
          ? parseInt(form.available_hours_per_month, 10) : null,
      };
      const res = await trainingAPI.submitNeedsAssessment(payload);
      setExisting(res.data);
      setSuccess('Training needs assessment submitted successfully');
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to submit assessment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 720 }}>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: 24, fontWeight: 700 }}>Training Needs Assessment</Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
          Help your institution plan capacity building programmes tailored to your development needs
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {existing && (
        <Box sx={{ mb: 3, p: 2, bgcolor: `${ACCENT}08`, borderRadius: 2, border: `1px solid ${ACCENT}30` }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>Last submission: {fmtDate(existing.created_at)}</Typography>
          <Chip label={existing.status} size="small" sx={{ textTransform: 'capitalize', fontSize: 11 }} />
          {existing.admin_notes && (
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1 }}>
              <strong>Institution response:</strong> {existing.admin_notes}
            </Typography>
          )}
        </Box>
      )}

      <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 3, border: `1px solid ${theme.palette.divider}`, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <FormControl fullWidth>
          <InputLabel>Career Stage</InputLabel>
          <Select value={form.career_stage} label="Career Stage"
            onChange={e => setForm(f => ({ ...f, career_stage: e.target.value }))}>
            {CAREER_STAGES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>

        <Autocomplete
          multiple freeSolo options={[]}
          value={form.research_areas}
          onChange={(_, val) => setForm(f => ({ ...f, research_areas: val }))}
          renderInput={params => <TextField {...params} label="Research Areas (type and press Enter)" />}
        />

        <Autocomplete
          multiple options={catalog}
          value={form.desired_skills}
          onChange={(_, val) => setForm(f => ({ ...f, desired_skills: val }))}
          renderInput={params => <TextField {...params} label="Desired Skills / Training Topics" />}
        />

        <TextField label="Current Challenges" multiline rows={3}
          placeholder="What barriers do you face in your research development?"
          value={form.current_challenges}
          onChange={e => setForm(f => ({ ...f, current_challenges: e.target.value }))} fullWidth />

        <Autocomplete
          multiple options={FORMAT_OPTIONS}
          value={form.preferred_formats}
          onChange={(_, val) => setForm(f => ({ ...f, preferred_formats: val }))}
          renderInput={params => <TextField {...params} label="Preferred Learning Formats" />}
        />

        <TextField label="Available Hours per Month for Training" type="number"
          value={form.available_hours_per_month}
          onChange={e => setForm(f => ({ ...f, available_hours_per_month: e.target.value }))} fullWidth />

        <Button variant="contained" onClick={handleSubmit} disabled={saving}
          sx={{ alignSelf: 'flex-start', bgcolor: ACCENT, '&:hover': { bgcolor: '#15968f' } }}>
          {saving ? 'Submitting…' : existing ? 'Submit Updated Assessment' : 'Submit Assessment'}
        </Button>
      </Box>
    </Box>
  );
}
