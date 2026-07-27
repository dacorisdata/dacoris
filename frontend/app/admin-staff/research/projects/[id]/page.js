'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
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
  AccountBalance as FunderIcon,
  ArrowBack as BackIcon,
  Assignment as DeliverableIcon,
  AttachMoney as BudgetIcon,
  CalendarToday as CalIcon,
  Groups as TeamIcon,
  Person as PersonIcon,
  PersonAdd as AssignIcon,
  ReceiptLong as RequestIcon,
  Science as ProjectIcon,
  Flag as MilestoneIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useLanguage } from '../../../../../contexts/LanguageContext';
import api from '../../../../../lib/api';
import AssignReviewerDialog from '../../../../../components/AssignReviewerDialog';

const ACCENT = '#16a699';

const STATUS_META = {
  pending_review: { label: 'Pending Review', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  under_review: { label: 'Under Review', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  approved: { label: 'Approved', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  revision: { label: 'Revision Req.', color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  rejected: { label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

const EXECUTION_STATUS_STYLE = {
  planned: { label: 'Planned', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  pending: { label: 'Pending', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  in_progress: { label: 'In Progress', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  completed: { label: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  overdue: { label: 'Overdue', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  approved: { label: 'Approved', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  rejected: { label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  paid: { label: 'Paid', color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
  cancelled: { label: 'Cancelled', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
};

const PROJECT_STATUS_MAP = {
  proposed: 'pending_review',
  draft: 'revision',
  active: 'approved',
  suspended: 'rejected',
  completed: 'approved',
};

const stripHtml = (value) => (value || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();

const normalizeObjective = (obj = {}) => {
  if (typeof obj === 'string') {
    const text = obj.trim();
    return text ? { title: text, description: '', outcome: '' } : null;
  }
  if (!obj || typeof obj !== 'object') return null;
  return {
    title: obj.title ?? obj.objective ?? '',
    description: obj.description ?? '',
    outcome: obj.outcome ?? '',
  };
};

const parseObjectives = (value) => {
  const raw = (() => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return value.split('\n').map((s) => s.trim()).filter(Boolean);
      }
    }
    return [];
  })();

  return raw
    .map(normalizeObjective)
    .filter((obj) => obj && (obj.title?.trim() || stripHtml(obj.description) || stripHtml(obj.outcome)));
};

const safeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isOverdue = (dueDate, status) => {
  const date = safeDate(dueDate);
  if (!date) return false;
  return !['completed', 'paid', 'approved'].includes(status) && date < new Date();
};

const fmtDate = (value) => value
  ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const fmtMoney = (value, currency) => (
  value === 0 || value ? `${currency || 'KES'} ${Number(value).toLocaleString()}` : '—'
);

function StatusChip({ status }) {
  const meta = EXECUTION_STATUS_STYLE[status] || {
    label: (status || 'Unknown').replace(/_/g, ' '),
    color: '#64748b',
    bg: 'rgba(100,116,139,0.12)',
  };
  return (
    <Chip
      label={meta.label}
      size="small"
      sx={{ bgcolor: meta.bg, color: meta.color, fontWeight: 700, textTransform: 'capitalize' }}
    />
  );
}

function SectionCard({ icon: Icon, title, children }) {
  return (
    <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Icon sx={{ fontSize: 18, color: ACCENT }} />
        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{title}</Typography>
      </Box>
      {children}
    </Paper>
  );
}

const normalizeProject = (data) => {
  if (!data) return null;

  const milestones = (data.milestones || []).map((milestone) => {
    const total = milestone.task_count || 0;
    const done = milestone.done_count || 0;
    const progress = total > 0
      ? Math.round((done / total) * 100)
      : (milestone.status === 'completed' ? 100 : 0);
    return {
      ...milestone,
      progress,
      overdue: isOverdue(milestone.due_date, milestone.status),
    };
  });

  const deliverables = (data.deliverables || []).map((deliverable) => ({
    ...deliverable,
    overdue: isOverdue(deliverable.due_date, deliverable.status),
  }));

  const budgetLines = data.budget_lines || [];
  const paymentRequests = data.payment_requests || [];
  const budgetTotal = budgetLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
  const budgetSpent = budgetLines.reduce((sum, line) => sum + (Number(line.spent_to_date) || 0), 0);

  const nextMilestone = milestones
    .filter((milestone) => milestone.due_date && milestone.status !== 'completed')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0] || null;

  const nextDeliverable = deliverables
    .filter((deliverable) => deliverable.due_date && deliverable.status !== 'completed')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0] || null;

  return {
    ...data,
    pi_name: data.pi_name || data.pi_full_name,
    pi_orcid: data.pi_orcid,
    institution: data.lead_institution,
    department: data.department,
    award_ref: data.award_number || data.project_code,
    funder: data.funder_name,
    abstract: data.project_abstract || data.description,
    objectives: parseObjectives(data.research_objectives),
    milestones,
    deliverables,
    budget_lines: budgetLines,
    payment_requests: paymentRequests,
    team_size: data.member_count ?? data.members?.length ?? 0,
    submitted_at: data.created_at,
    status: PROJECT_STATUS_MAP[data.status] || data.status,
    priority: data.involves_human_subjects ? 'high' : 'medium',
    budget_total: budgetTotal,
    budget_spent: budgetSpent,
    budget_balance: budgetTotal - budgetSpent,
    nextMilestone,
    nextDeliverable,
  };
};

export default function AdminProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { fetchUser } = useAuth();
  const { t } = useLanguage();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const user = await fetchUser();
    if (!user) { router.push('/login'); return; }
    if (user.is_global_admin) { router.push('/global-admin/dashboard'); return; }
    if (user.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    await loadProject();
  };

  const loadProject = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/research/projects/${params.id}`);
      setProject(normalizeProject(res.data));
    } catch (e) {
      setProject(null);
      setError(e.response?.data?.detail || 'Failed to load project.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  if (!project) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        {error && <Typography sx={{ color: 'error.main', mb: 1 }}>{error}</Typography>}
        <Typography>Project not found</Typography>
      </Box>
    );
  }

  const activeAssignments = (project.reviewer_assignments || []).filter((a) => a.status !== 'declined');

  const sm = STATUS_META[project.status] || STATUS_META.pending_review;
  const currency = project.reporting_currency || project.currency || 'KES';
  const overdueCount = project.milestones.filter((m) => m.overdue).length
    + project.deliverables.filter((d) => d.overdue).length;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Button
        startIcon={<BackIcon />}
        onClick={() => router.push('/admin-staff/research/projects')}
        sx={{ mb: 3, textTransform: 'none', color: 'text.secondary' }}
      >
        Back to Projects Tracking
      </Button>

      {success && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ width: 48, height: 48, borderRadius: 2.5, bgcolor: `${ACCENT}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ProjectIcon sx={{ fontSize: 24, color: ACCENT }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 24, fontWeight: 800 }}>{project.title}</Typography>
            <Chip label={sm.label} sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 700, fontSize: 11 }} />
            {project.priority === 'high' && (
              <Chip label="High Priority" size="small" sx={{ bgcolor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 700, fontSize: 10 }} />
            )}
            {overdueCount > 0 && (
              <Chip label={`${overdueCount} overdue`} size="small" sx={{ bgcolor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 700, fontSize: 10 }} />
            )}
          </Box>
          <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>{project.award_ref}</Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <SectionCard icon={ProjectIcon} title="Project Overview">
            <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.7, mb: 3 }}>
              {project.abstract || 'No project abstract provided.'}
            </Typography>

            {project.objectives?.length > 0 && (
              <>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.7, mb: 1.5 }}>
                  Objectives
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {project.objectives.map((obj, index) => (
                    <Box
                      key={`${obj.title}-${index}`}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: `1px solid ${theme.palette.divider}`,
                        bgcolor: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                      }}
                    >
                      <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5, color: 'text.primary' }}>
                        {obj.title || `Objective ${index + 1}`}
                      </Typography>
                      {stripHtml(obj.description) && (
                        <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 0.5, lineHeight: 1.6 }}>
                          {stripHtml(obj.description)}
                        </Typography>
                      )}
                      {stripHtml(obj.outcome) && (
                        <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>
                          Expected outcome: {stripHtml(obj.outcome)}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </SectionCard>

          <SectionCard icon={MilestoneIcon} title="Milestones Tracking">
            {!project.milestones.length ? (
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No milestones defined yet.</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {project.milestones.map((milestone) => (
                  <Box
                    key={milestone.id}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: `1px solid ${theme.palette.divider}`,
                      bgcolor: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 1 }}>
                      <Box sx={{ minWidth: 220, flex: 1 }}>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{milestone.title}</Typography>
                        {milestone.description && (
                          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5 }}>
                            {milestone.description}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                        <StatusChip status={milestone.overdue ? 'overdue' : milestone.status} />
                        <Chip
                          size="small"
                          label={milestone.due_date ? `Due ${fmtDate(milestone.due_date)}` : 'No due date'}
                          sx={{
                            bgcolor: milestone.overdue ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
                            color: milestone.overdue ? '#ef4444' : '#3b82f6',
                            fontWeight: 700,
                          }}
                        />
                      </Box>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5, mb: 1.5 }}>
                      <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                        Owner: <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>{milestone.assigned_to_name || '—'}</Box>
                      </Typography>
                      <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                        Tasks done: <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>{milestone.done_count}/{milestone.task_count}</Box>
                      </Typography>
                      <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                        Evidence files: <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>{milestone.documents?.length || 0}</Box>
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Progress</Typography>
                      <Typography sx={{ fontSize: 12, color: ACCENT, fontWeight: 700 }}>{milestone.progress}%</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={milestone.progress}
                      sx={{ height: 6, borderRadius: 3, bgcolor: 'divider', '& .MuiLinearProgress-bar': { bgcolor: milestone.progress === 100 ? '#10b981' : ACCENT } }}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </SectionCard>

          <SectionCard icon={DeliverableIcon} title="Deliverables Tracking">
            {!project.deliverables.length ? (
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No deliverables defined yet.</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Deliverable</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Milestone</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Due date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Responsible</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Files</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {project.deliverables.map((deliverable) => {
                    const linkedMilestone = project.milestones.find((milestone) => milestone.id === deliverable.milestone_id);
                    return (
                      <TableRow key={deliverable.id} hover>
                        <TableCell>
                          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{deliverable.name}</Typography>
                          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                            {deliverable.deliverable_type || 'General deliverable'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontSize: 12.5 }}>{linkedMilestone?.title || '—'}</TableCell>
                        <TableCell sx={{ fontSize: 12.5, color: deliverable.overdue ? 'error.main' : 'text.primary', fontWeight: deliverable.overdue ? 700 : 500 }}>
                          {fmtDate(deliverable.due_date)}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12.5 }}>{deliverable.responsible_label || '—'}</TableCell>
                        <TableCell><StatusChip status={deliverable.overdue ? 'overdue' : deliverable.status} /></TableCell>
                        <TableCell align="right" sx={{ fontSize: 12.5, fontWeight: 700 }}>{deliverable.documents?.length || 0}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </SectionCard>

          <SectionCard icon={BudgetIcon} title="Budget, Expenditure, and Requests">
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
              {[
                { label: 'Total budget', value: fmtMoney(project.budget_total, currency) },
                { label: 'Spent to date', value: fmtMoney(project.budget_spent, currency) },
                { label: 'Unspent balance', value: fmtMoney(project.budget_balance, currency) },
              ].map((item) => (
                <Box key={item.label} sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
                    {item.label}
                  </Typography>
                  <Typography sx={{ fontSize: 16, fontWeight: 800 }}>{item.value}</Typography>
                </Box>
              ))}
            </Box>

            {!project.budget_lines.length ? (
              <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 3 }}>No budget lines defined yet.</Typography>
            ) : (
              <Table size="small" sx={{ mb: 3 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Budget line</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Allocated</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Spent</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Balance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {project.budget_lines.map((line) => {
                    const remaining = (Number(line.amount) || 0) - (Number(line.spent_to_date) || 0);
                    return (
                      <TableRow key={line.id} hover>
                        <TableCell>
                          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{line.category}</Typography>
                          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{line.description || '—'}</Typography>
                        </TableCell>
                        <TableCell align="right">{fmtMoney(line.amount, currency)}</TableCell>
                        <TableCell align="right">{fmtMoney(line.spent_to_date, currency)}</TableCell>
                        <TableCell align="right" sx={{ color: remaining < 0 ? 'error.main' : 'text.primary', fontWeight: remaining < 0 ? 700 : 500 }}>
                          {fmtMoney(remaining, currency)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {!project.payment_requests.length ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>No payment or expenditure requests submitted yet.</Alert>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Request</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Budget line</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Amount</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Requested by</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {project.payment_requests.map((request) => (
                    <TableRow key={request.id} hover>
                      <TableCell>
                        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{request.purpose}</Typography>
                        <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{request.justification || '—'}</Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{request.budget_line_category || '—'}</TableCell>
                      <TableCell align="right">{fmtMoney(request.amount, request.currency || currency)}</TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{request.requested_by_name || '—'}</TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{fmtDate(request.created_at)}</TableCell>
                      <TableCell><StatusChip status={request.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </SectionCard>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <SectionCard icon={AssignIcon} title={t('reviewerAssignment.cardTitle')}>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>
              {t('reviewerAssignment.cardDescProject')}
            </Typography>
            {activeAssignments.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                {activeAssignments.map((a) => (
                  <Box key={a.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: '#8b5cf6', fontSize: 12 }}>
                      {a.reviewer_name?.charAt(0) || '?'}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{a.reviewer_name}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{a.reviewer_email}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography sx={{ fontSize: 12, color: '#f59e0b', fontWeight: 600, mb: 2 }}>
                {t('reviewerAssignment.noReviewerYet')}
              </Typography>
            )}
            <Button
              fullWidth size="small" variant="outlined" startIcon={<AssignIcon sx={{ fontSize: 16 }} />}
              onClick={() => setAssignOpen(true)}
              sx={{ textTransform: 'none', borderRadius: 2, borderColor: ACCENT, color: ACCENT, fontWeight: 600 }}
            >
              {t('reviewerAssignment.assignButton')}
            </Button>
          </SectionCard>

          <SectionCard icon={PersonIcon} title="Key Details">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {[
                { label: 'Principal Investigator', value: project.pi_name, icon: <PersonIcon sx={{ fontSize: 14 }} /> },
                { label: 'ORCID', value: project.pi_orcid },
                { label: 'Institution', value: project.institution },
                { label: 'Department', value: project.department },
                { label: 'Funder', value: project.funder, icon: <FunderIcon sx={{ fontSize: 14 }} /> },
                { label: 'Total Budget', value: fmtMoney(project.budget_total || project.total_amount, currency), icon: <BudgetIcon sx={{ fontSize: 14 }} /> },
                { label: 'Team Size', value: `${project.team_size} members`, icon: <TeamIcon sx={{ fontSize: 14 }} /> },
                { label: 'Submitted', value: fmtDate(project.submitted_at), icon: <CalIcon sx={{ fontSize: 14 }} /> },
              ].map(({ label, value, icon }) => (
                <Box key={label}>
                  <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.3 }}>
                    {label}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {icon && <Box sx={{ color: 'text.disabled' }}>{icon}</Box>}
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{value || '—'}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </SectionCard>

          <SectionCard icon={RequestIcon} title="Tracking Summary">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
              <Box>
                <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.3 }}>
                  Next milestone due
                </Typography>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                  {project.nextMilestone ? `${project.nextMilestone.title} • ${fmtDate(project.nextMilestone.due_date)}` : 'No upcoming milestone'}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.3 }}>
                  Next deliverable due
                </Typography>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                  {project.nextDeliverable ? `${project.nextDeliverable.name} • ${fmtDate(project.nextDeliverable.due_date)}` : 'No upcoming deliverable'}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.3 }}>
                  Open requests
                </Typography>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                  {project.payment_requests.filter((request) => ['pending', 'approved'].includes(request.status)).length} active financial request(s)
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.3 }}>
                  Overdue items
                </Typography>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                  {overdueCount} overdue milestone(s) or deliverable(s)
                </Typography>
              </Box>
            </Box>
          </SectionCard>
        </Box>
      </Box>

      <AssignReviewerDialog
        open={assignOpen}
        entityTitle={project.title}
        entitySubtitle={project.award_ref}
        assignUrl={`/research/projects/${project.id}/assign-reviewer`}
        reviewersUrl="/research/projects/reviewers/available"
        onClose={() => setAssignOpen(false)}
        onAssigned={async () => {
          setSuccess(t('reviewerAssignment.successMessage'));
          await loadProject();
        }}
      />
    </Box>
  );
}
