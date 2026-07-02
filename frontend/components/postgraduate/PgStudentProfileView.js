'use client';

import { useMemo } from 'react';
import {
  Box,
  Button,
  Grid,
  Paper,
  Typography,
  Chip,
  LinearProgress,
  useTheme,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  ReportProblem as DelayIcon,
  School as SchoolIcon,
  AccountBalanceWallet as FinanceIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { JourneyCanvas } from './JourneyCanvas';
import {
  ACCENT,
  HERO_GRADIENT,
  ProgressRiskChip,
  displayStage,
} from './SupervisorUi';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtKes = (n) =>
  n == null ? '—' : `KES ${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const CLEARANCE_ITEMS = [
  ['coursework_cleared', 'Coursework'],
  ['supervisor_cleared', 'Supervisor assigned'],
  ['proposal_cleared', 'Proposal approved'],
  ['ethics_cleared', 'Ethics / DMP cleared'],
  ['thesis_cleared', 'Thesis ready'],
  ['defense_cleared', 'Defense passed'],
  ['publication_cleared', 'Publication requirement'],
  ['finance_cleared', 'Finance clearance'],
];

function InfoRow({ label, value }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 2,
        py: 0.85,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography sx={{ fontSize: 12, color: 'text.secondary', flexShrink: 0 }}>{label}</Typography>
      <Typography sx={{ fontSize: 12, fontWeight: 600, textAlign: 'right' }}>{value || '—'}</Typography>
    </Box>
  );
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 2.5 },
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        {Icon && <Icon sx={{ fontSize: 18, color: ACCENT }} />}
        <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{title}</Typography>
      </Box>
      {children}
    </Paper>
  );
}

export default function PgStudentProfileView({
  data,
  clearance,
  backHref,
  backLabel = 'Back',
  studentId,
  showDelayReportAction = false,
}) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const student = data?.external?.student;
  const journey = data?.external?.journey;
  const assignments = data?.external?.supervisor_assignments || [];
  const account = data?.external?.finance_account;
  const stages = data?.journey_stages || [];

  const completedStages = useMemo(
    () => stages.filter((s) => (s.orchestration_status || s.excel_status || '').toLowerCase().includes('complete')).length,
    [stages],
  );
  const journeyProgress = stages.length ? Math.round((completedStages / stages.length) * 100) : 0;

  const leadSupervisor = assignments[0]?.lead_supervisor_name || journey?.lead_supervisor;
  const coSupervisor = assignments[0]?.co_supervisor_name;

  return (
    <Box sx={{ width: '100%', p: { xs: 2, md: 3 }, boxSizing: 'border-box' }}>
      <Button
        component={Link}
        href={backHref}
        size="small"
        startIcon={<BackIcon />}
        sx={{ mb: 2, color: 'text.secondary' }}
      >
        {backLabel}
      </Button>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3 },
          mb: 3,
          borderRadius: 2.5,
          width: '100%',
          background: dark ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' : HERO_GRADIENT,
          color: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ flex: '1 1 320px', minWidth: 0 }}>
            <Typography sx={{ fontSize: 13, opacity: 0.85, mb: 0.5 }}>
              {student?.student_id} · {student?.degree_level} · Cohort {student?.cohort_year || journey?.cohort || '—'}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.5 }}>
              {student?.full_name}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
              <Chip
                size="small"
                label={student?.programme_name}
                sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', fontWeight: 600, maxWidth: '100%' }}
              />
              {student?.department && (
                <Chip size="small" label={student.department} sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: '#fff' }} />
              )}
              <Chip
                size="small"
                label={journey?.overall_status || student?.status || 'Active'}
                sx={{ bgcolor: 'rgba(16,185,129,0.25)', color: '#6ee7b7', fontWeight: 700 }}
              />
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              <ProgressRiskChip
                riskLevel={journey?.risk_level || student?.risk_level}
                daysOverdue={journey?.days_overdue}
              />
              {displayStage(journey?.current_stage || student?.current_stage_name) !== '—' && (
                <Chip
                  size="small"
                  label={`Current: ${displayStage(journey?.current_stage || student?.current_stage_name)}`}
                  sx={{ bgcolor: `${ACCENT}44`, color: '#fff', fontWeight: 600 }}
                />
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'stretch', sm: 'flex-end' }, gap: 1.5 }}>
            <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, minWidth: 140 }}>
              <Typography sx={{ fontSize: 11, opacity: 0.75, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Journey progress
              </Typography>
              <Typography sx={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>
                {journeyProgress}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={journeyProgress}
                sx={{
                  mt: 1,
                  height: 6,
                  borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.15)',
                  '& .MuiLinearProgress-bar': { bgcolor: ACCENT, borderRadius: 3 },
                }}
              />
            </Box>
            {showDelayReportAction && studentId && (
              <Button
                component={Link}
                href={`/researcher/postgraduate/supervisor/delay-reports/new?student_id=${studentId}`}
                variant="contained"
                startIcon={<DelayIcon />}
                sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#159089' }, whiteSpace: 'nowrap' }}
              >
                Submit delay report
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {journey?.notes && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'warning.light',
            bgcolor: 'rgba(245,158,11,0.06)',
          }}
        >
          <Typography sx={{ fontSize: 13 }}>
            <strong>Supervisor notes:</strong> {journey.notes}
          </Typography>
        </Paper>
      )}

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4} lg={3}>
          <SectionCard title="Student profile" icon={SchoolIcon}>
            <InfoRow label="Student ID" value={student?.student_id} />
            <InfoRow label="Programme" value={student?.programme_name} />
            <InfoRow label="Study mode" value={student?.study_mode} />
            <InfoRow label="Enrolment" value={fmtDate(student?.enrolment_date)} />
            <InfoRow label="Expected graduation" value={fmtDate(journey?.expected_graduation || student?.expected_graduation_date)} />
            <InfoRow label="Lead supervisor" value={leadSupervisor} />
            {coSupervisor && <InfoRow label="Co-supervisor" value={coSupervisor} />}
          </SectionCard>
        </Grid>

        {account && (
          <Grid item xs={12} md={4} lg={3}>
            <SectionCard title="Finance summary" icon={FinanceIcon}>
              <InfoRow label="Total fee" value={fmtKes(account.total_programme_fee_kes)} />
              <InfoRow label="Paid" value={fmtKes(account.amount_paid_kes)} />
              <InfoRow label="Outstanding" value={fmtKes(account.outstanding_kes)} />
              <InfoRow label="Finance status" value={account.status} />
            </SectionCard>
          </Grid>
        )}

        <Grid item xs={12} md={account ? 4 : 8} lg={account ? 6 : 9}>
          <SectionCard title="Milestone snapshot">
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'uppercase' }}>Stages complete</Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 800 }}>{completedStages}/{stages.length}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'uppercase' }}>Days overdue</Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 800, color: (journey?.days_overdue || 0) > 0 ? 'error.main' : 'text.primary' }}>
                  {journey?.days_overdue ?? 0}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'uppercase' }}>Journey status</Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 700, mt: 0.5 }}>{journey?.overall_status || '—'}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'uppercase' }}>Progress risk</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <ProgressRiskChip riskLevel={journey?.risk_level} daysOverdue={journey?.days_overdue} />
                </Box>
              </Grid>
            </Grid>
          </SectionCard>
        </Grid>
      </Grid>

      {clearance && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 2.5 },
            mb: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 16 }}>Graduation clearance</Typography>
            <Chip
              label={clearance.status || 'Unknown'}
              color={clearance.status === 'cleared' ? 'success' : clearance.status === 'blocked' ? 'error' : 'warning'}
              size="small"
            />
          </Box>
          {clearance.blockers && (
            <Typography sx={{ fontSize: 13, color: 'error.main', mb: 2 }}>
              Blockers: {clearance.blockers}
            </Typography>
          )}
          <Grid container spacing={1}>
            {CLEARANCE_ITEMS.map(([key, label]) => (
              <Grid item xs={12} sm={6} md={3} key={key}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75 }}>
                  <Typography sx={{ fontSize: 13 }}>{label}</Typography>
                  <Chip
                    size="small"
                    label={clearance[key] ? 'Cleared' : 'Pending'}
                    color={clearance[key] ? 'success' : 'default'}
                  />
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 3 },
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: 16, mb: 0.5 }}>Postgraduate journey</Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 3 }}>
          Stage-by-stage progress with gate checks. Select a stage to view details.
        </Typography>
        <JourneyCanvas stages={stages} gates={data?.gates} />
      </Paper>
    </Box>
  );
}
