'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import pgApi from '../../../../lib/postgraduateApi';
import PgStudentDashboard from '../../../../components/postgraduate/PgStudentDashboard';
import { useLanguage } from '../../../../contexts/LanguageContext';

const PL = 'researcher.pgJourney';

export default function PgJourneyPage() {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pgApi.getMyRecord()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'LOAD_FAILED'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning">{error === 'LOAD_FAILED' ? t(`${PL}.errorLoad`) : error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, width: '100%', boxSizing: 'border-box' }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        {t(`${PL}.title`)}
      </Typography>
      <Typography sx={{ color: 'text.secondary', mb: 3 }}>
        {t(`${PL}.subtitle`)}
      </Typography>
      <PgStudentDashboard data={data} />
    </Box>
  );
}
