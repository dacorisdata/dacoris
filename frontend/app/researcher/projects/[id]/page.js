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
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../../../contexts/AuthContext';
import { useLanguage } from '../../../../contexts/LanguageContext';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#1ca7a1';
const PD = 'researcher.projectDetail';
const LOCALE_MAP = { en: 'en-US', fr: 'fr-FR', ar: 'ar', sw: 'sw-KE' };

const STATUS_STYLE = {
  draft: { color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  proposed: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  active: { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  suspended: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  completed: { color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
};

const DECLARATION_KEYS = [
  'research_integrity',
  'conflict_of_interest',
  'data_protection',
  'funder_compliance',
  'institutional_approval',
  'ethics_compliance',
  'originality',
];

const TAB_CONFIG = [
  { key: 'overview', icon: ProjectIcon },
  { key: 'team', icon: TeamIcon },
  { key: 'research', icon: DescIcon },
  { key: 'plan', icon: MilestoneIcon },
  { key: 'ethics', icon: EthicsIcon },
  { key: 'dmp', icon: StorageIcon },
  { key: 'financial', icon: MoneyIcon },
  { key: 'declarations', icon: DeclareIcon },
  { key: 'documents', icon: DocIcon },
];

const getStatusMeta = (status, t) => {
  const key = (status || '').toLowerCase();
  const style = STATUS_STYLE[key] || { color: '#64748b', bg: 'rgba(100,116,139,0.12)' };
  const labelKey = `${PD}.status.${key}`;
  const label = t(labelKey);
  return { label: label !== labelKey ? label : (status || '—'), ...style };
};

const getProjectTypeLabel = (type, t) => {
  if (!type) return '—';
  const key = `${PD}.projectType.${type}`;
  const label = t(key);
  return label !== key ? label : type;
};

const getDocTypeLabel = (type, t) => {
  if (!type) return '—';
  const key = `${PD}.docType.${type}`;
  const label = t(key);
  return label !== key ? label : type;
};

const fmtDate = (d, locale) =>
  d ? new Date(d).toLocaleDateString(LOCALE_MAP[locale] || 'en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtMoney = (amt, cur = 'KES', locale) => {
  if (amt == null || amt === '') return '—';
  return `${cur} ${Number(amt).toLocaleString(LOCALE_MAP[locale] || 'en-US', { maximumFractionDigits: 0 })}`;
};

const stripHtml = (v) => (v || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();

function StatusChip({ status, t }) {
  const meta = getStatusMeta(status, t);
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
  const { t, locale } = useLanguage();
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
      setError(t(`${PD}.errorLoad`));
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
        <Alert severity="error" sx={{ borderRadius: 2 }}>{error || t(`${PD}.notFound`)}</Alert>
        <Button startIcon={<BackIcon />} onClick={() => router.push('/researcher/projects')} sx={{ mt: 2 }}>
          {t(`${PD}.backToProjects`)}
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
    project.involves_human_subjects && t(`${PD}.flags.humanSubjects`),
    project.involves_animal_subjects && t(`${PD}.flags.animalSubjects`),
    project.involves_sensitive_data && t(`${PD}.flags.sensitiveData`),
    project.is_clinical_trial && t(`${PD}.flags.clinicalTrial`),
    project.uses_hazardous_materials && t(`${PD}.flags.hazardousMaterials`),
  ].filter(Boolean);

  return (
    <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4, xl: 5 }, py: { xs: 2, md: 3 }, pb: 6 }}>
      <Button
        startIcon={<BackIcon />}
        onClick={() => router.push('/researcher/projects')}
        sx={{ mb: 2.5, textTransform: 'none', color: 'text.secondary', fontWeight: 600 }}
      >
        {t(`${PD}.backToProjects`)}
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
              <StatusChip status={project.status} t={t} />
              {project.research_area && (
                <Chip label={project.research_area} size="small" sx={{ fontWeight: 600, bgcolor: `${ACCENT}12`, color: ACCENT }} />
              )}
            </Box>
            <Typography sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 800, lineHeight: 1.25, mb: 0.75, letterSpacing: -0.3 }}>
              {project.title || t(`${PD}.untitled`)}
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
              {t(`${PD}.continueSetup`)}
            </Button>
          )}
        </Box>

        <Grid container spacing={2} sx={{ mt: 2.5 }}>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryStat label={t(`${PD}.summary.type`)} value={getProjectTypeLabel(project.project_type, t)} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryStat label={t(`${PD}.summary.period`)} value={`${fmtDate(project.start_date, locale)} – ${fmtDate(project.end_date, locale)}`} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryStat label={t(`${PD}.summary.funder`)} value={project.funder_name || '—'} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryStat label={t(`${PD}.summary.awardAmount`)} value={fmtMoney(project.total_amount, project.currency, locale)} />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary' }}>{t(`${PD}.milestoneProgress`)}</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
              {t(`${PD}.milestoneCount`, { done: project.done_milestone_count, total: project.milestone_count, pct: milestonePct })}
            </Typography>
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
          {t(`${PD}.readOnlyAlert`)}
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
          {TAB_CONFIG.map((tabItem) => (
            <Tab
              key={tabItem.key}
              label={t(`${PD}.tabs.${tabItem.key}`)}
              icon={<tabItem.icon sx={{ fontSize: 18 }} />}
              iconPosition="start"
            />
          ))}
        </Tabs>

        <Box sx={{ p: { xs: 2, md: 3.5 } }}>
          {tab === 0 && (
            <SectionCard icon={ProjectIcon} title={t(`${PD}.sections.projectContext`)}>
              <Grid container spacing={2.5}>
                <DetailField label={t(`${PD}.fields.leadInstitution`)} value={project.lead_institution} />
                <DetailField label={t(`${PD}.fields.department`)} value={project.department} />
                <DetailField label={t(`${PD}.fields.shortTitle`)} value={project.short_title} />
                <DetailField label={t(`${PD}.fields.created`)} value={fmtDate(project.created_at, locale)} />
              </Grid>
              {flags.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mb: 1 }}>{t(`${PD}.flags.title`)}</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {flags.map((f) => <Chip key={f} label={f} size="small" color="warning" variant="outlined" />)}
                  </Box>
                </Box>
              )}
              {(project.award_id || project.award_number) && (
                <Box sx={{ mt: 3 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {t(`${PD}.fields.linkedResources`)}
                  </Typography>
                  <ResourceLink
                    href="/researcher/grants/awards"
                    title={project.award_number ? t(`${PD}.fields.awardTitle`, { number: project.award_number }) : t(`${PD}.fields.linkedAward`)}
                    subtitle={t(`${PD}.fields.awardSubtitle`)}
                    icon={AwardIcon}
                  />
                </Box>
              )}
            </SectionCard>
          )}

          {tab === 1 && (
            <SectionCard icon={TeamIcon} title={t(`${PD}.sections.researchTeam`)}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>{t(`${PD}.fields.principalInvestigator`)}</Typography>
              <Grid container spacing={2.5} sx={{ mb: 3 }}>
                <DetailField label={t(`${PD}.fields.fullName`)} value={[project.pi_academic_title, project.pi_full_name].filter(Boolean).join(' ')} />
                <DetailField label={t(`${PD}.fields.email`)} value={project.pi_email} />
                <DetailField label={t(`${PD}.fields.phone`)} value={project.pi_phone} />
                <DetailField label={t(`${PD}.fields.orcid`)} value={project.pi_orcid} />
                <DetailField label={t(`${PD}.fields.staffId`)} value={project.pi_staff_id} />
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>
                {t(`${PD}.fields.teamMembers`, { count: project.members?.length || 0 })}
              </Typography>
              {(project.members || []).length === 0 ? (
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{t(`${PD}.empty.noTeamMembers`)}</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>{t(`${PD}.table.name`)}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{t(`${PD}.table.role`)}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{t(`${PD}.table.status`)}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(project.members || []).map((m) => (
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
                  <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>{t(`${PD}.fields.teams`)}</Typography>
                  {(project.teams || []).map((team) => (
                    <Box key={team.id} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{team.name}</Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
                        {(team.members || []).map((m) => m.display_name).join(', ') || t(`${PD}.empty.noMembers`)}
                      </Typography>
                    </Box>
                  ))}
                </>
              )}
            </SectionCard>
          )}

          {tab === 2 && (
            <SectionCard icon={DescIcon} title={t(`${PD}.sections.researchDetails`)}>
              <RichBlock label={t(`${PD}.fields.abstract`)} html={project.project_abstract} />
              <RichBlock label={t(`${PD}.fields.backgroundRationale`)} html={project.background_rationale} />
              <RichBlock label={t(`${PD}.fields.problemStatement`)} html={project.problem_statement} />
              <RichBlock label={t(`${PD}.fields.methodology`)} html={project.research_methodology} />
              <Grid container spacing={2.5} sx={{ mt: 1 }}>
                <DetailField label={t(`${PD}.fields.researchDesign`)} value={project.research_design} />
                <DetailField label={t(`${PD}.fields.targetPopulation`)} value={project.target_population} fullWidth />
              </Grid>
              {keywords.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mb: 1 }}>{t(`${PD}.fields.keywords`)}</Typography>
                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                    {keywords.map((k) => <Chip key={k} label={k} size="small" />)}
                  </Box>
                </Box>
              )}
              {objectives.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>{t(`${PD}.fields.researchObjectives`)}</Typography>
                  {objectives.map((obj, i) => (
                    <Paper key={i} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 0.5 }}>
                        {obj.title || t(`${PD}.fields.objectiveFallback`, { number: i + 1 })}
                      </Typography>
                      {stripHtml(obj.description) && <Typography sx={{ fontSize: 13, mb: 0.5 }}>{stripHtml(obj.description)}</Typography>}
                      {stripHtml(obj.outcome) && (
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                          {t(`${PD}.fields.expectedOutcome`, { outcome: stripHtml(obj.outcome) })}
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </Box>
              )}
            </SectionCard>
          )}

          {tab === 3 && (
            <>
              <SectionCard icon={MilestoneIcon} title={t(`${PD}.sections.milestones`)}>
                {(project.milestones || []).length === 0 ? (
                  <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{t(`${PD}.empty.noMilestones`)}</Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>{t(`${PD}.table.title`)}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{t(`${PD}.table.due`)}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{t(`${PD}.table.status`)}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{t(`${PD}.table.assignee`)}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{t(`${PD}.table.tasks`)}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(project.milestones || []).map((m) => (
                        <TableRow key={m.id}>
                          <TableCell sx={{ fontWeight: 600 }}>{m.title}</TableCell>
                          <TableCell>{fmtDate(m.due_date, locale)}</TableCell>
                          <TableCell sx={{ textTransform: 'capitalize' }}>{m.status?.replace(/_/g, ' ')}</TableCell>
                          <TableCell>{m.assigned_to_name || '—'}</TableCell>
                          <TableCell>{m.done_count}/{m.task_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </SectionCard>
              <SectionCard icon={MilestoneIcon} title={t(`${PD}.sections.deliverables`)}>
                {(project.deliverables || []).length === 0 ? (
                  <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{t(`${PD}.empty.noDeliverables`)}</Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>{t(`${PD}.table.deliverableName`)}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{t(`${PD}.table.deliverableType`)}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{t(`${PD}.table.due`)}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{t(`${PD}.table.status`)}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{t(`${PD}.table.responsible`)}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(project.deliverables || []).map((d) => (
                        <TableRow key={d.id}>
                          <TableCell sx={{ fontWeight: 600 }}>{d.name}</TableCell>
                          <TableCell>{d.deliverable_type || '—'}</TableCell>
                          <TableCell>{fmtDate(d.due_date, locale)}</TableCell>
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
            <SectionCard icon={EthicsIcon} title={t(`${PD}.sections.ethicsCompliance`)}>
              {stripHtml(project.conflict_of_interest) && (
                <Box sx={{ mb: 2.5 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>{t(`${PD}.fields.conflictOfInterest`)}</Typography>
                  <Typography sx={{ fontSize: 14 }}>{project.conflict_of_interest}</Typography>
                </Box>
              )}
              {(project.ethics_applications || []).length === 0 ? (
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{t(`${PD}.empty.noEthics`)}</Typography>
              ) : (
                <>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>
                    {t(`${PD}.ethics.clickHint`)}
                  </Typography>
                  {(project.ethics_applications || []).map((e) => (
                    <ResourceLink
                      key={e.id}
                      href={`/researcher/ethics/${e.id}`}
                      title={e.title || t(`${PD}.ethics.applicationFallback`)}
                      subtitle={[
                        e.status?.replace(/_/g, ' '),
                        e.submitted_at ? t(`${PD}.ethics.submitted`, { date: fmtDate(e.submitted_at, locale) }) : null,
                        e.approved_until ? t(`${PD}.ethics.validUntil`, { date: fmtDate(e.approved_until, locale) }) : null,
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
                    {t(`${PD}.ethics.viewAll`)}
                  </Button>
                </>
              )}
            </SectionCard>
          )}

          {tab === 5 && (
            <SectionCard icon={StorageIcon} title={t(`${PD}.sections.dataManagementPlan`)}>
              <Grid container spacing={2.5}>
                <DetailField label={t(`${PD}.fields.entryMode`)} value={project.dmp_entry_mode?.replace(/_/g, ' ')} />
                <DetailField label={t(`${PD}.fields.typesOfData`)} value={project.dmp_types_of_data} />
                <DetailField label={t(`${PD}.fields.estimatedVolume`)} value={project.dmp_estimated_volume} />
                <DetailField label={t(`${PD}.fields.dataFormats`)} value={project.dmp_data_formats} />
                <DetailField label={t(`${PD}.fields.primaryStorage`)} value={project.dmp_primary_storage} />
                <DetailField label={t(`${PD}.fields.retentionPeriod`)} value={project.dmp_retention_period} />
                <DetailField label={t(`${PD}.fields.repository`)} value={project.dmp_repository} fullWidth />
              </Grid>
              <RichBlock label={t(`${PD}.fields.backupProcedure`)} html={project.dmp_backup_procedure} />
              <RichBlock label={t(`${PD}.fields.accessControls`)} html={project.dmp_access_controls} />
              <RichBlock label={t(`${PD}.fields.sharingPlan`)} html={project.dmp_sharing_plan} />
            </SectionCard>
          )}

          {tab === 6 && (
            <SectionCard icon={MoneyIcon} title={t(`${PD}.sections.budgetFinancial`)}>
              <Grid container spacing={2.5} sx={{ mb: 2 }}>
                <DetailField label={t(`${PD}.fields.reportingCurrency`)} value={project.reporting_currency} />
                <DetailField label={t(`${PD}.fields.overheadRate`)} value={project.financial_overhead_rate} />
                <DetailField label={t(`${PD}.fields.totalBudget`)} value={fmtMoney(budgetTotal, project.reporting_currency, locale)} />
                <DetailField label={t(`${PD}.fields.spentToDate`)} value={fmtMoney(budgetSpent, project.reporting_currency, locale)} />
              </Grid>
              {project.financial_notes && (
                <Typography sx={{ fontSize: 13, mb: 2, color: 'text.secondary' }}>{project.financial_notes}</Typography>
              )}
              {(project.budget_lines || []).length === 0 ? (
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{t(`${PD}.empty.noBudgetLines`)}</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>{t(`${PD}.table.category`)}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{t(`${PD}.table.description`)}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">{t(`${PD}.table.amount`)}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">{t(`${PD}.table.spent`)}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(project.budget_lines || []).map((bl) => (
                      <TableRow key={bl.id}>
                        <TableCell>{bl.category}</TableCell>
                        <TableCell>{bl.description || '—'}</TableCell>
                        <TableCell align="right">{fmtMoney(bl.amount, project.reporting_currency, locale)}</TableCell>
                        <TableCell align="right">{fmtMoney(bl.spent_to_date, project.reporting_currency, locale)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </SectionCard>
          )}

          {tab === 7 && (
            <SectionCard icon={DeclareIcon} title={t(`${PD}.sections.declarationsSignoff`)}>
              {DECLARATION_KEYS.map((key) => (
                <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Chip
                    label={declarations[key] ? t(`${PD}.signoff.signed`) : t(`${PD}.signoff.notSigned`)}
                    size="small"
                    color={declarations[key] ? 'success' : 'default'}
                    sx={{ fontWeight: 700, minWidth: 90 }}
                  />
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{t(`${PD}.declaration.${key}`)}</Typography>
                </Box>
              ))}
              <Box sx={{ mt: 2.5, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <Box>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>{t(`${PD}.fields.piSignoffName`)}</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{project.pi_full_name || '—'}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>{t(`${PD}.fields.declarationDate`)}</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{fmtDate(project.declaration_date, locale)}</Typography>
                </Box>
              </Box>
            </SectionCard>
          )}

          {tab === 8 && (
            <SectionCard icon={DocIcon} title={t(`${PD}.sections.uploadedDocuments`)}>
              {(project.documents || []).length === 0 ? (
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{t(`${PD}.empty.noDocuments`)}</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>{t(`${PD}.table.file`)}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{t(`${PD}.table.type`)}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{t(`${PD}.table.uploaded`)}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{t(`${PD}.table.by`)}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(project.documents || []).map((d) => (
                      <TableRow key={d.id}>
                        <TableCell sx={{ fontWeight: 600 }}>{d.original_filename}</TableCell>
                        <TableCell>{getDocTypeLabel(d.document_type, t)}</TableCell>
                        <TableCell>{fmtDate(d.uploaded_at, locale)}</TableCell>
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
