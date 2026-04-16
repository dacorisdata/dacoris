'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Button, Card, CardContent, Grid, Chip, CircularProgress } from '@mui/material';
import { Add, CalendarToday, AttachMoney } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { grantsAPI } from '@/lib/apiModules';
import dayjs from 'dayjs';

export default function GrantsPage() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOpportunities();
  }, []);

  const loadOpportunities = async () => {
    try {
      const response = await grantsAPI.listOpportunities();
      setOpportunities(response.data);
    } catch (error) {
      console.error('Failed to load opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'success',
      closed: 'error',
      draft: 'default',
    };
    return colors[status] || 'default';
  };

  return (
    <AppShell currentModule="grants">
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight={700}>
            Grant Opportunities
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => router.push('/grants/new')}
          >
            Create Opportunity
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {opportunities.map((opp) => (
              <Grid item xs={12} md={6} lg={4} key={opp.id}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    cursor: 'pointer',
                    '&:hover': { boxShadow: 4 }
                  }}
                  onClick={() => router.push(`/grants/${opp.id}`)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Chip 
                        label={opp.status} 
                        size="small" 
                        color={getStatusColor(opp.status)}
                      />
                      {opp.deadline && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CalendarToday fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            {dayjs(opp.deadline).format('MMM D, YYYY')}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      {opp.title}
                    </Typography>

                    {opp.sponsor && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {opp.sponsor}
                      </Typography>
                    )}

                    {(opp.amount_min || opp.amount_max) && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 2 }}>
                        <AttachMoney fontSize="small" color="primary" />
                        <Typography variant="body2" color="primary.main" fontWeight={600}>
                          {opp.amount_min && opp.amount_max
                            ? `${opp.currency} ${opp.amount_min.toLocaleString()} - ${opp.amount_max.toLocaleString()}`
                            : opp.amount_max
                            ? `Up to ${opp.currency} ${opp.amount_max.toLocaleString()}`
                            : `${opp.currency} ${opp.amount_min.toLocaleString()}+`
                          }
                        </Typography>
                      </Box>
                    )}

                    {opp.category && (
                      <Chip 
                        label={opp.category} 
                        size="small" 
                        variant="outlined"
                        sx={{ mt: 2 }}
                      />
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {!loading && opportunities.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No grant opportunities yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first grant opportunity to get started
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => router.push('/grants/new')}
            >
              Create Opportunity
            </Button>
          </Box>
        )}
      </Box>
    </AppShell>
  );
}
