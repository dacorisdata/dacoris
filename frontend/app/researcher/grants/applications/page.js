'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Chip, CircularProgress, Button, useTheme, Stepper, Step, StepLabel, Alert } from '@mui/material';
import { CheckCircle as DoneIcon, RadioButtonUnchecked as PendingIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';

const STAGES = ['Intake','Eligibility','Internal Review','Panel Review','Due Diligence','Award'];

const APPS = [
  { id:1, title:'Machine Learning for Early Malaria Detection', funder:'USAID Kenya', ref:'APP-2024-0034', stage:2, status:'In Progress', amount:'USD 150,000', lastUpdate:'2024-03-14', message: null },
  { id:2, title:'Genomic Surveillance of Drug-Resistant TB', funder:'Wellcome Trust', ref:'APP-2024-0019', stage:5, status:'Awarded', amount:'USD 200,000', lastUpdate:'2024-03-01', message:'Congratulations! Your application has been awarded. Award letter issued.' },
  { id:3, title:'Community Water Governance – Turkana', funder:'AfDB', ref:'APP-2024-0041', stage:0, status:'Submitted', amount:'USD 500,000', lastUpdate:'2024-03-10', message:null },
];

const statusColor = s => ({ Submitted:'#0ea5e9','In Progress':'#8b5cf6', Awarded:'#10b981', Rejected:'#ef4444', Withdrawn:'#64748b', Returned:'#f97316' }[s] || '#64748b');

export default function MyApplicationsPage() {
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
        <Typography sx={{ fontSize:22, fontWeight:700, color:'text.primary' }}>My Applications</Typography>
        <Typography sx={{ fontSize:13, color:'text.secondary', mt:0.3 }}>Track the status of your submitted grant applications through the review pipeline</Typography>
      </Box>

      <Box sx={{ display:'flex', flexDirection:'column', gap:3 }}>
        {APPS.map(app => (
          <Box key={app.id} sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2.5, p:3 }}>
            {app.message && <Alert severity={app.status==='Awarded'?'success':'info'} sx={{ mb:2, fontSize:12 }}>{app.message}</Alert>}
            <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:2.5 }}>
              <Box>
                <Typography sx={{ fontSize:15, fontWeight:700, color:'text.primary', mb:0.3 }}>{app.title}</Typography>
                <Typography sx={{ fontSize:12, color:'text.secondary' }}>{app.funder} · Ref: <span style={{ fontFamily:'monospace', color:'#1ca7a1' }}>{app.ref}</span></Typography>
              </Box>
              <Box sx={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:0.5, flexShrink:0, ml:2 }}>
                <Chip label={app.status} size="small" sx={{ fontSize:11, fontWeight:700, bgcolor: statusColor(app.status)+'22', color: statusColor(app.status) }} />
                <Chip label={app.amount} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor:'rgba(16,185,129,0.1)', color:'#10b981' }} />
              </Box>
            </Box>

            <Stepper activeStep={app.stage} alternativeLabel sx={{ mb:2,
              '& .MuiStepLabel-label':{ fontSize:10 },
              '& .MuiStepIcon-root.Mui-completed':{ color:'#10b981' },
              '& .MuiStepIcon-root.Mui-active':{ color:'#1ca7a1' },
            }}>
              {STAGES.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
            </Stepper>

            <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <Typography sx={{ fontSize:11, color:'text.disabled' }}>Last updated {new Date(app.lastUpdate).toLocaleDateString('en-GB')}</Typography>
              <Box sx={{ display:'flex', gap:1 }}>
                <Button size="small" sx={{ color:'text.secondary', textTransform:'none', fontSize:12 }}>History</Button>
                <Button size="small" sx={{ color:'#1ca7a1', textTransform:'none', fontSize:12, fontWeight:600 }}>View Details</Button>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
