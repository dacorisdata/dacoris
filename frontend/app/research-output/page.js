'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip, Paper, Grid, Card, CardContent,
  TextField, InputAdornment, Tab, Tabs, Divider, useTheme, TablePagination, IconButton, Tooltip,
  Link as MuiLink,
} from '@mui/material';
import {
  Search as SearchIcon, TrendingUp as TrendingIcon, Business as BusinessIcon,
  AccountBalance as FundingIcon, Science as ScienceIcon, LibraryBooks as PublicationIcon,
  People as PeopleIcon, Public as PublicIcon, FilterList as FilterIcon, Info as InfoIcon,
  OpenInNew as OpenIcon, CalendarToday as CalendarIcon, AttachMoney as MoneyIcon,
  School as SchoolIcon, LockOpen as OpenAccessIcon, FormatQuote as CitationIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const ACCENT = '#8b5cf6';

export default function ResearchOutputPage() {
  const router = useRouter();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [oaFilter, setOaFilter] = useState('');
  
  // Data states
  const [stats, setStats] = useState(null);
  const [works, setWorks] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [funders, setFunders] = useState([]);
  const [topics, setTopics] = useState([]);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(9);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load stats
      const statsRes = await axios.get(`${API_URL}/api/public/works/stats`);
      setStats(statsRes.data);
      
      // Load works
      const worksRes = await axios.get(`${API_URL}/api/public/works?limit=100`);
      setWorks(worksRes.data);
      
      // Load authors
      const authorsRes = await axios.get(`${API_URL}/api/public/works/authors/list?limit=50`);
      setAuthors(authorsRes.data);
      
      // Load institutions
      const instsRes = await axios.get(`${API_URL}/api/public/works/institutions/list?limit=50`);
      setInstitutions(instsRes.data);
      
      // Load funders
      const fundersRes = await axios.get(`${API_URL}/api/public/works/funders/list?limit=50`);
      setFunders(fundersRes.data);
      
      // Load topics
      const topicsRes = await axios.get(`${API_URL}/api/public/works/topics/list`);
      setTopics(topicsRes.data.topics || []);
      
    } catch (e) {
      setError('Failed to load research data. Please seed the database first.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/api/public/works/seed-mock-data`);
      setError('');
      await loadData();
    } catch (e) {
      setError('Failed to seed data');
    }
  };

  const filteredWorks = works.filter(work => {
    const matchesSearch = !search || 
      work.title?.toLowerCase().includes(search.toLowerCase()) ||
      work.abstract?.toLowerCase().includes(search.toLowerCase()) ||
      work.keywords?.toLowerCase().includes(search.toLowerCase());
    const matchesTopic = !topicFilter || work.primary_topic === topicFilter;
    const matchesYear = !yearFilter || work.publication_year === parseInt(yearFilter);
    const matchesOA = !oaFilter || (oaFilter === 'true' ? work.is_open_access : !work.is_open_access);
    return matchesSearch && matchesTopic && matchesYear && matchesOA;
  });

  const paginatedWorks = filteredWorks.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const StatCard = ({ icon: Icon, label, value, color, bgColor, subtitle }) => (
    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon sx={{ color, fontSize: 24 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {label}
            </Typography>
            <Typography sx={{ color: 'text.primary', fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography sx={{ color: 'text.disabled', fontSize: 11, mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const WorkCard = ({ work }) => {
    const authors = work.authors?.slice(0, 3) || [];
    const moreAuthors = (work.authors?.length || 0) - 3;
    
    return (
      <Card elevation={0} sx={{ 
        border: `1px solid ${theme.palette.divider}`, 
        borderRadius: 3, 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s',
        '&:hover': { borderColor: ACCENT, boxShadow: `0 4px 12px ${ACCENT}20` }
      }}>
        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
              {work.is_open_access && (
                <Chip icon={<OpenAccessIcon />} label="Open Access" size="small" sx={{ fontSize: 10, height: 20, bgcolor: 'rgba(16,185,129,0.1)', color: '#10b981' }} />
              )}
              {work.primary_topic && (
                <Chip label={work.primary_topic} size="small" sx={{ fontSize: 10, height: 20, bgcolor: `${ACCENT}15`, color: ACCENT }} />
              )}
            </Box>
            
            <Typography 
              sx={{ fontSize: 15, fontWeight: 700, mb: 1, color: 'text.primary', cursor: 'pointer', '&:hover': { color: ACCENT } }}
              onClick={() => router.push(`/research-output/work/${work.id}`)}
            >
              {work.title}
            </Typography>
            
            {/* Authors */}
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>
              {authors.map((a, i) => (
                <span key={i}>
                  {a.author_name}
                  {i < authors.length - 1 && ', '}
                </span>
              ))}
              {moreAuthors > 0 && ` +${moreAuthors} more`}
            </Typography>
            
            {/* Venue */}
            {work.venue_name && (
              <Typography sx={{ fontSize: 11, color: 'text.disabled', fontStyle: 'italic' }}>
                {work.venue_name} ({work.publication_year})
              </Typography>
            )}
          </Box>

          {/* Abstract */}
          {work.abstract && (
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
              {work.abstract}
            </Typography>
          )}

          <Divider sx={{ my: 1.5 }} />

          {/* Metadata */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CitationIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                Cited by {work.cited_by_count}
              </Typography>
            </Box>
            
            {work.institutions?.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BusinessIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                  {work.institutions[0].institution_name}
                  {work.institutions.length > 1 && ` +${work.institutions.length - 1}`}
                </Typography>
              </Box>
            )}
            
            {work.funders?.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FundingIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                  {work.funders[0].funder_name}
                  {work.funders.length > 1 && ` +${work.funders.length - 1}`}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              fullWidth
              variant="outlined"
              size="small"
              endIcon={<OpenIcon />}
              onClick={() => router.push(`/research-output/work/${work.id}`)}
              sx={{ 
                textTransform: 'none', 
                borderColor: ACCENT, 
                color: ACCENT,
                fontSize: 11,
                '&:hover': { borderColor: '#7c3aed', bgcolor: `${ACCENT}08` }
              }}
            >
              View Details
            </Button>
            {work.doi && (
              <IconButton 
                size="small" 
                onClick={() => window.open(`https://doi.org/${work.doi}`, '_blank')}
                sx={{ borderRadius: 1, border: `1px solid ${theme.palette.divider}` }}
              >
                <Tooltip title="View DOI">
                  <OpenIcon sx={{ fontSize: 16 }} />
                </Tooltip>
              </IconButton>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Hero Section */}
      <Box sx={{ 
        bgcolor: dark ? 'rgba(139,92,246,0.05)' : 'rgba(139,92,246,0.03)', 
        borderBottom: `1px solid ${theme.palette.divider}`,
        py: 6
      }}>
        <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, md: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <PublicIcon sx={{ fontSize: 40, color: ACCENT }} />
            <Box>
              <Typography sx={{ fontSize: 32, fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                Scholarly Works Portal
              </Typography>
              <Typography sx={{ fontSize: 16, color: 'text.secondary' }}>
                Open access to research publications, linking authors, institutions, and funders—following FAIR principles
              </Typography>
            </Box>
          </Box>

          {/* FAIR Principles Badge */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 3 }}>
            <Chip icon={<InfoIcon />} label="Findable" size="small" sx={{ bgcolor: 'rgba(16,185,129,0.1)', color: '#10b981' }} />
            <Chip icon={<InfoIcon />} label="Accessible" size="small" sx={{ bgcolor: 'rgba(59,130,246,0.1)', color: '#3b82f6' }} />
            <Chip icon={<InfoIcon />} label="Interoperable" size="small" sx={{ bgcolor: 'rgba(245,158,11,0.1)', color: '#f59e0b' }} />
            <Chip icon={<InfoIcon />} label="Reusable" size="small" sx={{ bgcolor: 'rgba(139,92,246,0.1)', color: ACCENT }} />
            
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
        {error && (
          <Alert severity="warning" sx={{ mb: 3 }} action={
            <Button color="inherit" size="small" onClick={handleSeedData}>
              Seed Mock Data
            </Button>
          }>
            {error}
          </Alert>
        )}

        {/* Statistics */}
        {stats && (
          <Box sx={{ mb: 4 }}>
            <Typography sx={{ fontSize: 20, fontWeight: 700, mb: 2, color: 'text.primary' }}>
              Research Ecosystem Overview
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <StatCard 
                  icon={PublicationIcon} 
                  label="Scholarly Works" 
                  value={stats.total_works} 
                  color={ACCENT} 
                  bgColor={`${ACCENT}15`}
                  subtitle={`${stats.open_access_percentage}% Open Access`}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <StatCard 
                  icon={PeopleIcon} 
                  label="Authors" 
                  value={stats.total_authors} 
                  color="#06b6d4" 
                  bgColor="rgba(6,182,212,0.1)" 
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <StatCard 
                  icon={CitationIcon} 
                  label="Total Citations" 
                  value={stats.total_citations.toLocaleString()} 
                  color="#f59e0b" 
                  bgColor="rgba(245,158,11,0.1)" 
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <StatCard 
                  icon={BusinessIcon} 
                  label="Institutions" 
                  value={stats.total_institutions} 
                  color="#0ea5e9" 
                  bgColor="rgba(14,165,233,0.1)" 
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <StatCard 
                  icon={FundingIcon} 
                  label="Funders" 
                  value={stats.total_funders} 
                  color="#10b981" 
                  bgColor="rgba(16,185,129,0.1)" 
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <StatCard 
                  icon={OpenAccessIcon} 
                  label="Open Access" 
                  value={`${stats.open_access_percentage}%`} 
                  color="#10b981" 
                  bgColor="rgba(16,185,129,0.1)" 
                />
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Tabs */}
        <Paper elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, mb: 3 }}>
          <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Tab label={`Works (${works.length})`} />
            <Tab label={`Authors (${authors.length})`} />
            <Tab label={`Institutions (${institutions.length})`} />
            <Tab label={`Funders (${funders.length})`} />
          </Tabs>

          {/* Tab Content */}
          <Box sx={{ p: 3 }}>
            {/* Works Tab */}
            {tab === 0 && (
              <>
                {/* Search and Filters */}
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                  <TextField
                    placeholder="Search works..."
                    size="small"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: 'text.disabled' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ flex: 1, minWidth: 250 }}
                  />
                  <TextField
                    select
                    size="small"
                    value={topicFilter}
                    onChange={(e) => setTopicFilter(e.target.value)}
                    SelectProps={{ native: true }}
                    sx={{ minWidth: 180 }}
                  >
                    <option value="">All Topics</option>
                    {topics.map(topic => (
                      <option key={topic} value={topic}>{topic}</option>
                    ))}
                  </TextField>
                  <TextField
                    select
                    size="small"
                    value={oaFilter}
                    onChange={(e) => setOaFilter(e.target.value)}
                    SelectProps={{ native: true }}
                    sx={{ minWidth: 150 }}
                  >
                    <option value="">All Access</option>
                    <option value="true">Open Access</option>
                    <option value="false">Closed Access</option>
                  </TextField>
                </Box>

                {filteredWorks.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <SearchIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                    <Typography sx={{ color: 'text.secondary' }}>No works found</Typography>
                  </Box>
                ) : (
                  <>
                    <Grid container spacing={2.5}>
                      {paginatedWorks.map(work => (
                        <Grid item xs={12} sm={6} md={4} key={work.id}>
                          <WorkCard work={work} />
                        </Grid>
                      ))}
                    </Grid>

                    <TablePagination
                      component="div"
                      count={filteredWorks.length}
                      page={page}
                      onPageChange={(e, newPage) => setPage(newPage)}
                      rowsPerPage={rowsPerPage}
                      onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                      rowsPerPageOptions={[6, 9, 12, 24]}
                      sx={{ mt: 3 }}
                    />
                  </>
                )}
              </>
            )}

            {/* Authors Tab */}
            {tab === 1 && (
              <Grid container spacing={2}>
                {authors.map((author, idx) => (
                  <Grid item xs={12} sm={6} md={4} key={idx}>
                    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1 }}>
                          <PeopleIcon sx={{ color: '#06b6d4', fontSize: 20, mt: 0.5 }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 0.5 }}>{author.name}</Typography>
                            {author.affiliation && (
                              <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.5 }}>
                                {author.affiliation}
                              </Typography>
                            )}
                            {author.orcid && (
                              <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
                                ORCID: {author.orcid}
                              </Typography>
                            )}
                            <Chip 
                              label={`${author.publication_count} publications`} 
                              size="small" 
                              sx={{ mt: 1, fontSize: 10, height: 20, bgcolor: `${ACCENT}10`, color: ACCENT }} 
                            />
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}

            {/* Institutions Tab */}
            {tab === 2 && (
              <Grid container spacing={2}>
                {institutions.map((inst, idx) => (
                  <Grid item xs={12} sm={6} md={4} key={idx}>
                    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                          <BusinessIcon sx={{ color: '#0ea5e9', fontSize: 20 }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 0.5 }}>{inst.name}</Typography>
                            {inst.country && (
                              <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.5 }}>
                                {inst.country}
                              </Typography>
                            )}
                            <Chip 
                              label={`${inst.publication_count} publications`} 
                              size="small" 
                              sx={{ mt: 0.5, fontSize: 10, height: 20, bgcolor: 'rgba(14,165,233,0.1)', color: '#0ea5e9' }} 
                            />
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}

            {/* Funders Tab */}
            {tab === 3 && (
              <Grid container spacing={2}>
                {funders.map((funder, idx) => (
                  <Grid item xs={12} sm={6} md={4} key={idx}>
                    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                          <FundingIcon sx={{ color: '#10b981', fontSize: 20, mt: 0.5 }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 0.5 }}>{funder.name}</Typography>
                            {funder.country && (
                              <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.5 }}>
                                {funder.country}
                              </Typography>
                            )}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
                              <Chip 
                                label={`${funder.grants_count} grants`} 
                                size="small" 
                                sx={{ fontSize: 10, height: 20, bgcolor: 'rgba(16,185,129,0.1)', color: '#10b981', alignSelf: 'flex-start' }} 
                              />
                              <Typography sx={{ fontSize: 11, color: ACCENT, fontWeight: 600 }}>
                                ${(funder.total_funding / 1000000).toFixed(1)}M total funding
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Paper>

        {/* Footer Info */}
        <Paper elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, p: 3, bgcolor: dark ? 'rgba(139,92,246,0.03)' : 'rgba(139,92,246,0.02)' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1, color: 'text.primary' }}>
            About This Portal
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
            This scholarly works portal provides open access to research publications with comprehensive metadata linking authors, 
            institutions, and funders. It follows FAIR (Findable, Accessible, Interoperable, Reusable) principles 
            to ensure research outputs are discoverable and reusable.
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>
            All data is publicly accessible without login requirements. For questions or data access requests, 
            please contact your institution's research office. Currently showing {works.length} scholarly works with full metadata.
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
