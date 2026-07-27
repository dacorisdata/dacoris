'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  TablePagination,
  LinearProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  RecordVoiceOver as QualitativeIcon,
  Groups as FgdIcon,
  Person as KiiIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

const ACCENT = '#8e44ad';

const TYPE_CONFIG = {
  kii: { icon: KiiIcon, color: '#8e44ad', bgcolor: '#8e44ad15' },
  fgd: { icon: FgdIcon, color: '#2563eb', bgcolor: '#2563eb15' },
  other: { icon: QualitativeIcon, color: '#6b7280', bgcolor: '#6b728015' },
};

export default function QualitativeDataPage() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [records, setRecords] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');

  const [projectFilter, setProjectFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadProjects = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/research/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(Array.isArray(data) ? data : []);
      }
    } catch (_) {}
  }, [token]);

  const loadRecords = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setApiError('');
    try {
      const qs = new URLSearchParams({ page_size: '200' });
      if (projectFilter) qs.set('project_id', projectFilter);
      if (typeFilter) qs.set('data_type', typeFilter);
      const res = await fetch(`/api/research/qualitative-data?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(t('researcher.qualitativeData.errors.loadFailed'));
      const data = await res.json();
      setRecords(data.records || []);
    } catch (e) {
      setApiError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, projectFilter, typeFilter, t]);

  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => { loadRecords(); }, [loadRecords]);
  useEffect(() => { setPage(0); }, [projectFilter, typeFilter]);

  const handleDownload = (record) => {
    fetch(`/api/research/qualitative-data/${record.id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Download failed');
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = record.original_filename || 'file';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => {});
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/research/qualitative-data/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(t('researcher.qualitativeData.errors.deleteFailed'));
      setRecords((r) => r.filter((rec) => rec.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      setApiError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const typeLabel = (type) =>
    type === 'kii'
      ? t('researcher.qualitativeData.upload.typeKii')
      : type === 'fgd'
        ? t('researcher.qualitativeData.upload.typeFgd')
        : t('researcher.qualitativeData.upload.typeOther');

  const cols = t('researcher.qualitativeData.page.columns');

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            {t('researcher.qualitativeData.page.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('researcher.qualitativeData.page.subtitle')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button startIcon={<RefreshIcon />} onClick={loadRecords} size="small">
            {t('researcher.qualitativeData.page.refresh')}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push('/researcher/data/import?source_type=qualitative')}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#732d91' }, textTransform: 'none' }}
          >
            {t('researcher.qualitativeData.page.addButton')}
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>{t('researcher.qualitativeData.details.projectLabel')}</InputLabel>
          <Select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            label={t('researcher.qualitativeData.details.projectLabel')}
          >
            <MenuItem value=""><em>{t('researcher.qualitativeData.details.projectNone')}</em></MenuItem>
            {projects.map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.title}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>{t('researcher.qualitativeData.upload.typeLabel')}</InputLabel>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            label={t('researcher.qualitativeData.upload.typeLabel')}
          >
            <MenuItem value=""><em>{t('researcher.qualitativeData.details.projectNone')}</em></MenuItem>
            <MenuItem value="kii">{t('researcher.qualitativeData.upload.typeKii')}</MenuItem>
            <MenuItem value="fgd">{t('researcher.qualitativeData.upload.typeFgd')}</MenuItem>
            <MenuItem value="other">{t('researcher.qualitativeData.upload.typeOther')}</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {loading && <LinearProgress sx={{ borderRadius: 1, mb: 2 }} />}
      {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}

      {!loading && records.length === 0 ? (
        <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 2 }}>
          <QualitativeIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5 }} />
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {t('researcher.qualitativeData.page.empty')}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push('/researcher/data/import?source_type=qualitative')}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#732d91' } }}
          >
            {t('researcher.qualitativeData.page.goToImport')}
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>{cols.title}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{cols.type}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{cols.project}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{cols.date}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{cols.location}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{cols.language}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{cols.file}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{cols.uploaded}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{cols.actions}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((rec) => {
                  const tc = TYPE_CONFIG[rec.data_type] || TYPE_CONFIG.other;
                  const TIcon = tc.icon;
                  return (
                    <TableRow key={rec.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{rec.title}</TableCell>
                      <TableCell>
                        <Chip
                          icon={<TIcon sx={{ fontSize: 14 }} />}
                          label={typeLabel(rec.data_type)}
                          size="small"
                          sx={{ bgcolor: tc.bgcolor, color: tc.color, fontWeight: 600, fontSize: 11 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{rec.project_title || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {rec.date_conducted ? new Date(rec.date_conducted).toLocaleDateString() : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{rec.location || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{rec.language || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={rec.original_filename || ''}>
                          <Typography
                            variant="caption"
                            sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
                          >
                            {rec.original_filename || '—'}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{new Date(rec.created_at).toLocaleString()}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title={t('researcher.qualitativeData.page.downloadTooltip')}>
                            <IconButton size="small" onClick={() => handleDownload(rec)}>
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('researcher.qualitativeData.page.deleteTooltip')}>
                            <IconButton size="small" color="error" onClick={() => setDeleteTarget(rec)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={records.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </TableContainer>
      )}

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>{t('researcher.qualitativeData.page.deleteConfirmTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('researcher.qualitativeData.page.deleteConfirmBody')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{t('researcher.qualitativeData.page.cancel')}</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
            {t('researcher.qualitativeData.page.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
