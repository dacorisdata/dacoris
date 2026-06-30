'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip, Paper, Divider, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { ArrowBack as BackIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { useAuth } from '../../../../../contexts/AuthContext';
import api from '../../../../../lib/api';

const ACCENT = '#16a699';

const STATUS_COLORS = {
  open:     { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  upcoming: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  closed:   { bg: 'rgba(100,116,139,0.12)', color: '#64748b' },
  archived: { bg: 'rgba(100,116,139,0.08)', color: '#94a3b8' },
};

const PROPOSAL_STATUS = {
  draft:           { bg: 'rgba(100,116,139,0.12)', color: '#64748b', label: 'Draft' },
  submitted:       { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', label: 'Submitted' },
  internal_review: { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6', label: 'Eligibility Review' },
  under_review:    { bg: 'rgba(139,92,246,0.12)',  color: '#8b5cf6', label: 'Under Review' },
  returned:        { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', label: 'Returned' },
  awarded:         { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', label: 'Awarded' },
  declined:        { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', label: 'Declined' },
};

export default function OpportunityDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { fetchUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [opp, setOpp] = useState(null);
  const [applications, setApplications] = useState([]);

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
      const id = params.id;
      const [oppRes, appsRes] = await Promise.all([
        api.get(`/grants/opportunities/${id}`),
        api.get(`/grants/opportunities/${id}/applications`).catch(() => ({ data: [] })),
      ]);
      setOpp(oppRes.data);
      setApplications(appsRes.data || []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load opportunity details');
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

  const getCategories = () => {
    if (!opp) return [];
    if (opp.categories?.length) return opp.categories;
    if (opp.category) return opp.category.split(',').map(n => ({ name: n.trim() })).filter(c => c.name);
    return [];
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
  const categories = getCategories();

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => router.push('/admin-staff/grants/opportunities')}
          sx={{ textTransform: 'none', color: 'text.secondary', pl: 0 }}>
          Back to Opportunities
        </Button>
      </Box>

      <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1, flexWrap: 'wrap' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, flex: 1 }}>{opp.title}</Typography>
            <Chip label={opp.status?.charAt(0).toUpperCase() + opp.status?.slice(1)}
              sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 600 }} />
            {opp.is_curated && (
              <Chip label="Published" size="small" sx={{ bgcolor: `${ACCENT}18`, color: ACCENT, fontWeight: 600 }} />
            )}
          </Box>
          {opp.sponsor && (
            <Typography sx={{ color: 'text.secondary', fontSize: 16 }}>
              Sponsored by <strong>{opp.sponsor}</strong>
            </Typography>
          )}
          {categories.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.5 }}>
              {categories.map(c => (
                <Chip key={c.id || c.name} label={c.name} size="small"
                  sx={{ fontWeight: 600, bgcolor: `${c.color || ACCENT}18`, color: c.color || ACCENT }} />
              ))}
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        <Grid container spacing={3} sx={{ mb: 3 }}>
          {[{ label: 'Funding Type', value: opp.funding_type || '—' },
            { label: 'Funding Range', value: fmtMoney(opp.amount_min, opp.amount_max, opp.currency), accent: true },
            { label: 'Application Deadline', value: fmtDate(opp.deadline),
              red: opp.deadline && new Date(opp.deadline) < new Date() },
            { label: 'Applications', value: `${applications.length} institutional application${applications.length === 1 ? '' : 's'}`, accent: true },
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

        {opp.description && (
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Description
            </Typography>
            <Typography sx={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{opp.description}</Typography>
          </Box>
        )}

        {opp.criteria && (
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Eligibility Criteria
            </Typography>
            <Typography sx={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{opp.criteria}</Typography>
          </Box>
        )}

        {opp.eligibility && (
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Detailed Requirements
            </Typography>
            <Typography sx={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{opp.eligibility}</Typography>
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

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

        <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
            Created on {fmtDate(opp.created_at)}
          </Typography>
        </Box>
      </Paper>

      {/* Applications */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography sx={{ fontSize: 18, fontWeight: 700 }}>Applications</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
            Institutional proposals submitted for this funding opportunity
          </Typography>
        </Box>

        {applications.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, px: 3 }}>
            <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>No applications yet</Typography>
            <Typography sx={{ color: 'text.disabled', fontSize: 13, mt: 0.5 }}>
              Researchers have not submitted proposals for this opportunity.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', bgcolor: 'rgba(0,0,0,0.02)' } }}>
                  <TableCell>Proposal Title</TableCell>
                  <TableCell>Lead PI</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {applications.map(app => {
                  const sm = PROPOSAL_STATUS[app.status] || PROPOSAL_STATUS.draft;
                  return (
                    <TableRow key={app.id} hover sx={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/admin-staff/grants/proposals/${app.id}`)}>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{app.title}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 13.5 }}>{app.lead_pi_name || '—'}</Typography>
                        {app.lead_pi_email && (
                          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{app.lead_pi_email}</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip label={sm.label} size="small" sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 600, fontSize: 11 }} />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 13.5 }}>{fmtDate(app.submitted_at || app.created_at)}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" startIcon={<ViewIcon />} onClick={(e) => { e.stopPropagation(); router.push(`/admin-staff/grants/proposals/${app.id}`); }}
                          sx={{ textTransform: 'none', color: ACCENT, fontWeight: 600 }}>
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
