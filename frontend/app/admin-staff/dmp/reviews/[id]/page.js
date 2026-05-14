'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Box, Typography, CircularProgress, useTheme, Button, Chip, Paper, Divider, TextField } from '@mui/material';
import {
  ArrowBack as BackIcon, FolderSpecial as DmpIcon,
  Person as PersonIcon, AccountBalance as FunderIcon,
  Storage as StorageIcon, CalendarToday as CalIcon,
  CheckCircle as ApproveIcon, Cancel as RejectIcon,
  ChangeCircle as DeferIcon, Article as DocIcon,
  Security as SecurityIcon, CloudUpload as PreservationIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../../contexts/AuthContext';
import api from '../../../../../lib/api';

const ACCENT = '#0ea5e9';

const STATUS_META = {
  assigned:    { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', label: 'Assigned' },
  in_progress: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'In Progress' },
  submitted:   { bg: 'rgba(16,185,129,0.12)', color: '#10b981', label: 'Review Submitted' },
};

const MOCK = {
  id: 1,
  ref: 'DMP-2026-001',
  dmp_title: 'Data Management Plan — Genomic Analysis of Antibiotic Resistance',
  pi_name: 'Dr. Amina Odhiambo',
  institution: 'University of Nairobi',
  funder: 'Wellcome Trust',
  repository: 'Zenodo',
  volume: '2.5 TB',
  assigned_at: '2026-03-17',
  status: 'in_progress',
  stage_name: 'RDM Compliance Review',
  data_types: 'Whole-genome sequencing data (FASTQ, BAM), clinical metadata (CSV), analysis scripts (Python, R)',
  collection_methods: 'Automated sequencing pipeline; clinical data extracted from hospital EMR systems',
  storage_location: 'Institutional HPC cluster (primary); AWS S3 (backup)',
  security_measures: 'Encryption at rest and in transit; role-based access control; audit logging',
  metadata_standards: 'Dublin Core, DataCite schema, FAIR principles compliance',
  preservation_plan: 'Long-term archival in Zenodo with DOI assignment; 10-year retention minimum',
  ethical_considerations: 'Patient consent for genetic data sharing; anonymization protocols; GDPR compliance',
  estimated_cost: 'KES 450,000 (storage, curation, archival)',
  documents: ['DMP_Full_v2.pdf', 'Data_Dictionary.xlsx', 'Consent_Data_Sharing.pdf'],
  review_notes: '',
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function DmpReviewDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState(null);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin) { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    try {
      const res = await api.get(`/research/dmp/reviews/${params.id}`).catch(() => null);
      setReview(res?.data || MOCK);
    } catch { setReview(MOCK); }
    setLoading(false);
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress sx={{ color: ACCENT }} />
    </Box>
  );

  if (!review) return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography>DMP review not found</Typography>
    </Box>
  );

  const sm = STATUS_META[review.status] || STATUS_META.assigned;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Button startIcon={<BackIcon />} onClick={() => router.push('/admin-staff/dmp/reviews')}
        sx={{ mb: 3, textTransform: 'none', color: 'text.secondary' }}>
        Back to DMP Reviews
      </Button>

      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ width: 48, height: 48, borderRadius: 2.5, bgcolor: `${ACCENT}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <DmpIcon sx={{ fontSize: 24, color: ACCENT }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 10, color: ACCENT, fontWeight: 700, letterSpacing: 0.5 }}>{review.ref}</Typography>
            <Typography sx={{ fontSize: 22, fontWeight: 800 }}>{review.dmp_title}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Chip label={sm.label} size="small" sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 600, fontSize: 11 }} />
            <Chip label={review.stage_name} size="small" sx={{ bgcolor: 'rgba(100,116,139,0.1)', color: '#64748b', fontWeight: 600, fontSize: 10 }} />
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Data Collection & Types */}
          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>Data Collection & Types</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, mb: 0.5 }}>DATA TYPES</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{review.data_types}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, mb: 0.5 }}>COLLECTION METHODS</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{review.collection_methods}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, mb: 0.5 }}>ESTIMATED VOLUME</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{review.volume}</Typography>
              </Box>
            </Box>
          </Paper>

          {/* Storage & Security */}
          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SecurityIcon sx={{ fontSize: 18, color: ACCENT }} />
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Storage & Security</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, mb: 0.5 }}>STORAGE LOCATION</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{review.storage_location}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, mb: 0.5 }}>SECURITY MEASURES</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{review.security_measures}</Typography>
              </Box>
            </Box>
          </Paper>

          {/* Documentation & Metadata */}
          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>Documentation & Metadata</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, mb: 0.5 }}>METADATA STANDARDS</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{review.metadata_standards}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, mb: 0.5 }}>REPOSITORY</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{review.repository}</Typography>
              </Box>
            </Box>
          </Paper>

          {/* Preservation & Ethics */}
          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PreservationIcon sx={{ fontSize: 18, color: ACCENT }} />
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Preservation & Ethics</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, mb: 0.5 }}>PRESERVATION PLAN</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{review.preservation_plan}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, mb: 0.5 }}>ETHICAL CONSIDERATIONS</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{review.ethical_considerations}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700, mb: 0.5 }}>ESTIMATED COST</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{review.estimated_cost}</Typography>
              </Box>
            </Box>
          </Paper>

          {/* Review Notes */}
          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>Review Notes & Recommendations</Typography>
            <TextField fullWidth multiline rows={4} disabled
              value={review.review_notes || 'No notes provided yet.'}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          </Paper>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Key Info */}
          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>Key Information</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {[
                { label: 'Principal Investigator', value: review.pi_name, icon: <PersonIcon sx={{ fontSize: 14 }} /> },
                { label: 'Institution', value: review.institution },
                { label: 'Funder', value: review.funder, icon: <FunderIcon sx={{ fontSize: 14 }} /> },
                { label: 'Repository', value: review.repository, icon: <StorageIcon sx={{ fontSize: 14 }} /> },
                { label: 'Data Volume', value: review.volume },
                { label: 'Assigned', value: fmtDate(review.assigned_at), icon: <CalIcon sx={{ fontSize: 14 }} /> },
              ].map(({ label, value, icon }) => (
                <Box key={label}>
                  <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.3 }}>{label}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {icon && <Box sx={{ color: 'text.disabled' }}>{icon}</Box>}
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{value}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>

          {/* Documents */}
          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>Supporting Documents</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {review.documents?.map((doc, i) => (
                <Chip key={i} icon={<DocIcon sx={{ fontSize: 13 }} />} label={doc} size="small"
                  sx={{ justifyContent: 'flex-start', borderRadius: 1.5, fontSize: 11, bgcolor: dark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }} />
              ))}
            </Box>
          </Paper>

          {/* Actions */}
          {review.status !== 'submitted' && (
            <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>Review Actions</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button fullWidth variant="contained" startIcon={<ApproveIcon />}
                  sx={{ textTransform: 'none', borderRadius: 2, bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}>
                  Approve DMP
                </Button>
                <Button fullWidth variant="outlined" startIcon={<DeferIcon />}
                  sx={{ textTransform: 'none', borderRadius: 2, borderColor: '#0ea5e9', color: '#0ea5e9' }}>
                  Request Revision
                </Button>
                <Button fullWidth variant="outlined" startIcon={<RejectIcon />}
                  sx={{ textTransform: 'none', borderRadius: 2, borderColor: '#ef4444', color: '#ef4444' }}>
                  Reject
                </Button>
              </Box>
            </Paper>
          )}
        </Box>
      </Box>
    </Box>
  );
}
