'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme, TextField,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Select, MenuItem, FormControl, InputLabel, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, LinearProgress,
} from '@mui/material';
import { Search as SearchIcon, Add as AddIcon, Link as DoiIcon, Lock as EmbargoIcon, LockOpen as OpenIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';

const MOCK_DATASETS = [
  { id:1, title:'Kenya Household Nutrition Survey 2023 – Longitudinal Cohort', project:'NUTR-2023', depositor:'Dr. Aisha Wambua', doi:'10.5281/zenodo.8001234', access:'public', embargo:null, records:4820, version:'v2.1', status:'Published', license:'CC-BY 4.0', year:2023 },
  { id:2, title:'TB Drug Resistance Genomic Sequences – East Africa 2022', project:'TB-GEN-2022', depositor:'Dr. Lydia Mwangi', doi:'10.5281/zenodo.7998765', access:'restricted', embargo:null, records:312, version:'v1.0', status:'Published', license:'CC-BY-NC', year:2022 },
  { id:3, title:'Community Water Quality Measurements – Turkana Basin Q1-Q4 2023', project:'WATER-2023', depositor:'WaterAid Kenya', doi:null, access:'public', embargo:null, records:1150, version:'v1.0', status:'Under Review', license:'CC0', year:2024 },
  { id:4, title:'Malaria RDT Diagnostic Records – Kisumu Sentinel Sites 2024', project:'MAL-2024', depositor:'KEMRI Lab', doi:null, access:'confidential', embargo:'2025-06-01', records:544, version:'v0.9', status:'Draft', license:'Restricted', year:2024 },
  { id:5, title:'Smallholder Agricultural Yield Data – Rift Valley 2023', project:'AGRI-2023', depositor:'Prof. David Kiprotich', doi:'10.5281/zenodo.8123456', access:'public', embargo:null, records:680, version:'v1.2', status:'Published', license:'CC-BY 4.0', year:2023 },
];

const accessColor = a => ({ public:'#10b981', restricted:'#f59e0b', confidential:'#ef4444', 'highly sensitive':'#7c3aed' }[a] || '#64748b');
const statusColor = s => ({ Published:'#10b981','Under Review':'#0ea5e9', Draft:'#64748b', Embargoed:'#f97316' }[s] || '#64748b');

export default function DataRepositoryPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [accessFilter, setAccessFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchUser().then(u => { if (!u) router.push('/login'); else setLoading(false); });
  }, []);

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  const filtered = MOCK_DATASETS.filter(d =>
    (accessFilter === 'all' || d.access === accessFilter) &&
    (!search || d.title.toLowerCase().includes(search.toLowerCase()) || d.project.toLowerCase().includes(search.toLowerCase()))
  );

  const published = MOCK_DATASETS.filter(d => d.status === 'Published').length;
  const doiMinted = MOCK_DATASETS.filter(d => d.doi).length;
  const totalRecords = MOCK_DATASETS.reduce((a,d) => a + d.records, 0);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'text.primary' }}>Trusted Data Repository</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.3 }}>FAIR-aligned data catalog · DataCite metadata · DOI minting · Access controls & embargo management</Typography>
        </Box>
        <Button variant="contained" size="small" startIcon={<AddIcon />}
          sx={{ bgcolor:'#1ca7a1', textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
          Deposit Dataset
        </Button>
      </Box>

      {/* FAIR Stats */}
      <Box sx={{ display:'flex', gap:2, mb: 3, flexWrap:'wrap' }}>
        {[{ label:'Published Datasets', value: published, color:'#10b981' },
          { label:'DOIs Minted', value: doiMinted, color:'#8b5cf6' },
          { label:'Total Records', value: totalRecords.toLocaleString(), color:'#0ea5e9' },
          { label:'Total Datasets', value: MOCK_DATASETS.length, color:'#1ca7a1' },
        ].map(k => (
          <Box key={k.label} sx={{ flex:'1 1 150px', bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2.5, p:2 }}>
            <Typography sx={{ fontSize:11, color:'text.secondary', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>{k.label}</Typography>
            <Typography sx={{ fontSize:24, fontWeight:700, color: k.color, mt:0.5 }}>{k.value}</Typography>
          </Box>
        ))}
      </Box>

      {/* FAIR compliance bar */}
      <Box sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2.5, p:2, mb:3 }}>
        <Typography sx={{ fontSize:12, fontWeight:700, color:'text.primary', mb:1.5 }}>FAIR Compliance Overview</Typography>
        <Box sx={{ display:'flex', gap:3, flexWrap:'wrap' }}>
          {[{ label:'Findable', value:80, color:'#10b981' },{ label:'Accessible', value:75, color:'#0ea5e9' },{ label:'Interoperable', value:60, color:'#f59e0b' },{ label:'Reusable', value:70, color:'#8b5cf6' }].map(f => (
            <Box key={f.label} sx={{ flex:'1 1 120px' }}>
              <Box sx={{ display:'flex', justifyContent:'space-between', mb:0.5 }}>
                <Typography sx={{ fontSize:11, color:'text.secondary' }}>{f.label}</Typography>
                <Typography sx={{ fontSize:11, fontWeight:700, color: f.color }}>{f.value}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={f.value} sx={{ height:5, borderRadius:3, bgcolor:'rgba(0,0,0,0.08)', '& .MuiLinearProgress-bar':{ bgcolor: f.color, borderRadius:3 } }} />
            </Box>
          ))}
        </Box>
      </Box>

      {/* Filters */}
      <Box sx={{ display:'flex', gap:2, mb:2.5, flexWrap:'wrap' }}>
        <TextField placeholder="Search datasets…" value={search} onChange={e => setSearch(e.target.value)} size="small"
          InputProps={{ startAdornment: <SearchIcon sx={{ fontSize:18, color:'text.disabled', mr:1 }} /> }}
          sx={{ flex:'1 1 260px', '& .MuiOutlinedInput-root':{ borderRadius:2 } }} />
        <FormControl size="small" sx={{ minWidth:160 }}>
          <InputLabel>Access Level</InputLabel>
          <Select value={accessFilter} onChange={e => setAccessFilter(e.target.value)} label="Access Level" sx={{ borderRadius:2 }}>
            <MenuItem value="all">All Access Levels</MenuItem>
            <MenuItem value="public">Public</MenuItem>
            <MenuItem value="restricted">Restricted</MenuItem>
            <MenuItem value="confidential">Confidential</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:3, overflow:'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th':{ bgcolor: dark?'#0f172a':'background.default', color:'text.secondary', fontSize:11, fontWeight:700, textTransform:'uppercase', borderBottom:`1px solid ${theme.palette.divider}` } }}>
                <TableCell>Dataset Title</TableCell><TableCell>Project</TableCell><TableCell>Access</TableCell>
                <TableCell>Records</TableCell><TableCell>DOI</TableCell><TableCell>Status</TableCell>
                <TableCell>License</TableCell><TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(d => (
                <TableRow key={d.id} sx={{ '&:hover':{ bgcolor: dark?'#0f172a':'rgba(0,0,0,0.02)' }, cursor:'pointer' }} onClick={() => setSelected(d)}>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}`, maxWidth:260 }}>
                    <Typography sx={{ fontSize:13, fontWeight:600, color:'text.primary', lineHeight:1.4 }}>{d.title}</Typography>
                    <Typography sx={{ fontSize:11, color:'text.disabled', mt:0.2 }}>v{d.version} · {d.depositor} · {d.year}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize:12, color:'text.secondary', borderBottom:`1px solid ${theme.palette.divider}` }}>{d.project}</TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Box sx={{ display:'flex', alignItems:'center', gap:0.5 }}>
                      {d.access === 'public' ? <OpenIcon sx={{ fontSize:12, color:'#10b981' }} /> : <EmbargoIcon sx={{ fontSize:12, color: accessColor(d.access) }} />}
                      <Chip label={d.access} size="small" sx={{ fontSize:10, fontWeight:700, textTransform:'capitalize', bgcolor: accessColor(d.access)+'22', color: accessColor(d.access) }} />
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontSize:13, fontWeight:600, color:'text.primary', borderBottom:`1px solid ${theme.palette.divider}` }}>{d.records.toLocaleString()}</TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    {d.doi ? <Box sx={{ display:'flex', alignItems:'center', gap:0.5 }}><DoiIcon sx={{ fontSize:11, color:'#8b5cf6' }} /><Typography sx={{ fontSize:10, color:'#8b5cf6', fontFamily:'monospace' }}>…{d.doi.slice(-10)}</Typography></Box>
                    : <Button size="small" sx={{ color:'#8b5cf6', textTransform:'none', fontSize:10, fontWeight:600, p:0 }}>Mint DOI</Button>}
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Chip label={d.status} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor: statusColor(d.status)+'22', color: statusColor(d.status) }} />
                  </TableCell>
                  <TableCell sx={{ fontSize:11, color:'text.secondary', borderBottom:`1px solid ${theme.palette.divider}` }}>{d.license}</TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Button size="small" sx={{ color:'#1ca7a1', textTransform:'none', fontSize:11, fontWeight:600 }}>View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {filtered.length === 0 && <Box sx={{ p:4, textAlign:'center' }}><Typography sx={{ color:'text.secondary' }}>No datasets found</Typography></Box>}
      </Box>
    </Box>
  );
}
