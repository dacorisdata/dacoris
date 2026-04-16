'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Chip, CircularProgress, Button, useTheme, Table, TableHead, TableRow, TableCell, TableBody, TableContainer } from '@mui/material';
import { useAuth } from '../../../../contexts/AuthContext';

const SUBMISSIONS = [
  { id:1, form:'Malaria RDT Diagnostic Log', submittedAt:'2024-03-15T09:22:00', qaStatus:'cleaned', issues:0 },
  { id:2, form:'Patient Follow-up Interview', submittedAt:'2024-03-14T14:10:00', qaStatus:'flagged', issues:2 },
  { id:3, form:'Household Nutrition Q4', submittedAt:'2024-03-13T10:00:00', qaStatus:'cleaned', issues:0 },
  { id:4, form:'Malaria RDT Diagnostic Log', submittedAt:'2024-03-12T08:45:00', qaStatus:'cleaned', issues:0 },
];

const qaColor = s => ({ cleaned:'#10b981', flagged:'#f59e0b', raw:'#64748b', rejected:'#ef4444' }[s] || '#64748b');

export default function ResearcherSubmissionsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchUser().then(u => { if (!u) router.push('/login'); else setLoading(false); }); }, []);

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p:3 }}>
      <Box sx={{ mb:3 }}>
        <Typography sx={{ fontSize:22, fontWeight:700, color:'text.primary' }}>My Submissions</Typography>
        <Typography sx={{ fontSize:13, color:'text.secondary', mt:0.3 }}>Recent data form submissions and their QA pipeline status</Typography>
      </Box>
      <Box sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:3, overflow:'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th':{ bgcolor: dark?'#0f172a':'background.default', color:'text.secondary', fontSize:11, fontWeight:700, textTransform:'uppercase', borderBottom:`1px solid ${theme.palette.divider}` } }}>
                <TableCell>Form</TableCell><TableCell>Submitted</TableCell><TableCell>QA Status</TableCell><TableCell>Issues</TableCell><TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {SUBMISSIONS.map(s => (
                <TableRow key={s.id} sx={{ '&:hover':{ bgcolor: dark?'#0f172a':'rgba(0,0,0,0.02)' } }}>
                  <TableCell sx={{ fontSize:13, fontWeight:600, color:'text.primary', borderBottom:`1px solid ${theme.palette.divider}` }}>{s.form}</TableCell>
                  <TableCell sx={{ fontSize:12, color:'text.secondary', borderBottom:`1px solid ${theme.palette.divider}` }}>{new Date(s.submittedAt).toLocaleString('en-GB',{dateStyle:'short',timeStyle:'short',hour12:false})}</TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Chip label={s.qaStatus} size="small" sx={{ fontSize:10, fontWeight:600, textTransform:'capitalize', bgcolor: qaColor(s.qaStatus)+'22', color: qaColor(s.qaStatus) }} />
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    {s.issues > 0 ? <Chip label={`${s.issues} issues`} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor:'rgba(239,68,68,0.1)', color:'#ef4444' }} /> : <Typography sx={{ fontSize:11, color:'#10b981' }}>Clean</Typography>}
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Button size="small" sx={{ color:'#1ca7a1', textTransform:'none', fontSize:11, fontWeight:600 }}>View</Button>
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
