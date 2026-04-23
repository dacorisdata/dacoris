'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme, Alert, Paper,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import axios from 'axios';
import { useAuth } from '../../../../contexts/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#1ca7a1';
const qaColor = s => ({ staged:'#0ea5e9', passed:'#10b981', failed:'#f59e0b', quarantined:'#ef4444' }[s] || '#64748b');
const fmtTime = d => d ? new Date(d).toLocaleString('en-GB',{dateStyle:'short',timeStyle:'short',hour12:false}) : '—';

export default function ResearcherSubmissionsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState({});
  const [error, setError] = useState('');

  useEffect(() => { fetchUser().then(u => { if (!u) router.push('/login'); else loadForms(); }); }, []);

  const loadForms = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${API}/data/forms`, { headers:{ Authorization:`Bearer ${token}` } });
      setForms(res.data || []);
      if (res.data?.length) { setSelectedForm(res.data[0].id); await loadSubmissions(res.data[0].id); }
    } catch { setError('Failed to load forms'); }
    setLoading(false);
  };

  const loadSubmissions = async (formId) => {
    if (!formId) return;
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${API}/data/forms/${formId}/submissions`, { headers:{ Authorization:`Bearer ${token}` } });
      setSubmissions(res.data?.submissions || []);
      setStats({ total:res.data?.total||0, staged:res.data?.staged||0, passed:res.data?.passed||0, failed:res.data?.failed||0, quarantined:res.data?.quarantined||0 });
    } catch { setSubmissions([]); setStats({}); }
  };

  const handleFormChange = async (fid) => { setSelectedForm(fid); await loadSubmissions(fid); };

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p:3 }}>
      <Box sx={{ mb:3 }}>
        <Typography sx={{ fontSize:22, fontWeight:700 }}>My Submissions</Typography>
        <Typography sx={{ fontSize:13, color:'text.secondary', mt:0.3 }}>Data form submissions and their QA pipeline status</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb:2 }} onClose={() => setError('')}>{error}</Alert>}

      {forms.length > 0 && (
        <Box sx={{ display:'flex', gap:2, mb:3, alignItems:'center', flexWrap:'wrap' }}>
          <FormControl size="small" sx={{ minWidth:280 }}>
            <InputLabel>Select Form</InputLabel>
            <Select value={selectedForm} onChange={e => handleFormChange(e.target.value)} label="Select Form" sx={{ borderRadius:2 }}>
              {forms.map(f => <MenuItem key={f.id} value={f.id}>{f.title}</MenuItem>)}
            </Select>
          </FormControl>
          {stats.total > 0 && (
            <Box sx={{ display:'flex', gap:1 }}>
              {['staged','passed','failed','quarantined'].map(st => (
                <Chip key={st} label={`${stats[st]||0} ${st}`} size="small"
                  sx={{ fontSize:10, fontWeight:600, textTransform:'capitalize', bgcolor:qaColor(st)+'22', color:qaColor(st) }} />
              ))}
            </Box>
          )}
        </Box>
      )}

      {forms.length === 0 ? (
        <Box sx={{ textAlign:'center', py:6 }}>
          <Typography sx={{ color:'text.secondary', fontWeight:600 }}>No forms found</Typography>
          <Typography sx={{ color:'text.disabled', fontSize:13 }}>Create a capture form first to start submitting data.</Typography>
        </Box>
      ) : (
        <Paper elevation={0} variant="outlined" sx={{ borderRadius:2.5, overflow:'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ '& th':{ bgcolor:dark?'#0f172a':'background.default', color:'text.secondary', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, borderBottom:`1px solid ${theme.palette.divider}` } }}>
                <TableRow>
                  <TableCell>ID</TableCell><TableCell>Source</TableCell><TableCell>Submitted</TableCell>
                  <TableCell>QA Status</TableCell><TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {submissions.length === 0 ? (
                  <TableRow><TableCell colSpan={5} sx={{ textAlign:'center', py:4, color:'text.secondary' }}>
                    <Typography sx={{ fontSize:13 }}>No submissions for this form yet.</Typography>
                  </TableCell></TableRow>
                ) : submissions.map(s => (
                  <TableRow key={s.id} sx={{ '&:hover':{ bgcolor:dark?'#0f172a':'rgba(0,0,0,0.02)' } }}>
                    <TableCell sx={{ fontSize:12, fontWeight:600, borderBottom:`1px solid ${theme.palette.divider}` }}>#{s.id}</TableCell>
                    <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                      <Chip label={(s.source_system||'internal').toUpperCase()} size="small" sx={{ fontSize:9, fontWeight:700, bgcolor:`${ACCENT}18`, color:ACCENT }} />
                    </TableCell>
                    <TableCell sx={{ fontSize:11, color:'text.secondary', borderBottom:`1px solid ${theme.palette.divider}` }}>{fmtTime(s.submitted_at)}</TableCell>
                    <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                      <Chip label={s.qa_status} size="small" sx={{ fontSize:10, fontWeight:600, textTransform:'capitalize', bgcolor:qaColor(s.qa_status)+'22', color:qaColor(s.qa_status) }} />
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
    </Box>
  );
}
