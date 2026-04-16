'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Avatar, Button, useTheme,
  TextField, Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';

const MOCK_FUNDERS = [
  { id:1, name:'Wellcome Trust', type:'Foundation', country:'UK', status:'Active', grants:3, totalAwarded:'USD 1.2M', nextDeadline:'2024-06-15', pipeline:'Invited', contact:'grants@wellcome.org' },
  { id:2, name:'Bill & Melinda Gates Foundation', type:'Foundation', country:'USA', status:'Active', grants:5, totalAwarded:'USD 3.8M', nextDeadline:'2024-07-01', pipeline:'Awarded', contact:'global-health@gatesfoundation.org' },
  { id:3, name:'USAID Kenya', type:'Government', country:'USA/KE', status:'Active', grants:2, totalAwarded:'USD 800K', nextDeadline:'2024-05-20', pipeline:'Submitted', contact:'nairobi@usaid.gov' },
  { id:4, name:'European Research Council', type:'Government', country:'EU', status:'Prospecting', grants:0, totalAwarded:'—', nextDeadline:'2024-09-30', pipeline:'Prospecting', contact:'erc@ec.europa.eu' },
  { id:5, name:'African Development Bank', type:'DFI', country:'Pan-African', status:'Active', grants:1, totalAwarded:'USD 500K', nextDeadline:'2024-08-10', pipeline:'Renewed', contact:'afdb@afdb.org' },
  { id:6, name:'Kenya National Research Fund', type:'Government', country:'Kenya', status:'Active', grants:4, totalAwarded:'KES 12M', nextDeadline:'2024-04-30', pipeline:'Submitted', contact:'info@knrf.go.ke' },
];

const pipelineColor = p => ({Prospecting:'#64748b', Invited:'#f59e0b', Submitted:'#8b5cf6', Awarded:'#10b981', Renewed:'#0ea5e9'}[p] || '#64748b');

export default function FunderCRMPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchUser().then(u => { if (!u) router.push('/login'); else setLoading(false); });
  }, []);

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  const filtered = MOCK_FUNDERS.filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'text.primary' }}>Funder CRM</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.3 }}>Manage funder relationships, pipelines, and engagement history</Typography>
        </Box>
        <Button variant="contained" size="small" startIcon={<AddIcon />}
          sx={{ bgcolor:'#8b5cf6', textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#7c3aed' } }}>
          Add Funder
        </Button>
      </Box>

      {/* Pipeline Summary */}
      <Box sx={{ display:'flex', gap: 2, mb: 3, flexWrap:'wrap' }}>
        {['Prospecting','Invited','Submitted','Awarded','Renewed'].map(stage => {
          const count = MOCK_FUNDERS.filter(f => f.pipeline === stage).length;
          return (
            <Box key={stage} sx={{ flex:'1 1 120px', bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2, p:1.5, textAlign:'center' }}>
              <Box sx={{ width:8, height:8, borderRadius:'50%', bgcolor: pipelineColor(stage), mx:'auto', mb:0.5 }} />
              <Typography sx={{ fontSize:18, fontWeight:700, color: pipelineColor(stage) }}>{count}</Typography>
              <Typography sx={{ fontSize:11, color:'text.secondary', fontWeight:600 }}>{stage}</Typography>
            </Box>
          );
        })}
      </Box>

      <TextField placeholder="Search funders…" value={search} onChange={e => setSearch(e.target.value)} size="small"
        InputProps={{ startAdornment: <SearchIcon sx={{ fontSize:18, color:'text.disabled', mr:1 }} /> }}
        sx={{ mb: 2.5, width: 340, '& .MuiOutlinedInput-root':{ borderRadius:2 } }} />

      <Box sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:3, overflow:'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th':{ bgcolor: dark?'#0f172a':'background.default', color:'text.secondary', fontSize:11, fontWeight:700, textTransform:'uppercase', borderBottom:`1px solid ${theme.palette.divider}` } }}>
                <TableCell>Funder</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Pipeline Stage</TableCell>
                <TableCell>Active Grants</TableCell>
                <TableCell>Total Awarded</TableCell>
                <TableCell>Next Deadline</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(f => (
                <TableRow key={f.id} sx={{ '&:hover':{ bgcolor: dark?'#0f172a':'rgba(0,0,0,0.02)' }, cursor:'pointer' }} onClick={() => setSelected(f)}>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
                      <Avatar sx={{ width:32, height:32, bgcolor:'#8b5cf6', fontSize:12 }}>{f.name.charAt(0)}</Avatar>
                      <Box>
                        <Typography sx={{ fontSize:13, fontWeight:600, color:'text.primary' }}>{f.name}</Typography>
                        <Typography sx={{ fontSize:11, color:'text.secondary' }}>{f.country}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Chip label={f.type} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor:'rgba(139,92,246,0.1)', color:'#8b5cf6' }} />
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Chip label={f.pipeline} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor: pipelineColor(f.pipeline)+'22', color: pipelineColor(f.pipeline) }} />
                  </TableCell>
                  <TableCell sx={{ fontSize:13, fontWeight:700, color:'text.primary', borderBottom:`1px solid ${theme.palette.divider}` }}>{f.grants}</TableCell>
                  <TableCell sx={{ fontSize:13, color:'text.secondary', borderBottom:`1px solid ${theme.palette.divider}` }}>{f.totalAwarded}</TableCell>
                  <TableCell sx={{ fontSize:12, color: new Date(f.nextDeadline) < new Date() ? '#ef4444' : 'text.secondary', borderBottom:`1px solid ${theme.palette.divider}` }}>
                    {new Date(f.nextDeadline).toLocaleDateString('en-GB')}
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Button size="small" sx={{ color:'#8b5cf6', textTransform:'none', fontSize:11, fontWeight:600 }} onClick={e => { e.stopPropagation(); setSelected(f); }}>Profile</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Funder Profile Dialog */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="sm" fullWidth PaperProps={{ sx:{ bgcolor:'background.paper', borderRadius:3, border:`1px solid ${theme.palette.divider}` } }}>
        {selected && (
          <>
            <DialogTitle sx={{ borderBottom:`1px solid ${theme.palette.divider}`, fontWeight:700 }}>
              {selected.name}
            </DialogTitle>
            <DialogContent sx={{ pt:3 }}>
              <Box sx={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:2, mb:2 }}>
                {[['Type', selected.type],['Country', selected.country],['Pipeline Stage', selected.pipeline],['Active Grants', selected.grants],['Total Awarded', selected.totalAwarded],['Contact', selected.contact]].map(([k,v]) => (
                  <Box key={k}>
                    <Typography sx={{ fontSize:11, color:'text.secondary', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, mb:0.3 }}>{k}</Typography>
                    <Typography sx={{ fontSize:13, color:'text.primary', fontWeight:500 }}>{v}</Typography>
                  </Box>
                ))}
              </Box>
              <Alert severity="info" icon={false} sx={{ fontSize:12 }}>
                Interaction log, engagement plans, and document uploads will be available here in the full release.
              </Alert>
            </DialogContent>
            <DialogActions sx={{ px:3, pb:3 }}>
              <Button onClick={() => setSelected(null)} sx={{ textTransform:'none', color:'text.secondary' }}>Close</Button>
              <Button variant="contained" sx={{ bgcolor:'#8b5cf6', textTransform:'none', fontWeight:600, '&:hover':{ bgcolor:'#7c3aed' } }}>
                Log Interaction
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
