'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, CircularProgress, Alert, useTheme, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Select, FormControl, InputLabel, IconButton, Autocomplete,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import { trainingAPI } from '../../../../lib/api';

const ACCENT = '#1ca7a1';

const PROFICIENCY_COLORS = {
  beginner: '#10b981', intermediate: '#3b82f6', advanced: '#7c3aed', expert: '#f59e0b',
};

const EMPTY_FORM = {
  skill_name: '', category: '', proficiency_level: 'beginner',
  years_experience: '', notes: '',
};

export default function SkillsInventoryPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    try {
      const [skillsRes, catalogRes] = await Promise.all([
        trainingAPI.mySkills(),
        trainingAPI.skillsCatalog(),
      ]);
      setSkills(skillsRes.data || []);
      setCatalog(catalogRes.data || []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load skills');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setDialogOpen(true); };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      skill_name: s.skill_name,
      category: s.category || '',
      proficiency_level: s.proficiency_level,
      years_experience: s.years_experience ?? '',
      notes: s.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.skill_name.trim()) { setError('Skill name is required'); return; }
    setSaving(true); setError('');
    const payload = {
      ...form,
      years_experience: form.years_experience ? parseFloat(form.years_experience) : null,
    };
    try {
      if (editing) {
        await trainingAPI.updateSkill(editing.id, payload);
      } else {
        await trainingAPI.addSkill(payload);
      }
      setDialogOpen(false);
      await init();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to save skill');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this skill?')) return;
    try {
      await trainingAPI.deleteSkill(id);
      await init();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to delete');
    }
  };

  const catalogOptions = catalog.map(c => c.name);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  const byCategory = skills.reduce((acc, s) => {
    const cat = s.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography sx={{ fontSize: 24, fontWeight: 700 }}>Skills Inventory</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Document your research competencies and expertise</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}
          sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#15968f' } }}>
          Add Skill
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {skills.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, bgcolor: 'background.paper', borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
          <Typography sx={{ color: 'text.secondary', mb: 2 }}>No skills added yet. Build your research skills profile.</Typography>
          <Button variant="contained" onClick={openAdd} sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#15968f' } }}>Add First Skill</Button>
        </Box>
      ) : (
        Object.entries(byCategory).map(([category, items]) => (
          <Box key={category} sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', mb: 1 }}>{category}</Typography>
            <TableContainer sx={{ bgcolor: 'background.paper', borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Skill</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Proficiency</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Experience</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map(s => {
                    const color = PROFICIENCY_COLORS[s.proficiency_level] || ACCENT;
                    return (
                      <TableRow key={s.id} hover>
                        <TableCell>
                          <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{s.skill_name}</Typography>
                          {s.notes && <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{s.notes}</Typography>}
                        </TableCell>
                        <TableCell>
                          <Chip label={s.proficiency_level} size="small"
                            sx={{ fontSize: 11, textTransform: 'capitalize', color, bgcolor: `${color}15`, fontWeight: 600 }} />
                        </TableCell>
                        <TableCell>{s.years_experience != null ? `${s.years_experience} yrs` : '—'}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => openEdit(s)}><EditIcon fontSize="small" /></IconButton>
                          <IconButton size="small" onClick={() => handleDelete(s.id)}><DeleteIcon fontSize="small" sx={{ color: 'error.main' }} /></IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ))
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Skill' : 'Add Skill'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Autocomplete
            freeSolo
            options={catalogOptions}
            value={form.skill_name}
            onChange={(_, val) => {
              const name = val || '';
              const cat = catalog.find(c => c.name === name);
              setForm(f => ({ ...f, skill_name: name, category: cat?.category || f.category }));
            }}
            onInputChange={(_, val) => setForm(f => ({ ...f, skill_name: val }))}
            renderInput={params => <TextField {...params} label="Skill Name *" />}
          />
          <TextField label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} fullWidth />
          <FormControl fullWidth>
            <InputLabel>Proficiency</InputLabel>
            <Select value={form.proficiency_level} label="Proficiency"
              onChange={e => setForm(f => ({ ...f, proficiency_level: e.target.value }))}>
              {['beginner', 'intermediate', 'advanced', 'expert'].map(p => (
                <MenuItem key={p} value={p} sx={{ textTransform: 'capitalize' }}>{p}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Years of Experience" type="number" value={form.years_experience}
            onChange={e => setForm(f => ({ ...f, years_experience: e.target.value }))} fullWidth />
          <TextField label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} multiline rows={2} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#15968f' } }}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
