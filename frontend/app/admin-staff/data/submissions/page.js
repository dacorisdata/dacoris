'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme, TextField,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  LinearProgress, Select, MenuItem, FormControl, InputLabel, Alert,
} from '@mui/material';
import { Search as SearchIcon, CheckCircle as PassIcon, Cancel as FailIcon, Warning as WarnIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';

const MOCK_SUBMISSIONS = [
  { id:1, form:'Household Nutrition Survey 2024', submittedAt:'2024-03-15T09:22:00', submittedBy:'Field Enumerator A', source:'kobo', qaStatus:'cleaned', issues:0 },
  { id:2, form:'TB Patient Follow-up Form', submittedAt:'2024-03-15T10:45:00', submittedBy:'Clinic Nurse B', source:'redcap', qaStatus:'flagged', issues:2 },
  { id:3, form:'Community Water Quality Assessment', submittedAt:'2024-03-14T16:00:00', submittedBy:'Field Enumerator C', source:'odk', qaStatus:'raw', issues:0 },
  { id:4, form:'Malaria RDT Log', submittedAt:'2024-03-15T08:30:00', submittedBy:'Lab Technician D', source:'internal', qaStatus:'cleaned', issues:0 },
  { id:5, form:'Household Nutrition Survey 2024', submittedAt:'2024-03-14T14:20:00', submittedBy:'Field Enumerator E', source:'kobo', qaStatus:'rejected', issues:5 },
  { id:6, form:'TB Patient Follow-up Form', submittedAt:'2024-03-13T11:15:00', submittedBy:'Clinic Nurse F', source:'redcap', qaStatus:'staged', issues:0 },
  { id:7, form:'Staff Digital Literacy Survey', submittedAt:'2024-02-28T17:00:00', submittedBy:'Staff Member G', source:'msforms', qaStatus:'cleaned', issues:0 },
];

const QA_STAGES = ['raw','staged','cleaned','flagged','rejected'];
const qaColor = s => ({ raw:'#64748b', staged:'#0ea5e9', cleaned:'#10b981', flagged:'#f59e0b', rejected:'#ef4444' }[s] || '#64748b');
const qaIcon = s => ({ cleaned:<PassIcon sx={{ fontSize:14, color:'#10b981' }} />, rejected:<FailIcon sx={{ fontSize:14, color:'#ef4444' }} />, flagged:<WarnIcon sx={{ fontSize:14, color:'#f59e0b' }} /> }[s]);

export default function SubmissionsQAPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [qaFilter, setQaFilter] = useState('all');

  useEffect(() => {
    fetchUser().then(u => { if (!u) router.push('/login'); else setLoading(false); });
  }, []);

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  const filtered = MOCK_SUBMISSIONS.filter(s =>
    (qaFilter === 'all' || s.qaStatus === qaFilter) &&
    (!search || s.form.toLowerCase().includes(search.toLowerCase()))
  );

  const cleaned  = MOCK_SUBMISSIONS.filter(s => s.qaStatus === 'cleaned').length;
  const flagged  = MOCK_SUBMISSIONS.filter(s => s.qaStatus === 'flagged').length;
  const rejected = MOCK_SUBMISSIONS.filter(s => s.qaStatus === 'rejected').length;
  const passRate = Math.round((cleaned / MOCK_SUBMISSIONS.length) * 100);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'text.primary' }}>Submissions & QA Pipeline</Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.3 }}>Quality-controlled data processing — raw ingestion → staging → QA checks → cleaned dataset</Typography>
      </Box>

      {flagged > 0 && <Alert severity="warning" sx={{ mb: 3 }}>⚠ {flagged} submission(s) have QA flags requiring manual review.</Alert>}
      {rejected > 0 && <Alert severity="error" sx={{ mb: 2 }}>{rejected} submission(s) rejected — check quarantine zone for details.</Alert>}

      {/* Pipeline flow */}
      <Box sx={{ display:'flex', gap:0, mb: 3, bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2.5, overflow:'hidden' }}>
        {QA_STAGES.map((stage, i) => {
          const count = MOCK_SUBMISSIONS.filter(s => s.qaStatus === stage).length;
          return (
            <Box key={stage} sx={{ flex:1, p:1.5, borderRight: i < QA_STAGES.length-1 ? `1px solid ${theme.palette.divider}` : 'none', textAlign:'center' }}>
              <Typography sx={{ fontSize:18, fontWeight:700, color: qaColor(stage) }}>{count}</Typography>
              <Typography sx={{ fontSize:10, fontWeight:600, color:'text.secondary', textTransform:'capitalize' }}>{stage}</Typography>
            </Box>
          );
        })}
        <Box sx={{ flex:1, p:1.5, textAlign:'center', bgcolor: dark?'rgba(16,185,129,0.05)':'rgba(16,185,129,0.03)' }}>
          <Typography sx={{ fontSize:18, fontWeight:700, color:'#10b981' }}>{passRate}%</Typography>
          <Typography sx={{ fontSize:10, fontWeight:600, color:'text.secondary' }}>Pass Rate</Typography>
        </Box>
      </Box>

      {/* QA pass bar */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display:'flex', justifyContent:'space-between', mb:0.5 }}>
          <Typography sx={{ fontSize:11, color:'text.secondary' }}>Overall QA Pass Rate</Typography>
          <Typography sx={{ fontSize:11, fontWeight:700, color: passRate > 70 ? '#10b981' : '#f59e0b' }}>{passRate}%</Typography>
        </Box>
        <LinearProgress variant="determinate" value={passRate} sx={{ height:8, borderRadius:4, bgcolor:'rgba(0,0,0,0.08)', '& .MuiLinearProgress-bar':{ bgcolor: passRate > 70 ? '#10b981' : '#f59e0b', borderRadius:4 } }} />
      </Box>

      {/* Filters */}
      <Box sx={{ display:'flex', gap:2, mb:2.5, flexWrap:'wrap' }}>
        <TextField placeholder="Search by form name…" value={search} onChange={e => setSearch(e.target.value)} size="small"
          InputProps={{ startAdornment: <SearchIcon sx={{ fontSize:18, color:'text.disabled', mr:1 }} /> }}
          sx={{ flex:'1 1 260px', '& .MuiOutlinedInput-root':{ borderRadius:2 } }} />
        <FormControl size="small" sx={{ minWidth:160 }}>
          <InputLabel>QA Status</InputLabel>
          <Select value={qaFilter} onChange={e => setQaFilter(e.target.value)} label="QA Status" sx={{ borderRadius:2 }}>
            <MenuItem value="all">All Statuses</MenuItem>
            {QA_STAGES.map(s => <MenuItem key={s} value={s} sx={{ textTransform:'capitalize' }}>{s}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:3, overflow:'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th':{ bgcolor: dark?'#0f172a':'background.default', color:'text.secondary', fontSize:11, fontWeight:700, textTransform:'uppercase', borderBottom:`1px solid ${theme.palette.divider}` } }}>
                <TableCell>Form</TableCell><TableCell>Submitted By</TableCell><TableCell>Source</TableCell>
                <TableCell>Time</TableCell><TableCell>QA Status</TableCell><TableCell>Issues</TableCell><TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(s => (
                <TableRow key={s.id} sx={{ '&:hover':{ bgcolor: dark?'#0f172a':'rgba(0,0,0,0.02)' } }}>
                  <TableCell sx={{ fontSize:13, fontWeight:600, color:'text.primary', borderBottom:`1px solid ${theme.palette.divider}` }}>{s.form}</TableCell>
                  <TableCell sx={{ fontSize:12, color:'text.secondary', borderBottom:`1px solid ${theme.palette.divider}` }}>{s.submittedBy}</TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Chip label={s.source.toUpperCase()} size="small" sx={{ fontSize:9, fontWeight:700, bgcolor:'rgba(28,167,161,0.1)', color:'#1ca7a1' }} />
                  </TableCell>
                  <TableCell sx={{ fontSize:11, color:'text.secondary', borderBottom:`1px solid ${theme.palette.divider}` }}>{new Date(s.submittedAt).toLocaleString('en-GB', { hour12:false, dateStyle:'short', timeStyle:'short' })}</TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Box sx={{ display:'flex', alignItems:'center', gap:0.5 }}>
                      {qaIcon(s.qaStatus)}
                      <Chip label={s.qaStatus} size="small" sx={{ fontSize:10, fontWeight:600, textTransform:'capitalize', bgcolor: qaColor(s.qaStatus)+'22', color: qaColor(s.qaStatus) }} />
                    </Box>
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    {s.issues > 0 ? <Chip label={`${s.issues} issues`} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor:'rgba(239,68,68,0.1)', color:'#ef4444' }} />
                    : <Typography sx={{ fontSize:11, color:'#10b981' }}>Clean</Typography>}
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Button size="small" sx={{ color:'#1ca7a1', textTransform:'none', fontSize:11, fontWeight:600 }}>Review</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}
