'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Typography, Button, CircularProgress, Alert, Grid, Chip, Divider } from '@mui/material';
import {
  ArrowBack as BackIcon, Science as ProjectIcon, People as PeopleIcon,
  AccountBalance as FundingIcon, LibraryBooks as OutputIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { EntityLink, DetailSection, TL, MetaChip } from '@/components/research-catalog/CatalogShared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`${API_URL}/public/catalog/projects/${id}`)
      .then((r) => setData(r.data))
      .catch(() => setError('Project not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : null;

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}><CircularProgress sx={{ color: TL[600] }} /></Box>;
  if (error || !data) return (
    <Box sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
      <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      <Button startIcon={<BackIcon />} onClick={() => router.push('/research-output')}>Back</Button>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, md: 4 } }}>
        <Button startIcon={<BackIcon />} onClick={() => router.push('/research-output')} sx={{ mb: 3, textTransform: 'none', color: 'text.secondary' }}>
          Back to catalog
        </Button>

        <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 4, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <MetaChip label={data.status} />
            {data.research_area && <MetaChip label={data.research_area} />}
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>{data.title}</Typography>
          {data.description && (
            <Typography sx={{ fontSize: 14, color: 'text.secondary', lineHeight: 1.75, mb: 2 }}>{data.description}</Typography>
          )}
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={2}>
            {data.pi?.name && (
              <Grid item xs={12} sm={6}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>Principal Investigator</Typography>
                {data.pi.id ? (
                  <EntityLink href={`/research-output/researcher/${data.pi.id}`}>{data.pi.name}</EntityLink>
                ) : (
                  <Typography sx={{ fontWeight: 600 }}>{data.pi.name}</Typography>
                )}
              </Grid>
            )}
            {data.institution?.name && (
              <Grid item xs={12} sm={6}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>Institution</Typography>
                {data.institution.id ? (
                  <EntityLink href={`/research-output/institution/${data.institution.id}`}>{data.institution.name}</EntityLink>
                ) : (
                  <Typography sx={{ fontWeight: 600 }}>{data.institution.name}</Typography>
                )}
              </Grid>
            )}
            {(data.start_date || data.end_date) && (
              <Grid item xs={12} sm={6}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>Duration</Typography>
                <Typography>{[fmtDate(data.start_date), fmtDate(data.end_date)].filter(Boolean).join(' – ')}</Typography>
              </Grid>
            )}
          </Grid>
          {data.research_keywords?.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.75, mt: 2, flexWrap: 'wrap' }}>
              {data.research_keywords.map((k) => <Chip key={k} label={k} size="small" variant="outlined" sx={{ fontSize: 11 }} />)}
            </Box>
          )}
        </Box>

        {data.funder?.name && (
          <DetailSection title="Funding" icon={FundingIcon}>
            <EntityLink href={`/research-output/funder/${data.funder.id}`} sx={{ fontSize: 16 }}>{data.funder.name}</EntityLink>
            {data.funder.award_number && <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>Award {data.funder.award_number}</Typography>}
            {data.funder.amount && (
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: TL[700], mt: 0.5 }}>
                {data.funder.currency} {data.funder.amount.toLocaleString()}
              </Typography>
            )}
          </DetailSection>
        )}

        {data.team?.length > 0 && (
          <DetailSection title={`Research Team (${data.team.length})`} icon={PeopleIcon}>
            <Grid container spacing={1.5}>
              {data.team.map((m, i) => (
                <Grid item xs={12} sm={6} md={4} key={i}>
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    {m.id ? (
                      <EntityLink href={`/research-output/researcher/${m.id}`}>{m.name}</EntityLink>
                    ) : (
                      <Typography sx={{ fontWeight: 600 }}>{m.name}</Typography>
                    )}
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {[m.role, m.team].filter(Boolean).join(' · ')}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </DetailSection>
        )}

        {data.outputs?.length > 0 && (
          <DetailSection title="Research Outputs" icon={OutputIcon}>
            {data.outputs.map((o) => (
              <Box key={o.id} sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <EntityLink href={`/research-output/work/${o.id}`} sx={{ fontSize: 14 }}>{o.title}</EntityLink>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {[o.type, o.year, o.status].filter(Boolean).join(' · ')}
                </Typography>
              </Box>
            ))}
          </DetailSection>
        )}
      </Box>
    </Box>
  );
}
