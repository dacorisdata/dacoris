'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme,
  Alert, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Divider, Tooltip,
} from '@mui/material';
import {
  Add as AddIcon, Gavel as EthicsIcon, Visibility as ViewIcon,
  CheckCircle as ApprovedIcon, Schedule as PendingIcon,
  Cancel as RejectedIcon, Article as ProtocolIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';

const API    = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#1ca7a1';

const STATUS_META = {
  approved:      { label: 'Approved',      color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  final_approval:{ label: 'Approved',      color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  under_review:  { label: 'Under Review',  color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)'  },
  assigned:      { label: 'Assigned',      color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)'  },
  submitted:     { label: 'Submitted',     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  screened:      { label: 'Screened',      color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  decision:      { label: 'Decision',      color: '#f97316', bg: 'rgba(249,115,22,0.1)'  },
  rejected:      { label: 'Rejected',      color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
  draft:         { label: 'Draft',         color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
};

const TYPE_META = {
  initial_review:   { label: 'Initial Review',    color: '#8b5cf6' },
  amendment:        { label: 'Amendment',          color: '#f97316' },
  renewal:          { label: 'Renewal',            color: '#0ea5e9' },
  full_review:      { label: 'Full Review',        color: '#8b5cf6' },
  expedited_review: { label: 'Expedited Review',   color: '#0ea5e9' },
  exempt:           { label: 'Exempt',             color: '#10b981' },
};

const SAMPLE = [
  {
    id: 1,
    ref: 'ETHICS-APP-2026-001',
    title: 'Ethical Review for Genomic Biomarker Study in HIV-positive Adults',
    project_title: 'Genomic Analysis of Antibiotic Resistance in Kenyan Hospitals',
    application_type: 'initial_review',
    status: 'under_review',
    submitted_at: '2026-04-10',
    approved_until: null,
    stage_index: 3,
    participants: 120,
    risk_level: 'High',
    pi: 'Dr. Amina Odhiambo',
    document_count: 3,
  },
];

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function EthicsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark  = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [apps, setApps]       = useState(SAMPLE);
  const [error, setError]     = useState('');

  useEffect(() => {
    fetchUser().then(u => {
      if (!u) { router.push('/login'); return; }
      loadApps();
    });
  }, []);

  const loadApps = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/research/ethics/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const live = res.data || [];
      setApps(live.length > 0 ? live : SAMPLE);
    } catch {
      setApps(SAMPLE);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total:   apps.length,
    approved: apps.filter(a => ['approved','final_approval'].includes(a.status)).length,
    reviewing: apps.filter(a => ['under_review','assigned','screened','submitted'].includes(a.status)).length,
    drafts:  apps.filter(a => a.status === 'draft').length,
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
            <EthicsIcon sx={{ fontSize: 22, color: ACCENT }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>Ethics Applications</Typography>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Submit and track IRB / ethics committee applications</Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon sx={{ fontSize: 15 }} />}
          onClick={() => router.push('/researcher/ethics/new')}
          sx={{ bgcolor: ACCENT, textTransform: 'none', fontWeight: 600, borderRadius: 2, '&:hover': { bgcolor: '#0e8a85' } }}>
          New Application
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3, fontSize: 12, borderRadius: 2 }}>
        <strong>Ethics Gate:</strong> Data collection for human-subjects research cannot commence until a valid ethics clearance is linked to your project.
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
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>My Applications</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{apps.length} record{apps.length !== 1 ? 's' : ''}</Typography>
        </Box>

        {apps.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <EthicsIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1.5 }} />
            <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 0.5 }}>No applications yet</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 3 }}>
              Submit an ethics application for any project involving human subjects.
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />}
              onClick={() => router.push('/researcher/ethics/new')}
              sx={{ bgcolor: ACCENT, textTransform: 'none', borderRadius: 2, '&:hover': { bgcolor: '#0e8a85' } }}>
              New Application
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.02)' : '#f8fafc' }}>
                  {['Reference', 'Title', 'Project', 'Type', 'PI', 'Status', 'Submitted', 'Actions'].map(h => (
                    <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, py: 1.5 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {apps.map(app => {
                  const sm = STATUS_META[app.status] || STATUS_META.draft;
                  const tm = TYPE_META[app.application_type] || TYPE_META.initial_review;
                  return (
                    <TableRow key={app.id} hover sx={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/researcher/ethics/${app.id}`)}>
                      <TableCell sx={{ fontSize: 12, fontWeight: 700, color: ACCENT, whiteSpace: 'nowrap' }}>
                        {app.ref || `ETHICS-APP-${String(app.id).padStart(3,'0')}`}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 240 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.35 }} noWrap>{app.title}</Typography>
                        {app.approved_until && (
                          <Typography sx={{ fontSize: 10, color: '#10b981' }}>Valid until {fmtDate(app.approved_until)}</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 180 }}>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }} noWrap>{app.project_title || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={tm.label} size="small"
                          sx={{ bgcolor: `${tm.color}18`, color: tm.color, fontWeight: 700, fontSize: 10, height: 20 }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{app.pi || '—'}</TableCell>
                      <TableCell>
                        <Chip label={sm.label} size="small"
                          sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 700, fontSize: 10, height: 20 }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>{fmtDate(app.submitted_at)}</TableCell>
                      <TableCell>
                        <Tooltip title="View Application">
                          <Button size="small" variant="outlined"
                            onClick={e => { e.stopPropagation(); router.push(`/researcher/ethics/${app.id}`); }}
                            sx={{ textTransform: 'none', fontSize: 11, borderRadius: 1.5, py: 0.3, minWidth: 0, px: 1.2 }}>
                            View
                          </Button>
                        </Tooltip>
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
