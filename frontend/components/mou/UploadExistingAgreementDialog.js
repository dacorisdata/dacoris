'use client';
import { useState } from 'react';
import {
  Box, Typography, Button, TextField, Select, MenuItem,
  FormControl, InputLabel, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert, CircularProgress, IconButton,
} from '@mui/material';
import {
  UploadFile as UploadIcon, Close as CloseIcon, Description as FileIcon,
} from '@mui/icons-material';
import api from '../../lib/api';

export const ACCENT = '#16a699';

export const MOU_TYPES = [
  { value: 'GENERAL_COLLABORATION', label: 'General Collaboration Agreement' },
  { value: 'ACADEMIC_EXCHANGE', label: 'Academic Exchange Agreement' },
  { value: 'RESEARCH_PARTNERSHIP', label: 'Research Partnership Agreement' },
  { value: 'DATA_SHARING', label: 'Data-Sharing Agreement' },
  { value: 'JOINT_DEGREE', label: 'Joint Degree / Sandwich Programme' },
  { value: 'CLINICAL', label: 'Clinical / Hospital Collaboration' },
  { value: 'INDUSTRY', label: 'Industry Partnership Agreement' },
  { value: 'CONSORTIUM', label: 'Consortium Agreement' },
  { value: 'CO_FUNDING', label: 'Co-Funding / Joint Grant Agreement' },
];

export const IMPORT_STATUSES = [
  { value: 'ACTIVE', label: 'Active (already signed)' },
  { value: 'PENDING_SIGNING', label: 'Pending Signing' },
  { value: 'PENDING_RENEWAL', label: 'Pending Renewal' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CLOSED', label: 'Closed' },
];

const EMPTY = {
  title: '',
  mou_type: 'GENERAL_COLLABORATION',
  partner_name: '',
  lead_department: '',
  thematic_area: '',
  effective_date: '',
  expiry_date: '',
  signed_date: '',
  status: 'ACTIVE',
  notes: '',
  file: null,
};

const ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png';

export function AgreementFileDrop({ file, onFile, disabled = false }) {
  return (
    <Box component="label" sx={{
      display: 'block', border: `2px dashed ${file ? ACCENT : 'rgba(100,116,139,0.35)'}`,
      borderRadius: 2, p: 2.5, textAlign: 'center', cursor: disabled ? 'default' : 'pointer',
      bgcolor: file ? `${ACCENT}08` : 'transparent',
      '&:hover': disabled ? {} : { borderColor: ACCENT, bgcolor: `${ACCENT}06` },
    }}>
      <input type="file" hidden accept={ACCEPT} disabled={disabled}
        onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]); e.target.value = ''; }} />
      {file ? (
        <>
          <FileIcon sx={{ fontSize: 28, color: ACCENT, mb: 0.5 }} />
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>{file.name}</Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.3 }}>
            {(file.size / 1024 / 1024).toFixed(2)} MB · click to replace
          </Typography>
        </>
      ) : (
        <>
          <UploadIcon sx={{ fontSize: 28, color: 'text.disabled', mb: 0.5 }} />
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>
            Drop or click to upload the signed agreement
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.3 }}>
            PDF, Word, or scanned image · max 50 MB
          </Typography>
        </>
      )}
    </Box>
  );
}

export function buildMouImportFormData(fields) {
  const fd = new FormData();
  fd.append('file', fields.file);
  fd.append('title', (fields.title || '').trim());
  fd.append('mou_type', fields.mou_type || 'GENERAL_COLLABORATION');
  if (fields.status) fd.append('status', fields.status);
  ['thematic_area', 'lead_department', 'partner_name', 'scope_objectives',
    'obligations_institution', 'obligations_partner', 'governing_law',
    'confidentiality_level', 'effective_date', 'expiry_date', 'signed_date',
    'duration_years', 'risk_rating', 'notes'].forEach((key) => {
    if (fields[key] !== undefined && fields[key] !== null && fields[key] !== '') {
      fd.append(key, fields[key]);
    }
  });
  if (fields.auto_renew !== undefined) fd.append('auto_renew', fields.auto_renew ? 'true' : 'false');
  if (fields.renewal_notice_days) fd.append('renewal_notice_days', String(fields.renewal_notice_days));
  if (fields.financial_commitment !== undefined) fd.append('financial_commitment', fields.financial_commitment ? 'true' : 'false');
  if (fields.ip_clauses !== undefined) fd.append('ip_clauses', fields.ip_clauses ? 'true' : 'false');
  if (fields.data_sharing !== undefined) fd.append('data_sharing', fields.data_sharing ? 'true' : 'false');
  return fd;
}

