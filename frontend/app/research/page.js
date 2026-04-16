'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Button, Card, CardContent, Grid, Chip, CircularProgress } from '@mui/material';
import { Add, Science } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { researchAPI } from '@/lib/apiModules';
import dayjs from 'dayjs';

export default function ResearchPage() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await researchAPI.listProjects();
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'success',
      proposed: 'info',
      completed: 'default',
      suspended: 'warning',
    };
    return colors[status] || 'default';
  };

  return (
    <AppShell currentModule="research">
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight={700}>
            Research Projects
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => router.push('/research/new')}
          >
            Register Project
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {projects.map((project) => (
              <Grid item xs={12} md={6} key={project.id}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { boxShadow: 4 }
                  }}
                  onClick={() => router.push(`/research/${project.id}`)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Chip 
                        label={project.status} 
                        size="small" 
                        color={getStatusColor(project.status)}
                      />
                      <Chip 
                        label={project.project_type} 
                        size="small" 
                        variant="outlined"
                      />
                    </Box>

                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      {project.title}
                    </Typography>

                    {project.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {project.description.substring(0, 150)}
                        {project.description.length > 150 ? '...' : ''}
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                      {project.start_date && (
                        <Typography variant="caption" color="text.secondary">
                          Started: {dayjs(project.start_date).format('MMM D, YYYY')}
                        </Typography>
                      )}
                      {project.involves_human_subjects && (
                        <Chip label="Human Subjects" size="small" color="warning" />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {!loading && projects.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Science sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No research projects yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Register your first research project to get started
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => router.push('/research/new')}
            >
              Register Project
            </Button>
          </Box>
        )}
      </Box>
    </AppShell>
  );
}
