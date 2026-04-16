'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme, TextField,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, Sync as SyncIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';

const SOURCES = [
  { key:'internal',  label:'Internal Form Builder', color:'#1ca7a1', icon:'🗂' },
  { key:'kobo',      label:'KoBoToolbox',            color:'#f59e0b', icon:'📋' },
  { key:'odk',       label:'ODK Central',            color:'#0ea5e9', icon:'📱' },
  { key:'redcap',    label:'REDCap',                 color:'#8b5cf6', icon:'🏥' },
  { key:'msforms',   label:'Microsoft Forms',        color:'#10b981', icon:'📊' },
];

const MOCK_FORMS = [
  { id:1, title:'Household Nutrition Survey 2024', source:'kobo', project:'NUTR-2024', submissions:1840, status:'Active', lastSync:'2024-03-15', ethics:'Approved' },
  { id:2, title:'TB Patient Follow-up Form', source:'redcap', project:'TB-2023', submissions:312, status:'Active', lastSync:'2024-03-14', ethics:'Approved' },
  { id:3, title:'Community Water Quality Assessment', source:'odk', project:'WATER-2024', submissions:98, status:'Active', lastSync:'2024-03-13', ethics:'Approved' },
  { id:4, title:'Staff Digital Literacy Survey', source:'msforms', project:'ADMIN-2024', submissions:67, status:'Closed', lastSync:'2024-02-28', ethics:'Exempt' },
  { id:5, title:'Malaria Rapid Diagnostic Test Log', source:'internal', project:'MAL-2024', submissions:544, status:'Active', lastSync:'2024-03-15', ethics:'Approved' },
  { id:6, title:'Agricultural Extension Feedback Form', source:'kobo', project:'AGRI-2024', submissions:229, status:'Draft', lastSync:null, ethics:'Pending' },
];

const srcColor = s => SOURCES.find(x => x.key === s)?.color || '#64748b';
const srcLabel = s => SOURCES.find(x => x.key === s)?.label || s;
const statusColor = s => ({ Active:'#10b981', Closed:'#64748b', Draft:'#f59e0b', Paused:'#f97316' }[s] || '#64748b');

