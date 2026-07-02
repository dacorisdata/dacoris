'use client';

import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Link as MuiLink, Paper, TextField, Typography,
} from '@mui/material';
import Link from 'next/link';
import pgApi from '../../../../lib/postgraduateApi';
import PgPageShell from '../../../../components/postgraduate/PgPageShell';

export default function PgPublicationsPage() {
  const [publications, setPublications] = useState([]);
  const [form, setForm] = useState({ title: '', journal_or_venue: '', doi: '', publication_year: '', url: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    pgApi.listPgPublications()
      .then((res) => setPublications(res.data.publications || []))
      .catch((err) => setError(err.response?.data?.detail || 'Unable to load publications'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    setSubmitting(true);
    setError('');
    try {
      await pgApi.addPgPublication({
        ...form,
        publication_year: form.publication_year ? Number(form.publication_year) : null,
      });
      setForm({ title: '', journal_or_venue: '', doi: '', publication_year: '', url: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add publication');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

  return (
    <PgPageShell title="Publications" subtitle="Log research outputs for graduation readiness and import full records into your library.">
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Alert severity="info" sx={{ mb: 2 }}>
        Import from ORCID or DOI in{' '}
        <MuiLink component={Link} href="/researcher/publications">Research Publications</MuiLink>.
      </Alert>

      <Paper variant="outlined" sx={{ p: 2.5, mb: 3, width: '100%' }}>
        <Typography sx={{ fontWeight: 700, mb: 2 }}>Add publication record</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} fullWidth required />
          <TextField label="Journal or venue" value={form.journal_or_venue} onChange={(e) => setForm({ ...form, journal_or_venue: e.target.value })} fullWidth />
          <TextField label="DOI" value={form.doi} onChange={(e) => setForm({ ...form, doi: e.target.value })} fullWidth />
          <TextField label="Year" value={form.publication_year} onChange={(e) => setForm({ ...form, publication_year: e.target.value })} fullWidth />
          <TextField label="URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} fullWidth />
          <Button variant="contained" onClick={handleAdd} disabled={submitting || !form.title}>Add publication</Button>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5, width: '100%' }}>
        <Typography sx={{ fontWeight: 700, mb: 2 }}>Logged publications ({publications.length})</Typography>
        {publications.length === 0 ? (
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>No publications logged yet.</Typography>
        ) : publications.map((p, idx) => (
          <Box key={`${p.title}-${idx}`} sx={{ py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ fontWeight: 600 }}>{p.title}</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              {[p.journal_or_venue, p.publication_year, p.doi].filter(Boolean).join(' · ')}
            </Typography>
            {p.url && (
              <MuiLink href={p.url} target="_blank" rel="noopener noreferrer" sx={{ fontSize: 13 }}>{p.url}</MuiLink>
            )}
          </Box>
        ))}
      </Paper>
    </PgPageShell>
  );
}
