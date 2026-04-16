'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Chip, CircularProgress, Button, useTheme, Avatar } from '@mui/material';
import { Check as AcceptIcon, Close as DeclineIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';

const INVITATIONS = [
  { id:1, from:'Prof. Margaret Otieno', project:'Climate Smart Agriculture – Rift Valley Study', role:'Co-Investigator', expires:'2024-04-15', status:'pending', institution:'University of Nairobi' },
  { id:2, from:'Dr. James Kariuki', project:'Urban Health Inequalities – Nairobi Slum Communities', role:'Data Analyst', expires:'2024-03-30', status:'pending', institution:'KEMRI-Wellcome Trust' },
];

export default function InvitationsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState(INVITATIONS);

  useEffect(() => { fetchUser().then(u => { if (!u) router.push('/login'); else setLoading(false); }); }, []);

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  const pending = invites.filter(i => i.status === 'pending');

  return (
    <Box sx={{ p:3 }}>
      <Box sx={{ mb:3 }}>
        <Typography sx={{ fontSize:22, fontWeight:700, color:'text.primary' }}>Invitations</Typography>
        <Typography sx={{ fontSize:13, color:'text.secondary', mt:0.3 }}>Pending collaboration invitations from other researchers</Typography>
      </Box>

      {pending.length === 0 ? (
        <Box sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2.5, p:4, textAlign:'center' }}>
          <Typography sx={{ color:'text.secondary', fontSize:14 }}>No pending invitations</Typography>
        </Box>
      ) : (
        <Box sx={{ display:'flex', flexDirection:'column', gap:2 }}>
          {pending.map(inv => (
            <Box key={inv.id} sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2.5, p:2.5 }}>
              <Box sx={{ display:'flex', gap:2, mb:2 }}>
                <Avatar sx={{ width:40, height:40, bgcolor:'#1ca7a1', fontSize:14, fontWeight:700, flexShrink:0 }}>
                  {inv.from.split(' ').map(n=>n[0]).join('').slice(0,2)}
                </Avatar>
                <Box>
                  <Typography sx={{ fontSize:13, fontWeight:700, color:'text.primary', mb:0.2 }}>{inv.from}</Typography>
                  <Typography sx={{ fontSize:11, color:'text.secondary' }}>{inv.institution}</Typography>
                </Box>
              </Box>
              <Typography sx={{ fontSize:13, fontWeight:600, color:'text.primary', mb:0.5 }}>{inv.project}</Typography>
              <Box sx={{ display:'flex', gap:1, mb:2 }}>
                <Chip label={`Role: ${inv.role}`} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor:'rgba(28,167,161,0.1)', color:'#1ca7a1' }} />
                <Typography sx={{ fontSize:11, color: new Date(inv.expires) < new Date() ? '#ef4444' : 'text.disabled', alignSelf:'center' }}>
                  Expires {new Date(inv.expires).toLocaleDateString('en-GB')}
                </Typography>
              </Box>
              <Box sx={{ display:'flex', gap:1 }}>
                <Button variant="outlined" size="small" startIcon={<DeclineIcon />}
                  onClick={() => setInvites(i => i.map(x => x.id === inv.id ? {...x, status:'declined'} : x))}
                  sx={{ textTransform:'none', fontSize:12, fontWeight:600, borderRadius:2, borderColor:'#ef4444', color:'#ef4444', flex:1 }}>
                  Decline
                </Button>
                <Button variant="contained" size="small" startIcon={<AcceptIcon />}
                  onClick={() => setInvites(i => i.map(x => x.id === inv.id ? {...x, status:'accepted'} : x))}
                  sx={{ textTransform:'none', fontSize:12, fontWeight:600, borderRadius:2, bgcolor:'#1ca7a1', flex:2, '&:hover':{ bgcolor:'#0e7490' } }}>
                  Accept Invitation
                </Button>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
