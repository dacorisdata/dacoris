'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip, useTheme,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Select, FormControl, InputLabel, IconButton,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Publish as PublishIcon, Archive as ArchiveIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import { trainingAPI } from '../../../../lib/api';

const ACCENT = '#16a699';

const STATUS_META = {
  draft:     { label: 'Draft',     color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  published: { label: 'Published', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  archived:  { label: 'Archived',  color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
};

const LEVELS = ['beginner', 'intermediate', 'advanced'];
const MODES = ['online', 'in_person', 'hybrid', 'self_paced'];
const CATEGORIES = [
  'Custom Programme',
  'Communication',
  'Grant Management',
  'Data Management',
  'Publishing & Dissemination',
  'Research Capacity',
  'Leadership',
  'Compliance',
  'Digital Skills',
];

const EMPTY_FORM = {
  title: '', description: '', category: '', level: 'beginner', delivery_mode: 'online',
  cpd_hours: '', duration_hours: '', instructor_name: '', max_enrollments: '',
  learning_outcomes: '', certification_awarded: true,
};

export default function AdminTrainingProgramsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    await loadPrograms();
    setLoading(false);
  };

  const loadPrograms = async () => {
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const res = await trainingAPI.listPrograms(params);
      setPrograms(res.data || []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load programmes');
    }
  };

  useEffect(() => { if (!loading) loadPrograms(); }, [statusFilter]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setDialogOpen(true); };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      title: p.title || '',
      description: p.description || '',
      category: p.category || '',
      level: p.level || 'beginner',
      delivery_mode: p.delivery_mode || 'online',
      cpd_hours: p.cpd_hours ?? '',
      duration_hours: p.duration_hours ?? '',
      instructor_name: p.instructor_name || '',
      max_enrollments: p.max_enrollments ?? '',
      learning_outcomes: (p.learning_outcomes || []).join('\n'),
      certification_awarded: p.certification_awarded !== false,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true); setError('');
    const payload = {
      ...form,
      cpd_hours: parseFloat(form.cpd_hours) || 0,
      duration_hours: form.duration_hours ? parseFloat(form.duration_hours) : null,
      max_enrollments: form.max_enrollments ? parseInt(form.max_enrollments, 10) : null,
      learning_outcomes: form.learning_outcomes
        ? form.learning_outcomes.split('\n').map(s => s.trim()).filter(Boolean)
        : [],
    };
    try {
      if (editing) {
        await trainingAPI.updateProgram(editing.id, payload);
        setSuccess('Programme updated');
      } else {
        await trainingAPI.createProgram(payload);
        setSuccess('Programme created');
      }
      setDialogOpen(false);
      await loadPrograms();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to save programme');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id, status) => {
    try {
      await trainingAPI.updateProgram(id, { status });
      setSuccess(`Programme ${status}`);
      await loadPrograms();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to update status');
    }
  };

  const handleDelete = async (id, title) => {
    if (!confirm(`Delete "${title}"?`)) return;
    try {
      await trainingAPI.deleteProgram(id);
      setSuccess('Programme deleted');
      await loadPrograms();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to delete');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 24, fontWeight: 700 }}>Training Programmes</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            Five core programmes are provided platform-wide. Add custom programmes for your institution.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
          sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#138f82' } }}>
          Add Custom Programme
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <FormControl size="small" sx={{ mb: 2, minWidth: 140 }}>
        <InputLabel>Status</InputLabel>
        <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)}>
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="draft">Draft</MenuItem>
          <MenuItem value="published">Published</MenuItem>
          <MenuItem value="archived">Archived</MenuItem>
        </Select>
      </FormControl>

      <TableContainer sx={{ bgcolor: 'background.paper', borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Programme</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>CPD Hrs</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Enrolled</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {programs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  No programmes yet. Core programmes are provisioned automatically on first load.
                </TableCell>
              </TableRow>
            ) : programs.map(p => {
              const sm = STATUS_META[p.status] || STATUS_META.draft;
              return (
                <TableRow key={p.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{p.title}</Typography>
                      {p.is_system_default && (
                        <Chip label="Core" size="small" sx={{
                          height: 18, fontSize: 9.5, fontWeight: 700,
                          bgcolor: `${ACCENT}18`, color: ACCENT,
                        }} />
                      )}
                    </Box>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{p.instructor_name || '—'}</Typography>
                  </TableCell>
                  <TableCell>{p.category || '—'}</TableCell>
                  <TableCell>{p.cpd_hours}</TableCell>
                  <TableCell>{p.enrollment_count}</TableCell>
                  <TableCell>
                    <Chip label={sm.label} size="small" sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 600, fontSize: 11 }} />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEdit(p)}><EditIcon fontSize="small" /></IconButton>
                    {p.status === 'draft' && (
                      <IconButton size="small" onClick={() => setStatus(p.id, 'published')} title="Publish">
                        <PublishIcon fontSize="small" sx={{ color: '#10b981' }} />
                      </IconButton>
                    )}
                    {p.status === 'published' && (
                      <IconButton size="small" onClick={() => setStatus(p.id, 'archived')} title="Archive">
                        <ArchiveIcon fontSize="small" />
                      </IconButton>
                    )}
                    {!p.is_system_default && (
                      <IconButton size="small" onClick={() => handleDelete(p.id, p.title)}>
                        <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Programme' : 'Add Custom Programme'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Title *"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            fullWidth
            disabled={editing?.is_system_default}
            helperText={editing?.is_system_default ? 'Core programme titles are fixed platform-wide.' : undefined}
          />
          <TextField label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} multiline rows={3} fullWidth />
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select value={form.category} label="Category" onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Level</InputLabel>
              <Select value={form.level} label="Level" onChange={e => setForm(f => ({ ...f, level: e.target.value }))}>
                {LEVELS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Delivery</InputLabel>
              <Select value={form.delivery_mode} label="Delivery" onChange={e => setForm(f => ({ ...f, delivery_mode: e.target.value }))}>
                {MODES.map(m => <MenuItem key={m} value={m}>{m.replace('_', ' ')}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
            <TextField label="CPD Hours" type="number" value={form.cpd_hours} onChange={e => setForm(f => ({ ...f, cpd_hours: e.target.value }))} />
            <TextField label="Duration (hrs)" type="number" value={form.duration_hours} onChange={e => setForm(f => ({ ...f, duration_hours: e.target.value }))} />
            <TextField label="Max Enrollments" type="number" value={form.max_enrollments} onChange={e => setForm(f => ({ ...f, max_enrollments: e.target.value }))} />
          </Box>
          <TextField label="Instructor" value={form.instructor_name} onChange={e => setForm(f => ({ ...f, instructor_name: e.target.value }))} fullWidth />
          <TextField label="Learning Outcomes (one per line)" value={form.learning_outcomes} onChange={e => setForm(f => ({ ...f, learning_outcomes: e.target.value }))} multiline rows={3} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#138f82' } }}>
            {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
