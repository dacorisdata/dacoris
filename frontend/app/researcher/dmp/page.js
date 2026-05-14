'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme,
  Alert, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tooltip,
} from '@mui/material';
import {
  Add as AddIcon, FolderSpecial as DmpIcon, Storage as StorageIcon,
  CheckCircle as ApprovedIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';

const ACCENT = '#1ca7a1';

const STATUS_META = {
  approved:     { label: 'Approved',      color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  under_review: { label: 'Under Review',  color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)'  },
  submitted:    { label: 'Submitted',     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  draft:        { label: 'Draft',         color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  revision:     { label: 'Revision Req.', color: '#f97316', bg: 'rgba(249,115,22,0.1)'  },
};

const SAMPLE = [
  {
    id: 1,
    ref: 'DMP-2026-001',
    title: 'Data Management Plan — Genomic Analysis of Antibiotic Resistance',
    project_title: 'Genomic Analysis of Antibiotic Resistance in Kenyan Hospitals',
    pi: 'Dr. Amina Odhiambo',
    funder: 'Wellcome Trust',
    status: 'approved',
    submitted_at: '2026-03-15',
    repository: 'Zenodo',
    data_volume: '2.5 TB',
    retention_years: 10,
    data_steward: 'Dr. Amina Odhiambo',
  },
];

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function DmpPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark  = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [dmps, setDmps]       = useState(SAMPLE);
  const [error, setError]     = useState('');

  useEffect(() => {
    fetchUser().then(u => {
      if (!u) { router.push('/login'); return; }
      setLoading(false);
    });
  }, []);

  const stats = {
    total:    dmps.length,
    approved: dmps.filter(d => d.status === 'approved').length,
    reviewing: dmps.filter(d => ['under_review','submitted'].includes(d.status)).length,
    drafts:   dmps.filter(d => d.status === 'draft').length,
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress sx={{ color: ACCENT }} />
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 42, height: 42, borderRadius: 2.5, bgcolor: `${ACCENT}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DmpIcon sx={{ fontSize: 22, color: ACCENT }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>Data Management Plans</Typography>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Create and track formal DMPs for your research projects</Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon sx={{ fontSize: 15 }} />}
          onClick={() => router.push('/researcher/dmp/new')}
          sx={{ bgcolor: ACCENT, textTransform: 'none', fontWeight: 600, borderRadius: 2, '&:hover': { bgcolor: '#0e8a85' } }}>
          New DMP
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3, fontSize: 12, borderRadius: 2 }}>
        <strong>Funder Requirement:</strong> Most major funders (NIH, Horizon Europe, Wellcome Trust) require a formal Data Management Plan before grant activation. Ensure your DMP is reviewed and approved.
      </Alert>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Stats */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        {[
          { label: 'Total',      value: stats.total,     color: '#64748b' },
          { label: 'Approved',   value: stats.approved,  color: '#10b981' },
          { label: 'In Review',  value: stats.reviewing, color: ACCENT   },
          { label: 'Drafts',     value: stats.drafts,    color: '#f59e0b' },
        ].map(s => (
          <Paper key={s.label} elevation={0} variant="outlined" sx={{ flex: '1 1 110px', p: 1.5, borderRadius: 2, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{s.label}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Table */}
      <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider',
          background: dark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>My Data Management Plans</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{dmps.length} record{dmps.length !== 1 ? 's' : ''}</Typography>
        </Box>

        {dmps.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <DmpIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1.5 }} />
            <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 0.5 }}>No DMPs yet</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 3 }}>
              Create a Data Management Plan for any funded research project.
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />}
              onClick={() => router.push('/researcher/dmp/new')}
              sx={{ bgcolor: ACCENT, textTransform: 'none', borderRadius: 2, '&:hover': { bgcolor: '#0e8a85' } }}>
              New DMP
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.02)' : '#f8fafc' }}>
                  {['Reference', 'Title', 'Project', 'PI / Steward', 'Funder', 'Repository', 'Volume', 'Status', 'Submitted', 'Actions'].map(h => (
                    <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, py: 1.5, whiteSpace: 'nowrap' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {dmps.map(dmp => {
                  const sm = STATUS_META[dmp.status] || STATUS_META.draft;
                  return (
                    <TableRow key={dmp.id} hover sx={{ cursor: 'pointer' }} onClick={() => router.push(`/researcher/dmp/${dmp.id}`)}>
                      <TableCell sx={{ fontSize: 12, fontWeight: 700, color: ACCENT, whiteSpace: 'nowrap' }}>{dmp.ref}</TableCell>
                      <TableCell sx={{ maxWidth: 220 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.35 }} noWrap>{dmp.title}</Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 160 }}>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }} noWrap>{dmp.project_title || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{dmp.pi}</Typography>
                        {dmp.data_steward && dmp.data_steward !== dmp.pi && (
                          <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>Steward: {dmp.data_steward}</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{dmp.funder || '—'}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{dmp.repository || '—'}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{dmp.data_volume || '—'}</TableCell>
                      <TableCell>
                        <Chip label={sm.label} size="small"
                          sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 700, fontSize: 10, height: 20 }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>{fmtDate(dmp.submitted_at)}</TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined"
                          sx={{ textTransform: 'none', fontSize: 11, borderRadius: 1.5, py: 0.3, minWidth: 0, px: 1.2 }}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
