'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Container, Typography, Button, CircularProgress, Alert, Chip,
  TextField, InputAdornment, Tab, Tabs, Divider, useTheme as useMuiTheme,
  TablePagination, IconButton, Tooltip, Avatar, alpha,
} from '@mui/material';
import {
  Search as SearchIcon, Business as BusinessIcon,
  AccountBalance as FundingIcon, LibraryBooks as PublicationIcon,
  People as PeopleIcon, Public as PublicIcon,
  OpenInNew as OpenIcon, FormatQuote as CitationIcon,
  LockOpen as OpenAccessIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { COLORS } from '@/contexts/ThemeContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const tl = COLORS.teal;
const sl = COLORS.slate;

export default function ResearchOutputPage() {
  const router = useRouter();
  const theme = useMuiTheme();
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
      const statsRes = await axios.get(`${API_URL}/public/works/stats`);
      setStats(statsRes.data);
      
      // Load works
      const worksRes = await axios.get(`${API_URL}/public/works?limit=100`);
      setWorks(worksRes.data);
      
      // Load authors
      const authorsRes = await axios.get(`${API_URL}/public/works/authors/list?limit=50`);
      setAuthors(authorsRes.data);
      
      // Load institutions
      const instsRes = await axios.get(`${API_URL}/public/works/institutions/list?limit=50`);
      setInstitutions(instsRes.data);
      
      // Load funders
      const fundersRes = await axios.get(`${API_URL}/public/works/funders/list?limit=50`);
      setFunders(fundersRes.data);
      
      // Load topics
      const topicsRes = await axios.get(`${API_URL}/public/works/topics/list`);
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
      await axios.post(`${API_URL}/public/works/seed-mock-data`);
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
    <Box sx={{ bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`, borderRadius: 2.5, p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon sx={{ color, fontSize: 22 }} />
      </Box>
      <Box>
        <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.secondary', mb: 0.2 }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1, color: 'text.primary' }}>
          {value}
        </Typography>
        {subtitle && <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.2 }}>{subtitle}</Typography>}
      </Box>
    </Box>
  );

  const WorkCard = ({ work }) => {
    const workAuthors = work.authors?.slice(0, 3) || [];
    const moreAuthors = (work.authors?.length || 0) - 3;
    return (
      <Box sx={{
        bgcolor: 'background.paper',
        border: `1px solid ${theme.palette.divider}`,
        borderLeft: `3px solid ${tl[600]}`,
        borderRadius: 2.5,
        p: 2.5,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.2s, border-color 0.2s, transform 0.2s',
        '&:hover': { boxShadow: `0 6px 20px ${alpha(tl[600], dark ? 0.2 : 0.12)}`, borderColor: alpha(tl[600], 0.5), transform: 'translateY(-1px)' },
      }}>
        <Box sx={{ display: 'flex', gap: 0.75, mb: 1.5, flexWrap: 'wrap' }}>
          {work.is_open_access && (
            <Chip icon={<OpenAccessIcon sx={{ fontSize: '12px !important' }} />} label="Open Access" size="small"
              sx={{ fontSize: 10, height: 20, bgcolor: alpha(COLORS.green[600], 0.1), color: COLORS.green[600], fontWeight: 600 }} />
          )}
          {work.primary_topic && (
            <Chip label={work.primary_topic} size="small"
              sx={{ fontSize: 10, height: 20, bgcolor: alpha(tl[600], 0.1), color: tl[600], fontWeight: 600 }} />
          )}
        </Box>
        <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.75, color: 'text.primary', lineHeight: 1.4, cursor: 'pointer', '&:hover': { color: tl[600] } }}
          onClick={() => router.push(`/research-output/work/${work.id}`)}>
          {work.title}
        </Typography>
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.4 }}>
          {workAuthors.map((a, i) => <span key={i}>{a.author_name}{i < workAuthors.length - 1 && ', '}</span>)}
          {moreAuthors > 0 && <span style={{ color: theme.palette.text.disabled }}> +{moreAuthors} more</span>}
        </Typography>
        {work.venue_name && (
          <Typography sx={{ fontSize: 11, color: 'text.disabled', fontStyle: 'italic', mb: 1.5 }}>
            {work.venue_name} &middot; {work.publication_year}
          </Typography>
        )}
        {work.abstract && (
          <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.6, flex: 1, mb: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
            {work.abstract}
          </Typography>
        )}
        <Divider sx={{ mb: 1.5 }} />
        <Box sx={{ display: 'flex', gap: 2, mb: 1.5, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CitationIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
            <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>{work.cited_by_count} cited</Typography>
          </Box>
          {work.institutions?.[0] && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <BusinessIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{work.institutions[0].institution_name}{work.institutions.length > 1 && ` +${work.institutions.length - 1}`}</Typography>
            </Box>
          )}
          {work.funders?.[0] && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <FundingIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{work.funders[0].funder_name}{work.funders.length > 1 && ` +${work.funders.length - 1}`}</Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button fullWidth variant="outlined" size="small" endIcon={<OpenIcon />}
            onClick={() => router.push(`/research-output/work/${work.id}`)}
            sx={{ textTransform: 'none', borderColor: tl[600], color: tl[600], fontSize: 11, fontWeight: 600, borderRadius: 2, '&:hover': { borderColor: tl[700], bgcolor: alpha(tl[600], 0.1) } }}>
            View Details
          </Button>
          {work.doi && (
            <Tooltip title="View DOI">
              <IconButton size="small" onClick={() => window.open(`https://doi.org/${work.doi}`, '_blank')}
                sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
                <OpenIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress sx={{ color: tl[600] }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>

      {/* ─── Hero Banner ─── */}
      <Box sx={{
        position: 'relative', overflow: 'hidden',
        background: dark
          ? `linear-gradient(160deg, ${sl[900]} 0%, ${sl[800]} 50%, ${tl[900]} 100%)`
          : `linear-gradient(160deg, ${tl[700]} 0%, ${tl[600]} 40%, ${tl[700]} 100%)`,
        py: { xs: 7, md: 10 }, px: 2,
      }}>
        {[{ size: 500, top: -160, right: -100, op: 0.06 }, { size: 300, bottom: -80, left: -60, op: 0.07 }, { size: 160, top: '30%', left: '60%', op: 0.05 }].map((c, i) => (
          <Box key={i} sx={{ position: 'absolute', width: c.size, height: c.size, borderRadius: '50%', border: `2px solid ${alpha('#fff', c.op)}`, top: c.top, right: c.right, bottom: c.bottom, left: c.left, pointerEvents: 'none' }} />
        ))}
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <Typography variant="overline" sx={{ color: alpha('#fff', 0.7), letterSpacing: '0.15em', display: 'block', mb: 1.5 }}>
            Public Research Portal
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 2 }}>
            <PublicIcon sx={{ fontSize: { xs: 36, md: 48 }, color: alpha('#fff', 0.9) }} />
            <Typography sx={{ fontSize: { xs: 32, md: 52 }, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              Scholarly Works
            </Typography>
          </Box>
          <Typography sx={{ fontSize: { xs: 14, md: 17 }, color: alpha('#fff', 0.85), mb: 4, maxWidth: 580, mx: 'auto', lineHeight: 1.7 }}>
            Open access to research publications — linking authors, institutions, and funders following FAIR principles.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            {[{ label: 'Findable', bg: alpha(COLORS.green[600], 0.25) }, { label: 'Accessible', bg: alpha(COLORS.blue[600], 0.25) }, { label: 'Interoperable', bg: alpha(COLORS.amber[600], 0.25) }, { label: 'Reusable', bg: alpha(tl[600], 0.25) }].map(({ label, bg }) => (
              <Chip key={label} label={label} sx={{ bgcolor: bg, color: '#fff', fontWeight: 700, fontSize: 12, border: `1px solid ${alpha('#fff', 0.25)}` }} />
            ))}
          </Box>
        </Container>
      </Box>

      {/* ─── Stats Band ─── */}
      {stats && (
        <Box sx={{ bgcolor: 'background.paper', borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Container maxWidth="lg" sx={{ py: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }, gap: 2 }}>
              <StatCard icon={PublicationIcon} label="Works" value={stats.total_works} color={tl[600]} bgColor={alpha(tl[600], 0.1)} subtitle={`${stats.open_access_percentage}% OA`} />
              <StatCard icon={PeopleIcon} label="Authors" value={stats.total_authors} color="#06b6d4" bgColor={alpha('#06b6d4', 0.1)} />
              <StatCard icon={CitationIcon} label="Citations" value={stats.total_citations?.toLocaleString()} color={COLORS.amber[500]} bgColor={alpha(COLORS.amber[500], 0.1)} />
              <StatCard icon={BusinessIcon} label="Institutions" value={stats.total_institutions} color="#0ea5e9" bgColor={alpha('#0ea5e9', 0.1)} />
              <StatCard icon={FundingIcon} label="Funders" value={stats.total_funders} color={COLORS.green[600]} bgColor={alpha(COLORS.green[600], 0.1)} />
              <StatCard icon={OpenAccessIcon} label="Open Access" value={`${stats.open_access_percentage}%`} color={COLORS.green[500]} bgColor={alpha(COLORS.green[500], 0.1)} />
            </Box>
          </Container>
        </Box>
      )}

      {/* ─── Main Content ─── */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {error && (
          <Alert severity="warning" sx={{ mb: 3 }} action={<Button color="inherit" size="small" onClick={handleSeedData}>Seed Mock Data</Button>}>
            {error}
          </Alert>
        )}

        <Box sx={{ bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`, borderRadius: 3, overflow: 'hidden' }}>
          <Tabs value={tab} onChange={(e, v) => { setTab(v); setPage(0); }} sx={{
            borderBottom: `1px solid ${theme.palette.divider}`, px: 2,
            '& .MuiTabs-indicator': { bgcolor: tl[600], height: 3, borderRadius: '3px 3px 0 0' },
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13, minHeight: 52, color: 'text.secondary' },
            '& .Mui-selected': { color: `${tl[600]} !important` },
          }}>
            <Tab icon={<PublicationIcon sx={{ fontSize: 16 }} />} iconPosition="start" label={`Works (${works.length})`} />
            <Tab icon={<PeopleIcon sx={{ fontSize: 16 }} />} iconPosition="start" label={`Authors (${authors.length})`} />
            <Tab icon={<BusinessIcon sx={{ fontSize: 16 }} />} iconPosition="start" label={`Institutions (${institutions.length})`} />
            <Tab icon={<FundingIcon sx={{ fontSize: 16 }} />} iconPosition="start" label={`Funders (${funders.length})`} />
          </Tabs>

          <Box sx={{ p: { xs: 2, md: 3 } }}>
            {/* Works Tab */}
            {tab === 0 && (
              <>
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                  <TextField placeholder="Search by title, abstract or keywords..." size="small" value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.disabled', fontSize: 18 }} /></InputAdornment> }}
                    sx={{ flex: 1, minWidth: 260 }} />
                  <TextField select size="small" value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} SelectProps={{ native: true }} sx={{ minWidth: 160 }}>
                    <option value="">All Topics</option>
                    {topics.map(t => <option key={t} value={t}>{t}</option>)}
                  </TextField>
                  <TextField select size="small" value={oaFilter} onChange={(e) => setOaFilter(e.target.value)} SelectProps={{ native: true }} sx={{ minWidth: 140 }}>
                    <option value="">All Access</option>
                    <option value="true">Open Access</option>
                    <option value="false">Closed Access</option>
                  </TextField>
                  {(search || topicFilter || oaFilter) && (
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                      {filteredWorks.length} result{filteredWorks.length !== 1 ? 's' : ''}
                    </Typography>
                  )}
                </Box>
                {filteredWorks.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <SearchIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>No works found</Typography>
                    <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>Try adjusting your search or filters</Typography>
                  </Box>
                ) : (
                  <>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2.5 }}>
                      {paginatedWorks.map(work => <WorkCard key={work.id} work={work} />)}
                    </Box>
                    <TablePagination component="div" count={filteredWorks.length} page={page}
                      onPageChange={(e, newPage) => setPage(newPage)} rowsPerPage={rowsPerPage}
                      onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                      rowsPerPageOptions={[6, 9, 12, 24]} sx={{ mt: 3, borderTop: `1px solid ${theme.palette.divider}` }} />
                  </>
                )}
              </>
            )}

            {/* Authors Tab */}
            {tab === 1 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                {authors.map((author, idx) => (
                  <Box key={idx} sx={{ bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`, borderRadius: 2.5, p: 2.5, display: 'flex', alignItems: 'flex-start', gap: 1.5, transition: 'border-color 0.15s, box-shadow 0.15s', '&:hover': { borderColor: alpha('#06b6d4', 0.45), boxShadow: `0 4px 12px ${alpha('#06b6d4', 0.08)}` } }}>
                    <Avatar sx={{ width: 40, height: 40, bgcolor: alpha('#06b6d4', 0.12), color: '#06b6d4', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                      {author.name?.charAt(0)?.toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.3 }}>{author.name}</Typography>
                      {author.affiliation && <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.5 }}>{author.affiliation}</Typography>}
                      {author.orcid && <Typography sx={{ fontSize: 10, color: 'text.disabled', mb: 0.75 }}>ORCID: {author.orcid}</Typography>}
                      <Chip label={`${author.publication_count} publications`} size="small" sx={{ fontSize: 10, height: 20, bgcolor: alpha(tl[600], 0.1), color: tl[600], fontWeight: 600 }} />
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            {/* Institutions Tab */}
            {tab === 2 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                {institutions.map((inst, idx) => (
                  <Box key={idx} sx={{ bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`, borderRadius: 2.5, p: 2.5, display: 'flex', alignItems: 'flex-start', gap: 1.5, transition: 'border-color 0.15s, box-shadow 0.15s', '&:hover': { borderColor: alpha('#0ea5e9', 0.45), boxShadow: `0 4px 12px ${alpha('#0ea5e9', 0.08)}` } }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: alpha('#0ea5e9', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <BusinessIcon sx={{ fontSize: 20, color: '#0ea5e9' }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.3 }}>{inst.name}</Typography>
                      {inst.country && <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.75 }}>{inst.country}</Typography>}
                      <Chip label={`${inst.publication_count} publications`} size="small" sx={{ fontSize: 10, height: 20, bgcolor: alpha('#0ea5e9', 0.1), color: '#0ea5e9', fontWeight: 600 }} />
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            {/* Funders Tab */}
            {tab === 3 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                {funders.map((funder, idx) => (
                  <Box key={idx} sx={{ bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`, borderRadius: 2.5, p: 2.5, display: 'flex', alignItems: 'flex-start', gap: 1.5, transition: 'border-color 0.15s, box-shadow 0.15s', '&:hover': { borderColor: alpha(COLORS.green[600], 0.45), boxShadow: `0 4px 12px ${alpha(COLORS.green[600], 0.08)}` } }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: alpha(COLORS.green[600], 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FundingIcon sx={{ fontSize: 20, color: COLORS.green[600] }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.3 }}>{funder.name}</Typography>
                      {funder.country && <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.75 }}>{funder.country}</Typography>}
                      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                        <Chip label={`${funder.grants_count} grants`} size="small" sx={{ fontSize: 10, height: 20, bgcolor: alpha(COLORS.green[600], 0.1), color: COLORS.green[600], fontWeight: 600 }} />
                        <Chip label={`$${(funder.total_funding / 1000000).toFixed(1)}M funded`} size="small" sx={{ fontSize: 10, height: 20, bgcolor: alpha(tl[600], 0.1), color: tl[600], fontWeight: 600 }} />
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>

        {/* Footer note */}
        <Box sx={{ mt: 3, p: 3, bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`, borderRadius: 3, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: alpha(tl[600], 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <PublicIcon sx={{ fontSize: 18, color: tl[600] }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5, color: 'text.primary' }}>About This Portal</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.7 }}>
              This scholarly works portal provides open access to research publications with comprehensive metadata linking authors,
              institutions, and funders — following FAIR principles to ensure outputs are discoverable and reusable.
              All data is publicly accessible without login. Currently showing <strong>{works.length}</strong> scholarly works.
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
