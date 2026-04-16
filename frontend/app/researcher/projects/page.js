'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Chip, CircularProgress, Button, useTheme, LinearProgress, Avatar } from '@mui/material';
import { Add as AddIcon, Groups as TeamIcon, CheckCircle as MilestoneIcon } from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';

const PROJECTS = [
  { id:1, title:'Machine Learning for Early Malaria Detection in Rural Kenya', type:'Funded', status:'Active', award:'WA-2024-003', funder:'USAID Kenya', start:'2024-01-01', end:'2026-12-31', budget:'USD 150,000', progress:28, milestones:6, done:2, team:['AW','LM','SN'], ethics:'Approved' },
  { id:2, title:'Genomic Surveillance of Drug-Resistant TB – East Africa Regional Study', type:'Funded', status:'Active', award:'WA-2023-019', funder:'Wellcome Trust', start:'2023-06-01', end:'2026-05-31', budget:'USD 200,000', progress:55, milestones:8, done:5, team:['AW','FH','AO'], ethics:'Approved' },
  { id:3, title:'Household Nutrition Assessment – Longitudinal Cohort Follow-up', type:'Internal', status:'Active', award:null, funder:'Internal', start:'2023-09-01', end:'2024-08-31', budget:'KES 1,200,000', progress:80, milestones:4, done:4, team:['AW','DK'], ethics:'Approved' },
  { id:4, title:'Pilot Study: Digital Health Tools for Antenatal Care in Peri-Urban Settings', type:'Unfunded', status:'Proposed', award:null, funder:'Self-funded', start:'2024-04-01', end:'2024-12-31', budget:'—', progress:5, milestones:3, done:0, team:['AW'], ethics:'Pending' },
];

const statusColor = s => ({ Active:'#10b981', Proposed:'#f59e0b', Completed:'#0ea5e9', Suspended:'#ef4444', Archived:'#64748b' }[s] || '#64748b');
const typeColor   = t => ({ Funded:'#8b5cf6', Internal:'#1ca7a1', Unfunded:'#64748b', Collaborative:'#f97316' }[t] || '#64748b');
const COLORS = ['#1ca7a1','#8b5cf6','#0ea5e9','#10b981','#f97316','#ef4444'];

export default function ResearcherProjects() {
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
          <Typography sx={{ fontSize:22, fontWeight:700, color:'text.primary' }}>My Projects</Typography>
          <Typography sx={{ fontSize:13, color:'text.secondary', mt:0.3 }}>Research project portfolio — milestones, teams, and ethics status</Typography>
        </Box>
        <Button variant="contained" size="small" startIcon={<AddIcon />}
          sx={{ bgcolor:'#1ca7a1', textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
          Register Project
        </Button>
      </Box>

      <Box sx={{ display:'flex', gap:2, mb:3, flexWrap:'wrap' }}>
        {['Active','Proposed','Completed'].map(s => {
          const c = PROJECTS.filter(p => p.status === s).length;
          return <Box key={s} sx={{ flex:'1 1 120px', bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2, p:1.5, textAlign:'center' }}>
            <Typography sx={{ fontSize:20, fontWeight:700, color: statusColor(s) }}>{c}</Typography>
            <Typography sx={{ fontSize:11, color:'text.secondary', fontWeight:600 }}>{s}</Typography>
          </Box>;
        })}
        <Box sx={{ flex:'1 1 120px', bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2, p:1.5, textAlign:'center' }}>
          <Typography sx={{ fontSize:20, fontWeight:700, color:'#8b5cf6' }}>{PROJECTS.reduce((a,p) => a + p.done, 0)}/{PROJECTS.reduce((a,p) => a + p.milestones, 0)}</Typography>
          <Typography sx={{ fontSize:11, color:'text.secondary', fontWeight:600 }}>Milestones Done</Typography>
        </Box>
      </Box>

      <Box sx={{ display:'flex', flexDirection:'column', gap:2 }}>
        {PROJECTS.map((p, i) => (
          <Box key={p.id} sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderLeft:`4px solid ${COLORS[i % COLORS.length]}`, borderRadius:2.5, p:2.5, cursor:'pointer', '&:hover':{ boxShadow: dark?'none':'0 4px 16px rgba(0,0,0,0.08)' }, transition:'all 0.2s' }}>
            <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:1.5 }}>
              <Box sx={{ flex:1, mr:2 }}>
                <Typography sx={{ fontSize:14, fontWeight:700, color:'text.primary', lineHeight:1.4, mb:0.5 }}>{p.title}</Typography>
                <Box sx={{ display:'flex', gap:1, flexWrap:'wrap', mb:0.5 }}>
                  <Chip label={p.type} size="small" sx={{ fontSize:10, fontWeight:700, bgcolor: typeColor(p.type)+'22', color: typeColor(p.type) }} />
                  <Chip label={p.funder} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor: dark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.06)', color:'text.secondary' }} />
                  {p.award && <Chip label={p.award} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor:'rgba(28,167,161,0.1)', color:'#1ca7a1' }} />}
                </Box>
                <Typography sx={{ fontSize:11, color:'text.disabled' }}>{new Date(p.start).toLocaleDateString('en-GB')} → {new Date(p.end).toLocaleDateString('en-GB')} · {p.budget}</Typography>
              </Box>
              <Chip label={p.status} size="small" sx={{ fontSize:11, fontWeight:700, bgcolor: statusColor(p.status)+'22', color: statusColor(p.status), flexShrink:0 }} />
            </Box>

            <Box sx={{ mb:1.5 }}>
              <Box sx={{ display:'flex', justifyContent:'space-between', mb:0.5 }}>
                <Typography sx={{ fontSize:11, color:'text.secondary' }}>Project Progress</Typography>
                <Typography sx={{ fontSize:11, fontWeight:700, color: COLORS[i % COLORS.length] }}>{p.progress}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={p.progress} sx={{ height:5, borderRadius:3, bgcolor:'rgba(0,0,0,0.08)', '& .MuiLinearProgress-bar':{ bgcolor: COLORS[i % COLORS.length], borderRadius:3 } }} />
            </Box>

            <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <Box sx={{ display:'flex', gap:2 }}>
                <Box sx={{ display:'flex', alignItems:'center', gap:0.5 }}>
                  <MilestoneIcon sx={{ fontSize:14, color:'#10b981' }} />
                  <Typography sx={{ fontSize:11, color:'text.secondary' }}>{p.done}/{p.milestones} milestones</Typography>
                </Box>
                <Chip label={`Ethics: ${p.ethics}`} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor: p.ethics==='Approved'?'rgba(16,185,129,0.1)':'rgba(245,158,11,0.1)', color: p.ethics==='Approved'?'#10b981':'#f59e0b' }} />
              </Box>
              <Box sx={{ display:'flex', alignItems:'center', gap:0.5 }}>
                <TeamIcon sx={{ fontSize:14, color:'text.disabled' }} />
                <Box sx={{ display:'flex' }}>
                  {p.team.map((m,j) => <Avatar key={j} sx={{ width:22, height:22, fontSize:9, fontWeight:700, bgcolor: COLORS[(i+j) % COLORS.length], ml: j>0?-0.5:0, border:'2px solid', borderColor:'background.paper', zIndex: p.team.length - j }}>{m}</Avatar>)}
                </Box>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

