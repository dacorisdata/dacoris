'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Chip, CircularProgress, Avatar, Button, useTheme } from '@mui/material';
import { Add as AddIcon, AccessTime as TimeIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';

const STAGES = [
  { key: 'intake',        label: 'Intake',           color: '#64748b' },
  { key: 'eligibility',   label: 'Eligibility',      color: '#f59e0b' },
  { key: 'internal_review',label: 'Internal Review', color: '#8b5cf6' },
  { key: 'panel_review',  label: 'Panel Review',     color: '#0ea5e9' },
  { key: 'due_diligence', label: 'Due Diligence',    color: '#f97316' },
  { key: 'award',         label: 'Award',            color: '#10b981' },
];

const MOCK = {
  intake:         [{ id:1, title:'Community Health Grant – Nairobi County', applicant:'Dr. Aisha Wambua', amount:'KES 2.4M', days:2 }, { id:2, title:'Maternal Nutrition Research', applicant:'Prof. David Kiprotich', amount:'USD 45,000', days:5 }],
  eligibility:    [{ id:3, title:'Climate Adaptation Smallholder Farms', applicant:'Agri-Research Consortium', amount:'USD 120,000', days:8 }],
  internal_review:[{ id:4, title:'TB Diagnostics Innovation Fund', applicant:'KEMRI Lab Sciences', amount:'KES 8.1M', days:12 }, { id:5, title:'Open Data Infrastructure', applicant:'Digital Futures Lab', amount:'USD 80,000', days:3 }],
  panel_review:   [{ id:6, title:'HIV Prevention Youth Programme', applicant:'Health Advocacy Trust', amount:'USD 200,000', days:18 }],
  due_diligence:  [{ id:7, title:'Agricultural Extension Technology', applicant:'FarmTech Kenya Ltd', amount:'USD 95,000', days:7 }],
  award:          [{ id:8, title:'Water Purification Pilot – Turkana', applicant:'WaterAid Kenya', amount:'USD 55,000', days:1 }],
};

export default function GrantPipelinePage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser().then(u => {
      if (!u) { router.push('/login'); return; }
      setLoading(false);
    });
  }, []);

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  const total = Object.values(MOCK).reduce((a, b) => a + b.length, 0);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'text.primary' }}>Application Pipeline</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.3 }}>{total} applications across {STAGES.length} stages</Typography>
        </Box>
        <Button variant="contained" size="small" startIcon={<AddIcon />}
          sx={{ bgcolor:'#8b5cf6', textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#7c3aed' } }}>
          New Application
        </Button>
      </Box>

      <Box sx={{ display:'flex', gap: 2, overflowX:'auto', pb: 2 }}>
        {STAGES.map(stage => {
          const cards = MOCK[stage.key] || [];
          return (
            <Box key={stage.key} sx={{ minWidth: 260, flexShrink: 0 }}>
              <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb: 1.5, px: 0.5 }}>
                <Box sx={{ display:'flex', alignItems:'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius:'50%', bgcolor: stage.color }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.primary' }}>{stage.label}</Typography>
                </Box>
                <Chip label={cards.length} size="small" sx={{ height: 20, fontSize: 11, fontWeight: 700, bgcolor: stage.color + '22', color: stage.color }} />
              </Box>
              <Box sx={{ display:'flex', flexDirection:'column', gap: 1.5 }}>
                {cards.map(card => (
                  <Box key={card.id} sx={{
                    bgcolor: 'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius: 2.5,
                    p: 2, cursor:'pointer', transition:'all 0.15s',
                    borderLeft: `3px solid ${stage.color}`,
                    '&:hover':{ boxShadow: dark ? 'none' : '0 4px 12px rgba(0,0,0,0.1)', transform:'translateY(-1px)' },
                  }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mb: 0.5, lineHeight: 1.4 }}>{card.title}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 1 }}>{card.applicant}</Typography>
                    <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <Chip label={card.amount} size="small" sx={{ bgcolor:'rgba(16,185,129,0.1)', color:'#10b981', fontSize:10, fontWeight:700, height:20 }} />
                      <Box sx={{ display:'flex', alignItems:'center', gap: 0.5 }}>
                        <TimeIcon sx={{ fontSize: 11, color: card.days > 10 ? '#ef4444' : 'text.disabled' }} />
                        <Typography sx={{ fontSize: 10, color: card.days > 10 ? '#ef4444' : 'text.disabled' }}>{card.days}d</Typography>
                      </Box>
                    </Box>
                  </Box>
                ))}
                {cards.length === 0 && (
                  <Box sx={{ bgcolor: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border:`1px dashed ${theme.palette.divider}`, borderRadius: 2.5, p: 3, textAlign:'center' }}>
                    <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>No applications</Typography>
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
