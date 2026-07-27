'use client';
import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, CircularProgress, Alert, Avatar, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton,
  FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, useTheme,
} from '@mui/material';
import {
  Close as CloseIcon, CheckCircle as CheckIcon,
  PersonAdd as AssignIcon, AddCircle as AddIcon, RemoveCircle as RemoveIcon,
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../lib/api';

const ACCENT = '#16a699';

/**
 * Reusable single-reviewer assignment dialog, shared by the research projects
 * and ethics review admin-staff screens. Calls `${assignUrl}` (POST) to assign
 * and `${reviewersUrl}` (GET) to list available reviewers.
 */
export default function AssignReviewerDialog({
  open, entityTitle, entitySubtitle, assignUrl, reviewersUrl, onClose, onAssigned,
}) {
  const { t } = useLanguage();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [reviewers, setReviewers] = useState([]);
  const [reviewersLoading, setReviewersLoading] = useState(false);
  const [selectedReviewer, setSelectedReviewer] = useState(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [useNewReviewer, setUseNewReviewer] = useState(false);
  const [newReviewerEmail, setNewReviewerEmail] = useState('');
  const [newReviewerName, setNewReviewerName] = useState('');
  const [newReviewerExpertise, setNewReviewerExpertise] = useState(['']);

  useEffect(() => {
    if (open) {
      setSelectedReviewer(null);
      setNotes('');
      setError('');
      setUseNewReviewer(false);
      setNewReviewerEmail('');
      setNewReviewerName('');
      setNewReviewerExpertise(['']);
      if (reviewersUrl && reviewers.length === 0) {
        setReviewersLoading(true);
        api.get(reviewersUrl)
          .then(res => setReviewers(res.data || []))
          .catch(() => setReviewers([]))
          .finally(() => setReviewersLoading(false));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reviewersUrl]);

  const handleSave = async () => {
    if (!useNewReviewer && !selectedReviewer) { setError(t('reviewerAssignment.dialog.selectReviewerError')); return; }
    if (useNewReviewer && !newReviewerEmail) { setError(t('reviewerAssignment.dialog.enterEmailError')); return; }

    setSaving(true);
    setError('');
    try {
      const payload = { notes: notes || undefined };
      if (useNewReviewer) {
        payload.new_reviewer_email = newReviewerEmail;
        payload.new_reviewer_name = newReviewerName || undefined;
        payload.new_reviewer_expertise = newReviewerExpertise.filter(e => e.trim());
      } else {
        payload.reviewer_id = selectedReviewer.id;
      }
      await api.post(assignUrl, payload);
      onAssigned && onAssigned();
      onClose();
    } catch (e) {
      setError(e.response?.data?.detail || t('reviewerAssignment.errorMessage'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800, fontSize: 16 }}>
        {t('reviewerAssignment.dialog.title')}
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {(entityTitle || entitySubtitle) && (
          <Box sx={{ mb: 2.5, p: 1.5, borderRadius: 2, bgcolor: dark ? 'rgba(22,166,153,0.08)' : 'rgba(22,166,153,0.05)', border: '1px solid', borderColor: ACCENT + '33' }}>
            {entityTitle && <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.3 }}>{entityTitle}</Typography>}
            {entitySubtitle && <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{entitySubtitle}</Typography>}
          </Box>
        )}

        {error && <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError('')}>{error}</Alert>}

        <FormControl component="fieldset" sx={{ mb: 2 }}>
          <FormLabel sx={{ fontSize: 12, fontWeight: 700, color: 'text.primary', mb: 1 }}>
            {t('reviewerAssignment.dialog.selectionLabel')}
          </FormLabel>
          <RadioGroup value={useNewReviewer ? 'new' : 'existing'} onChange={(e) => setUseNewReviewer(e.target.value === 'new')}>
            <FormControlLabel value="existing" control={<Radio sx={{ '&.Mui-checked': { color: ACCENT } }} />}
              label={<Typography sx={{ fontSize: 13 }}>{t('reviewerAssignment.dialog.existingOption')}</Typography>} />
            <FormControlLabel value="new" control={<Radio sx={{ '&.Mui-checked': { color: ACCENT } }} />}
              label={<Typography sx={{ fontSize: 13 }}>{t('reviewerAssignment.dialog.newOption')}</Typography>} />
          </RadioGroup>
        </FormControl>

        {!useNewReviewer && (
          <Box sx={{ mb: 2.5 }}>
            {reviewersLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
            ) : reviewers.length === 0 ? (
              <Alert severity="info" sx={{ fontSize: 12 }}>{t('reviewerAssignment.dialog.noExisting')}</Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 200, overflow: 'auto', p: 0.5 }}>
                {reviewers.map(r => (
                  <Box key={r.id}
                    onClick={() => setSelectedReviewer(selectedReviewer?.id === r.id ? null : r)}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, cursor: 'pointer',
                      border: '1px solid', borderColor: selectedReviewer?.id === r.id ? ACCENT : 'divider',
                      bgcolor: selectedReviewer?.id === r.id ? (dark ? 'rgba(22,166,153,0.12)' : 'rgba(22,166,153,0.07)') : 'transparent',
                      '&:hover': { borderColor: ACCENT + '88' },
                    }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: selectedReviewer?.id === r.id ? ACCENT : '#8b5cf6', fontSize: 12, flexShrink: 0 }}>
                      {r.name?.charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{r.name}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{r.email}</Typography>
                    </Box>
                    {selectedReviewer?.id === r.id && <CheckIcon sx={{ fontSize: 16, color: ACCENT, flexShrink: 0 }} />}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}

        {useNewReviewer && (
          <Box sx={{ mb: 2.5, p: 2, borderRadius: 2, bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1.5, color: 'text.secondary' }}>
              {t('reviewerAssignment.dialog.newDetailsTitle')}
            </Typography>
            <TextField fullWidth size="small" label={t('reviewerAssignment.dialog.emailLabel')} type="email"
              value={newReviewerEmail} onChange={(e) => setNewReviewerEmail(e.target.value)}
              placeholder={t('reviewerAssignment.dialog.emailPlaceholder')} sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <TextField fullWidth size="small" label={t('reviewerAssignment.dialog.nameLabel')}
              value={newReviewerName} onChange={(e) => setNewReviewerName(e.target.value)}
              placeholder={t('reviewerAssignment.dialog.namePlaceholder')} sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <Typography sx={{ fontSize: 11, fontWeight: 700, mb: 1, color: 'text.secondary' }}>
              {t('reviewerAssignment.dialog.expertiseLabel')}
            </Typography>
            {newReviewerExpertise.map((exp, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField fullWidth size="small" value={exp}
                  onChange={(e) => {
                    const updated = [...newReviewerExpertise];
                    updated[idx] = e.target.value;
                    setNewReviewerExpertise(updated);
                  }}
                  placeholder={t('reviewerAssignment.dialog.expertisePlaceholder')}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                {idx === newReviewerExpertise.length - 1 ? (
                  <IconButton size="small" onClick={() => setNewReviewerExpertise([...newReviewerExpertise, ''])} sx={{ color: ACCENT }}>
                    <AddIcon />
                  </IconButton>
                ) : (
                  <IconButton size="small" onClick={() => setNewReviewerExpertise(newReviewerExpertise.filter((_, i) => i !== idx))} sx={{ color: 'error.main' }}>
                    <RemoveIcon />
                  </IconButton>
                )}
              </Box>
            ))}
            <Alert severity="info" sx={{ mt: 1.5, fontSize: 11 }}>
              {t('reviewerAssignment.dialog.invitationNote')}
            </Alert>
          </Box>
        )}

        <TextField fullWidth size="small" multiline rows={2} label={t('reviewerAssignment.dialog.notesLabel')}
          value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('reviewerAssignment.dialog.notesPlaceholder')}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: 'text.secondary' }}>
          {t('reviewerAssignment.dialog.cancel')}
        </Button>
        <Button variant="contained"
          disabled={saving || (!useNewReviewer && !selectedReviewer) || (useNewReviewer && !newReviewerEmail)}
          onClick={handleSave}
          startIcon={saving ? <CircularProgress size={13} sx={{ color: 'inherit' }} /> : <AssignIcon />}
          sx={{ textTransform: 'none', fontWeight: 700, bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}>
          {saving ? t('reviewerAssignment.dialog.assigning') : t('reviewerAssignment.dialog.assign')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
