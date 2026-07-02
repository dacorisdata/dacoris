'use client';

import { useEffect, useState } from 'react';
import { Alert, Box, Chip, CircularProgress, Paper, Typography } from '@mui/material';
import pgApi from '../../../../lib/postgraduateApi';
import PgPageShell from '../../../../components/postgraduate/PgPageShell';
import { StageGateBadge } from '../../../../components/postgraduate/JourneyCanvas';

export default function PgRequirementsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pgApi.getRequirements()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Unable to load requirements'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

  const gates = data?.gates || {};
  const rules = data?.programme_rules || [];

  return (
    <PgPageShell
      title="Programme Requirements"
      subtitle="Track completion of coursework, supervision, ethics, thesis, publications, and finance gates."
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 2.5, mb: 3, width: '100%' }}>
        <Typography sx={{ fontWeight: 700, mb: 2 }}>Stage gates</Typography>
        <StageGateBadge label="Gate A — Coursework" passed={gates.gate_a_coursework?.passed} detail={`${gates.gate_a_coursework?.completed_units || 0}/${gates.gate_a_coursework?.required_units || 0} units`} />
        <StageGateBadge label="Gate B — Supervisor" passed={gates.gate_b_supervisor?.passed} detail={gates.gate_b_supervisor?.lead_supervisor} />
        <StageGateBadge label="Gate C — Proposal" passed={gates.gate_c_proposal?.passed} detail={gates.gate_c_proposal?.status} />
        <StageGateBadge label="Gate D — Ethics/DMP" passed={gates.gate_d_research_cleared?.passed} />
        <StageGateBadge label="Gate F — Thesis ready" passed={gates.gate_f_thesis_ready?.passed} />
        <StageGateBadge label="Gate G — Defense" passed={gates.gate_g_defense?.passed} detail={gates.gate_g_defense?.outcome} />
        <StageGateBadge label="Gate H — Graduation" passed={gates.gate_h_graduation?.passed} />
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5, width: '100%' }}>
        <Typography sx={{ fontWeight: 700, mb: 2 }}>Programme rules (from LMS)</Typography>
        {rules.length === 0 ? (
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>No programme rules found.</Typography>
        ) : (
          rules.map((rule) => (
            <Box key={rule.rule_id} sx={{ py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{rule.rule_type}</Typography>
                {rule.mandatory && <Chip size="small" label="Mandatory" color="warning" />}
              </Box>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>{rule.rule_description}</Typography>
              {rule.min_value != null && (
                <Typography sx={{ fontSize: 12, mt: 0.5 }}>Minimum: {rule.min_value}</Typography>
              )}
            </Box>
          ))
        )}
      </Paper>
    </PgPageShell>
  );
}
