'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, TextField, Button, Paper, List, ListItem, ListItemText, Chip } from '@mui/material';
import pgApi from '../../../../lib/postgraduateApi';
import PgPageShell from '../../../../components/postgraduate/PgPageShell';
import { useLanguage } from '../../../../contexts/LanguageContext';

const PL = 'researcher.pgProgress';

export default function PgProgressPage() {
  const { t } = useLanguage();
  const [reports, setReports] = useState([]);
  const [form, setForm] = useState({
    current_stage: '',
    activities_completed: '',
    challenges: '',
    requested_support: '',
    next_planned_activity: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    pgApi.listProgressReports()
      .then((res) => setReports(res.data.reports || []))
      .catch((err) => setError(err.response?.data?.detail || 'LOAD_FAILED'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await pgApi.createProgressReport(form);
      setForm({
        current_stage: '',
        activities_completed: '',
        challenges: '',
        requested_support: '',
        next_planned_activity: '',
      });
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'SUBMIT_FAILED');
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = error === 'LOAD_FAILED'
    ? t(`${PL}.errorLoad`)
    : error === 'SUBMIT_FAILED'
      ? t(`${PL}.errorSubmit`)
      : error;

  if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

  return (
    <PgPageShell
      title={t(`${PL}.title`)}
      subtitle={t(`${PL}.subtitle`)}
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{displayError}</Alert>}

      <Paper variant="outlined" sx={{ p: 2.5, mb: 3, width: '100%' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label={t(`${PL}.form.currentStage`)} value={form.current_stage} onChange={(e) => setForm({ ...form, current_stage: e.target.value })} fullWidth size="small" />
          <TextField label={t(`${PL}.form.activitiesCompleted`)} value={form.activities_completed} onChange={(e) => setForm({ ...form, activities_completed: e.target.value })} fullWidth multiline rows={3} size="small" />
          <TextField label={t(`${PL}.form.challenges`)} value={form.challenges} onChange={(e) => setForm({ ...form, challenges: e.target.value })} fullWidth multiline rows={2} size="small" />
          <TextField label={t(`${PL}.form.supportRequested`)} value={form.requested_support} onChange={(e) => setForm({ ...form, requested_support: e.target.value })} fullWidth size="small" />
          <TextField label={t(`${PL}.form.nextPlannedActivity`)} value={form.next_planned_activity} onChange={(e) => setForm({ ...form, next_planned_activity: e.target.value })} fullWidth size="small" />
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>{t(`${PL}.form.submit`)}</Button>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, width: '100%' }}>
        <Typography sx={{ fontWeight: 600, mb: 1 }}>{t(`${PL}.previousLogs`)}</Typography>
        <List dense>
          {reports.length === 0 ? (
            <ListItem><ListItemText primary={t(`${PL}.empty`)} /></ListItem>
          ) : reports.map((r) => (
            <ListItem key={r.id} divider>
              <ListItemText
                primary={r.current_stage || t(`${PL}.fallbackTitle`)}
                secondary={r.created_at?.slice(0, 10)}
              />
              <Chip size="small" label={r.status} />
            </ListItem>
          ))}
        </List>
      </Paper>
    </PgPageShell>
  );
}
