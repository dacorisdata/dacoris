'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip, Paper,
  TextField, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio,
  Slider, Divider, Dialog, DialogTitle, DialogContent, DialogActions, useTheme,
} from '@mui/material';
import {
  ArrowBack as BackIcon, Send as SendIcon, Warning as WarningIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { isReviewerUser } from '../../../../lib/authRouting';
import api from '../../../../lib/api';

const REVIEW_CRITERIA = [
  { id: 'innovation', weight: 25, max: 10 },
  { id: 'feasibility', weight: 25, max: 10 },
  { id: 'impact', weight: 20, max: 10 },
  { id: 'budget', weight: 15, max: 10 },
  { id: 'team', weight: 15, max: 10 },
];

const TYPE_KEYS = { proposal: 'proposal', project: 'project', ethics: 'ethicsApplication' };

export default function ReviewerReviewDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { fetchUser } = useAuth();
  const { t, dir } = useLanguage();
  const isRtl = dir === 'rtl';
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const ACCENT = dark ? '#2dd4bf' : '#0d9488';
  const HOVER  = dark ? '#1ca7a1' : '#0f766e';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [assignment, setAssignment] = useState(null);
  const [submitDialog, setSubmitDialog] = useState(false);

  const [hasCOI, setHasCOI] = useState(false);
  const [coiReason, setCoiReason] = useState('');
  const [scores, setScores] = useState({});
  const [recommendation, setRecommendation] = useState('');
  const [narrative, setNarrative] = useState('');
  const [decision, setDecision] = useState('');
  const [decisionNotes, setDecisionNotes] = useState('');

  useEffect(() => { init(); }, [params.id]);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/reviewer/login'); return; }
    if (!isReviewerUser(u)) { router.push('/login'); return; }
    await loadAssignment();
  };

  const loadAssignment = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/reviewer/assignments/${params.id}`);
      setAssignment(res.data);
      if (res.data.review) {
        setHasCOI(res.data.review.has_coi || false);
        setCoiReason(res.data.review.coi_reason || '');
        setRecommendation(res.data.review.recommendation || '');
        setNarrative(res.data.review.narrative_feedback || '');
      }
    } catch {
      setError(t('reviewer.detail.errorLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    try {
      await api.post(`/reviewer/assignments/${params.id}/start`);
      setAssignment(a => ({ ...a, status: 'in_progress' }));
    } catch (e) {
      setError(e.response?.data?.detail || t('reviewer.detail.errorStart'));
    }
  };

  const calculateOverallScore = () => {
    let totalWeighted = 0;
    let totalWeight = 0;
    REVIEW_CRITERIA.forEach(c => {
      const score = scores[c.id] || 0;
      totalWeighted += (score / c.max) * c.weight;
      totalWeight += c.weight;
    });
    return totalWeight > 0 ? (totalWeighted / totalWeight) * 100 : 0;
  };

  const submitReview = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        has_coi: hasCOI,
        coi_reason: coiReason || null,
        narrative_feedback: narrative || null,
      };
      if (assignment.review_type === 'proposal') {
        payload.scores = scores;
        payload.overall_score = calculateOverallScore();
        payload.recommendation = recommendation;
      } else {
        payload.decision = decision;
        payload.decision_notes = decisionNotes;
      }
      await api.post(`/reviewer/assignments/${params.id}/submit`, payload);
      setSuccess(t('reviewer.detail.successSubmit'));
      setSubmitDialog(false);
      await loadAssignment();
    } catch (e) {
      setError(e.response?.data?.detail || t('reviewer.detail.errorSubmit'));
    } finally {
      setSubmitting(false);
    }
  };

  const iconFlip = { transform: isRtl ? 'scaleX(-1)' : 'none' };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  if (!assignment) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 }, width: '100%' }}>
        <Alert severity="error">{t('reviewer.detail.notFound')}</Alert>
        <Button
          startIcon={<BackIcon sx={iconFlip} />}
          onClick={() => router.push('/reviewer/tasks')}
          sx={{ mt: 2 }}
        >
          {t('reviewer.detail.backToTasks')}
        </Button>
      </Box>
    );
  }

  const isSubmitted = assignment.status === 'submitted';
  const isReadOnly = isSubmitted;
  const entity = assignment.entity || {};
  const typeKey = TYPE_KEYS[assignment.review_type] || 'proposal';

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, width: '100%' }}>
      <Button
        startIcon={<BackIcon sx={iconFlip} />}
        onClick={() => router.push('/reviewer/tasks')}
        sx={{ mb: 2, color: 'text.secondary', textTransform: 'none' }}
      >
        {t('reviewer.detail.backToTasks')}
      </Button>

      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          <Chip
            label={t(`reviewer.type.${typeKey}`)}
            size="small"
            sx={{ bgcolor: `${ACCENT}18`, color: ACCENT, fontWeight: 600 }}
          />
          <Chip
            label={t(`reviewer.status.${assignment.status}`)}
            size="small"
            sx={{ fontWeight: 600 }}
          />
        </Box>
        <Typography sx={{ fontSize: 24, fontWeight: 700, mb: 0.5 }}>
          {assignment.entity_title}
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
          {t('reviewer.detail.scopeNote')}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} icon={<CheckIcon />}>{success}</Alert>}

      {!isSubmitted && assignment.status === 'assigned' && (
        <Alert
          severity="info"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={handleStart}>
              {t('reviewer.detail.beginReview')}
            </Button>
          }
        >
          {t('reviewer.detail.beginReviewHint')}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 2, fontSize: 16 }}>
          {t('reviewer.detail.materialsTitle')}
        </Typography>
        {assignment.review_type === 'proposal' && (
          <>
            {entity.status && (
              <Typography sx={{ fontSize: 14 }}>
                <strong>{t('reviewer.detail.statusLabel')}</strong> {entity.status}
              </Typography>
            )}
          </>
        )}
        {assignment.review_type === 'project' && (
          <>
            {(entity.project_abstract || entity.description) && (
              <Typography sx={{ fontSize: 14, lineHeight: 1.7, mb: 2 }}>
                {entity.project_abstract || entity.description}
              </Typography>
            )}
            {entity.status && (
              <Typography sx={{ fontSize: 14 }}>
                <strong>{t('reviewer.detail.statusLabel')}</strong> {entity.status}
              </Typography>
            )}
          </>
        )}
        {assignment.review_type === 'ethics' && (
          <>
            {entity.lay_summary && (
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>
                  {t('reviewer.detail.laySummary')}
                </Typography>
                <Typography sx={{ fontSize: 14, lineHeight: 1.7 }}>{entity.lay_summary}</Typography>
              </Box>
            )}
            {entity.methodology && (
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>
                  {t('reviewer.detail.methodology')}
                </Typography>
                <Typography sx={{ fontSize: 14, lineHeight: 1.7 }}>{entity.methodology}</Typography>
              </Box>
            )}
            {entity.risk_assessment && (
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>
                  {t('reviewer.detail.riskAssessment')}
                </Typography>
                <Typography sx={{ fontSize: 14, lineHeight: 1.7 }}>{entity.risk_assessment}</Typography>
              </Box>
            )}
          </>
        )}
      </Paper>

      {!isReadOnly && (
        <>
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Typography sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
              {t('reviewer.detail.coiTitle')}
            </Typography>
            <FormControl>
              <RadioGroup row value={hasCOI ? 'yes' : 'no'} onChange={(e) => setHasCOI(e.target.value === 'yes')}>
                <FormControlLabel value="no" control={<Radio />} label={t('reviewer.detail.noCoi')} />
                <FormControlLabel value="yes" control={<Radio />} label={t('reviewer.detail.hasCoi')} />
              </RadioGroup>
            </FormControl>
            {hasCOI && (
              <TextField
                fullWidth
                multiline
                rows={2}
                label={t('reviewer.detail.coiDetails')}
                value={coiReason}
                onChange={(e) => setCoiReason(e.target.value)}
                sx={{ mt: 2 }}
              />
            )}
          </Paper>

          {assignment.review_type === 'proposal' && (
            <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
              <Typography sx={{ fontWeight: 700, mb: 3 }}>{t('reviewer.detail.rubricTitle')}</Typography>
              {REVIEW_CRITERIA.map(c => (
                <Box key={c.id} sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                      {t(`reviewer.detail.criteria.${c.id}`)}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: ACCENT, fontWeight: 700 }}>
                      {scores[c.id] || 0} / {c.max}
                    </Typography>
                  </Box>
                  <Slider
                    value={scores[c.id] || 0}
                    onChange={(_, v) => setScores(s => ({ ...s, [c.id]: v }))}
                    min={0}
                    max={c.max}
                    step={0.5}
                    sx={{ color: ACCENT }}
                  />
                </Box>
              ))}
              <Divider sx={{ my: 2 }} />
              <Typography sx={{ fontWeight: 700, color: ACCENT }}>
                {t('reviewer.detail.overallScore', { score: calculateOverallScore().toFixed(1) })}
              </Typography>
              <FormControl sx={{ mt: 2, width: '100%' }}>
                <FormLabel sx={{ fontWeight: 600, mb: 1 }}>{t('reviewer.detail.recommendation')}</FormLabel>
                <RadioGroup value={recommendation} onChange={(e) => setRecommendation(e.target.value)}>
                  <FormControlLabel value="fund" control={<Radio />} label={t('reviewer.detail.recommendFund')} />
                  <FormControlLabel value="fund_with_revisions" control={<Radio />} label={t('reviewer.detail.fundWithRevisions')} />
                  <FormControlLabel value="not_fund" control={<Radio />} label={t('reviewer.detail.notRecommendFund')} />
                </RadioGroup>
              </FormControl>
            </Paper>
          )}

          {(assignment.review_type === 'project' || assignment.review_type === 'ethics') && (
            <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
              <FormControl sx={{ width: '100%' }}>
                <FormLabel sx={{ fontWeight: 600, mb: 1 }}>{t('reviewer.detail.decision')}</FormLabel>
                <RadioGroup value={decision} onChange={(e) => setDecision(e.target.value)}>
                  <FormControlLabel value="approve" control={<Radio />} label={t('reviewer.detail.approve')} />
                  <FormControlLabel value="approve_with_conditions" control={<Radio />} label={t('reviewer.detail.approveWithConditions')} />
                  <FormControlLabel value="defer" control={<Radio />} label={t('reviewer.detail.defer')} />
                  <FormControlLabel value="reject" control={<Radio />} label={t('reviewer.detail.reject')} />
                </RadioGroup>
              </FormControl>
            </Paper>
          )}

          <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Typography sx={{ fontWeight: 700, mb: 2 }}>{t('reviewer.detail.writtenFeedback')}</Typography>
            <TextField
              fullWidth
              multiline
              rows={6}
              placeholder={t('reviewer.detail.feedbackPlaceholder')}
              value={assignment.review_type === 'proposal' ? narrative : decisionNotes}
              onChange={(e) => assignment.review_type === 'proposal'
                ? setNarrative(e.target.value)
                : setDecisionNotes(e.target.value)}
            />
          </Paper>

          <Button
            variant="contained"
            size="large"
            endIcon={<SendIcon sx={iconFlip} />}
            onClick={() => setSubmitDialog(true)}
            disabled={assignment.status === 'assigned'}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: HOVER }, textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            {t('reviewer.detail.submitReview')}
          </Button>
        </>
      )}

      {isSubmitted && assignment.review && (
        <Paper sx={{ p: 3, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.3)' }}>
          <Typography sx={{ fontWeight: 700, color: '#10b981', mb: 1 }}>
            {t('reviewer.detail.reviewSubmitted')}
          </Typography>
          {assignment.review.narrative_feedback && (
            <Typography sx={{ fontSize: 14 }}>{assignment.review.narrative_feedback}</Typography>
          )}
        </Paper>
      )}

      <Dialog open={submitDialog} onClose={() => setSubmitDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('reviewer.detail.confirmTitle')}</DialogTitle>
        <DialogContent>
          <Typography>{t('reviewer.detail.confirmBody')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmitDialog(false)}>{t('reviewer.detail.cancel')}</Button>
          <Button
            variant="contained"
            onClick={submitReview}
            disabled={submitting}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: HOVER } }}
          >
            {submitting ? <CircularProgress size={20} color="inherit" /> : t('reviewer.detail.submit')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
