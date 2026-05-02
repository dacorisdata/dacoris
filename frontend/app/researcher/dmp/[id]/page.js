'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme, Alert,
  Paper, Divider, LinearProgress, Stepper, Step, StepLabel,
} from '@mui/material';
import {
  ArrowBack as BackIcon, FolderSpecial as DmpIcon,
  Storage as StorageIcon, Shield as SecurityIcon,
  MenuBook as DocIcon, Gavel as LegalIcon, Cloud as RepositoryIcon,
  Assessment as ReviewIcon, Person as PersonIcon,
  CalendarToday as CalIcon, Download as DownloadIcon,
  CheckCircle as CheckIcon, Article as ArticleIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../../../contexts/AuthContext';

const API    = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#1ca7a1';

const DMP_STAGES = ['Submitted', 'Assigned', 'Under Review', 'Revision', 'Approved'];

const STATUS_META = {
  approved:     { label: 'Approved',      color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  under_review: { label: 'Under Review',  color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)'  },
  submitted:    { label: 'Submitted',     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  draft:        { label: 'Draft',         color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  revision:     { label: 'Revision Req.', color: '#f97316', bg: 'rgba(249,115,22,0.1)'  },
};

const SAMPLE_DMP = {
  id: 1,
  ref: 'DMP-2026-001',
  title: 'Data Management Plan — Genomic Analysis of Antibiotic Resistance',
  project_title: 'Genomic Analysis of Antibiotic Resistance in Kenyan Hospitals',
  project_id: 1,
  status: 'approved',
  stage_index: 4,
  submitted_at: '2026-03-15',
  pi: 'Dr. Amina Odhiambo',
  pi_orcid: '0000-0002-1234-5678',
  pi_institution: 'University of Nairobi',
  data_steward: 'Dr. Amina Odhiambo',
  data_steward_email: 'a.odhiambo@uon.ac.ke',
  funder: 'Wellcome Trust',
  funder_requirement: 'Wellcome Trust',
  award_id: 'WT-2025-KE-0042',
  start_date: '2026-01-15',
  end_date: '2028-01-14',
  // Step 2
  data_sources: ['Experimental', 'Observational'],
  data_formats: ['.fasta', '.vcf', '.bam', '.csv', '.json'],
  estimated_volume: '2.5',
  volume_unit: 'TB',
  validation_methods: 'Double data entry for sample metadata. Automated QC pipelines (FastQC, MultiQC) for sequencing data. Instrument calibration logs maintained per site SOP.',
  // Step 3
  storage_locations: ['Institutional Network Drive', 'Managed Cloud (AWS / Azure / GCP)'],
  backup_frequency: 'daily',
  access_list: 'PI (full access), Co-Investigators (read/write), Research Assistants (read-only raw data), Data Manager (full access)',
  encryption_used: true,
  two_factor_auth: true,
  physical_security: true,
  // Step 4
  metadata_schema: 'Dublin Core',
  documentation_content: 'Comprehensive ReadMe files accompany each dataset directory. Variable codebook provided for all clinical metadata. Sequencing run reports and QC summaries stored alongside raw data. File naming convention: SITE_ISOLATEID_DATE_TYPE.ext',
  // Step 5
  data_ownership: 'institutional',
  license: 'CC BY 4.0',
  contains_pii: false,
  contains_spi: true,
  sensitivity_notes: 'HIV status of participants constitutes sensitive personal information. All genomic and clinical data are coded using site-specific participant IDs. Linking key held by PI in encrypted offline storage.',
  // Step 6
  repository: 'Zenodo',
  doi_plan: 'Dataset will be deposited in Zenodo upon study completion. DOI will be obtained and cited in all publications.',
  retention_years: 10,
  destruction_plan: 'Clinical metadata will be securely deleted 10 years post-project using DoD 5220.22-M standard. Genomic sequence data will be retained indefinitely in ENA (European Nucleotide Archive) under controlled access.',
  // Step 7
  storage_costs: 'KES 48,000/year (AWS S3)',
  curation_costs: 'KES 15,000 (Zenodo deposit + curation)',
  hardware_costs: 'KES 80,000 (encrypted external drives for field sites)',
  reviewer_notes: 'Excellent DMP. Storage and backup strategy is robust. Recommend adding GDPR compliance note for data shared with EU collaborators. Retention and destruction plan is comprehensive.',
  documents: [
    { id: 1, name: 'DMP_v1_Final.pdf', type: 'DMP Document', uploaded: '2026-03-14' },
    { id: 2, name: 'Wellcome_Data_Policy_Acknowledgement.pdf', type: 'Policy Document', uploaded: '2026-03-14' },
  ],
  timeline: [
    { date: '2026-03-15', event: 'DMP submitted for review', actor: 'Dr. Amina Odhiambo', type: 'submit' },
    { date: '2026-03-17', event: 'Assigned to RDM Librarian', actor: 'RDM Office', type: 'assign' },
    { date: '2026-03-22', event: 'Under review by RDM office', actor: 'Ms. P. Kariuki', type: 'review' },
    { date: '2026-03-28', event: 'DMP approved', actor: 'Ms. P. Kariuki', type: 'approve' },
  ],
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function InfoCard({ label, value, wide }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  return (
    <Paper elevation={0} sx={{
      px: 2, py: 1.5, borderRadius: 2, flex: wide ? '2 1 260px' : '1 1 160px',
      bgcolor: dark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
      border: '1px solid', borderColor: 'divider',
    }}>
      <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.3 }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{value || '—'}</Typography>
    </Paper>
  );
}

function SectionBlock({ icon: Icon, title, children, iconColor }) {
  return (
    <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, p: 3, mb: 0 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Icon sx={{ fontSize: 16, color: iconColor || ACCENT }} /> {title}
      </Typography>
      {children}
    </Paper>
  );
}

export default function DmpDetailPage() {
  const router = useRouter();
  const { id }  = useParams();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark  = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [dmp, setDmp]         = useState(null);

  useEffect(() => {
    fetchUser().then(async u => {
      if (!u) { router.push('/login'); return; }
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API}/research/dmp/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDmp(res.data);
      } catch {
        setDmp(SAMPLE_DMP);
      } finally {
        setLoading(false);
      }
    });
  }, [id]);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress sx={{ color: ACCENT }} />
    </Box>
  );

  if (!dmp) return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography sx={{ fontSize: 15, color: 'text.secondary' }}>DMP not found.</Typography>
      <Button sx={{ mt: 2, textTransform: 'none' }} onClick={() => router.push('/researcher/dmp')}>Back to DMPs</Button>
    </Box>
  );

  const sm = STATUS_META[dmp.status] || STATUS_META.draft;

  const timelineColors = { submit: ACCENT, assign: '#8b5cf6', review: '#0ea5e9', approve: '#10b981', reject: '#ef4444' };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>

      {/* Top bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button size="small" startIcon={<BackIcon sx={{ fontSize: 14 }} />}
            onClick={() => router.push('/researcher/dmp')}
            sx={{ textTransform: 'none', color: 'text.secondary', borderRadius: 2 }}>
            Data Mgmt Plans
          </Button>
          <Typography sx={{ color: 'divider' }}>|</Typography>
          <Typography sx={{ fontSize: 12, color: ACCENT, fontWeight: 700 }}>{dmp.ref}</Typography>
        </Box>
      </Box>

      {/* Header */}
      <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
        <Box sx={{ px: 3, py: 2.5, background: dark ? 'rgba(255,255,255,0.02)' : '#f8fafc', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Chip label={sm.label} size="small" sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 700, fontSize: 10, height: 20 }} />
                {dmp.funder && <Chip label={dmp.funder} size="small" sx={{ fontSize: 10, height: 20, bgcolor: `${ACCENT}18`, color: ACCENT, fontWeight: 600 }} />}
              </Box>
              <Typography sx={{ fontSize: 18, fontWeight: 800, lineHeight: 1.3, mb: 0.5 }}>{dmp.title}</Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                Linked project: <span style={{ fontWeight: 600 }}>{dmp.project_title}</span>
              </Typography>
            </Box>
          </Box>
        </Box>
        <Box sx={{ px: 3, py: 2.5 }}>
          <Stepper activeStep={dmp.stage_index ?? 0} alternativeLabel sx={{
            '& .MuiStepLabel-label': { fontSize: 11 },
            '& .MuiStepIcon-root.Mui-completed': { color: '#10b981' },
            '& .MuiStepIcon-root.Mui-active': { color: ACCENT },
          }}>
            {DMP_STAGES.map(l => <Step key={l}><StepLabel>{l}</StepLabel></Step>)}
          </Stepper>
        </Box>
      </Paper>

      {dmp.status === 'approved' && (
        <Alert severity="success" icon={<VerifiedIcon />} sx={{ mb: 3, borderRadius: 2 }}>
          <strong>DMP Approved.</strong> This Data Management Plan has been verified by the RDM office. You may reference it in your grant reports.
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Main sections */}
        <Box sx={{ flex: '1 1 500px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2.5 }}>

          {/* Admin details */}
          <SectionBlock icon={DmpIcon} title="Administrative Details">
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <InfoCard label="Principal Investigator" value={dmp.pi} wide />
              <InfoCard label="PI ORCID" value={dmp.pi_orcid} />
              <InfoCard label="Data Steward" value={dmp.data_steward} wide />
              <InfoCard label="Steward Email" value={dmp.data_steward_email} wide />
              <InfoCard label="Award ID" value={dmp.award_id} />
              <InfoCard label="Project Timeline" value={dmp.start_date ? `${fmtDate(dmp.start_date)} → ${fmtDate(dmp.end_date)}` : '—'} wide />
            </Box>
          </SectionBlock>

          {/* Data Collection */}
          <SectionBlock icon={StorageIcon} title="Data Collection & Generation">
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.75 }}>Data Source Types</Typography>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {(dmp.data_sources || []).map(s => (
                  <Chip key={s} label={s} size="small" sx={{ fontSize: 11, bgcolor: `${ACCENT}18`, color: ACCENT, fontWeight: 600 }} />
                ))}
              </Box>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.75 }}>File Formats</Typography>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {(dmp.data_formats || []).map(f => (
                  <Chip key={f} label={f} size="small" sx={{ fontSize: 11, bgcolor: dark ? 'rgba(255,255,255,0.07)' : '#f1f5f9', fontWeight: 600 }} />
                ))}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: dmp.validation_methods ? 2 : 0 }}>
              <InfoCard label="Estimated Volume" value={`${dmp.estimated_volume} ${dmp.volume_unit}`} />
            </Box>
            {dmp.validation_methods && (
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.5 }}>Quality Control</Typography>
                <Typography sx={{ fontSize: 13, lineHeight: 1.6 }}>{dmp.validation_methods}</Typography>
              </Box>
            )}
          </SectionBlock>

          {/* Storage & Security */}
          <SectionBlock icon={SecurityIcon} title="Storage, Backup & Security" iconColor="#ef4444">
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.75 }}>Storage Locations</Typography>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {(dmp.storage_locations || []).map(s => (
                  <Chip key={s} label={s} size="small" sx={{ fontSize: 11, bgcolor: dark ? 'rgba(255,255,255,0.07)' : '#f1f5f9', fontWeight: 600 }} />
                ))}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <InfoCard label="Backup Frequency" value={dmp.backup_frequency} />
            </Box>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 2 }}>
              {[
                { label: 'Encryption', on: dmp.encryption_used },
                { label: '2FA Enforced', on: dmp.two_factor_auth },
                { label: 'Physical Security', on: dmp.physical_security },
              ].map(({ label, on }) => (
                <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <CheckIcon sx={{ fontSize: 15, color: on ? '#10b981' : 'text.disabled' }} />
                  <Typography sx={{ fontSize: 12.5, color: on ? 'text.primary' : 'text.disabled' }}>{label}</Typography>
                </Box>
              ))}
            </Box>
            {dmp.access_list && (
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.5 }}>Access List</Typography>
                <Typography sx={{ fontSize: 13, lineHeight: 1.6 }}>{dmp.access_list}</Typography>
              </Box>
            )}
          </SectionBlock>

          {/* Documentation */}
          <SectionBlock icon={DocIcon} title="Documentation & Metadata">
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: dmp.documentation_content ? 2 : 0 }}>
              <InfoCard label="Metadata Schema" value={dmp.metadata_schema} />
            </Box>
            {dmp.documentation_content && (
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.5 }}>Documentation Details</Typography>
                <Typography sx={{ fontSize: 13, lineHeight: 1.6 }}>{dmp.documentation_content}</Typography>
              </Box>
            )}
          </SectionBlock>

          {/* Ethics, Legal & IP */}
          <SectionBlock icon={LegalIcon} title="Ethics, Legal & IP" iconColor="#8b5cf6">
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <InfoCard label="Data Ownership" value={dmp.data_ownership} />
              <InfoCard label="License" value={dmp.license} wide />
            </Box>
            <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
              {[
                { label: 'Contains PII', on: dmp.contains_pii },
                { label: 'Contains SPI', on: dmp.contains_spi },
              ].map(({ label, on }) => (
                <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <CheckIcon sx={{ fontSize: 15, color: on ? '#f97316' : 'text.disabled' }} />
                  <Typography sx={{ fontSize: 12.5, color: on ? '#f97316' : 'text.disabled', fontWeight: on ? 700 : 400 }}>{label}</Typography>
                </Box>
              ))}
            </Box>
            {dmp.sensitivity_notes && (
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.5 }}>Sensitivity Notes</Typography>
                <Typography sx={{ fontSize: 13, lineHeight: 1.6 }}>{dmp.sensitivity_notes}</Typography>
              </Box>
            )}
          </SectionBlock>

          {/* Preservation */}
          <SectionBlock icon={RepositoryIcon} title="Preservation & Sharing">
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <InfoCard label="Repository" value={dmp.repository} />
              <InfoCard label="Retention Period" value={dmp.retention_years ? `${dmp.retention_years} years` : '—'} />
            </Box>
            {dmp.doi_plan && (
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.5 }}>DOI Plan</Typography>
                <Typography sx={{ fontSize: 13, lineHeight: 1.6 }}>{dmp.doi_plan}</Typography>
              </Box>
            )}
            {dmp.destruction_plan && (
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.5 }}>Destruction Plan</Typography>
                <Typography sx={{ fontSize: 13, lineHeight: 1.6 }}>{dmp.destruction_plan}</Typography>
              </Box>
            )}
          </SectionBlock>

          {/* Reviewer notes */}
          {dmp.reviewer_notes && (
            <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ReviewIcon sx={{ fontSize: 16, color: ACCENT }} /> RDM Reviewer Notes
              </Typography>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: dark ? `${ACCENT}08` : `${ACCENT}06`, border: `1px solid ${ACCENT}25` }}>
                <Typography sx={{ fontSize: 13, lineHeight: 1.7 }}>{dmp.reviewer_notes}</Typography>
              </Box>
            </Paper>
          )}
        </Box>

        {/* Right sidebar */}
        <Box sx={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* Costs */}
          <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5 }}>DMP Costs</Typography>
            {[
              { label: 'Storage',    value: dmp.storage_costs },
              { label: 'Curation',   value: dmp.curation_costs },
              { label: 'Hardware',   value: dmp.hardware_costs },
            ].map(({ label, value }) => (
              <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px dashed', borderColor: 'divider' }}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{label}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{value || '—'}</Typography>
              </Box>
            ))}
          </Paper>

          {/* Documents */}
          <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ArticleIcon sx={{ fontSize: 16, color: ACCENT }} /> Documents
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {(dmp.documents || []).map(doc => (
                <Box key={doc.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5,
                  p: 1.25, borderRadius: 1.5, border: '1px solid', borderColor: 'divider',
                  '&:hover': { borderColor: ACCENT }, transition: 'all 0.15s', cursor: 'pointer' }}>
                  <ArticleIcon sx={{ fontSize: 15, color: ACCENT, flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 600 }} noWrap>{doc.name}</Typography>
                    <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{doc.type} · {fmtDate(doc.uploaded)}</Typography>
                  </Box>
                  <DownloadIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                </Box>
              ))}
            </Box>
          </Paper>

          {/* Key dates */}
          <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalIcon sx={{ fontSize: 16, color: ACCENT }} /> Key Info
            </Typography>
            {[
              { label: 'Submitted',    value: fmtDate(dmp.submitted_at) },
              { label: 'Funder',       value: dmp.funder },
              { label: 'Repository',   value: dmp.repository },
              { label: 'Retention',    value: dmp.retention_years ? `${dmp.retention_years} years` : '—' },
            ].map(({ label, value }) => (
              <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px dashed', borderColor: 'divider' }}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{label}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{value || '—'}</Typography>
              </Box>
            ))}
          </Paper>

          {/* Timeline */}
          <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5 }}>Activity Timeline</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {(dmp.timeline || []).map((event, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', mt: 0.6, flexShrink: 0,
                    bgcolor: timelineColors[event.type] || ACCENT }} />
                  <Box>
                    <Typography sx={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{event.event}</Typography>
                    <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{event.actor} · {fmtDate(event.date)}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
