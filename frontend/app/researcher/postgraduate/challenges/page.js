'use client';

import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, List, ListItem, ListItemText, Paper, TextField,
} from '@mui/material';
import pgApi from '../../../../lib/postgraduateApi';
import PgPageShell from '../../../../components/postgraduate/PgPageShell';

export default function PgChallengesPage() {
  const [challenges, setChallenges] = useState([]);
  const [form, setForm] = useState({ stage_name: '', narrative: '', required_action: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    pgApi.listChallenges()
      .then((res) => setChallenges(res.data.challenges || []))
      .catch((err) => setError(err.response?.data?.detail || 'Unable to load challenges'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await pgApi.reportChallenge(form);
      setForm({ stage_name: '', narrative: '', required_action: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit challenge report');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

  return (
    <PgPageShell title="Report Challenges" subtitle="Escalate delays, blockers, or support needs to PG administration.">
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 2.5, mb: 3, width: '100%' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Current stage (optional)" value={form.stage_name} onChange={(e) => setForm({ ...form, stage_name: e.target.value })} fullWidth size="small" />
          <TextField label="Describe the challenge" value={form.narrative} onChange={(e) => setForm({ ...form, narrative: e.target.value })} fullWidth multiline rows={4} required />
          <TextField label="Support needed (optional)" value={form.required_action} onChange={(e) => setForm({ ...form, required_action: e.target.value })} fullWidth size="small" />
          <Button variant="contained" onClick={handleSubmit} disabled={submitting || form.narrative.length < 10}>Submit challenge report</Button>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, width: '100%' }}>
        <List dense>
          {challenges.length === 0 ? (
            <ListItem><ListItemText primary="No challenge reports yet." /></ListItem>
          ) : challenges.map((c) => (
            <ListItem key={c.id} divider alignItems="flex-start">
              <ListItemText
                primary={c.required_action || c.expected_outcome || 'Challenge report'}
                secondary={`${c.stage_name || 'General'} · ${c.created_at?.slice(0, 10) || ''}`}
              />
              <Chip size="small" label={c.status} />
            </ListItem>
          ))}
        </List>
      </Paper>
    </PgPageShell>
  );
}
