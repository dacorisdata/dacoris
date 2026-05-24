'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Box, Typography, Button, Paper, Chip, CircularProgress, Alert,
  Tabs, Tab, Grid, Divider, Table, TableBody, TableCell, TableHead,
  TableRow, LinearProgress, useTheme,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Science as ProjectIcon,
  Groups as TeamIcon,
  Description as DescIcon,
  Gavel as EthicsIcon,
  Flag as MilestoneIcon,
  Storage as StorageIcon,
  AttachMoney as MoneyIcon,
  VerifiedUser as DeclareIcon,
  InsertDriveFile as DocIcon,
  Edit as EditIcon,
  OpenInNew as OpenIcon,
  AccountBalance as AwardIcon,
} from '@mui/icons-material';import axios from 'axios';
import { useAuth } from '../../../../contexts/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#1ca7a1';

const STATUS_META = {
  draft: { label: 'Draft', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  proposed: { label: 'Proposed', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  active: { label: 'Active', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  suspended: { label: 'Suspended', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  completed: { label: 'Completed', color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
};

const PROJECT_TYPE_LABELS = {
  contract_research: 'Contract Research',
  grant_funded: 'Grant Funded',
  internal: 'Internal',
  collaborative: 'Collaborative',
  funded: 'Grant Funded',
};

const DOC_TYPE_LABELS = {
  ethics_clearance: 'Ethics Clearance',
  IRB_protocol: 'IRB Protocol',
  consent_form: 'Consent Form',
  data_management_plan: 'Data Management Plan',
  budget: 'Budget Document',
  other: 'Other',
};

const DECLARATION_LABELS = {
  research_integrity: 'Research Integrity',
  conflict_of_interest: 'Conflict of Interest',
  data_protection: 'Data Protection',
  funder_compliance: 'Funder Compliance',
  institutional_approval: 'Institutional Approval',
  ethics_compliance: 'Ethics Compliance',
  originality: 'Originality Declaration',
};

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const fmtMoney = (amt, cur = 'KES') => {
  if (amt == null || amt === '') return '—';
  return `${cur} ${Number(amt).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

const stripHtml = (v) => (v || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();

function StatusChip({ status }) {
  const key = status?.toLowerCase();
  const meta = STATUS_META[key] || { label: status || '—', color: '#64748b', bg: 'rgba(100,116,139,0.12)' };
  return (
    <Chip label={meta.label} size="small" sx={{ fontWeight: 700, bgcolor: meta.bg, color: meta.color }} />
  );
}

function SectionCard({ icon: Icon, title, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: `${ACCENT}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon sx={{ fontSize: 18, color: ACCENT }} />
        </Box>
        <Typography sx={{ fontSize: 16, fontWeight: 700 }}>{title}</Typography>
      </Box>
      {children}
    </Paper>
  );
}

function DetailField({ label, value, fullWidth }) {
  if (value == null || value === '') return null;
  return (
    <Grid item xs={12} sm={fullWidth ? 12 : 6} md={fullWidth ? 12 : 4}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 500, lineHeight: 1.5 }}>{value}</Typography>
    </Grid>
  );
}

function RichBlock({ label, html }) {
  const text = stripHtml(html);
  if (!text) return null;
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 1 }}>
        {label}
      </Typography>
      <Typography
        component="div"
        sx={{ fontSize: 14, lineHeight: 1.7, color: 'text.primary', '& p': { m: 0, mb: 1 } }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </Box>
  );
}

