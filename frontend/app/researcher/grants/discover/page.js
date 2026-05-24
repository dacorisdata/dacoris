'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, CircularProgress, useTheme, TextField, MenuItem, Select, FormControl, InputLabel, Chip, Button, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Tooltip } from '@mui/material';
import { Search as SearchIcon, Bookmark as SaveIcon, Send as ApplyIcon, ArrowUpward as SortAscIcon, ArrowDownward as SortDescIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../lib/api';

const ACCENT = '#16a699';
const categoryColor = c => ({ Health:'#10b981', Environment:'#0ea5e9', Technology:ACCENT, Agriculture:'#f59e0b', 'Multi-disciplinary':'#f97316', STEM:ACCENT }[c] || '#64748b');

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
  const [sortBy, setSortBy] = useState('status');
  const [sortOrder, setSortOrder] = useState('asc');
  const [myApplications, setMyApplications] = useState({});

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    await loadOpportunities(u.id);
    setLoading(false);
  };

  const loadOpportunities = async (userId) => {
    try {
      const [oppRes, propRes] = await Promise.all([
        api.get('/grants/opportunities'),
        api.get('/grants/proposals'),
      ]);
      const allOpps = oppRes.data || [];
      setOpportunities(allOpps);

      const appMap = {};
      (propRes.data || []).forEach(p => {
        if (p.lead_pi_id === userId && p.opportunity_id) {
          const existing = appMap[p.opportunity_id];
          if (!existing || new Date(p.created_at) > new Date(existing.created_at)) {
            appMap[p.opportunity_id] = {
              id: p.id,
              status: (p.status || '').toLowerCase(),
              title: p.title,
            };
          }
        }
      });
      setMyApplications(appMap);
    } catch (e) {
      setError('Failed to load opportunities from database');
      console.error('Error loading opportunities:', e);
    }
  };

  const getApplicationDisplay = (oppId) => {
    const app = myApplications[oppId];
    if (!app) return null;
    if (app.status === 'draft' || app.status === 'returned') {
      return { label: app.status === 'returned' ? 'Returned — Complete Draft' : 'Draft — Complete Draft', color: '#f59e0b', proposalId: app.id, canApply: false, isDraft: true };
    }
    return { label: 'Applied', color: '#6366f1', proposalId: app.id, canApply: false, isDraft: false };
  };

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  let filtered = opportunities.filter(o =>
    (catFilter === 'all' || o.category === catFilter) &&
    (!search || o.title?.toLowerCase().includes(search.toLowerCase()) || o.sponsor?.toLowerCase().includes(search.toLowerCase()))
  );

  // Apply sorting
  const statusOrder = { 'open': 1, 'upcoming': 2, 'archived': 3, 'closed': 4 };
  
  filtered = [...filtered].sort((a, b) => {
    let aVal, bVal;
    if (sortBy === 'deadline') {
      aVal = a.deadline ? new Date(a.deadline).getTime() : 0;
      bVal = b.deadline ? new Date(b.deadline).getTime() : 0;
    } else if (sortBy === 'title') {
      aVal = a.title?.toLowerCase() || '';
      bVal = b.title?.toLowerCase() || '';
    } else if (sortBy === 'sponsor') {
      aVal = a.sponsor?.toLowerCase() || '';
      bVal = b.sponsor?.toLowerCase() || '';
    } else if (sortBy === 'status') {
      // Use custom status order: Open, Upcoming, Archived, Closed
      aVal = statusOrder[a.status?.toLowerCase()] || 999;
      bVal = statusOrder[b.status?.toLowerCase()] || 999;
    }
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  const fmtMoney = (o) => {
    if (!o.amount_min && !o.amount_max) return '—';
    const fmt = (n) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}K` : n;
    if (o.amount_min && o.amount_max) return `${o.currency} ${fmt(o.amount_min)} – ${fmt(o.amount_max)}`;
    return `${o.currency} ${fmt(o.amount_min || o.amount_max)}`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'text.primary' }}>Discover Opportunities</Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.3 }}>Funding opportunities matched to your research profile and expertise</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      {/* Summary Stats */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Chip label={`${opportunities.length} Total Opportunities`} sx={{ bgcolor: `${ACCENT}18`, color: ACCENT, fontWeight: 600 }} />
        <Chip label={`${opportunities.filter(o => o.is_curated).length} Published`} sx={{ bgcolor: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 600 }} />
        <Chip label={`${opportunities.filter(o => o.status === 'open').length} Open`} sx={{ bgcolor: 'rgba(59,130,246,0.15)', color: '#3b82f6', fontWeight: 600 }} />
      </Box>

      {/* Filters */}
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

      {/* Interactive Table */}
      <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderBottom: `1px solid ${theme.palette.divider}` } }}>
              <TableCell onClick={() => handleSort('title')} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Title
                  {sortBy === 'title' && (sortOrder === 'asc' ? <SortAscIcon sx={{ fontSize: 14 }} /> : <SortDescIcon sx={{ fontSize: 14 }} />)}
                </Box>
              </TableCell>
              <TableCell onClick={() => handleSort('sponsor')} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Sponsor
                  {sortBy === 'sponsor' && (sortOrder === 'asc' ? <SortAscIcon sx={{ fontSize: 14 }} /> : <SortDescIcon sx={{ fontSize: 14 }} />)}
                </Box>
              </TableCell>
              <TableCell>Funding Range</TableCell>
              <TableCell>Category</TableCell>
              <TableCell onClick={() => handleSort('deadline')} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Deadline
                  {sortBy === 'deadline' && (sortOrder === 'asc' ? <SortAscIcon sx={{ fontSize: 14 }} /> : <SortDescIcon sx={{ fontSize: 14 }} />)}
                </Box>
              </TableCell>
              <TableCell onClick={() => handleSort('status')} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Status
                  {sortBy === 'status' && (sortOrder === 'asc' ? <SortAscIcon sx={{ fontSize: 14 }} /> : <SortDescIcon sx={{ fontSize: 14 }} />)}
                </Box>
              </TableCell>
              <TableCell align="center">Published</TableCell>
              <TableCell>Your Application</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((opp) => (
              <TableRow key={opp.id} hover sx={{ '&:hover': { bgcolor: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' } }}>
                <TableCell sx={{ fontWeight: 600, fontSize: 13, maxWidth: 300 }}>
                  <Tooltip title={opp.description || 'No description'} arrow>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {opp.title}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontSize: 12, color: ACCENT, fontWeight: 600 }}>{opp.sponsor || '—'}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{fmtMoney(opp)}</TableCell>
                <TableCell>
                  {opp.category ? (
                    <Chip label={opp.category} size="small" sx={{ fontSize: 10, fontWeight: 600, bgcolor: categoryColor(opp.category)+'22', color: categoryColor(opp.category) }} />
                  ) : '—'}
                </TableCell>
                <TableCell sx={{ fontSize: 12, color: opp.deadline && new Date(opp.deadline) < new Date(Date.now() + 30*24*60*60*1000) ? '#ef4444' : 'text.secondary' }}>
                  {fmtDate(opp.deadline)}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={opp.status || 'N/A'} 
                    size="small" 
                    sx={{ 
                      fontSize: 10, 
                      fontWeight: 600, 
                      bgcolor: opp.status === 'open' ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.1)', 
                      color: opp.status === 'open' ? '#10b981' : '#64748b' 
                    }} 
                  />
                </TableCell>
                <TableCell align="center">
                  {opp.is_curated ? (
                    <Chip label="✓" size="small" sx={{ fontSize: 10, fontWeight: 700, bgcolor: `${ACCENT}22`, color: ACCENT, minWidth: 28 }} />
                  ) : (
                    <Chip label="—" size="small" sx={{ fontSize: 10, bgcolor: 'rgba(100,116,139,0.1)', color: '#64748b', minWidth: 28 }} />
                  )}
                </TableCell>
                <TableCell>
                  {(() => {
                    const app = getApplicationDisplay(opp.id);
                    if (!app) return <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>—</Typography>;
                    return (
                      <Chip
                        label={app.label}
                        size="small"
                        sx={{ fontSize: 10, fontWeight: 600, bgcolor: `${app.color}22`, color: app.color, maxWidth: 180 }}
                      />
                    );
                  })()}
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                    <Tooltip title={saved.includes(opp.id) ? 'Saved' : 'Save for later'}>
                      <IconButton 
                        size="small" 
                        onClick={() => setSaved(s => s.includes(opp.id) ? s.filter(x => x !== opp.id) : [...s, opp.id])}
                        sx={{ color: saved.includes(opp.id) ? ACCENT : 'text.secondary' }}
                      >
                        <SaveIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    {(() => {
                      const app = getApplicationDisplay(opp.id);
                      if (app?.isDraft) {
                        return (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => router.push(`/researcher/grants/proposals/${app.proposalId}`)}
                            sx={{
                              textTransform: 'none', fontSize: 11, fontWeight: 600, px: 1.5, py: 0.5,
                              bgcolor: '#f59e0b', '&:hover': { bgcolor: '#d97706' },
                            }}
                          >
                            Complete Draft
                          </Button>
                        );
                      }
                      if (app && !app.isDraft) {
                        return (
                          <Button
                            size="small"
                            variant="outlined"
                            disabled
                            sx={{ textTransform: 'none', fontSize: 11, fontWeight: 600, px: 1.5, py: 0.5 }}
                          >
                            Applied
                          </Button>
                        );
                      }
                      return (
                        <Tooltip title={opp.status?.toLowerCase() !== 'open' ? `Applications only available for Open opportunities (Status: ${opp.status})` : 'Start your application'}>
                          <span>
                            <Button 
                              size="small" 
                              variant="contained" 
                              endIcon={<ApplyIcon sx={{ fontSize: 14 }} />}
                              onClick={() => {
                                const oppData = encodeURIComponent(JSON.stringify({
                                  id: opp.id,
                                  title: opp.title,
                                  sponsor: opp.sponsor,
                                  deadline: opp.deadline
                                }));
                                router.push(`/researcher/grants/proposals?new=true&opp=${oppData}`);
                              }}
                              disabled={opp.status?.toLowerCase() !== 'open'}
                              sx={{ 
                                textTransform: 'none', 
                                fontSize: 11, 
                                fontWeight: 600, 
                                px: 1.5, 
                                py: 0.5, 
                                bgcolor: ACCENT, 
                                '&:hover': { bgcolor: '#14958a' },
                                '&.Mui-disabled': { bgcolor: 'rgba(100,116,139,0.12)', color: 'rgba(100,116,139,0.5)' }
                              }}
                            >
                              Apply
                            </Button>
                          </span>
                        </Tooltip>
                      );
                    })()}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {filtered.length === 0 && (
        <Box sx={{ p: 6, textAlign: 'center' }}>
          <Typography sx={{ color: 'text.secondary', mb: 1 }}>No opportunities found matching your filters.</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>Try adjusting your search criteria or contact admin staff to publish opportunities.</Typography>
        </Box>
      )}
    </Box>
  );
}
