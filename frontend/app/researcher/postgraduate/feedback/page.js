'use client';

import { useEffect, useState } from 'react';
import { Alert, Box, Chip, CircularProgress, Paper, Typography } from '@mui/material';
import pgApi from '../../../../lib/postgraduateApi';
import PgPageShell from '../../../../components/postgraduate/PgPageShell';
import { useLanguage } from '../../../../contexts/LanguageContext';

const PL = 'researcher.pgFeedback';

export default function PgFeedbackPage() {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pgApi.getFeedback()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'LOAD_FAILED'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

  const progressReports = data?.progress_reports || [];
  const supervisorReports = data?.supervisor_reports || [];
  const displayError = error === 'LOAD_FAILED' ? t(`${PL}.errorLoad`) : error;

  return (
    <PgPageShell title={t(`${PL}.title`)} subtitle={t(`${PL}.subtitle`)}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{displayError}</Alert>}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
        <Paper variant="outlined" sx={{ p: 2.5, width: '100%' }}>
          <Typography sx={{ fontWeight: 700, mb: 2 }}>{t(`${PL}.progressLogFeedback`)}</Typography>
          {progressReports.length === 0 ? (
            <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>{t(`${PL}.emptyProgress`)}</Typography>
          ) : progressReports.map((r) => (
            <Box key={r.id} sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 0.5 }}>
                <Typography sx={{ fontWeight: 600 }}>{r.current_stage || t(`${PL}.fallbackProgress`)}</Typography>
                <Chip size="small" label={r.status} />
              </Box>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{r.created_at?.slice(0, 10)}</Typography>
              {r.supervisor_validation ? (
                <Typography sx={{ fontSize: 13, mt: 1 }}><strong>{t(`${PL}.supervisor`)}</strong> {r.supervisor_validation}</Typography>
              ) : (
                <Typography sx={{ fontSize: 13, mt: 1, color: 'text.secondary' }}>{t(`${PL}.awaitingValidation`)}</Typography>
              )}
              {r.supervisor_rating && (
                <Typography sx={{ fontSize: 13 }}>{t(`${PL}.rating`, { value: r.supervisor_rating })}</Typography>
              )}
            </Box>
          ))}
        </Paper>

        <Paper variant="outlined" sx={{ p: 2.5, width: '100%' }}>
          <Typography sx={{ fontWeight: 700, mb: 2 }}>{t(`${PL}.supervisorReports`)}</Typography>
          {supervisorReports.length === 0 ? (
            <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>{t(`${PL}.emptySupervisor`)}</Typography>
          ) : supervisorReports.map((r) => (
            <Box key={r.id} sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography sx={{ fontWeight: 600 }}>{r.stage_name || r.report_type || t(`${PL}.fallbackSupervisor`)}</Typography>
              {r.achievements && <Typography sx={{ fontSize: 13, mt: 0.5 }}>{r.achievements}</Typography>}
              {r.next_milestone && <Typography sx={{ fontSize: 13 }}><strong>{t(`${PL}.next`)}</strong> {r.next_milestone}</Typography>}
              {r.risks && <Typography sx={{ fontSize: 13, color: 'warning.main' }}><strong>{t(`${PL}.risks`)}</strong> {r.risks}</Typography>}
              {r.recommended_intervention && (
                <Typography sx={{ fontSize: 13 }}><strong>{t(`${PL}.recommendedAction`)}</strong> {r.recommended_intervention}</Typography>
              )}
            </Box>
          ))}
        </Paper>
      </Box>
    </PgPageShell>
  );
}
