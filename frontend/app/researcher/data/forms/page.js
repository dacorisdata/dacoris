'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
} from '@mui/material';
import { Add as AddIcon, DynamicForm as FormIcon } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../../../contexts/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#1ca7a1';
const srcColor = s => ({ internal:'#1ca7a1', kobo:'#f59e0b', odk:'#0ea5e9', redcap:'#8b5cf6', msforms:'#10b981' }[s] || '#64748b');
const srcLabel = s => ({ internal:'Internal', kobo:'KoBoToolbox', odk:'ODK Central', redcap:'REDCap', msforms:'MS Forms' }[s] || s);

export default function ResearcherFormsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newForm, setNewForm] = useState({ title:'', description:'', source_system:'internal' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchUser().then(u => { if (!u) router.push('/login'); else loadForms(); }); }, []);

  const loadForms = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${API}/data/forms/enriched`, { headers:{ Authorization:`Bearer ${token}` } });
      setForms(res.data || []);
    } catch { setError('Failed to load forms'); }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newForm.title.trim()) return;
    setSaving(true); setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/data/forms`, newForm, { headers:{ Authorization:`Bearer ${token}` } });
      setCreateOpen(false); setNewForm({ title:'', description:'', source_system:'internal' });
      await loadForms();
    } catch (e) { setError(e.response?.data?.detail || 'Failed to create form'); }
    setSaving(false);
  };

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p:3 }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:3 }}>
        <Box>
          <Typography sx={{ fontSize:22, fontWeight:700 }}>Capture Forms</Typography>
          <Typography sx={{ fontSize:13, color:'text.secondary', mt:0.3 }}>Data collection forms linked to your research projects</Typography>
        </Box>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}
          sx={{ bgcolor:ACCENT, textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
          Create Form
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb:2 }} onClose={() => setError('')}>{error}</Alert>}

      {forms.length === 0 && !error && (
        <Box sx={{ textAlign:'center', py:6 }}>
          <FormIcon sx={{ fontSize:48, color:'text.disabled', mb:2 }} />
          <Typography sx={{ color:'text.secondary', fontWeight:600, mb:0.5 }}>No capture forms yet</Typography>
          <Typography sx={{ color:'text.disabled', fontSize:13 }}>Create a form to start collecting research data.</Typography>
        </Box>
      )}

      <Box sx={{ display:'flex', flexDirection:'column', gap:2 }}>
        {forms.map(f => (
          <Box key={f.id} sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2.5, p:2.5, display:'flex', alignItems:'center', gap:2.5 }}>
            <Box sx={{ width:42, height:42, borderRadius:2, bgcolor:srcColor(f.source_system)+'22', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <FormIcon sx={{ fontSize:20, color:srcColor(f.source_system) }} />
            </Box>
            <Box sx={{ flex:1, minWidth:0 }}>
              <Typography sx={{ fontSize:14, fontWeight:700, mb:0.2 }}>{f.title}</Typography>
              <Typography sx={{ fontSize:12, color:'text.secondary' }}>{f.project_title || 'No project linked'}</Typography>
            </Box>
            <Box sx={{ display:'flex', gap:1, flexWrap:'wrap', flexShrink:0 }}>
              <Chip label={srcLabel(f.source_system)} size="small" sx={{ fontSize:10, fontWeight:700, bgcolor:srcColor(f.source_system)+'22', color:srcColor(f.source_system) }} />
              <Chip label={`${f.submission_count||0} submissions`} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor:'rgba(16,185,129,0.1)', color:'#10b981' }} />
              <Chip label={f.is_active ? 'Active' : 'Inactive'} size="small"
                sx={{ fontSize:10, fontWeight:600, bgcolor:f.is_active?'rgba(16,185,129,0.1)':'rgba(100,116,139,0.1)', color:f.is_active?'#10b981':'#64748b' }} />
            </Box>
            <Button size="small" sx={{ color:ACCENT, textTransform:'none', fontSize:12, fontWeight:600, flexShrink:0 }}>Open</Button>
          </Box>
        ))}
      </Box>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx:{ borderRadius:3 } }}>
        <DialogTitle sx={{ fontWeight:700, pb:1 }}>Create Capture Form</DialogTitle>
        <DialogContent sx={{ display:'flex', flexDirection:'column', gap:2, pt:'8px !important' }}>
          <TextField fullWidth size="small" label="Title *" value={newForm.title} onChange={e => setNewForm(f=>({...f, title:e.target.value}))} />
          <TextField fullWidth size="small" label="Description" multiline rows={2} value={newForm.description} onChange={e => setNewForm(f=>({...f, description:e.target.value}))} />
          <TextField select fullWidth size="small" label="Source System" value={newForm.source_system} onChange={e => setNewForm(f=>({...f, source_system:e.target.value}))}>
            {['internal','kobo','odk','redcap','msforms'].map(s => <MenuItem key={s} value={s}>{srcLabel(s)}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p:2, pt:0 }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ textTransform:'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving || !newForm.title.trim()}
            sx={{ bgcolor:ACCENT, textTransform:'none', borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
            {saving ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
