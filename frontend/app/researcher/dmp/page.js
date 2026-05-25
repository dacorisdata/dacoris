'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme,
  Alert, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Dialog, DialogTitle, DialogContent,
  DialogActions, FormControl, InputLabel, Select, MenuItem, TextField,
} from '@mui/material';
import {
  Add as AddIcon, FolderSpecial as DmpIcon,
  UploadFile as UploadIcon, CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#1ca7a1';

const STATUS_META = {
  approved:     { label: 'Approved',      color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  under_review: { label: 'Under Review',  color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)'  },
  submitted:    { label: 'Submitted',     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  draft:        { label: 'Draft',         color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  revision:     { label: 'Revision Req.', color: '#f97316', bg: 'rgba(249,115,22,0.1)'  },
};

const EMPTY_METADATA = {
  plan_title: '',
  types_of_data: '',
  estimated_volume: '',
  data_formats: '',
  repository: '',
  retention_period: '',
  primary_storage: '',
  text_extracted: false,
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const formatApiError = (error) => {
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map(d => d.msg || d.message || String(d)).join(', ');
  if (typeof detail === 'string') return detail;
  return error?.message || 'Request failed';
};

function DmpUploadZone({ file, onFile, parsing }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const onDrop = useCallback((accepted) => {
    if (accepted[0]) onFile(accepted[0]);
  }, [onFile]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  });

  return (
    <Box {...getRootProps()} sx={{
      border: `2px dashed ${isDragActive ? ACCENT : theme.palette.divider}`,
      borderRadius: 2.5,
      p: { xs: 3, md: 4 },
      textAlign: 'center',
      cursor: parsing ? 'wait' : 'pointer',
      bgcolor: isDragActive ? `${ACCENT}08` : dark ? 'rgba(255,255,255,0.02)' : '#fafafa',
      transition: 'all 0.15s',
      opacity: parsing ? 0.7 : 1,
      '&:hover': { borderColor: ACCENT, bgcolor: `${ACCENT}06` },
    }}>
      <input {...getInputProps()} disabled={parsing} />
      {parsing ? (
        <>
          <CircularProgress size={28} sx={{ color: ACCENT, mb: 1.5 }} />
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Reading document details…</Typography>
        </>
      ) : (
        <>
          <CloudUploadIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5 }} />
          {file ? (
            <Typography sx={{ fontSize: 13, color: ACCENT, fontWeight: 600 }}>{file.name}</Typography>
          ) : (
            <>
              <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 0.5 }}>
                Drop your DMP file here, or click to browse
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                PDF, DOC, or DOCX
              </Typography>
            </>
          )}
        </>
      )}
    </Box>
  );
}

