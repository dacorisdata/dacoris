'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme, TextField,
  Avatar, Card, CardContent, Tooltip,
} from '@mui/material';
import { Search as SearchIcon, OpenInNew as OrcidIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';

const MOCK_RESEARCHERS = [
  { id:1, name:'Dr. Aisha Wambua', title:'Senior Research Fellow', dept:'Epidemiology & Biostatistics', expertise:['Machine Learning','Malaria','Infectious Disease'], orcid:'0000-0002-1234-5678', projects:4, publications:18, status:'Active' },
  { id:2, name:'Prof. David Kiprotich', title:'Professor of Nutrition Science', dept:'Public Health', expertise:['Maternal Nutrition','Food Security','Longitudinal Studies'], orcid:'0000-0001-9876-5432', projects:3, publications:32, status:'Active' },
  { id:3, name:'Dr. Lydia Mwangi', title:'Research Scientist', dept:'Pulmonology & Respiratory Medicine', expertise:['Tuberculosis','Drug Resistance','Genomics'], orcid:'0000-0003-2468-1357', projects:2, publications:11, status:'Active' },
  { id:4, name:'Prof. Simon Njoroge', title:'Associate Professor', dept:'Computer Science & AI', expertise:['Federated Learning','Privacy-Preserving ML','Data Engineering'], orcid:'0000-0002-3579-2468', projects:5, publications:24, status:'Active' },
  { id:5, name:'Ms. Grace Achieng', title:'Research Associate', dept:'Environmental Science', expertise:['Climate Change','Soil Carbon','Remote Sensing'], orcid:null, projects:2, publications:6, status:'Active' },
  { id:6, name:'Dr. Ahmed Osman', title:'Postdoctoral Researcher', dept:'Immunology', expertise:['HIV Prevention','Vaccine Trials','Community Health'], orcid:'0000-0001-1111-2222', projects:3, publications:9, status:'Visiting' },
  { id:7, name:'Dr. Fatuma Hassan', title:'Ethics Researcher', dept:'Bioethics & Social Medicine', expertise:['Research Ethics','IRB','Qualitative Methods'], orcid:'0000-0002-5678-9012', projects:1, publications:14, status:'Active' },
  { id:8, name:'Mr. Patrick Kimani', title:'PhD Candidate', dept:'Environmental Science', expertise:['Soil Science','Carbon Sequestration','GIS'], orcid:null, projects:1, publications:2, status:'Student' },
];

const statusColor = s => ({ Active:'#10b981', Visiting:'#f59e0b', Student:'#0ea5e9', Alumni:'#64748b' }[s] || '#64748b');
const DEPT_COLORS = ['#8b5cf6','#0ea5e9','#10b981','#f59e0b','#ef4444','#f97316','#1ca7a1','#6366f1'];

export default function ResearcherDirectoryPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUser().then(u => { if (!u) router.push('/login'); else setLoading(false); });
  }, []);

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  const filtered = MOCK_RESEARCHERS.filter(r =>
    !search ||
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.dept.toLowerCase().includes(search.toLowerCase()) ||
    r.expertise.some(e => e.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'text.primary' }}>Researcher Directory</Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.3 }}>
          {MOCK_RESEARCHERS.length} researchers · {MOCK_RESEARCHERS.filter(r => r.orcid).length} with ORCID iDs
        </Typography>
      </Box>

      <Box sx={{ display:'flex', gap: 2, mb: 3, flexWrap:'wrap' }}>
        {['Active','Visiting','Student'].map(s => {
          const c = MOCK_RESEARCHERS.filter(r => r.status === s).length;
          return <Box key={s} sx={{ flex:'1 1 120px', bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2, p:1.5, textAlign:'center' }}>
            <Typography sx={{ fontSize:20, fontWeight:700, color: statusColor(s) }}>{c}</Typography>
            <Typography sx={{ fontSize:11, color:'text.secondary', fontWeight:600 }}>{s}</Typography>
          </Box>;
        })}
        <Box sx={{ flex:'1 1 120px', bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2, p:1.5, textAlign:'center' }}>
          <Typography sx={{ fontSize:20, fontWeight:700, color:'#8b5cf6' }}>{MOCK_RESEARCHERS.reduce((a,r) => a+r.publications, 0)}</Typography>
          <Typography sx={{ fontSize:11, color:'text.secondary', fontWeight:600 }}>Total Publications</Typography>
        </Box>
      </Box>

      <TextField placeholder="Search by name, department, or expertise…" value={search} onChange={e => setSearch(e.target.value)} size="small"
        InputProps={{ startAdornment: <SearchIcon sx={{ fontSize:18, color:'text.disabled', mr:1 }} /> }}
        sx={{ mb: 3, width: 400, '& .MuiOutlinedInput-root':{ borderRadius:2 } }} />

      <Box sx={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
        {filtered.map((r, i) => (
          <Card key={r.id} elevation={0} sx={{ border:`1px solid ${theme.palette.divider}`, borderRadius:2.5, '&:hover':{ boxShadow: theme.palette.mode==='dark'?'none':'0 4px 16px rgba(0,0,0,0.1)', transform:'translateY(-2px)', transition:'all 0.2s' }, cursor:'pointer', transition:'all 0.2s' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display:'flex', alignItems:'flex-start', gap: 1.5, mb: 2 }}>
                <Avatar sx={{ width:44, height:44, bgcolor: DEPT_COLORS[i % DEPT_COLORS.length], fontSize:15, fontWeight:700, flexShrink:0 }}>
                  {r.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                </Avatar>
                <Box sx={{ minWidth:0 }}>
                  <Typography sx={{ fontSize:13, fontWeight:700, color:'text.primary', lineHeight:1.3 }}>{r.name}</Typography>
                  <Typography sx={{ fontSize:11, color:'text.secondary', mt:0.2 }}>{r.title}</Typography>
                  <Typography sx={{ fontSize:10, color:'text.disabled', mt:0.1 }}>{r.dept}</Typography>
                </Box>
              </Box>

              <Box sx={{ display:'flex', gap:1, mb: 2 }}>
                <Chip label={r.status} size="small" sx={{ fontSize:9, fontWeight:700, bgcolor: statusColor(r.status)+'22', color: statusColor(r.status) }} />
                {r.orcid && <Chip label="ORCID" size="small" sx={{ fontSize:9, fontWeight:700, bgcolor:'rgba(166,206,57,0.15)', color:'#83b818' }} />}
              </Box>

              <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.5, mb: 2 }}>
                {r.expertise.map(e => (
                  <Chip key={e} label={e} size="small" sx={{ fontSize:9, bgcolor: DEPT_COLORS[i % DEPT_COLORS.length]+'18', color: DEPT_COLORS[i % DEPT_COLORS.length], fontWeight:600 }} />
                ))}
              </Box>

              <Box sx={{ display:'flex', gap:3 }}>
                <Box sx={{ textAlign:'center' }}>
                  <Typography sx={{ fontSize:16, fontWeight:700, color:'text.primary' }}>{r.projects}</Typography>
                  <Typography sx={{ fontSize:10, color:'text.disabled' }}>Projects</Typography>
                </Box>
                <Box sx={{ textAlign:'center' }}>
                  <Typography sx={{ fontSize:16, fontWeight:700, color:'text.primary' }}>{r.publications}</Typography>
                  <Typography sx={{ fontSize:10, color:'text.disabled' }}>Publications</Typography>
                </Box>
                {r.orcid && (
                  <Tooltip title={`ORCID: ${r.orcid}`}>
                    <Box sx={{ display:'flex', alignItems:'center', gap:0.5, ml:'auto', cursor:'pointer' }}>
                      <OrcidIcon sx={{ fontSize:14, color:'#83b818' }} />
                      <Typography sx={{ fontSize:9, color:'#83b818', fontFamily:'monospace' }}>{r.orcid.slice(-9)}</Typography>
                    </Box>
                  </Tooltip>
                )}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
