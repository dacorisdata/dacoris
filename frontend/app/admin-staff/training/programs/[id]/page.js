'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip, useTheme,
  TextField, IconButton, Accordion, AccordionSummary, AccordionDetails,
  Dialog, DialogTitle, DialogContent, DialogActions, LinearProgress,
} from '@mui/material';
import {
  ArrowBack as BackIcon, Add as AddIcon, Delete as DeleteIcon,
  Edit as EditIcon, ExpandMore as ExpandIcon, UploadFile as UploadIcon,
  Description as FileIcon, FolderOpen as ModuleIcon, Visibility as PreviewIcon,
  SwapHoriz as ReplaceIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../../contexts/AuthContext';
import { trainingAPI } from '../../../../../lib/api';

const ACCENT = '#16a699';

const fmtSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function ProgramContentPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.id;
  const { fetchUser } = useAuth();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [moduleDialog, setModuleDialog] = useState({ open: false, editing: null, title: '', description: '', sort_order: 0 });
  const [uploadTarget, setUploadTarget] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const fileInputRef = useRef(null);
  const batchInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const [replacingId, setReplacingId] = useState(null);

  useEffect(() => { init(); }, [programId]);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    await loadContent();
    setLoading(false);
  };

  const loadContent = async () => {
    try {
      const res = await trainingAPI.getProgramContent(programId);
      setContent(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load programme content');
    }
  };

  const openModuleDialog = (mod = null) => {
    setModuleDialog({
      open: true,
      editing: mod,
      title: mod?.title || '',
      description: mod?.description || '',
      sort_order: mod?.sort_order ?? (content?.modules?.length || 0),
    });
  };

  const saveModule = async () => {
    if (!moduleDialog.title.trim()) { setError('Module title is required'); return; }
    setError('');
    try {
      if (moduleDialog.editing) {
        await trainingAPI.updateModule(moduleDialog.editing.id, {
          title: moduleDialog.title,
          description: moduleDialog.description || null,
          sort_order: moduleDialog.sort_order,
        });
        setSuccess('Module updated');
      } else {
        await trainingAPI.createModule(programId, {
          title: moduleDialog.title,
          description: moduleDialog.description || null,
          sort_order: moduleDialog.sort_order,
        });
        setSuccess('Module added');
      }
      setModuleDialog(m => ({ ...m, open: false }));
      await loadContent();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to save module');
    }
  };

  const deleteModule = async (mod) => {
    if (!confirm(`Delete module "${mod.title}" and all its materials?`)) return;
    try {
      await trainingAPI.deleteModule(mod.id);
      setSuccess('Module deleted');
      await loadContent();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to delete module');
    }
  };

  const triggerUpload = (moduleId = null, batch = false) => {
    setUploadTarget(moduleId);
    if (batch) batchInputRef.current?.click();
    else fileInputRef.current?.click();
  };

  const handleFileSelect = async (e, batch = false) => {
    const fileList = Array.from(e.target.files || []);
    e.target.value = '';
    if (!fileList.length) return;

    setUploading(true);
    setUploadProgress({ current: 0, total: fileList.length });
    setError('');
    try {
      if (batch || fileList.length > 1) {
        const res = await trainingAPI.uploadMaterialsBatch(programId, fileList, {
          moduleId: uploadTarget || undefined,
        });
        setSuccess(`${res.data?.uploaded_count || fileList.length} file(s) uploaded`);
      } else {
        await trainingAPI.uploadMaterial(programId, fileList[0], {
          moduleId: uploadTarget || undefined,
        });
        setSuccess('Material uploaded');
      }
      await loadContent();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(null);
      setUploadTarget(null);
    }
  };

  const deleteMaterial = async (mat) => {
    if (!confirm(`Delete "${mat.title}"?`)) return;
    try {
      await trainingAPI.deleteMaterial(mat.id);
      setSuccess('Material deleted');
      await loadContent();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to delete material');
    }
  };

  const openPreview = (mat) => {
    router.push(`/admin-staff/training/materials/${mat.id}?program=${programId}`);
  };

  const triggerReplace = (mat) => {
    setReplacingId(mat.id);
    replaceInputRef.current?.click();
  };

  const handleReplaceSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !replacingId) return;
    setUploading(true);
    setError('');
    try {
      await trainingAPI.replaceMaterial(replacingId, file);
      setSuccess('Material replaced');
      await loadContent();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Replace failed');
    } finally {
      setUploading(false);
      setReplacingId(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  const modules = content?.modules || [];
  const programMaterials = content?.program_materials || [];

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.zip,image/*"
        onChange={(e) => handleFileSelect(e, false)}
      />
      <input
        ref={batchInputRef}
        type="file"
        hidden
        multiple
        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.zip,image/*"
        onChange={(e) => handleFileSelect(e, true)}
      />
      <input
        ref={replaceInputRef}
        type="file"
        hidden
        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.zip,image/*"
        onChange={handleReplaceSelect}
      />

      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Button size="small" startIcon={<BackIcon />} onClick={() => router.push('/admin-staff/training/programs')}
            sx={{ mb: 1, color: 'text.secondary' }}>
            Back to Programmes
          </Button>
          <Typography sx={{ fontSize: 24, fontWeight: 700 }}>
            {content?.program_title || 'Programme Content'}
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            Add sub-modules and upload learning materials. Click a file to preview in-browser.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => openModuleDialog()}
            sx={{ borderColor: ACCENT, color: ACCENT }}>
            Add Module
          </Button>
          <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => triggerUpload(null, false)}
            disabled={uploading}
            sx={{ borderColor: ACCENT, color: ACCENT }}>
            Upload File
          </Button>
          <Button variant="contained" startIcon={<UploadIcon />} onClick={() => triggerUpload(null, true)}
            disabled={uploading}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#138f82' } }}>
            {uploading ? 'Uploading…' : 'Batch Upload'}
          </Button>
        </Box>
      </Box>

      {uploading && uploadProgress && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress sx={{ '& .MuiLinearProgress-bar': { bgcolor: ACCENT } }} />
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {programMaterials.length > 0 && (
        <Box sx={{ mb: 3, bgcolor: 'background.paper', borderRadius: 3, p: 2.5, border: `1px solid ${theme.palette.divider}` }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 1.5 }}>Programme-level Materials</Typography>
          {programMaterials.map(mat => (
            <MaterialRow key={mat.id} mat={mat} onDelete={deleteMaterial} onPreview={openPreview} onReplace={triggerReplace} replacing={replacingId === mat.id} />
          ))}
        </Box>
      )}

      {modules.length === 0 ? (
        <Box sx={{
          textAlign: 'center', py: 6, bgcolor: 'background.paper', borderRadius: 3,
          border: `1px dashed ${theme.palette.divider}`,
        }}>
          <ModuleIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography sx={{ color: 'text.secondary', mb: 2 }}>
            No sub-modules yet. Add modules to organise topics, then upload materials per module.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openModuleDialog()}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#138f82' } }}>
            Add First Module
          </Button>
        </Box>
      ) : (
        modules.map((mod, idx) => (
          <Accordion key={mod.id} defaultExpanded={idx === 0} sx={{
            mb: 1.5, borderRadius: '12px !important', border: `1px solid ${theme.palette.divider}`,
            '&:before': { display: 'none' },
          }}>
            <AccordionSummary expandIcon={<ExpandIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, pr: 1 }}>
                <Chip label={mod.sort_order + 1} size="small" sx={{ bgcolor: `${ACCENT}18`, color: ACCENT, fontWeight: 700, minWidth: 28 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{mod.title}</Typography>
                  {mod.description && (
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{mod.description}</Typography>
                  )}
                </Box>
                <Chip label={`${mod.materials?.length || 0} files`} size="small" variant="outlined" />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Button size="small" startIcon={<UploadIcon />} onClick={() => triggerUpload(mod.id, false)}
                  disabled={uploading} sx={{ color: ACCENT }}>
                  Upload File
                </Button>
                <Button size="small" startIcon={<UploadIcon />} onClick={() => triggerUpload(mod.id, true)}
                  disabled={uploading} variant="outlined" sx={{ borderColor: ACCENT, color: ACCENT }}>
                  Batch Upload
                </Button>
                <IconButton size="small" onClick={() => openModuleDialog(mod)}><EditIcon fontSize="small" /></IconButton>
                <IconButton size="small" onClick={() => deleteModule(mod)}><DeleteIcon fontSize="small" sx={{ color: 'error.main' }} /></IconButton>
              </Box>
              {(mod.materials || []).length === 0 ? (
                <Typography sx={{ fontSize: 12, color: 'text.secondary', fontStyle: 'italic' }}>No materials in this module yet.</Typography>
              ) : (
                mod.materials.map(mat => (
                  <MaterialRow key={mat.id} mat={mat} onDelete={deleteMaterial} onPreview={openPreview} onReplace={triggerReplace} replacing={replacingId === mat.id} />
                ))
              )}
            </AccordionDetails>
          </Accordion>
        ))
      )}

      <Dialog open={moduleDialog.open} onClose={() => setModuleDialog(m => ({ ...m, open: false }))} maxWidth="xs" fullWidth>
        <DialogTitle>{moduleDialog.editing ? 'Edit Module' : 'Add Sub-module'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="Title *" value={moduleDialog.title}
            onChange={e => setModuleDialog(m => ({ ...m, title: e.target.value }))} fullWidth />
          <TextField label="Description" value={moduleDialog.description} multiline rows={2} fullWidth
            onChange={e => setModuleDialog(m => ({ ...m, description: e.target.value }))} />
          <TextField label="Sort order" type="number" value={moduleDialog.sort_order} fullWidth
            onChange={e => setModuleDialog(m => ({ ...m, sort_order: parseInt(e.target.value, 10) || 0 }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModuleDialog(m => ({ ...m, open: false }))}>Cancel</Button>
          <Button variant="contained" onClick={saveModule}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#138f82' } }}>
            {moduleDialog.editing ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function MaterialRow({ mat, onDelete, onPreview, onReplace, replacing }) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.5, py: 1, px: 1.5, mb: 0.5,
      borderRadius: 2, bgcolor: 'action.hover', cursor: 'pointer',
      '&:hover': { bgcolor: 'action.selected' },
    }}
      onClick={() => onPreview(mat)}
    >
      <FileIcon sx={{ fontSize: 20, color: '#64748b' }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600 }} noWrap>{mat.title}</Typography>
        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
          {mat.original_filename} · {fmtSize(mat.file_size_bytes)}
          {mat.uploaded_by_name ? ` · ${mat.uploaded_by_name}` : ''}
        </Typography>
      </Box>
      <IconButton size="small" disabled={replacing} onClick={(e) => { e.stopPropagation(); onReplace(mat); }} title="Replace file">
        <ReplaceIcon fontSize="small" sx={{ color: '#64748b' }} />
      </IconButton>
      <IconButton size="small" onClick={(e) => { e.stopPropagation(); onPreview(mat); }} title="Preview">
        <PreviewIcon fontSize="small" sx={{ color: ACCENT }} />
      </IconButton>
      <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(mat); }}>
        <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
      </IconButton>
    </Box>
  );
}
