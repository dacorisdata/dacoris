'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, CircularProgress, Alert, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, TextField, useTheme,
} from '@mui/material';
import { Search as SearchIcon, Folder as FolderIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../lib/api';

const ACCENT = '#3b82f6';

const STATUS_META = {
  active:    { bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
  proposed:  { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6' },
  suspended: { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
  completed: { bg: 'rgba(100,116,139,0.12)', color: '#64748b' },
  archived:  { bg: 'rgba(100,116,139,0.08)', color: '#94a3b8' },
};

export default function ResearchProjectsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark  = theme.palette.mode === 'dark';

  const [loading, setLoading]   = useState(true);
  const [projects, setProjects] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch]     = useState('');
  const [error, setError]       = useState('');

  useEffect(() => { init(); }, []);
  useEffect(() => {
    setFiltered(search
      ? projects.filter(p => p.title?.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase()))
      : projects);
  }, [projects, search]);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin)      { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    try {
      const res = await api.get('/api/research/projects');
      setProjects(res.data || []);
    } catch (e) { setError(e.response?.data?.detail || 'Failed to load projects'); }
    setLoading(false);
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ color: 'text.primary', fontSize: 26, fontWeight: 700, mb: 0.5 }}>Research Projects</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>Overview of all research projects across the institution</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Summary */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_META).map(([key, meta]) => {
          const count = projects.filter(p => p.status === key).length;
          return (
            <Box key={key} sx={{ flex: '1 1 120px', bgcolor: 'background.paper', borderRadius: 2.5, p: 2, border: `1px solid ${theme.palette.divider}` }}>
              <Typography sx={{ color: meta.color, fontSize: 22, fontWeight: 700 }}>{count}</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{key}</Typography>
            </Box>
          );
        })}
      </Box>

      <TextField size="small" placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)}
        InputProps={{ startAdornment: <SearchIcon sx={{ color: 'text.disabled', mr: 1, fontSize: 18 }} /> }}
        sx={{ mb: 3, width: 320, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />

      <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, bgcolor: 'background.paper' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderBottom: `1px solid ${theme.palette.divider}` } }}>
              <TableCell>Title</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Human Subjects</TableCell>
              <TableCell>Start</TableCell>
              <TableCell>End</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6}>
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <FolderIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>No projects found</Typography>
                  <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>Research projects registered by PIs will appear here.</Typography>
                </Box>
              </TableCell></TableRow>
            ) : filtered.map(p => {
              const sm = STATUS_META[p.status] || STATUS_META.proposed;
              return (
                <TableRow key={p.id} hover sx={{ '&:last-child td': { borderBottom: 'none' }, '&:hover': { bgcolor: `${ACCENT}06` } }}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, fontSize: 14, color: 'text.primary' }}>{p.title}</Typography>
                    {p.description && <Typography sx={{ color: 'text.secondary', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>{p.description}</Typography>}
                  </TableCell>
                  <TableCell><Typography sx={{ fontSize: 13, textTransform: 'capitalize' }}>{p.project_type || '—'}</Typography></TableCell>
                  <TableCell>
                    <Chip label={p.involves_human_subjects ? 'Yes' : 'No'} size="small"
                      sx={{ bgcolor: p.involves_human_subjects ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: p.involves_human_subjects ? '#ef4444' : '#10b981', fontWeight: 600, fontSize: 11 }} />
                  </TableCell>
                  <TableCell><Typography sx={{ fontSize: 13.5 }}>{fmtDate(p.start_date)}</Typography></TableCell>
                  <TableCell><Typography sx={{ fontSize: 13.5 }}>{fmtDate(p.end_date)}</Typography></TableCell>
                  <TableCell><Chip label={p.status} size="small" sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 600, fontSize: 11, textTransform: 'capitalize' }} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
