'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Box, Typography, CircularProgress, useTheme, Button, Chip, Paper, Divider, LinearProgress } from '@mui/material';
import {
  ArrowBack as BackIcon, Science as ProjectIcon,
  Person as PersonIcon, AccountBalance as FunderIcon,
  CalendarToday as CalIcon, Groups as TeamIcon,
  CheckCircle as ApproveIcon, Cancel as RejectIcon,
  Refresh as ReviseIcon, AttachMoney as BudgetIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../../contexts/AuthContext';
import api from '../../../../../lib/api';

const ACCENT = '#16a699';

const STATUS_META = {
  pending_review: { label: 'Pending Review', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  under_review:   { label: 'Under Review',   color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  approved:       { label: 'Approved',       color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  revision:       { label: 'Revision Req.',  color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  rejected:       { label: 'Rejected',       color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
};

const MOCK = {
  id: 1,
  title: 'Genomic Analysis of Antibiotic Resistance in Kenyan Hospitals',
  pi_name: 'Dr. Amina Odhiambo',
  pi_orcid: '0000-0002-1234-5678',
  institution: 'University of Nairobi',
  department: 'Microbiology',
  award_ref: 'AWD-2026-001',
  funder: 'Wellcome Trust',
  total_amount: 7500000,
  currency: 'KES',
  submitted_at: '2026-04-15',
  status: 'under_review',
  team_size: 4,
  milestones: 6,
  priority: 'high',
  abstract: 'This study investigates the genetic mechanisms underlying antibiotic resistance in clinical isolates from major Kenyan hospitals, aiming to inform treatment protocols and antibiotic stewardship programmes.',
  objectives: [
    'Isolate and characterize antibiotic-resistant bacteria from 5 major hospitals',
    'Perform whole-genome sequencing to identify resistance genes',
    'Analyze transmission patterns using phylogenetic methods',
    'Develop evidence-based treatment guidelines for clinicians',
  ],
  milestones_list: [
    { name: 'Sample Collection', progress: 100, status: 'completed' },
    { name: 'DNA Extraction & QC', progress: 85, status: 'in_progress' },
    { name: 'Genome Sequencing', progress: 40, status: 'in_progress' },
    { name: 'Bioinformatics Analysis', progress: 0, status: 'pending' },
    { name: 'Clinical Guidelines Draft', progress: 0, status: 'pending' },
    { name: 'Final Report & Publication', progress: 0, status: 'pending' },
  ],
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtMoney = (n, c) => n ? `${c || 'KES'} ${Number(n).toLocaleString()}` : '—';

export default function AdminProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin) { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    try {
      const res = await api.get(`/research/projects/${params.id}`).catch(() => null);
      setProject(res?.data || MOCK);
    } catch { setProject(MOCK); }
    setLoading(false);
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress sx={{ color: ACCENT }} />
    </Box>
  );

  if (!project) return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography>Project not found</Typography>
    </Box>
  );

  const sm = STATUS_META[project.status] || STATUS_META.pending_review;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Button startIcon={<BackIcon />} onClick={() => router.push('/admin-staff/research/projects/review')}
        sx={{ mb: 3, textTransform: 'none', color: 'text.secondary' }}>
        Back to Project Reviews
      </Button>

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
          </Box>
          <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>{project.award_ref}</Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Overview */}
          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>Project Overview</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.7, mb: 3 }}>{project.abstract}</Typography>

            <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.7, mb: 1.5 }}>Objectives</Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {project.objectives?.map((obj, i) => (
                <Typography component="li" key={i} sx={{ fontSize: 13, color: 'text.secondary', mb: 0.8 }}>{obj}</Typography>
              ))}
            </Box>
          </Paper>

          {/* Milestones */}
          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>Project Milestones</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {project.milestones_list?.map((m, i) => (
                <Box key={i}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{m.name}</Typography>
                    <Typography sx={{ fontSize: 12, color: ACCENT, fontWeight: 700 }}>{m.progress}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={m.progress}
                    sx={{ height: 6, borderRadius: 3, bgcolor: 'divider', '& .MuiLinearProgress-bar': { bgcolor: m.progress === 100 ? '#10b981' : ACCENT } }} />
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Key Details */}
          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>Key Details</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {[
                { label: 'Principal Investigator', value: project.pi_name, icon: <PersonIcon sx={{ fontSize: 14 }} /> },
                { label: 'ORCID', value: project.pi_orcid },
                { label: 'Institution', value: project.institution },
                { label: 'Department', value: project.department },
                { label: 'Funder', value: project.funder, icon: <FunderIcon sx={{ fontSize: 14 }} /> },
                { label: 'Total Budget', value: fmtMoney(project.total_amount, project.currency), icon: <BudgetIcon sx={{ fontSize: 14 }} /> },
                { label: 'Team Size', value: `${project.team_size} members`, icon: <TeamIcon sx={{ fontSize: 14 }} /> },
                { label: 'Submitted', value: fmtDate(project.submitted_at), icon: <CalIcon sx={{ fontSize: 14 }} /> },
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

          {/* Actions */}
          {['pending_review', 'under_review', 'revision'].includes(project.status) && (
            <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 2 }}>Review Actions</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button fullWidth variant="contained" startIcon={<ApproveIcon />}
                  sx={{ textTransform: 'none', borderRadius: 2, bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}>
                  Approve Project
                </Button>
                <Button fullWidth variant="outlined" startIcon={<ReviseIcon />}
                  sx={{ textTransform: 'none', borderRadius: 2, borderColor: '#f97316', color: '#f97316' }}>
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
