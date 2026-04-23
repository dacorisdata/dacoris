'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme, Alert, Paper,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
} from '@mui/material';
import { Add as AddIcon, Storage as DataIcon } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../../../contexts/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#1ca7a1';
const accessColor = a => ({ public:'#10b981', restricted:'#f59e0b', confidential:'#ef4444', highly_sensitive:'#8b5cf6' }[a] || '#64748b');
const statusColor = s => ({ active:'#10b981', draft:'#64748b', staging:'#0ea5e9', archived:'#64748b' }[s] || '#64748b');

export default function ResearcherDatasetsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState([]);
  const [forms, setForms] = useState([]);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newDs, setNewDs] = useState({ title:'', description:'', source_form_id:'', access_level:'restricted' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchUser().then(u => { if (!u) router.push('/login'); else loadData(); }); }, []);

  const loadData = async () => {
    const token = localStorage.getItem('token');
    const headers = { Authorization:`Bearer ${token}` };
    try {
      const [dsRes, fmRes] = await Promise.all([
        axios.get(`${API}/data/datasets`, { headers }).catch(() => ({ data:[] })),
        axios.get(`${API}/data/forms`, { headers }).catch(() => ({ data:[] })),
      ]);
      setDatasets(dsRes.data || []);
      setForms(fmRes.data || []);
    } catch { setError('Failed to load data'); }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newDs.title.trim()) return;
    setSaving(true); setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/data/datasets`, {
        ...newDs, source_form_id: newDs.source_form_id ? parseInt(newDs.source_form_id) : null,
      }, { headers:{ Authorization:`Bearer ${token}` } });
      setCreateOpen(false); setNewDs({ title:'', description:'', source_form_id:'', access_level:'restricted' });
      await loadData();
    } catch (e) { setError(e.response?.data?.detail || 'Failed to create dataset'); }
    setSaving(false);
  };

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p:3 }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:3 }}>
        <Box>
          <Typography sx={{ fontSize:22, fontWeight:700 }}>My Datasets</Typography>
          <Typography sx={{ fontSize:13, color:'text.secondary', mt:0.3 }}>Research datasets linked to your projects — version controlled and QA-checked</Typography>
        </Box>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}
          sx={{ bgcolor:ACCENT, textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
          Create Dataset
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb:2 }} onClose={() => setError('')}>{error}</Alert>}

      {datasets.length === 0 && !error && (
        <Box sx={{ textAlign:'center', py:6 }}>
          <DataIcon sx={{ fontSize:48, color:'text.disabled', mb:2 }} />
          <Typography sx={{ color:'text.secondary', fontWeight:600, mb:0.5 }}>No datasets yet</Typography>
          <Typography sx={{ color:'text.disabled', fontSize:13 }}>Create a dataset linked to a capture form to start curating data.</Typography>
        </Box>
      )}

      {datasets.length > 0 && (
        <Paper elevation={0} variant="outlined" sx={{ borderRadius:2.5, overflow:'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ '& th':{ bgcolor:dark?'#0f172a':'background.default', color:'text.secondary', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, borderBottom:`1px solid ${theme.palette.divider}` } }}>
                <TableRow>
                  <TableCell>Dataset</TableCell><TableCell>Source Form</TableCell><TableCell>Records</TableCell>
                  <TableCell>Version</TableCell><TableCell>Access</TableCell><TableCell>Status</TableCell><TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {datasets.map(d => (
                  <TableRow key={d.id} sx={{ '&:hover':{ bgcolor:dark?'#0f172a':'rgba(0,0,0,0.02)' } }}>
                    <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                      <Typography sx={{ fontSize:13, fontWeight:600 }}>{d.title}</Typography>
                      {d.project_title && <Typography sx={{ fontSize:10, color:'text.disabled' }}>{d.project_title}</Typography>}
                    </TableCell>
                    <TableCell sx={{ fontSize:12, color:'text.secondary', borderBottom:`1px solid ${theme.palette.divider}` }}>{d.source_form_title || '—'}</TableCell>
                    <TableCell sx={{ fontSize:13, fontWeight:600, borderBottom:`1px solid ${theme.palette.divider}` }}>{(d.record_count||0).toLocaleString()}</TableCell>
                    <TableCell sx={{ fontSize:12, fontFamily:'monospace', borderBottom:`1px solid ${theme.palette.divider}` }}>v{d.current_version||1}</TableCell>
                    <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                      <Chip label={(d.access_level||'restricted').replace('_',' ')} size="small"
                        sx={{ fontSize:9, fontWeight:700, textTransform:'capitalize', bgcolor:accessColor(d.access_level)+'22', color:accessColor(d.access_level) }} />
                    </TableCell>
                    <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                      <Chip label={d.status} size="small"
                        sx={{ fontSize:9, fontWeight:700, textTransform:'capitalize', bgcolor:statusColor(d.status)+'22', color:statusColor(d.status) }} />
                    </TableCell>
                    <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                      <Button size="small" sx={{ color:ACCENT, textTransform:'none', fontSize:11, fontWeight:600 }}>View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx:{ borderRadius:3 } }}>
        <DialogTitle sx={{ fontWeight:700, pb:1 }}>Create Dataset</DialogTitle>
        <DialogContent sx={{ display:'flex', flexDirection:'column', gap:2, pt:'8px !important' }}>
          <TextField fullWidth size="small" label="Title *" value={newDs.title} onChange={e => setNewDs(f=>({...f, title:e.target.value}))} />
          <TextField fullWidth size="small" label="Description" multiline rows={2} value={newDs.description} onChange={e => setNewDs(f=>({...f, description:e.target.value}))} />
          <TextField select fullWidth size="small" label="Source Form (optional)" value={newDs.source_form_id} onChange={e => setNewDs(f=>({...f, source_form_id:e.target.value}))}>
            <MenuItem value="">None</MenuItem>
            {forms.map(f => <MenuItem key={f.id} value={f.id}>{f.title}</MenuItem>)}
          </TextField>
          <TextField select fullWidth size="small" label="Access Level" value={newDs.access_level} onChange={e => setNewDs(f=>({...f, access_level:e.target.value}))}>
            <MenuItem value="public">Public</MenuItem>
            <MenuItem value="restricted">Restricted</MenuItem>
            <MenuItem value="confidential">Confidential</MenuItem>
            <MenuItem value="highly_sensitive">Highly Sensitive</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p:2, pt:0 }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ textTransform:'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving || !newDs.title.trim()}
            sx={{ bgcolor:ACCENT, textTransform:'none', borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
            {saving ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
