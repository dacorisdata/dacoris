'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, TextField, Button, Paper, List, ListItem, ListItemText, Chip } from '@mui/material';
import pgApi from '../../../../lib/postgraduateApi';
import PgPageShell from '../../../../components/postgraduate/PgPageShell';

export default function PgProgressPage() {
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
      .catch((err) => setError(err.response?.data?.detail || 'Unable to load progress logs'))
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
      setError(err.response?.data?.detail || 'Failed to submit progress log');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

  return (
    <PgPageShell
      title="Progress Logs"
      subtitle="Upload periodic progress updates for supervisor review."
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 2.5, mb: 3, width: '100%' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Current stage" value={form.current_stage} onChange={(e) => setForm({ ...form, current_stage: e.target.value })} fullWidth size="small" />
          <TextField label="Activities completed" value={form.activities_completed} onChange={(e) => setForm({ ...form, activities_completed: e.target.value })} fullWidth multiline rows={3} size="small" />
          <TextField label="Challenges encountered" value={form.challenges} onChange={(e) => setForm({ ...form, challenges: e.target.value })} fullWidth multiline rows={2} size="small" />
          <TextField label="Support requested" value={form.requested_support} onChange={(e) => setForm({ ...form, requested_support: e.target.value })} fullWidth size="small" />
          <TextField label="Next planned activity" value={form.next_planned_activity} onChange={(e) => setForm({ ...form, next_planned_activity: e.target.value })} fullWidth size="small" />
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>Submit progress log</Button>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, width: '100%' }}>
        <Typography sx={{ fontWeight: 600, mb: 1 }}>Previous logs</Typography>
        <List dense>
          {reports.length === 0 ? (
            <ListItem><ListItemText primary="No progress logs submitted yet." /></ListItem>
          ) : reports.map((r) => (
            <ListItem key={r.id} divider>
              <ListItemText
                primary={r.current_stage || 'Progress log'}
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
