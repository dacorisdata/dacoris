'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Select, FormControl, InputLabel,
  useTheme, Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon, UploadFile as ExcelIcon, CloudDownload as APIIcon, GetApp as DownloadIcon,
  CheckCircle as PublishedIcon, Unpublished as UnpublishedIcon, ExpandMore as ExpandIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import { useLanguage } from '../../../../contexts/LanguageContext';
import api from '../../../../lib/api';
import { canRecommendGrantOpportunities } from '../../../../lib/adminStaffRoles';
import OpportunityDiscoverBoard from '../../../../components/grants/OpportunityDiscoverBoard';

const ACCENT = '#16a699';

export default function GrantOpportunitiesPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const { t, locale, dir } = useLanguage();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [canRecommend, setCanRecommend] = useState(false);
  const [selected, setSelected] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showExcel, setShowExcel] = useState(false);
  const [showAPI, setShowAPI] = useState(false);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [apiUrl, setApiUrl] = useState('http://localhost:8000/api/grants/opportunities/mock/external-opportunities');
  const [form, setForm] = useState({
    title: '', sponsor: '', description: '', categories: [], funding_type: '',
    currency: 'KES', amount_min: '', amount_max: '', deadline: '',
    eligibility: '', criteria: '', contact_email: '',
  });

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin) { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    setCanRecommend(canRecommendGrantOpportunities(u));
    await loadOpportunities();
    setLoading(false);
  };

  const loadOpportunities = async () => {
    try {
      const res = await api.get('/grants/opportunities');
      setOpportunities((res.data || []).map(o => ({ ...o, is_curated: o.is_curated || false })));
    } catch (e) {
      setError(e.response?.data?.detail || t('researcher.grantsDiscover.errorLoad'));
    }
  };

  const handleRecommendSave = async (oppId, { researcherIds, recommendAll, note }) => {
    const res = await api.post(`/grants/opportunities/${oppId}/recommendations/bulk`, {
      researcher_ids: researcherIds,
      recommend_all: recommendAll,
      note,
    });
    const created = res.data?.created ?? 0;
    const skipped = res.data?.skipped ?? 0;
    let msg = t('researcher.grantsDiscover.recommendDialog.success');
    if (recommendAll) {
      msg = t('researcher.grantsDiscover.recommendDialog.successAll', { count: created });
    } else if (created > 1) {
      msg = t('researcher.grantsDiscover.recommendDialog.successMultiple', { count: created });
    }
    if (skipped > 0 && created === 0) {
      msg = t('researcher.grantsDiscover.recommendDialog.alreadyAllRecommended');
    }
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
    await loadOpportunities();
  };

  const handleRecommendRemove = async (oppId, researcherId) => {
    if (!confirm(t('researcher.grantsDiscover.recommendDialog.removeConfirm'))) return;
    await api.delete(`/grants/opportunities/${oppId}/recommendations/${researcherId}`);
    setSuccess(t('researcher.grantsDiscover.recommendDialog.removed'));
    setTimeout(() => setSuccess(''), 3000);
    await loadOpportunities();
  };

  const handleSelect = (id, checked) => {
    setSelected(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
  };

  const handleCurateSelected = async (curate) => {
    if (selected.length === 0) return;
    try {
      await api.post('/grants/opportunities/bulk-curate', selected, { params: { curate } });
      setSuccess(curate
        ? t('adminStaff.grantsOpportunities.publishSuccess', { count: selected.length })
        : t('adminStaff.grantsOpportunities.unpublishSuccess', { count: selected.length }));
      setSelected([]);
      await loadOpportunities();
    } catch {
      setError(t('adminStaff.grantsOpportunities.curationError'));
    }
  };

  const handleCreate = async () => {
    if (!form.title) { setError('Title is required'); return; }
    setCreating(true);
    try {
      await api.post('/grants/opportunities', {
        ...form,
        category: form.categories.join(', '),
        amount_min: form.amount_min ? parseFloat(form.amount_min) : null,
        amount_max: form.amount_max ? parseFloat(form.amount_max) : null,
        deadline: form.deadline || null,
      });
      setShowCreate(false);
      setSuccess(t('adminStaff.grantsOpportunities.createSuccess'));
      await loadOpportunities();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create opportunity');
    } finally {
      setCreating(false);
    }
  };

  const handleExcelImport = async () => {
    if (!excelFile) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', excelFile);
      const res = await api.post('/grants/opportunities/import/excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShowExcel(false);
      setExcelFile(null);
      setSuccess(t('adminStaff.grantsOpportunities.importSuccess', { count: res.data.created_count || res.data.imported_count || 0 }));
      await loadOpportunities();
    } catch (e) {
      setError(e.response?.data?.detail || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>;
  }

  const headerExtra = (
    <>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 24, fontWeight: 800, color: 'text.primary' }}>
            {t('adminStaff.grantsOpportunities.title')}
          </Typography>
          <Typography sx={{ fontSize: 14, color: 'text.secondary', mt: 0.4 }}>
            {t('adminStaff.grantsOpportunities.subtitle')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setShowCreate(true)}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>{t('adminStaff.grantsOpportunities.addManual')}</Button>
          <Button variant="outlined" startIcon={<ExcelIcon />} onClick={() => setShowExcel(true)}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>{t('adminStaff.grantsOpportunities.importExcel')}</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <Chip label={t('researcher.grantsDiscover.summary.total', { count: opportunities.length })} sx={{ bgcolor: `${ACCENT}18`, color: ACCENT, fontWeight: 600 }} />
        <Chip label={t('researcher.grantsDiscover.summary.published', { count: opportunities.filter(o => o.is_curated).length })} sx={{ bgcolor: 'rgba(16,185,129,0.12)', color: '#10b981', fontWeight: 600 }} />
        <Chip label={t('researcher.grantsDiscover.summary.open', { count: opportunities.filter(o => o.status === 'open').length })} sx={{ bgcolor: 'rgba(59,130,246,0.12)', color: '#3b82f6', fontWeight: 600 }} />
      </Box>
    </>
  );

  const bulkActions = selected.length > 0 ? (
    <Paper elevation={0} sx={{ mb: 3, p: 2, borderRadius: 2, border: `1px solid ${ACCENT}40`, bgcolor: `${ACCENT}08`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
      <Typography sx={{ fontWeight: 600 }}>{t('adminStaff.grantsOpportunities.selected', { count: selected.length })}</Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="contained" size="small" startIcon={<PublishedIcon />} onClick={() => handleCurateSelected(true)}
          sx={{ bgcolor: ACCENT, textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>{t('adminStaff.grantsOpportunities.publish')}</Button>
        <Button variant="outlined" size="small" startIcon={<UnpublishedIcon />} onClick={() => handleCurateSelected(false)}
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>{t('adminStaff.grantsOpportunities.unpublish')}</Button>
      </Box>
    </Paper>
  ) : null;

  return (
    <Box sx={{ px: { xs: 1.5, md: 2 }, py: { xs: 1.5, md: 2 }, width: '100%' }}>
      <OpportunityDiscoverBoard
        mode="admin"
        opportunities={opportunities}
        canRecommend={canRecommend}
        api={api}
        onRecommendSave={handleRecommendSave}
        onRecommendRemove={handleRecommendRemove}
        onView={(opp) => router.push(`/admin-staff/grants/opportunities/${opp.id}`)}
        selectedIds={selected}
        onSelect={handleSelect}
        bulkActions={bulkActions}
        t={t}
        locale={locale}
        dir={dir}
        theme={theme}
        dark={dark}
        headerExtra={headerExtra}
      />

      <Dialog open={showCreate} onClose={() => setShowCreate(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('adminStaff.grantsOpportunities.createTitle')}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Title *" fullWidth size="small" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <TextField label="Sponsor" fullWidth size="small" value={form.sponsor} onChange={e => setForm(f => ({ ...f, sponsor: e.target.value }))} />
            <TextField label="Description" fullWidth multiline rows={3} size="small" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <Autocomplete multiple freeSolo options={['Health', 'Agriculture', 'Environment', 'Technology', 'STEM']}
              value={form.categories} onChange={(_, v) => setForm(f => ({ ...f, categories: v }))}
              renderInput={(params) => <TextField {...params} label="Categories" size="small" />} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowCreate(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating} sx={{ bgcolor: ACCENT, textTransform: 'none' }}>Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showExcel} onClose={() => setShowExcel(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('adminStaff.grantsOpportunities.importExcel')}</DialogTitle>
        <DialogContent dividers>
          <input type="file" accept=".xlsx,.xls" onChange={(e) => setExcelFile(e.target.files?.[0])} style={{ marginTop: 16 }} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowExcel(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleExcelImport} disabled={importing || !excelFile} sx={{ bgcolor: ACCENT, textTransform: 'none' }}>Import</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
