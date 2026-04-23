'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, CircularProgress, useTheme, Button, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem,
} from '@mui/material';
import { Storage as DataIcon, Search as SearchIcon, Add as AddIcon } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../../../contexts/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#1ca7a1';

const ACCESS_META = {
  public:           { bg:'rgba(16,185,129,0.12)',  color:'#10b981' },
  restricted:       { bg:'rgba(245,158,11,0.12)',  color:'#f59e0b' },
  confidential:     { bg:'rgba(239,68,68,0.12)',   color:'#ef4444' },
  highly_sensitive:  { bg:'rgba(139,92,246,0.12)',  color:'#8b5cf6' },
};
const STATUS_META = {
  draft:   { bg:'rgba(100,116,139,0.12)', color:'#64748b' },
  staging: { bg:'rgba(14,165,233,0.12)',  color:'#0ea5e9' },
  active:  { bg:'rgba(16,185,129,0.12)',  color:'#10b981' },
  archived:{ bg:'rgba(100,116,139,0.12)', color:'#64748b' },
};

function CreateDatasetDialog({ open, onClose, onCreated, forms }) {
  const [form, setForm] = useState({ title:'', description:'', source_form_id:'', access_level:'restricted' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handle = async () => {
    if (!form.title.trim()) return;
    setSaving(true); setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/data/datasets`, {
        ...form,
        source_form_id: form.source_form_id ? parseInt(form.source_form_id) : null,
      }, { headers:{ Authorization:`Bearer ${token}` } });
      onCreated(); onClose();
      setForm({ title:'', description:'', source_form_id:'', access_level:'restricted' });
    } catch (e) { setError(e.response?.data?.detail || 'Failed to create'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx:{ borderRadius:3 } }}>
      <DialogTitle sx={{ fontWeight:700, pb:1 }}>Create Dataset</DialogTitle>
      <DialogContent sx={{ display:'flex', flexDirection:'column', gap:2, pt:'8px !important' }}>
        {error && <Alert severity="error" sx={{ fontSize:12 }}>{error}</Alert>}
        <TextField fullWidth size="small" label="Title *" value={form.title} onChange={e => setForm(f=>({...f, title:e.target.value}))} />
        <TextField fullWidth size="small" label="Description" multiline rows={2} value={form.description} onChange={e => setForm(f=>({...f, description:e.target.value}))} />
        <TextField select fullWidth size="small" label="Source Form (optional)" value={form.source_form_id} onChange={e => setForm(f=>({...f, source_form_id:e.target.value}))}>
          <MenuItem value="">None</MenuItem>
          {forms.map(f => <MenuItem key={f.id} value={f.id}>{f.title}</MenuItem>)}
        </TextField>
        <TextField select fullWidth size="small" label="Access Level" value={form.access_level} onChange={e => setForm(f=>({...f, access_level:e.target.value}))}>
          <MenuItem value="public">Public</MenuItem>
          <MenuItem value="restricted">Restricted</MenuItem>
          <MenuItem value="confidential">Confidential</MenuItem>
          <MenuItem value="highly_sensitive">Highly Sensitive</MenuItem>
        </TextField>
      </DialogContent>
      <DialogActions sx={{ p:2, pt:0 }}>
        <Button onClick={onClose} sx={{ textTransform:'none' }}>Cancel</Button>
        <Button variant="contained" onClick={handle} disabled={saving || !form.title.trim()}
          sx={{ bgcolor:ACCENT, textTransform:'none', borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
          {saving ? 'Creating...' : 'Create Dataset'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function DatasetsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState([]);
  const [forms, setForms] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    await loadData();
  };

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

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  const filtered = search
    ? datasets.filter(d => d.title?.toLowerCase().includes(search.toLowerCase()) || d.description?.toLowerCase().includes(search.toLowerCase()))
    : datasets;

  return (
    <Box sx={{ p:{xs:2, md:4} }}>
      <Box sx={{ mb:3, display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:2 }}>
        <Box>
          <Typography sx={{ fontSize:22, fontWeight:700, mb:0.3 }}>Datasets</Typography>
          <Typography sx={{ color:'text.secondary', fontSize:13 }}>Curate, validate, and manage institutional research datasets</Typography>
        </Box>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}
          sx={{ bgcolor:ACCENT, textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
          Create Dataset
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb:2 }} onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ display:'flex', gap:1.5, mb:3, flexWrap:'wrap' }}>
        {['draft','staging','active','archived'].map(st => {
          const m = STATUS_META[st]; const c = datasets.filter(d => d.status === st).length;
          return (
            <Box key={st} sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2, px:2, py:1, textAlign:'center', minWidth:80 }}>
              <Typography sx={{ fontSize:18, fontWeight:700, color:m.color }}>{c}</Typography>
              <Typography sx={{ fontSize:10, fontWeight:600, color:'text.secondary', textTransform:'capitalize' }}>{st}</Typography>
            </Box>
          );
        })}
        <Box sx={{ ml:'auto', bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2, px:2, py:1, textAlign:'center' }}>
          <Typography sx={{ fontSize:18, fontWeight:700, color:ACCENT }}>{datasets.reduce((a,d) => a+(d.record_count||0), 0).toLocaleString()}</Typography>
          <Typography sx={{ fontSize:10, fontWeight:600, color:'text.secondary' }}>Total Records</Typography>
        </Box>
      </Box>

      {datasets.length > 0 && (
        <TextField size="small" placeholder="Search datasets..." value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment:<SearchIcon sx={{ color:'text.disabled', mr:1, fontSize:18 }} /> }}
          sx={{ mb:2.5, width:320, '& .MuiOutlinedInput-root':{ borderRadius:2 } }} />
      )}

      <Paper elevation={0} variant="outlined" sx={{ borderRadius:2.5, overflow:'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ '& th':{ fontWeight:700, fontSize:11, textTransform:'uppercase', letterSpacing:0.5, color:'text.secondary', bgcolor:dark?'#0f172a':'background.default', borderBottom:`1px solid ${theme.palette.divider}` } }}>
              <TableRow>
                <TableCell>Dataset</TableCell><TableCell>Source Form</TableCell><TableCell>Records</TableCell>
                <TableCell>Version</TableCell><TableCell>Status</TableCell><TableCell>Access</TableCell>
                <TableCell>Created</TableCell><TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8}>
                  <Box sx={{ textAlign:'center', py:6 }}>
                    <DataIcon sx={{ fontSize:48, color:'text.disabled', mb:2 }} />
                    <Typography sx={{ color:'text.secondary', fontWeight:600 }}>No datasets yet</Typography>
                    <Typography sx={{ color:'text.disabled', fontSize:13 }}>Create a dataset to start curating research data.</Typography>
                  </Box>
                </TableCell></TableRow>
              ) : filtered.map(d => {
                const am = ACCESS_META[d.access_level] || ACCESS_META.restricted;
                const sm = STATUS_META[d.status] || STATUS_META.draft;
                return (
                  <TableRow key={d.id} hover sx={{ '&:hover':{ bgcolor:`${ACCENT}06` } }}>
                    <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                      <Typography sx={{ fontWeight:600, fontSize:13 }}>{d.title}</Typography>
                      {d.project_title && <Typography sx={{ fontSize:10, color:'text.disabled' }}>{d.project_title}</Typography>}
                    </TableCell>
                    <TableCell sx={{ fontSize:12, color:'text.secondary', borderBottom:`1px solid ${theme.palette.divider}` }}>{d.source_form_title || '—'}</TableCell>
                    <TableCell sx={{ fontSize:13, fontWeight:700, borderBottom:`1px solid ${theme.palette.divider}` }}>{(d.record_count||0).toLocaleString()}</TableCell>
                    <TableCell sx={{ fontSize:12, borderBottom:`1px solid ${theme.palette.divider}` }}>v{d.current_version||1}</TableCell>
                    <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                      <Chip label={d.status} size="small" sx={{ fontSize:9, fontWeight:700, textTransform:'capitalize', bgcolor:sm.bg, color:sm.color }} />
                    </TableCell>
                    <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                      <Chip label={(d.access_level||'restricted').replace('_',' ')} size="small" sx={{ bgcolor:am.bg, color:am.color, fontWeight:600, fontSize:9, textTransform:'capitalize' }} />
                    </TableCell>
                    <TableCell sx={{ fontSize:11, color:'text.secondary', borderBottom:`1px solid ${theme.palette.divider}` }}>{fmtDate(d.created_at)}</TableCell>
                    <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                      <Button size="small" sx={{ color:ACCENT, textTransform:'none', fontSize:11, fontWeight:600 }}>Manage</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <CreateDatasetDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={loadData} forms={forms} />
    </Box>
  );
}
