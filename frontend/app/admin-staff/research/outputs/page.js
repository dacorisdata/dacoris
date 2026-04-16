'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme, TextField,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Select, MenuItem, FormControl, InputLabel, Avatar,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, Link as LinkIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';

const MOCK_OUTPUTS = [
  { id:1, type:'Journal Article', title:'Machine Learning for Early Malaria Detection in Sub-Saharan Africa', authors:'Wambua A., Kiprotich D., Hassan F.', journal:'Nature Medicine', year:2024, doi:'10.1038/s41591-024-0001', oa:true, project:'TB-ML-2023', citations:12 },
  { id:2, type:'Conference Paper', title:'Federated Learning Architectures for Health Data Privacy', authors:'Njoroge S., Achieng G.', journal:'NeurIPS 2023', year:2023, doi:'10.5555/3600000.3600001', oa:true, project:'DATA-ENG-2022', citations:8 },
  { id:3, type:'Dataset', title:'Kenyan Household Nutrition Survey 2023 – Longitudinal Cohort', authors:'KEMRI Research Division', journal:'DACORIS Repository', year:2024, doi:'10.5281/zenodo.8001234', oa:false, project:'NUTR-2023', citations:3 },
  { id:4, type:'Report', title:'Progress Report: Community Water Purification Pilot Q1 2024', authors:'WaterAid Kenya', journal:'Internal', year:2024, doi:null, oa:false, project:'WATER-2024', citations:0 },
  { id:5, type:'Thesis', title:'Genomic Epidemiology of Drug-Resistant Tuberculosis in East Africa', authors:'Mwangi L.', journal:'University of Nairobi', year:2023, doi:'10.5281/zenodo.7998765', oa:true, project:'TB-GEN-2022', citations:5 },
  { id:6, type:'Journal Article', title:'Soil Carbon Dynamics Under Climate Change: A Kenya Meta-Analysis', authors:'Kimani P., Otieno R.', journal:'Global Change Biology', year:2024, doi:'10.1111/gcb.17234', oa:false, project:'CLIMATE-2023', citations:2 },
];

const typeColor = t => ({
  'Journal Article':'#0ea5e9','Conference Paper':'#8b5cf6','Dataset':'#10b981',
  'Report':'#f59e0b','Thesis':'#ef4444','Book Chapter':'#f97316','Patent':'#06b6d4',
}[t] || '#64748b');