export default function CaptureFormsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [integrationOpen, setIntegrationOpen] = useState(false);

  useEffect(() => {
    fetchUser().then(u => { if (!u) router.push('/login'); else setLoading(false); });
  }, []);

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  const filtered = MOCK_FORMS.filter(f => !search || f.title.toLowerCase().includes(search.toLowerCase()) || f.project.toLowerCase().includes(search.toLowerCase()));
  const totalSubmissions = MOCK_FORMS.reduce((a,f) => a + f.submissions, 0);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'text.primary' }}>Data Capture Forms</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.3 }}>Manage internal forms and integrations with KoBoToolbox, ODK Central, REDCap, and Microsoft Forms</Typography>
        </Box>
        <Box sx={{ display:'flex', gap:1 }}>
          <Button variant="outlined" size="small" startIcon={<SyncIcon />} onClick={() => setIntegrationOpen(true)}
            sx={{ textTransform:'none', fontWeight:600, borderRadius:2, borderColor:'#1ca7a1', color:'#1ca7a1' }}>
            Integrations
          </Button>
          <Button variant="contained" size="small" startIcon={<AddIcon />}
            sx={{ bgcolor:'#1ca7a1', textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
            Build Form
          </Button>
        </Box>
      </Box>

      {/* Source badges */}
      <Box sx={{ display:'flex', gap: 1.5, mb: 3, flexWrap:'wrap' }}>
        {SOURCES.map(s => {
          const count = MOCK_FORMS.filter(f => f.source === s.key).length;
          return (
            <Box key={s.key} sx={{ display:'flex', alignItems:'center', gap:1, bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2, px:1.5, py:1 }}>
              <Typography sx={{ fontSize:14 }}>{s.icon}</Typography>
              <Box>
                <Typography sx={{ fontSize:11, fontWeight:600, color:'text.primary' }}>{s.label}</Typography>
                <Typography sx={{ fontSize:10, color:'text.secondary' }}>{count} forms</Typography>
              </Box>
            </Box>
          );
        })}
        <Box sx={{ ml:'auto', bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2, px:2, py:1, textAlign:'center' }}>
          <Typography sx={{ fontSize:20, fontWeight:700, color:'#1ca7a1' }}>{totalSubmissions.toLocaleString()}</Typography>
          <Typography sx={{ fontSize:10, color:'text.secondary', fontWeight:600 }}>Total Submissions</Typography>
        </Box>
      </Box>

      <TextField placeholder="Search forms…" value={search} onChange={e => setSearch(e.target.value)} size="small"
        InputProps={{ startAdornment: <SearchIcon sx={{ fontSize:18, color:'text.disabled', mr:1 }} /> }}
        sx={{ mb: 2.5, width: 340, '& .MuiOutlinedInput-root':{ borderRadius:2 } }} />

      <Box sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:3, overflow:'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th':{ bgcolor: dark?'#0f172a':'background.default', color:'text.secondary', fontSize:11, fontWeight:700, textTransform:'uppercase', borderBottom:`1px solid ${theme.palette.divider}` } }}>
                <TableCell>Form Title</TableCell><TableCell>Source</TableCell><TableCell>Project</TableCell>
                <TableCell>Submissions</TableCell><TableCell>Ethics</TableCell><TableCell>Status</TableCell>
                <TableCell>Last Sync</TableCell><TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(f => (
                <TableRow key={f.id} sx={{ '&:hover':{ bgcolor: dark?'#0f172a':'rgba(0,0,0,0.02)' } }}>
                  <TableCell sx={{ fontSize:13, fontWeight:600, color:'text.primary', borderBottom:`1px solid ${theme.palette.divider}` }}>{f.title}</TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Chip label={srcLabel(f.source)} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor: srcColor(f.source)+'22', color: srcColor(f.source) }} />
                  </TableCell>
                  <TableCell sx={{ fontSize:12, color:'text.secondary', borderBottom:`1px solid ${theme.palette.divider}` }}>{f.project}</TableCell>
                  <TableCell sx={{ fontSize:13, fontWeight:700, color:'text.primary', borderBottom:`1px solid ${theme.palette.divider}` }}>{f.submissions.toLocaleString()}</TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Chip label={f.ethics} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor: f.ethics==='Approved'?'rgba(16,185,129,0.1)': f.ethics==='Pending'?'rgba(245,158,11,0.1)':'rgba(100,116,139,0.1)', color: f.ethics==='Approved'?'#10b981': f.ethics==='Pending'?'#f59e0b':'#64748b' }} />
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Chip label={f.status} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor: statusColor(f.status)+'22', color: statusColor(f.status) }} />
                  </TableCell>
                  <TableCell sx={{ fontSize:11, color:'text.secondary', borderBottom:`1px solid ${theme.palette.divider}` }}>{f.lastSync ? new Date(f.lastSync).toLocaleDateString('en-GB') : '—'}</TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Button size="small" sx={{ color:'#1ca7a1', textTransform:'none', fontSize:11, fontWeight:600 }}>View</Button>
                    {f.source !== 'internal' && <Button size="small" startIcon={<SyncIcon sx={{ fontSize:'12px !important' }} />} sx={{ color:'text.secondary', textTransform:'none', fontSize:11 }}>Sync</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Integration Dialog */}
      <Dialog open={integrationOpen} onClose={() => setIntegrationOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx:{ bgcolor:'background.paper', borderRadius:3, border:`1px solid ${theme.palette.divider}` } }}>
        <DialogTitle sx={{ fontWeight:700, borderBottom:`1px solid ${theme.palette.divider}` }}>Data Capture Integrations</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display:'flex', flexDirection:'column', gap: 2 }}>
            {SOURCES.filter(s => s.key !== 'internal').map(s => (
              <Box key={s.key} sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', p:2, border:`1px solid ${theme.palette.divider}`, borderRadius:2 }}>
                <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
                  <Typography sx={{ fontSize:20 }}>{s.icon}</Typography>
                  <Box>
                    <Typography sx={{ fontSize:13, fontWeight:600, color:'text.primary' }}>{s.label}</Typography>
                    <Typography sx={{ fontSize:11, color:'text.secondary' }}>
                      {s.key === 'kobo' ? 'OAuth2 + webhook sync' :
                       s.key === 'odk'  ? 'REST API + ODK Central server' :
                       s.key === 'redcap' ? 'API token authentication' :
                       'Microsoft Graph API (M365)'}
                    </Typography>
                  </Box>
                </Box>
                <Button size="small" variant="outlined" sx={{ textTransform:'none', fontSize:11, fontWeight:600, borderRadius:2, borderColor: s.color, color: s.color }}>
                  Configure
                </Button>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px:3, pb:3 }}>
          <Button onClick={() => setIntegrationOpen(false)} sx={{ textTransform:'none', color:'text.secondary' }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
