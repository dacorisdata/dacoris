'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme,
  Alert, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, MenuItem, FormControl, InputLabel, Select,
  Tooltip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  TrackChanges as TrackerIcon,
  OpenInNew as OpenIcon,
  Search as SearchIcon,
  PlayArrow as StartIcon,
  Update as UpdateIcon,
  CheckCircle as AwardedIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { grantsAPI } from '../../../../lib/apiModules';

const ACCENT = '#16a699';
const GT = 'researcher.grantsTracker';
const LOCALE_MAP = { en: 'en-US', fr: 'fr-FR', ar: 'ar', sw: 'sw-KE' };

/** Post-approval grant application pipeline only */
const TRACKED_STATUSES = new Set(['approved', 'applying', 'awarded', 'funding_unsuccessful']);

const STATUS_STYLE = {
  approved: { color: '#10b981' },
  applying: { color: '#06b6d4' },
  awarded: { color: '#10b981' },
  funding_unsuccessful: { color: '#ef4444' },
};

const fmtDate = (d, locale) =>
  d
    ? new Date(d).toLocaleDateString(LOCALE_MAP[locale] || 'en-US', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
    : '—';

const normalizeStatus = (status) => (status || '').toLowerCase();

/** Best-effort approved date from stage history */
function getApprovedAt(proposal) {
  const hist = [...(proposal.stage_history || [])].reverse();
  const hit = hist.find((h) => {
    const name = (h.stage_name || '').toLowerCase();
    return name.includes('approv') || h.stage_step === 2;
  });
  return hit?.entered_at || hit?.exited_at || null;
}

function getFunder(proposal) {
  return (
    proposal.award?.funder_name
    || proposal.opportunity?.sponsor
    || '—'
  );
}

function StatusChip({ status, t }) {
  const key = normalizeStatus(status);
  const style = STATUS_STYLE[key] || { color: '#64748b' };
  const labelKey = `${GT}.status.${key}`;
  const label = t(labelKey);
  return (
    <Chip
      size="small"
      label={label !== labelKey ? label : status || '—'}
      sx={{
        height: 24,
        fontSize: 11,
        fontWeight: 700,
        color: style.color,
        bgcolor: `${style.color}18`,
        border: `1px solid ${style.color}44`,
      }}
    />
  );
}

export default function GrantTrackerPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const { t, locale } = useLanguage();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [proposals, setProposals] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fundingDialog, setFundingDialog] = useState(null);
  const [fundingSaving, setFundingSaving] = useState(false);
  const [fundingForm, setFundingForm] = useState({
    status: 'applying',
    total_amount: '',
    currency: 'KES',
    funder_name: '',
    notes: '',
  });

  useEffect(() => {
    fetchUser().then((u) => {
      if (!u) {
        router.push('/login');
        return;
      }
      setUserId(u.id);
      loadProposals();
    });
  }, []);

  const loadProposals = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await grantsAPI.listProposals();
      const tracked = (res.data || []).filter((p) => TRACKED_STATUSES.has(normalizeStatus(p.status)));
      setProposals(tracked);
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
      } else {
        setError(t(`${GT}.errorLoad`));
      }
    } finally {
      setLoading(false);
    }
  };

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return proposals
      .filter((p) => (statusFilter === 'all' ? true : normalizeStatus(p.status) === statusFilter))
      .filter((p) => {
        if (!q) return true;
        const hay = [
          p.title,
          p.opportunity?.title,
          p.opportunity?.sponsor,
          p.award?.funder_name,
        ].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        const order = { approved: 0, applying: 1, awarded: 2, funding_unsuccessful: 3 };
        const oa = order[normalizeStatus(a.status)] ?? 9;
        const ob = order[normalizeStatus(b.status)] ?? 9;
        if (oa !== ob) return oa - ob;
        const da = getApprovedAt(a) || a.submitted_at || a.created_at || 0;
        const db = getApprovedAt(b) || b.submitted_at || b.created_at || 0;
        return new Date(db) - new Date(da);
      });
  }, [proposals, search, statusFilter]);

  const stats = useMemo(() => ({
    total: proposals.length,
    ready: proposals.filter((p) => normalizeStatus(p.status) === 'approved').length,
    applying: proposals.filter((p) => normalizeStatus(p.status) === 'applying').length,
    awarded: proposals.filter((p) => normalizeStatus(p.status) === 'awarded').length,
    unsuccessful: proposals.filter((p) => normalizeStatus(p.status) === 'funding_unsuccessful').length,
  }), [proposals]);

  const canManageFunding = (p) =>
    userId
    && String(p.lead_pi_id) === String(userId)
    && ['approved', 'applying'].includes(normalizeStatus(p.status));

  const openFundingDialog = (proposal) => {
    const statusKey = normalizeStatus(proposal.status);
    setFundingDialog(proposal);
    setFundingForm({
      status: statusKey === 'approved' ? 'applying' : 'awarded',
      total_amount: proposal.award?.total_amount?.toString() || '',
      currency: proposal.award?.currency || proposal.opportunity?.currency || 'KES',
      funder_name: proposal.award?.funder_name || proposal.opportunity?.sponsor || '',
      notes: '',
    });
    setError('');
    setSuccess('');
  };

  const saveFundingStatus = async () => {
    if (!fundingDialog) return;
    if (fundingForm.status === 'awarded') {
      const amount = parseFloat(fundingForm.total_amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        setError(t(`${GT}.funding.amountRequired`));
        return;
      }
    }
    setFundingSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        status: fundingForm.status,
        notes: fundingForm.notes || undefined,
        currency: fundingForm.currency,
        funder_name: fundingForm.funder_name || undefined,
      };
      if (fundingForm.status === 'awarded') {
        payload.total_amount = parseFloat(fundingForm.total_amount);
      }
      await grantsAPI.updateFundingStatus(fundingDialog.id, payload);
      setSuccess(t(`${GT}.funding.success`));
      setFundingDialog(null);
      await loadProposals();
    } catch (e) {
      setError(e.response?.data?.detail || t(`${GT}.funding.error`));
    } finally {
      setFundingSaving(false);
    }
  };

  const applicationLabel = (status) => {
    const key = normalizeStatus(status);
    if (key === 'approved') return t(`${GT}.application.notStarted`);
    if (key === 'applying') return t(`${GT}.application.submitted`);
    if (key === 'awarded') return t(`${GT}.application.awarded`);
    if (key === 'funding_unsuccessful') return t(`${GT}.application.unsuccessful`);
    return '—';
  };

  const statCards = [
    { key: 'total', value: stats.total, color: ACCENT },
    { key: 'ready', value: stats.ready, color: '#10b981' },
    { key: 'applying', value: stats.applying, color: '#06b6d4' },
    { key: 'awarded', value: stats.awarded, color: '#10b981' },
    { key: 'unsuccessful', value: stats.unsuccessful, color: '#ef4444' },
  ];

  const filterKeys = ['all', 'approved', 'applying', 'awarded', 'funding_unsuccessful'];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 360 }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <TrackerIcon sx={{ color: ACCENT, fontSize: 28 }} />
            <Typography sx={{ fontSize: 26, fontWeight: 700 }}>{t(`${GT}.title`)}</Typography>
          </Box>
          <Typography sx={{ fontSize: 14, color: 'text.secondary', maxWidth: 640 }}>
            {t(`${GT}.subtitle`)}
          </Typography>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          onClick={loadProposals}
          sx={{ textTransform: 'none', borderRadius: 2 }}
        >
          {t(`${GT}.refresh`)}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {proposals.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 1.5, mb: 3 }}>
          {statCards.map((s) => (
            <Paper key={s.key} elevation={0} variant="outlined" sx={{ p: 1.5, borderRadius: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{t(`${GT}.stats.${s.key}`)}</Typography>
            </Paper>
          ))}
        </Box>
      )}

      {proposals.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder={t(`${GT}.searchPlaceholder`)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 18, color: 'text.secondary', mr: 1 }} /> }}
            sx={{ minWidth: 260, flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          {filterKeys.map((key) => (
            <Chip
              key={key}
              label={t(`${GT}.filters.${key}`)}
              onClick={() => setStatusFilter(key)}
              sx={{
                fontWeight: 600,
                bgcolor: statusFilter === key ? `${ACCENT}22` : dark ? 'rgba(255,255,255,0.04)' : '#f1f5f9',
                color: statusFilter === key ? ACCENT : 'text.secondary',
                border: statusFilter === key ? `1px solid ${ACCENT}66` : '1px solid transparent',
              }}
            />
          ))}
        </Box>
      )}

      {proposals.length === 0 ? (
        <Paper elevation={0} variant="outlined" sx={{ p: 6, borderRadius: 3, textAlign: 'center' }}>
          <TrackerIcon sx={{ fontSize: 52, color: `${ACCENT}55`, mb: 2 }} />
          <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 0.5 }}>{t(`${GT}.empty.title`)}</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 3, maxWidth: 480, mx: 'auto' }}>
            {t(`${GT}.empty.subtitle`)}
          </Typography>
          <Button
            variant="outlined"
            onClick={() => router.push('/researcher/grants/proposals')}
            sx={{ textTransform: 'none', borderRadius: 2, borderColor: ACCENT, color: ACCENT }}
          >
            {t(`${GT}.empty.viewProposals`)}
          </Button>
        </Paper>
      ) : rows.length === 0 ? (
        <Paper elevation={0} variant="outlined" sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>{t(`${GT}.noResults`)}</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.03)' : '#f8fafc' }}>
                {['proposal', 'opportunity', 'grantInstitution', 'approvedAt', 'application', 'deadline', 'status', 'actions'].map((col) => (
                  <TableCell key={col} sx={{ fontWeight: 700, fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {t(`${GT}.table.${col}`)}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((p) => {
                const status = normalizeStatus(p.status);
                const manage = canManageFunding(p);
                return (
                  <TableRow key={p.id} hover>
                    <TableCell sx={{ maxWidth: 240 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 650 }}>{p.title}</Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography sx={{ fontSize: 13 }}>
                        {p.opportunity?.title || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{getFunder(p)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12 }}>
                        {fmtDate(getApprovedAt(p), locale)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: status === 'approved' ? '#f59e0b' : status === 'applying' ? '#06b6d4' : 'text.primary',
                      }}>
                        {applicationLabel(status)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12 }}>
                        {fmtDate(p.opportunity?.deadline, locale)}
                      </Typography>
                    </TableCell>
                    <TableCell><StatusChip status={p.status} t={t} /></TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        {manage && status === 'approved' && (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<StartIcon sx={{ fontSize: 14 }} />}
                            onClick={() => openFundingDialog(p)}
                            sx={{
                              textTransform: 'none', fontSize: 11, borderRadius: 2, py: 0.35,
                              bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' }, whiteSpace: 'nowrap',
                            }}
                          >
                            {t(`${GT}.actions.startApplication`)}
                          </Button>
                        )}
                        {manage && status === 'applying' && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<UpdateIcon sx={{ fontSize: 14 }} />}
                            onClick={() => openFundingDialog(p)}
                            sx={{
                              textTransform: 'none', fontSize: 11, borderRadius: 2, py: 0.35,
                              borderColor: ACCENT, color: ACCENT, whiteSpace: 'nowrap',
                            }}
                          >
                            {t(`${GT}.actions.updateOutcome`)}
                          </Button>
                        )}
                        {status === 'awarded' && (
                          <Tooltip title={t(`${GT}.actions.viewAward`)}>
                            <IconButton size="small" onClick={() => router.push('/researcher/grants/awards')}>
                              <AwardedIcon sx={{ fontSize: 18, color: '#10b981' }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title={t(`${GT}.actions.open`)}>
                          <IconButton
                            size="small"
                            onClick={() => router.push(`/researcher/grants/proposals/${p.id}`)}
                          >
                            <OpenIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={!!fundingDialog}
        onClose={() => !fundingSaving && setFundingDialog(null)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {normalizeStatus(fundingDialog?.status) === 'approved'
            ? t(`${GT}.funding.startTitle`)
            : t(`${GT}.funding.outcomeTitle`)}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            {fundingDialog?.title}
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>{t(`${GT}.funding.statusLabel`)}</InputLabel>
            <Select
              label={t(`${GT}.funding.statusLabel`)}
              value={fundingForm.status}
              onChange={(e) => setFundingForm((f) => ({ ...f, status: e.target.value }))}
            >
              {normalizeStatus(fundingDialog?.status) === 'approved' && (
                <MenuItem value="applying">{t(`${GT}.status.applying`)}</MenuItem>
              )}
              {normalizeStatus(fundingDialog?.status) === 'applying' && [
                <MenuItem key="awarded" value="awarded">{t(`${GT}.status.awarded`)}</MenuItem>,
                <MenuItem key="unsuccessful" value="funding_unsuccessful">{t(`${GT}.status.funding_unsuccessful`)}</MenuItem>,
              ]}
            </Select>
          </FormControl>
          <TextField
            size="small"
            label={t(`${GT}.funding.funder`)}
            value={fundingForm.funder_name}
            onChange={(e) => setFundingForm((f) => ({ ...f, funder_name: e.target.value }))}
            fullWidth
          />
          {fundingForm.status === 'awarded' && (
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField
                size="small"
                label={t(`${GT}.funding.amount`)}
                type="number"
                value={fundingForm.total_amount}
                onChange={(e) => setFundingForm((f) => ({ ...f, total_amount: e.target.value }))}
                fullWidth
                required
              />
              <TextField
                size="small"
                label={t(`${GT}.funding.currency`)}
                value={fundingForm.currency}
                onChange={(e) => setFundingForm((f) => ({ ...f, currency: e.target.value }))}
                sx={{ width: 120 }}
              />
            </Box>
          )}
          <TextField
            size="small"
            label={t(`${GT}.funding.notes`)}
            value={fundingForm.notes}
            onChange={(e) => setFundingForm((f) => ({ ...f, notes: e.target.value }))}
            fullWidth
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            disabled={fundingSaving}
            onClick={() => setFundingDialog(null)}
            sx={{ textTransform: 'none' }}
          >
            {t(`${GT}.funding.cancel`)}
          </Button>
          <Button
            variant="contained"
            disabled={fundingSaving}
            onClick={saveFundingStatus}
            sx={{ textTransform: 'none', bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}
          >
            {fundingSaving ? t(`${GT}.funding.saving`) : t(`${GT}.funding.save`)}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