export default function DmpPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark  = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [dmps, setDmps] = useState([]);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadDialog, setUploadDialog] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [metadata, setMetadata] = useState(EMPTY_METADATA);

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  const loadData = async () => {
    try {
      setLoading(true);
      const [dmpRes, projectRes] = await Promise.all([
        axios.get(`${API_URL}/research/projects/my/dmp-documents`, { headers: authHeaders() }),
        axios.get(`${API_URL}/research/projects`, { headers: authHeaders() }),
      ]);
      setDmps(dmpRes.data || []);
      setProjects(projectRes.data || []);
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
      } else {
        setError('Failed to load data management plans');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser().then(u => {
      if (!u) { router.push('/login'); return; }
      loadData();
    });
  }, []);

  const parseFileMetadata = async (file, projectId) => {
    if (!file) return;
    try {
      setParsing(true);
      setError('');
      const fd = new FormData();
      fd.append('file', file);
      if (projectId) fd.append('project_id', projectId);
      const res = await axios.post(`${API_URL}/research/projects/dmp/parse-preview`, fd, {
        headers: authHeaders(),
      });
      setMetadata({
        plan_title: res.data.plan_title || '',
        types_of_data: res.data.types_of_data || '',
        estimated_volume: res.data.estimated_volume || '',
        data_formats: res.data.data_formats || '',
        repository: res.data.repository || '',
        retention_period: res.data.retention_period || '',
        primary_storage: res.data.primary_storage || '',
        text_extracted: !!res.data.text_extracted,
      });
    } catch (e) {
      setMetadata(EMPTY_METADATA);
      setError(formatApiError(e) || 'Could not read details from this document');
    } finally {
      setParsing(false);
    }
  };

  const handleFileSelected = async (file) => {
    setPendingFile(file);
    await parseFileMetadata(file, selectedProjectId);
  };

  const openUploadDialog = () => {
    const defaultProjectId = projects[0]?.id || '';
    setSelectedProjectId(defaultProjectId);
    setPendingFile(null);
    setMetadata(EMPTY_METADATA);
    setUploadDialog(true);
  };

  const closeUploadDialog = () => {
    setUploadDialog(false);
    setPendingFile(null);
    setMetadata(EMPTY_METADATA);
    setSelectedProjectId('');
  };

  const handleProjectChange = async (projectId) => {
    setSelectedProjectId(projectId);
    if (pendingFile) {
      await parseFileMetadata(pendingFile, projectId);
    }
  };

  const handleUpload = async () => {
    if (!selectedProjectId || !pendingFile) return;

    try {
      setUploading(true);
      setError('');
      const fd = new FormData();
      fd.append('file', pendingFile);
      if (metadata.plan_title) fd.append('plan_title', metadata.plan_title);
      if (metadata.types_of_data) fd.append('types_of_data', metadata.types_of_data);
      if (metadata.estimated_volume) fd.append('estimated_volume', metadata.estimated_volume);
      if (metadata.data_formats) fd.append('data_formats', metadata.data_formats);
      if (metadata.repository) fd.append('repository', metadata.repository);
      if (metadata.retention_period) fd.append('retention_period', metadata.retention_period);
      if (metadata.primary_storage) fd.append('primary_storage', metadata.primary_storage);

      await axios.post(
        `${API_URL}/research/projects/${selectedProjectId}/dmp-upload`,
        fd,
        { headers: authHeaders() }
      );
      setSuccess('Data Management Plan uploaded and linked to your project');
      closeUploadDialog();
      await loadData();
    } catch (e) {
      setError(formatApiError(e) || 'Failed to upload DMP');
    } finally {
      setUploading(false);
    }
  };

  const stats = {
    total:    dmps.length,
    approved: dmps.filter(d => d.status === 'approved').length,
    reviewing: dmps.filter(d => ['under_review', 'submitted'].includes(d.status)).length,
    drafts:   dmps.filter(d => d.status === 'draft').length,
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress sx={{ color: ACCENT }} />
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 42, height: 42, borderRadius: 2.5, bgcolor: `${ACCENT}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DmpIcon sx={{ fontSize: 22, color: ACCENT }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>Data Management Plans</Typography>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Upload and track formal DMPs for your research projects</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<UploadIcon sx={{ fontSize: 15 }} />}
            onClick={openUploadDialog}
            disabled={projects.length === 0}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, borderColor: ACCENT, color: ACCENT }}>
            Upload DMP
          </Button>
          <Button variant="contained" startIcon={<AddIcon sx={{ fontSize: 15 }} />}
            onClick={() => router.push('/researcher/dmp/new')}
            sx={{ bgcolor: ACCENT, textTransform: 'none', fontWeight: 600, borderRadius: 2, '&:hover': { bgcolor: '#0e8a85' } }}>
            New DMP
          </Button>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3, fontSize: 12, borderRadius: 2 }}>
        Upload a DMP document and we will read basic details such as title, repository, and data volume when possible. You can review and edit them before saving.
      </Alert>

      {projects.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2, fontSize: 12 }}>
          Create a research project first before uploading a DMP document.
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        {[
          { label: 'Total',      value: stats.total,     color: '#64748b' },
          { label: 'Approved',   value: stats.approved,  color: '#10b981' },
          { label: 'In Review',  value: stats.reviewing, color: ACCENT   },
          { label: 'Drafts',     value: stats.drafts,    color: '#f59e0b' },
        ].map(s => (
          <Paper key={s.label} elevation={0} variant="outlined" sx={{ flex: '1 1 110px', p: 1.5, borderRadius: 2, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{s.label}</Typography>
          </Paper>
        ))}
      </Box>

      <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider',
          background: dark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>My Data Management Plans</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{dmps.length} record{dmps.length !== 1 ? 's' : ''}</Typography>
        </Box>

        {dmps.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <DmpIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1.5 }} />
            <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 0.5 }}>No DMPs yet</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 3 }}>
              Upload a DMP document or create a structured plan for a funded research project.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button variant="outlined" startIcon={<UploadIcon />}
                onClick={openUploadDialog}
                disabled={projects.length === 0}
                sx={{ textTransform: 'none', borderRadius: 2, borderColor: ACCENT, color: ACCENT }}>
                Upload DMP
              </Button>
              <Button variant="contained" startIcon={<AddIcon />}
                onClick={() => router.push('/researcher/dmp/new')}
                sx={{ bgcolor: ACCENT, textTransform: 'none', borderRadius: 2, '&:hover': { bgcolor: '#0e8a85' } }}>
                New DMP
              </Button>
            </Box>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.02)' : '#f8fafc' }}>
                  {['Reference', 'Title', 'Project', 'PI / Steward', 'Funder', 'Repository', 'Volume', 'Status', 'Uploaded', 'Actions'].map(h => (
                    <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, py: 1.5, whiteSpace: 'nowrap' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {dmps.map(dmp => {
                  const sm = STATUS_META[dmp.status] || STATUS_META.draft;
                  return (
                    <TableRow
                      key={dmp.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/researcher/projects/${dmp.project_id}/setup`)}
                    >
                      <TableCell sx={{ fontSize: 12, fontWeight: 700, color: ACCENT, whiteSpace: 'nowrap' }}>{dmp.ref}</TableCell>
                      <TableCell sx={{ maxWidth: 220 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.35 }} noWrap>
                          {dmp.title || dmp.original_filename}
                        </Typography>
                        {dmp.original_filename && dmp.title && dmp.title !== dmp.original_filename && (
                          <Typography sx={{ fontSize: 10, color: 'text.disabled' }} noWrap>{dmp.original_filename}</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 160 }}>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }} noWrap>{dmp.project_title || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{dmp.pi || '—'}</Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{dmp.funder || '—'}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{dmp.repository || '—'}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{dmp.data_volume || '—'}</TableCell>
                      <TableCell>
                        <Chip label={sm.label} size="small"
                          sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 700, fontSize: 10, height: 20 }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>{fmtDate(dmp.uploaded_at)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button size="small" variant="outlined"
                          onClick={() => router.push(`/researcher/projects/${dmp.project_id}/setup`)}
                          sx={{ textTransform: 'none', fontSize: 11, borderRadius: 1.5, py: 0.3, minWidth: 0, px: 1.2 }}>
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={uploadDialog} onClose={closeUploadDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Upload Data Management Plan</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
            Select a project, upload your DMP file, then review the details we detected from the document.
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 2.5 }}>
            <InputLabel>Research Project *</InputLabel>
            <Select
              value={selectedProjectId}
              label="Research Project *"
              onChange={(e) => handleProjectChange(e.target.value)}
            >
              {projects.map(p => (
                <MenuItem key={p.id} value={p.id}>{p.title}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <DmpUploadZone file={pendingFile} onFile={handleFileSelected} parsing={parsing} />

          {pendingFile && !parsing && (
            <Box sx={{ mt: 2.5 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1.5 }}>
                Detected details {metadata.text_extracted ? '(editable)' : '(from filename — edit as needed)'}
              </Typography>
              <TextField
                fullWidth size="small" label="Plan title" value={metadata.plan_title}
                onChange={(e) => setMetadata(m => ({ ...m, plan_title: e.target.value }))}
                sx={{ mb: 1.5 }}
              />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                <TextField size="small" label="Repository" value={metadata.repository}
                  onChange={(e) => setMetadata(m => ({ ...m, repository: e.target.value }))} />
                <TextField size="small" label="Estimated volume" value={metadata.estimated_volume}
                  onChange={(e) => setMetadata(m => ({ ...m, estimated_volume: e.target.value }))} />
                <TextField size="small" label="Retention period" value={metadata.retention_period}
                  onChange={(e) => setMetadata(m => ({ ...m, retention_period: e.target.value }))} />
                <TextField size="small" label="Data formats" value={metadata.data_formats}
                  onChange={(e) => setMetadata(m => ({ ...m, data_formats: e.target.value }))} />
              </Box>
              <TextField
                fullWidth size="small" label="Types of data" value={metadata.types_of_data}
                onChange={(e) => setMetadata(m => ({ ...m, types_of_data: e.target.value }))}
                sx={{ mt: 1.5 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={closeUploadDialog} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!selectedProjectId || !pendingFile || uploading || parsing}
            startIcon={uploading ? <CircularProgress size={14} color="inherit" /> : <UploadIcon />}
            sx={{ textTransform: 'none', bgcolor: ACCENT, '&:hover': { bgcolor: '#0e8a85' } }}
          >
            {uploading ? 'Uploading…' : 'Save DMP'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
