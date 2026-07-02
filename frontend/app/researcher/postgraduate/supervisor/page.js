'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Chip,
  useTheme,
} from '@mui/material';
import { ArrowForward as ArrowIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import pgApi from '../../../../lib/postgraduateApi';
import PgPageShell from '../../../../components/postgraduate/PgPageShell';
import {
  ACCENT,
  ProgressRiskChip,
  SupervisorPageHeader,
  SupervisorStatCard,
  displayStage,
  STAT_ICONS,
} from '../../../../components/postgraduate/SupervisorUi';

export default function SupervisorDashboardPage() {
  const router = useRouter();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pgApi.supervisorDashboard()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Unable to load supervisor dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', width: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return (
      <PgPageShell title="Supervisor Dashboard">
        <Alert severity="warning">{error}</Alert>
      </PgPageShell>
    );
  }

  const overdue = data.overdue_students || [];
  const assigned = data.assigned_students || [];
  const atRisk = assigned.filter((s) => (s.days_overdue || 0) > 0 || (s.overall_status || '').toLowerCase().includes('risk'));

  return (
    <Box sx={{ width: '100%', p: { xs: 2, md: 3 }, boxSizing: 'border-box' }}>
      <SupervisorPageHeader
        title="Supervisor Dashboard"
        subtitle="Monitor supervisee progress, overdue milestones, and pending progress report validations."
        dark={dark}
        actions={
          <Button
            variant="contained"
            onClick={() => router.push('/researcher/postgraduate/supervisor/students')}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#159089' } }}
          >
            View all students
          </Button>
        }
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <SupervisorStatCard
            icon={STAT_ICONS.students}
            label="Assigned students"
            value={data.total_assigned || 0}
            sub="Under your supervision"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SupervisorStatCard
            icon={STAT_ICONS.validations}
            label="Pending validations"
            value={data.pending_validations || 0}
            sub="Progress logs awaiting review"
            color="#3b82f6"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SupervisorStatCard
            icon={STAT_ICONS.overdue}
            label="Overdue milestones"
            value={overdue.length}
            sub="Past expected stage date"
            color="#ef4444"
            alert={overdue.length > 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SupervisorStatCard
            icon={STAT_ICONS.overdue}
            label="At-risk students"
            value={atRisk.length}
            sub="Delayed or flagged at risk"
            color="#f59e0b"
            alert={atRisk.length > 0}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        {overdue.length > 0 && (
          <Grid item xs={12} lg={4}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'error.light',
                bgcolor: 'rgba(239,68,68,0.04)',
                height: '100%',
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 0.5, color: 'error.main' }}>
                Needs attention
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
                Students with overdue stage milestones.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {overdue.slice(0, 5).map((s) => (
                  <Box
                    key={s.student_id}
                    onClick={() => router.push(`/researcher/postgraduate/supervisor/students/${s.student_id}`)}
                    sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      cursor: 'pointer',
                      '&:hover': { borderColor: ACCENT },
                    }}
                  >
                    <Typography sx={{ fontSize: 13, fontWeight: 650 }}>{s.full_name}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {displayStage(s.current_stage_name)} · {s.days_overdue} days overdue
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        )}

        <Grid item xs={12} lg={overdue.length > 0 ? 8 : 12}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Assigned students</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                  Quick overview of your supervisee portfolio
                </Typography>
              </Box>
              <Button
                size="small"
                endIcon={<ArrowIcon />}
                onClick={() => router.push('/researcher/postgraduate/supervisor/students')}
              >
                Full list
              </Button>
            </Box>

            {assigned.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography sx={{ color: 'text.secondary' }}>No students assigned yet.</Typography>
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Programme</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Stage</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assigned.slice(0, 8).map((s) => (
                    <TableRow
                      key={s.student_id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/researcher/postgraduate/supervisor/students/${s.student_id}`)}
                    >
                      <TableCell>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{s.full_name}</Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{s.student_id}</Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{s.programme_name}</TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{displayStage(s.current_stage_name)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
                          <Chip
                            size="small"
                            label={s.overall_status || s.status || 'Active'}
                            sx={{ fontWeight: 600, fontSize: 11 }}
                          />
                          <ProgressRiskChip riskLevel={s.risk_level} daysOverdue={s.days_overdue} />
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" onClick={(e) => { e.stopPropagation(); router.push(`/researcher/postgraduate/supervisor/students/${s.student_id}`); }}>
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
