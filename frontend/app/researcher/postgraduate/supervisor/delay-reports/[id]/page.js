'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  Button,
  Chip,
  Divider,
} from '@mui/material';
import { ArrowBack as BackIcon, Download as DownloadIcon } from '@mui/icons-material';
import { useParams, useRouter } from 'next/navigation';
import pgApi from '@/lib/postgraduateApi';
import { displayStage, fmtDate } from '@/lib/delayReportConstants';
import { ProgressRiskChip, SupervisorPageHeader } from '@/components/postgraduate/SupervisorUi';
import { useTheme } from '@mui/material/styles';

function HtmlBlock({ html, empty = '—' }) {
  if (!html || html === '<p></p>') {
    return <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>{empty}</Typography>;
  }
  return (
    <Box
      sx={{
        fontSize: 14,
        lineHeight: 1.65,
        '& p': { mb: 1, '&:last-child': { mb: 0 } },
        '& ul, & ol': { pl: 2.5, mb: 1 },
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function Field({ label, children }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.75 }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

export default function DelayReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    pgApi.getDelayReport(params.id)
      .then((res) => setReport(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Unable to load report'))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleDownloadEvidence = async () => {
    setDownloading(true);
    try {
      const res = await pgApi.downloadDelayReportEvidence(params.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', report.evidence_filename || 'evidence');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Unable to download evidence file.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error && !report) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Alert severity="warning">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: { xs: 2, md: 3 }, boxSizing: 'border-box' }}>
      <Button
        size="small"
        startIcon={<BackIcon />}
        onClick={() => router.push('/researcher/postgraduate/supervisor/delay-reports/new')}
        sx={{ mb: 2, color: 'text.secondary' }}
      >
        New report
      </Button>

      <SupervisorPageHeader
        title="Delay Report Submitted"
        subtitle={`Reference ${report.id.slice(0, 8).toUpperCase()} · Submitted ${fmtDate(report.created_at)}`}
        dark={dark}
        actions={
          report.has_evidence ? (
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadEvidence}
              disabled={downloading}
              sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}
            >
              {downloading ? 'Downloading…' : 'Download evidence'}
            </Button>
          ) : null
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 2.5 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 2 }}>Student identification</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}><Field label="Student name"><Typography sx={{ fontWeight: 600 }}>{report.student_name}</Typography></Field></Grid>
          <Grid item xs={12} sm={6} md={3}><Field label="Student number"><Typography sx={{ fontWeight: 600 }}>{report.student_id}</Typography></Field></Grid>
          <Grid item xs={12} sm={6} md={3}><Field label="Programme"><Typography>{report.programme_name}</Typography></Field></Grid>
          <Grid item xs={12} sm={6} md={3}><Field label="Department"><Typography>{report.department}</Typography></Field></Grid>
          <Grid item xs={12} sm={6} md={3}><Field label="Cohort"><Typography>{report.cohort_year || '—'}</Typography></Field></Grid>
          <Grid item xs={12} sm={6} md={3}><Field label="Current stage"><Typography>{displayStage(report.stage_name)}</Typography></Field></Grid>
          <Grid item xs={12} sm={6} md={3}><Field label="Expected completion"><Typography>{fmtDate(report.expected_completion_date)}</Typography></Field></Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Field label="Days overdue">
              <Typography sx={{ fontWeight: 700, color: (report.days_overdue || 0) > 0 ? 'error.main' : 'text.primary' }}>
                {report.days_overdue > 0 ? `${report.days_overdue} days` : '0 (on schedule)'}
              </Typography>
            </Field>
          </Grid>
        </Grid>
      </Paper>

      <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 2.5 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 2 }}>Delay classification</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Field label="Primary delay category">
              <Chip label={report.primary_delay_category} sx={{ fontWeight: 600 }} />
            </Field>
          </Grid>
          <Grid item xs={12} md={6}>
            <Field label="Secondary delay category">
              {report.secondary_delay_category ? (
                <Chip label={report.secondary_delay_category} variant="outlined" />
              ) : (
                <Typography sx={{ color: 'text.secondary' }}>None</Typography>
              )}
            </Field>
          </Grid>
        </Grid>
      </Paper>

      <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 2.5 }}>
        <Field label="Narrative explanation by lead supervisor">
          <HtmlBlock html={report.narrative} empty="No narrative provided." />
        </Field>
        <Divider sx={{ my: 2 }} />
        <Field label="Evidence attached">
          {report.has_evidence ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 14 }}>{report.evidence_filename}</Typography>
              <Button size="small" startIcon={<DownloadIcon />} onClick={handleDownloadEvidence} disabled={downloading}>
                Download
              </Button>
            </Box>
          ) : (
            <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>No file attached</Typography>
          )}
        </Field>
      </Paper>

      <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 2 }}>Actions and institutional response</Typography>
        <Field label="Action already taken by supervisor">
          <HtmlBlock html={report.action_taken} empty="None recorded." />
        </Field>
        <Field label="Recommended institutional intervention">
          <HtmlBlock html={report.recommended_intervention} empty="None recommended." />
        </Field>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Field label="Revised milestone date">
              <Typography sx={{ fontWeight: 600 }}>{fmtDate(report.revised_milestone_date)}</Typography>
            </Field>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Field label="Risk level">
              <ProgressRiskChip riskLevel={report.risk_level} daysOverdue={report.days_overdue} />
            </Field>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Field label="Escalation needed">
              <Chip
                label={report.escalation_needed ? 'Yes' : 'No'}
                color={report.escalation_needed ? 'error' : 'default'}
                sx={{ fontWeight: 700 }}
              />
            </Field>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
