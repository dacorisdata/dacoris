'use client';

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Grid,
  Chip,
} from '@mui/material';
import { Badge, Email } from '@mui/icons-material';

const methods = [
  {
    value: 'orcid',
    label: 'ORCID OAuth',
    icon: Badge,
    description: 'Sign up using your ORCID account for automatic profile sync',
    recommended: true,
  },
  {
    value: 'email',
    label: 'Institutional Email',
    icon: Email,
    description: 'Sign up using your institutional email address',
    recommended: false,
  },
];

export default function ResearcherMethodSelector({ selectedMethod, onSelect }) {
  return (
    <Box>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Choose Registration Method
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Select how you would like to register as a researcher.
      </Typography>

      <Grid container spacing={3}>
        {methods.map((method) => {
          const IconComponent = method.icon;
          const isSelected = selectedMethod === method.value;

          return (
            <Grid item xs={12} sm={6} key={method.value}>
              <Card
                sx={{
                  height: '100%',
                  border: isSelected ? 2 : 1,
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: 3,
                  },
                }}
              >
                <CardActionArea
                  onClick={() => onSelect(method.value)}
                  sx={{ height: '100%', p: 2 }}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <IconComponent
                        sx={{
                          fontSize: 48,
                          color: isSelected ? 'primary.main' : 'text.secondary',
                          mr: 2,
                        }}
                      />
                      <Box flex={1}>
                        <Typography variant="h6" fontWeight="bold">
                          {method.label}
                        </Typography>
                        {method.recommended && (
                          <Chip
                            label="Recommended"
                            size="small"
                            color="primary"
                            sx={{ mt: 0.5 }}
                          />
                        )}
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {method.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
