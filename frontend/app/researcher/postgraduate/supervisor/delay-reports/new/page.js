'use client';

import { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import DelayReportForm from '@/components/postgraduate/DelayReportForm';
import { SupervisorPageHeader } from '@/components/postgraduate/SupervisorUi';
import { useTheme } from '@mui/material/styles';

function NewDelayReportForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ width: '100%', p: { xs: 2, md: 3 }, boxSizing: 'border-box' }}>
      <SupervisorPageHeader
        title="Supervisor Delay Report"
        subtitle="Structured report (template 6.3) for the postgraduate office to classify bottlenecks and trigger interventions. All student context fields are captured automatically."
        dark={dark}
      />
      <DelayReportForm
        initialStudentId={searchParams.get('student_id') || ''}
        onSuccess={(id) => router.push(`/researcher/postgraduate/supervisor/delay-reports/${id}`)}
      />
    </Box>
  );
}

export default function NewDelayReportPage() {
  return (
    <Suspense fallback={
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    }>
      <NewDelayReportForm />
    </Suspense>
  );
}
