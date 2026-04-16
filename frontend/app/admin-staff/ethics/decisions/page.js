'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Button, CircularProgress, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, useTheme, Alert } from '@mui/material';
import { Gavel as GavelIcon, ArrowForward as ArrowIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../lib/api';

const ACCENT = '#8b5cf6';
const STATUS_META = {
  approved:     { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', label: 'Approved' },
  approved_with_modifications: { bg: 'rgba(16,185,129,0.08)', color: '#059669', label: 'Approved w/ Modifications' },
  deferred:     { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', label: 'Deferred' },
  rejected:     { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', label: 'Rejected' },
};

export default function EthicsDecisionsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark  = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [decided, setDecided] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin)      { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    try {
      const projRes = await api.get('/api/research/projects').catch(() => ({ data: [] }));
      const all = [];
      for (const proj of (projRes.data || [])) {
        const ethRes = await api.get(`/api/research/ethics/project/${proj.id}`).catch(() => ({ data: [] }));
        (ethRes.data || []).filter(a => Object.keys(STATUS_META).includes(a.status))
          .forEach(a => all.push({ ...a, project_title: proj.title }));
      }
      setDecided(all);
    } catch (e) { setError('Failed to load decisions'); }
    setLoading(false);
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ color: 'text.primary', fontSize: 26, fontWeight: 700, mb: 0.5 }}>Ethics Decisions</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>Audit trail of all ethics committee decisions</Typography>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, bgcolor: 'background.paper' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderBottom: `1px solid ${theme.palette.divider}` } }}>
              <TableCell>Application</TableCell>
              <TableCell>Project</TableCell>
              <TableCell>Approved Until</TableCell>
              <TableCell>Decision</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {decided.length === 0 ? (
              <TableRow><TableCell colSpan={4}>
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <GavelIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>No decisions yet</Typography>
                  <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>Decisions issued from the Applications page will appear here.</Typography>
                </Box>
              </TableCell></TableRow>
            ) : decided.map(app => {
              const sm = STATUS_META[app.status] || STATUS_META.deferred;
              return (
                <TableRow key={app.id} hover sx={{ '&:last-child td': { borderBottom: 'none' } }}>
                  <TableCell><Typography sx={{ fontWeight: 600, fontSize: 14 }}>{app.title}</Typography></TableCell>
                  <TableCell><Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>{app.project_title}</Typography></TableCell>
                  <TableCell><Typography sx={{ fontSize: 13.5 }}>{fmtDate(app.approved_until)}</Typography></TableCell>
                  <TableCell><Chip label={sm.label} size="small" sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 600, fontSize: 11 }} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
