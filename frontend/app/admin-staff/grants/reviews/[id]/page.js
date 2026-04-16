'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip, Paper, Grid,
  TextField, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio,
  Slider, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  ArrowBack as BackIcon, Send as SendIcon, Warning as WarningIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const ACCENT = '#8b5cf6';

const REVIEW_CRITERIA = [
  { id: 'innovation', label: 'Innovation & Originality', weight: 25, max: 10 },
  { id: 'feasibility', label: 'Feasibility & Methodology', weight: 25, max: 10 },
  { id: 'impact', label: 'Expected Impact', weight: 20, max: 10 },
  { id: 'budget', label: 'Budget Appropriateness', weight: 15, max: 10 },
  { id: 'team', label: 'Team Qualifications', weight: 15, max: 10 },
];

export default function ReviewProposalPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [proposal, setProposal] = useState(null);
  const [review, setReview] = useState(null);
  
  // Review form
  const [hasCOI, setHasCOI] = useState(false);
  const [coiReason, setCoiReason] = useState('');
  const [scores, setScores] = useState({});
  const [recommendation, setRecommendation] = useState('');
  const [narrative, setNarrative] = useState('');
  const [submitDialog, setSubmitDialog] = useState(false);

  useEffect(() => {
    loadReview();
  }, [params.id]);

  const loadReview = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // In a real app, we'd load the review assignment
      // For now, we'll just show the form
      setLoading(false);
    } catch (e) {
      setError('Failed to load review');
    }
  };

  const handleScoreChange = (criteriaId, value) => {
    setScores(prev => ({ ...prev, [criteriaId]: value }));
  };

  const calculateOverallScore = () => {
    let totalWeighted = 0;
    let totalWeight = 0;
    
    REVIEW_CRITERIA.forEach(criteria => {
      const score = scores[criteria.id] || 0;
      totalWeighted += (score / criteria.max) * criteria.weight;
      totalWeight += criteria.weight;
    });
    
    return totalWeight > 0 ? (totalWeighted / totalWeight) * 100 : 0;
  };

  const submitReview = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      
      const overallScore = calculateOverallScore();
      
      await axios.post(
        `${API_URL}/api/grants/reviews/${params.id}/submit`,
        {
          has_coi: hasCOI,
          coi_reason: hasCOI ? coiReason : null,
          scores,
          overall_score: overallScore,
          recommendation,
          narrative_feedback: narrative
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess('Review submitted successfully!');
      setSubmitDialog(false);
      setTimeout(() => router.push('/admin-staff/grants/reviews'), 2000);
    } catch (e) {
      setError('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const overallScore = calculateOverallScore();
  const allScoresProvided = REVIEW_CRITERIA.every(c => scores[c.id] !== undefined && scores[c.id] > 0);
  const canSubmit = !hasCOI && allScoresProvided && recommendation && narrative.length > 100;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: 3 }}>
      <Button startIcon={<BackIcon />} onClick={() => router.push('/admin-staff/grants/reviews')} sx={{ mb: 3 }}>
        Back to Reviews
      </Button>

      <Grid container spacing={3}>
        {/* Main Review Form */}
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
              Review Proposal
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            {/* COI Declaration */}
            <Box sx={{ mb: 4, p: 3, bgcolor: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <WarningIcon sx={{ color: '#f59e0b' }} />
                <Typography sx={{ fontWeight: 600 }}>Conflict of Interest Declaration</Typography>
              </Box>
              
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ fontSize: 13, mb: 1 }}>
                  Do you have any conflict of interest with this proposal or applicant?
                </FormLabel>
                <RadioGroup value={hasCOI ? 'yes' : 'no'} onChange={(e) => setHasCOI(e.target.value === 'yes')}>
                  <FormControlLabel value="no" control={<Radio />} label="No conflict of interest" />
                  <FormControlLabel value="yes" control={<Radio />} label="Yes, I have a conflict of interest" />
                </RadioGroup>
              </FormControl>

              {hasCOI && (
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Please describe the conflict"
                  value={coiReason}
                  onChange={(e) => setCoiReason(e.target.value)}
                  sx={{ mt: 2 }}
                  required
                />
              )}
            </Box>

            {!hasCOI && (
              <>
                {/* Scoring Criteria */}
                <Typography sx={{ fontSize: 18, fontWeight: 600, mb: 3 }}>Scoring Criteria</Typography>
                
                {REVIEW_CRITERIA.map((criteria) => (
                  <Box key={criteria.id} sx={{ mb: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography sx={{ fontWeight: 600 }}>
                        {criteria.label}
                      </Typography>
                      <Chip 
                        label={`${criteria.weight}% weight`} 
                        size="small" 
                        sx={{ bgcolor: `${ACCENT}15`, color: ACCENT, fontSize: 11 }} 
                      />
                    </Box>
                    
                    <Box sx={{ px: 2 }}>
                      <Slider
                        value={scores[criteria.id] || 0}
                        onChange={(e, val) => handleScoreChange(criteria.id, val)}
                        min={0}
                        max={criteria.max}
                        step={0.5}
                        marks={[
                          { value: 0, label: '0' },
                          { value: criteria.max / 2, label: `${criteria.max / 2}` },
                          { value: criteria.max, label: `${criteria.max}` },
                        ]}
                        valueLabelDisplay="on"
                        sx={{ color: ACCENT }}
                      />
                    </Box>
                    
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1 }}>
                      Score: {scores[criteria.id] || 0} / {criteria.max}
                    </Typography>
                  </Box>
                ))}

                <Divider sx={{ my: 4 }} />

                {/* Recommendation */}
                <FormControl component="fieldset" sx={{ mb: 4 }}>
                  <FormLabel component="legend" sx={{ fontWeight: 600, mb: 2 }}>
                    Overall Recommendation
                  </FormLabel>
                  <RadioGroup value={recommendation} onChange={(e) => setRecommendation(e.target.value)}>
                    <FormControlLabel value="fund" control={<Radio />} label="Recommend for Funding" />
                    <FormControlLabel value="conditional" control={<Radio />} label="Conditional Approval (with revisions)" />
                    <FormControlLabel value="reject" control={<Radio />} label="Do Not Recommend" />
                  </RadioGroup>
                </FormControl>

                {/* Narrative Feedback */}
                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  label="Narrative Feedback"
                  value={narrative}
                  onChange={(e) => setNarrative(e.target.value)}
                  helperText={`${narrative.length} characters (minimum 100 required)`}
                  required
                  sx={{ mb: 3 }}
                />

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  startIcon={<SendIcon />}
                  onClick={() => setSubmitDialog(true)}
                  disabled={!canSubmit}
                  sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#7c3aed' } }}
                >
                  Submit Review
                </Button>
              </>
            )}

            {hasCOI && (
              <Alert severity="warning" sx={{ mt: 3 }}>
                Due to your declared conflict of interest, you cannot submit a review for this proposal. 
                Please notify the grant officer to reassign this review.
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Sidebar - Score Summary */}
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, position: 'sticky', top: 20 }}>
            <Typography sx={{ fontWeight: 600, mb: 3 }}>Score Summary</Typography>
            
            <Box sx={{ mb: 3, p: 3, bgcolor: `${ACCENT}08`, borderRadius: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>Overall Score</Typography>
              <Typography sx={{ fontSize: 36, fontWeight: 700, color: ACCENT }}>
                {overallScore.toFixed(1)}
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>out of 100</Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 2 }}>Criteria Breakdown</Typography>
            {REVIEW_CRITERIA.map((criteria) => (
              <Box key={criteria.id} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {criteria.label}
                  </Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                    {scores[criteria.id] || 0}/{criteria.max}
                  </Typography>
                </Box>
              </Box>
            ))}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {allScoresProvided ? (
                  <CheckIcon sx={{ fontSize: 16, color: '#10b981' }} />
                ) : (
                  <Box sx={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid', borderColor: 'divider' }} />
                )}
                <Typography sx={{ fontSize: 12 }}>All scores provided</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {recommendation ? (
                  <CheckIcon sx={{ fontSize: 16, color: '#10b981' }} />
                ) : (
                  <Box sx={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid', borderColor: 'divider' }} />
                )}
                <Typography sx={{ fontSize: 12 }}>Recommendation selected</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {narrative.length >= 100 ? (
                  <CheckIcon sx={{ fontSize: 16, color: '#10b981' }} />
                ) : (
                  <Box sx={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid', borderColor: 'divider' }} />
                )}
                <Typography sx={{ fontSize: 12 }}>Narrative feedback (100+ chars)</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Submit Confirmation Dialog */}
      <Dialog open={submitDialog} onClose={() => setSubmitDialog(false)}>
        <DialogTitle>Submit Review?</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to submit this review? Once submitted, you cannot edit it.
          </Typography>
          <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>Review Summary:</Typography>
            <Typography sx={{ fontSize: 12, mb: 0.5 }}>Overall Score: <strong>{overallScore.toFixed(1)}/100</strong></Typography>
            <Typography sx={{ fontSize: 12, mb: 0.5 }}>Recommendation: <strong>{recommendation}</strong></Typography>
            <Typography sx={{ fontSize: 12 }}>Feedback: <strong>{narrative.length} characters</strong></Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmitDialog(false)}>Cancel</Button>
          <Button 
            onClick={submitReview} 
            variant="contained" 
            disabled={submitting}
            sx={{ bgcolor: ACCENT }}
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
