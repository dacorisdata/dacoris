'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box, Typography, Button, CircularProgress, Alert, Paper,
  TextField, FormControl, InputLabel, Select, MenuItem, Divider,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton,
} from '@mui/material';
import {
  ArrowBack as BackIcon, Save as SaveIcon, Add as AddIcon, Delete as DeleteIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
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
  const [currency, setCurrency] = useState('KES');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [conditions, setConditions] = useState('');
  
  // Budget lines
  const [budgetLines, setBudgetLines] = useState([
    { category: 'Personnel', description: '', amount: '' }
  ]);

  // Fetch proposal data to prepopulate funder name
  useEffect(() => {
    const fetchProposalData = async () => {
      if (!proposalId) {
        setError('No proposal ID provided. Please select a proposal first.');
        return;
      }
      
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        console.log('Fetching proposal data for ID:', proposalId);
        
        const res = await axios.get(
          `${API_URL}/grants/proposals/${proposalId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log('Proposal data received:', res.data);
        
        // Prepopulate funder name from opportunity sponsor
        if (res.data?.opportunity?.sponsor) {
          console.log('Setting funder name from opportunity:', res.data.opportunity.sponsor);
          setFunderName(res.data.opportunity.sponsor);
        } else {
          console.warn('No sponsor found in opportunity data');
          setError('Warning: Could not auto-populate funder name from proposal. Please enter it manually.');
        }
        
        // Optionally prepopulate currency from opportunity
        if (res.data?.opportunity?.currency) {
          console.log('Setting currency from opportunity:', res.data.opportunity.currency);
          setCurrency(res.data.opportunity.currency);
        }
      } catch (e) {
        console.error('Failed to fetch proposal data:', e);
        console.error('Error response:', e.response);
        
        let errorMsg = 'Failed to load proposal data: ';
        if (e.response?.status === 404) {
          errorMsg = 'Proposal not found. The proposal may have been deleted or you may not have permission to view it.';
        } else {
          errorMsg += e.response?.data?.detail || e.message || 'Unknown error';
        }
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProposalData();
  }, [proposalId]);

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
      setError('');
      const token = localStorage.getItem('token');
      
      // Validate inputs
      if (!proposalId) {
        setError('Proposal ID is required');
        return;
      }
      
      const amount = parseFloat(totalAmount);
      if (isNaN(amount) || amount <= 0) {
        setError('Total amount must be a positive number');
        return;
      }
      
      if (!funderName || funderName.trim() === '') {
        setError('Funder name is required');
        return;
      }
      
      // Prepare payload
      const payload = {
        proposal_id: proposalId,
        funder_name: funderName.trim(),
        total_amount: amount,
        currency,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        end_date: endDate ? new Date(endDate).toISOString() : null,
        conditions: conditions || null
      };
      
      console.log('Issuing award with payload:', payload);
      
      // Create award
      const awardRes = await axios.post(
        `${API_URL}/grants/awards`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Award created:', awardRes.data);
      
      // Add budget lines
      const validLines = budgetLines.filter(l => l.amount && parseFloat(l.amount) > 0);
      if (validLines.length > 0) {
        await axios.post(
          `${API_URL}/grants/awards/${awardRes.data.id}/budget`,
          validLines.map(l => ({
            category: l.category,
            description: l.description || '',
            amount: parseFloat(l.amount)
          })),
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      setSuccess('Award issued successfully!');
      setTimeout(() => router.push('/admin-staff/grants/awards'), 2000);
    } catch (e) {
      console.error('Award issuance error:', e);
      console.error('Error response:', e.response?.data);
      console.error('Error status:', e.response?.status);
      
      let errorMessage = 'Failed to issue award: ';
      
      if (e.response?.status === 404) {
        errorMessage = 'Proposal not found or you do not have permission to award it.';
      } else if (e.response?.status === 400) {
        errorMessage = e.response.data?.detail || 'The proposal cannot be awarded in its current status.';
      } else if (e.response?.data?.detail) {
        // Handle both string and array formats
        if (Array.isArray(e.response.data.detail)) {
          errorMessage += e.response.data.detail.map(err => {
            if (err.msg) return `${err.loc?.join('.') || ''}: ${err.msg}`;
            return JSON.stringify(err);
          }).join(', ');
        } else if (typeof e.response.data.detail === 'string') {
          errorMessage += e.response.data.detail;
        } else {
          errorMessage += JSON.stringify(e.response.data.detail);
        }
      } else {
        errorMessage += e.message || 'Unknown error occurred';
      }
      
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const budgetTotal = calculateTotalBudget();
  const canSubmit = proposalId && funderName && totalAmount && parseFloat(totalAmount) > 0;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Button startIcon={<BackIcon />} onClick={() => router.push('/admin-staff/grants/awards')}
        sx={{ mb: 2.5, color: 'text.secondary', textTransform: 'none', fontWeight: 500 }}>
        Back to Awards
      </Button>

      <Paper elevation={0} variant="outlined" sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: 3 }}>
        <Typography sx={{ fontSize: 21, fontWeight: 800, mb: 0.5 }}>Issue Award</Typography>
        <Typography sx={{ color: 'text.secondary', mb: 3, fontSize: 13 }}>
          Record award details for an approved proposal
        </Typography>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

        {!loading && (
          <>
            {/* Award Information */}
            <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2 }}>Award Information</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <TextField
            label="Proposal ID"
            value={proposalId || ''}
            disabled
            helperText="The proposal being awarded"
            sx={{ flex: '1 1 300px' }}
            size="small"
          />
          <TextField
            label="Funder Name"
            value={funderName}
            onChange={(e) => setFunderName(e.target.value)}
            required
            helperText="Auto-populated from proposal opportunity"
            sx={{ flex: '2 1 300px' }}
            size="small"
          />
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <TextField
            label="Total Award Amount"
            type="number"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            required
            sx={{ flex: '1 1 200px' }}
          />
          <FormControl sx={{ flex: '1 1 150px' }}>
            <InputLabel>Currency</InputLabel>
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)} label="Currency">
              <MenuItem value="USD">USD</MenuItem>
              <MenuItem value="KES">KES</MenuItem>
              <MenuItem value="EUR">EUR</MenuItem>
              <MenuItem value="GBP">GBP</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: '1 1 180px' }}
          />
          <TextField
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: '1 1 180px' }}
          />
        </Box>
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Award Conditions"
          value={conditions}
          onChange={(e) => setConditions(e.target.value)}
          helperText="Any special conditions or requirements for this award"
          sx={{ mb: 3 }}
        />

        <Divider sx={{ mb: 3 }} />

        {/* Budget Lines */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Budget Breakdown</Typography>
          <Button startIcon={<AddIcon />} onClick={addBudgetLine} size="small" sx={{ textTransform: 'none' }}>
            Add Line Item
          </Button>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">Amount</TableCell>
              <TableCell width={50} />
            </TableRow>
          </TableHead>
          <TableBody>
            {budgetLines.map((line, index) => (
              <TableRow key={index}>
                <TableCell sx={{ minWidth: 160 }}>
                  <FormControl fullWidth size="small">
                    <Select value={line.category} onChange={(e) => updateBudgetLine(index, 'category', e.target.value)}>
                      {BUDGET_CATEGORIES.map(cat => (
                        <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <TextField fullWidth size="small" value={line.description}
                    onChange={(e) => updateBudgetLine(index, 'description', e.target.value)}
                    placeholder="Description" />
                </TableCell>
                <TableCell align="right">
                  <TextField size="small" type="number" value={line.amount}
                    onChange={(e) => updateBudgetLine(index, 'amount', e.target.value)}
                    sx={{ width: 130 }} />
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => removeBudgetLine(index)} disabled={budgetLines.length === 1}>
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
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>

        {budgetTotal !== parseFloat(totalAmount || 0) && totalAmount && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Budget breakdown ({currency} {budgetTotal.toLocaleString()}) does not match total award amount ({currency} {parseFloat(totalAmount).toLocaleString()})
          </Alert>
        )}

        <Divider sx={{ my: 3 }} />

        <Button
          fullWidth variant="contained" size="large"
          startIcon={submitting ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <SaveIcon />}
          onClick={issueAward}
          disabled={!canSubmit || submitting}
          sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#7c3aed' }, textTransform: 'none', fontWeight: 700, fontSize: 15 }}
        >
          {submitting ? 'Issuing Award...' : 'Issue Award'}
        </Button>
          </>
        )}
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
