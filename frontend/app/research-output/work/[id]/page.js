'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip, Grid, Divider,
  Table, TableBody, TableCell, TableRow, Link as MuiLink,
} from '@mui/material';
import {
  ArrowBack as BackIcon, OpenInNew as OpenIcon,
  Business as BusinessIcon, People as PeopleIcon, AttachMoney as MoneyIcon,
  LockOpen as OpenAccessIcon, FormatQuote as CitationIcon, School as SchoolIcon,
  Science as ProjectIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { EntityLink, DetailSection, TL, MetaChip } from '@/components/research-catalog/CatalogShared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function WorkDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [work, setWork] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/public/catalog/works/${params.id}`)
      .then((r) => setWork(r.data))
      .catch(() => setError('Failed to load work details'))
      .finally(() => setLoading(false));
  }, [params.id]);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress sx={{ color: TL[600] }} />
      </Box>
    );
  }

  if (error || !work) {
    return (
      <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
        <Alert severity="error" sx={{ mb: 3 }}>{error || 'Work not found'}</Alert>
        <Button startIcon={<BackIcon />} onClick={() => router.push('/research-output')}>Back to catalog</Button>
      </Box>
    );
  }

  const keywords = work.keywords || [];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, md: 4 } }}>
        <Button startIcon={<BackIcon />} onClick={() => router.push('/research-output')} sx={{ mb: 3, textTransform: 'none', color: 'text.secondary' }}>
          Back to catalog
        </Button>

        <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 4, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            {work.status && work.status !== 'published' && (
              <MetaChip label={work.status.replace(/_/g, ' ')} color="#d97706" />
            )}
            {work.is_open_access && <MetaChip label="Open Access" color="#10b981" />}
            {work.primary_topic && <MetaChip label={work.primary_topic} />}
            {work.work_type && <MetaChip label={work.work_type} />}
            {work.source === 'output' && <MetaChip label="Project output" />}
            {work.source === 'manuscript' && <MetaChip label="Manuscript" />}
            {work.source === 'publication' && <MetaChip label="Publication library" />}
          </Box>

          <Typography variant="h4" sx={{ fontWeight: 800, mb: 2, lineHeight: 1.3 }}>{work.title}</Typography>

          {work.authors?.length > 0 && (
            <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 2 }}>
              {work.authors.map((a, i) => (
                <span key={a.id || i}>
                  {a.id ? (
                    <EntityLink href={`/research-output/researcher/${a.id}`} sx={{ fontSize: 14, fontWeight: 500 }}>
                      {a.name}{a.is_corresponding ? '*' : ''}
                    </EntityLink>
                  ) : (
                    <span>{a.name}</span>
                  )}
                  {i < work.authors.length - 1 ? ', ' : ''}
                </span>
              ))}
            </Typography>
          )}

          {work.project && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', mb: 0.5 }}>
                Linked project
              </Typography>
              <EntityLink href={`/research-output/project/${work.project.id}`} sx={{ fontSize: 14 }}>
                {work.project.title}
              </EntityLink>
              {work.project.funder_name && (
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.3 }}>
                  Funded by {work.project.funder_name}
                </Typography>
              )}
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          {(work.venue_name || work.publication_year) && (
            <Table size="small" sx={{ mb: 2 }}>
              <TableBody>
                {work.venue_name && (
                  <TableRow><TableCell sx={{ fontWeight: 600, width: 160, border: 0 }}>Venue</TableCell><TableCell sx={{ border: 0 }}>{work.venue_name}</TableCell></TableRow>
                )}
                {work.publication_date && (
                  <TableRow><TableCell sx={{ fontWeight: 600, border: 0 }}>Published</TableCell><TableCell sx={{ border: 0 }}>{fmtDate(work.publication_date)}</TableCell></TableRow>
                )}
                {work.cited_by_count > 0 && (
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, border: 0 }}>Citations</TableCell>
                    <TableCell sx={{ border: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CitationIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        {work.cited_by_count}
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {work.abstract && (
            <>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', mb: 1 }}>Abstract</Typography>
              <Typography sx={{ fontSize: 14, lineHeight: 1.8, mb: 2 }}>{work.abstract}</Typography>
            </>
          )}

          {keywords.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>
              {keywords.map((k) => <Chip key={k} label={k} size="small" variant="outlined" sx={{ fontSize: 11 }} />)}
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {work.doi && (
              <MuiLink href={`https://doi.org/${work.doi}`} target="_blank" sx={{ fontSize: 13, color: TL[600], display: 'flex', alignItems: 'center', gap: 0.5 }}>
                DOI: {work.doi} <OpenIcon sx={{ fontSize: 14 }} />
              </MuiLink>
            )}
            {work.open_access_url && (
              <MuiLink href={work.open_access_url} target="_blank" sx={{ fontSize: 13, color: '#10b981', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <OpenAccessIcon sx={{ fontSize: 16 }} /> Full text <OpenIcon sx={{ fontSize: 14 }} />
              </MuiLink>
            )}
          </Box>
        </Box>

        {work.institutions?.length > 0 && (
          <DetailSection title={`Institutions (${work.institutions.length})`} icon={BusinessIcon}>
            <Grid container spacing={1.5}>
              {work.institutions.map((inst, idx) => (
                <Grid item xs={12} sm={6} md={4} key={idx}>
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    {inst.id ? (
                      <EntityLink href={`/research-output/institution/${inst.id}`}>{inst.name}</EntityLink>
                    ) : (
                      <Typography sx={{ fontWeight: 600 }}>{inst.name}</Typography>
                    )}
                    {inst.country && <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{inst.country}</Typography>}
                  </Box>
                </Grid>
              ))}
            </Grid>
          </DetailSection>
        )}

        {work.funders?.length > 0 && (
          <DetailSection title={`Funders (${work.funders.length})`} icon={MoneyIcon}>
            <Grid container spacing={1.5}>
              {work.funders.map((f, idx) => (
                <Grid item xs={12} sm={6} key={idx}>
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    {f.id ? (
                      <EntityLink href={`/research-output/funder/${f.id}`}>{f.name}</EntityLink>
                    ) : (
                      <Typography sx={{ fontWeight: 600 }}>{f.name}</Typography>
                    )}
                    {f.grant_number && <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Grant {f.grant_number}</Typography>}
                    {f.award_amount && (
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: TL[700] }}>
                        {f.currency} {f.award_amount.toLocaleString()}
                      </Typography>
                    )}
                  </Box>
                </Grid>
              ))}
            </Grid>
          </DetailSection>
        )}
      </Box>
    </Box>
  );
}
