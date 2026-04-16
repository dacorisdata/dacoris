'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Chip, CircularProgress, Button, useTheme, Avatar } from '@mui/material';
import { Add as AddIcon, PersonAdd as InviteIcon } from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';

const TEAMS = [
  { id:1, project:'ML Malaria Detection', role:'Principal Investigator', members:[{ name:'Dr. Lydia Mwangi', role:'Co-Investigator', status:'Active' },{ name:'Prof. Simon Njoroge', role:'Data Engineer', status:'Active' },{ name:'Ms. Grace Achieng', role:'Research Associate', status:'Active' }], access:'Full Edit' },
  { id:2, project:'TB Genomic Surveillance', role:'Principal Investigator', members:[{ name:'Dr. Fatuma Hassan', role:'Ethics Researcher', status:'Active' },{ name:'Dr. Ahmed Osman', role:'Co-Investigator', status:'Active' }], access:'Full Edit' },
  { id:3, project:'Nutrition Cohort Follow-up', role:'Co-Investigator', members:[{ name:'Prof. David Kiprotich', role:'PI', status:'Active' },{ name:'Mr. Patrick Kimani', role:'Research Assistant', status:'Active' }], access:'Contribute' },
];

const COLORS = ['#1ca7a1','#8b5cf6','#0ea5e9','#10b981','#f97316','#ef4444'];
const roleColor = r => ({ 'Principal Investigator':'#ef4444','Co-Investigator':'#8b5cf6','Data Engineer':'#0ea5e9','Research Associate':'#10b981','Ethics Researcher':'#f59e0b' }[r] || '#64748b');

export default function ResearcherCollaborations() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchUser().then(u => { if (!u) router.push('/login'); else setLoading(false); }); }, []);

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  const totalCollaborators = [...new Set(TEAMS.flatMap(t => t.members.map(m => m.name)))].length;

  return (
    <Box sx={{ p:3 }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:3 }}>
        <Box>
          <Typography sx={{ fontSize:22, fontWeight:700, color:'text.primary' }}>My Teams</Typography>
          <Typography sx={{ fontSize:13, color:'text.secondary', mt:0.3 }}>Research team membership and collaborator management across all your projects</Typography>
        </Box>
        <Button variant="contained" size="small" startIcon={<InviteIcon />}
          sx={{ bgcolor:'#1ca7a1', textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
          Invite Collaborator
        </Button>
      </Box>

      <Box sx={{ display:'flex', gap:2, mb:3, flexWrap:'wrap' }}>
        <Box sx={{ flex:'1 1 120px', bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2, p:1.5, textAlign:'center' }}>
          <Typography sx={{ fontSize:20, fontWeight:700, color:'#1ca7a1' }}>{TEAMS.length}</Typography>
          <Typography sx={{ fontSize:11, color:'text.secondary', fontWeight:600 }}>Active Teams</Typography>
        </Box>
        <Box sx={{ flex:'1 1 120px', bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2, p:1.5, textAlign:'center' }}>
          <Typography sx={{ fontSize:20, fontWeight:700, color:'#8b5cf6' }}>{totalCollaborators}</Typography>
          <Typography sx={{ fontSize:11, color:'text.secondary', fontWeight:600 }}>Collaborators</Typography>
        </Box>
        <Box sx={{ flex:'1 1 120px', bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2, p:1.5, textAlign:'center' }}>
          <Typography sx={{ fontSize:20, fontWeight:700, color:'#10b981' }}>{TEAMS.filter(t => t.role === 'Principal Investigator').length}</Typography>
          <Typography sx={{ fontSize:11, color:'text.secondary', fontWeight:600 }}>As PI</Typography>
        </Box>
      </Box>

      <Box sx={{ display:'flex', flexDirection:'column', gap:2 }}>
        {TEAMS.map((team, i) => (
          <Box key={team.id} sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderLeft:`4px solid ${COLORS[i % COLORS.length]}`, borderRadius:2.5, p:2.5 }}>
            <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:2 }}>
              <Box>
                <Typography sx={{ fontSize:14, fontWeight:700, color:'text.primary', mb:0.3 }}>{team.project}</Typography>
                <Box sx={{ display:'flex', gap:1 }}>
                  <Chip label={team.role} size="small" sx={{ fontSize:10, fontWeight:700, bgcolor: roleColor(team.role)+'22', color: roleColor(team.role) }} />
                  <Chip label={`Access: ${team.access}`} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor: dark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.05)', color:'text.secondary' }} />
                </Box>
              </Box>
              <Button size="small" startIcon={<AddIcon />} sx={{ textTransform:'none', fontSize:11, color:'#1ca7a1', fontWeight:600 }}>Add Member</Button>
            </Box>

            <Box sx={{ display:'flex', flexDirection:'column', gap:1 }}>
              {team.members.map((m, j) => (
                <Box key={j} sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', p:1.25, bgcolor: dark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)', borderRadius:1.5 }}>
                  <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
                    <Avatar sx={{ width:30, height:30, fontSize:11, fontWeight:700, bgcolor: COLORS[(i+j+1) % COLORS.length] }}>
                      {m.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontSize:13, fontWeight:600, color:'text.primary' }}>{m.name}</Typography>
                      <Typography sx={{ fontSize:11, color:'text.secondary' }}>{m.role}</Typography>
                    </Box>
                  </Box>
                  <Chip label={m.status} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor:'rgba(16,185,129,0.1)', color:'#10b981' }} />
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
