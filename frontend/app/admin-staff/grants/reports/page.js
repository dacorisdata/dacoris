'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  LinearProgress, Alert,
} from '@mui/material';
import { Download as DownloadIcon, Add as AddIcon, Warning as WarnIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';

const MOCK_REPORTS = [
  { id:1, award:'WA-2023-001', funder:'Wellcome Trust', type:'Progress Report', period:'Q1 2024', due:'2024-03-31', status:'Submitted', submitted:'2024-03-28' },
  { id:2, award:'WA-2023-002', funder:'BMGF', type:'Financial Report', period:'H1 2024', due:'2024-04-15', status:'In Preparation', submitted:null },
  { id:3, award:'WA-2022-005', funder:'USAID Kenya', type:'Final Report', period:'Full Programme', due:'2024-04-01', status:'Overdue', submitted:null },
  { id:4, award:'WA-2023-003', funder:'AfDB', type:'Progress Report', period:'Q2 2024', due:'2024-06-30', status:'Not Started', submitted:null },
  { id:5, award:'WA-2022-008', funder:'ERC', type:'Technical Report', period:'Year 2', due:'2024-05-01', status:'Submitted', submitted:'2024-04-29' },
  { id:6, award:'WA-2023-004', funder:'KNRF', type:'Financial Report', period:'Q1 2024', due:'2024-03-31', status:'Submitted', submitted:'2024-03-30' },
];

const CLOSEOUT = [
  { award:'WA-2021-010', title:'Rural Health Innovation', end:'2024-01-31', checklist:{ finalReport:true, auditCert:true, assetReturn:false, dataArchived:false } },
  { award:'WA-2021-012', title:'Digital Literacy Programme', end:'2024-02-28', checklist:{ finalReport:true, auditCert:false, assetReturn:false, dataArchived:false } },
];

const sColor = s => ({ Submitted:'#10b981','In Preparation':'#0ea5e9', Overdue:'#ef4444','Not Started':'#64748b' }[s] || '#64748b');

export default function GrantReportsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser().then(u => { if (!u) router.push('/login'); else setLoading(false); });
  }, []);

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  const overdue = MOCK_REPORTS.filter(r => r.status === 'Overdue').length;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'text.primary' }}>Reports & Compliance</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.3 }}>Track funder report submissions, closeout checklists, and compliance deadlines</Typography>
        </Box>
        <Button variant="contained" size="small" startIcon={<DownloadIcon />}
          sx={{ bgcolor:'#8b5cf6', textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#7c3aed' } }}>
          Export Pack
        </Button>
      </Box>

      {overdue > 0 && (
        <Alert severity="error" icon={<WarnIcon />} sx={{ mb: 3 }}>
          {overdue} report(s) are overdue. Immediate action required to avoid funder non-compliance.
        </Alert>
      )}

      {/* Status summary */}
      <Box sx={{ display:'flex', gap: 2, mb: 3, flexWrap:'wrap' }}>
        {['Submitted','In Preparation','Overdue','Not Started'].map(s => {
          const c = MOCK_REPORTS.filter(r => r.status === s).length;
          return (
            <Box key={s} sx={{ flex:'1 1 140px', bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2, p:1.5 }}>
              <Typography sx={{ fontSize:22, fontWeight:700, color: sColor(s) }}>{c}</Typography>
              <Typography sx={{ fontSize:11, color:'text.secondary', fontWeight:600 }}>{s}</Typography>
            </Box>
          );
        })}
      </Box>

      <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 1.5 }}>Funder Report Schedule</Typography>
      <Box sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:3, overflow:'hidden', mb:4 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th':{ bgcolor: dark?'#0f172a':'background.default', color:'text.secondary', fontSize:11, fontWeight:700, textTransform:'uppercase', borderBottom:`1px solid ${theme.palette.divider}` } }}>
                <TableCell>Award</TableCell><TableCell>Funder</TableCell><TableCell>Report Type</TableCell>
                <TableCell>Period</TableCell><TableCell>Due</TableCell><TableCell>Status</TableCell><TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {MOCK_REPORTS.map(r => (
                <TableRow key={r.id} sx={{ '&:hover':{ bgcolor: dark?'#0f172a':'rgba(0,0,0,0.02)' } }}>
                  <TableCell sx={{ fontSize:12, fontWeight:600, color:'text.primary', borderBottom:`1px solid ${theme.palette.divider}` }}>{r.award}</TableCell>
                  <TableCell sx={{ fontSize:12, color:'text.secondary', borderBottom:`1px solid ${theme.palette.divider}` }}>{r.funder}</TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Chip label={r.type} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor:'rgba(139,92,246,0.1)', color:'#8b5cf6' }} />
                  </TableCell>
                  <TableCell sx={{ fontSize:12, color:'text.secondary', borderBottom:`1px solid ${theme.palette.divider}` }}>{r.period}</TableCell>
                  <TableCell sx={{ fontSize:12, color: r.status==='Overdue'?'#ef4444':'text.secondary', fontWeight: r.status==='Overdue'?700:400, borderBottom:`1px solid ${theme.palette.divider}` }}>
                    {new Date(r.due).toLocaleDateString('en-GB')}
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Chip label={r.status} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor: sColor(r.status)+'22', color: sColor(r.status) }} />
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Button size="small" sx={{ color:'#8b5cf6', textTransform:'none', fontSize:11, fontWeight:600 }}>
                      {r.status === 'Submitted' ? 'Download' : 'Submit'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Closeout Checklists */}
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 1.5 }}>Closeout Checklists</Typography>
      <Box sx={{ display:'flex', flexDirection:'column', gap: 2 }}>
        {CLOSEOUT.map(a => {
          const done = Object.values(a.checklist).filter(Boolean).length;
          const total = Object.keys(a.checklist).length;
          const pct = Math.round((done/total)*100);
          return (
            <Box key={a.award} sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2.5, p:2.5 }}>
              <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:1.5 }}>
                <Box>
                  <Typography sx={{ fontSize:13, fontWeight:700, color:'text.primary' }}>{a.title}</Typography>
                  <Typography sx={{ fontSize:11, color:'text.secondary' }}>{a.award} · Ended {new Date(a.end).toLocaleDateString('en-GB')}</Typography>
                </Box>
                <Chip label={`${done}/${total} complete`} size="small" sx={{ bgcolor: pct===100?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)', color: pct===100?'#10b981':'#ef4444', fontWeight:700, fontSize:11 }} />
              </Box>
              <LinearProgress variant="determinate" value={pct} sx={{ height:6, borderRadius:3, mb:1.5, bgcolor:'rgba(0,0,0,0.08)', '& .MuiLinearProgress-bar':{ bgcolor: pct===100?'#10b981':'#f59e0b' } }} />
              <Box sx={{ display:'flex', gap:1, flexWrap:'wrap' }}>
                {Object.entries(a.checklist).map(([k,v]) => (
                  <Chip key={k} label={k.replace(/([A-Z])/g,' $1').trim()} size="small"
                    sx={{ fontSize:10, fontWeight:600, bgcolor: v?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)', color: v?'#10b981':'#ef4444' }} />
                ))}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
