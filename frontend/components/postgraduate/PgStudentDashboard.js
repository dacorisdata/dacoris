'use client';

import { useMemo } from 'react';
import {
  Box,
  Chip,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import {
  MenuBook as CreditsIcon,
  EventAvailable as AttendanceIcon,
  AccountBalanceWallet as FinanceIcon,
  Article as PubIcon,
  Science as ResearchIcon,
} from '@mui/icons-material';
import { JourneyCanvas } from './JourneyCanvas';
import PgStudentQuickActions from './PgStudentQuickActions';
import { ProgressRiskChip, normalizeRiskLevel } from './SupervisorUi';

const ACCENT = '#1ca7a1';
const HERO_GRADIENT = 'linear-gradient(135deg, #1e3a5f 0%, #243b53 55%, #1a365d 100%)';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtKes = (n) =>
  n == null ? '—' : `KES ${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

function isDateLike(value) {
  return /^\d{4}-\d{2}-\d{2}/.test(String(value || '').trim());
}

function programmeNote(notes) {
  const text = String(notes || '').trim();
  if (!text || isDateLike(text)) return '';
  return text;
}

function displayStage(name) {
  if (!name) return '';
  return name.replace(/^Stage\s+\d+\s*:?\s*/i, '').trim();
}

function StatCard({ icon: Icon, label, value, sub, color = ACCENT }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        flex: '1 1 200px',
        minWidth: 0,
        width: '100%',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            bgcolor: `${color}14`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon sx={{ fontSize: 20, color }} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}>
            {label}
          </Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2, mt: 0.25 }}>{value}</Typography>
          {sub && (
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.35 }}>{sub}</Typography>
          )}
        </Box>
      </Box>
    </Paper>
  );
}

function GradeBars({ enrolments }) {
  const grades = useMemo(() => {
    const counts = {};
    enrolments.forEach((e) => {
      const g = e.grade?.trim();
      if (!g) return;
      counts[g] = (counts[g] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [enrolments]);

  const max = grades[0]?.[1] || 1;

  if (!grades.length) {
    return <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No graded courses yet.</Typography>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      {grades.map(([grade, count]) => (
        <Box key={grade}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.35 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{grade}</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{count}</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(count / max) * 100}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: 'action.hover',
              '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: ACCENT },
            }}
          />
        </Box>
      ))}
    </Box>
  );
}

function ProfileRow({ label, value }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Typography sx={{ fontSize: 12, color: 'text.secondary', flexShrink: 0 }}>{label}</Typography>
      <Typography sx={{ fontSize: 12, fontWeight: 600, textAlign: 'right' }}>{value || '—'}</Typography>
    </Box>
  );
}

function SectionCard({ title, children, action, sx }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 2.5 },
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        width: '100%',
        boxSizing: 'border-box',
        ...sx,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 2 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{title}</Typography>
        {action}
      </Box>
      {children}
    </Paper>
  );
}

export default function PgStudentDashboard({ data }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const student = data?.external?.student;
  const journey = data?.external?.journey;
  const enrolments = data?.external?.enrolments || [];
  const account = data?.external?.finance_account;
  const transactions = data?.external?.transactions || [];
  const assignments = data?.external?.supervisor_assignments || [];
  const programme = data?.external?.programme;
  const gates = data?.gates || {};
  const proposal = data?.orchestration?.proposal;
  const stages = data?.journey_stages || [];

  const leadSupervisor =
    assignments[0]?.lead_supervisor_name || journey?.lead_supervisor || '—';
  const coSupervisor = assignments[0]?.co_supervisor_name;

  const completedStages = stages.filter((s) =>
    (s.orchestration_status || s.excel_status || '').toLowerCase().includes('complete'),
  ).length;
  const journeyProgress = stages.length ? Math.round((completedStages / stages.length) * 100) : 0;

  const graded = enrolments.filter((e) => e.mark_pct != null);
  const avgMark = graded.length
    ? (graded.reduce((sum, e) => sum + Number(e.mark_pct), 0) / graded.length).toFixed(1)
    : null;

  const creditsCompleted = gates.gate_a_coursework?.completed_units ?? graded.length;
  const creditsRequired = gates.gate_a_coursework?.required_units ?? programme?.min_coursework_units ?? programme?.total_credits ?? '—';

  const pubStage = stages.find((s) => s.stage_no === 8);
  const pubCount = pubStage?.extra?.pub_count ?? journey?.pub_count ?? 0;
  const pubRequired = programme?.pub_requirement ?? 0;

  const expectedGraduation =
    journey?.expected_graduation || student?.expected_graduation_date;
  const statusNote = programmeNote(journey?.notes);
  const progressRisk = normalizeRiskLevel(journey?.risk_level) ? journey?.risk_level : null;
  const overallStatus = journey?.overall_status || student?.status;

  const currentStageLabel = displayStage(journey?.current_stage || student?.current_stage_name || '');

  const researchMeta = [
    currentStageLabel && { label: 'Current stage', value: currentStageLabel },
    overallStatus && { label: 'Programme status', value: overallStatus },
    expectedGraduation && { label: 'Expected graduation', value: fmtDate(expectedGraduation) },
  ].filter(Boolean);

  const researchTitle =
    proposal?.title ||
    `${student?.degree_level || 'Postgraduate'} research — ${student?.programme_name || 'Programme'}`;

  const firstName = student?.full_name?.split(' ')[0] || 'Student';

  const financeMetrics = account
    ? [
        { label: 'Total programme fee', value: fmtKes(account.total_programme_fee_kes) },
        { label: 'Amount paid', value: fmtKes(account.amount_paid_kes) },
        { label: 'Scholarship', value: fmtKes(account.scholarship_kes) },
        { label: 'Outstanding', value: fmtKes(account.outstanding_kes) },
      ]
    : [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
      {/* Welcome hero */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3 },
          borderRadius: 2.5,
          width: '100%',
          boxSizing: 'border-box',
          background: dark ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' : HERO_GRADIENT,
          color: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ flex: '1 1 320px', minWidth: 0 }}>
            <Typography sx={{ fontSize: 13, opacity: 0.85, mb: 0.5 }}>
              {student?.student_id} · {student?.institution}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.5 }}>
              Welcome back, {firstName}!
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip
                size="small"
                label={`${student?.degree_level || 'PG'} · ${student?.programme_name || 'Programme'}`}
                sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', fontWeight: 600 }}
              />
              <Chip
                size="small"
                label={`Supervisor: ${leadSupervisor}`}
                sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', fontWeight: 600 }}
              />
              <Chip
                size="small"
                label={student?.status || journey?.overall_status || 'Active'}
                sx={{ bgcolor: 'rgba(16,185,129,0.25)', color: '#6ee7b7', fontWeight: 700 }}
              />
              {currentStageLabel && (
                <Chip
                  size="small"
                  label={currentStageLabel}
                  sx={{ bgcolor: `${ACCENT}44`, color: '#fff', fontWeight: 600 }}
                />
              )}
            </Box>
          </Box>
          {avgMark && (
            <Box sx={{ flexShrink: 0, textAlign: { xs: 'left', sm: 'right' } }}>
              <Typography sx={{ fontSize: 11, opacity: 0.75, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Coursework average
              </Typography>
              <Typography sx={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>
                {avgMark}
                <Typography component="span" sx={{ fontSize: 14, opacity: 0.7, ml: 0.5 }}>%</Typography>
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Research focus */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 2.5 },
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderLeft: `4px solid ${ACCENT}`,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
          <ResearchIcon sx={{ color: ACCENT, mt: 0.25, flexShrink: 0 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.5 }}>
              Research focus
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: { xs: 16, md: 18 }, mb: 1 }}>
              {researchTitle}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
              {student?.department && (
                <Chip size="small" label={student.department} variant="outlined" />
              )}
              {student?.programme_code && (
                <Chip size="small" label={student.programme_code} variant="outlined" />
              )}
            </Box>
            {researchMeta.length > 0 && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                  gap: 1.25,
                  mb: statusNote || progressRisk ? 1.5 : 0,
                }}
              >
                {researchMeta.map((item) => (
                  <Box key={item.label}>
                    <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      {item.label}
                    </Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, mt: 0.25 }}>{item.value}</Typography>
                  </Box>
                ))}
                <Box>
                  <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    Progress risk
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <ProgressRiskChip
                      riskLevel={progressRisk}
                      daysOverdue={journey?.days_overdue}
                    />
                  </Box>
                </Box>
              </Box>
            )}
            {statusNote && (
              <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.5 }}>
                <strong>Programme note:</strong> {statusNote}
              </Typography>
            )}
          </Box>
        </Box>
      </Paper>

      <PgStudentQuickActions />

      {/* Summary stats */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          width: '100%',
        }}
      >
        <StatCard
          icon={CreditsIcon}
          label="Coursework units"
          value={creditsCompleted}
          sub={creditsRequired !== '—' ? `${creditsRequired} required` : `${enrolments.length} courses enrolled`}
        />
        <StatCard
          icon={AttendanceIcon}
          label="Programme progress"
          value={`${journeyProgress}%`}
          sub={`${completedStages} of ${stages.length} stages complete`}
          color="#6366f1"
        />
        <StatCard
          icon={FinanceIcon}
          label="Balance due"
          value={fmtKes(account?.outstanding_kes ?? 0)}
          sub={account?.payment_status || 'No finance record'}
          color="#f59e0b"
        />
        <StatCard
          icon={PubIcon}
          label="Publications"
          value={pubCount}
          sub={pubRequired ? `${pubRequired} required for programme` : 'Research outputs'}
          color="#10b981"
        />
      </Box>

      {/* Journey timeline */}
      <SectionCard
        title="Academic Journey"
        action={
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: ACCENT, flexShrink: 0 }}>
            {journeyProgress}% complete
          </Typography>
        }
      >
        {(leadSupervisor !== '—' || coSupervisor) && (
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>
            {leadSupervisor !== '—' && `Lead: ${leadSupervisor}`}
            {coSupervisor && ` · Co-supervisor: ${coSupervisor}`}
          </Typography>
        )}
        <JourneyCanvas stages={stages} gates={gates} showGateSummary={false} />
      </SectionCard>

      {/* Courses — full width */}
      <SectionCard title="Current courses">
        <Box sx={{ overflowX: 'auto', width: '100%' }}>
          <Table size="small" sx={{ width: '100%' }}>
            <TableHead>
              <TableRow>
                <TableCell>Course</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Year</TableCell>
                <TableCell align="right">Mark</TableCell>
                <TableCell>Grade</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {enrolments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography sx={{ fontSize: 13, color: 'text.secondary', py: 1 }}>
                      No coursework enrolments on record.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                enrolments.map((e) => (
                  <TableRow key={e.enrolment_id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{e.course_name}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{e.course_code}</TableCell>
                    <TableCell>{e.academic_year || '—'}</TableCell>
                    <TableCell align="right">{e.mark_pct ?? '—'}</TableCell>
                    <TableCell>
                      {e.grade ? (
                        <Chip size="small" label={e.grade} color="success" sx={{ fontWeight: 700, minWidth: 36 }} />
                      ) : '—'}
                    </TableCell>
                    <TableCell>{e.status || '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      </SectionCard>

      {/* Financial summary — full width */}
      <SectionCard title="Financial summary">
        {account ? (
          <Box sx={{ width: '100%' }}>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 2,
                mb: 2,
                width: '100%',
              }}
            >
              {financeMetrics.map((row) => (
                <Box key={row.label} sx={{ flex: '1 1 160px', minWidth: 0 }}>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{row.label}</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{row.value}</Typography>
                </Box>
              ))}
            </Box>
            <Chip
              size="small"
              label={account.finance_clearance ? 'Finance clearance granted' : `Payment: ${account.payment_status || 'Pending'}`}
              color={account.finance_clearance ? 'success' : 'default'}
              sx={{ mb: 2 }}
            />
            {transactions.length > 0 && (
              <Box sx={{ width: '100%' }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>Recent payments</Typography>
                {transactions.slice(0, 4).map((t) => (
                  <Box
                    key={t.transaction_id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 2,
                      py: 0.75,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography sx={{ fontSize: 12, flex: 1, minWidth: 0 }}>
                      {fmtDate(t.transaction_date)} · {t.fee_type || t.payment_method}
                    </Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{fmtKes(t.amount_kes)}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        ) : (
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No finance account linked in FMS.</Typography>
        )}
      </SectionCard>

      {/* Bottom widgets — horizontal flex row, full width */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2.5,
          width: '100%',
          alignItems: 'stretch',
        }}
      >
        <SectionCard title="Journey progress" sx={{ flex: '1 1 260px' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1 }}>
            <Box
              sx={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                border: '6px solid',
                borderColor: `${ACCENT}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `conic-gradient(${ACCENT} ${journeyProgress * 3.6}deg, ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'} 0deg)`,
                mb: 1,
              }}
            >
              <Box
                sx={{
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  bgcolor: 'background.paper',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography sx={{ fontWeight: 800, fontSize: 20 }}>{journeyProgress}%</Typography>
              </Box>
            </Box>
            <Chip
              size="small"
              label={journey?.overall_status || student?.status || 'Enrolled'}
              color="success"
              sx={{ fontWeight: 600 }}
            />
          </Box>
        </SectionCard>

        <SectionCard title="Grade distribution" sx={{ flex: '1 1 260px' }}>
          <GradeBars enrolments={enrolments} />
        </SectionCard>

        {account?.scholarship_kes > 0 && (
          <SectionCard title="Scholarships" sx={{ flex: '1 1 220px' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>
              {fmtKes(account.scholarship_kes)}
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
              Applied to programme fees
            </Typography>
          </SectionCard>
        )}

        <SectionCard title="Academic profile" sx={{ flex: '2 1 320px' }}>
          <ProfileRow label="Programme" value={student?.programme_name} />
          <ProfileRow label="Department" value={student?.department} />
          <ProfileRow label="Degree level" value={student?.degree_level} />
          <ProfileRow label="Cohort" value={student?.cohort_year} />
          <ProfileRow label="Study mode" value={student?.study_mode} />
          <ProfileRow label="Enrolled" value={fmtDate(student?.enrolment_date)} />
          <ProfileRow label="Expected graduation" value={fmtDate(student?.expected_graduation_date || journey?.expected_graduation)} />
          <ProfileRow label="Lead supervisor" value={leadSupervisor} />
          {coSupervisor && <ProfileRow label="Co-supervisor" value={coSupervisor} />}
        </SectionCard>
      </Box>
    </Box>
  );
}
