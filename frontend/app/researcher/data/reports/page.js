'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Chip, CircularProgress, Button, useTheme } from '@mui/material';
import { Add as AddIcon, Download as DownloadIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';

const REPORTS = [
  { id:1, title:'Interim Progress Report – ML Malaria Detection Year 1', type:'Progress', project:'ML Malaria Detection', funder:'USAID Kenya', due:'2024-04-15', status:'Draft', submitted:null },
  { id:2, title:'Annual Scientific Report – TB Genomic Surveillance 2023', type:'Technical', project:'TB Genomic Surveillance', funder:'Wellcome Trust', due:'2024-02-28', status:'Submitted', submitted:'2024-02-27' },
  { id:3, title:'Final Report – Nutrition Cohort Round 3', type:'Final', project:'Nutrition Cohort', funder:'Internal', due:'2023-12-31', status:'Approved', submitted:'2023-12-29' },
];

const typeColor  = t => ({ Progress:'#0ea5e9', Technical:'#8b5cf6', Final:'#10b981', Financial:'#f59e0b' }[t] || '#64748b');
const statusColor = s => ({ Draft:'#64748b', Submitted:'#0ea5e9', Approved:'#10b981', Rejected:'#ef4444' }[s] || '#64748b');

export default function ResearcherReportsPage() {
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
          <Typography sx={{ fontSize:22, fontWeight:700, color:'text.primary' }}>Reports</Typography>
          <Typography sx={{ fontSize:13, color:'text.secondary', mt:0.3 }}>Progress, technical, and final reports for your funded projects</Typography>
        </Box>
        <Button variant="contained" size="small" startIcon={<AddIcon />}
          sx={{ bgcolor:'#1ca7a1', textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
          New Report
        </Button>
      </Box>

      <Box sx={{ display:'flex', flexDirection:'column', gap:2 }}>
        {REPORTS.map(r => (
          <Box key={r.id} sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2.5, p:2.5 }}>
            <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <Box sx={{ flex:1, mr:2 }}>
                <Typography sx={{ fontSize:14, fontWeight:700, color:'text.primary', mb:0.3 }}>{r.title}</Typography>
                <Typography sx={{ fontSize:12, color:'text.secondary' }}>{r.project} · {r.funder}</Typography>
              </Box>
              <Box sx={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:0.5, flexShrink:0 }}>
                <Chip label={r.type} size="small" sx={{ fontSize:10, fontWeight:700, bgcolor: typeColor(r.type)+'22', color: typeColor(r.type) }} />
                <Chip label={r.status} size="small" sx={{ fontSize:10, fontWeight:700, bgcolor: statusColor(r.status)+'22', color: statusColor(r.status) }} />
              </Box>
            </Box>
            <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mt:1.5 }}>
              <Typography sx={{ fontSize:11, color: !r.submitted && new Date(r.due) < new Date() ? '#ef4444' : 'text.disabled', fontWeight: !r.submitted && new Date(r.due) < new Date() ? 700 : 400 }}>
                Due {new Date(r.due).toLocaleDateString('en-GB')}{r.submitted ? ` · Submitted ${new Date(r.submitted).toLocaleDateString('en-GB')}` : ''}
              </Typography>
              <Box sx={{ display:'flex', gap:1 }}>
                {r.status === 'Approved' && <Button size="small" startIcon={<DownloadIcon />} sx={{ textTransform:'none', fontSize:11, color:'text.secondary' }}>Download</Button>}
                <Button size="small" sx={{ color:'#1ca7a1', textTransform:'none', fontSize:12, fontWeight:600 }}>
                  {r.status === 'Draft' ? 'Continue' : 'View'}
                </Button>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
