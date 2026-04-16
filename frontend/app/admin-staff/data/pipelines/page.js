'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, CircularProgress, useTheme, Button, Chip, LinearProgress, Alert } from '@mui/material';
import { Add as AddIcon, PlayArrow as RunIcon, Pause as PauseIcon, Error as ErrorIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';

const PIPELINES = [
  { id:1, name:'Nutrition Survey → Cleaned Dataset', type:'ETL', schedule:'Daily 02:00', lastRun:'2024-03-15 02:03', duration:'4m 22s', status:'Success', records:4820, steps:['Ingest (KoBoToolbox API)','Validate Schema','Deduplicate','Normalise Units','Load to Repository'], health:100 },
  { id:2, name:'TB Genomic Sequences → FASTA Archive', type:'ETL', schedule:'Weekly Sun 03:00', lastRun:'2024-03-10 03:11', duration:'18m 05s', status:'Success', records:312, steps:['Ingest (SFTP)','Quality Score Filter (Q30>)','Reference Alignment','VCF Generation','Load to Repository'], health:100 },
  { id:3, name:'Water Quality → Analytics Warehouse', type:'ELT', schedule:'Daily 01:00', lastRun:'2024-03-15 01:02', duration:'2m 58s', status:'Warning', records:1150, steps:['Ingest (ODK Central API)','Load Raw Layer','dbt Transform','Aggregate Metrics','Refresh BI Views'], health:72 },
  { id:4, name:'Malaria RDT → ML Feature Store', type:'ML', schedule:'On Submit', lastRun:'2024-03-15 09:24', duration:'1m 10s', status:'Running', records:544, steps:['Ingest Raw Submission','Feature Engineering','Normalise Features','Write to Feature Store','Trigger Model Retraining'], health:60 },
  { id:5, name:'Cross-Study Metadata Aggregator', type:'ETL', schedule:'Weekly Mon 04:00', lastRun:'2024-03-11 04:18', duration:'6m 40s', status:'Failed', records:0, steps:['Collect Metadata (All Projects)','Schema Reconciliation','Load DataCite API','Update OAI-PMH Endpoint'], health:0 },
];

const statusColor = s => ({ Success:'#10b981', Warning:'#f59e0b', Running:'#0ea5e9', Failed:'#ef4444', Paused:'#64748b' }[s] || '#64748b');
const typeColor   = t => ({ ETL:'#8b5cf6', ELT:'#0ea5e9', ML:'#f97316', Streaming:'#10b981' }[t] || '#64748b');
const ACCENT = '#06b6d4';

export default function PipelinesPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchUser().then(u => { if (!u) router.push('/login'); else setLoading(false); }); }, []);

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  const failed  = PIPELINES.filter(p => p.status === 'Failed').length;
  const running = PIPELINES.filter(p => p.status === 'Running').length;

  return (
    <Box sx={{ p:3 }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:3 }}>
        <Box>
          <Typography sx={{ fontSize:22, fontWeight:700, color:'text.primary' }}>Data Pipelines</Typography>
          <Typography sx={{ fontSize:13, color:'text.secondary', mt:0.3 }}>ETL/ELT workflows, ML feature pipelines, and data lake management — Airflow + dbt orchestration</Typography>
        </Box>
        <Button variant="contained" size="small" startIcon={<AddIcon />}
          sx={{ bgcolor: ACCENT, textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#0891b2' } }}>
          New Pipeline
        </Button>
      </Box>

      {failed > 0 && <Alert severity="error" icon={<ErrorIcon />} sx={{ mb:2 }}>🚨 {failed} pipeline(s) have failed — immediate investigation required.</Alert>}
      {running > 0 && <Alert severity="info" sx={{ mb:3 }}>⚙ {running} pipeline(s) currently running.</Alert>}

      <Box sx={{ display:'flex', gap:2, mb:3, flexWrap:'wrap' }}>
        {['Success','Running','Warning','Failed'].map(s => {
          const c = PIPELINES.filter(p => p.status === s).length;
          return <Box key={s} sx={{ flex:'1 1 110px', bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2, p:1.5, textAlign:'center' }}>
            <Typography sx={{ fontSize:20, fontWeight:700, color: statusColor(s) }}>{c}</Typography>
            <Typography sx={{ fontSize:11, color:'text.secondary', fontWeight:600 }}>{s}</Typography>
          </Box>;
        })}
      </Box>

      <Box sx={{ display:'flex', flexDirection:'column', gap:2 }}>
        {PIPELINES.map(p => (
          <Box key={p.id} sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderLeft:`3px solid ${statusColor(p.status)}`, borderRadius:2.5, p:2.5 }}>
            <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:1.5 }}>
              <Box>
                <Typography sx={{ fontSize:14, fontWeight:700, color:'text.primary', mb:0.5 }}>{p.name}</Typography>
                <Box sx={{ display:'flex', gap:1, flexWrap:'wrap' }}>
                  <Chip label={p.type} size="small" sx={{ fontSize:10, fontWeight:700, bgcolor: typeColor(p.type)+'22', color: typeColor(p.type) }} />
                  <Chip label={p.schedule} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor: dark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.05)', color:'text.secondary' }} />
                  <Typography sx={{ fontSize:11, color:'text.disabled', alignSelf:'center' }}>Last: {p.lastRun} · {p.duration}</Typography>
                </Box>
              </Box>
              <Box sx={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:0.5 }}>
                <Chip label={p.status} size="small" sx={{ fontSize:11, fontWeight:700, bgcolor: statusColor(p.status)+'22', color: statusColor(p.status) }} />
                {p.records > 0 && <Typography sx={{ fontSize:11, color:'text.disabled' }}>{p.records.toLocaleString()} records</Typography>}
              </Box>
            </Box>

            <Box sx={{ mb:1.5 }}>
              <Box sx={{ display:'flex', justifyContent:'space-between', mb:0.5 }}>
                <Typography sx={{ fontSize:11, color:'text.secondary' }}>Pipeline Health</Typography>
                <Typography sx={{ fontSize:11, fontWeight:700, color: p.health > 70 ? '#10b981' : p.health > 30 ? '#f59e0b' : '#ef4444' }}>{p.health}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={p.health} sx={{ height:5, borderRadius:3, bgcolor:'rgba(0,0,0,0.08)', '& .MuiLinearProgress-bar':{ bgcolor: p.health > 70 ? '#10b981' : p.health > 30 ? '#f59e0b' : '#ef4444', borderRadius:3 } }} />
            </Box>

            <Box sx={{ display:'flex', gap:0.75, flexWrap:'wrap', mb:1.5 }}>
              {p.steps.map((step, i) => (
                <Chip key={i} label={`${i+1}. ${step}`} size="small" sx={{ fontSize:9, fontWeight:600, bgcolor: i < p.steps.length * (p.health/100) ? 'rgba(16,185,129,0.1)' : 'rgba(0,0,0,0.05)', color: i < p.steps.length * (p.health/100) ? '#10b981' : 'text.disabled' }} />
              ))}
            </Box>

            <Box sx={{ display:'flex', gap:1 }}>
              <Button size="small" startIcon={<RunIcon sx={{ fontSize:'13px !important' }} />} sx={{ color: ACCENT, textTransform:'none', fontSize:11, fontWeight:600 }}>Run Now</Button>
              <Button size="small" startIcon={<PauseIcon sx={{ fontSize:'13px !important' }} />} sx={{ color:'text.secondary', textTransform:'none', fontSize:11 }}>Pause</Button>
              <Button size="small" sx={{ color:'text.secondary', textTransform:'none', fontSize:11 }}>View Logs</Button>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
