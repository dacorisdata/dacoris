'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme, TextField,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, Link as DoiIcon, Sync as OrcidIcon } from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';

const MY_PUBS = [
  { id:1, type:'Journal Article', title:'Machine Learning for Early Malaria Detection in Sub-Saharan Africa', journal:'Nature Medicine', year:2024, doi:'10.1038/s41591-024-0001', oa:true, status:'Published', citations:12, project:'ML Malaria Detection' },
  { id:2, type:'Conference Paper', title:'Federated Data Analysis for Infectious Disease Surveillance: Lessons from Kenya', journal:'ACM Digital Health 2023', year:2023, doi:'10.1145/1234567.1234568', oa:true, status:'Published', citations:5, project:'ML Malaria Detection' },
  { id:3, type:'Journal Article', title:'Drug Resistance Patterns in M. tuberculosis: A Genomic Epidemiology Study', journal:'Lancet Infectious Diseases', year:2024, doi:null, oa:false, status:'Under Review', citations:0, project:'TB Genomic Surveillance' },
  { id:4, type:'Dataset', title:'Kenyan Malaria RDT Records – Kisumu Sentinel Sites Q1 2024', journal:'DACORIS Repository', year:2024, doi:null, oa:false, status:'Draft', citations:0, project:'ML Malaria Detection' },
  { id:5, type:'Report', title:'Interim Progress Report: Genomic Surveillance TB – Year 2', journal:'Wellcome Trust', year:2024, doi:null, oa:false, status:'Submitted', citations:0, project:'TB Genomic Surveillance' },
];

const typeColor = t => ({ 'Journal Article':'#0ea5e9','Conference Paper':'#8b5cf6',Dataset:'#10b981',Report:'#f59e0b','Book Chapter':'#f97316' }[t] || '#64748b');
const statusColor = s => ({ Published:'#10b981','Under Review':'#0ea5e9',Draft:'#64748b',Submitted:'#f59e0b' }[s] || '#64748b');

export default function ResearcherPublications() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => { fetchUser().then(u => { if (!u) router.push('/login'); else setLoading(false); }); }, []);

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  const filtered = MY_PUBS.filter(p =>
    (typeFilter === 'all' || p.type === typeFilter) &&
    (!search || p.title.toLowerCase().includes(search.toLowerCase()) || p.journal.toLowerCase().includes(search.toLowerCase()))
  );

  const totalCitations = MY_PUBS.reduce((a,p) => a + p.citations, 0);

  return (
    <Box sx={{ p:3 }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:3 }}>
        <Box>
          <Typography sx={{ fontSize:22, fontWeight:700, color:'text.primary' }}>Publications & Outputs</Typography>
          <Typography sx={{ fontSize:13, color:'text.secondary', mt:0.3 }}>All your research outputs — journals, conference papers, datasets, and reports</Typography>
        </Box>
        <Box sx={{ display:'flex', gap:1 }}>
          <Button variant="outlined" size="small" startIcon={<OrcidIcon />}
            sx={{ textTransform:'none', fontSize:12, fontWeight:600, borderRadius:2, borderColor:'#83b818', color:'#83b818' }}>
            Sync ORCID
          </Button>
          <Button variant="contained" size="small" startIcon={<AddIcon />}
            sx={{ bgcolor:'#1ca7a1', textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
            Add Output
          </Button>
        </Box>
      </Box>

      <Box sx={{ display:'flex', gap:2, mb:3, flexWrap:'wrap' }}>
        {[{ label:'Total Outputs', value: MY_PUBS.length, color:'#1ca7a1' },{ label:'Published', value: MY_PUBS.filter(p => p.status==='Published').length, color:'#10b981' },{ label:'Open Access', value: MY_PUBS.filter(p => p.oa).length, color:'#8b5cf6' },{ label:'Total Citations', value: totalCitations, color:'#0ea5e9' }].map(k => (
          <Box key={k.label} sx={{ flex:'1 1 130px', bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2.5, p:2 }}>
            <Typography sx={{ fontSize:11, color:'text.secondary', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>{k.label}</Typography>
            <Typography sx={{ fontSize:24, fontWeight:700, color: k.color, mt:0.5 }}>{k.value}</Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ display:'flex', gap:2, mb:2.5, flexWrap:'wrap' }}>
        <TextField placeholder="Search by title or journal…" value={search} onChange={e => setSearch(e.target.value)} size="small"
          InputProps={{ startAdornment: <SearchIcon sx={{ fontSize:18, color:'text.disabled', mr:1 }} /> }}
          sx={{ flex:'1 1 260px', '& .MuiOutlinedInput-root':{ borderRadius:2 } }} />
        <FormControl size="small" sx={{ minWidth:160 }}>
          <InputLabel>Type</InputLabel>
          <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} label="Type" sx={{ borderRadius:2 }}>
            <MenuItem value="all">All Types</MenuItem>
            {[...new Set(MY_PUBS.map(p => p.type))].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:3, overflow:'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th':{ bgcolor: dark?'#0f172a':'background.default', color:'text.secondary', fontSize:11, fontWeight:700, textTransform:'uppercase', borderBottom:`1px solid ${theme.palette.divider}` } }}>
                <TableCell>Title</TableCell><TableCell>Type</TableCell><TableCell>Year</TableCell>
                <TableCell>DOI</TableCell><TableCell>Citations</TableCell><TableCell>OA</TableCell><TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id} sx={{ '&:hover':{ bgcolor: dark?'#0f172a':'rgba(0,0,0,0.02)' } }}>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}`, maxWidth:280 }}>
                    <Typography sx={{ fontSize:13, fontWeight:600, color:'text.primary', lineHeight:1.4 }}>{p.title}</Typography>
                    <Typography sx={{ fontSize:11, color:'text.disabled', mt:0.2 }}>{p.journal}</Typography>
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Chip label={p.type} size="small" sx={{ fontSize:9, fontWeight:700, bgcolor: typeColor(p.type)+'22', color: typeColor(p.type) }} />
                  </TableCell>
                  <TableCell sx={{ fontSize:13, fontWeight:600, color:'text.primary', borderBottom:`1px solid ${theme.palette.divider}` }}>{p.year}</TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    {p.doi ? <Box sx={{ display:'flex', alignItems:'center', gap:0.5 }}><DoiIcon sx={{ fontSize:11, color:'#1ca7a1' }} /><Typography sx={{ fontSize:10, color:'#1ca7a1', fontFamily:'monospace' }}>{p.doi.slice(0,20)}…</Typography></Box>
                    : <Button size="small" sx={{ color:'#8b5cf6', textTransform:'none', fontSize:10, fontWeight:600, p:0, minWidth:0 }}>Add DOI</Button>}
                  </TableCell>
                  <TableCell sx={{ fontSize:13, fontWeight:600, color:'text.primary', borderBottom:`1px solid ${theme.palette.divider}` }}>{p.citations}</TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Chip label={p.oa?'Open':'Closed'} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor: p.oa?'rgba(16,185,129,0.1)':'rgba(100,116,139,0.1)', color: p.oa?'#10b981':'#64748b' }} />
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Chip label={p.status} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor: statusColor(p.status)+'22', color: statusColor(p.status) }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}
