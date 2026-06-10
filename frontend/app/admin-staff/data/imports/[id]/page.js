'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Box, Typography, Paper, Chip, Button, Grid, Divider, CircularProgress,
  Alert, Breadcrumbs, Table, TableBody, TableCell, TableHead, TableRow,
  TableContainer,
} from '@mui/material';
import {
  ArrowBack as BackIcon, Storage as DatasetIcon, AccountBalance as FundingIcon,
  Description as ProposalIcon, Science as ProjectIcon, Groups as TeamIcon,
  ChevronRight as ChevronIcon, OpenInNew as OpenIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../../contexts/AuthContext';
import api from '../../../../../lib/api';

const ACCENT = '#16a699';

const SOURCE_LABELS = {
  google_sheets: 'Google Sheets',
  kobo_collect: 'KoboCollect',
  excel: 'Excel',
  file_upload: 'File Upload',
  url: 'URL',
  api_feed: 'API Feed',
};

const INGEST_STATUS_META = {
  pending:   { bg: 'rgba(100,116,139,0.12)', color: '#64748b', label: 'Pending' },
  queued:    { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6', label: 'Queued' },
  ingesting: { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', label: 'Ingesting' },
  ingested:  { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', label: 'Ingested' },
  failed:    { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', label: 'Failed' },
};

const fmtDate = d =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtMoney = (amt, cur = 'KES') => {
  if (amt == null || amt === '') return '—';
  return `${cur} ${Number(amt).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

const isRichTextEmpty = html => {
  if (!html || !html.trim()) return true;
  return !html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
};

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>
    </Box>
  );
}

function SectionCard({ icon: Icon, title, children, action }) {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 2, height: '100%', border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon sx={{ color: ACCENT, fontSize: 22 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 16 }}>{title}</Typography>
        </Box>
        {action}
      </Box>
      {children}
    </Paper>
  );
}

export default function ImportDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { fetchUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const u = await fetchUser();
      if (!u) { router.push('/login'); return; }
      if (u.is_global_admin) { router.push('/global-admin/dashboard'); return; }
      if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
      await loadDetail();
    })();
  }, [id]);

  const loadDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/admin-staff/data-imports/${id}`);
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load dataset details');
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

  if (error || !data) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'Dataset not found'}</Alert>
        <Button startIcon={<BackIcon />} onClick={() => router.push('/admin-staff/data/imports')}>
          Back to Imported Data
        </Button>
      </Box>
    );
  }

  const {
    dataset, project, proposal, funding_source, project_team, project_teams,
    proposal_team, version_history, lineage, subject,
  } = data;
  const statusMeta = INGEST_STATUS_META[dataset.ingest_status] || {};

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Button
        startIcon={<BackIcon />}
        onClick={() => router.push('/admin-staff/data/imports')}
        sx={{ mb: 2, textTransform: 'none', color: 'text.secondary' }}
      >
        Back to Imported Data
      </Button>

      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 1 }}>
          <Typography sx={{ fontSize: 26, fontWeight: 700 }}>{dataset.source_tag}</Typography>
          <Chip
            label={statusMeta.label || dataset.ingest_status}
            size="small"
            sx={{ bgcolor: statusMeta.bg, color: statusMeta.color, fontWeight: 600 }}
          />
        </Box>
        <Typography sx={{ color: 'text.secondary', fontSize: 14, mb: 2 }}>
          Dataset lineage — researcher, project, and linked proposal
        </Typography>

        {lineage?.length > 0 && (
          <Breadcrumbs separator={<ChevronIcon sx={{ fontSize: 16 }} />} sx={{ mb: 2 }}>
            {lineage.map((step, idx) => {
              const isLast = idx === lineage.length - 1;
              let href = null;
              if (step.type === 'project') href = `/admin-staff/research/projects/${step.id}`;
              if (step.type === 'proposal') href = `/admin-staff/grants/proposals/${step.id}`;
              if (href && !isLast) {
                return (
                  <Link key={step.type} href={href} style={{ textDecoration: 'none', color: ACCENT, fontWeight: 600, fontSize: 13 }}>
                    {step.label}
                  </Link>
                );
              }
              return (
                <Typography key={step.type} variant="body2" sx={{ fontWeight: isLast ? 700 : 500, color: isLast ? 'text.primary' : 'text.secondary' }}>
                  {step.label}
                </Typography>
              );
            })}
          </Breadcrumbs>
        )}
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <SectionCard icon={DatasetIcon} title="Dataset">
            <InfoRow label="Label" value={dataset.source_tag} />
            <InfoRow label="Source Type" value={SOURCE_LABELS[dataset.source_type] || dataset.source_type} />
            <InfoRow label="Version" value={`v${dataset.version_number || 1}`} />
            <InfoRow label="Records" value={dataset.record_count != null ? dataset.record_count.toLocaleString() : '—'} />
            <InfoRow label="File" value={dataset.file_name} />
            <InfoRow label="Bronze Path" value={dataset.bronze_path} />
            <InfoRow label="Imported" value={fmtDate(dataset.ingest_completed_at || dataset.created_at)} />
            <InfoRow label="Researcher" value={data.researcher?.name} />
            <InfoRow label="Institution" value={data.institution?.name} />
            <InfoRow label="Subject Type" value={subject} />
            {data.researcher?.departments?.length > 0 && (
              <InfoRow label="Department(s)" value={data.researcher.departments.join(', ')} />
            )}
            <Divider sx={{ my: 1.5 }} />
            <InfoRow
              label="Analysis"
              value={dataset.analysis_mode === 'dacoris' ? 'Dacoris Data Team' : 'Self-analysis'}
            />
            {dataset.analysis_mode === 'dacoris' && !isRichTextEmpty(dataset.expected_visuals) && (
              <Box>
                <Typography variant="caption" color="text.secondary">Expected Visuals</Typography>
                <Box sx={{ mt: 0.5, fontSize: 14, lineHeight: 1.6, '& p': { mb: 0.5 } }}
                  dangerouslySetInnerHTML={{ __html: dataset.expected_visuals }}
                />
              </Box>
            )}
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <SectionCard icon={FundingIcon} title="Funding Source">
            {funding_source ? (
              <>
                <InfoRow label="Opportunity" value={funding_source.title} />
                <InfoRow label="Sponsor / Funder" value={funding_source.sponsor} />
                <InfoRow label="Funding Type" value={funding_source.funding_type} />
                <InfoRow label="Category" value={funding_source.category} />
                <InfoRow label="Award Range" value={
                  funding_source.amount_min || funding_source.amount_max
                    ? `${fmtMoney(funding_source.amount_min, funding_source.currency)} – ${fmtMoney(funding_source.amount_max, funding_source.currency)}`
                    : '—'
                } />
                <InfoRow label="Geography" value={funding_source.geography} />
                <InfoRow label="Deadline" value={fmtDate(funding_source.deadline)} />
              </>
            ) : data.award?.funder_name ? (
              <>
                <InfoRow label="Funder" value={data.award.funder_name} />
                <InfoRow label="Award Number" value={data.award.award_number} />
                <InfoRow label="Award Amount" value={fmtMoney(data.award.total_amount, data.award.currency)} />
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No linked grant opportunity. This dataset may have been imported outside a funded project workflow.
              </Typography>
            )}
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <SectionCard
            icon={ProposalIcon}
            title="Proposal"
            action={proposal ? (
              <Button
                component={Link}
                href={`/admin-staff/grants/proposals/${proposal.id}`}
                size="small"
                endIcon={<OpenIcon sx={{ fontSize: 14 }} />}
                sx={{ textTransform: 'none', color: ACCENT }}
              >
                Open Proposal
              </Button>
            ) : null}
          >
            {proposal ? (
              <>
                <InfoRow label="Title" value={proposal.title} />
                <InfoRow label="Status" value={proposal.status} />
                <InfoRow label="Lead PI" value={proposal.lead_pi_name} />
                <InfoRow label="Review Stage" value={proposal.review_stage_name} />
                <InfoRow label="Submitted" value={fmtDate(proposal.submitted_at)} />
                {data.award && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <InfoRow label="Award Number" value={data.award.award_number} />
                    <InfoRow label="Award Status" value={data.award.status} />
                    <InfoRow label="Award Value" value={fmtMoney(data.award.total_amount, data.award.currency)} />
                  </>
                )}
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">No linked proposal.</Typography>
            )}
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <SectionCard
            icon={ProjectIcon}
            title="Project"
            action={project ? (
              <Button
                component={Link}
                href={`/admin-staff/research/projects/${project.id}`}
                size="small"
                endIcon={<OpenIcon sx={{ fontSize: 14 }} />}
                sx={{ textTransform: 'none', color: ACCENT }}
              >
                Open Project
              </Button>
            ) : null}
          >
            {project ? (
              <>
                <InfoRow label="Title" value={project.title} />
                <InfoRow label="Code" value={project.project_code} />
                <InfoRow label="Status" value={project.status} />
                <InfoRow label="PI" value={project.pi_name} />
                <InfoRow label="Department" value={project.department} />
                <InfoRow label="Research Area" value={project.research_area} />
                <InfoRow label="Period" value={`${fmtDate(project.start_date)} – ${fmtDate(project.end_date)}`} />
                <InfoRow label="Subject Type" value={subject} />
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">No linked project.</Typography>
            )}
          </SectionCard>
        </Grid>

        {(project_team?.length > 0 || proposal_team?.length > 0) && (
          <Grid item xs={12}>
            <SectionCard icon={TeamIcon} title="Team">
              {project_team?.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Project Members</Typography>
                  <TableContainer sx={{ mb: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Role</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {project_team.map(m => (
                          <TableRow key={m.id}>
                            <TableCell>{m.name}</TableCell>
                            <TableCell>{m.role}</TableCell>
                            <TableCell>{m.status}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
              {proposal_team?.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Proposal Collaborators</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Role</TableCell>
                          <TableCell>Affiliation</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {proposal_team.map(c => (
                          <TableRow key={c.id}>
                            <TableCell>{c.name}</TableCell>
                            <TableCell>{c.role}</TableCell>
                            <TableCell>{c.affiliation || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </SectionCard>
          </Grid>
        )}

        {version_history?.length > 1 && (
          <Grid item xs={12}>
            <SectionCard icon={DatasetIcon} title="Version History">
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Version</TableCell>
                      <TableCell>Records</TableCell>
                      <TableCell>Ingested</TableCell>
                      <TableCell>Current</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {version_history.map(v => (
                      <TableRow key={v.id}>
                        <TableCell>v{v.version_number}</TableCell>
                        <TableCell>{v.record_count != null ? v.record_count.toLocaleString() : '—'}</TableCell>
                        <TableCell>{fmtDate(v.ingest_completed_at || v.created_at)}</TableCell>
                        <TableCell>{v.is_current_version ? 'Yes' : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </SectionCard>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
