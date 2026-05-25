'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Chip,
  CircularProgress,
  Button,
  useTheme,
  TextField,
  Avatar,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  InputAdornment,
  FormControl,
  Select,
  MenuItem,
  Tooltip,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  PeopleAlt as DirectoryIcon,
  Email as EmailIcon,
  OpenInNew as OpenIcon,
  Science as ProjectsIcon,
  Badge as OrcidBadgeIcon,
  Close as CloseIcon,
  Groups as CollabIcon,
  MenuBook as PubIcon,
  Assignment as ProposalIcon,
  Edit as ManuscriptIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../lib/api';

const ACCENT = '#16a699';

const STATUS_META = {
  active:    { label: 'Active',    color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  pending:   { label: 'Pending',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  suspended: { label: 'Suspended', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  inactive:  { label: 'Inactive',  color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
};

const ENGAGEMENT_GROUPS = [
  {
    key: 'projects',
    label: 'Research Projects',
    icon: ProjectsIcon,
    color: '#3b82f6',
    kinds: ['project_pi', 'project_member'],
  },
  {
    key: 'proposals',
    label: 'Grant Proposals',
    icon: ProposalIcon,
    color: '#8b5cf6',
    kinds: ['proposal_pi', 'proposal_collaborator'],
  },
  {
    key: 'manuscripts',
    label: 'Manuscripts & Co-Authorship',
    icon: ManuscriptIcon,
    color: '#f97316',
    kinds: ['manuscript', 'manuscript_coauthor'],
  },
  {
    key: 'publications',
    label: 'Publications',
    icon: PubIcon,
    color: '#10b981',
    kinds: ['publication'],
  },
];

const KIND_LABELS = {
  project_pi: 'PI',
  project_member: 'Team',
  proposal_pi: 'Lead PI',
  proposal_collaborator: 'Collab',
  manuscript: 'Author',
  manuscript_coauthor: 'Co-author',
  publication: 'Pub',
};

const AVATAR_COLORS = ['#16a699', '#3b82f6', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#6366f1'];

const parseExpertise = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [value];
    } catch {
      return value.split(',').map(k => k.trim()).filter(Boolean);
    }
  }
  return [];
};

const avatarColor = (name) => {
  const key = (name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[key % AVATAR_COLORS.length];
};

const initials = (name) =>
  (name || '?')
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const normalizeResearcher = (r) => ({
  id: r.id,
  name: r.name || r.email,
  title: r.job_title || 'Researcher',
  dept: r.department || 'Unassigned',
  expertise: parseExpertise(r.expertise_keywords),
  orcid: r.orcid_id,
  projects: r.projects_count || 0,
  collaborations: r.collaborations_count || 0,
  publications: r.publications_count || 0,
  engagements: r.engagements || [],
  status: (r.status || 'active').toLowerCase(),
  email: r.email,
});

function ActivitySummary({ engagements, onView }) {
  if (!engagements?.length) {
    return (
      <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>
        No activity yet
      </Typography>
    );
  }

  const counts = ENGAGEMENT_GROUPS.map(g => ({
    ...g,
    count: engagements.filter(e => g.kinds.includes(e.kind)).length,
  })).filter(g => g.count > 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, minWidth: 180 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {counts.map(g => (
          <Chip
            key={g.key}
            label={`${g.count} ${g.label.split(' ')[0]}`}
            size="small"
            sx={{
              fontSize: 10,
              fontWeight: 700,
              height: 22,
              bgcolor: `${g.color}14`,
              color: g.color,
            }}
          />
        ))}
      </Box>
      <Typography
        component="button"
        onClick={onView}
        sx={{
          fontSize: 11,
          fontWeight: 600,
          color: ACCENT,
          textAlign: 'left',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          p: 0,
          '&:hover': { textDecoration: 'underline' },
        }}
      >
        View all activity
      </Typography>
    </Box>
  );
}

function ResearcherActivityDialog({ researcher, open, onClose, theme, dark }) {
  if (!researcher) return null;

  const grouped = ENGAGEMENT_GROUPS.map(g => ({
    ...g,
    items: (researcher.engagements || []).filter(e => g.kinds.includes(e.kind)),
  })).filter(g => g.items.length > 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ pr: 6 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 44, height: 44, bgcolor: avatarColor(researcher.name), fontWeight: 700 }}>
            {initials(researcher.name)}
          </Avatar>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800 }}>{researcher.name}</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              {researcher.title} · {researcher.dept}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2.5 }}>
          <Chip icon={<ProjectsIcon sx={{ fontSize: '14px !important' }} />} label={`${researcher.projects} projects`} size="small" />
          <Chip icon={<CollabIcon sx={{ fontSize: '14px !important' }} />} label={`${researcher.collaborations} collaborations`} size="small" />
          <Chip icon={<PubIcon sx={{ fontSize: '14px !important' }} />} label={`${researcher.publications} publications`} size="small" />
        </Box>

        {grouped.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: 'text.secondary', py: 3, textAlign: 'center' }}>
            No recorded projects, collaborations, or publications yet.
          </Typography>
        ) : grouped.map((group, idx) => {
          const Icon = group.icon;
          return (
            <Box key={group.key} sx={{ mb: idx < grouped.length - 1 ? 3 : 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Icon sx={{ fontSize: 18, color: group.color }} />
                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{group.label}</Typography>
                <Chip label={group.items.length} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {group.items.map(item => (
                  <Box
                    key={`${item.kind}-${item.id}-${item.role}`}
                    sx={{
                      p: 1.75,
                      borderRadius: 2,
                      border: `1px solid ${theme.palette.divider}`,
                      bgcolor: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 700, flex: 1, minWidth: 0 }}>
                        {item.title}
                      </Typography>
                      <Chip
                        label={item.role}
                        size="small"
                        sx={{
                          fontSize: 10,
                          fontWeight: 700,
                          height: 22,
                          bgcolor: `${group.color}14`,
                          color: group.color,
                        }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip label={KIND_LABELS[item.kind] || item.kind} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                      {item.status && (
                        <Chip label={item.status.replace(/_/g, ' ')} size="small" sx={{ fontSize: 10, height: 20, textTransform: 'capitalize' }} />
                      )}
                      {item.context && (
                        <Typography sx={{ fontSize: 11, color: 'text.secondary', alignSelf: 'center' }}>
                          {item.context}
                        </Typography>
                      )}
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

  useEffect(() => { init(); }, []);

  const init = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin) { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    await loadResearchers();
  };

  const loadResearchers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/research/directory');
      setResearchers((res.data || []).map(normalizeResearcher));
    } catch (e) {
      setResearchers([]);
      setError(e.response?.data?.detail || 'Failed to load researcher directory.');
    } finally {
      setLoading(false);
    }
  };

  const departments = useMemo(() => {
    const counts = {};
    researchers.forEach(r => {
      const dept = r.dept || 'Unassigned';
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [researchers]);

  const stats = useMemo(() => ({
    total: researchers.length,
    active: researchers.filter(r => r.status === 'active').length,
    pending: researchers.filter(r => r.status === 'pending').length,
    withOrcid: researchers.filter(r => r.orcid).length,
    totalProjects: researchers.reduce((sum, r) => sum + r.projects, 0),
    totalCollabs: researchers.reduce((sum, r) => sum + r.collaborations, 0),
  }), [researchers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return researchers
      .filter(r => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (deptFilter !== 'all' && r.dept !== deptFilter) return false;
        if (!q) return true;
        return [
          r.name,
          r.email,
          r.dept,
          r.title,
          ...(r.expertise || []),
          ...(r.engagements || []).map(e => e.title),
          ...(r.engagements || []).map(e => e.role),
        ].some(v => v?.toLowerCase().includes(q));
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [researchers, search, statusFilter, deptFilter]);

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const headCell = {
    fontWeight: 700,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: 'text.secondary',
    whiteSpace: 'nowrap',
    py: 1.5,
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        mb: 3.5,
        gap: 2,
        flexWrap: 'wrap',
      }}>
        <Box>
          <Typography sx={{ color: 'text.primary', fontSize: 26, fontWeight: 700, mb: 0.5 }}>
            Researcher Directory
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
            Institutional roster with live project, collaboration, and publication activity
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
          onClick={loadResearchers}
          sx={{ textTransform: 'none', borderRadius: 2 }}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        {[
          { label: 'Researchers', value: stats.total, color: ACCENT },
          { label: 'Active', value: stats.active, color: '#10b981' },
          { label: 'Projects', value: stats.totalProjects, color: '#3b82f6' },
          { label: 'Collaborations', value: stats.totalCollabs, color: '#8b5cf6' },
          { label: 'With ORCID', value: stats.withOrcid, color: '#a3c639' },
        ].map(s => (
          <Box
            key={s.label}
            sx={{
              flex: '1 1 130px',
              bgcolor: 'background.paper',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2.5,
              px: 2,
              py: 1.75,
            }}
          >
            <Typography sx={{ fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1.1 }}>
              {s.value}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600, mt: 0.35 }}>
              {s.label}
            </Typography>
          </Box>
        ))}
      </Box>

      {departments.length > 1 && (
        <Paper elevation={0} variant="outlined" sx={{ borderRadius: 2.5, p: 2, mb: 3 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 1.5 }}>
            By Department
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Chip
              label={`All (${stats.total})`}
              size="small"
              onClick={() => { setDeptFilter('all'); setPage(0); }}
              sx={{
                fontWeight: 700,
                fontSize: 11,
                bgcolor: deptFilter === 'all' ? `${ACCENT}18` : 'transparent',
                color: deptFilter === 'all' ? ACCENT : 'text.secondary',
                border: `1px solid ${deptFilter === 'all' ? ACCENT : theme.palette.divider}`,
              }}
            />
            {departments.slice(0, 8).map(({ name, count }) => (
              <Chip
                key={name}
                label={`${name} (${count})`}
                size="small"
                onClick={() => { setDeptFilter(name); setPage(0); }}
                sx={{
                  fontWeight: 600,
                  fontSize: 11,
                  bgcolor: deptFilter === name ? `${ACCENT}18` : 'transparent',
                  color: deptFilter === name ? ACCENT : 'text.secondary',
                  border: `1px solid ${deptFilter === name ? ACCENT : theme.palette.divider}`,
                }}
              />
            ))}
          </Box>
        </Paper>
      )}

      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 2,
        gap: 2,
        flexWrap: 'wrap',
      }}>
        <TextField
          size="small"
          placeholder="Search name, department, project, or collaboration…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            width: { xs: '100%', sm: 440 },
            '& .MuiOutlinedInput-root': { borderRadius: 2 },
          }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
              sx={{ borderRadius: 2, fontSize: 13 }}
            >
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

      {filtered.length === 0 ? (
        <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, textAlign: 'center', py: 8, px: 3 }}>
          <Box sx={{
            width: 64,
            height: 64,
            borderRadius: 3,
            bgcolor: `${ACCENT}12`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2,
          }}>
            <DirectoryIcon sx={{ fontSize: 32, color: ACCENT }} />
          </Box>
          <Typography sx={{ fontSize: 17, fontWeight: 700, mb: 0.75 }}>
            {researchers.length === 0 ? 'No researchers registered yet' : 'No matching researchers'}
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', maxWidth: 420, mx: 'auto' }}>
            {researchers.length === 0
              ? 'Researchers who register at your institution will appear here once their accounts are created.'
              : 'Try adjusting your search term or filters.'}
          </Typography>
        </Paper>
      ) : (
        <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
                  <TableCell sx={headCell}>Researcher</TableCell>
                  <TableCell sx={headCell}>Department</TableCell>
                  <TableCell sx={headCell}>Research Activity</TableCell>
                  <TableCell sx={headCell} align="center">Projects</TableCell>
                  <TableCell sx={headCell} align="center">Collabs</TableCell>
                  <TableCell sx={headCell}>ORCID</TableCell>
                  <TableCell sx={headCell}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginated.map(r => {
                  const sm = STATUS_META[r.status] || STATUS_META.inactive;
                  const color = avatarColor(r.name);
                  return (
                    <TableRow
                      key={r.id}
                      hover
                      sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
                      onClick={() => setSelectedResearcher(r)}
                    >
                      <TableCell sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 40, height: 40, bgcolor: color, fontSize: 14, fontWeight: 700 }}>
                            {initials(r.name)}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.3 }}>
                              {r.name}
                            </Typography>
                            <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                              {r.title}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                              <EmailIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                              <Typography sx={{ fontSize: 11, color: 'text.disabled' }} noWrap>
                                {r.email}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, maxWidth: 160 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 500 }} noWrap>
                          {r.dept}
                        </Typography>
                        {r.expertise.length > 0 && (
                          <Tooltip title={r.expertise.join(', ')}>
                            <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.25 }} noWrap>
                              {r.expertise.slice(0, 2).join(' · ')}
                            </Typography>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <ActivitySummary
                          engagements={r.engagements}
                          onView={() => setSelectedResearcher(r)}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{r.projects}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: r.collaborations ? '#8b5cf6' : 'text.secondary' }}>
                          {r.collaborations}
                        </Typography>
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        {r.orcid ? (
                          <Link
                            href={`https://orcid.org/${r.orcid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            underline="hover"
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                              fontSize: 11,
                              fontWeight: 600,
                              color: '#a3c639',
                              fontFamily: 'monospace',
                            }}
                          >
                            <OrcidBadgeIcon sx={{ fontSize: 14 }} />
                            Linked
                          </Link>
                        ) : (
                          <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={sm.label}
                          size="small"
                          sx={{
                            fontSize: 11,
                            fontWeight: 700,
                            height: 24,
                            bgcolor: sm.bg,
                            color: sm.color,
                            border: `1px solid ${sm.color}33`,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={filtered.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 15, 25, 50]}
            sx={{ borderTop: `1px solid ${theme.palette.divider}` }}
          />
        </Paper>
      )}

      <ResearcherActivityDialog
        researcher={selectedResearcher}
        open={Boolean(selectedResearcher)}
        onClose={() => setSelectedResearcher(null)}
        theme={theme}
        dark={dark}
      />
    </Box>
  );
}
