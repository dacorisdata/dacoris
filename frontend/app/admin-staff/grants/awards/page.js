'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Button, CircularProgress, Alert, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, useTheme } from '@mui/material';
import { EmojiEvents as AwardsIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../lib/api';

const ACCENT = '#10b981';

const STATUS_META = {
  pending:    { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
  active:     { bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
  suspended:  { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444' },
  completed:  { bg: 'rgba(100,116,139,0.12)', color: '#64748b' },
  terminated: { bg: 'rgba(239,68,68,0.08)',   color: '#dc2626' },
};

export default function GrantAwardsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme  = useTheme();
  const dark   = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [awards, setAwards]   = useState([]);
  const [error, setError]     = useState('');

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin)      { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    try {
      const res = await api.get('/api/grants/awards').catch(() => ({ data: [] }));
      setAwards(res.data || []);
    } catch (e) { setError('Failed to load awards'); }
    setLoading(false);
  };

  const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const fmtMoney = (amt, cur) => amt ? `${cur || 'KES'} ${Number(amt).toLocaleString()}` : '—';

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ color: 'text.primary', fontSize: 26, fontWeight: 700, mb: 0.5 }}>Awards</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>Track all issued awards and their post-award status</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Summary */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_META).map(([key, meta]) => {
          const count = awards.filter(a => a.status === key).length;
          return (
            <Box key={key} sx={{ flex: '1 1 120px', bgcolor: 'background.paper', borderRadius: 2.5, p: 2, border: `1px solid ${theme.palette.divider}` }}>
              <Typography sx={{ color: meta.color, fontSize: 22, fontWeight: 700 }}>{count}</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{key}</Typography>
            </Box>
          );
        })}
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, bgcolor: 'background.paper' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderBottom: `1px solid ${theme.palette.divider}` } }}>
              <TableCell>Award #</TableCell>
              <TableCell>Total Amount</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {awards.length === 0 ? (
              <TableRow><TableCell colSpan={5}>
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <AwardsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>No awards yet</Typography>
                  <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>Awards will appear here once proposals are approved.</Typography>
                </Box>
              </TableCell></TableRow>
            ) : awards.map(a => {
              const sm = STATUS_META[a.status] || STATUS_META.pending;
              return (
                <TableRow key={a.id} hover sx={{ '&:last-child td': { borderBottom: 'none' }, '&:hover': { bgcolor: `${ACCENT}06` } }}>
                  <TableCell><Typography sx={{ fontWeight: 600, fontSize: 14 }}>{a.award_number || `AWD-${a.id}`}</Typography></TableCell>
                  <TableCell><Typography sx={{ fontSize: 13.5 }}>{fmtMoney(a.total_amount, a.currency)}</Typography></TableCell>
                  <TableCell><Typography sx={{ fontSize: 13.5 }}>{fmtDate(a.start_date)}</Typography></TableCell>
                  <TableCell><Typography sx={{ fontSize: 13.5 }}>{fmtDate(a.end_date)}</Typography></TableCell>
                  <TableCell><Chip label={a.status} size="small" sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 600, fontSize: 11, textTransform: 'capitalize' }} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
