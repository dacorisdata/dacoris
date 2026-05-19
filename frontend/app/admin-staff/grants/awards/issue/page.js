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
        `${API_URL}/grants/awards`,
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
          `${API_URL}/grants/awards/${awardRes.data.id}/budget`,
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

        {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

        {/* Award Information */}
        <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2 }}>Award Information</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <TextField
            label="Proposal ID"
            type="number"
            value={proposalId || ''}
            disabled
            helperText="The proposal being awarded"
            sx={{ flex: '1 1 200px' }}
          />
          <TextField
            label="Funder Name"
            value={funderName}
            onChange={(e) => setFunderName(e.target.value)}
            required
            sx={{ flex: '2 1 300px' }}
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
