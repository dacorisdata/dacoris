'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, CardActionArea, Chip } from '@mui/material';
import { 
  Assessment, 
  Science, 
  Storage, 
  TrendingUp,
  ArrowForward 
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();

  const stats = [
    {
      label: 'Active Grants',
      value: '0',
      icon: Assessment,
      color: '#1976d2',
      bgColor: '#e3f2fd',
      change: '+0%',
      changeType: 'neutral'
    },
    {
      label: 'Research Projects',
      value: '0',
      icon: Science,
      color: '#9c27b0',
      bgColor: '#f3e5f5',
      change: '+0%',
      changeType: 'neutral'
    },
    {
      label: 'Data Forms',
      value: '0',
      icon: Storage,
      color: '#2e7d32',
      bgColor: '#e8f5e9',
      change: '+0%',
      changeType: 'neutral'
    },
    {
      label: 'Submissions',
      value: '0',
      icon: TrendingUp,
      color: '#ed6c02',
      bgColor: '#fff3e0',
      change: '+0%',
      changeType: 'neutral'
    },
  ];

  const modules = [
    {
      title: 'Grants',
      icon: <Assessment sx={{ fontSize: 40 }} />,
      description: 'Manage grant opportunities, proposals, and awards',
      path: '/grants',
      color: '#1976d2',
      bgGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    {
      title: 'Research',
      icon: <Science sx={{ fontSize: 40 }} />,
      description: 'Track research projects and ethics applications',
      path: '/research',
      color: '#9c27b0',
      bgGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    },
    {
      title: 'Data Capture',
      icon: <Storage sx={{ fontSize: 40 }} />,
      description: 'Create forms and collect research data',
      path: '/data',
      color: '#2e7d32',
      bgGradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    },
  ];

  return (
    <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
      {/* Header Section */}
      <Box sx={{ mb: 5 }}>
        <Typography 
          variant="h4" 
          fontWeight={700} 
          sx={{ 
            mb: 1,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome to DACORIS - Your Research Management System
        </Typography>
      </Box>

      {/* Stats Cards - Using Flexbox */}
      <Box 
        sx={{ 
          display: 'flex',
          flexWrap: 'wrap',
          gap: 3,
          mb: 5
        }}
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              sx={{
                flex: '1 1 calc(25% - 18px)',
                minWidth: 240,
                position: 'relative',
                overflow: 'visible',
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                  borderColor: stat.color,
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      bgcolor: stat.bgColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: stat.color,
                    }}
                  >
                    <Icon sx={{ fontSize: 28 }} />
                  </Box>
                  <Chip 
                    label={stat.change} 
                    size="small"
                    sx={{ 
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      bgcolor: stat.changeType === 'positive' ? '#e8f5e9' : '#f5f5f5',
                      color: stat.changeType === 'positive' ? '#2e7d32' : 'text.secondary',
                    }}
                  />
                </Box>
                <Typography variant="h3" fontWeight={700} sx={{ mb: 0.5, color: 'text.primary' }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* Quick Access Modules */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
          Quick Access
        </Typography>
        <Grid container spacing={3}>
          {modules.map((module) => (
            <Grid item xs={12} md={4} key={module.path}>
              <Card 
                sx={{ 
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': { 
                    transform: 'translateY(-8px)',
                    boxShadow: 6,
                    '& .arrow-icon': {
                      transform: 'translateX(4px)',
                    }
                  }
                }}
                onClick={() => router.push(module.path)}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 120,
                    height: 120,
                    background: module.bgGradient,
                    opacity: 0.1,
                    borderRadius: '0 0 0 100%',
                  }}
                />
                <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 2
                    }}
                  >
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: 2,
                        background: module.bgGradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                      }}
                    >
                      {module.icon}
                    </Box>
                    <ArrowForward 
                      className="arrow-icon"
                      sx={{ 
                        color: 'text.secondary',
                        transition: 'transform 0.3s ease'
                      }} 
                    />
                  </Box>
                  <Typography 
                    variant="h5" 
                    fontWeight={600} 
                    gutterBottom
                    sx={{ color: 'text.primary' }}
                  >
                    {module.title}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ lineHeight: 1.6 }}
                  >
                    {module.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
