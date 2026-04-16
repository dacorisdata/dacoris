'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, CircularProgress, useTheme, Button, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Alert,
} from '@mui/material';
import { Add as AddIcon, CheckCircle as ApproveIcon, Cancel as RejectIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';

const DISB = [
  { id:1, award:'WA-2023-001', funder:'Wellcome Trust', amount:'USD 50,000', type:'Milestone', milestone:'M2 – Data Collection Complete', due:'2024-03-31', status:'Pending Approval', requestedBy:'Dr. Aisha Wambua' },
  { id:2, award:'WA-2023-002', funder:'BMGF', amount:'USD 75,000', type:'Scheduled', milestone:'Q1 2024 Instalment', due:'2024-03-15', status:'Approved', requestedBy:'Prof. David Kiprotich' },
  { id:3, award:'WA-2022-005', funder:'USAID Kenya', amount:'KES 1,200,000', type:'Milestone', milestone:'M1 – Ethics Approved', due:'2024-02-28', status:'Released', requestedBy:'KEMRI Lab Sciences' },
  { id:4, award:'WA-2023-003', funder:'AfDB', amount:'USD 30,000', type:'Scheduled', milestone:'Q2 2024 Instalment', due:'2024-06-15', status:'Scheduled', requestedBy:'WaterAid Kenya' },
  { id:5, award:'WA-2023-004', funder:'KNRF', amount:'KES 800,000', type:'Milestone', milestone:'M3 – Interim Report Submitted', due:'2024-04-10', status:'Pending Approval', requestedBy:'Agri-Research Consortium' },
];

const sColor = s => ({ 'Pending Approval':'#f59e0b', Approved:'#0ea5e9', Released:'#10b981', Scheduled:'#64748b', Rejected:'#ef4444' }[s] || '#64748b');
const tColor  = t => ({ Milestone:'#8b5cf6', Scheduled:'#0ea5e9' }[t] || '#64748b');

export default function DisbursementsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchUser().then(u => { if (!u) router.push('/login'); else setLoading(false); }); }, []);

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  const pending  = DISB.filter(d => d.status === 'Pending Approval').length;
  const released = DISB.filter(d => d.status === 'Released').length;

  return (
    <Box sx={{ p:3 }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:3 }}>
        <Box>
          <Typography sx={{ fontSize:22, fontWeight:700, color:'text.primary' }}>Disbursements</Typography>
          <Typography sx={{ fontSize:13, color:'text.secondary', mt:0.3 }}>Payment requests, milestone-based disbursements, and approval chains (maker-checker)</Typography>
        </Box>
        <Button variant="contained" size="small" startIcon={<AddIcon />}
          sx={{ bgcolor:'#f59e0b', textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#d97706' } }}>
          New Payment Request
        </Button>
      </Box>

      {pending > 0 && <Alert severity="warning" sx={{ mb:3 }}>⚠ {pending} payment request(s) are awaiting your approval.</Alert>}

      <Box sx={{ display:'flex', gap:2, mb:3, flexWrap:'wrap' }}>
        {[{ label:'Pending Approval', value: pending, color:'#f59e0b' },
          { label:'Approved', value: DISB.filter(d => d.status==='Approved').length, color:'#0ea5e9' },
          { label:'Released', value: released, color:'#10b981' },
          { label:'Scheduled', value: DISB.filter(d => d.status==='Scheduled').length, color:'#64748b' },
        ].map(k => (
          <Box key={k.label} sx={{ flex:'1 1 140px', bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2.5, p:2 }}>
            <Typography sx={{ fontSize:11, color:'text.secondary', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>{k.label}</Typography>
            <Typography sx={{ fontSize:24, fontWeight:700, color: k.color, mt:0.5 }}>{k.value}</Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:3, overflow:'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th':{ bgcolor: dark?'#0f172a':'background.default', color:'text.secondary', fontSize:11, fontWeight:700, textTransform:'uppercase', borderBottom:`1px solid ${theme.palette.divider}` } }}>
                <TableCell>Award</TableCell><TableCell>Funder</TableCell><TableCell>Type</TableCell>
                <TableCell>Milestone / Period</TableCell><TableCell>Amount</TableCell><TableCell>Due</TableCell>
                <TableCell>Status</TableCell><TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {DISB.map(d => (
                <TableRow key={d.id} sx={{ '&:hover':{ bgcolor: dark?'#0f172a':'rgba(0,0,0,0.02)' } }}>
                  <TableCell sx={{ fontSize:12, fontWeight:600, color:'text.primary', borderBottom:`1px solid ${theme.palette.divider}` }}>{d.award}</TableCell>
                  <TableCell sx={{ fontSize:12, color:'text.secondary', borderBottom:`1px solid ${theme.palette.divider}` }}>{d.funder}</TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Chip label={d.type} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor: tColor(d.type)+'22', color: tColor(d.type) }} />
                  </TableCell>
                  <TableCell sx={{ fontSize:12, color:'text.secondary', borderBottom:`1px solid ${theme.palette.divider}`, maxWidth:180 }}>{d.milestone}</TableCell>
                  <TableCell sx={{ fontSize:13, fontWeight:700, color:'text.primary', borderBottom:`1px solid ${theme.palette.divider}` }}>{d.amount}</TableCell>
                  <TableCell sx={{ fontSize:12, color:'text.secondary', borderBottom:`1px solid ${theme.palette.divider}` }}>{new Date(d.due).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Chip label={d.status} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor: sColor(d.status)+'22', color: sColor(d.status) }} />
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    {d.status === 'Pending Approval' ? (
                      <Box sx={{ display:'flex', gap:0.5 }}>
                        <Button size="small" startIcon={<ApproveIcon sx={{ fontSize:'12px !important' }} />} sx={{ color:'#10b981', textTransform:'none', fontSize:11, fontWeight:600 }}>Approve</Button>
                        <Button size="small" startIcon={<RejectIcon sx={{ fontSize:'12px !important' }} />} sx={{ color:'#ef4444', textTransform:'none', fontSize:11 }}>Reject</Button>
                      </Box>
                    ) : <Button size="small" sx={{ color:'#f59e0b', textTransform:'none', fontSize:11, fontWeight:600 }}>View</Button>}
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
