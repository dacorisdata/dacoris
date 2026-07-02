'use client';

import { useEffect, useState } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import { useParams, useSearchParams } from 'next/navigation';
import pgApi from '../../../../../lib/postgraduateApi';
import PgStudentProfileView from '../../../../../components/postgraduate/PgStudentProfileView';

export default function AdminPgStudentDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const fromClearance = searchParams.get('from') === 'clearance';
  const [data, setData] = useState(null);
  const [clearance, setClearance] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    Promise.all([
      pgApi.getStudent(params.id),
      pgApi.getClearance(params.id),
    ])
      .then(([studentRes, clearanceRes]) => {
        setData(studentRes.data);
        setClearance(clearanceRes.data?.clearance || null);
      })
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
      clearance={clearance}
      backHref={fromClearance ? '/admin-staff/postgraduate/clearance' : '/admin-staff/postgraduate/students'}
      backLabel={fromClearance ? 'Back to clearance' : 'Back to students'}
    />
  );
}
