'use client';

import React from 'react';
import {
  Box,
  Card,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Chip,
  alpha,
  Stack,
} from '@mui/material';
import { Groups, Science } from '@mui/icons-material';

const tiers = [
  {
    value: 'admin_staff',
    label: 'Administrative Staff',
    icon: Groups,
    description: 'Research support and administrative roles',
    badge: 'Requires Approval',
    badgeColor: 'warning',
  },
  {
    value: 'researcher',
    label: 'Researcher',
    icon: Science,
    description: 'Faculty and research personnel',
    badge: 'Active Immediately',
    badgeColor: 'success',
  },
];

export default function TierSelector({ selectedTier, onSelect }) {
  return (
    <Box>
      <Typography 
        variant="h5" 
        gutterBottom 
        fontWeight="600"
        sx={{ 
          fontSize: '1.375rem',
          mb: 1,
          color: 'text.primary'
        }}
      >
        Select Your Account Type
      </Typography>
      <Typography 
        variant="body1" 
        color="text.secondary" 
        sx={{ 
          mb: 4,
          fontSize: '0.9375rem',
          lineHeight: 1.6
        }}
      >
        Choose the account type that best describes your role in the institution.
      </Typography>

      <FormControl component="fieldset" fullWidth>
        <RadioGroup
          value={selectedTier || ''}
          onChange={(e) => onSelect(e.target.value)}
        >
          <Stack spacing={2.5}>
            {tiers.map((tier) => {
              const IconComponent = tier.icon;
              const isSelected = selectedTier === tier.value;

              return (
                <Card
                  key={tier.value}
                  sx={{
                    border: 2,
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    borderRadius: 2,
                    transition: 'all 0.25s ease',
                    cursor: 'pointer',
                    bgcolor: isSelected ? alpha('#1ca7a1', 0.03) : 'background.paper',
                    '&:hover': {
                      borderColor: isSelected ? 'primary.main' : alpha('#1ca7a1', 0.5),
                      bgcolor: alpha('#1ca7a1', 0.03),
                    },
                  }}
                  onClick={() => onSelect(tier.value)}
                >
                  <FormControlLabel
                    value={tier.value}
                    control={
                      <Radio 
                        sx={{ 
                          ml: 2,
                          '&.Mui-checked': {
                            color: 'primary.main',
                          },
                        }} 
                      />
                    }
                    label={
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          width: '100%',
                          py: 2,
                          pr: 3,
                        }}
                      >
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: isSelected 
                              ? alpha('#1ca7a1', 0.12) 
                              : alpha('#000', 0.04),
                            mr: 2,
                            flexShrink: 0,
                            transition: 'all 0.25s',
                          }}
                        >
                          <IconComponent
                            sx={{
                              fontSize: 28,
                              color: isSelected ? 'primary.main' : 'text.secondary',
                            }}
                          />
                        </Box>
                        <Box flex={1}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                            <Typography 
                              variant="subtitle1" 
                              fontWeight="600"
                              sx={{ 
                                fontSize: '1rem',
                                color: 'text.primary'
                              }}
                            >
                              {tier.label}
                            </Typography>
                            <Chip
                              label={tier.badge}
                              size="small"
                              color={tier.badgeColor}
                              sx={{ 
                                fontWeight: 600,
                                fontSize: '0.6875rem',
                                height: 22,
                                borderRadius: 0.75,
                              }}
                            />
                          </Box>
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{
                              fontSize: '0.875rem',
                              lineHeight: 1.5,
                            }}
                          >
                            {tier.description}
                          </Typography>
                        </Box>
                      </Box>
                    }
                    sx={{
                      m: 0,
                      width: '100%',
                      alignItems: 'flex-start',
                      '& .MuiFormControlLabel-label': {
                        width: '100%',
                      },
                    }}
                  />
                </Card>
              );
            })}
          </Stack>
        </RadioGroup>
      </FormControl>
    </Box>
  );
}
