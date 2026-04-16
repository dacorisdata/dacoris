'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip, Paper, Divider, Grid,
} from '@mui/material';
import { ArrowBack as BackIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useAuth } from '../../../../../contexts/AuthContext';
import api from '../../../../../lib/api';

const ACCENT = '#8b5cf6';

const STATUS_COLORS = {
  open:     { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  upcoming: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  closed:   { bg: 'rgba(100,116,139,0.12)', color: '#64748b' },
  archived: { bg: 'rgba(100,116,139,0.08)', color: '#94a3b8' },
};

export default function OpportunityDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { fetchUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [opp, setOpp] = useState(null);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin)      { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    loadOpportunity();
  };

  const loadOpportunity = async () => {
    try {
      const res = await api.get(`/grants/opportunities/${params.id}`);
      setOpp(res.data);
    } catch (e) {
      setError('Failed to load opportunity details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${opp.title}"?`)) return;
    try {
      await api.delete(`/grants/opportunities/${params.id}`);
      router.push('/admin-staff/grants/opportunities');
    } catch (e) {
      setError('Failed to delete opportunity');
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  const fmtMoney = (min, max, curr) => {
    if (!min && !max) return '—';
    const fmt = (n) => new Intl.NumberFormat('en-US').format(n);
    if (min && max) return `${curr} ${fmt(min)} - ${fmt(max)}`;
    if (min) return `${curr} ${fmt(min)}+`;
    return `Up to ${curr} ${fmt(max)}`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  if (error || !opp) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{error || 'Opportunity not found'}</Alert>
        <Button startIcon={<BackIcon />} onClick={() => router.push('/admin-staff/grants/opportunities')} sx={{ mt: 2 }}>
          Back to Opportunities
        </Button>
      </Box>
    );
  }

  const sc = STATUS_COLORS[opp.status] || STATUS_COLORS.closed;

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => router.push('/admin-staff/grants/opportunities')}
          sx={{ textTransform: 'none', color: 'text.secondary' }}>
          Back to Opportunities
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<DeleteIcon />} onClick={handleDelete}
            sx={{ textTransform: 'none', borderColor: '#ef4444', color: '#ef4444', '&:hover': { borderColor: '#dc2626', bgcolor: 'rgba(239,68,68,0.04)' } }}>
            Delete
          </Button>
        </Box>
      </Box>

      {/* Main Content */}
      <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        {/* Title & Status */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, flex: 1 }}>{opp.title}</Typography>
            <Chip label={opp.status?.charAt(0).toUpperCase() + opp.status?.slice(1)} 
              sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 600 }} />
          </Box>
          {opp.sponsor && (
            <Typography sx={{ color: 'text.secondary', fontSize: 16 }}>
              Sponsored by <strong>{opp.sponsor}</strong>
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Key Details Grid */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Category
            </Typography>
            <Typography sx={{ fontSize: 15 }}>{opp.category || '—'}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Funding Type
            </Typography>
            <Typography sx={{ fontSize: 15 }}>{opp.funding_type || '—'}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Funding Range
            </Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: ACCENT }}>
              {fmtMoney(opp.amount_min, opp.amount_max, opp.currency)}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Application Deadline
            </Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: opp.deadline && new Date(opp.deadline) < new Date() ? '#ef4444' : 'text.primary' }}>
              {fmtDate(opp.deadline)}
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Description */}
        {opp.description && (
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Description
            </Typography>
            <Typography sx={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{opp.description}</Typography>
          </Box>
        )}

        {/* Eligibility Criteria */}
        {opp.criteria && (
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Eligibility Criteria
            </Typography>
            <Typography sx={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{opp.criteria}</Typography>
          </Box>
        )}

        {/* Detailed Requirements */}
        {opp.eligibility && (
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Detailed Requirements
            </Typography>
            <Typography sx={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{opp.eligibility}</Typography>
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Contact Information */}
        <Grid container spacing={3}>
          {opp.application_url && (
            <Grid item xs={12} md={6}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Application URL
              </Typography>
              <Typography sx={{ fontSize: 14 }}>
                <a href={opp.application_url} target="_blank" rel="noopener noreferrer" 
                  style={{ color: ACCENT, textDecoration: 'none', wordBreak: 'break-all' }}>
                  {opp.application_url}
                </a>
              </Typography>
            </Grid>
          )}
          {opp.contact_email && (
            <Grid item xs={12} md={6}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Contact Email
              </Typography>
              <Typography sx={{ fontSize: 14 }}>
                <a href={`mailto:${opp.contact_email}`} style={{ color: ACCENT, textDecoration: 'none' }}>
                  {opp.contact_email}
                </a>
              </Typography>
            </Grid>
          )}
        </Grid>

        {/* Metadata */}
        <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
            Created on {fmtDate(opp.created_at)}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
