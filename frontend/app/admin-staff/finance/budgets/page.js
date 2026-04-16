'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, CircularProgress, Alert, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, LinearProgress, useTheme } from '@mui/material';
import { AccountBalance as FinanceIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../lib/api';

const ACCENT = '#f59e0b';

export default function FinanceBudgetsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark  = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [awards, setAwards]   = useState([]);
  const [error, setError]     = useState('');

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin)      { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    try {
      const res = await api.get('/api/grants/awards').catch(() => ({ data: [] }));
      setAwards(res.data || []);
    } catch (e) { setError('Failed to load budget data'); }
    setLoading(false);
  };

  const fmtMoney = (n, cur = 'KES') => n != null ? `${cur} ${Number(n).toLocaleString()}` : '—';
  const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const totalBudget = awards.reduce((sum, a) => sum + (a.total_amount || 0), 0);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ color: 'text.primary', fontSize: 26, fontWeight: 700, mb: 0.5 }}>Budgets</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>Monitor award budgets and financial allocation across active grants</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', gap: 2.5, mb: 3.5, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Portfolio Value', value: fmtMoney(totalBudget), color: ACCENT, bg: 'rgba(245,158,11,0.1)' },
          { label: 'Active Awards',         value: awards.filter(a => a.status === 'active').length, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          { label: 'Pending Awards',        value: awards.filter(a => a.status === 'pending').length, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
        ].map(({ label, value, color, bg }) => (
          <Box key={label} sx={{ flex: '1 1 200px', bgcolor: 'background.paper', borderRadius: 3, p: 3, border: `1px solid ${theme.palette.divider}`, boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Typography sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, mb: 1 }}>{label}</Typography>
            <Typography sx={{ color, fontSize: 22, fontWeight: 700 }}>{value}</Typography>
          </Box>
        ))}
      </Box>

      {/* Note about budget detail */}
      {awards.length > 0 && (
        <Box sx={{ bgcolor: 'rgba(245,158,11,0.06)', borderRadius: 2, p: 2, border: `1px solid rgba(245,158,11,0.2)`, mb: 3 }}>
          <Typography sx={{ color: '#d97706', fontSize: 13 }}>
            <b>Budget line items</b> per award are managed in the Finance module (Phase G4). Budget vs. actuals tracking and ERP sync will be available once the module is fully deployed.
          </Typography>
        </Box>
      )}

      <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, bgcolor: 'background.paper' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderBottom: `1px solid ${theme.palette.divider}` } }}>
              <TableCell>Award</TableCell>
              <TableCell>Total Budget</TableCell>
              <TableCell>Currency</TableCell>
              <TableCell>Period</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {awards.length === 0 ? (
              <TableRow><TableCell colSpan={5}>
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <FinanceIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>No budgets yet</Typography>
                  <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>Awards with budget allocations will appear here.</Typography>
                </Box>
              </TableCell></TableRow>
            ) : awards.map(a => (
              <TableRow key={a.id} hover sx={{ '&:last-child td': { borderBottom: 'none' }, '&:hover': { bgcolor: `${ACCENT}06` } }}>
                <TableCell><Typography sx={{ fontWeight: 600, fontSize: 14 }}>{a.award_number || `AWD-${a.id}`}</Typography></TableCell>
                <TableCell><Typography sx={{ fontSize: 14, fontWeight: 600, color: ACCENT }}>{fmtMoney(a.total_amount, a.currency)}</Typography></TableCell>
                <TableCell><Typography sx={{ fontSize: 13 }}>{a.currency || 'KES'}</Typography></TableCell>
                <TableCell><Typography sx={{ fontSize: 13 }}>{fmtDate(a.start_date)} – {fmtDate(a.end_date)}</Typography></TableCell>
                <TableCell>
                  <Chip label={a.status} size="small"
                    sx={{ bgcolor: a.status === 'active' ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)', color: a.status === 'active' ? '#10b981' : '#64748b', fontWeight: 600, fontSize: 11, textTransform: 'capitalize' }} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
