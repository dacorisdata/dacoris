'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme, TextField,
  Avatar, Card, CardContent, Tooltip, Alert,
} from '@mui/material';
import { Search as SearchIcon, OpenInNew as OrcidIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const statusColor = s => ({ active:'#10b981', pending:'#f59e0b', suspended:'#ef4444', inactive:'#64748b' }[s?.toLowerCase()] || '#64748b');
const DEPT_COLORS = ['#8b5cf6','#0ea5e9','#10b981','#f59e0b','#ef4444','#f97316','#1ca7a1','#6366f1'];

export default function ResearcherDirectoryPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [researchers, setResearchers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUser().then(u => { 
      if (!u) router.push('/login'); 
      else loadResearchers(); 
    });
  }, []);

  const loadResearchers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/research/directory`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Transform data to match expected format
      const transformedData = (res.data || []).map(r => ({
        id: r.id,
        name: r.name || r.email,
        title: r.job_title || 'Researcher',
        dept: r.department || 'Not specified',
        expertise: r.expertise_keywords ? JSON.parse(r.expertise_keywords) : [],
        orcid: r.orcid_id,
        projects: r.projects_count || 0,
        publications: r.publications_count || 0,
        status: r.status || 'active',
        email: r.email,
      }));
      
      setResearchers(transformedData);
    } catch (e) {
      console.error('Failed to load researchers:', e);
      if (e.response?.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
      } else {
        setError('Failed to load researchers: ' + (e.response?.data?.detail || e.message));
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  const filtered = researchers.filter(r =>
    !search ||
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.dept?.toLowerCase().includes(search.toLowerCase()) ||
    r.email?.toLowerCase().includes(search.toLowerCase()) ||
    (r.expertise && Array.isArray(r.expertise) && r.expertise.some(e => e.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'text.primary' }}>Researcher Directory</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.3 }}>
            {researchers.length} researchers · {researchers.filter(r => r.orcid).length} with ORCID iDs
          </Typography>
        </Box>
        <Button 
          size="small" 
          variant="outlined" 
          startIcon={<RefreshIcon />}
          onClick={loadResearchers}
          sx={{ textTransform: 'none', borderRadius: 2 }}
        >
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ display:'flex', gap: 2, mb: 3, flexWrap:'wrap' }}>
        {['active','pending','suspended'].map(s => {
          const c = researchers.filter(r => r.status?.toLowerCase() === s).length;
          return <Box key={s} sx={{ flex:'1 1 120px', bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2, p:1.5, textAlign:'center' }}>
            <Typography sx={{ fontSize:20, fontWeight:700, color: statusColor(s) }}>{c}</Typography>
            <Typography sx={{ fontSize:11, color:'text.secondary', fontWeight:600, textTransform: 'capitalize' }}>{s}</Typography>
          </Box>;
        })}
        <Box sx={{ flex:'1 1 120px', bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2, p:1.5, textAlign:'center' }}>
          <Typography sx={{ fontSize:20, fontWeight:700, color:'#8b5cf6' }}>{researchers.reduce((a,r) => a+r.publications, 0)}</Typography>
          <Typography sx={{ fontSize:11, color:'text.secondary', fontWeight:600 }}>Total Publications</Typography>
        </Box>
      </Box>

      <TextField placeholder="Search by name, department, or expertise…" value={search} onChange={e => setSearch(e.target.value)} size="small"
        InputProps={{ startAdornment: <SearchIcon sx={{ fontSize:18, color:'text.disabled', mr:1 }} /> }}
        sx={{ mb: 3, width: 400, '& .MuiOutlinedInput-root':{ borderRadius:2 } }} />

      {filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'text.secondary', mb: 1 }}>
            {researchers.length === 0 ? 'No researchers found' : 'No results found'}
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>
            {researchers.length === 0 
              ? 'Researchers from your institution will appear here.' 
              : 'Try a different search term.'}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
          {filtered.map((r, i) => (
            <Card key={r.id} elevation={0} sx={{ border:`1px solid ${theme.palette.divider}`, borderRadius:2.5, '&:hover':{ boxShadow: theme.palette.mode==='dark'?'none':'0 4px 16px rgba(0,0,0,0.1)', transform:'translateY(-2px)', transition:'all 0.2s' }, cursor:'pointer', transition:'all 0.2s' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display:'flex', alignItems:'flex-start', gap: 1.5, mb: 2 }}>
                  <Avatar sx={{ width:44, height:44, bgcolor: DEPT_COLORS[i % DEPT_COLORS.length], fontSize:15, fontWeight:700, flexShrink:0 }}>
                    {r.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || 'R'}
                  </Avatar>
                  <Box sx={{ minWidth:0 }}>
                    <Typography sx={{ fontSize:13, fontWeight:700, color:'text.primary', lineHeight:1.3 }}>{r.name || 'Unknown'}</Typography>
                    <Typography sx={{ fontSize:11, color:'text.secondary', mt:0.2 }}>{r.title || 'Researcher'}</Typography>
                    <Typography sx={{ fontSize:10, color:'text.disabled', mt:0.1 }}>{r.dept || 'Not specified'}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display:'flex', gap:1, mb: 2 }}>
                  <Chip label={r.status || 'active'} size="small" sx={{ fontSize:9, fontWeight:700, bgcolor: statusColor(r.status)+'22', color: statusColor(r.status), textTransform: 'capitalize' }} />
                  {r.orcid && <Chip label="ORCID" size="small" sx={{ fontSize:9, fontWeight:700, bgcolor:'rgba(166,206,57,0.15)', color:'#83b818' }} />}
                </Box>

                {r.expertise && r.expertise.length > 0 && (
                  <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.5, mb: 2 }}>
                    {r.expertise.slice(0, 5).map((e, idx) => (
                      <Chip key={idx} label={e} size="small" sx={{ fontSize:9, bgcolor: DEPT_COLORS[i % DEPT_COLORS.length]+'18', color: DEPT_COLORS[i % DEPT_COLORS.length], fontWeight:600 }} />
                    ))}
                    {r.expertise.length > 5 && (
                      <Chip label={`+${r.expertise.length - 5}`} size="small" sx={{ fontSize:9, bgcolor: 'rgba(0,0,0,0.05)', color: 'text.disabled', fontWeight:600 }} />
                    )}
                  </Box>
                )}

                <Box sx={{ display:'flex', gap:3 }}>
                  <Box sx={{ textAlign:'center' }}>
                    <Typography sx={{ fontSize:16, fontWeight:700, color:'text.primary' }}>{r.projects || 0}</Typography>
                    <Typography sx={{ fontSize:10, color:'text.disabled' }}>Projects</Typography>
                  </Box>
                  <Box sx={{ textAlign:'center' }}>
                    <Typography sx={{ fontSize:16, fontWeight:700, color:'text.primary' }}>{r.publications || 0}</Typography>
                    <Typography sx={{ fontSize:10, color:'text.disabled' }}>Publications</Typography>
                  </Box>
                  {r.orcid && (
                    <Tooltip title={`ORCID: ${r.orcid}`}>
                      <Box sx={{ display:'flex', alignItems:'center', gap:0.5, ml:'auto', cursor:'pointer' }}
                        onClick={(e) => { e.stopPropagation(); window.open(`https://orcid.org/${r.orcid}`, '_blank'); }}>
                        <OrcidIcon sx={{ fontSize:14, color:'#83b818' }} />
                        <Typography sx={{ fontSize:9, color:'#83b818', fontFamily:'monospace' }}>{r.orcid.slice(-9)}</Typography>
                      </Box>
                    </Tooltip>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}
