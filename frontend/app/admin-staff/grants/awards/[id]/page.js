'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip, Paper, Divider, useTheme,
} from '@mui/material';
import {
  ArrowBack as BackIcon, EmojiEvents as AwardIcon,
  AttachMoney as MoneyIcon, CalendarToday as CalIcon,
  Business as OrgIcon, Description as DocIcon,
  Assignment as ProposalIcon, Gavel as ConditionsIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../../contexts/AuthContext';
import api from '../../../../../lib/api';

const ACCENT = '#10b981';

const STATUS_META = {
  pending:    { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', label: 'Pending' },
  active:     { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', label: 'Active' },
  suspended:  { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', label: 'Suspended' },
  completed:  { bg: 'rgba(100,116,139,0.12)', color: '#64748b', label: 'Completed' },
  terminated: { bg: 'rgba(239,68,68,0.08)',   color: '#dc2626', label: 'Terminated' },
};

const fmtDate  = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtMoney = (amt, cur) => (amt || amt === 0) ? `${cur || 'KES'} ${Number(amt).toLocaleString()}` : '—';

export default function AdminAwardDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [award, setAward]     = useState(null);
  const [error, setError]     = useState('');

  useEffect(() => {
    fetchUser().then(u => {
      if (!u) { router.push('/login'); return; }
      if (u.is_global_admin)      { router.push('/global-admin/dashboard'); return; }
      if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
      loadAward();
    });
  }, [params.id]);

  const loadAward = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/grants/awards/${params.id}`);
      setAward(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load award');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress sx={{ color: ACCENT }} />
    </Box>
  );

  if (error && !award) return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Button startIcon={<BackIcon />} onClick={() => router.push('/admin-staff/grants/awards')}
        sx={{ mb: 2.5, color: 'text.secondary', textTransform: 'none', fontWeight: 500 }}>
        Back to All Awards
      </Button>
      <Alert severity="error">{error}</Alert>
    </Box>
  );

  if (!award) return null;

  const sm = STATUS_META[award.status] || STATUS_META.pending;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Back nav */}
      <Button startIcon={<BackIcon />} onClick={() => router.push('/admin-staff/grants/awards')}
        sx={{ mb: 2.5, color: 'text.secondary', textTransform: 'none', fontWeight: 500 }}>
        Back to All Awards
      </Button>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* ── HEADER CARD ─────────────────────────────────────── */}
      <Paper elevation={0} variant="outlined" sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box sx={{ width: 46, height: 46, borderRadius: 2.5, bgcolor: ACCENT + '18', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AwardIcon sx={{ fontSize: 24, color: ACCENT }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 21, fontWeight: 800, lineHeight: 1.3, mb: 0.5 }}>
                {award.award_number}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                <Chip label={sm.label} size="small" sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 700, fontSize: 11 }} />
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  Issued {fmtDate(award.issued_at)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* ── MAIN BODY: two columns ────────────────────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 340px' }, gap: 3, alignItems: 'start' }}>

        {/* LEFT column */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

          {/* Financial & Period */}
          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
              <MoneyIcon sx={{ fontSize: 17, color: ACCENT }} />
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Award Metadata</Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: dark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)' }}>
                <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Total Amount</Typography>
                <Typography sx={{ fontSize: 18, fontWeight: 800, color: ACCENT }}>
                  {fmtMoney(award.total_amount, award.currency)}
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Currency</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{award.currency}</Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.8 }}>
                <CalIcon sx={{ fontSize: 15, color: 'text.disabled', mt: 0.2, flexShrink: 0 }} />
                <Box>
                  <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Start Date</Typography>
                  <Typography sx={{ fontSize: 13 }}>{fmtDate(award.start_date)}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.8 }}>
                <CalIcon sx={{ fontSize: 15, color: 'text.disabled', mt: 0.2, flexShrink: 0 }} />
                <Box>
                  <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>End Date</Typography>
                  <Typography sx={{ fontSize: 13 }}>{fmtDate(award.end_date)}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.8 }}>
                <CalIcon sx={{ fontSize: 15, color: 'text.disabled', mt: 0.2, flexShrink: 0 }} />
                <Box>
                  <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Issued On</Typography>
                  <Typography sx={{ fontSize: 13 }}>{fmtDate(award.issued_at)}</Typography>
                </Box>
              </Box>
            </Box>
          </Paper>

          {/* Conditions */}
          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ConditionsIcon sx={{ fontSize: 17, color: ACCENT }} />
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Conditions</Typography>
            </Box>
            {award.conditions ? (
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#fff8e1', border: '1px solid #f59e0b44' }}>
                <Typography sx={{ fontSize: 13, color: '#92400e', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {award.conditions}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <DocIcon sx={{ fontSize: 34, color: 'text.disabled', mb: 1 }} />
                <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>No special conditions attached to this award.</Typography>
              </Box>
            )}
          </Paper>
        </Box>

        {/* RIGHT column */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

          {/* Proposal & Opportunity */}
          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ProposalIcon sx={{ fontSize: 17, color: ACCENT }} />
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Source Proposal</Typography>
            </Box>
            {award.proposal_title ? (
              <>
                <Typography sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, mb: 0.5 }}>
                  {award.proposal_title}
                </Typography>
                <Button
                  size="small" endIcon={<OpenIcon sx={{ fontSize: 14 }} />}
                  onClick={() => router.push(`/admin-staff/grants/proposals/${award.proposal_id}`)}
                  sx={{ textTransform: 'none', fontSize: 12, fontWeight: 700, color: ACCENT, p: 0, minWidth: 0,
                    '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' } }}>
                  View proposal
                </Button>
              </>
            ) : (
              <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>Proposal #{award.proposal_id}</Typography>
            )}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.2, mb: 1.5 }}>
              <OrgIcon sx={{ fontSize: 15, color: 'text.disabled', mt: 0.2, flexShrink: 0 }} />
              <Box>
                <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Funder</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{award.funder_name || '—'}</Typography>
              </Box>
            </Box>

            {award.opportunity_title && (
              <Box sx={{ mb: 1.5 }}>
                <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Grant Opportunity</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: ACCENT }}>{award.opportunity_title}</Typography>
                {award.opportunity_sponsor && (
                  <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{award.opportunity_sponsor}</Typography>
                )}
              </Box>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
