'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Avatar, Button, Table, TableHead,
  TableRow, TableCell, TableBody, TableContainer, LinearProgress, useTheme, Alert,
} from '@mui/material';
import { Add as AddIcon, PersonAdd as AssignIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';

const MOCK_REVIEWS = [
  { id:1, proposal:'Community Health Grant – Nairobi County', reviewer:'Dr. Fatuma Hassan', stage:'Panel Review', assigned:'2024-03-10', due:'2024-03-24', status:'In Progress', score:72, coi:false },
  { id:2, proposal:'Maternal Nutrition Research', reviewer:'Prof. Simon Njoroge', stage:'Internal Review', assigned:'2024-03-12', due:'2024-03-20', status:'Submitted', score:85, coi:false },
  { id:3, proposal:'TB Diagnostics Innovation Fund', reviewer:'Dr. Lydia Mwangi', stage:'Panel Review', assigned:'2024-03-08', due:'2024-03-22', status:'Overdue', score:null, coi:false },
  { id:4, proposal:'HIV Prevention Youth Programme', reviewer:'Dr. Ahmed Osman', stage:'Due Diligence', assigned:'2024-03-15', due:'2024-03-29', status:'Assigned', score:null, coi:true },
  { id:5, proposal:'Open Data Infrastructure', reviewer:'Ms. Grace Achieng', stage:'Internal Review', assigned:'2024-03-11', due:'2024-03-25', status:'Submitted', score:78, coi:false },
];

const statusColor = s => ({ 'Submitted':'#10b981','In Progress':'#0ea5e9','Assigned':'#f59e0b','Overdue':'#ef4444','Withdrawn':'#64748b' }[s] || '#64748b');

export default function GrantReviewsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser().then(u => { if (!u) router.push('/login'); else setLoading(false); });
  }, []);

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  const submitted = MOCK_REVIEWS.filter(r => r.status === 'Submitted').length;
  const overdue   = MOCK_REVIEWS.filter(r => r.status === 'Overdue').length;
  const avgScore  = Math.round(MOCK_REVIEWS.filter(r => r.score).reduce((a,r) => a + r.score, 0) / MOCK_REVIEWS.filter(r => r.score).length);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'text.primary' }}>Grant Reviews</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.3 }}>Manage reviewer assignments, scoring, and COI declarations</Typography>
        </Box>
        <Button variant="contained" size="small" startIcon={<AssignIcon />}
          sx={{ bgcolor:'#8b5cf6', textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#7c3aed' } }}>
          Assign Reviewer
        </Button>
      </Box>

      {overdue > 0 && <Alert severity="warning" sx={{ mb: 3 }}>⚠ {overdue} review(s) are overdue — send reminder emails to assignees.</Alert>}

      {/* KPI row */}
      <Box sx={{ display:'flex', gap: 2, mb: 3, flexWrap:'wrap' }}>
        {[{ label:'Total Assignments', value: MOCK_REVIEWS.length, color:'#8b5cf6' },
          { label:'Submitted',         value: submitted,           color:'#10b981' },
          { label:'Overdue',           value: overdue,             color:'#ef4444' },
          { label:'Avg Score',         value: avgScore + '%',      color:'#0ea5e9' }].map(k => (
          <Box key={k.label} sx={{ flex:'1 1 160px', bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2.5, p:2 }}>
            <Typography sx={{ fontSize: 11, color:'text.secondary', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>{k.label}</Typography>
            <Typography sx={{ fontSize: 26, fontWeight: 700, color: k.color, mt: 0.5 }}>{k.value}</Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:3, overflow:'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: dark?'#0f172a':'background.default', color:'text.secondary', fontSize:11, fontWeight:700, textTransform:'uppercase', borderBottom:`1px solid ${theme.palette.divider}` } }}>
                <TableCell>Proposal</TableCell>
                <TableCell>Reviewer</TableCell>
                <TableCell>Stage</TableCell>
                <TableCell>Due</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>COI</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {MOCK_REVIEWS.map(r => (
                <TableRow key={r.id} sx={{ '&:hover':{ bgcolor: dark?'#0f172a':'rgba(0,0,0,0.02)' } }}>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Typography sx={{ fontSize:13, fontWeight:600, color:'text.primary', maxWidth:220 }}>{r.proposal}</Typography>
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                      <Avatar sx={{ width:28, height:28, fontSize:11, bgcolor:'#8b5cf6' }}>{r.reviewer.charAt(0)}</Avatar>
                      <Typography sx={{ fontSize:12, color:'text.secondary' }}>{r.reviewer}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Chip label={r.stage} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor:'rgba(139,92,246,0.1)', color:'#8b5cf6' }} />
                  </TableCell>
                  <TableCell sx={{ fontSize:12, color:'text.secondary', borderBottom:`1px solid ${theme.palette.divider}` }}>{new Date(r.due).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Chip label={r.status} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor: statusColor(r.status)+'22', color: statusColor(r.status) }} />
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    {r.score ? (
                      <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                        <Typography sx={{ fontSize:13, fontWeight:700, color:'text.primary', minWidth:32 }}>{r.score}%</Typography>
                        <LinearProgress variant="determinate" value={r.score} sx={{ width:60, height:4, borderRadius:2, bgcolor:'rgba(0,0,0,0.1)', '& .MuiLinearProgress-bar':{ bgcolor:'#10b981' } }} />
                      </Box>
                    ) : <Typography sx={{ fontSize:12, color:'text.disabled' }}>—</Typography>}
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Chip label={r.coi ? 'COI Declared' : 'Clear'} size="small"
                      sx={{ fontSize:10, fontWeight:600, bgcolor: r.coi?'rgba(239,68,68,0.1)':'rgba(34,197,94,0.1)', color: r.coi?'#ef4444':'#22c55e' }} />
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Button size="small" sx={{ color:'#8b5cf6', textTransform:'none', fontSize:11, fontWeight:600 }}>View</Button>
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
