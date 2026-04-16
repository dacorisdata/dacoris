import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Grid,
  Chip,
  Icon,
  CircularProgress,
  Alert
} from '@mui/material';
import { Science, AccountBalance, Payments, Gavel, Storage, Engineering, BusinessCenter } from '@mui/icons-material';

const iconMap = {
  science: Science,
  account_balance: AccountBalance,
  payments: Payments,
  gavel: Gavel,
  storage: Storage,
  engineering: Engineering,
  business_center: BusinessCenter
};

export default function AccountTypeSelector({ onSelect, selectedType }) {
  const [accountTypes, setAccountTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAccountTypes();
  }, []);

  const fetchAccountTypes = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/registration/account-types`);
      if (!response.ok) throw new Error('Failed to fetch account types');
      const data = await response.json();
      setAccountTypes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Select Your Account Type
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Choose the account type that best describes your role. You can be assigned additional roles later by your institution administrator.
      </Typography>

      <Grid container spacing={3}>
        {accountTypes.map((type) => {
          const IconComponent = iconMap[type.icon] || Science;
          const isSelected = selectedType === type.value;

          return (
            <Grid item xs={12} sm={6} md={4} key={type.value}>
              <Card
                sx={{
                  height: '100%',
                  border: isSelected ? 2 : 1,
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: 3
                  }
                }}
              >
                <CardActionArea
                  onClick={() => onSelect(type.value)}
                  sx={{ height: '100%', p: 2 }}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Icon
                        component={IconComponent}
                        sx={{
                          fontSize: 40,
                          color: isSelected ? 'primary.main' : 'text.secondary',
                          mr: 2
                        }}
                      />
                      <Box flex={1}>
                        <Typography variant="h6" fontWeight="bold">
                          {type.label}
                        </Typography>
                        {type.requires_orcid && (
                          <Chip
                            label="ORCID Required"
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ mt: 0.5 }}
                          />
                        )}
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {type.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {selectedType && (
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Selected:</strong> {accountTypes.find(t => t.value === selectedType)?.label}
          </Typography>
        </Alert>
      )}
    </Box>
  );
}
