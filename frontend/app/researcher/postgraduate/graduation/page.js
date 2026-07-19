'use client';

import { useEffect, useState } from 'react';
import { Alert, Box, Chip, CircularProgress, Paper, Typography } from '@mui/material';
import pgApi from '../../../../lib/postgraduateApi';
import PgPageShell from '../../../../components/postgraduate/PgPageShell';
import { useLanguage } from '../../../../contexts/LanguageContext';

const PL = 'researcher.pgGraduation';

const CHECKLIST_KEYS = [
  'coursework_cleared',
  'supervisor_cleared',
  'proposal_cleared',
  'ethics_cleared',
  'thesis_cleared',
  'defense_cleared',
  'publication_cleared',
  'finance_cleared',
];

export default function PgGraduationPage() {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pgApi.getGraduationReadiness()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'LOAD_FAILED'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

  const clearance = data?.clearance || {};
  const gates = data?.gates || {};
  const ready = gates.gate_h_graduation?.passed;
  const displayError = error === 'LOAD_FAILED' ? t(`${PL}.errorLoad`) : error;

  const statusLabel = clearance.status || (ready ? t(`${PL}.ready`) : t(`${PL}.notReady`));

  return (
    <PgPageShell title={t(`${PL}.title`)} subtitle={t(`${PL}.subtitle`)}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{displayError}</Alert>}

      <Paper variant="outlined" sx={{ p: 2.5, mb: 3, width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{t(`${PL}.overallStatus`)}</Typography>
          <Chip label={statusLabel} color={ready ? 'success' : 'warning'} />
        </Box>
        {clearance.blockers && (
          <Alert severity="warning">{t(`${PL}.blockers`, { list: clearance.blockers })}</Alert>
        )}
        {!clearance.blockers && ready && (
          <Alert severity="success">{t(`${PL}.allGatesSatisfied`)}</Alert>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5, width: '100%' }}>
        <Typography sx={{ fontWeight: 700, mb: 2 }}>{t(`${PL}.clearanceChecklist`)}</Typography>
        {CHECKLIST_KEYS.map((key) => (
          <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ fontSize: 14 }}>{t(`${PL}.checklist.${key}`)}</Typography>
            <Chip
              size="small"
              label={clearance[key] ? t(`${PL}.cleared`) : t(`${PL}.pending`)}
              color={clearance[key] ? 'success' : 'default'}
            />
          </Box>
        ))}
        {gates.gate_h_graduation && (
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 2 }}>
            {t(`${PL}.publications`, {
              count: gates.gate_h_graduation.publications || 0,
              required: gates.gate_h_graduation.publications_required || 0,
            })}
          </Typography>
        )}
      </Paper>
    </PgPageShell>
  );
}
