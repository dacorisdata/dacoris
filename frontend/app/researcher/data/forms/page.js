'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Chip, CircularProgress, Button, useTheme } from '@mui/material';
import { Add as AddIcon, DynamicForm as FormIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';

const FORMS = [
  { id:1, title:'Malaria RDT Diagnostic Log', project:'ML Malaria Detection', source:'internal', submissions:544, status:'Active', ethics:'Approved' },
  { id:2, title:'Patient Follow-up Interview – TB Study', project:'TB Genomic Surveillance', source:'redcap', submissions:156, status:'Active', ethics:'Approved' },
  { id:3, title:'Household Nutrition Questionnaire Round 4', project:'Nutrition Cohort', source:'kobo', submissions:320, status:'Closed', ethics:'Approved' },
];

const srcColor = s => ({ internal:'#1ca7a1', kobo:'#f59e0b', odk:'#0ea5e9', redcap:'#8b5cf6', msforms:'#10b981' }[s] || '#64748b');

export default function ResearcherFormsPage() {
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
          <Typography sx={{ fontSize:22, fontWeight:700, color:'text.primary' }}>Capture Forms</Typography>
          <Typography sx={{ fontSize:13, color:'text.secondary', mt:0.3 }}>Data collection forms linked to your research projects</Typography>
        </Box>
        <Button variant="contained" size="small" startIcon={<AddIcon />}
          sx={{ bgcolor:'#1ca7a1', textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
          Create Form
        </Button>
      </Box>

      <Box sx={{ display:'flex', flexDirection:'column', gap:2 }}>
        {FORMS.map(f => (
          <Box key={f.id} sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2.5, p:2.5, display:'flex', alignItems:'center', gap:2.5 }}>
            <Box sx={{ width:42, height:42, borderRadius:2, bgcolor: srcColor(f.source)+'22', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <FormIcon sx={{ fontSize:20, color: srcColor(f.source) }} />
            </Box>
            <Box sx={{ flex:1, minWidth:0 }}>
              <Typography sx={{ fontSize:14, fontWeight:700, color:'text.primary', mb:0.2 }}>{f.title}</Typography>
              <Typography sx={{ fontSize:12, color:'text.secondary' }}>{f.project}</Typography>
            </Box>
            <Box sx={{ display:'flex', gap:1, flexWrap:'wrap', flexShrink:0 }}>
              <Chip label={f.source.toUpperCase()} size="small" sx={{ fontSize:10, fontWeight:700, bgcolor: srcColor(f.source)+'22', color: srcColor(f.source) }} />
              <Chip label={`${f.submissions} submissions`} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor:'rgba(16,185,129,0.1)', color:'#10b981' }} />
              <Chip label={f.status} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor: f.status==='Active'?'rgba(16,185,129,0.1)':'rgba(100,116,139,0.1)', color: f.status==='Active'?'#10b981':'#64748b' }} />
              <Chip label={`Ethics: ${f.ethics}`} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor:'rgba(16,185,129,0.1)', color:'#10b981' }} />
            </Box>
            <Button size="small" sx={{ color:'#1ca7a1', textTransform:'none', fontSize:12, fontWeight:600, flexShrink:0 }}>Open</Button>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
