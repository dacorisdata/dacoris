'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box, Typography, Button, CircularProgress, Alert, Paper, Grid,
  TextField, FormControl, InputLabel, Select, MenuItem, Divider,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton,
} from '@mui/material';
import {
  ArrowBack as BackIcon, Save as SaveIcon, Add as AddIcon, Delete as DeleteIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const ACCENT = '#8b5cf6';

const BUDGET_CATEGORIES = [
  'Personnel',
  'Equipment',
  'Travel',
  'Materials & Supplies',
  'Consultancy',
  'Indirect Costs',
  'Other',
];

function IssueAwardForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const proposalId = searchParams.get('proposal_id');
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Award form
  const [funderName, setFunderName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [conditions, setConditions] = useState('');
  
  // Budget lines
  const [budgetLines, setBudgetLines] = useState([
    { category: 'Personnel', description: '', amount: '' }
  ]);

  const addBudgetLine = () => {
    setBudgetLines([...budgetLines, { category: 'Personnel', description: '', amount: '' }]);
  };

  const removeBudgetLine = (index) => {
    setBudgetLines(budgetLines.filter((_, i) => i !== index));
  };

  const updateBudgetLine = (index, field, value) => {
    const updated = [...budgetLines];
    updated[index][field] = value;
    setBudgetLines(updated);
  };

  const calculateTotalBudget = () => {
    return budgetLines.reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0);
  };

  const issueAward = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      
      // Create award
      const awardRes = await axios.post(
        `${API_URL}/api/grants/awards`,
        {
          proposal_id: parseInt(proposalId),
          funder_name: funderName,
          total_amount: parseFloat(totalAmount),
          currency,
          start_date: startDate ? new Date(startDate).toISOString() : null,
          end_date: endDate ? new Date(endDate).toISOString() : null,
          conditions
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Add budget lines
      const validLines = budgetLines.filter(l => l.amount && parseFloat(l.amount) > 0);
      if (validLines.length > 0) {
        await axios.post(
          `${API_URL}/api/grants/awards/${awardRes.data.id}/budget`,
          validLines.map(l => ({
            category: l.category,
            description: l.description,
            amount: parseFloat(l.amount)
          })),
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      setSuccess('Award issued successfully!');
      setTimeout(() => router.push('/admin-staff/grants/awards'), 2000);
    } catch (e) {
      setError('Failed to issue award: ' + (e.response?.data?.detail || e.message));
    } finally {
      setSubmitting(false);
    }
  };

  const budgetTotal = calculateTotalBudget();
  const canSubmit = proposalId && funderName && totalAmount && parseFloat(totalAmount) > 0;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: 3 }}>
      <Button startIcon={<BackIcon />} onClick={() => router.push('/admin-staff/grants/awards')} sx={{ mb: 3 }}>
        Back to Awards
      </Button>

      <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 3, maxWidth: 1000, mx: 'auto' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          Issue Award
        </Typography>
        <Typography sx={{ color: 'text.secondary', mb: 4 }}>
          Create an award for an approved proposal
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Typography sx={{ fontSize: 16, fontWeight: 600, mb: 2 }}>Award Information</Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Proposal ID"
              type="number"
              value={proposalId || ''}
              disabled
              helperText="The proposal being awarded"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Funder Name"
              value={funderName}
              onChange={(e) => setFunderName(e.target.value)}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Total Award Amount"
              type="number"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Currency</InputLabel>
              <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="KES">KES</MenuItem>
                <MenuItem value="EUR">EUR</MenuItem>
                <MenuItem value="GBP">GBP</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Award Conditions"
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              helperText="Any special conditions or requirements for this award"
            />
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>

          {/* Budget Lines */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 600 }}>Budget Breakdown</Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={addBudgetLine}
                size="small"
                sx={{ textTransform: 'none' }}
              >
                Add Line Item
              </Button>
            </Box>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Amount</TableCell>
                  <TableCell width={50}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {budgetLines.map((line, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={line.category}
                          onChange={(e) => updateBudgetLine(index, 'category', e.target.value)}
                        >
                          {BUDGET_CATEGORIES.map(cat => (
                            <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        value={line.description}
                        onChange={(e) => updateBudgetLine(index, 'description', e.target.value)}
                        placeholder="Description"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={line.amount}
                        onChange={(e) => updateBudgetLine(index, 'amount', e.target.value)}
                        sx={{ width: 120 }}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => removeBudgetLine(index)}
                        disabled={budgetLines.length === 1}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={2} sx={{ fontWeight: 700 }}>Total Budget</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: ACCENT }}>
                    {currency} {budgetTotal.toLocaleString()}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {budgetTotal !== parseFloat(totalAmount || 0) && totalAmount && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Budget breakdown ({currency} {budgetTotal.toLocaleString()}) does not match total award amount ({currency} {parseFloat(totalAmount).toLocaleString()})
              </Alert>
            )}
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>

          {/* Submit */}
          <Grid item xs={12}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={submitting ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <SaveIcon />}
              onClick={issueAward}
              disabled={!canSubmit || submitting}
              sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#7c3aed' } }}
            >
              {submitting ? 'Issuing Award...' : 'Issue Award'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}

export default function IssueAwardPage() {
  return (
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>}>
      <IssueAwardForm />
    </Suspense>
  );
}
