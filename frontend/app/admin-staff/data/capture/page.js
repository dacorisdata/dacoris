'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme, TextField, MenuItem,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, Paper, LinearProgress,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, Sync as SyncIcon } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../../../contexts/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#1ca7a1';

const SOURCES = [
  { key:'internal', label:'Internal Form Builder', color:'#1ca7a1' },
  { key:'kobo',     label:'KoBoToolbox',           color:'#f59e0b' },
  { key:'odk',      label:'ODK Central',           color:'#0ea5e9' },
  { key:'redcap',   label:'REDCap',                color:'#8b5cf6' },
  { key:'msforms',  label:'Microsoft Forms',       color:'#10b981' },
];
const srcColor = s => SOURCES.find(x => x.key === s)?.color || '#64748b';
const srcLabel = s => SOURCES.find(x => x.key === s)?.label || s;
const statusColor = s => ({ true:'#10b981', false:'#64748b' }[String(s)] || '#64748b');
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';

function CreateFormDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ title:'', description:'', source_system:'internal', project_id:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handle = async () => {
    if (!form.title.trim()) return;
    setSaving(true); setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/data/forms`, {
        ...form, project_id: form.project_id ? parseInt(form.project_id) : null,
      }, { headers:{ Authorization:`Bearer ${token}` } });
      onCreated(); onClose();
      setForm({ title:'', description:'', source_system:'internal', project_id:'' });
    } catch (e) { setError(e.response?.data?.detail || 'Failed to create'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx:{ borderRadius:3 } }}>
      <DialogTitle sx={{ fontWeight:700, pb:1 }}>Create Capture Form</DialogTitle>
      <DialogContent sx={{ display:'flex', flexDirection:'column', gap:2, pt:'8px !important' }}>
        {error && <Alert severity="error" sx={{ fontSize:12 }}>{error}</Alert>}
        <TextField fullWidth size="small" label="Title *" value={form.title} onChange={e => setForm(f=>({...f, title:e.target.value}))} />
        <TextField fullWidth size="small" label="Description" multiline rows={2} value={form.description} onChange={e => setForm(f=>({...f, description:e.target.value}))} />
        <TextField select fullWidth size="small" label="Source System" value={form.source_system} onChange={e => setForm(f=>({...f, source_system:e.target.value}))}>
          {SOURCES.map(s => <MenuItem key={s.key} value={s.key}>{s.label}</MenuItem>)}
        </TextField>
      </DialogContent>
      <DialogActions sx={{ p:2, pt:0 }}>
        <Button onClick={onClose} sx={{ textTransform:'none' }}>Cancel</Button>
        <Button variant="contained" onClick={handle} disabled={saving || !form.title.trim()}
          sx={{ bgcolor:ACCENT, textTransform:'none', borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
          {saving ? 'Creating...' : 'Create Form'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function CaptureFormsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [integrationOpen, setIntegrationOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUser().then(u => { if (!u) router.push('/login'); else loadData(); });
  }, []);

  const loadData = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${API}/data/forms/enriched`, { headers:{ Authorization:`Bearer ${token}` } });
      setForms(res.data || []);
    } catch (e) { setError('Failed to load forms'); }
    finally { setLoading(false); }
  };

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  const filtered = forms.filter(f => !search || f.title?.toLowerCase().includes(search.toLowerCase()) || f.project_title?.toLowerCase().includes(search.toLowerCase()));
  const totalSubmissions = forms.reduce((a,f) => a + (f.submission_count || 0), 0);

  return (
    <Box sx={{ p:3 }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:3 }}>
        <Box>
          <Typography sx={{ fontSize:22, fontWeight:700 }}>Data Capture Forms</Typography>
          <Typography sx={{ fontSize:13, color:'text.secondary', mt:0.3 }}>Manage forms and integrations with KoBoToolbox, ODK Central, REDCap, and Microsoft Forms</Typography>
        </Box>
        <Box sx={{ display:'flex', gap:1 }}>
          <Button variant="outlined" size="small" startIcon={<SyncIcon />} onClick={() => setIntegrationOpen(true)}
            sx={{ textTransform:'none', fontWeight:600, borderRadius:2, borderColor:ACCENT, color:ACCENT }}>Integrations</Button>
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}
            sx={{ bgcolor:ACCENT, textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>Build Form</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb:2 }} onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ display:'flex', gap:1.5, mb:3, flexWrap:'wrap' }}>
        {SOURCES.map(s => {
          const count = forms.filter(f => f.source_system === s.key).length;
          return (
            <Box key={s.key} sx={{ display:'flex', alignItems:'center', gap:1, bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2, px:1.5, py:1 }}>
              <Box sx={{ width:8, height:8, borderRadius:'50%', bgcolor:s.color }} />
              <Box>
                <Typography sx={{ fontSize:11, fontWeight:600 }}>{s.label}</Typography>
                <Typography sx={{ fontSize:10, color:'text.secondary' }}>{count} form{count!==1?'s':''}</Typography>
              </Box>
            </Box>
          );
        })}
        <Box sx={{ ml:'auto', bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2, px:2, py:1, textAlign:'center' }}>
          <Typography sx={{ fontSize:20, fontWeight:700, color:ACCENT }}>{totalSubmissions.toLocaleString()}</Typography>
          <Typography sx={{ fontSize:10, color:'text.secondary', fontWeight:600 }}>Total Submissions</Typography>
        </Box>
      </Box>

      <TextField placeholder="Search forms..." value={search} onChange={e => setSearch(e.target.value)} size="small"
        InputProps={{ startAdornment:<SearchIcon sx={{ fontSize:18, color:'text.disabled', mr:1 }} /> }}
        sx={{ mb:2.5, width:340, '& .MuiOutlinedInput-root':{ borderRadius:2 } }} />

      <Paper elevation={0} variant="outlined" sx={{ borderRadius:2.5, overflow:'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ '& th':{ bgcolor:dark?'#0f172a':'background.default', color:'text.secondary', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, borderBottom:`1px solid ${theme.palette.divider}` } }}>
              <TableRow>
                <TableCell>Form Title</TableCell><TableCell>Source</TableCell><TableCell>Project</TableCell>
                <TableCell>Submissions</TableCell><TableCell>QA Pipeline</TableCell><TableCell>Status</TableCell>
                <TableCell>Created</TableCell><TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} sx={{ textAlign:'center', py:4, color:'text.secondary' }}>
                  <Typography sx={{ fontSize:13 }}>No capture forms yet. Click "Build Form" to create one.</Typography>
                </TableCell></TableRow>
              ) : filtered.map(f => {
                const qa = f.qa_stats || {};
                const total = f.submission_count || 0;
                const passRate = total > 0 ? Math.round((qa.passed||0)/total*100) : 0;
                return (
                  <TableRow key={f.id} sx={{ '&:hover':{ bgcolor:dark?'#0f172a':'rgba(0,0,0,0.02)' } }}>
                    <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                      <Typography sx={{ fontSize:12, fontWeight:600 }}>{f.title}</Typography>
                      {f.created_by_name && <Typography sx={{ fontSize:10, color:'text.disabled' }}>by {f.created_by_name}</Typography>}
                    </TableCell>
                    <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                      <Chip label={srcLabel(f.source_system)} size="small" sx={{ fontSize:9, fontWeight:700, bgcolor:srcColor(f.source_system)+'22', color:srcColor(f.source_system) }} />
                    </TableCell>
                    <TableCell sx={{ fontSize:11, color:'text.secondary', borderBottom:`1px solid ${theme.palette.divider}` }}>{f.project_title || '—'}</TableCell>
                    <TableCell sx={{ fontSize:13, fontWeight:700, borderBottom:`1px solid ${theme.palette.divider}` }}>{total.toLocaleString()}</TableCell>
                    <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}`, minWidth:140 }}>
                      {total > 0 ? (
                        <Box>
                          <Box sx={{ display:'flex', gap:0.5, mb:0.5 }}>
                            <Typography sx={{ fontSize:9, color:'#10b981' }}>{qa.passed||0} passed</Typography>
                            <Typography sx={{ fontSize:9, color:'text.disabled' }}>/</Typography>
                            <Typography sx={{ fontSize:9, color:'#f59e0b' }}>{qa.staged||0} staged</Typography>
                            <Typography sx={{ fontSize:9, color:'text.disabled' }}>/</Typography>
                            <Typography sx={{ fontSize:9, color:'#ef4444' }}>{qa.failed||0} failed</Typography>
                          </Box>
                          <LinearProgress variant="determinate" value={passRate}
                            sx={{ height:4, borderRadius:2, bgcolor:'rgba(0,0,0,0.08)', '& .MuiLinearProgress-bar':{ bgcolor:'#10b981', borderRadius:2 } }} />
                        </Box>
                      ) : <Typography sx={{ fontSize:10, color:'text.disabled' }}>No data</Typography>}
                    </TableCell>
                    <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                      <Chip label={f.is_active ? 'Active' : 'Inactive'} size="small"
                        sx={{ fontSize:9, fontWeight:700, bgcolor:statusColor(f.is_active)+'22', color:statusColor(f.is_active) }} />
                    </TableCell>
                    <TableCell sx={{ fontSize:11, color:'text.secondary', borderBottom:`1px solid ${theme.palette.divider}` }}>{fmtDate(f.created_at)}</TableCell>
                    <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                      <Button size="small" sx={{ color:ACCENT, textTransform:'none', fontSize:11, fontWeight:600 }}>View</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <CreateFormDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={loadData} />

      <Dialog open={integrationOpen} onClose={() => setIntegrationOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx:{ borderRadius:3 } }}>
        <DialogTitle sx={{ fontWeight:700, borderBottom:`1px solid ${theme.palette.divider}` }}>Data Capture Integrations</DialogTitle>
        <DialogContent sx={{ pt:'16px !important' }}>
          <Box sx={{ display:'flex', flexDirection:'column', gap:2 }}>
            {SOURCES.filter(s => s.key !== 'internal').map(s => (
              <Box key={s.key} sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', p:2, border:`1px solid ${theme.palette.divider}`, borderRadius:2 }}>
                <Box>
                  <Typography sx={{ fontSize:13, fontWeight:600 }}>{s.label}</Typography>
                  <Typography sx={{ fontSize:11, color:'text.secondary' }}>
                    {s.key==='kobo'?'OAuth2 + webhook sync':s.key==='odk'?'REST API + ODK Central':s.key==='redcap'?'API token auth':'Microsoft Graph API (M365)'}
                  </Typography>
                </Box>
                <Button size="small" variant="outlined" sx={{ textTransform:'none', fontSize:11, fontWeight:600, borderRadius:2, borderColor:s.color, color:s.color }}>Configure</Button>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px:3, pb:3 }}>
          <Button onClick={() => setIntegrationOpen(false)} sx={{ textTransform:'none', color:'text.secondary' }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
