'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Typography, Button, CircularProgress, Alert, Grid, Chip, alpha } from '@mui/material';
import { ArrowBack as BackIcon, People as PeopleIcon, Science as ProjectIcon } from '@mui/icons-material';
import axios from 'axios';
import { ScholarRow, EntityLink, DetailSection, TL, MetaChip } from '@/components/research-catalog/CatalogShared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function ResearcherDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`${API_URL}/public/catalog/researchers/${id}`)
      .then((r) => setData(r.data))
      .catch(() => setError('Researcher not found'))
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
          {data.affiliation && <Typography sx={{ fontSize: 15, color: 'text.secondary', mb: 0.5 }}>{data.affiliation}</Typography>}
          {data.department && <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>{data.department}{data.job_title ? ` · ${data.job_title}` : ''}</Typography>}
          <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
            <MetaChip label={`${data.publication_count} publications`} />
            <MetaChip label={`${data.project_count} projects`} />
            {data.is_platform_user && <MetaChip label="DACORIS member" color={TL[700]} />}
            {data.orcid && (
              <Chip
                label={`ORCID ${data.orcid}`}
                size="small"
                component="a"
                href={`https://orcid.org/${data.orcid}`}
                target="_blank"
                clickable
                sx={{ fontSize: 11, bgcolor: alpha(TL[600], 0.1), color: TL[700] }}
              />
            )}
          </Box>
          {data.expertise_keywords?.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.75, mt: 2, flexWrap: 'wrap' }}>
              {data.expertise_keywords.map((k) => <Chip key={k} label={k} size="small" variant="outlined" sx={{ fontSize: 11 }} />)}
            </Box>
          )}
        </Box>

        {data.projects?.length > 0 && (
          <DetailSection title={`Research Projects (${data.projects.length})`} icon={ProjectIcon}>
            <Grid container spacing={1.5}>
              {data.projects.map((p) => (
                <Grid item xs={12} sm={6} key={p.id}>
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <EntityLink href={`/research-output/project/${p.id}`} sx={{ fontSize: 14 }}>{p.title}</EntityLink>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>{p.status}{p.research_area ? ` · ${p.research_area}` : ''}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </DetailSection>
        )}

        {data.works?.length > 0 && (
          <DetailSection title={`Publications (${data.works.length})`} icon={PeopleIcon}>
            <Box sx={{ mx: -3 }}>
              {data.works.map((w) => <ScholarRow key={w.id} work={w} onNavigate={router.push} />)}
            </Box>
          </DetailSection>
        )}
      </Box>
    </Box>
  );
}
