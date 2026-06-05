'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, CircularProgress, Alert, Chip, useTheme, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Select, FormControl, InputLabel,
} from '@mui/material';
import { useAuth } from '../../../../contexts/AuthContext';
import { trainingAPI } from '../../../../lib/api';

const ACCENT = '#16a699';

const STATUS_META = {
  submitted: { label: 'Submitted', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  reviewed:  { label: 'Reviewed',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  actioned:  { label: 'Actioned',  color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function AdminNeedsAssessmentPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [reviewing, setReviewing] = useState(null);
  const [reviewForm, setReviewForm] = useState({ status: 'reviewed', admin_notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    await load();
    setLoading(false);
  };

  const load = async () => {
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const res = await trainingAPI.listNeedsAssessments(params);
      setAssessments(res.data || []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load assessments');
    }
  };

  useEffect(() => { if (!loading) load(); }, [statusFilter]);

  const openReview = (a) => {
    setReviewing(a);
    setReviewForm({ status: 'reviewed', admin_notes: a.admin_notes || '' });
  };

  const submitReview = async () => {
    setSaving(true);
    try {
      await trainingAPI.reviewNeedsAssessment(reviewing.id, reviewForm);
      setSuccess('Assessment reviewed');
      setReviewing(null);
      await load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to save review');
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
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: 24, fontWeight: 700 }}>Training Needs Assessments</Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Review staff and researcher training needs submissions</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <FormControl size="small" sx={{ mb: 2, minWidth: 140 }}>
        <InputLabel>Status</InputLabel>
        <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)}>
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="submitted">Submitted</MenuItem>
          <MenuItem value="reviewed">Reviewed</MenuItem>
          <MenuItem value="actioned">Actioned</MenuItem>
        </Select>
      </FormControl>

      {assessments.length === 0 ? (
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 6, textAlign: 'center', border: `1px solid ${theme.palette.divider}` }}>
          <Typography sx={{ color: 'text.secondary' }}>No training needs assessments found.</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {assessments.map(a => {
            const sm = STATUS_META[a.status] || STATUS_META.submitted;
            return (
              <Box key={a.id} sx={{
                bgcolor: 'background.paper', borderRadius: 3, p: 3,
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.05)',
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{a.user_name}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{a.user_email} · {fmtDate(a.created_at)}</Typography>
                  </Box>
                  <Chip label={sm.label} size="small" sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 600 }} />
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
                  <Box>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.disabled', mb: 0.5 }}>CAREER STAGE</Typography>
                    <Typography sx={{ fontSize: 13 }}>{a.career_stage || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.disabled', mb: 0.5 }}>AVAILABLE HOURS/MONTH</Typography>
                    <Typography sx={{ fontSize: 13 }}>{a.available_hours_per_month ?? '—'}</Typography>
                  </Box>
                </Box>
                {(a.desired_skills || []).length > 0 && (
                  <Box sx={{ mb: 1.5 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.disabled', mb: 0.5 }}>DESIRED SKILLS</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {a.desired_skills.map(s => <Chip key={s} label={s} size="small" sx={{ fontSize: 11 }} />)}
                    </Box>
                  </Box>
                )}
                {a.current_challenges && (
                  <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5 }}>{a.current_challenges}</Typography>
                )}
                {a.admin_notes && (
                  <Box sx={{ p: 1.5, bgcolor: `${ACCENT}08`, borderRadius: 2, mb: 1 }}>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}><strong>Admin notes:</strong> {a.admin_notes}</Typography>
                  </Box>
                )}
                {a.status === 'submitted' && (
                  <Button size="small" variant="outlined" onClick={() => openReview(a)}
                    sx={{ borderColor: ACCENT, color: ACCENT }}>
                    Review
                  </Button>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      <Dialog open={!!reviewing} onClose={() => setReviewing(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Review Training Needs — {reviewing?.user_name}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select value={reviewForm.status} label="Status"
              onChange={e => setReviewForm(f => ({ ...f, status: e.target.value }))}>
              <MenuItem value="reviewed">Reviewed</MenuItem>
              <MenuItem value="actioned">Actioned</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Admin Notes" multiline rows={4} value={reviewForm.admin_notes}
            onChange={e => setReviewForm(f => ({ ...f, admin_notes: e.target.value }))} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewing(null)}>Cancel</Button>
          <Button variant="contained" onClick={submitReview} disabled={saving}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#138f82' } }}>
            {saving ? 'Saving…' : 'Save Review'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
