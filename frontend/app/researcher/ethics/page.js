'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme,
  Stepper, Step, StepLabel, Alert,
} from '@mui/material';
import { Add as AddIcon, UploadFile as UploadIcon } from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';

const ETHICS_STAGES = ['Submitted','Screened','Assigned','Under Review','Decision','Final Approval'];

const APPS = [
  {
    id:1, project:'Genomic Surveillance of Drug-Resistant TB', type:'Full Review', ref:'ETH-2023-0042', stage:5, status:'Approved',
    submitted:'2023-05-10', decision:'2023-07-22', validUntil:'2025-07-21',
    outcome:'Approved', conditions:[], reviewers:2, message:'Application approved. Ethics clearance certificate attached.',
    documents:['Protocol v2.1','Consent Form (English)','Consent Form (Swahili)','Data Management Plan'],
  },
  {
    id:2, project:'ML Malaria Detection – Kisumu Field Study', type:'Expedited Review', ref:'ETH-2024-0018', stage:3, status:'Under Review',
    submitted:'2024-02-14', decision:null, validUntil:null,
    outcome:null, conditions:[], reviewers:2, message:null,
    documents:['Protocol v1.0','Consent Form (English)','Site Permission Letter'],
  },
  {
    id:3, project:'Digital Health Tools for Antenatal Care – Pilot', type:'Exempt', ref:'ETH-2024-0031', stage:1, status:'Screened',
    submitted:'2024-03-10', decision:null, validUntil:null,
    outcome:null, conditions:[], reviewers:0, message:'Under administrative screening. Expected assignment within 5 working days.',
    documents:['Study Description Form','Data Privacy Impact Assessment'],
  },
];

const statusColor = s => ({ Approved:'#10b981','Under Review':'#0ea5e9', Screened:'#f59e0b', Submitted:'#64748b', Rejected:'#ef4444','Approved with Modifications':'#f97316' }[s] || '#64748b');
const typeColor   = t => ({ 'Full Review':'#8b5cf6', 'Expedited Review':'#0ea5e9', Exempt:'#10b981' }[t] || '#64748b');

export default function EthicsPage() {
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
          <Typography sx={{ fontSize:22, fontWeight:700, color:'text.primary' }}>Ethics Applications</Typography>
          <Typography sx={{ fontSize:13, color:'text.secondary', mt:0.3 }}>Submit and track IRB / ethics committee applications for your research projects</Typography>
        </Box>
        <Button variant="contained" size="small" startIcon={<AddIcon />}
          sx={{ bgcolor:'#1ca7a1', textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
          New Application
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb:3, fontSize:12 }}>
        <strong>Ethics Gate:</strong> Data collection for human-subjects research cannot begin until a valid ethics clearance is linked to your project.
      </Alert>

      <Box sx={{ display:'flex', gap:2, mb:3, flexWrap:'wrap' }}>
        {['Approved','Under Review','Screened'].map(s => {
          const c = APPS.filter(a => a.status === s).length;
          return <Box key={s} sx={{ flex:'1 1 120px', bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2, p:1.5, textAlign:'center' }}>
            <Typography sx={{ fontSize:20, fontWeight:700, color: statusColor(s) }}>{c}</Typography>
            <Typography sx={{ fontSize:11, color:'text.secondary', fontWeight:600 }}>{s}</Typography>
          </Box>;
        })}
      </Box>

      <Box sx={{ display:'flex', flexDirection:'column', gap:3 }}>
        {APPS.map(app => (
          <Box key={app.id} sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2.5, p:3 }}>
            {app.message && (
              <Alert severity={app.status==='Approved'?'success': app.status==='Rejected'?'error':'info'} sx={{ mb:2, fontSize:12 }}>
                {app.message}
              </Alert>
            )}

            <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:2 }}>
              <Box>
                <Typography sx={{ fontSize:15, fontWeight:700, color:'text.primary', mb:0.3 }}>{app.project}</Typography>
                <Box sx={{ display:'flex', gap:1 }}>
                  <Chip label={app.type} size="small" sx={{ fontSize:10, fontWeight:700, bgcolor: typeColor(app.type)+'22', color: typeColor(app.type) }} />
                  <Typography sx={{ fontSize:12, color:'text.secondary', alignSelf:'center', fontFamily:'monospace' }}>{app.ref}</Typography>
                </Box>
              </Box>
              <Box sx={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:0.5 }}>
                <Chip label={app.status} size="small" sx={{ fontSize:11, fontWeight:700, bgcolor: statusColor(app.status)+'22', color: statusColor(app.status) }} />
                {app.validUntil && <Typography sx={{ fontSize:10, color:'text.disabled' }}>Valid until {new Date(app.validUntil).toLocaleDateString('en-GB')}</Typography>}
              </Box>
            </Box>

            <Stepper activeStep={app.stage} alternativeLabel sx={{ mb:2.5,
              '& .MuiStepLabel-label':{ fontSize:10 },
              '& .MuiStepIcon-root.Mui-completed':{ color:'#10b981' },
              '& .MuiStepIcon-root.Mui-active':{ color:'#1ca7a1' },
            }}>
              {ETHICS_STAGES.map(l => <Step key={l}><StepLabel>{l}</StepLabel></Step>)}
            </Stepper>

            <Box sx={{ mb:2 }}>
              <Typography sx={{ fontSize:11, color:'text.secondary', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, mb:1 }}>Documents</Typography>
              <Box sx={{ display:'flex', gap:0.75, flexWrap:'wrap' }}>
                {app.documents.map(d => (
                  <Chip key={d} label={d} size="small" icon={<UploadIcon sx={{ fontSize:'12px !important' }} />}
                    sx={{ fontSize:10, fontWeight:600, bgcolor: dark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.05)', color:'text.secondary', cursor:'pointer' }} />
                ))}
              </Box>
            </Box>

            <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <Typography sx={{ fontSize:11, color:'text.disabled' }}>Submitted {new Date(app.submitted).toLocaleDateString('en-GB')} · {app.reviewers} reviewer(s) assigned</Typography>
              <Box sx={{ display:'flex', gap:1 }}>
                <Button size="small" sx={{ textTransform:'none', fontSize:12, color:'text.secondary' }}>Upload Document</Button>
                <Button size="small" sx={{ color:'#1ca7a1', textTransform:'none', fontSize:12, fontWeight:600 }}>View Full Record</Button>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
