'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Chip, CircularProgress, Button, useTheme, Table, TableHead, TableRow, TableCell, TableBody, TableContainer } from '@mui/material';
import { Add as AddIcon, CloudUpload as UploadIcon, Link as DoiIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';

const DATASETS = [
  { id:1, title:'Malaria RDT Records – Kisumu Sentinel Sites Q1 2024', project:'ML Malaria Detection', records:544, version:'v0.9', access:'Confidential', status:'Draft', qaStatus:'cleaned', doi:null },
  { id:2, title:'Kenya Household Nutrition Cohort – Round 4', project:'Nutrition Follow-up', records:320, version:'v1.0', access:'Restricted', status:'Published', qaStatus:'cleaned', doi:'10.5281/zenodo.8001234' },
  { id:3, title:'TB Genomic Sequences – Batch 1 (Kenya)', project:'TB Genomic Surveillance', records:156, version:'v2.0', access:'Restricted', status:'Published', qaStatus:'cleaned', doi:'10.5281/zenodo.7998765' },
];

const accessColor = a => ({ Public:'#10b981', Restricted:'#f59e0b', Confidential:'#ef4444' }[a] || '#64748b');
const statusColor = s => ({ Published:'#10b981', Draft:'#64748b','Under Review':'#0ea5e9' }[s] || '#64748b');
const qaColor     = s => ({ cleaned:'#10b981', flagged:'#f59e0b', raw:'#64748b', rejected:'#ef4444' }[s] || '#64748b');

export default function ResearcherDatasetsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchUser().then(u => { if (!u) router.push('/login'); else setLoading(false); }); }, []);

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p:3 }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:3 }}>
        <Box>
          <Typography sx={{ fontSize:22, fontWeight:700, color:'text.primary' }}>My Datasets</Typography>
          <Typography sx={{ fontSize:13, color:'text.secondary', mt:0.3 }}>Research datasets linked to your projects — version controlled, QA-checked, and repository-ready</Typography>
        </Box>
        <Box sx={{ display:'flex', gap:1 }}>
          <Button variant="outlined" size="small" startIcon={<UploadIcon />} sx={{ textTransform:'none', fontSize:12, fontWeight:600, borderRadius:2, borderColor:'#1ca7a1', color:'#1ca7a1' }}>Upload CSV</Button>
          <Button variant="contained" size="small" startIcon={<AddIcon />} sx={{ bgcolor:'#1ca7a1', textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>Create Dataset</Button>
        </Box>
      </Box>

      <Box sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:3, overflow:'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th':{ bgcolor: dark?'#0f172a':'background.default', color:'text.secondary', fontSize:11, fontWeight:700, textTransform:'uppercase', borderBottom:`1px solid ${theme.palette.divider}` } }}>
                <TableCell>Dataset</TableCell><TableCell>Project</TableCell><TableCell>Records</TableCell>
                <TableCell>Version</TableCell><TableCell>QA</TableCell><TableCell>Access</TableCell>
                <TableCell>DOI</TableCell><TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {DATASETS.map(d => (
                <TableRow key={d.id} sx={{ '&:hover':{ bgcolor: dark?'#0f172a':'rgba(0,0,0,0.02)' } }}>
                  <TableCell sx={{ fontSize:13, fontWeight:600, color:'text.primary', borderBottom:`1px solid ${theme.palette.divider}`, maxWidth:240 }}>{d.title}</TableCell>
                  <TableCell sx={{ fontSize:12, color:'text.secondary', borderBottom:`1px solid ${theme.palette.divider}` }}>{d.project}</TableCell>
                  <TableCell sx={{ fontSize:13, fontWeight:600, color:'text.primary', borderBottom:`1px solid ${theme.palette.divider}` }}>{d.records.toLocaleString()}</TableCell>
                  <TableCell sx={{ fontSize:12, color:'text.secondary', borderBottom:`1px solid ${theme.palette.divider}`, fontFamily:'monospace' }}>{d.version}</TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Chip label={d.qaStatus} size="small" sx={{ fontSize:10, fontWeight:600, textTransform:'capitalize', bgcolor: qaColor(d.qaStatus)+'22', color: qaColor(d.qaStatus) }} />
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Chip label={d.access} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor: accessColor(d.access)+'22', color: accessColor(d.access) }} />
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    {d.doi ? <Box sx={{ display:'flex', alignItems:'center', gap:0.5 }}><DoiIcon sx={{ fontSize:11, color:'#8b5cf6' }} /><Typography sx={{ fontSize:10, color:'#8b5cf6', fontFamily:'monospace' }}>{d.doi.slice(-10)}</Typography></Box>
                    : <Button size="small" sx={{ color:'#8b5cf6', textTransform:'none', fontSize:10, fontWeight:600, p:0, minWidth:0 }}>Request DOI</Button>}
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Chip label={d.status} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor: statusColor(d.status)+'22', color: statusColor(d.status) }} />
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
