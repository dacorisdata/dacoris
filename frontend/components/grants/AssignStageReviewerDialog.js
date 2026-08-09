'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Button, CircularProgress, Alert, Avatar, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton,
  Autocomplete, Chip, useTheme, InputAdornment,
} from '@mui/material';
import {
  Close as CloseIcon, CheckCircle as CheckIcon,
  PersonAdd as AssignIcon, AddCircle as AddIcon, RemoveCircle as RemoveIcon,
  Search as SearchIcon, EventNote as StageIcon, MailOutline as MailIcon,
} from '@mui/icons-material';
import { COLORS } from '../../contexts/ThemeContext';
import api from '../../lib/api';

const ACCENT = COLORS.teal[600];

const DEFAULT_STAGES = [
  { step: 1, label: 'Eligibility', days: 7 },
  { step: 2, label: 'Technical', days: 14 },
  { step: 3, label: 'Budget', days: 7 },
  { step: 4, label: 'Panel', days: 14 },
  { step: 5, label: 'Final Approval', days: 7 },
];

/**
 * Professional multi-stage reviewer assignment dialog for grant proposals.
 */
export default function AssignStageReviewerDialog({
  open,
  proposal,
  stages = DEFAULT_STAGES,
  currentStep = 0,
  reviewers: reviewersProp,
  reviewersUrl = '/grants/proposals/reviewers/available',
  onClose,
  onAssigned,
}) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [selectedStages, setSelectedStages] = useState([]);
  const [selectedReviewer, setSelectedReviewer] = useState(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('existing'); // existing | new
  const [newReviewerEmail, setNewReviewerEmail] = useState('');
  const [newReviewerName, setNewReviewerName] = useState('');
  const [newReviewerExpertise, setNewReviewerExpertise] = useState(['']);
  const [reviewers, setReviewers] = useState(reviewersProp || []);
  const [reviewersLoading, setReviewersLoading] = useState(false);

  const assignableStages = useMemo(
    () => (stages || DEFAULT_STAGES).filter((s) => s.step > 0),
    [stages],
  );

  useEffect(() => {
    if (!open) return;
    const initial = assignableStages.some((s) => s.step === currentStep)
      ? [currentStep]
      : assignableStages[0]
        ? [assignableStages[0].step]
        : [];
    setSelectedStages(initial);
    setSelectedReviewer(null);
    setNotes('');
    setError('');
    setMode('existing');
    setNewReviewerEmail('');
    setNewReviewerName('');
    setNewReviewerExpertise(['']);

    if (Array.isArray(reviewersProp) && reviewersProp.length > 0) {
      setReviewers(reviewersProp);
      return;
    }
    setReviewersLoading(true);
    api.get(reviewersUrl)
      .then((res) => setReviewers(res.data || []))
      .catch(() => setReviewers([]))
      .finally(() => setReviewersLoading(false));
  }, [open, currentStep, assignableStages, reviewersProp, reviewersUrl]);

  const toggleStage = (step) => {
    setSelectedStages((prev) => (
      prev.includes(step) ? prev.filter((s) => s !== step) : [...prev, step]
    ));
  };

  const canSubmit = selectedStages.length > 0
    && (
      (mode === 'existing' && !!selectedReviewer)
      || (mode === 'new' && !!newReviewerEmail.trim())
    );

  const handleSave = async () => {
    if (mode === 'existing' && !selectedReviewer) {
      setError('Select a reviewer');
      return;
    }
    if (mode === 'new' && !newReviewerEmail.trim()) {
      setError('Enter reviewer email');
      return;
    }
    if (selectedStages.length === 0) {
      setError('Select at least one review stage');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        stage_steps: selectedStages,
        notes: notes || undefined,
      };
      if (mode === 'new') {
        payload.new_reviewer_email = newReviewerEmail.trim();
        payload.new_reviewer_name = newReviewerName || undefined;
        payload.new_reviewer_expertise = newReviewerExpertise.filter((e) => e.trim());
      } else {
        payload.reviewer_id = selectedReviewer.id;
      }

      const response = await api.post(`/grants/proposals/${proposal.id}/stage-reviewers`, payload);
      onAssigned?.(response.data);
      onClose?.();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to assign reviewer');
    } finally {
      setSaving(false);
    }
  };

  if (!proposal) return null;

  const subtitle = proposal.opportunity?.title
    || proposal.opportunity?.sponsor
    || (proposal.opportunity_id ? `Opportunity #${proposal.opportunity_id}` : 'Grant proposal');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2.5,
          overflow: 'hidden',
          maxHeight: '92vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          px: 3,
          py: 2.25,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.3 }}>
            Assign Reviewer
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.4 }}>
            Designate a reviewer for one or more workflow stages
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close" sx={{ mt: -0.25 }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 0 }}>
        {/* Proposal context */}
        <Box
          sx={{
            mt: 2.5,
            mb: 3,
            p: 2,
            borderRadius: 2,
            bgcolor: dark ? 'rgba(13,148,136,0.1)' : COLORS.teal[50],
            border: '1px solid',
            borderColor: dark ? 'rgba(13,148,136,0.28)' : COLORS.teal[200],
          }}
        >
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.4, mb: 0.5 }}>
            {proposal.title}
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.45 }}>
            {subtitle}
            {proposal.submitted_at
              ? ` · Submitted ${new Date(proposal.submitted_at).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}`
              : ''}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: 1.5 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Stages */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
            <StageIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.secondary', letterSpacing: '0.02em' }}>
              REVIEW STAGES
            </Typography>
            <Typography component="span" sx={{ color: 'error.main', fontSize: 12, fontWeight: 700 }}>*</Typography>
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' },
              gap: 1,
            }}
          >
            {assignableStages.map((stage) => {
              const selected = selectedStages.includes(stage.step);
              const isCurrent = stage.step === currentStep;
              return (
                <Box
                  key={stage.step}
                  role="checkbox"
                  aria-checked={selected}
                  tabIndex={0}
                  onClick={() => toggleStage(stage.step)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleStage(stage.step);
                    }
                  }}
                  sx={{
                    position: 'relative',
                    px: 1.5,
                    py: 1.25,
                    borderRadius: 1.5,
                    cursor: 'pointer',
                    border: '1.5px solid',
                    borderColor: selected ? ACCENT : 'divider',
                    bgcolor: selected
                      ? (dark ? 'rgba(13,148,136,0.14)' : 'rgba(13,148,136,0.06)')
                      : 'transparent',
                    transition: 'border-color 0.15s ease, background-color 0.15s ease',
                    '&:hover': {
                      borderColor: selected ? ACCENT : COLORS.teal[400],
                      bgcolor: selected
                        ? (dark ? 'rgba(13,148,136,0.18)' : 'rgba(13,148,136,0.09)')
                        : (dark ? 'rgba(255,255,255,0.03)' : COLORS.slate[50]),
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 0.5 }}>
                    <Box>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.3 }}>
                        {stage.label}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>
                        ~{stage.days} days
                      </Typography>
                    </Box>
                    {selected && <CheckIcon sx={{ fontSize: 16, color: ACCENT, mt: 0.15 }} />}
                  </Box>
                  {isCurrent && (
                    <Chip
                      label="Current"
                      size="small"
                      sx={{
                        mt: 0.75,
                        height: 18,
                        fontSize: 10,
                        fontWeight: 700,
                        bgcolor: dark ? 'rgba(13,148,136,0.25)' : COLORS.teal[100],
                        color: dark ? COLORS.teal[300] : COLORS.teal[700],
                        '& .MuiChip-label': { px: 0.75 },
                      }}
                    />
                  )}
                </Box>
              );
            })}
          </Box>
          {selectedStages.length > 0 && (
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 1 }}>
              {selectedStages.length} stage{selectedStages.length > 1 ? 's' : ''} selected
            </Typography>
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Mode toggle */}
        <Box sx={{ mb: 2.25 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.secondary', letterSpacing: '0.02em', mb: 1.25 }}>
            REVIEWER
            <Typography component="span" sx={{ color: 'error.main', ml: 0.4 }}>*</Typography>
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              p: 0.5,
              borderRadius: 1.5,
              bgcolor: dark ? 'rgba(255,255,255,0.04)' : COLORS.slate[100],
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            {[
              { value: 'existing', label: 'Existing reviewer' },
              { value: 'new', label: 'Invite by email' },
            ].map((opt) => {
              const active = mode === opt.value;
              return (
                <Box
                  key={opt.value}
                  component="button"
                  type="button"
                  onClick={() => setMode(opt.value)}
                  sx={{
                    border: 'none',
                    cursor: 'pointer',
                    py: 1,
                    px: 1.5,
                    borderRadius: 1.25,
                    fontSize: 12.5,
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    color: active ? (dark ? '#fff' : COLORS.slate[900]) : 'text.secondary',
                    bgcolor: active ? (dark ? COLORS.slate[700] : '#fff') : 'transparent',
                    boxShadow: active ? (dark ? 'none' : '0 1px 3px rgba(15,23,42,0.08)') : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {opt.label}
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Existing reviewer */}
        {mode === 'existing' && (
          <Box sx={{ mb: 2.5 }}>
            {reviewersLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={22} sx={{ color: ACCENT }} />
              </Box>
            ) : reviewers.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: 1.5, fontSize: 12.5 }}>
                No existing reviewers found. Switch to “Invite by email” to add someone new.
              </Alert>
            ) : (
              <Autocomplete
                options={reviewers}
                value={selectedReviewer}
                onChange={(_, value) => setSelectedReviewer(value)}
                getOptionLabel={(o) => o?.name || o?.email || ''}
                isOptionEqualToValue={(a, b) => a?.id === b?.id}
                filterOptions={(options, { inputValue }) => {
                  const q = inputValue.trim().toLowerCase();
                  if (!q) return options;
                  return options.filter((o) =>
                    `${o.name || ''} ${o.email || ''}`.toLowerCase().includes(q)
                  );
                }}
                noOptionsText="No matching reviewers"
                renderOption={(props, option) => {
                  const { key, ...rest } = props;
                  const selected = selectedReviewer?.id === option.id;
                  return (
                    <Box
                      component="li"
                      key={key}
                      {...rest}
                      sx={{
                        display: 'flex !important',
                        alignItems: 'center',
                        gap: 1.5,
                        py: '10px !important',
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 34,
                          height: 34,
                          fontSize: 13,
                          fontWeight: 700,
                          bgcolor: selected ? ACCENT : COLORS.slate[500],
                        }}
                      >
                        {(option.name || option.email || '?').charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.3 }}>
                          {option.name || 'Unnamed'}
                        </Typography>
                        <Typography sx={{ fontSize: 11.5, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {option.email}
                        </Typography>
                      </Box>
                      {selected && <CheckIcon sx={{ fontSize: 16, color: ACCENT }} />}
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    placeholder="Search by name or email…"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start" sx={{ ml: 0.5 }}>
                            <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5,
                        bgcolor: dark ? 'rgba(255,255,255,0.02)' : '#fff',
                      },
                    }}
                  />
                )}
              />
            )}

            {selectedReviewer && (
              <Box
                sx={{
                  mt: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1.5,
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: ACCENT,
                  bgcolor: dark ? 'rgba(13,148,136,0.12)' : 'rgba(13,148,136,0.05)',
                }}
              >
                <Avatar sx={{ width: 36, height: 36, bgcolor: ACCENT, fontSize: 14, fontWeight: 700 }}>
                  {(selectedReviewer.name || '?').charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>
                    {selectedReviewer.name}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {selectedReviewer.email}
                  </Typography>
                </Box>
                <Chip
                  label="Selected"
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: 11,
                    fontWeight: 700,
                    bgcolor: ACCENT,
                    color: '#fff',
                  }}
                />
              </Box>
            )}
          </Box>
        )}

        {/* New reviewer */}
        {mode === 'new' && (
          <Box
            sx={{
              mb: 2.5,
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: dark ? 'rgba(255,255,255,0.02)' : COLORS.slate[50],
            }}
          >
            <TextField
              fullWidth
              size="small"
              label="Email address"
              required
              type="email"
              value={newReviewerEmail}
              onChange={(e) => setNewReviewerEmail(e.target.value)}
              placeholder="reviewer@university.edu"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MailIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: dark ? 'transparent' : '#fff' } }}
            />
            <TextField
              fullWidth
              size="small"
              label="Full name (optional)"
              value={newReviewerName}
              onChange={(e) => setNewReviewerName(e.target.value)}
              placeholder="Dr. Jane Smith"
              sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: dark ? 'transparent' : '#fff' } }}
            />
            <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'text.secondary', mb: 1 }}>
              Areas of expertise (optional)
            </Typography>
            {newReviewerExpertise.map((exp, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  value={exp}
                  onChange={(e) => {
                    const updated = [...newReviewerExpertise];
                    updated[idx] = e.target.value;
                    setNewReviewerExpertise(updated);
                  }}
                  placeholder="e.g. Machine Learning, Climate Science"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: dark ? 'transparent' : '#fff' } }}
                />
                {idx === newReviewerExpertise.length - 1 ? (
                  <IconButton
                    size="small"
                    onClick={() => setNewReviewerExpertise([...newReviewerExpertise, ''])}
                    sx={{ color: ACCENT }}
                    aria-label="Add expertise"
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                ) : (
                  <IconButton
                    size="small"
                    onClick={() => setNewReviewerExpertise(newReviewerExpertise.filter((_, i) => i !== idx))}
                    sx={{ color: 'error.main' }}
                    aria-label="Remove expertise"
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            ))}
            <Alert severity="info" sx={{ mt: 0.5, borderRadius: 1.5, fontSize: 12 }}>
              An invitation email will be sent so they can create an account and set a password.
            </Alert>
          </Box>
        )}

        <TextField
          fullWidth
          size="small"
          multiline
          rows={2}
          label="Assignment notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional instructions for the reviewer…"
          sx={{ mb: 1, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
        />
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          gap: 1,
        }}
      >
        <Button onClick={onClose} sx={{ textTransform: 'none', color: 'text.secondary', fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={saving || !canSubmit}
          onClick={handleSave}
          startIcon={saving ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : <AssignIcon />}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            px: 2.25,
            bgcolor: ACCENT,
            boxShadow: 'none',
            '&:hover': { bgcolor: COLORS.teal[700], boxShadow: 'none' },
            '&.Mui-disabled': {
              bgcolor: dark ? 'rgba(255,255,255,0.08)' : COLORS.slate[200],
              color: dark ? 'rgba(255,255,255,0.3)' : COLORS.slate[400],
            },
          }}
        >
          {saving ? 'Assigning…' : 'Assign Reviewer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
