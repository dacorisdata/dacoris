'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme, TextField, MenuItem,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert,
  IconButton, Tooltip, Paper,
} from '@mui/material';
import {
  Add as AddIcon, UploadFile as UploadIcon, History as HistoryIcon,
  CheckCircle as CheckIcon, HourglassEmpty as PendingIcon,
  Cancel as RejectedIcon, Timer as ExpiredIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { useAuth } from '../../../../contexts/AuthContext';

const API    = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#1ca7a1';

const statusColor = s => ({
  approved:'#10b981', pending:'#f59e0b', rejected:'#ef4444', expired:'#64748b',
}[s] || '#64748b');
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';

function NewImportDialog({ open, onClose, projects, onCreated }) {
  const theme = useTheme();
  const dark  = theme.palette.mode === 'dark';
  const [form, setForm] = useState({
    project_id:'', justification:'', datasets:[''], access_duration_months:6,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const onDrop = useCallback(accepted => {
    const names = accepted.map(f => f.name);
    setForm(f => ({ ...f, datasets:[...f.datasets, ...names] }));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handle = async () => {
    if (!form.project_id || !form.justification.trim() || form.datasets.filter(d=>d).length===0) return;
    setSaving(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const body = {
        project_id: parseInt(form.project_id),
        justification: form.justification,
        requested_datasets: form.datasets.filter(d=>d),
        access_duration_months: form.access_duration_months,
      };
      await axios.post(`${API}/research/data-import`, body,
        { headers: { Authorization: `Bearer ${token}` } });
      onCreated();
      setForm({ project_id:'', justification:'', datasets:[''], access_duration_months:6 });
      onClose();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to submit');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx:{ borderRadius:3 } }}>
      <DialogTitle sx={{ fontWeight:700, pb:1 }}>Request Data Import Access</DialogTitle>
      <DialogContent sx={{ display:'flex', flexDirection:'column', gap:2, pt:'8px !important' }}>
        {error && <Alert severity="error" sx={{ fontSize:12 }}>{error}</Alert>}
        <TextField select fullWidth size="small" label="Project *" value={form.project_id}
          onChange={e => setForm(f=>({...f, project_id:e.target.value}))}>
          {projects.map(p => <MenuItem key={p.id} value={p.id} sx={{ fontSize:13 }}>{p.title}</MenuItem>)}
        </TextField>
        <TextField fullWidth size="small" label="Justification *" multiline rows={3} value={form.justification}
          onChange={e => setForm(f=>({...f, justification:e.target.value}))}
          placeholder="Explain why you need access to this data for the project…" />
        <TextField type="number" fullWidth size="small" label="Access Duration (months)" value={form.access_duration_months}
          onChange={e => setForm(f=>({...f, access_duration_months: parseInt(e.target.value) || 1}))}
          inputProps={{ min:1, max:24 }} />
        <Box>
          <Typography sx={{ fontSize:13, fontWeight:600, mb:1 }}>Datasets to Import</Typography>
          <Box {...getRootProps()} sx={{
            border:`2px dashed ${isDragActive ? ACCENT : theme.palette.divider}`,
            borderRadius:2.5, p:2.5, textAlign:'center', cursor:'pointer',
            bgcolor: isDragActive ? `${ACCENT}08` : 'transparent',
            '&:hover':{ borderColor:ACCENT, bgcolor:`${ACCENT}06` }, mb:1.5, transition:'all 0.15s',
          }}>
            <input {...getInputProps()} />
            <UploadIcon sx={{ fontSize:22, color:'text.disabled', mb:0.5 }} />
            <Typography sx={{ fontSize:12, color:'text.secondary' }}>
              {isDragActive ? 'Drop files' : 'Drag & drop dataset files or click to select'}
            </Typography>
          </Box>
          {form.datasets.filter(d=>d).map((d,i)=>(
            <Box key={i} sx={{ display:'flex', alignItems:'center', gap:0.75, p:1, border:`1px solid ${theme.palette.divider}`, borderRadius:1.5, mb:0.75 }}>
              <UploadIcon sx={{ fontSize:14, color:ACCENT }} />
              <Typography sx={{ fontSize:12, flex:1 }}>{d}</Typography>
              <Button size="small" onClick={() => setForm(f=>({...f, datasets:f.datasets.map((x,j)=>j===i?'':x)}))}
                sx={{ p:0, minWidth:0, fontSize:11, color:'text.disabled' }}>✕</Button>
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p:2, pt:0 }}>
        <Button onClick={onClose} sx={{ textTransform:'none' }}>Cancel</Button>
        <Button variant="contained" onClick={handle} disabled={saving || !form.project_id || !form.justification.trim() || form.datasets.filter(d=>d).length===0}
          sx={{ bgcolor:ACCENT, textTransform:'none', borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
          {saving ? 'Submitting…' : 'Submit Request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function DataImportsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark  = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [projects, setProjects] = useState([]);
  const [newOpen, setNewOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUser().then(u => { if (!u) router.push('/login'); else loadData(); });
  }, []);

  const loadData = async () => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [reqRes, projRes] = await Promise.all([
        axios.get(`${API}/research/data-import`, { headers }),
        axios.get(`${API}/research/projects`, { headers }).catch(() => ({ data:[] })),
      ]);
      setRequests(reqRes.data || []);
      setProjects(projRes.data || []);
    } catch (e) { setError('Failed to load data'); }
    finally { setLoading(false); }
  };

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  const statusCounts = {
    pending: requests.filter(r=>r.status==='pending').length,
    approved: requests.filter(r=>r.status==='approved').length,
    rejected: requests.filter(r=>r.status==='rejected').length,
    expired: requests.filter(r=>r.status==='expired').length,
  };

  return (
    <Box sx={{ p:3 }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:3 }}>
        <Box>
          <Typography sx={{ fontSize:22, fontWeight:700 }}>Data Import Requests</Typography>
          <Typography sx={{ fontSize:13, color:'text.secondary', mt:0.3 }}>Request authorization to import project-specific datasets</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNewOpen(true)}
          sx={{ bgcolor:ACCENT, textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
          New Request
        </Button>
      </Box>

      <Box sx={{ display:'flex', gap:1.5, mb:3, flexWrap:'wrap' }}>
        {[
          { label:'Pending', value:statusCounts.pending, color:'#f59e0b' },
          { label:'Approved', value:statusCounts.approved, color:'#10b981' },
          { label:'Rejected', value:statusCounts.rejected, color:'#ef4444' },
          { label:'Expired', value:statusCounts.expired, color:'#64748b' },
        ].map(s => (
          <Box key={s.label} sx={{ flex:'1 1 120px', bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2, p:1.5, textAlign:'center' }}>
            <Typography sx={{ fontSize:20, fontWeight:700, color:s.color }}>{s.value}</Typography>
            <Typography sx={{ fontSize:11, color:'text.secondary', fontWeight:600 }}>{s.label}</Typography>
          </Box>
        ))}
      </Box>

      {error && <Alert severity="error" sx={{ mb:2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper elevation={0} variant="outlined" sx={{ borderRadius:2.5, overflow:'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ '& th':{ bgcolor: dark?'#0f172a':'background.default', color:'text.secondary', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, borderBottom:`1px solid ${theme.palette.divider}` } }}>
              <TableRow>
                <TableCell>Project</TableCell>
                <TableCell>Datasets</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign:'center', py:4, color:'text.secondary' }}>
                    <HistoryIcon sx={{ fontSize:36, mb:1 }} />
                    <Typography sx={{ fontSize:13 }}>No import requests yet.</Typography>
                  </TableCell>
                </TableRow>
              ) : requests.map(req => (
                <TableRow key={req.id} sx={{ '&:hover':{ bgcolor: dark?'#0f172a':'rgba(0,0,0,0.02)' } }}>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Box>
                      <Typography sx={{ fontSize:12, fontWeight:600, color:'text.primary' }}>{req.project_title}</Typography>
                      <Typography sx={{ fontSize:10, color:'text.disabled' }}>ID {req.id}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    {req.requested_datasets?.length ? req.requested_datasets.map((d,i)=>(
                      <Typography key={i} sx={{ fontSize:11, color:'text.secondary' }}>• {d}</Typography>
                    )) : <Typography sx={{ fontSize:11, color:'text.disabled' }}>—</Typography>}
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Typography sx={{ fontSize:11 }}>{req.access_duration_months} month{req.access_duration_months !== 1 ? 's' : ''}</Typography>
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Chip label={req.status} size="small"
                      sx={{ fontSize:9, fontWeight:700, textTransform:'capitalize',
                        bgcolor:statusColor(req.status)+'22', color:statusColor(req.status) }} />
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Typography sx={{ fontSize:11 }}>{fmtDate(req.expires_at)}</Typography>
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Typography sx={{ fontSize:11 }}>{fmtDate(req.created_at)}</Typography>
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    {req.status === 'pending' && (
                      <Tooltip title="Withdraw request">
                        <IconButton size="small" sx={{ color:'text.disabled' }}>
                          <RejectedIcon sx={{ fontSize:14 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <NewImportDialog open={newOpen} onClose={() => setNewOpen(false)} projects={projects} onCreated={loadData} />
    </Box>
  );
}
