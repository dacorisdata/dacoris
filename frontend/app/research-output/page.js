'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Container, Typography, Button, CircularProgress, Alert, Chip,
  TextField, InputAdornment, Tab, Tabs, Divider, useTheme as useMuiTheme,
  TablePagination, alpha, Autocomplete, Paper,
} from '@mui/material';
import {
  Search as SearchIcon, Business as BusinessIcon,
  AccountBalance as FundingIcon, LibraryBooks as PublicationIcon,
  People as PeopleIcon, Science as ProjectIcon,
  FormatQuote as CitationIcon, LockOpen as OpenAccessIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { COLORS } from '@/contexts/ThemeContext';
import { ScholarRow, ListRow, TL } from '@/components/research-catalog/CatalogShared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const sl = COLORS.slate;

const TABS = [
  { key: 'works', label: 'Works', icon: PublicationIcon },
  { key: 'researchers', label: 'Researchers', icon: PeopleIcon },
  { key: 'institutions', label: 'Institutions', icon: BusinessIcon },
  { key: 'projects', label: 'Projects', icon: ProjectIcon },
  { key: 'funders', label: 'Funders', icon: FundingIcon },
];

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
  const [searchSuggestions, setSearchSuggestions] = useState([]);

  const [stats, setStats] = useState(null);
  const [works, setWorks] = useState([]);
  const [researchers, setResearchers] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [funders, setFunders] = useState([]);
  const [topics, setTopics] = useState([]);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const loadCatalog = useCallback(async (q = '') => {
    setLoading(true);
    const params = q ? { search: q } : {};
    const requests = [
      ['stats', axios.get(`${API_URL}/public/catalog/stats`)],
      ['works', axios.get(`${API_URL}/public/catalog/works`, { params: { ...params, limit: 50 } })],
      ['researchers', axios.get(`${API_URL}/public/catalog/researchers`, { params: { ...params, limit: 50 } })],
      ['institutions', axios.get(`${API_URL}/public/catalog/institutions`, { params: { ...params, limit: 50 } })],
      ['projects', axios.get(`${API_URL}/public/catalog/projects`, { params: { ...params, limit: 50 } })],
      ['funders', axios.get(`${API_URL}/public/catalog/funders`, { params: { ...params, limit: 50 } })],
      ['topics', axios.get(`${API_URL}/public/catalog/topics`)],
    ];
    const results = await Promise.allSettled(requests.map(([, req]) => req));
    const failed = [];
    results.forEach((result, i) => {
      const key = requests[i][0];
      if (result.status === 'rejected') {
        failed.push(key);
        console.error(`Catalog ${key} failed:`, result.reason);
        return;
      }
      const data = result.value.data;
      if (key === 'stats') setStats(data);
      else if (key === 'works') setWorks(data);
      else if (key === 'researchers') setResearchers(data);
      else if (key === 'institutions') setInstitutions(data);
      else if (key === 'projects') setProjects(data);
      else if (key === 'funders') setFunders(data);
      else if (key === 'topics') setTopics(data.topics || []);
    });
    setError(failed.length ? `Some sections could not load: ${failed.join(', ')}.` : '');
    setLoading(false);
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const handleSearch = () => {
    setPage(0);
    loadCatalog(search.trim());
  };

  const handleSeed = async () => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/public/works/seed-mock-data`);
      await loadCatalog(search);
    } catch {
      setError('Failed to seed sample data');
      setLoading(false);
    }
  };

  const fetchSuggestions = async (val) => {
    if (!val || val.length < 2) { setSearchSuggestions([]); return; }
    try {
      const res = await axios.get(`${API_URL}/public/catalog/search`, { params: { q: val, limit: 8 } });
      setSearchSuggestions(res.data);
    } catch { setSearchSuggestions([]); }
  };

  const filteredWorks = works.filter((w) => {
    const matchTopic = !topicFilter || w.primary_topic === topicFilter;
    const matchYear = !yearFilter || w.publication_year === parseInt(yearFilter, 10);
    return matchTopic && matchYear;
  });

  const activeList = [filteredWorks, researchers, institutions, projects, funders][tab] || [];
  const paginated = activeList.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const StatCard = ({ icon: Icon, label, value, color, subtitle }) => (
    <Box sx={{ bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`, borderRadius: 2, p: 1.75, textAlign: 'center' }}>
      <Icon sx={{ color, fontSize: 22, mb: 0.5 }} />
      <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>{value}</Typography>
      <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary', mt: 0.3 }}>{label}</Typography>
      {subtitle && <Typography sx={{ fontSize: 10, color: 'text.disabled', mt: 0.2 }}>{subtitle}</Typography>}
    </Box>
  );

  if (loading && !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress sx={{ color: TL[600] }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>

      {/* Hero — OpenAlex-inspired */}
      <Box sx={{
        background: dark
          ? `linear-gradient(135deg, ${sl[900]} 0%, ${sl[800]} 60%, ${TL[900]} 100%)`
          : `linear-gradient(135deg, ${TL[800]} 0%, ${TL[600]} 50%, ${TL[700]} 100%)`,
        py: { xs: 6, md: 8 }, px: 2,
      }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="overline" sx={{ color: alpha('#fff', 0.75), letterSpacing: '0.14em' }}>
            DACORIS Research Catalog
          </Typography>
          <Typography sx={{ fontSize: { xs: 28, md: 42 }, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', mb: 1, mt: 1 }}>
            Research Output
          </Typography>
          <Typography sx={{ fontSize: { xs: 14, md: 16 }, color: alpha('#fff', 0.88), mb: 4, maxWidth: 560, mx: 'auto', lineHeight: 1.65 }}>
            Discover publications, researchers, institutions, funded projects, and their teams —
            an Open Knowledge graph for African research.
          </Typography>

          <Paper elevation={dark ? 0 : 4} sx={{ p: 0.5, borderRadius: 3, maxWidth: 640, mx: 'auto', display: 'flex', gap: 0.5 }}>
            <Autocomplete
              freeSolo
              fullWidth
              options={searchSuggestions}
              getOptionLabel={(o) => (typeof o === 'string' ? o : o.title)}
              inputValue={search}
              onInputChange={(_, val) => { setSearch(val); fetchSuggestions(val); }}
              onChange={(_, val) => {
                if (val && typeof val === 'object') {
                  const paths = {
                    work: `/research-output/work/${val.id}`,
                    researcher: `/research-output/researcher/${val.id}`,
                    institution: `/research-output/institution/${val.id}`,
                    project: `/research-output/project/${val.id}`,
                    funder: `/research-output/funder/${val.id}`,
                  };
                  router.push(paths[val.entity_type] || '/research-output');
                }
              }}
              renderOption={(props, opt) => (
                <li {...props} key={`${opt.entity_type}-${opt.id}`}>
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{opt.title}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                      {opt.entity_type} · {opt.subtitle || opt.meta || ''}
                    </Typography>
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search works, researchers, institutions, projects, funders…"
                  variant="standard"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  InputProps={{
                    ...params.InputProps,
                    disableUnderline: true,
                    startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.disabled' }} /></InputAdornment>,
                    sx: { px: 2, py: 1.25, fontSize: 15 },
                  }}
                />
              )}
            />
            <Button
              variant="contained"
              onClick={handleSearch}
              sx={{ bgcolor: TL[600], px: 3, borderRadius: 2.5, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: TL[700] }, flexShrink: 0 }}
            >
              Search
            </Button>
          </Paper>
        </Container>
      </Box>

      {/* Stats */}
      {stats && (
        <Container maxWidth="lg" sx={{ mt: -3, position: 'relative', zIndex: 2, mb: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' }, gap: 1.5 }}>
            <StatCard icon={PublicationIcon} label="Works" value={stats.total_works} color={TL[600]} subtitle={`${stats.open_access_percentage}% open access`} />
            <StatCard icon={PeopleIcon} label="Researchers" value={stats.total_researchers} color="#06b6d4" />
            <StatCard icon={BusinessIcon} label="Institutions" value={stats.total_institutions} color="#0ea5e9" />
            <StatCard icon={ProjectIcon} label="Projects" value={stats.total_projects} color={COLORS.blue[600]} />
            <StatCard icon={FundingIcon} label="Funders" value={stats.total_funders} color={COLORS.green[600]} />
            <StatCard icon={CitationIcon} label="Citations" value={stats.total_citations?.toLocaleString()} color={COLORS.amber[600]} />
          </Box>
        </Container>
      )}

      <Container maxWidth="lg" sx={{ pb: 6 }}>
        {error && (
          <Alert severity="warning" sx={{ mb: 2 }} action={
            <Button color="inherit" size="small" onClick={handleSeed}>Load sample data</Button>
          }>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Sidebar filters */}
          <Box sx={{ width: { md: 220 }, flexShrink: 0 }}>
            <Box sx={{ bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`, borderRadius: 2.5, p: 2, position: { md: 'sticky' }, top: 88 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.secondary', mb: 1.5 }}>
                Filters
              </Typography>
              {tab === 0 && (
                <>
                  <TextField select fullWidth size="small" label="Topic" value={topicFilter}
                    onChange={(e) => { setTopicFilter(e.target.value); setPage(0); }}
                    SelectProps={{ native: true }} InputLabelProps={{ shrink: true }} sx={{ mb: 1.5 }}>
                    <option value="">All topics</option>
                    {topics.map((t) => <option key={t} value={t}>{t}</option>)}
                  </TextField>
                  <TextField fullWidth size="small" label="Year" type="number" value={yearFilter}
                    onChange={(e) => { setYearFilter(e.target.value); setPage(0); }}
                    InputLabelProps={{ shrink: true }} />
                </>
              )}
              <Divider sx={{ my: 2 }} />
              <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.6 }}>
                Browse the interconnected graph of African research — publications linked to authors, host institutions, funded projects, and grant makers.
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <TrendingIcon sx={{ fontSize: 16, color: TL[600] }} />
                <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>FAIR-aligned metadata</Typography>
              </Box>
            </Box>
          </Box>

          {/* Results */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`, borderRadius: 2.5, overflow: 'hidden' }}>
              <Tabs
                value={tab}
                onChange={(_, v) => { setTab(v); setPage(0); }}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  '& .MuiTabs-indicator': { bgcolor: TL[600], height: 3 },
                  '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13, minHeight: 48 },
                  '& .Mui-selected': { color: `${TL[600]} !important` },
                }}
              >
                {TABS.map((t, i) => {
                  const counts = [filteredWorks.length, researchers.length, institutions.length, projects.length, funders.length];
                  const Icon = t.icon;
                  return (
                    <Tab key={t.key} icon={<Icon sx={{ fontSize: 16 }} />} iconPosition="start"
                      label={`${t.label} (${counts[i]})`} />
                  );
                })}
              </Tabs>

              {loading ? (
                <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress size={32} sx={{ color: TL[600] }} /></Box>
              ) : paginated.length === 0 ? (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <SearchIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography sx={{ fontWeight: 600, color: 'text.secondary' }}>No results</Typography>
                </Box>
              ) : (
                <Box>
                  {tab === 0 && paginated.map((w) => (
                    <ScholarRow key={w.id} work={w} onNavigate={router.push} />
                  ))}
                  {tab === 1 && paginated.map((r) => (
                    <ListRow
                      key={r.id}
                      href={`/research-output/researcher/${r.id}`}
                      title={r.name}
                      subtitle={[r.affiliation, r.department].filter(Boolean).join(' · ')}
                      meta={r.orcid ? `ORCID ${r.orcid}` : null}
                      chips={[
                        `${r.publication_count} publications`,
                        r.project_count > 0 && `${r.project_count} projects`,
                        r.is_platform_user && 'DACORIS member',
                      ].filter(Boolean)}
                    />
                  ))}
                  {tab === 2 && paginated.map((i) => (
                    <ListRow
                      key={i.id}
                      href={`/research-output/institution/${i.id}`}
                      title={i.name}
                      subtitle={[i.country, i.domain].filter(Boolean).join(' · ')}
                      chips={[
                        i.publication_count > 0 && `${i.publication_count} publications`,
                        i.project_count > 0 && `${i.project_count} projects`,
                        i.researcher_count > 0 && `${i.researcher_count} researchers`,
                      ].filter(Boolean)}
                    />
                  ))}
                  {tab === 3 && paginated.map((p) => (
                    <ListRow
                      key={p.id}
                      href={`/research-output/project/${p.id}`}
                      title={p.title}
                      subtitle={[p.pi_name, p.institution_name].filter(Boolean).join(' · ')}
                      meta={p.research_area}
                      chips={[
                        p.status,
                        p.funder_name && `Funded by ${p.funder_name}`,
                        p.team_size > 0 && `Team of ${p.team_size}`,
                        p.output_count > 0 && `${p.output_count} outputs`,
                      ].filter(Boolean)}
                    />
                  ))}
                  {tab === 4 && paginated.map((f) => (
                    <ListRow
                      key={f.id}
                      href={`/research-output/funder/${f.id}`}
                      title={f.name}
                      subtitle={f.country}
                      chips={[
                        f.works_count > 0 && `${f.works_count} funded works`,
                        f.projects_count > 0 && `${f.projects_count} projects`,
                        f.total_funding > 0 && `${f.currency} ${(f.total_funding / 1e6).toFixed(1)}M`,
                      ].filter(Boolean)}
                    />
                  ))}
                </Box>
              )}

              {activeList.length > 0 && (
                <TablePagination
                  component="div"
                  count={activeList.length}
                  page={page}
                  onPageChange={(_, p) => setPage(p)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                  rowsPerPageOptions={[10, 25, 50]}
                />
              )}
            </Box>

            <Box sx={{ mt: 3, p: 2.5, bgcolor: alpha(TL[600], 0.04), border: `1px solid ${alpha(TL[600], 0.15)}`, borderRadius: 2.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5 }}>About this catalog</Typography>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.7 }}>
                Inspired by OpenAlex and Google Scholar, this portal surfaces all research held in DACORIS —
                including drafts, manuscripts, project outputs, and publication libraries — alongside
                projects, teams, and funders. Unpublished work is labelled with its current status.
              </Typography>
              <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {['Findable', 'Accessible', 'Interoperable', 'Reusable'].map((l) => (
                  <Chip key={l} label={l} size="small" sx={{ fontSize: 10, bgcolor: alpha(TL[600], 0.1), color: TL[700], fontWeight: 600 }} />
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
