'use client';

import Link from 'next/link';
import { Box, Paper, Typography } from '@mui/material';
import {
  Checklist as RequirementsIcon,
  Assignment as ProgressIcon,
  ReportProblem as ChallengesIcon,
  RateReview as FeedbackIcon,
  WorkspacePremium as GraduationIcon,
} from '@mui/icons-material';

const ACTIONS = [
  { label: 'Complete requirements', href: '/researcher/postgraduate/requirements', icon: RequirementsIcon },
  { label: 'Upload progress logs', href: '/researcher/postgraduate/progress', icon: ProgressIcon },
  { label: 'Report challenges', href: '/researcher/postgraduate/challenges', icon: ChallengesIcon },
  { label: 'Supervision feedback', href: '/researcher/postgraduate/feedback', icon: FeedbackIcon },
  { label: 'Graduation readiness', href: '/researcher/postgraduate/graduation', icon: GraduationIcon },
];

export default function PgStudentQuickActions() {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        width: '100%',
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 1.5 }}>Student actions</Typography>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          width: '100%',
        }}
      >
        {ACTIONS.map(({ label, href, icon: Icon }) => (
          <Box
            key={href}
            component={Link}
            href={href}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 1,
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              textDecoration: 'none',
              color: 'text.primary',
              flex: '1 1 200px',
              minWidth: 0,
              transition: 'all 0.15s ease',
              '&:hover': { bgcolor: 'action.hover', borderColor: '#1ca7a1' },
            }}
          >
            <Icon sx={{ fontSize: 18, color: '#1ca7a1', flexShrink: 0 }} />
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{label}</Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
