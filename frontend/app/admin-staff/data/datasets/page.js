'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, CircularProgress, useTheme, Button, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Alert } from '@mui/material';
import { Storage as DataIcon, Search as SearchIcon, Add as AddIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../lib/api';

const ACCENT = '#0ea5e9';

const ACCESS_META = {
  open:       { bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
  restricted: { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
  embargoed:  { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444' },
  closed:     { bg: 'rgba(100,116,139,0.12)', color: '#64748b' },
};

export default function DatasetsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark  = theme.palette.mode === 'dark';
  const [loading, setLoading]  = useState(true);
  const [datasets, setDatasets] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch]    = useState('');
  const [error, setError]      = useState('');

  useEffect(() => { init(); }, []);
  useEffect(() => {
    setFiltered(search
      ? datasets.filter(d => d.title?.toLowerCase().includes(search.toLowerCase()) || d.description?.toLowerCase().includes(search.toLowerCase()))
      : datasets);
  }, [datasets, search]);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin)      { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    try {
      const res = await api.get('/api/data/datasets').catch(() => ({ data: [] }));
      setDatasets(res.data || []);
    } catch (e) { setError('Failed to load datasets'); }
    setLoading(false);
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const fmtSize = (b) => {
    if (!b) return '—';
    if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`;
    if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
    return `${(b / 1e3).toFixed(0)} KB`;
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ color: 'text.primary', fontSize: 26, fontWeight: 700, mb: 0.5 }}>Datasets</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>Curate, validate, and manage the institutional research data repository</Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {datasets.length === 0 && (
        <Box sx={{ bgcolor: 'rgba(14,165,233,0.06)', borderRadius: 2, p: 2.5, border: `1px solid rgba(14,165,233,0.2)`, mb: 3 }}>
          <Typography sx={{ color: ACCENT, fontSize: 13, fontWeight: 600, mb: 0.5 }}>Data Module A — Phase D1</Typography>
          <Typography sx={{ color: ACCENT, fontSize: 13 }}>
            The research data repository is part of Module 3A. Features include dataset ingestion from KoBoToolbox, ODK Central, REDCap, and Microsoft Forms; QA pipeline; DOI minting via DataCite; and FAIR-compliant metadata.
          </Typography>
        </Box>
      )}

      {datasets.length > 0 && (
        <TextField size="small" placeholder="Search datasets…" value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon sx={{ color: 'text.disabled', mr: 1, fontSize: 18 }} /> }}
          sx={{ mb: 3, width: 320, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
      )}

      <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, bgcolor: 'background.paper' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderBottom: `1px solid ${theme.palette.divider}` } }}>
              <TableCell>Dataset Title</TableCell>
              <TableCell>Format</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>DOI</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Access</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6}>
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <DataIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>No datasets in repository</Typography>
                  <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>Datasets ingested from capture tools will appear here for curation.</Typography>
                </Box>
              </TableCell></TableRow>
            ) : filtered.map(d => {
              const am = ACCESS_META[d.access_level] || ACCESS_META.restricted;
              return (
                <TableRow key={d.id} hover sx={{ '&:last-child td': { borderBottom: 'none' }, '&:hover': { bgcolor: `${ACCENT}06` } }}>
                  <TableCell><Typography sx={{ fontWeight: 600, fontSize: 14 }}>{d.title}</Typography></TableCell>
                  <TableCell><Typography sx={{ fontSize: 13 }}>{d.format || '—'}</Typography></TableCell>
                  <TableCell><Typography sx={{ fontSize: 13 }}>{fmtSize(d.file_size)}</Typography></TableCell>
                  <TableCell><Typography sx={{ fontSize: 12, fontFamily: 'monospace', color: d.doi ? ACCENT : 'text.disabled' }}>{d.doi || 'No DOI'}</Typography></TableCell>
                  <TableCell><Typography sx={{ fontSize: 13 }}>{fmtDate(d.created_at)}</Typography></TableCell>
                  <TableCell><Chip label={d.access_level || 'restricted'} size="small" sx={{ bgcolor: am.bg, color: am.color, fontWeight: 600, fontSize: 11, textTransform: 'capitalize' }} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
