'use client';

import { useEffect, useState } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import { useParams } from 'next/navigation';
import pgApi from '../../../../../../lib/postgraduateApi';
import PgStudentProfileView from '../../../../../../components/postgraduate/PgStudentProfileView';

export default function SupervisorStudentDetailPage() {
  const params = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    pgApi.supervisorStudent(params.id)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Unable to load student'))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', width: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 }, width: '100%' }}>
        <Alert severity="warning">{error}</Alert>
      </Box>
    );
  }

  return (
    <PgStudentProfileView
      data={data}
      backHref="/researcher/postgraduate/supervisor/students"
      backLabel="Back to students"
      studentId={params.id}
      showDelayReportAction
    />
  );
}
