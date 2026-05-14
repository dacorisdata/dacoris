'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, CircularProgress, useTheme, Button, Chip, Alert, Paper, Divider } from '@mui/material';
import {
  Grading as ReviewIcon, ArrowForward as ArrowIcon,
  Person as PersonIcon, AccountBalance as FunderIcon,
  CalendarToday as CalIcon, Groups as TeamIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../../contexts/AuthContext';
import api from '../../../../../lib/api';

const ACCENT = '#16a699';

const STATUS_META = {
  assigned:    { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6',  label: 'Assigned'       },
  in_progress: { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b',  label: 'In Progress'    },
  submitted:   { bg: 'rgba(16,185,129,0.12)',  color: '#10b981',  label: 'Review Submitted'},
  deferred:    { bg: 'rgba(100,116,139,0.12)', color: '#64748b',  label: 'Deferred'       },
};

const MOCK = [
  {
    id: 1,
    project_title: 'Genomic Analysis of Antibiotic Resistance in Kenyan Hospitals',
    pi_name: 'Dr. Amina Odhiambo',
    institution: 'University of Nairobi',
    funder: 'Wellcome Trust',
    project_type: 'Funded',
    team_size: 5,
    milestones: 6,
    award_ref: 'AWD-2026-001',
    status: 'assigned',
    assigned_at: '2026-04-15',
    stage_name: 'Initial Submission Review',
    priority: 'high',
  },
  {
    id: 2,
    project_title: 'Climate-Smart Agriculture Adoption Among Smallholder Farmers',
    pi_name: 'Prof. James Mwangi',
    institution: 'Egerton University',
    funder: 'CGIAR',
    project_type: 'Funded',
    team_size: 3,
    milestones: 5,
    award_ref: 'AWD-2026-002',
    status: 'in_progress',
    assigned_at: '2026-04-18',
    stage_name: 'Budget & Compliance Review',
    priority: 'medium',
  },
  {
    id: 3,
    project_title: 'Digital Health Interventions for Maternal Care in Rural Settings',
    pi_name: 'Dr. Grace Njoroge',
    institution: 'Kenyatta University',
    funder: 'Bill & Melinda Gates Foundation',
    project_type: 'Funded',
    team_size: 6,
    milestones: 8,
    award_ref: 'AWD-2026-003',
    status: 'submitted',
    assigned_at: '2026-04-10',
    stage_name: 'Final Approval',
    priority: 'high',
  },
];

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function AdminProjectReviewPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark  = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [error, setError]     = useState('');

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin)      { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    try {
      const res = await api.get('/research/projects/reviews/my').catch(() => ({ data: [] }));
      const live = res.data || [];
      setReviews(live.length > 0 ? live : MOCK);
    } catch { setReviews(MOCK); }
    setLoading(false);
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress sx={{ color: ACCENT }} />
    </Box>
  );

  const pendingCount = reviews.filter(r => ['assigned', 'in_progress'].includes(r.status)).length;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ color: 'text.primary', fontSize: 26, fontWeight: 700, mb: 0.5 }}>Project Reviews</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>Research project submissions assigned to you for administrative review</Typography>
        </Box>
        {pendingCount > 0 && (
          <Chip label={`${pendingCount} Pending`} sx={{ bgcolor: `${ACCENT}18`, color: ACCENT, fontWeight: 700, fontSize: 12 }} />
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {reviews.length === 0 ? (
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 6, border: `1px solid ${theme.palette.divider}`, textAlign: 'center', boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)' }}>
          <Box sx={{ width: 72, height: 72, borderRadius: 3, bgcolor: `${ACCENT}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
            <ReviewIcon sx={{ fontSize: 36, color: ACCENT }} />
          </Box>
          <Typography sx={{ color: 'text.primary', fontSize: 18, fontWeight: 600, mb: 1 }}>No project reviews assigned yet</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14, maxWidth: 440, mx: 'auto', mb: 1 }}>
            Grant Managers will assign submitted research projects for administrative review based on your role and area of oversight.
          </Typography>
          <Typography sx={{ color: 'text.disabled', fontSize: 13, maxWidth: 440, mx: 'auto' }}>
            You will receive a notification when a new project review is assigned to you.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {reviews.map(r => {
            const sm = STATUS_META[r.status] || STATUS_META.assigned;
            return (
              <Box key={r.id} sx={{
                bgcolor: 'background.paper', borderRadius: 3, p: 3,
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
                transition: 'border-color 0.18s', '&:hover': { borderColor: ACCENT },
              }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
                      <Typography sx={{ color: 'text.primary', fontWeight: 700, fontSize: 15 }}>
                        {r.project_title}
                      </Typography>
                      <Chip label={sm.label} size="small" sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 600, fontSize: 11 }} />
                      {r.priority === 'high' && (
                        <Chip label="High Priority" size="small" sx={{ bgcolor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 700, fontSize: 10 }} />
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PersonIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                        <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>{r.pi_name}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <FunderIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                        <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>{r.funder} · {r.award_ref}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <TeamIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                        <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>{r.team_size} members · {r.milestones} milestones</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                        <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                          Assigned {fmtDate(r.assigned_at)} · Stage: {r.stage_name || '—'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Button variant="outlined" endIcon={<ArrowIcon />} size="small"
                    onClick={() => router.push(`/admin-staff/research/projects/${r.id}`)}
                    sx={{ borderColor: ACCENT, color: ACCENT, textTransform: 'none', borderRadius: 2, fontWeight: 600, flexShrink: 0 }}>
                    Open Review
                  </Button>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
