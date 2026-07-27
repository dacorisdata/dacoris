'use client';

import { useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Alert, Chip, Grid,
  IconButton, CircularProgress,
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#1ca7a1';
const GOLD = '#f59e0b';

const REQUEST_STATUS_STYLE = {
  pending: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  approved: { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  paid: { color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
  cancelled: { color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
};

function RequestStatusChip({ status }) {
  const style = REQUEST_STATUS_STYLE[status] || REQUEST_STATUS_STYLE.pending;
  return (
    <Chip
      label={(status || 'pending').replace(/_/g, ' ')}
      size="small"
      sx={{ fontWeight: 700, textTransform: 'capitalize', bgcolor: style.bg, color: style.color }}
    />
  );
}

function DetailField({ label, value }) {
  return (
    <Grid item xs={12} sm={6} md={3}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mb: 0.5, letterSpacing: 0.4 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{value || '—'}</Typography>
    </Grid>
  );
}

export default function ProjectFinancialTab({
  project,
  projectId,
  t,
  locale,
  fmtDate,
  fmtMoney,
  onRefresh,
  SectionCard,
}) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const [spendOpen, setSpendOpen] = useState(false);
  const [spendLine, setSpendLine] = useState(null);
  const [spendAmount, setSpendAmount] = useState('');

  const [reqOpen, setReqOpen] = useState(false);
  const [reqForm, setReqForm] = useState({
    amount: '',
    purpose: '',
    justification: '',
    budget_line_id: '',
  });

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
  const currency = project.reporting_currency || 'KES';
  const budgetLines = project.budget_lines || [];
  const paymentRequests = project.payment_requests || [];
  const budgetTotal = budgetLines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const budgetSpent = budgetLines.reduce((s, l) => s + (Number(l.spent_to_date) || 0), 0);

  const flash = (msg, isError = false) => {
    if (isError) {
      setError(msg);
      setSuccess('');
    } else {
      setSuccess(msg);
      setError('');
    }
    setTimeout(() => {
      setError('');
      setSuccess('');
    }, 3500);
  };

  const openSpend = (line) => {
    setSpendLine(line);
    setSpendAmount(String(line.spent_to_date ?? 0));
    setSpendOpen(true);
  };

  const saveSpend = async () => {
    const value = Number(spendAmount);
    if (!Number.isFinite(value) || value < 0) {
      flash('Enter a valid non-negative amount.', true);
      return;
    }
    setBusy(true);
    try {
      await axios.patch(
        `${API}/research/projects/${projectId}/budget-lines/${spendLine.id}/expenditure`,
        { spent_to_date: Math.round(value) },
        { headers: authHeaders() },
      );
      setSpendOpen(false);
      await onRefresh();
      flash('Expenditure updated.');
    } catch (err) {
      flash(err.response?.data?.detail || 'Failed to update expenditure.', true);
    } finally {
      setBusy(false);
    }
  };

  const openRequest = () => {
    setReqForm({ amount: '', purpose: '', justification: '', budget_line_id: '' });
    setReqOpen(true);
  };

  const submitRequest = async () => {
    const amount = Number(reqForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      flash('Enter a valid request amount greater than zero.', true);
      return;
    }
    if (!(reqForm.purpose || '').trim()) {
      flash('Purpose is required.', true);
      return;
    }
    setBusy(true);
    try {
      await axios.post(
        `${API}/research/projects/${projectId}/payment-requests`,
        {
          amount: Math.round(amount),
          purpose: reqForm.purpose.trim(),
          justification: (reqForm.justification || '').trim() || null,
          budget_line_id: reqForm.budget_line_id || null,
          currency,
        },
        { headers: authHeaders() },
      );
      setReqOpen(false);
      await onRefresh();
      flash('Payment request submitted.');
    } catch (err) {
      flash(err.response?.data?.detail || 'Failed to submit request.', true);
    } finally {
      setBusy(false);
    }
  };

  const cancelRequest = async (requestId) => {
    setBusy(true);
    try {
      await axios.patch(
        `${API}/research/projects/${projectId}/payment-requests/${requestId}`,
        { status: 'cancelled' },
        { headers: authHeaders() },
      );
      await onRefresh();
      flash('Request cancelled.');
    } catch (err) {
      flash(err.response?.data?.detail || 'Failed to cancel request.', true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{success}</Alert>}

      <SectionCard
        icon={MoneyIcon}
        title={t('researcher.projectDetail.sections.budgetFinancial')}
        action={
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openRequest}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              bgcolor: GOLD,
              '&:hover': { bgcolor: '#d97706' },
            }}
          >
            Make request
          </Button>
        }
      >
        <Grid container spacing={2.5} sx={{ mb: 2 }}>
          <DetailField label={t('researcher.projectDetail.fields.reportingCurrency')} value={currency} />
          <DetailField label={t('researcher.projectDetail.fields.overheadRate')} value={project.financial_overhead_rate} />
          <DetailField label={t('researcher.projectDetail.fields.totalBudget')} value={fmtMoney(budgetTotal, currency, locale)} />
          <DetailField label={t('researcher.projectDetail.fields.spentToDate')} value={fmtMoney(budgetSpent, currency, locale)} />
        </Grid>
        {project.financial_notes && (
          <Typography sx={{ fontSize: 13, mb: 2, color: 'text.secondary' }}>{project.financial_notes}</Typography>
        )}

        {budgetLines.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            {t('researcher.projectDetail.empty.noBudgetLines')}
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>{t('researcher.projectDetail.table.category')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('researcher.projectDetail.table.description')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">{t('researcher.projectDetail.table.amount')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">{t('researcher.projectDetail.table.spent')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {budgetLines.map((bl) => (
                <TableRow key={bl.id} hover>
                  <TableCell>{bl.category}</TableCell>
                  <TableCell>{bl.description || '—'}</TableCell>
                  <TableCell align="right">{fmtMoney(bl.amount, currency, locale)}</TableCell>
                  <TableCell align="right">{fmtMoney(bl.spent_to_date, currency, locale)}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                      onClick={() => openSpend(bl)}
                      sx={{ textTransform: 'none', fontWeight: 600, color: ACCENT }}
                    >
                      Update spend
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      <SectionCard icon={MoneyIcon} title="Payment & fund requests">
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>
          Submit drawdown or payment requests against budget lines. Institutional finance can approve and mark them as paid.
        </Typography>
        {paymentRequests.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No payment requests yet.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Purpose</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Budget line</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Amount</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Requested</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paymentRequests.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{r.purpose}</Typography>
                    {r.justification && (
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{r.justification}</Typography>
                    )}
                  </TableCell>
                  <TableCell>{r.budget_line_category || '—'}</TableCell>
                  <TableCell align="right">{fmtMoney(r.amount, r.currency || currency, locale)}</TableCell>
                  <TableCell><RequestStatusChip status={r.status} /></TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: 12 }}>{fmtDate(r.created_at, locale)}</Typography>
                    {r.requested_by_name && (
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{r.requested_by_name}</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {r.status === 'pending' && (
                      <IconButton size="small" onClick={() => cancelRequest(r.id)} disabled={busy} title="Cancel request">
                        <CancelIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      <Dialog open={spendOpen} onClose={() => !busy && setSpendOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Update expenditure</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
            {spendLine?.category}
            {spendLine?.description ? ` — ${spendLine.description}` : ''}
          </Typography>
          <Typography sx={{ fontSize: 12, mb: 1.5 }}>
            Budgeted: <strong>{fmtMoney(spendLine?.amount, currency, locale)}</strong>
          </Typography>
          <TextField
            fullWidth
            type="number"
            label={`Spent to date (${currency})`}
            value={spendAmount}
            onChange={(e) => setSpendAmount(e.target.value)}
            inputProps={{ min: 0, step: 1 }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSpendOpen(false)} disabled={busy} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={saveSpend}
            disabled={busy}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: ACCENT, '&:hover': { bgcolor: '#0e8a85' } }}
          >
            {busy ? <CircularProgress size={18} color="inherit" /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={reqOpen} onClose={() => !busy && setReqOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Make payment / fund request</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            fullWidth
            type="number"
            label={`Amount (${currency})`}
            value={reqForm.amount}
            onChange={(e) => setReqForm((f) => ({ ...f, amount: e.target.value }))}
            inputProps={{ min: 1, step: 1 }}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
            <InputLabel>Budget line (optional)</InputLabel>
            <Select
              label="Budget line (optional)"
              value={reqForm.budget_line_id}
              onChange={(e) => setReqForm((f) => ({ ...f, budget_line_id: e.target.value }))}
            >
              <MenuItem value="">None</MenuItem>
              {budgetLines.map((bl) => (
                <MenuItem key={bl.id} value={bl.id}>
                  {bl.category}{bl.description ? ` — ${bl.description}` : ''} ({fmtMoney(bl.amount, currency, locale)})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Purpose"
            value={reqForm.purpose}
            onChange={(e) => setReqForm((f) => ({ ...f, purpose: e.target.value }))}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Justification"
            value={reqForm.justification}
            onChange={(e) => setReqForm((f) => ({ ...f, justification: e.target.value }))}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReqOpen(false)} disabled={busy} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={submitRequest}
            disabled={busy}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: GOLD, '&:hover': { bgcolor: '#d97706' } }}
          >
            {busy ? <CircularProgress size={18} color="inherit" /> : 'Submit request'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
