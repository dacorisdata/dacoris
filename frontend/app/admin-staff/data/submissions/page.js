'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme, TextField,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  LinearProgress, Select, MenuItem, FormControl, InputLabel, Alert, Paper,
} from '@mui/material';
import { Search as SearchIcon, CheckCircle as PassIcon, Cancel as FailIcon, Warning as WarnIcon } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../../../contexts/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#1ca7a1';
const QA_STAGES = ['staged','passed','failed','quarantined'];
const qaColor = s => ({ staged:'#0ea5e9', passed:'#10b981', failed:'#f59e0b', quarantined:'#ef4444' }[s] || '#64748b');
const qaIcon = s => ({ passed:<PassIcon sx={{ fontSize:14, color:'#10b981' }} />, failed:<FailIcon sx={{ fontSize:14, color:'#ef4444' }} />, quarantined:<WarnIcon sx={{ fontSize:14, color:'#ef4444' }} /> }[s]);
const fmtTime = d => d ? new Date(d).toLocaleString('en-GB',{hour12:false,dateStyle:'short',timeStyle:'short'}) : '—';

export default function SubmissionsQAPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [search, setSearch] = useState('');
  const [qaFilter, setQaFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUser().then(u => { if (!u) router.push('/login'); else loadData(); });
  }, []);

  const loadData = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${API}/data/forms/all-submissions`, { headers:{ Authorization:`Bearer ${token}` } });
      setSubmissions(res.data || []);
    } catch (e) { setError('Failed to load submissions'); }
    finally { setLoading(false); }
  };

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  const filtered = submissions.filter(s =>
    (qaFilter === 'all' || s.qa_status === qaFilter) &&
    (!search || s.form_title?.toLowerCase().includes(search.toLowerCase()))
  );

  const counts = {};
  QA_STAGES.forEach(st => { counts[st] = submissions.filter(s => s.qa_status === st).length; });
  const total = submissions.length;
  const passRate = total > 0 ? Math.round((counts.passed / total) * 100) : 0;

  return (
    <Box sx={{ p:3 }}>
      <Box sx={{ mb:3 }}>
        <Typography sx={{ fontSize:22, fontWeight:700 }}>Submissions & QA Pipeline</Typography>
        <Typography sx={{ fontSize:13, color:'text.secondary', mt:0.3 }}>Quality-controlled data processing — staging → QA checks → passed / failed / quarantined</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb:2 }} onClose={() => setError('')}>{error}</Alert>}
      {counts.failed > 0 && <Alert severity="warning" sx={{ mb:2 }}>{counts.failed} submission(s) have QA failures requiring review.</Alert>}
      {counts.quarantined > 0 && <Alert severity="error" sx={{ mb:2 }}>{counts.quarantined} submission(s) quarantined — check details.</Alert>}

      <Box sx={{ display:'flex', gap:0, mb:3, bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2.5, overflow:'hidden' }}>
        {QA_STAGES.map((stage, i) => (
          <Box key={stage} sx={{ flex:1, p:1.5, borderRight:i<QA_STAGES.length-1?`1px solid ${theme.palette.divider}`:'none', textAlign:'center', cursor:'pointer', '&:hover':{ bgcolor:dark?'#0f172a':'rgba(0,0,0,0.02)' } }}
            onClick={() => setQaFilter(qaFilter === stage ? 'all' : stage)}>
            <Typography sx={{ fontSize:18, fontWeight:700, color:qaColor(stage) }}>{counts[stage] || 0}</Typography>
            <Typography sx={{ fontSize:10, fontWeight:600, color:'text.secondary', textTransform:'capitalize' }}>{stage}</Typography>
          </Box>
        ))}
        <Box sx={{ flex:1, p:1.5, textAlign:'center', bgcolor:dark?'rgba(16,185,129,0.05)':'rgba(16,185,129,0.03)' }}>
          <Typography sx={{ fontSize:18, fontWeight:700, color:'#10b981' }}>{passRate}%</Typography>
          <Typography sx={{ fontSize:10, fontWeight:600, color:'text.secondary' }}>Pass Rate</Typography>
        </Box>
      </Box>

      <Box sx={{ mb:3 }}>
        <Box sx={{ display:'flex', justifyContent:'space-between', mb:0.5 }}>
          <Typography sx={{ fontSize:11, color:'text.secondary' }}>Overall QA Pass Rate</Typography>
          <Typography sx={{ fontSize:11, fontWeight:700, color:passRate>70?'#10b981':'#f59e0b' }}>{passRate}%</Typography>
        </Box>
        <LinearProgress variant="determinate" value={passRate} sx={{ height:8, borderRadius:4, bgcolor:'rgba(0,0,0,0.08)', '& .MuiLinearProgress-bar':{ bgcolor:passRate>70?'#10b981':'#f59e0b', borderRadius:4 } }} />
      </Box>

      <Box sx={{ display:'flex', gap:2, mb:2.5, flexWrap:'wrap' }}>
        <TextField placeholder="Search by form..." value={search} onChange={e => setSearch(e.target.value)} size="small"
          InputProps={{ startAdornment:<SearchIcon sx={{ fontSize:18, color:'text.disabled', mr:1 }} /> }}
          sx={{ flex:'1 1 260px', '& .MuiOutlinedInput-root':{ borderRadius:2 } }} />
        <FormControl size="small" sx={{ minWidth:160 }}>
          <InputLabel>QA Status</InputLabel>
          <Select value={qaFilter} onChange={e => setQaFilter(e.target.value)} label="QA Status" sx={{ borderRadius:2 }}>
            <MenuItem value="all">All Statuses</MenuItem>
            {QA_STAGES.map(s => <MenuItem key={s} value={s} sx={{ textTransform:'capitalize' }}>{s}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <Paper elevation={0} variant="outlined" sx={{ borderRadius:2.5, overflow:'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ '& th':{ bgcolor:dark?'#0f172a':'background.default', color:'text.secondary', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, borderBottom:`1px solid ${theme.palette.divider}` } }}>
              <TableRow>
                <TableCell>Form</TableCell><TableCell>Submitted By</TableCell><TableCell>Source</TableCell>
                <TableCell>Time</TableCell><TableCell>QA Status</TableCell><TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} sx={{ textAlign:'center', py:4, color:'text.secondary' }}>
                  <Typography sx={{ fontSize:13 }}>No submissions found.</Typography>
                </TableCell></TableRow>
              ) : filtered.map(s => (
                <TableRow key={s.id} sx={{ '&:hover':{ bgcolor:dark?'#0f172a':'rgba(0,0,0,0.02)' } }}>
                  <TableCell sx={{ fontSize:12, fontWeight:600, borderBottom:`1px solid ${theme.palette.divider}` }}>{s.form_title || `Form #${s.form_id}`}</TableCell>
                  <TableCell sx={{ fontSize:12, color:'text.secondary', borderBottom:`1px solid ${theme.palette.divider}` }}>{s.submitted_by_name || '—'}</TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Chip label={(s.source_system||'internal').toUpperCase()} size="small" sx={{ fontSize:9, fontWeight:700, bgcolor:`${ACCENT}18`, color:ACCENT }} />
                  </TableCell>
                  <TableCell sx={{ fontSize:11, color:'text.secondary', borderBottom:`1px solid ${theme.palette.divider}` }}>{fmtTime(s.submitted_at)}</TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Box sx={{ display:'flex', alignItems:'center', gap:0.5 }}>
                      {qaIcon(s.qa_status)}
                      <Chip label={s.qa_status} size="small" sx={{ fontSize:10, fontWeight:600, textTransform:'capitalize', bgcolor:qaColor(s.qa_status)+'22', color:qaColor(s.qa_status) }} />
                    </Box>
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Button size="small" sx={{ color:ACCENT, textTransform:'none', fontSize:11, fontWeight:600 }}>Review</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
