'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Button, Card, CardContent, Grid, Chip, CircularProgress } from '@mui/material';
import { Add, Storage, CloudUpload } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { dataAPI } from '@/lib/apiModules';
import dayjs from 'dayjs';

export default function DataPage() {
  const router = useRouter();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      const response = await dataAPI.listForms();
      setForms(response.data);
    } catch (error) {
      console.error('Failed to load forms:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell currentModule="data">
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight={700}>
            Data Capture Forms
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<CloudUpload />}
              onClick={() => router.push('/data/upload')}
            >
              Upload CSV
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => router.push('/data/forms/new')}
            >
              Create Form
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {forms.map((form) => (
              <Grid item xs={12} md={6} lg={4} key={form.id}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { boxShadow: 4 }
                  }}
                  onClick={() => router.push(`/data/forms/${form.id}`)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Chip 
                        label={form.is_active ? 'Active' : 'Inactive'} 
                        size="small" 
                        color={form.is_active ? 'success' : 'default'}
                      />
                      <Chip 
                        label={form.source_system} 
                        size="small" 
                        variant="outlined"
                      />
                    </Box>

                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      {form.title}
                    </Typography>

                    {form.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {form.description.substring(0, 100)}
                        {form.description.length > 100 ? '...' : ''}
                      </Typography>
                    )}

                    <Typography variant="caption" color="text.secondary">
                      Created: {dayjs(form.created_at).format('MMM D, YYYY')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {!loading && forms.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Storage sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No data capture forms yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first data capture form to start collecting data
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => router.push('/data/forms/new')}
            >
              Create Form
            </Button>
          </Box>
        )}
      </Box>
    </AppShell>
  );
}
