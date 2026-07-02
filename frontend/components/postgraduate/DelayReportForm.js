'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
import { AttachFile as AttachIcon, CloudUpload as UploadIcon } from '@mui/icons-material';
import RichTextField from '../RichTextField';
import pgApi from '../../lib/postgraduateApi';
import {
  DELAY_CATEGORIES,
  RISK_LEVELS,
  displayStage,
  fmtDate,
  isHtmlEmpty,
} from '../../lib/delayReportConstants';
import { ACCENT, ProgressRiskChip } from './SupervisorUi';

function ReadOnlyField({ label, value, highlight }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.35 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 14, fontWeight: highlight ? 700 : 500, color: highlight ? 'error.main' : 'text.primary' }}>
        {value || '—'}
      </Typography>
    </Box>
  );
}

function SectionCard({ title, subtitle, children }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 2.5 },
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        mb: 2.5,
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: 15, mb: subtitle ? 0.5 : 1.5 }}>{title}</Typography>
      {subtitle && (
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>{subtitle}</Typography>
      )}
      {children}
    </Paper>
  );
}

export default function DelayReportForm({ initialStudentId, onSuccess }) {
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState(initialStudentId || '');
  const [studentContext, setStudentContext] = useState(null);
  const [loadingContext, setLoadingContext] = useState(false);

  const [primaryCategory, setPrimaryCategory] = useState('');
  const [secondaryCategory, setSecondaryCategory] = useState('');
  const [narrative, setNarrative] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [recommendedIntervention, setRecommendedIntervention] = useState('');
  const [revisedMilestoneDate, setRevisedMilestoneDate] = useState('');
  const [riskLevel, setRiskLevel] = useState('medium');
  const [escalationNeeded, setEscalationNeeded] = useState('no');
  const [evidenceFile, setEvidenceFile] = useState(null);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    pgApi.supervisorStudents()
      .then((res) => setStudents(res.data.students || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!studentId) {
      setStudentContext(null);
      return;
    }
    setLoadingContext(true);
    pgApi.supervisorStudent(studentId)
      .then((res) => {
        const student = res.data?.external?.student;
        const journey = res.data?.external?.journey;
        setStudentContext({
          student_id: student?.student_id,
          student_name: student?.full_name,
          programme_name: student?.programme_name,
          department: student?.department,
          cohort_year: student?.cohort_year || journey?.cohort,
          current_stage: journey?.current_stage || student?.current_stage_name,
          expected_completion_date: journey?.expected_graduation || student?.expected_graduation_date,
          days_overdue: journey?.days_overdue ?? 0,
          risk_level: journey?.risk_level,
          overall_status: journey?.overall_status,
        });
      })
      .catch(() => setStudentContext(null))
      .finally(() => setLoadingContext(false));
  }, [studentId]);

  const canSubmit = useMemo(
    () => studentId && primaryCategory && !isHtmlEmpty(narrative) && !submitting,
    [studentId, primaryCategory, narrative, submitting],
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (secondaryCategory && secondaryCategory === primaryCategory) {
      setError('Secondary delay category must differ from the primary category.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('student_id', studentId);
      formData.append('primary_delay_category', primaryCategory);
      if (secondaryCategory) formData.append('secondary_delay_category', secondaryCategory);
      formData.append('narrative', narrative);
      if (actionTaken) formData.append('action_taken', actionTaken);
      if (recommendedIntervention) formData.append('recommended_intervention', recommendedIntervention);
      if (revisedMilestoneDate) formData.append('revised_milestone_date', revisedMilestoneDate);
      formData.append('risk_level', riskLevel);
      formData.append('escalation_needed', escalationNeeded === 'yes' ? 'true' : 'false');
      if (evidenceFile) formData.append('evidence', evidenceFile);

      const res = await pgApi.createDelayReport(formData);
      onSuccess?.(res.data.id);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit delay report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <SectionCard
        title="1. Student identification"
        subtitle="Select the supervisee. Context fields are captured automatically for postgraduate office reporting."
      >
        <TextField
          select
          label="Student"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          fullWidth
          size="small"
          required
          sx={{ mb: 2.5 }}
        >
          <MenuItem value="">Select a student…</MenuItem>
          {students.map((s) => (
            <MenuItem key={s.student_id} value={s.student_id}>
              {s.full_name} ({s.student_id})
            </MenuItem>
          ))}
        </TextField>

        {loadingContext && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {studentContext && !loadingContext && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <ReadOnlyField label="Student name" value={studentContext.student_name} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <ReadOnlyField label="Student number" value={studentContext.student_id} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <ReadOnlyField label="Programme" value={studentContext.programme_name} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <ReadOnlyField label="Department" value={studentContext.department} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <ReadOnlyField label="Cohort" value={studentContext.cohort_year} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <ReadOnlyField label="Current stage" value={displayStage(studentContext.current_stage)} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <ReadOnlyField label="Expected completion date" value={fmtDate(studentContext.expected_completion_date)} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <ReadOnlyField
                label="Days overdue"
                value={studentContext.days_overdue > 0 ? `${studentContext.days_overdue} days` : '0 (on schedule)'}
                highlight={studentContext.days_overdue > 0}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.5 }}>
                  Current progress risk
                </Typography>
                <ProgressRiskChip riskLevel={studentContext.risk_level} daysOverdue={studentContext.days_overdue} />
              </Box>
            </Grid>
          </Grid>
        )}
      </SectionCard>

      <SectionCard
        title="2. Delay classification"
        subtitle="Structured categories allow the postgraduate office to compare bottlenecks across departments."
      >
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              select
              label="Primary delay category"
              value={primaryCategory}
              onChange={(e) => setPrimaryCategory(e.target.value)}
              fullWidth
              size="small"
              required
              helperText={DELAY_CATEGORIES.find((c) => c.value === primaryCategory)?.description}
            >
              <MenuItem value="">Select primary cause…</MenuItem>
              {DELAY_CATEGORIES.map((c) => (
                <MenuItem key={c.value} value={c.value}>{c.value}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              select
              label="Secondary delay category"
              value={secondaryCategory}
              onChange={(e) => setSecondaryCategory(e.target.value)}
              fullWidth
              size="small"
              helperText="Optional contributing factor"
            >
              <MenuItem value="">None</MenuItem>
              {DELAY_CATEGORIES.filter((c) => c.value !== primaryCategory).map((c) => (
                <MenuItem key={c.value} value={c.value}>{c.value}</MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard
        title="3. Narrative explanation"
        subtitle="Lead supervisor account of root cause, context and supporting facts."
      >
        <RichTextField
          label="Narrative explanation by lead supervisor"
          value={narrative}
          onChange={setNarrative}
          placeholder="Describe the root cause, timeline, and context of the delay…"
          required
          minRows={6}
          showWordCount
          helperText="Required. Use structured paragraphs or bullet lists where helpful."
        />
      </SectionCard>

      <SectionCard title="4. Evidence attached" subtitle="Upload correspondence, permits, finance letters, draft feedback, or other supporting documents.">
        <Button
          variant="outlined"
          component="label"
          startIcon={<UploadIcon />}
          sx={{ mb: 1.5 }}
        >
          Choose file
          <input
            type="file"
            hidden
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.zip"
            onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
          />
        </Button>
        {evidenceFile ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AttachIcon sx={{ fontSize: 18, color: ACCENT }} />
            <Typography sx={{ fontSize: 13 }}>{evidenceFile.name}</Typography>
            <Button size="small" onClick={() => setEvidenceFile(null)}>Remove</Button>
          </Box>
        ) : (
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            PDF, Word, images, or ZIP up to 50 MB.
          </Typography>
        )}
      </SectionCard>

      <SectionCard title="5. Supervisor actions and institutional response">
        <RichTextField
          label="Action already taken by supervisor"
          value={actionTaken}
          onChange={setActionTaken}
          placeholder="Meetings held, feedback given, resources shared, deadlines agreed…"
          minRows={4}
          showWordCount
        />
        <RichTextField
          label="Recommended institutional intervention"
          value={recommendedIntervention}
          onChange={setRecommendedIntervention}
          placeholder="Scholarship review, ethics follow-up, writing clinic, data support, supervisor reassignment…"
          minRows={4}
          showWordCount
          sx={{ mb: 2 }}
        />

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              label="Revised milestone date"
              type="date"
              value={revisedMilestoneDate}
              onChange={(e) => setRevisedMilestoneDate(e.target.value)}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              helperText="Proposed new target for the current stage"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              select
              label="Risk level"
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value)}
              fullWidth
              size="small"
              helperText={RISK_LEVELS.find((r) => r.value === riskLevel)?.description}
            >
              {RISK_LEVELS.map((r) => (
                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>
              Escalation needed
            </Typography>
            <RadioGroup
              row
              value={escalationNeeded}
              onChange={(e) => setEscalationNeeded(e.target.value)}
            >
              <FormControlLabel value="no" control={<Radio size="small" />} label="No" />
              <FormControlLabel value="yes" control={<Radio size="small" />} label="Yes" />
            </RadioGroup>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              Select Yes if the postgraduate office or HOD should intervene immediately.
            </Typography>
          </Grid>
        </Grid>
      </SectionCard>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleSubmit}
          disabled={!canSubmit}
          sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#159089' }, minWidth: 200 }}
        >
          {submitting ? 'Submitting…' : 'Submit delay report'}
        </Button>
      </Box>
    </Box>
  );
}
