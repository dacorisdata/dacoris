'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Chip, CircularProgress, Button, useTheme, LinearProgress, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { Add as AddIcon, CheckCircle as DoneIcon, RadioButtonUnchecked as PendingIcon, Warning as OverdueIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';

const MILESTONES = [
  { id:1, project:'ML Malaria Detection', title:'Literature Review & Protocol Development', due:'2024-02-28', status:'Completed', priority:'High', tasks:[{t:'Systematic literature review',done:true},{t:'Draft study protocol',done:true},{t:'IRB submission',done:true}] },
  { id:2, project:'ML Malaria Detection', title:'Data Collection – Phase 1 (Kisumu Sentinel Sites)', due:'2024-06-30', status:'In Progress', priority:'High', tasks:[{t:'Site visits to 5 sentinel sites',done:true},{t:'Field data collection (target: 500 records)',done:false},{t:'Data entry and QA',done:false}] },
  { id:3, project:'TB Genomic Surveillance', title:'Sample Collection & DNA Extraction', due:'2024-01-31', status:'Completed', priority:'High', tasks:[{t:'Sample collection – Kenya sites',done:true},{t:'DNA extraction (KEMRI lab)',done:true},{t:'Quality check on extracts',done:true}] },
  { id:4, project:'TB Genomic Surveillance', title:'Whole Genome Sequencing – Batch 2', due:'2024-04-15', status:'In Progress', priority:'High', tasks:[{t:'Send samples to sequencing facility',done:true},{t:'Receive sequencing data',done:false},{t:'Bioinformatics pipeline run',done:false}] },
  { id:5, project:'TB Genomic Surveillance', title:'Interim Analysis & Report', due:'2024-03-31', status:'Overdue', priority:'High', tasks:[{t:'Data cleaning',done:false},{t:'Phylogenetic analysis',done:false},{t:'Draft interim report',done:false}] },
  { id:6, project:'Nutrition Cohort', title:'Final Data Collection & Closeout', due:'2024-05-31', status:'In Progress', priority:'Medium', tasks:[{t:'Round 4 household visits (target 320)',done:true},{t:'Anthropometric measurements',done:true},{t:'Blood sample collection',done:false}] },
  { id:7, project:'Digital Health Pilot', title:'Ethics Approval & Site Selection', due:'2024-04-30', status:'Pending', priority:'Medium', tasks:[{t:'Prepare ethics application',done:false},{t:'Site selection visits',done:false},{t:'Community engagement meetings',done:false}] },
];

const statusColor = s => ({ Completed:'#10b981','In Progress':'#0ea5e9', Overdue:'#ef4444', Pending:'#64748b','Blocked':'#f97316' }[s] || '#64748b');
const statusIcon = s => s === 'Completed' ? <DoneIcon sx={{ fontSize:16, color:'#10b981' }} /> : s === 'Overdue' ? <OverdueIcon sx={{ fontSize:16, color:'#ef4444' }} /> : <PendingIcon sx={{ fontSize:16, color: statusColor(s) }} />;