export async function importExistingMou(fields) {
  const fd = buildMouImportFormData(fields);
  return api.post('/mou/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
}

export async function uploadMouDocument(mouId, file, { versionType = 'ORIGINAL', changeSummary } = {}) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('version_type', versionType);
  if (changeSummary) fd.append('change_summary', changeSummary);
  return api.post(`/mou/${mouId}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
}

export async function downloadMouDocument(mouId, versionId, filename) {
  const res = await api.get(`/mou/${mouId}/documents/${versionId}/download`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  const disposition = res.headers['content-disposition'];
  const match = disposition?.match(/filename\*?=(?:UTF-8''|")?([^";]+)"?/i);
  link.download = decodeURIComponent(match?.[1] || filename || 'agreement');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export default function UploadExistingAgreementDialog({ open, onClose, onSuccess }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const reset = () => {
    setForm(EMPTY);
    setError('');
    setSaving(false);
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose?.();
  };

  const handleSubmit = async () => {
    if (!form.file) { setError('Please attach the signed agreement document.'); return; }
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await importExistingMou(form);
      reset();
      onSuccess?.(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to upload the agreement. Please try again.');
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 18 }}>Upload Existing Agreement</Typography>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', fontWeight: 400, mt: 0.3 }}>
            Register a signed partnership or collaboration document already in force.
          </Typography>
        </Box>
        <IconButton size="small" onClick={handleClose} disabled={saving}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}

        <AgreementFileDrop file={form.file} onFile={f => set('file', f)} disabled={saving} />

        <TextField fullWidth size="small" label="Title *" value={form.title}
          onChange={e => set('title', e.target.value)}
          sx={{ mt: 2.5, mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Agreement Type *</InputLabel>
          <Select value={form.mou_type} label="Agreement Type *"
            onChange={e => set('mou_type', e.target.value)} sx={{ borderRadius: 2 }}>
            {MOU_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
          </Select>
        </FormControl>

        <TextField fullWidth size="small" label="Partner organisation"
          value={form.partner_name} onChange={e => set('partner_name', e.target.value)}
          placeholder="e.g. University of Nairobi"
          sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <TextField size="small" label="Lead Department" value={form.lead_department}
            onChange={e => set('lead_department', e.target.value)}
            sx={{ flex: '1 1 180px', '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <TextField size="small" label="Thematic Area" value={form.thematic_area}
            onChange={e => set('thematic_area', e.target.value)}
            sx={{ flex: '1 1 180px', '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <TextField size="small" label="Effective Date" type="date" value={form.effective_date}
            onChange={e => set('effective_date', e.target.value)} InputLabelProps={{ shrink: true }}
            sx={{ flex: '1 1 140px', '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <TextField size="small" label="Expiry Date" type="date" value={form.expiry_date}
            onChange={e => set('expiry_date', e.target.value)} InputLabelProps={{ shrink: true }}
            sx={{ flex: '1 1 140px', '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <TextField size="small" label="Signed Date" type="date" value={form.signed_date}
            onChange={e => set('signed_date', e.target.value)} InputLabelProps={{ shrink: true }}
            sx={{ flex: '1 1 140px', '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        </Box>

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Current Status</InputLabel>
          <Select value={form.status} label="Current Status"
            onChange={e => set('status', e.target.value)} sx={{ borderRadius: 2 }}>
            {IMPORT_STATUSES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
          </Select>
        </FormControl>

        <TextField fullWidth size="small" multiline rows={2} label="Notes (optional)"
          value={form.notes} onChange={e => set('notes', e.target.value)}
          placeholder="Anything reviewers should know about this imported agreement"
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={saving} sx={{ textTransform: 'none', color: 'text.secondary' }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <UploadIcon />}
          sx={{ bgcolor: ACCENT, textTransform: 'none', fontWeight: 600, borderRadius: 2,
            '&:hover': { bgcolor: '#138f82' } }}>
          {saving ? 'Uploading…' : 'Register Agreement'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
