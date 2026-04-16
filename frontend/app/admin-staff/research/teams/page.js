'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, CircularProgress, useTheme, Button, Chip, Avatar, TextField } from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, PersonAdd as InviteIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';

const TEAMS = [
  { id:1, project:'ML Malaria Detection – Kisumu', award:'WA-2024-003', pi:'Dr. Aisha Wambua', members:[{ name:'Dr. Lydia Mwangi', role:'Co-Investigator', status:'Active' },{ name:'Prof. Simon Njoroge', role:'Data Engineer', status:'Active' },{ name:'Ms. Grace Achieng', role:'Research Associate', status:'Active' },{ name:'Mr. Peter Owino', role:'Field Enumerator', status:'Active' }], status:'Active', institution:'University of Nairobi' },
  { id:2, project:'Genomic Surveillance of Drug-Resistant TB', award:'WA-2023-019', pi:'Dr. Aisha Wambua', members:[{ name:'Dr. Fatuma Hassan', role:'Ethics Researcher', status:'Active' },{ name:'Dr. Ahmed Osman', role:'Co-Investigator', status:'Active' },{ name:'Ms. Janet Njoki', role:'Lab Technician', status:'Active' }], status:'Active', institution:'KEMRI-Wellcome Trust' },
  { id:3, project:'Community Water Governance – Turkana', award:'APP-2024-0041', pi:'Prof. David Kiprotich', members:[{ name:'Mr. Patrick Kimani', role:'Research Assistant', status:'Active' },{ name:'Ms. Sarah Lokiru', role:'Community Liaison', status:'Onboarding' }], status:'Proposed', institution:'University of Nairobi' },
];

const COLORS = ['#1ca7a1','#8b5cf6','#0ea5e9','#10b981','#f97316','#ef4444'];
const roleColor = r => ({ 'Principal Investigator':'#ef4444','Co-Investigator':'#8b5cf6','Data Engineer':'#0ea5e9','Research Associate':'#10b981','Field Enumerator':'#f97316','Lab Technician':'#06b6d4','Ethics Researcher':'#f59e0b','Research Assistant':'#64748b','Community Liaison':'#8b5cf6' }[r] || '#64748b');

export default function ResearchTeamsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchUser().then(u => { if (!u) router.push('/login'); else setLoading(false); }); }, []);

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  const filtered = TEAMS.filter(t => !search || t.project.toLowerCase().includes(search.toLowerCase()) || t.pi.toLowerCase().includes(search.toLowerCase()));
  const totalMembers = TEAMS.reduce((a, t) => a + t.members.length + 1, 0);

  return (
    <Box sx={{ p:3 }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:3 }}>
        <Box>
          <Typography sx={{ fontSize:22, fontWeight:700, color:'text.primary' }}>Research Teams</Typography>
          <Typography sx={{ fontSize:13, color:'text.secondary', mt:0.3 }}>Manage project teams, PI/Co-I assignments, and collaborator access across all research projects</Typography>
        </Box>
        <Button variant="contained" size="small" startIcon={<InviteIcon />}
          sx={{ bgcolor:'#ef4444', textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#dc2626' } }}>
          Invite Collaborator
        </Button>
      </Box>

      <Box sx={{ display:'flex', gap:2, mb:3, flexWrap:'wrap' }}>
        {[{ label:'Active Teams', value: TEAMS.filter(t => t.status==='Active').length, color:'#10b981' },
          { label:'Total Members', value: totalMembers, color:'#1ca7a1' },
          { label:'Onboarding', value: TEAMS.flatMap(t => t.members).filter(m => m.status==='Onboarding').length, color:'#f59e0b' },
        ].map(k => (
          <Box key={k.label} sx={{ flex:'1 1 130px', bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2, p:1.5, textAlign:'center' }}>
            <Typography sx={{ fontSize:20, fontWeight:700, color: k.color }}>{k.value}</Typography>
            <Typography sx={{ fontSize:11, color:'text.secondary', fontWeight:600 }}>{k.label}</Typography>
          </Box>
        ))}
      </Box>

      <TextField placeholder="Search by project or PI…" value={search} onChange={e => setSearch(e.target.value)} size="small"
        InputProps={{ startAdornment: <SearchIcon sx={{ fontSize:18, color:'text.disabled', mr:1 }} /> }}
        sx={{ mb:2.5, width:320, '& .MuiOutlinedInput-root':{ borderRadius:2 } }} />

      <Box sx={{ display:'flex', flexDirection:'column', gap:2.5 }}>
        {filtered.map((team, i) => (
          <Box key={team.id} sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderLeft:`4px solid ${COLORS[i % COLORS.length]}`, borderRadius:2.5, p:2.5 }}>
            <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:2 }}>
              <Box>
                <Typography sx={{ fontSize:14, fontWeight:700, color:'text.primary', mb:0.3 }}>{team.project}</Typography>
                <Box sx={{ display:'flex', gap:1 }}>
                  <Chip label={team.award} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor:'rgba(28,167,161,0.1)', color:'#1ca7a1' }} />
                  <Chip label={team.institution} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor: dark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.05)', color:'text.secondary' }} />
                  <Chip label={team.status} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor: team.status==='Active'?'rgba(16,185,129,0.1)':'rgba(245,158,11,0.1)', color: team.status==='Active'?'#10b981':'#f59e0b' }} />
                </Box>
              </Box>
              <Button size="small" startIcon={<AddIcon />} sx={{ textTransform:'none', fontSize:11, color: COLORS[i % COLORS.length], fontWeight:600 }}>Add Member</Button>
            </Box>

            <Box sx={{ mb:1.5 }}>
              <Typography sx={{ fontSize:11, color:'text.secondary', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, mb:1 }}>Principal Investigator</Typography>
              <Box sx={{ display:'flex', alignItems:'center', gap:1.5, p:1.25, bgcolor: dark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)', borderRadius:1.5 }}>
                <Avatar sx={{ width:30, height:30, fontSize:11, fontWeight:700, bgcolor:'#ef4444' }}>{team.pi.split(' ').map(n=>n[0]).join('').slice(0,2)}</Avatar>
                <Box>
                  <Typography sx={{ fontSize:13, fontWeight:600, color:'text.primary' }}>{team.pi}</Typography>
                  <Chip label="Principal Investigator" size="small" sx={{ fontSize:9, fontWeight:600, bgcolor:'rgba(239,68,68,0.1)', color:'#ef4444', mt:0.3 }} />
                </Box>
              </Box>
            </Box>

            <Typography sx={{ fontSize:11, color:'text.secondary', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, mb:1 }}>Team Members ({team.members.length})</Typography>
            <Box sx={{ display:'flex', flexDirection:'column', gap:0.75 }}>
              {team.members.map((m,j) => (
                <Box key={j} sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', p:1.25, bgcolor: dark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)', borderRadius:1.5 }}>
                  <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
                    <Avatar sx={{ width:26, height:26, fontSize:10, fontWeight:700, bgcolor: COLORS[(i+j+1) % COLORS.length] }}>{m.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</Avatar>
                    <Box>
                      <Typography sx={{ fontSize:12, fontWeight:600, color:'text.primary' }}>{m.name}</Typography>
                      <Chip label={m.role} size="small" sx={{ fontSize:9, fontWeight:600, bgcolor: roleColor(m.role)+'22', color: roleColor(m.role), mt:0.2 }} />
                    </Box>
                  </Box>
                  <Chip label={m.status} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor: m.status==='Active'?'rgba(16,185,129,0.1)':'rgba(245,158,11,0.1)', color: m.status==='Active'?'#10b981':'#f59e0b' }} />
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