export default function MilestonesPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState('all');

  useEffect(() => { fetchUser().then(u => { if (!u) router.push('/login'); else setLoading(false); }); }, []);

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  const projects = [...new Set(MILESTONES.map(m => m.project))];
  const filtered = projectFilter === 'all' ? MILESTONES : MILESTONES.filter(m => m.project === projectFilter);
  const overdue  = MILESTONES.filter(m => m.status === 'Overdue').length;

  return (
    <Box sx={{ p:3 }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:3 }}>
        <Box>
          <Typography sx={{ fontSize:22, fontWeight:700, color:'text.primary' }}>Milestones & Tasks</Typography>
          <Typography sx={{ fontSize:13, color:'text.secondary', mt:0.3 }}>Track deliverables and tasks across all your research projects</Typography>
        </Box>
        <Button variant="contained" size="small" startIcon={<AddIcon />}
          sx={{ bgcolor:'#1ca7a1', textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
          Add Milestone
        </Button>
      </Box>

      {overdue > 0 && (
        <Box sx={{ bgcolor:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:2, p:2, mb:3, display:'flex', alignItems:'center', gap:1.5 }}>
          <OverdueIcon sx={{ color:'#ef4444', fontSize:18 }} />
          <Typography sx={{ fontSize:13, color:'#ef4444', fontWeight:600 }}>{overdue} milestone(s) are overdue — immediate attention required</Typography>
        </Box>
      )}

      <Box sx={{ display:'flex', gap:2, mb:3, flexWrap:'wrap' }}>
        {['Completed','In Progress','Overdue','Pending'].map(s => {
          const c = MILESTONES.filter(m => m.status === s).length;
          return <Box key={s} sx={{ flex:'1 1 110px', bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2, p:1.5, textAlign:'center' }}>
            <Typography sx={{ fontSize:20, fontWeight:700, color: statusColor(s) }}>{c}</Typography>
            <Typography sx={{ fontSize:11, color:'text.secondary', fontWeight:600 }}>{s}</Typography>
          </Box>;
        })}
      </Box>

      <FormControl size="small" sx={{ minWidth:220, mb:2.5 }}>
        <InputLabel>Filter by Project</InputLabel>
        <Select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} label="Filter by Project" sx={{ borderRadius:2 }}>
          <MenuItem value="all">All Projects</MenuItem>
          {projects.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
        </Select>
      </FormControl>

      <Box sx={{ display:'flex', flexDirection:'column', gap:2 }}>
        {filtered.map(m => {
          const tasksDone = m.tasks.filter(t => t.done).length;
          const taskPct = Math.round((tasksDone / m.tasks.length) * 100);
          return (
            <Box key={m.id} sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2.5, p:2.5 }}>
              <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:1.5 }}>
                <Box sx={{ display:'flex', gap:1.5, flex:1 }}>
                  {statusIcon(m.status)}
                  <Box>
                    <Typography sx={{ fontSize:14, fontWeight:700, color:'text.primary', mb:0.3 }}>{m.title}</Typography>
                    <Typography sx={{ fontSize:11, color:'#1ca7a1', fontWeight:600 }}>{m.project}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:0.5, flexShrink:0, ml:2 }}>
                  <Chip label={m.status} size="small" sx={{ fontSize:10, fontWeight:700, bgcolor: statusColor(m.status)+'22', color: statusColor(m.status) }} />
                  <Typography sx={{ fontSize:11, color: m.status==='Overdue'?'#ef4444':'text.disabled', fontWeight: m.status==='Overdue'?700:400 }}>
                    Due {new Date(m.due).toLocaleDateString('en-GB')}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ mb:1.5 }}>
                <Box sx={{ display:'flex', justifyContent:'space-between', mb:0.5 }}>
                  <Typography sx={{ fontSize:11, color:'text.secondary' }}>Tasks: {tasksDone}/{m.tasks.length}</Typography>
                  <Typography sx={{ fontSize:11, fontWeight:700, color: taskPct===100?'#10b981':'text.secondary' }}>{taskPct}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={taskPct} sx={{ height:4, borderRadius:2, bgcolor:'rgba(0,0,0,0.08)', '& .MuiLinearProgress-bar':{ bgcolor: taskPct===100?'#10b981':'#1ca7a1', borderRadius:2 } }} />
              </Box>

              <Box sx={{ display:'flex', flexDirection:'column', gap:0.5 }}>
                {m.tasks.map((t,i) => (
                  <Box key={i} sx={{ display:'flex', alignItems:'center', gap:1 }}>
                    {t.done ? <DoneIcon sx={{ fontSize:13, color:'#10b981', flexShrink:0 }} /> : <PendingIcon sx={{ fontSize:13, color:'text.disabled', flexShrink:0 }} />}
                    <Typography sx={{ fontSize:12, color: t.done?'text.secondary':'text.primary', textDecoration: t.done?'line-through':'none' }}>{t.t}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