function ResourceLink({ href, title, subtitle, icon: Icon = OpenIcon }) {
  return (
    <Paper
      component={Link}
      href={href}
      variant="outlined"
      sx={{
        p: 2,
        mb: 1.5,
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        textDecoration: 'none',
        color: 'inherit',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        '&:hover': {
          borderColor: ACCENT,
          boxShadow: `0 0 0 1px ${ACCENT}33`,
        },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: subtitle ? 0.5 : 0 }}>
          {Icon !== OpenIcon && (
            <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: `${ACCENT}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon sx={{ fontSize: 16, color: ACCENT }} />
            </Box>
          )}
          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{title}</Typography>
        </Box>
        {subtitle && (
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>{subtitle}</Typography>
        )}
      </Box>
      <OpenIcon sx={{ fontSize: 18, color: ACCENT, flexShrink: 0 }} />
    </Paper>
  );
}

function SummaryStat({ label, value }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.75 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4 }}>{value}</Typography>
    </Paper>
  );
}
export default function ProjectDetailsPage() {
  const router = useRouter();
  const { id } = useParams();
  const { fetchUser } = useAuth();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [project, setProject] = useState(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    fetchUser().then((u) => {
      if (!u) router.push('/login');
      else loadProject();
    });
  }, [id]);

  const loadProject = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/research/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const p = res.data;
      if (p.status === 'draft') {
        router.replace(`/researcher/projects/${id}/setup`);
        return;
      }
      setProject(p);
    } catch {
      setError('Failed to load project.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  if (error || !project) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>{error || 'Project not found'}</Alert>
        <Button startIcon={<BackIcon />} onClick={() => router.push('/researcher/projects')} sx={{ mt: 2 }}>
          Back to projects
        </Button>
      </Box>
    );
  }

  const milestonePct = project.milestone_count
    ? Math.round((project.done_milestone_count / project.milestone_count) * 100)
    : 0;
  const budgetTotal = (project.budget_lines || []).reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const budgetSpent = (project.budget_lines || []).reduce((s, l) => s + (Number(l.spent_to_date) || 0), 0);
  const keywords = Array.isArray(project.research_keywords) ? project.research_keywords : [];
  const objectives = Array.isArray(project.research_objectives) ? project.research_objectives : [];
  const declarations = project.declaration_responses || {};
  const flags = [
    project.involves_human_subjects && 'Human subjects',
    project.involves_animal_subjects && 'Animal subjects',
    project.involves_sensitive_data && 'Sensitive / personal data',
    project.is_clinical_trial && 'Clinical trial',
    project.uses_hazardous_materials && 'Hazardous materials',
  ].filter(Boolean);

  const tabs = [
    { label: 'Overview', icon: ProjectIcon },
    { label: 'Team', icon: TeamIcon },
    { label: 'Research', icon: DescIcon },
    { label: 'Plan', icon: MilestoneIcon },
    { label: 'Ethics', icon: EthicsIcon },
    { label: 'DMP', icon: StorageIcon },
    { label: 'Financial', icon: MoneyIcon },
    { label: 'Declarations', icon: DeclareIcon },
    { label: 'Documents', icon: DocIcon },
  ];

  return (
    <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4, xl: 5 }, py: { xs: 2, md: 3 }, pb: 6 }}>
      <Button
        startIcon={<BackIcon />}
        onClick={() => router.push('/researcher/projects')}
        sx={{ mb: 2.5, textTransform: 'none', color: 'text.secondary', fontWeight: 600 }}
      >
        Back to My Projects
      </Button>

      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2.5, md: 3.5 },
          borderRadius: 3,
          mb: 3,
          background: `linear-gradient(135deg, ${ACCENT}10 0%, transparent 55%)`,
          borderColor: `${ACCENT}33`,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: 280 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.25, flexWrap: 'wrap' }}>
              <StatusChip status={project.status} />
              {project.research_area && (
                <Chip label={project.research_area} size="small" sx={{ fontWeight: 600, bgcolor: `${ACCENT}12`, color: ACCENT }} />
              )}
            </Box>
            <Typography sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 800, lineHeight: 1.25, mb: 0.75, letterSpacing: -0.3 }}>
              {project.title || 'Untitled project'}
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', fontFamily: 'monospace' }}>
              {project.project_code}
            </Typography>
          </Box>
          {project.status === 'draft' && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => router.push(`/researcher/projects/${id}/setup`)}
              sx={{ textTransform: 'none', borderColor: ACCENT, color: ACCENT, fontWeight: 600 }}
            >
              Continue setup
            </Button>
          )}
        </Box>

        <Grid container spacing={2} sx={{ mt: 2.5 }}>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryStat label="Type" value={PROJECT_TYPE_LABELS[project.project_type] || project.project_type || '—'} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryStat label="Period" value={`${fmtDate(project.start_date)} – ${fmtDate(project.end_date)}`} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryStat label="Funder" value={project.funder_name || '—'} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryStat label="Award amount" value={fmtMoney(project.total_amount, project.currency)} />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary' }}>Milestone progress</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{project.done_milestone_count}/{project.milestone_count} ({milestonePct}%)</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={milestonePct}
            sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(0,0,0,0.06)', '& .MuiLinearProgress-bar': { bgcolor: ACCENT, borderRadius: 4 } }}
          />
        </Box>
      </Paper>
      {project.status !== 'draft' && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          This project has been submitted and is read-only. Contact your institutional administrator if changes are required.
        </Alert>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 3, mb: 3, overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: `1px solid ${theme.palette.divider}`,
            px: { xs: 0.5, md: 2 },
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 52, fontSize: 13 },
          }}
        >
          {tabs.map((t) => (
            <Tab key={t.label} label={t.label} icon={<t.icon sx={{ fontSize: 18 }} />} iconPosition="start" />
          ))}
        </Tabs>

        <Box sx={{ p: { xs: 2, md: 3.5 } }}>          {tab === 0 && (
            <SectionCard icon={ProjectIcon} title="Project Context">
              <Grid container spacing={2.5}>
                <DetailField label="Lead institution" value={project.lead_institution} />
                <DetailField label="Department / Faculty" value={project.department} />
                <DetailField label="Short title" value={project.short_title} />
                <DetailField label="Created" value={fmtDate(project.created_at)} />
              </Grid>
              {flags.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mb: 1 }}>PROJECT FLAGS</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {flags.map(f => <Chip key={f} label={f} size="small" color="warning" variant="outlined" />)}
                  </Box>
                </Box>
              )}
              {(project.award_id || project.award_number) && (
                <Box sx={{ mt: 3 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Linked resources
                  </Typography>
                  <ResourceLink
                    href="/researcher/grants/awards"
                    title={project.award_number ? `Award ${project.award_number}` : 'Linked grant award'}
                    subtitle="View award details in My Awards"
                    icon={AwardIcon}
                  />
                </Box>
              )}            </SectionCard>
          )}

          {tab === 1 && (
            <SectionCard icon={TeamIcon} title="Research Team">
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>Principal Investigator</Typography>
              <Grid container spacing={2.5} sx={{ mb: 3 }}>
                <DetailField label="Full name" value={[project.pi_academic_title, project.pi_full_name].filter(Boolean).join(' ')} />
                <DetailField label="Email" value={project.pi_email} />
                <DetailField label="Phone" value={project.pi_phone} />
                <DetailField label="ORCID" value={project.pi_orcid} />
                <DetailField label="Staff ID" value={project.pi_staff_id} />
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>Team members ({project.members?.length || 0})</Typography>
              {(project.members || []).length === 0 ? (
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No additional team members.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(project.members || []).map(m => (
                      <TableRow key={m.id}>
                        <TableCell>{m.user_name || m.invited_name || m.invited_email}</TableCell>
                        <TableCell sx={{ textTransform: 'capitalize' }}>{m.role?.replace(/_/g, ' ')}</TableCell>
                        <TableCell sx={{ textTransform: 'capitalize' }}>{m.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {(project.teams || []).length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>Teams</Typography>
                  {(project.teams || []).map(t => (
                    <Box key={t.id} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{t.name}</Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
                        {(t.members || []).map(m => m.display_name).join(', ') || 'No members'}
                      </Typography>
                    </Box>
                  ))}
                </>
              )}
            </SectionCard>
          )}

          {tab === 2 && (
            <SectionCard icon={DescIcon} title="Research Details">
              <RichBlock label="Abstract" html={project.project_abstract} />
              <RichBlock label="Background & rationale" html={project.background_rationale} />
              <RichBlock label="Problem statement" html={project.problem_statement} />
              <RichBlock label="Methodology" html={project.research_methodology} />
              <Grid container spacing={2.5} sx={{ mt: 1 }}>
                <DetailField label="Research design" value={project.research_design} />
                <DetailField label="Target population" value={project.target_population} fullWidth />
              </Grid>
              {keywords.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mb: 1 }}>KEYWORDS</Typography>
                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                    {keywords.map(k => <Chip key={k} label={k} size="small" />)}
                  </Box>
                </Box>
              )}
              {objectives.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>Research objectives</Typography>
                  {objectives.map((obj, i) => (
                    <Paper key={i} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 0.5 }}>{obj.title || `Objective ${i + 1}`}</Typography>
                      {stripHtml(obj.description) && <Typography sx={{ fontSize: 13, mb: 0.5 }}>{stripHtml(obj.description)}</Typography>}
                      {stripHtml(obj.outcome) && (
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Expected outcome: {stripHtml(obj.outcome)}</Typography>
                      )}
                    </Paper>
                  ))}
                </Box>
              )}
            </SectionCard>
          )}

          {tab === 3 && (
            <>
              <SectionCard icon={MilestoneIcon} title="Milestones">
                {(project.milestones || []).length === 0 ? (
                  <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No milestones defined.</Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Due</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Assignee</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Tasks</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(project.milestones || []).map(m => (
                        <TableRow key={m.id}>
                          <TableCell sx={{ fontWeight: 600 }}>{m.title}</TableCell>
                          <TableCell>{fmtDate(m.due_date)}</TableCell>
                          <TableCell sx={{ textTransform: 'capitalize' }}>{m.status?.replace(/_/g, ' ')}</TableCell>
                          <TableCell>{m.assigned_to_name || '—'}</TableCell>
                          <TableCell>{m.done_count}/{m.task_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </SectionCard>
              <SectionCard icon={MilestoneIcon} title="Deliverables">
                {(project.deliverables || []).length === 0 ? (
                  <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No deliverables defined.</Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Due</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Responsible</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(project.deliverables || []).map(d => (
                        <TableRow key={d.id}>
                          <TableCell sx={{ fontWeight: 600 }}>{d.name}</TableCell>
                          <TableCell>{d.deliverable_type || '—'}</TableCell>
                          <TableCell>{fmtDate(d.due_date)}</TableCell>
                          <TableCell sx={{ textTransform: 'capitalize' }}>{d.status?.replace(/_/g, ' ')}</TableCell>
                          <TableCell>{d.responsible_label || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </SectionCard>
            </>
          )}

          {tab === 4 && (
            <SectionCard icon={EthicsIcon} title="Ethics & Compliance">
              {stripHtml(project.conflict_of_interest) && (
                <Box sx={{ mb: 2.5 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>CONFLICT OF INTEREST</Typography>
                  <Typography sx={{ fontSize: 14 }}>{project.conflict_of_interest}</Typography>
                </Box>
              )}
              {(project.ethics_applications || []).length === 0 ? (
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No ethics applications linked.</Typography>
              ) : (
                <>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>
                    Click an application to open its full ethics record.
                  </Typography>
                  {(project.ethics_applications || []).map((e) => (
                    <ResourceLink
                      key={e.id}
                      href={`/researcher/ethics/${e.id}`}
                      title={e.title || 'Ethics application'}
                      subtitle={[
                        e.status?.replace(/_/g, ' '),
                        e.submitted_at ? `Submitted ${fmtDate(e.submitted_at)}` : null,
                        e.approved_until ? `Valid until ${fmtDate(e.approved_until)}` : null,
                      ].filter(Boolean).join(' · ')}
                      icon={EthicsIcon}
                    />
                  ))}
                  <Button
                    component={Link}
                    href="/researcher/ethics"
                    size="small"
                    endIcon={<OpenIcon sx={{ fontSize: 14 }} />}
                    sx={{ mt: 1, textTransform: 'none', fontWeight: 600, color: ACCENT }}
                  >
                    View all ethics applications
                  </Button>
                </>
              )}            </SectionCard>
          )}

          {tab === 5 && (
            <SectionCard icon={StorageIcon} title="Data Management Plan">
              <Grid container spacing={2.5}>
                <DetailField label="Entry mode" value={project.dmp_entry_mode?.replace(/_/g, ' ')} />
                <DetailField label="Types of data" value={project.dmp_types_of_data} />
                <DetailField label="Estimated volume" value={project.dmp_estimated_volume} />
                <DetailField label="Data formats" value={project.dmp_data_formats} />
                <DetailField label="Primary storage" value={project.dmp_primary_storage} />
                <DetailField label="Retention period" value={project.dmp_retention_period} />
                <DetailField label="Repository" value={project.dmp_repository} fullWidth />
              </Grid>
              <RichBlock label="Backup procedure" html={project.dmp_backup_procedure} />
              <RichBlock label="Access controls" html={project.dmp_access_controls} />
              <RichBlock label="Sharing plan" html={project.dmp_sharing_plan} />
            </SectionCard>
          )}

          {tab === 6 && (
            <SectionCard icon={MoneyIcon} title="Budget & Financial Plan">
              <Grid container spacing={2.5} sx={{ mb: 2 }}>
                <DetailField label="Reporting currency" value={project.reporting_currency} />
                <DetailField label="Overhead rate" value={project.financial_overhead_rate} />
                <DetailField label="Total budget" value={fmtMoney(budgetTotal, project.reporting_currency)} />
                <DetailField label="Spent to date" value={fmtMoney(budgetSpent, project.reporting_currency)} />
              </Grid>
              {project.financial_notes && (
                <Typography sx={{ fontSize: 13, mb: 2, color: 'text.secondary' }}>{project.financial_notes}</Typography>
              )}
              {(project.budget_lines || []).length === 0 ? (
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No budget line items.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Amount</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Spent</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(project.budget_lines || []).map(bl => (
                      <TableRow key={bl.id}>
                        <TableCell>{bl.category}</TableCell>
                        <TableCell>{bl.description || '—'}</TableCell>
                        <TableCell align="right">{fmtMoney(bl.amount, project.reporting_currency)}</TableCell>
                        <TableCell align="right">{fmtMoney(bl.spent_to_date, project.reporting_currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </SectionCard>
          )}

          {tab === 7 && (
            <SectionCard icon={DeclareIcon} title="Declarations & Sign-off">
              {Object.entries(DECLARATION_LABELS).map(([key, title]) => (
                <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Chip
                    label={declarations[key] ? 'Signed' : 'Not signed'}
                    size="small"
                    color={declarations[key] ? 'success' : 'default'}
                    sx={{ fontWeight: 700, minWidth: 90 }}
                  />
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{title}</Typography>
                </Box>
              ))}
              <Box sx={{ mt: 2.5, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <Box>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>PI SIGN-OFF NAME</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{project.pi_full_name || '—'}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>DECLARATION DATE</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{fmtDate(project.declaration_date)}</Typography>
                </Box>
              </Box>
            </SectionCard>
          )}

          {tab === 8 && (
            <SectionCard icon={DocIcon} title="Uploaded Documents">
              {(project.documents || []).length === 0 ? (
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No documents uploaded.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>File</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Uploaded</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>By</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(project.documents || []).map(d => (
                      <TableRow key={d.id}>
                        <TableCell sx={{ fontWeight: 600 }}>{d.original_filename}</TableCell>
                        <TableCell>{DOC_TYPE_LABELS[d.document_type] || d.document_type}</TableCell>
                        <TableCell>{fmtDate(d.uploaded_at)}</TableCell>
                        <TableCell>{d.uploaded_by_name || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </SectionCard>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
