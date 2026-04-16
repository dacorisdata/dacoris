'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, CircularProgress, useTheme, TextField, MenuItem, Select, FormControl, InputLabel, Chip, Button, Alert, Card, CardContent, CardActions } from '@mui/material';
import { Search as SearchIcon, Bookmark as SaveIcon, Send as ApplyIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../lib/api';

const categoryColor = c => ({ Health:'#10b981', Environment:'#0ea5e9', Technology:'#8b5cf6', Agriculture:'#f59e0b', 'Multi-disciplinary':'#f97316', STEM:'#8b5cf6' }[c] || '#64748b');

export default function DiscoverOpportunitiesPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [saved, setSaved] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    await loadOpportunities();
    setLoading(false);
  };

  const loadOpportunities = async () => {
    try {
      const res = await api.get('/grants/opportunities');
      setOpportunities(res.data || []);
    } catch (e) {
      setError('Failed to load opportunities');
    }
  };

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  const filtered = opportunities.filter(o =>
    (catFilter === 'all' || o.category === catFilter) &&
    (!search || o.title?.toLowerCase().includes(search.toLowerCase()) || o.sponsor?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'text.primary' }}>Discover Opportunities</Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.3 }}>Funding opportunities matched to your research profile and expertise</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      <Box sx={{ display:'flex', gap:2, mb:3, flexWrap:'wrap' }}>
        <TextField placeholder="Search by title, sponsor, or keyword…" value={search} onChange={e => setSearch(e.target.value)} size="small"
          InputProps={{ startAdornment: <SearchIcon sx={{ fontSize:18, color:'text.disabled', mr:1 }} /> }}
          sx={{ flex:'1 1 300px', '& .MuiOutlinedInput-root':{ borderRadius:2 } }} />
        <FormControl size="small" sx={{ minWidth:160 }}>
          <InputLabel>Category</InputLabel>
          <Select value={catFilter} onChange={e => setCatFilter(e.target.value)} label="Category" sx={{ borderRadius:2 }}>
            <MenuItem value="all">All Categories</MenuItem>
            {[...new Set(opportunities.map(o => o.category).filter(Boolean))].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))', gap:2 }}>
        {filtered.map(opp => {
          const fmtMoney = () => {
            if (!opp.amount_min && !opp.amount_max) return null;
            const fmt = (n) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}K` : n.toLocaleString();
            if (opp.amount_min && opp.amount_max) return `${opp.currency} ${fmt(opp.amount_min)} – ${fmt(opp.amount_max)}`;
            return `${opp.currency} ${fmt(opp.amount_min || opp.amount_max)}`;
          };
          const isClosingSoon = opp.deadline && new Date(opp.deadline) < new Date(Date.now() + 30*24*60*60*1000);
          return (
            <Card key={opp.id} elevation={0} sx={{ border:`1px solid ${theme.palette.divider}`, borderRadius:2.5, display:'flex', flexDirection:'column', '&:hover':{ boxShadow: dark?'none':'0 4px 16px rgba(0,0,0,0.1)', transform:'translateY(-2px)', transition:'all 0.2s' }, transition:'all 0.2s' }}>
              <CardContent sx={{ p:2.5, flex:1 }}>
                <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:1.5 }}>
                  {opp.category && <Chip label={opp.category} size="small" sx={{ fontSize:10, fontWeight:700, bgcolor: categoryColor(opp.category)+'22', color: categoryColor(opp.category) }} />}
                  {opp.status && <Chip label={opp.status} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor: opp.status==='open'?'rgba(16,185,129,0.1)':'rgba(100,116,139,0.1)', color: opp.status==='open'?'#10b981':'#64748b' }} />}
                </Box>
                <Typography sx={{ fontSize:14, fontWeight:700, color:'text.primary', lineHeight:1.4, mb:0.5 }}>{opp.title}</Typography>
                {opp.sponsor && <Typography sx={{ fontSize:12, color:'#1ca7a1', fontWeight:600, mb:1 }}>{opp.sponsor}</Typography>}
                {opp.description && <Typography sx={{ fontSize:12, color:'text.secondary', lineHeight:1.5, mb:2, display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{opp.description}</Typography>}
                <Box sx={{ display:'flex', gap:1, flexWrap:'wrap', mb:1.5 }}>
                  {fmtMoney() && <Chip label={fmtMoney()} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor:'rgba(16,185,129,0.1)', color:'#10b981' }} />}
                  {opp.funding_type && <Chip label={opp.funding_type} size="small" sx={{ fontSize:10, fontWeight:600, bgcolor:'rgba(139,92,246,0.1)', color:'#8b5cf6' }} />}
                </Box>
                {opp.deadline && (
                  <Typography sx={{ fontSize:11, color: isClosingSoon ? '#ef4444' : 'text.disabled', fontWeight: isClosingSoon ? 700 : 400 }}>
                    Deadline: {new Date(opp.deadline).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}
                  </Typography>
                )}
              </CardContent>
              <CardActions sx={{ px:2.5, pb:2, pt:0, gap:1 }}>
                <Button size="small" variant="outlined" startIcon={<SaveIcon />}
                  onClick={() => setSaved(s => s.includes(opp.id) ? s.filter(x => x !== opp.id) : [...s, opp.id])}
                  sx={{ textTransform:'none', fontSize:12, fontWeight:600, borderRadius:2, flex:1, borderColor: saved.includes(opp.id)?'#1ca7a1':'divider', color: saved.includes(opp.id)?'#1ca7a1':'text.secondary' }}>
                  {saved.includes(opp.id) ? 'Saved' : 'Save'}
                </Button>
                <Button size="small" variant="contained" endIcon={<ApplyIcon />}
                  onClick={() => { setSuccess('Application started! This will redirect to proposal builder.'); setTimeout(() => router.push('/researcher/grants/proposals'), 2000); }}
                  sx={{ textTransform:'none', fontSize:12, fontWeight:600, borderRadius:2, flex:2, bgcolor:'#1ca7a1', '&:hover':{ bgcolor:'#0e7490' } }}>
                  Start Application
                </Button>
              </CardActions>
            </Card>
          );
        })}
      </Box>
      {filtered.length === 0 && <Box sx={{ p:6, textAlign:'center' }}><Typography sx={{ color:'text.secondary' }}>No opportunities found. Admin staff can add opportunities via the Grants Management module.</Typography></Box>}
    </Box>
  );
}
