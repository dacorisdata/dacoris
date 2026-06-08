'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Typography, Button, CircularProgress, Alert, Grid } from '@mui/material';
import { ArrowBack as BackIcon, AccountBalance as FundingIcon, Science as ProjectIcon } from '@mui/icons-material';
import axios from 'axios';
import { ScholarRow, EntityLink, DetailSection, TL, MetaChip } from '@/components/research-catalog/CatalogShared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function FunderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`${API_URL}/public/catalog/funders/${id}`)
      .then((r) => setData(r.data))
      .catch(() => setError('Funder not found'))
      .finally(() => setLoading(false));
  }, [id]);

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
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>{data.name}</Typography>
          {data.country && <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>{data.country}</Typography>}
          <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
            <MetaChip label={`${data.works_count} funded works`} />
            <MetaChip label={`${data.projects_count} projects`} />
            {data.total_funding > 0 && (
              <MetaChip label={`${data.currency} ${data.total_funding.toLocaleString()} total`} color={TL[700]} />
            )}
          </Box>
        </Box>

        {data.projects?.length > 0 && (
          <DetailSection title="Funded Projects" icon={ProjectIcon}>
            <Grid container spacing={1.5}>
              {data.projects.map((p) => (
                <Grid item xs={12} sm={6} key={p.id}>
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <EntityLink href={`/research-output/project/${p.id}`}>{p.title}</EntityLink>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
                      {[p.award_number, p.amount && `${p.currency} ${p.amount.toLocaleString()}`, p.status].filter(Boolean).join(' · ')}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </DetailSection>
        )}

        {data.works?.length > 0 && (
          <DetailSection title="Funded Publications" icon={FundingIcon}>
            <Box sx={{ mx: -3 }}>
              {data.works.map((w) => <ScholarRow key={w.id} work={w} onNavigate={router.push} />)}
            </Box>
          </DetailSection>
        )}
      </Box>
    </Box>
  );
}
