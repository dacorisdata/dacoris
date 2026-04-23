'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip, Paper, Divider, Grid,
} from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import { useAuth } from '../../../../../contexts/AuthContext';
import api from '../../../../../lib/api';

const ACCENT = '#16a699';

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
      const id = parseInt(params.id, 10);
      const res = await api.get('/grants/opportunities/from-excel-source');
      const found = (res.data || []).find(o => o.id === id);
      if (!found) {
        setError('Opportunity not found');
      } else {
        setOpp(found);
      }
    } catch (e) {
      setError('Failed to load opportunity details');
    } finally {
      setLoading(false);
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
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => router.push('/admin-staff/grants/opportunities')}
          sx={{ textTransform: 'none', color: 'text.secondary', pl: 0 }}>
          Back to Opportunities
        </Button>
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

        {/* Key Details Grid — 4 columns */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {[{ label: 'Category', value: opp.category || '—' },
            { label: 'Funding Type', value: opp.funding_type || '—' },
            { label: 'Funding Range', value: fmtMoney(opp.amount_min, opp.amount_max, opp.currency), accent: true },
            { label: 'Application Deadline', value: fmtDate(opp.deadline),
              red: opp.deadline && new Date(opp.deadline) < new Date() },
          ].map(({ label, value, accent, red }) => (
            <Grid item xs={12} sm={6} md={3} key={label}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                {label}
              </Typography>
              <Typography sx={{ fontSize: 14, fontWeight: accent || red ? 600 : 400,
                color: red ? '#ef4444' : accent ? ACCENT : 'text.primary' }}>
                {value}
              </Typography>
            </Grid>
          ))}
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
