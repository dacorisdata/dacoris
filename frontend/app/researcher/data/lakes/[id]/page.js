'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  Container,
  Typography,
  Paper,
  Chip,
  Button,
  Grid,
  Divider,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Storage as DatasetIcon,
  AccountBalance as FundingIcon,
  Description as ProposalIcon,
  Science as ProjectIcon,
  Groups as TeamIcon,
  ChevronRight as ChevronIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';

const ACCENT = '#1ca7a1';

const SOURCE_LABELS = {
  google_sheets: 'Google Sheets',
  kobo_collect: 'KoboCollect',
  excel: 'Excel',
  file_upload: 'File Upload',
  url: 'URL',
  api_feed: 'API Feed',
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtMoney = (amt, cur = 'KES') => {
  if (amt == null || amt === '') return '—';
  return `${cur} ${Number(amt).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

const isRichTextEmpty = (html) => {
  if (!html || !html.trim()) return true;
  return !html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
};

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>
    </Box>
  );
}

function SectionCard({ icon: Icon, title, children, action }) {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
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

export default function DatasetProvenancePage() {
  const { id } = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !id) return;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/research/lakehouse-imports/${id}/provenance`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load dataset details');
        setData(await res.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token, id]);

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'Dataset not found'}</Alert>
        <Button startIcon={<BackIcon />} onClick={() => router.push('/researcher/data/lakes')}>
          Back to Data Lakes
        </Button>
      </Container>
    );
  }

  const { dataset, project, proposal, funding_source, project_team, project_teams, proposal_team, version_history, lineage } = data;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Button
        startIcon={<BackIcon />}
        onClick={() => router.push('/researcher/data/lakes')}
        sx={{ mb: 2, textTransform: 'none', color: 'text.secondary' }}
      >
        Back to Data Lakes
      </Button>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
          {dataset.source_tag}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Data origin and lineage — from funding source through project to this dataset
        </Typography>

        {lineage?.length > 0 && (
          <Breadcrumbs separator={<ChevronIcon sx={{ fontSize: 16 }} />} sx={{ mb: 2 }}>
            {lineage.map((step, idx) => {
              const isLast = idx === lineage.length - 1;
              const href =
                step.type === 'project' ? `/researcher/projects/${step.id}`
                : step.type === 'proposal' ? `/researcher/grants/proposals/${step.id}`
                : step.type === 'dataset' ? null
                : null;
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
        {/* Dataset */}
        <Grid item xs={12} md={6}>
          <SectionCard icon={DatasetIcon} title="Dataset">
            <InfoRow label="Label" value={dataset.source_tag} />
            <InfoRow label="Source Type" value={SOURCE_LABELS[dataset.source_type] || dataset.source_type} />
            <InfoRow label="Version" value={`v${dataset.version_number || 1}`} />
            <InfoRow label="Records" value={dataset.record_count != null ? dataset.record_count.toLocaleString() : '—'} />
            <InfoRow label="File" value={dataset.file_name} />
            <InfoRow label="Bronze Path" value={dataset.bronze_path} />
            <InfoRow label="Ingested" value={fmtDate(dataset.ingest_completed_at || dataset.created_at)} />
            <InfoRow label="Researcher" value={data.researcher?.name} />
            <InfoRow label="Institution" value={data.institution?.name} />
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
                <Box
                  sx={{ mt: 0.5, fontSize: 14, lineHeight: 1.6, '& p': { mb: 0.5 } }}
                  dangerouslySetInnerHTML={{ __html: dataset.expected_visuals }}
                />
              </Box>
            )}
          </SectionCard>
        </Grid>

        {/* Funding Source */}
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
                {funding_source.description && (
                  <InfoRow label="Description" value={funding_source.description} />
                )}
              </>
            ) : data.award?.funder_name ? (
              <>
                <InfoRow label="Funder" value={data.award.funder_name} />
                <InfoRow label="Award Number" value={data.award.award_number} />
                <InfoRow label="Award Amount" value={fmtMoney(data.award.total_amount, data.award.currency)} />
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No linked grant opportunity or award. This dataset may have been imported outside a funded project workflow.
              </Typography>
            )}
          </SectionCard>
        </Grid>

        {/* Proposal */}
        <Grid item xs={12} md={6}>
          <SectionCard
            icon={ProposalIcon}
            title="Proposal"
            action={proposal ? (
              <Button
                component={Link}
                href={`/researcher/grants/proposals/${proposal.id}`}
                size="small"
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
                    <InfoRow label="Award Period" value={`${fmtDate(data.award.start_date)} – ${fmtDate(data.award.end_date)}`} />
                  </>
                )}
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No proposal linked to this dataset.
              </Typography>
            )}
          </SectionCard>
        </Grid>

        {/* Project */}
        <Grid item xs={12} md={6}>
          <SectionCard
            icon={ProjectIcon}
            title="Research Project"
            action={project ? (
              <Button
                component={Link}
                href={`/researcher/projects/${project.id}`}
                size="small"
                sx={{ textTransform: 'none', color: ACCENT }}
              >
                Open Project
              </Button>
            ) : null}
          >
            {project ? (
              <>
                <InfoRow label="Title" value={project.title} />
                <InfoRow label="Project Code" value={project.project_code} />
                <InfoRow label="Status" value={project.status} />
                <InfoRow label="Type" value={project.project_type} />
                <InfoRow label="PI" value={project.pi_name} />
                <InfoRow label="Lead Institution" value={project.lead_institution} />
                <InfoRow label="Department" value={project.department} />
                <InfoRow label="Research Area" value={project.research_area} />
                <InfoRow label="Period" value={`${fmtDate(project.start_date)} – ${fmtDate(project.end_date)}`} />
                {project.project_abstract && (
                  <InfoRow label="Abstract" value={project.project_abstract} />
                )}
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                This dataset is not linked to a research project. Link a project when registering future imports.
              </Typography>
            )}
          </SectionCard>
        </Grid>

        {/* Teams */}
        <Grid item xs={12}>
          <SectionCard icon={TeamIcon} title="Project & Proposal Team">
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Project Members</Typography>
                {project_team?.length > 0 ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Role</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {project_team.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell>{m.name || '—'}</TableCell>
                            <TableCell>{m.role}</TableCell>
                            <TableCell>
                              <Chip label={m.status} size="small" sx={{ fontSize: 10, height: 20 }} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary">No project members recorded.</Typography>
                )}

                {project_teams?.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Project Teams</Typography>
                    {project_teams.map((t) => (
                      <Box key={t.id} sx={{ mb: 1.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(t.members || []).map((m) => `${m.name} (${m.role})`).join(' · ') || 'No members'}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Proposal Collaborators</Typography>
                {proposal_team?.length > 0 ? (
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
                        {proposal_team.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>{c.name || '—'}</TableCell>
                            <TableCell>{c.role}</TableCell>
                            <TableCell>{c.affiliation || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary">No proposal collaborators recorded.</Typography>
                )}
              </Grid>
            </Grid>
          </SectionCard>
        </Grid>

        {/* Version history */}
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
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {version_history.map((v) => (
                      <TableRow
                        key={v.id}
                        hover
                        sx={{ cursor: v.id !== id ? 'pointer' : undefined }}
                        onClick={() => v.id !== id && router.push(`/researcher/data/lakes/${v.id}`)}
                      >
                        <TableCell>
                          <Chip label={`v${v.version_number}`} size="small" sx={{ fontWeight: 600 }} />
                          {v.is_current_version && (
                            <Chip label="Latest" size="small" sx={{ ml: 1, height: 18, fontSize: 10, bgcolor: '#10b98115', color: '#059669' }} />
                          )}
                        </TableCell>
                        <TableCell>{v.record_count != null ? v.record_count.toLocaleString() : '—'}</TableCell>
                        <TableCell>{fmtDate(v.ingest_completed_at || v.created_at)}</TableCell>
                        <TableCell>
                          {v.id === id && <Chip label="Current" size="small" variant="outlined" />}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </SectionCard>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}
