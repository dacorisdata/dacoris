'use client';

import { useEffect, useState } from 'react';
import { Alert, Box, Chip, CircularProgress, Paper, Typography } from '@mui/material';
import pgApi from '../../../../lib/postgraduateApi';
import PgPageShell from '../../../../components/postgraduate/PgPageShell';

const CHECKLIST = [
  ['coursework_cleared', 'Coursework'],
  ['supervisor_cleared', 'Supervisor assigned'],
  ['proposal_cleared', 'Proposal approved'],
  ['ethics_cleared', 'Ethics / DMP cleared'],
  ['thesis_cleared', 'Thesis ready'],
  ['defense_cleared', 'Defense passed'],
  ['publication_cleared', 'Publication requirement'],
  ['finance_cleared', 'Finance clearance'],
];

export default function PgGraduationPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pgApi.getGraduationReadiness()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Unable to load graduation readiness'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

  const clearance = data?.clearance || {};
  const gates = data?.gates || {};
  const ready = gates.gate_h_graduation?.passed;

  return (
    <PgPageShell title="Graduation Readiness" subtitle="Checklist of requirements before graduation clearance.">
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 2.5, mb: 3, width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Overall status</Typography>
          <Chip label={clearance.status || (ready ? 'Ready' : 'Not ready')} color={ready ? 'success' : 'warning'} />
        </Box>
        {clearance.blockers && (
          <Alert severity="warning">Blockers: {clearance.blockers}</Alert>
        )}
        {!clearance.blockers && ready && (
          <Alert severity="success">All graduation gates are satisfied.</Alert>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5, width: '100%' }}>
        <Typography sx={{ fontWeight: 700, mb: 2 }}>Clearance checklist</Typography>
        {CHECKLIST.map(([key, label]) => (
          <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ fontSize: 14 }}>{label}</Typography>
            <Chip size="small" label={clearance[key] ? 'Cleared' : 'Pending'} color={clearance[key] ? 'success' : 'default'} />
          </Box>
        ))}
        {gates.gate_h_graduation && (
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 2 }}>
            Publications: {gates.gate_h_graduation.publications || 0} / {gates.gate_h_graduation.publications_required || 0}
          </Typography>
        )}
      </Paper>
    </PgPageShell>
  );
}
