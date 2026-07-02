'use client';

import { useEffect, useState } from 'react';
import { Alert, Box, Chip, CircularProgress, Paper, Typography } from '@mui/material';
import pgApi from '../../../../lib/postgraduateApi';
import PgPageShell from '../../../../components/postgraduate/PgPageShell';

export default function PgFeedbackPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pgApi.getFeedback()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Unable to load supervision feedback'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

  const progressReports = data?.progress_reports || [];
  const supervisorReports = data?.supervisor_reports || [];

  return (
    <PgPageShell title="Supervision Feedback" subtitle="Review supervisor validation on your progress logs and formal supervisor reports.">
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
        <Paper variant="outlined" sx={{ p: 2.5, width: '100%' }}>
          <Typography sx={{ fontWeight: 700, mb: 2 }}>Progress log feedback</Typography>
          {progressReports.length === 0 ? (
            <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>No progress reports yet.</Typography>
          ) : progressReports.map((r) => (
            <Box key={r.id} sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 0.5 }}>
                <Typography sx={{ fontWeight: 600 }}>{r.current_stage || 'Progress report'}</Typography>
                <Chip size="small" label={r.status} />
              </Box>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{r.created_at?.slice(0, 10)}</Typography>
              {r.supervisor_validation ? (
                <Typography sx={{ fontSize: 13, mt: 1 }}><strong>Supervisor:</strong> {r.supervisor_validation}</Typography>
              ) : (
                <Typography sx={{ fontSize: 13, mt: 1, color: 'text.secondary' }}>Awaiting supervisor validation</Typography>
              )}
              {r.supervisor_rating && (
                <Typography sx={{ fontSize: 13 }}>Rating: {r.supervisor_rating}</Typography>
              )}
            </Box>
          ))}
        </Paper>

        <Paper variant="outlined" sx={{ p: 2.5, width: '100%' }}>
          <Typography sx={{ fontWeight: 700, mb: 2 }}>Supervisor reports</Typography>
          {supervisorReports.length === 0 ? (
            <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>No formal supervisor reports yet.</Typography>
          ) : supervisorReports.map((r) => (
            <Box key={r.id} sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography sx={{ fontWeight: 600 }}>{r.stage_name || r.report_type || 'Supervisor report'}</Typography>
              {r.achievements && <Typography sx={{ fontSize: 13, mt: 0.5 }}>{r.achievements}</Typography>}
              {r.next_milestone && <Typography sx={{ fontSize: 13 }}><strong>Next:</strong> {r.next_milestone}</Typography>}
              {r.risks && <Typography sx={{ fontSize: 13, color: 'warning.main' }}><strong>Risks:</strong> {r.risks}</Typography>}
              {r.recommended_intervention && (
                <Typography sx={{ fontSize: 13 }}><strong>Recommended action:</strong> {r.recommended_intervention}</Typography>
              )}
            </Box>
          ))}
        </Paper>
      </Box>
    </PgPageShell>
  );
}
