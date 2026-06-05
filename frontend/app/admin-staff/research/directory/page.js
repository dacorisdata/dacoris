'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme,
  TextField, Avatar, Alert, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination,
  InputAdornment, FormControl, Select, MenuItem, Tooltip,
  Link, Dialog, DialogContent, IconButton, Divider,
} from '@mui/material';
import {
  Search as SearchIcon, Refresh as RefreshIcon,
  PeopleAlt as DirectoryIcon, Email as EmailIcon,
  Science as ProjectsIcon, Badge as OrcidBadgeIcon,
  Close as CloseIcon, Groups as CollabIcon,
  MenuBook as PubIcon, Assignment as ProposalIcon,
  Edit as ManuscriptIcon, ArrowUpward, ArrowDownward,
  UnfoldMore, Clear as ClearIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../lib/api';

const ACCENT = '#0d9488';

const STATUS_META = {
  active:    { label: 'Active',    color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  pending:   { label: 'Pending',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  suspended: { label: 'Suspended', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  inactive:  { label: 'Inactive',  color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
};

const ENGAGEMENT_GROUPS = [
  { key: 'projects',     label: 'Research Projects',          icon: ProjectsIcon,  color: '#3b82f6', kinds: ['project_pi', 'project_member'] },
  { key: 'proposals',    label: 'Grant Proposals',            icon: ProposalIcon,  color: '#8b5cf6', kinds: ['proposal_pi', 'proposal_collaborator'] },
  { key: 'manuscripts',  label: 'Manuscripts & Co-Authorship', icon: ManuscriptIcon, color: '#f97316', kinds: ['manuscript', 'manuscript_coauthor'] },
  { key: 'publications', label: 'Publications',               icon: PubIcon,       color: '#10b981', kinds: ['publication'] },
];

const KIND_LABELS = {
  project_pi: 'PI', project_member: 'Team',
  proposal_pi: 'Lead PI', proposal_collaborator: 'Collab',
  manuscript: 'Author', manuscript_coauthor: 'Co-author',
  publication: 'Pub',
};

const AVATAR_PALETTE = ['#0d9488','#3b82f6','#8b5cf6','#0ea5e9','#10b981','#f59e0b','#6366f1','#ec4899'];

const parseExpertise = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    try { const p = JSON.parse(value); return Array.isArray(p) ? p.filter(Boolean) : [value]; }
    catch { return value.split(',').map(k => k.trim()).filter(Boolean); }
  }
  return [];
};

const avatarColor = (name) => {
  const key = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_PALETTE[key % AVATAR_PALETTE.length];
};

const initials = (name) =>
  (name || '?').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();

const normalizeResearcher = (r) => ({
  id: r.id, name: r.name || r.email,
  title: r.job_title || 'Researcher', dept: r.department || 'Unassigned',
  expertise: parseExpertise(r.expertise_keywords), orcid: r.orcid_id,
  projects: r.projects_count || 0, collaborations: r.collaborations_count || 0,
  publications: r.publications_count || 0, engagements: r.engagements || [],
  status: (r.status || 'active').toLowerCase(), email: r.email,
});

// ── Activity summary cell ─────────────────────────────────────────────────
function ActivitySummary({ engagements, onView }) {
  if (!engagements?.length)
    return <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>No activity yet</Typography>;

  const counts = ENGAGEMENT_GROUPS
    .map(g => ({ ...g, count: engagements.filter(e => g.kinds.includes(e.kind)).length }))
    .filter(g => g.count > 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
        {counts.map(g => (
          <Box key={g.key} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.35, px: 0.875, py: 0.2, borderRadius: '5px', bgcolor: `${g.color}14`, color: g.color, fontSize: 10, fontWeight: 700 }}>
            {g.count} {g.label.split(' ')[0]}
          </Box>
        ))}
      </Box>
      <Typography component="button" onClick={onView} sx={{ fontSize: 11, fontWeight: 600, color: ACCENT, textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', p: 0, '&:hover': { textDecoration: 'underline' } }}>
        View all activity →
      </Typography>
    </Box>
  );
}

// ── Researcher activity dialog ─────────────────────────────────────────────
function ResearcherActivityDialog({ researcher, open, onClose, theme, dark }) {
  if (!researcher) return null;
  const color = avatarColor(researcher.name);
  const grouped = ENGAGEMENT_GROUPS
    .map(g => ({ ...g, items: (researcher.engagements || []).filter(e => g.kinds.includes(e.kind)) }))
    .filter(g => g.items.length > 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper"
      PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden' } }}
    >
      {/* Gradient header */}
      <Box sx={{ background: `linear-gradient(135deg, ${color}28, ${color}08)`, borderBottom: `1px solid ${theme.palette.divider}`, px: 3, py: 2.5, pr: 6, position: 'relative' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar sx={{ width: 50, height: 50, bgcolor: color, fontWeight: 700, fontSize: 17, boxShadow: `0 0 0 3px ${color}40` }}>
            {initials(researcher.name)}
          </Avatar>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>{researcher.name}</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{researcher.title} · {researcher.dept}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
          {[
            { icon: <ProjectsIcon sx={{ fontSize: 12 }} />, label: `${researcher.projects} Projects`, color: '#3b82f6' },
            { icon: <CollabIcon sx={{ fontSize: 12 }} />, label: `${researcher.collaborations} Collabs`, color: '#8b5cf6' },
            { icon: <PubIcon sx={{ fontSize: 12 }} />, label: `${researcher.publications} Pubs`, color: '#10b981' },
          ].map(s => (
            <Box key={s.label} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1.25, py: 0.4, borderRadius: '7px', bgcolor: `${s.color}14`, color: s.color, fontSize: '0.75rem', fontWeight: 700 }}>
              {s.icon}{s.label}
            </Box>
          ))}
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ position: 'absolute', right: 12, top: 12, color: 'text.secondary' }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        {grouped.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No recorded activity yet.</Typography>
          </Box>
        ) : grouped.map((group, idx) => {
          const Icon = group.icon;
          return (
            <Box key={group.key} sx={{ mb: idx < grouped.length - 1 ? 3.5 : 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Box sx={{ width: 28, height: 28, borderRadius: '7px', bgcolor: `${group.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon sx={{ fontSize: 15, color: group.color }} />
                </Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{group.label}</Typography>
                <Box sx={{ px: 0.75, py: 0.1, borderRadius: '5px', bgcolor: `${group.color}14`, color: group.color, fontSize: '0.6875rem', fontWeight: 700 }}>
                  {group.items.length}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {group.items.map(item => (
                  <Box
                    key={`${item.kind}-${item.id}-${item.role}`}
                    sx={{
                      p: 1.75, borderRadius: '10px',
                      border: `1px solid ${theme.palette.divider}`,
                      borderLeft: `3px solid ${group.color}`,
                      bgcolor: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                      transition: 'background 0.15s',
                      '&:hover': { bgcolor: dark ? 'rgba(255,255,255,0.04)' : `${group.color}06` },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 700, flex: 1, minWidth: 0 }}>{item.title}</Typography>
                      <Box sx={{ display: 'inline-flex', px: 1, py: 0.25, borderRadius: '5px', bgcolor: `${group.color}14`, color: group.color, fontSize: '0.6875rem', fontWeight: 700, flexShrink: 0 }}>
                        {item.role}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                      <Chip label={KIND_LABELS[item.kind] || item.kind} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                      {item.status && <Chip label={item.status.replace(/_/g, ' ')} size="small" sx={{ fontSize: 10, height: 20, textTransform: 'capitalize' }} />}
                      {item.context && <Typography sx={{ fontSize: 11, color: 'text.secondary', alignSelf: 'center' }}>{item.context}</Typography>}
                    </Box>
                  </Box>
                ))}
              </Box>
              {idx < grouped.length - 1 && <Divider sx={{ mt: 3 }} />}
            </Box>
          );
        })}
      </DialogContent>
    </Dialog>
  );
}

// ── Sort helper ───────────────────────────────────────────────────────────
function SortIndicator({ field, sort }) {
  if (sort.field !== field) return <UnfoldMore sx={{ fontSize: 13, opacity: 0.3, ml: 0.25, flexShrink: 0 }} />;
  return sort.dir === 'asc'
    ? <ArrowUpward sx={{ fontSize: 12, ml: 0.25, color: ACCENT, flexShrink: 0 }} />
    : <ArrowDownward sx={{ fontSize: 12, ml: 0.25, color: ACCENT, flexShrink: 0 }} />;
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function ResearcherDirectoryPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [researchers, setResearchers] = useState([]);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [selectedResearcher, setSelectedResearcher] = useState(null);
  const [sort, setSort] = useState({ field: 'name', dir: 'asc' });

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin) { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    await loadResearchers();
  };

  const loadResearchers = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/research/directory');
      setResearchers((res.data || []).map(normalizeResearcher));
    } catch (e) {
      setResearchers([]);
      setError(e.response?.data?.detail || 'Failed to load researcher directory.');
    } finally { setLoading(false); }
  };

  const toggleSort = (field) => {
    setSort(s => s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' });
    setPage(0);
  };

  const departments = useMemo(() => {
    const counts = {};
    researchers.forEach(r => { const d = r.dept || 'Unassigned'; counts[d] = (counts[d] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [researchers]);

  const stats = useMemo(() => ({
    total: researchers.length,
    active: researchers.filter(r => r.status === 'active').length,
    pending: researchers.filter(r => r.status === 'pending').length,
    withOrcid: researchers.filter(r => r.orcid).length,
    totalProjects: researchers.reduce((s, r) => s + r.projects, 0),
    totalCollabs: researchers.reduce((s, r) => s + r.collaborations, 0),
  }), [researchers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = researchers.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (deptFilter !== 'all' && r.dept !== deptFilter) return false;
      if (!q) return true;
      return [r.name, r.email, r.dept, r.title, ...(r.expertise || []), ...(r.engagements || []).map(e => e.title)]
        .some(v => v?.toLowerCase().includes(q));
    });
    return [...result].sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1;
      if (sort.field === 'name') return dir * (a.name || '').localeCompare(b.name || '');
      if (sort.field === 'dept') return dir * (a.dept || '').localeCompare(b.dept || '');
      if (sort.field === 'projects') return dir * (a.projects - b.projects);
      if (sort.field === 'collabs')  return dir * (a.collaborations - b.collaborations);
      return 0;
    });
  }, [researchers, search, statusFilter, deptFilter, sort]);

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const SortableCell = ({ field, label, align = 'left' }) => (
    <TableCell align={align} onClick={() => toggleSort(field)} sx={{
      fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5,
      color: sort.field === field ? ACCENT : 'text.secondary',
      whiteSpace: 'nowrap', py: 1.5, cursor: 'pointer', userSelect: 'none',
      transition: 'color 0.15s', '&:hover': { color: ACCENT },
    }}>
      <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
        {label}<SortIndicator field={field} sort={sort} />
      </Box>
    </TableCell>
  );

  const staticCell = { fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', py: 1.5 };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  const statCards = [
    { key: 'total',    label: 'Total Researchers', value: stats.total,         color: ACCENT,    filterKey: null,     filterVal: null },
    { key: 'active',   label: 'Active',            value: stats.active,        color: '#10b981', filterKey: 'status', filterVal: 'active' },
    { key: 'pending',  label: 'Pending Approval',  value: stats.pending,       color: '#f59e0b', filterKey: 'status', filterVal: 'pending' },
    { key: 'projects', label: 'Total Projects',    value: stats.totalProjects, color: '#3b82f6', filterKey: null,     filterVal: null },
    { key: 'orcid',    label: 'ORCID Linked',      value: stats.withOrcid,     color: '#a3c639', filterKey: null,     filterVal: null },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>

      {/* ── Page header ──────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Box sx={{ width: 44, height: 44, borderRadius: '12px', background: `linear-gradient(135deg, ${ACCENT}, #14b8a6)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <DirectoryIcon sx={{ fontSize: 22, color: '#fff' }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
              Researcher Directory
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.25 }}>
              Institutional roster with live project, collaboration & publication activity
            </Typography>
          </Box>
        </Box>
        <Button size="small" variant="outlined" startIcon={<RefreshIcon sx={{ fontSize: 15 }} />} onClick={loadResearchers}
          sx={{ textTransform: 'none', borderRadius: '9px', fontWeight: 600, fontSize: 13, px: 2 }}>
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '10px' }} onClose={() => setError('')}>{error}</Alert>}

      {/* ── Stat cards ────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        {statCards.map(s => {
          const isActive = s.filterKey === 'status' && statusFilter === s.filterVal;
          return (
            <Box key={s.key} onClick={() => { if (s.filterKey) { setStatusFilter(isActive ? 'all' : s.filterVal); setPage(0); } }}
              sx={{
                flex: '1 1 130px', bgcolor: 'background.paper',
                border: '1px solid', borderColor: isActive ? s.color : 'divider',
                borderLeft: `4px solid ${s.color}`, borderRadius: '10px',
                px: 2, py: 1.75, cursor: s.filterKey ? 'pointer' : 'default',
                transition: 'all 0.18s',
                '&:hover': s.filterKey ? { borderColor: s.color, bgcolor: `${s.color}06` } : {},
              }}>
              <Typography sx={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</Typography>
              <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 600, mt: 0.5, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                {s.label}
              </Typography>
              {s.filterKey && (
                <Typography sx={{ fontSize: 10, color: isActive ? s.color : 'text.disabled', mt: 0.2 }}>
                  {isActive ? 'Click to clear' : 'Click to filter'}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>

      {/* ── Department filter ─────────────────────────────────────────── */}
      {departments.length > 1 && (
        <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '10px', px: 2, py: 1.5, mb: 2.5 }}>
          <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.6, mb: 1.25 }}>
            Filter by Department
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {[{ name: 'all', count: stats.total }, ...departments.slice(0, 10)].map(({ name, count }) => (
              <Chip key={name} label={name === 'all' ? `All (${count})` : `${name} (${count})`} size="small"
                onClick={() => { setDeptFilter(name); setPage(0); }}
                sx={{
                  fontWeight: deptFilter === name ? 700 : 600, fontSize: 11, height: 26, borderRadius: '7px',
                  bgcolor: deptFilter === name ? `${ACCENT}18` : 'transparent',
                  color: deptFilter === name ? ACCENT : 'text.secondary',
                  border: `1px solid ${deptFilter === name ? ACCENT : theme.palette.divider}`,
                  transition: 'all 0.15s',
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* ── Search + status row ───────────────────────────────────────── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
        <TextField size="small" placeholder="Search name, department, expertise or project…"
          value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 17, color: 'text.disabled' }} /></InputAdornment>,
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => { setSearch(''); setPage(0); }}>
                  <ClearIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{ width: { xs: '100%', sm: 420 }, '& .MuiOutlinedInput-root': { borderRadius: '9px' } }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <FormControl size="small" sx={{ minWidth: 135 }}>
            <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }} sx={{ borderRadius: '9px', fontSize: 13 }}>
              <MenuItem value="all">All statuses</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="suspended">Suspended</MenuItem>
            </Select>
          </FormControl>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
      </Box>

      {/* ── Table / empty state ───────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', textAlign: 'center', py: 8, px: 3, bgcolor: 'background.paper' }}>
          <Box sx={{ width: 64, height: 64, borderRadius: '14px', background: `linear-gradient(135deg, ${ACCENT}18, ${ACCENT}06)`, border: `1px solid ${ACCENT}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
            <DirectoryIcon sx={{ fontSize: 30, color: ACCENT }} />
          </Box>
          <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 0.75 }}>
            {researchers.length === 0 ? 'No researchers registered yet' : 'No matching researchers'}
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', maxWidth: 400, mx: 'auto' }}>
            {researchers.length === 0
              ? 'Researchers who register at your institution will appear here once their accounts are created.'
              : 'Try adjusting your search term or filters.'}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', overflow: 'hidden', bgcolor: 'background.paper' }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)' }}>
                  <SortableCell field="name" label="Researcher" />
                  <SortableCell field="dept" label="Department" />
                  <TableCell sx={staticCell}>Activity</TableCell>
                  <SortableCell field="projects" label="Projects" align="center" />
                  <SortableCell field="collabs" label="Collabs" align="center" />
                  <TableCell sx={staticCell}>ORCID</TableCell>
                  <TableCell sx={staticCell}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginated.map(r => {
                  const sm = STATUS_META[r.status] || STATUS_META.inactive;
                  const color = avatarColor(r.name);
                  return (
                    <TableRow key={r.id} hover onClick={() => setSelectedResearcher(r)}
                      sx={{
                        cursor: 'pointer', '&:last-child td': { borderBottom: 0 },
                        transition: 'background 0.15s',
                        '&:hover': { bgcolor: dark ? 'rgba(255,255,255,0.035)' : `${ACCENT}07` },
                      }}>
                      <TableCell sx={{ py: 1.75 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 38, height: 38, bgcolor: color, fontSize: 13, fontWeight: 700, boxShadow: `0 0 0 2px ${color}35`, flexShrink: 0 }}>
                            {initials(r.name)}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.25 }}>{r.name}</Typography>
                            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', lineHeight: 1.3 }}>{r.title}</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.2 }}>
                              <EmailIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
                              <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }} noWrap>{r.email}</Typography>
                            </Box>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 160 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 500 }} noWrap>{r.dept}</Typography>
                        {r.expertise.length > 0 && (
                          <Tooltip title={r.expertise.join(', ')}>
                            <Box sx={{ display: 'flex', gap: 0.4, mt: 0.5, flexWrap: 'nowrap', overflow: 'hidden' }}>
                              {r.expertise.slice(0, 2).map(tag => (
                                <Box key={tag} sx={{ px: 0.75, py: 0.1, bgcolor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', borderRadius: '4px', fontSize: 10, fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                                  {tag}
                                </Box>
                              ))}
                            </Box>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <ActivitySummary engagements={r.engagements} onView={() => setSelectedResearcher(r)} />
                      </TableCell>
                      <TableCell align="center">
                        <Typography sx={{ fontSize: 14, fontWeight: 800, color: r.projects > 0 ? '#3b82f6' : 'text.disabled' }}>{r.projects}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography sx={{ fontSize: 14, fontWeight: 800, color: r.collaborations > 0 ? '#8b5cf6' : 'text.disabled' }}>{r.collaborations}</Typography>
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        {r.orcid ? (
                          <Link href={`https://orcid.org/${r.orcid}`} target="_blank" rel="noopener noreferrer" underline="none"
                            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.3, borderRadius: '6px', bgcolor: 'rgba(163,198,57,0.12)', color: '#a3c639', fontSize: 11, fontWeight: 700, border: '1px solid rgba(163,198,57,0.28)', transition: 'all 0.15s', '&:hover': { bgcolor: 'rgba(163,198,57,0.22)' } }}>
                            <OrcidBadgeIcon sx={{ fontSize: 13 }} />Linked
                          </Link>
                        ) : (
                          <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, px: 1.25, py: 0.4, borderRadius: '7px', bgcolor: sm.bg, color: sm.color, border: `1px solid ${sm.color}33`, fontSize: 11, fontWeight: 700 }}>
                          <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: sm.color, flexShrink: 0 }} />
                          {sm.label}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination component="div" count={filtered.length} page={page}
            onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
            onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 15, 25, 50]}
            sx={{ borderTop: `1px solid ${theme.palette.divider}` }}
          />
        </Box>
      )}

      <ResearcherActivityDialog researcher={selectedResearcher} open={Boolean(selectedResearcher)} onClose={() => setSelectedResearcher(null)} theme={theme} dark={dark} />
    </Box>
  );
}