export default function ResearchOutputsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchUser().then(u => { if (!u) router.push('/login'); else setLoading(false); });
  }, []);

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  const filtered = MOCK_OUTPUTS.filter(o =>
    (typeFilter === 'all' || o.type === typeFilter) &&
    (!search || o.title.toLowerCase().includes(search.toLowerCase()) || o.authors.toLowerCase().includes(search.toLowerCase()))
  );

  const types = [...new Set(MOCK_OUTPUTS.map(o => o.type))];
  const totalCitations = MOCK_OUTPUTS.reduce((a, o) => a + o.citations, 0);
  const oaCount = MOCK_OUTPUTS.filter(o => o.oa).length;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'text.primary' }}>Research Outputs</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.3 }}>Publications, datasets, reports, and all research outputs across the institution</Typography>
        </Box>
        <Button variant="contained" size="small" startIcon={<AddIcon />}
          sx={{ bgcolor:'#1ca7a1', textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
          Register Output
        </Button>
      </Box>

      {/* KPIs */}
      <Box sx={{ display:'flex', gap: 2, mb: 3, flexWrap:'wrap' }}>
        {[{ label:'Total Outputs', value: MOCK_OUTPUTS.length, color:'#1ca7a1' },
          { label:'Open Access', value: oaCount, color:'#10b981' },
          { label:'Total Citations', value: totalCitations, color:'#8b5cf6' },
          { label:'This Year', value: MOCK_OUTPUTS.filter(o => o.year === 2024).length, color:'#0ea5e9' },
        ].map(k => (
          <Box key={k.label} sx={{ flex:'1 1 150px', bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2.5, p: 2 }}>
            <Typography sx={{ fontSize:11, color:'text.secondary', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>{k.label}</Typography>
            <Typography sx={{ fontSize:26, fontWeight:700, color: k.color, mt:0.5 }}>{k.value}</Typography>
          </Box>
        ))}
      </Box>

      {/* Filters */}
      <Box sx={{ display:'flex', gap: 2, mb: 2.5, flexWrap:'wrap' }}>
        <TextField placeholder="Search by title or author…" value={search} onChange={e => setSearch(e.target.value)} size="small"
          InputProps={{ startAdornment: <SearchIcon sx={{ fontSize:18, color:'text.disabled', mr:1 }} /> }}
          sx={{ flex:'1 1 280px', '& .MuiOutlinedInput-root':{ borderRadius:2 } }} />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Output Type</InputLabel>
          <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} label="Output Type" sx={{ borderRadius:2 }}>
            <MenuItem value="all">All Types</MenuItem>
            {types.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:3, overflow:'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th':{ bgcolor: dark?'#0f172a':'background.default', color:'text.secondary', fontSize:11, fontWeight:700, textTransform:'uppercase', borderBottom:`1px solid ${theme.palette.divider}` } }}>
                <TableCell>Output</TableCell><TableCell>Authors</TableCell><TableCell>Type</TableCell>
                <TableCell>Year</TableCell><TableCell>DOI</TableCell><TableCell>Citations</TableCell><TableCell>OA</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(o => (
                <TableRow key={o.id} sx={{ '&:hover':{ bgcolor: dark?'#0f172a':'rgba(0,0,0,0.02)' } }}>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}`, maxWidth:280 }}>
                    <Typography sx={{ fontSize:13, fontWeight:600, color:'text.primary', lineHeight:1.4 }}>{o.title}</Typography>
                    <Typography sx={{ fontSize:11, color:'text.disabled', mt:0.3 }}>{o.journal}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize:12, color:'text.secondary', borderBottom:`1px solid ${theme.palette.divider}`, maxWidth:180 }}>
                    <Typography sx={{ fontSize:11, color:'text.secondary', lineHeight:1.4 }}>{o.authors}</Typography>
                  </TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Chip label={o.type} size="small" sx={{ fontSize:9, fontWeight:700, bgcolor: typeColor(o.type)+'22', color: typeColor(o.type) }} />
                  </TableCell>
                  <TableCell sx={{ fontSize:13, fontWeight:600, color:'text.primary', borderBottom:`1px solid ${theme.palette.divider}` }}>{o.year}</TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    {o.doi ? (
                      <Box sx={{ display:'flex', alignItems:'center', gap:0.5 }}>
                        <LinkIcon sx={{ fontSize:12, color:'#1ca7a1' }} />
                        <Typography sx={{ fontSize:10, color:'#1ca7a1', fontFamily:'monospace' }}>{o.doi.slice(0,18)}…</Typography>
                      </Box>
                    ) : <Typography sx={{ fontSize:11, color:'text.disabled' }}>—</Typography>}
                  </TableCell>
                  <TableCell sx={{ fontSize:13, fontWeight:600, color:'text.primary', borderBottom:`1px solid ${theme.palette.divider}` }}>{o.citations}</TableCell>
                  <TableCell sx={{ borderBottom:`1px solid ${theme.palette.divider}` }}>
                    <Chip label={o.oa ? 'Open' : 'Closed'} size="small"
                      sx={{ fontSize:10, fontWeight:600, bgcolor: o.oa?'rgba(16,185,129,0.1)':'rgba(100,116,139,0.1)', color: o.oa?'#10b981':'#64748b' }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {filtered.length === 0 && <Box sx={{ p:4, textAlign:'center' }}><Typography sx={{ color:'text.secondary', fontSize:14 }}>No outputs found</Typography></Box>}
      </Box>
    </Box>
  );
}
