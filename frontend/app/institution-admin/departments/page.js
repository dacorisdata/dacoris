'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Alert, CircularProgress, IconButton, Tooltip, Paper, FormControl,
  InputLabel, Select, MenuItem, Switch, FormControlLabel, useTheme,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Refresh as RefreshIcon, AutoFixHigh as SeedIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { institutionAdminAPI } from '../../../lib/api';
import { INSTITUTION_TYPES, getInstitutionTypeLabel } from '../../../lib/institutionTypes';

const emptyForm = {
  name: '',
  institution_type: '',
  description: '',
  is_active: true,
  sort_order: 0,
};

export default function InstitutionAdminDepartmentsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const user = await fetchUser();
    if (!user) { router.push('/login'); return; }
    if (!user.is_institution_admin) {
      router.push(user.is_global_admin ? '/global-admin/dashboard' : '/login');
      return;
    }
    loadData();
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await institutionAdminAPI.getDepartments();
      setDepartments(res.data || []);
    } catch {
      setError('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (dept) => {
    setEditing(dept);
    setForm({
      name: dept.name || '',
      institution_type: dept.institution_type || '',
      description: dept.description || '',
      is_active: dept.is_active !== false,
      sort_order: dept.sort_order || 0,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Department name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        institution_type: form.institution_type || null,
        description: form.description.trim() || null,
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 0,
      };
      if (editing) {
        await institutionAdminAPI.updateDepartment(editing.id, payload);
        setSuccess('Department updated');
      } else {
        await institutionAdminAPI.createDepartment(payload);
        setSuccess('Department created');
      }
      setDialogOpen(false);
      await loadData();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to save department');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dept) => {
    if (!confirm(`Delete department "${dept.name}"?`)) return;
    try {
      await institutionAdminAPI.deleteDepartment(dept.id);
      setSuccess('Department deleted');
      await loadData();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to delete department');
    }
  };

  const handleSeedDefaults = async () => {
    try {
      const res = await institutionAdminAPI.seedDefaultDepartments();
      setSuccess(res.data?.message || 'Default departments seeded');
      await loadData();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to seed departments');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ color: 'text.primary', fontSize: 24, fontWeight: 700, mb: 0.5 }}>
            Departments
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
            Manage research departments shown during registration. Separate from user roles.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData} sx={{ textTransform: 'none', borderRadius: 2 }}>
            Refresh
          </Button>
          <Button variant="outlined" startIcon={<SeedIcon />} onClick={handleSeedDefaults} sx={{ textTransform: 'none', borderRadius: 2 }}>
            Seed Defaults
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
            sx={{ bgcolor: '#1ca7a1', textTransform: 'none', borderRadius: 2, '&:hover': { bgcolor: '#0e7490' } }}>
            Add Department
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Paper elevation={0} sx={{
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        overflow: 'hidden',
        boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
      }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: dark ? '#0f172a' : 'background.default', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' } }}>
                <TableCell>Department</TableCell>
                <TableCell>Institution Type</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {departments.map((dept) => (
                <TableRow key={dept.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{dept.name}</TableCell>
                  <TableCell>
                    {dept.institution_type ? (
                      <Chip label={getInstitutionTypeLabel(dept.institution_type) || dept.institution_type} size="small" />
                    ) : (
                      <Chip label="All types" size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', maxWidth: 320 }}>
                    {dept.description || '—'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={dept.is_active ? 'Active' : 'Inactive'}
                      size="small"
                      sx={{
                        bgcolor: dept.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(148,163,184,0.15)',
                        color: dept.is_active ? '#22c55e' : '#64748b',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEdit(dept)} sx={{ color: '#1ca7a1' }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => handleDelete(dept)} sx={{ color: '#ef4444' }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {departments.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography sx={{ color: 'text.secondary', mb: 2 }}>No departments configured yet.</Typography>
            <Button variant="outlined" startIcon={<SeedIcon />} onClick={handleSeedDefaults} sx={{ textTransform: 'none' }}>
              Seed research departments from institution types
            </Button>
          </Box>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth disableScrollLock>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editing ? 'Edit Department' : 'Add Department'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Department name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            fullWidth
            required
            placeholder="e.g. Faculty of Science & Technology"
          />
          <FormControl fullWidth>
            <InputLabel>Institution type (optional)</InputLabel>
            <Select
              value={form.institution_type}
              label="Institution type (optional)"
              onChange={(e) => setForm({ ...form, institution_type: e.target.value })}
            >
              <MenuItem value=""><em>All institution types</em></MenuItem>
              {INSTITUTION_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            fullWidth
            multiline
            rows={2}
          />
          <TextField
            label="Sort order"
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
            fullWidth
          />
          <FormControlLabel
            control={<Switch checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />}
            label="Active (visible during registration)"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            sx={{ bgcolor: '#1ca7a1', '&:hover': { bgcolor: '#0e7490' } }}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
