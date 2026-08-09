'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import {
  Autocomplete,
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  MenuItem,
  Tab,
  Tabs,
  Pagination,
  useTheme,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  Badge as BadgeIcon,
  Phone as PhoneIcon,
  Science as ScienceIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
  Close as CloseIcon,
  FolderOpen as FolderOpenIcon,
  TaskAlt as TaskAltIcon,
  Description as DescriptionIcon,
  MenuBook as MenuBookIcon,
  School as SchoolIcon,
  RateReview as RateReviewIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { researcherAPI } from '../../../lib/api';
import pgApi from '../../../lib/postgraduateApi';
import { isSupervisorAccount } from '../../../lib/institutionTypes';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';
const RESEARCH_PAGE_SIZE = 20;
const normalize = (s) => (s || '').toLowerCase();

const EXPERTISE_SUGGESTIONS = [
  'Machine Learning',
  'Artificial Intelligence',
  'Data Science',
  'Public Health',
  'Epidemiology',
  'Climate Change',
  'Environmental Science',
  'Biotechnology',
  'Genomics',
  'Bioinformatics',
  'Infectious Diseases',
  'Clinical Research',
  'Health Systems',
  'Agriculture',
  'Food Security',
  'Renewable Energy',
  'Water Resources',
  'Education Research',
  'Social Sciences',
  'Economics',
  'Policy Analysis',
  'One Health',
  'Mental Health',
  'Nutrition',
  'Maternal and Child Health',
  'Digital Health',
  'Cybersecurity',
  'Software Engineering',
  'Materials Science',
  'Chemistry',
  'Physics',
  'Mathematics',
  'Statistics',
  'Qualitative Research',
  'Mixed Methods',
  'Implementation Science',
  'Global Health',
  'Sustainable Development',
  'Gender Studies',
  'Urban Planning',
];

const Card = ({ overline, title, subtitle, accent = '#1ca7a1', children, theme, dark }) => (
  <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 3, border: `1px solid ${theme.palette.divider}`, boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)', mb: 3 }}>
    {title && (
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ color: accent, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', mb: 0.3 }}>{overline}</Typography>
        <Typography sx={{ color: 'text.primary', fontSize: 17, fontWeight: 600 }}>{title}</Typography>
        {subtitle && <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.3 }}>{subtitle}</Typography>}
        <Divider sx={{ mt: 2 }} />
      </Box>
    )}
    {children}
  </Box>
);

const Row = ({ icon: Icon, label, children, theme, dark }) => (
  <Box sx={{ display: 'flex', gap: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}`, '&:last-child': { borderBottom: 'none' } }}>
    <Box sx={{ width: 34, height: 34, borderRadius: 1.5, bgcolor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.3 }}>
      <Icon sx={{ fontSize: 17, color: 'text.secondary' }} />
    </Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>{label}</Typography>
      {children}
    </Box>
  </Box>
);

const StatTile = ({ icon: Icon, label, value, color, theme, dark, loading }) => (
  <Box sx={{ flex: '1 1 150px', minWidth: 150, p: 2.25, borderRadius: 2.5, border: `1px solid ${theme.palette.divider}`, bgcolor: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)', display: 'flex', alignItems: 'center', gap: 1.75 }}>
    <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: `${color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon sx={{ fontSize: 22, color }} />
    </Box>
    <Box sx={{ minWidth: 0 }}>
      {loading
        ? <CircularProgress size={18} sx={{ color, my: 0.3 }} />
        : <Typography sx={{ color: 'text.primary', fontSize: 24, fontWeight: 700, lineHeight: 1.1 }}>{value}</Typography>}
      <Typography sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 600, mt: 0.3 }}>{label}</Typography>
    </Box>
  </Box>
);

const tabSx = {
  minHeight: 40,
  '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 40, fontSize: 13 },
  '& .Mui-selected': { color: '#1ca7a1' },
  '& .MuiTabs-indicator': { bgcolor: '#1ca7a1' },
};

const nestedTabSx = (dark) => ({
  mb: 2,
  minHeight: 36,
  bgcolor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
  borderRadius: 2,
  p: 0.5,
  '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 34, fontSize: 12, borderRadius: 1.5, py: 0.75, px: 2 },
  '& .Mui-selected': {
    color: '#1ca7a1',
    bgcolor: 'background.paper',
    boxShadow: dark ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
  },
  '& .MuiTabs-indicator': { display: 'none' },
});

const WorkItem = ({ title, meta, href, external, theme, dark, badge }) => {
  const content = (
    <Box
      sx={{
        py: 1.25,
        px: 1.5,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
        transition: 'background-color 0.15s',
        '&:hover': href ? { bgcolor: dark ? 'rgba(28,167,161,0.08)' : 'rgba(28,167,161,0.06)' } : undefined,
        textDecoration: 'none',
        display: 'block',
        color: 'inherit',
      }}
    >
      <Typography sx={{ color: 'text.primary', fontSize: 14, fontWeight: 600, lineHeight: 1.35 }}>
        {title}
      </Typography>
      {badge && (
        <Chip label={badge} size="small" sx={{ height: 20, fontSize: 10, mt: 0.5, alignSelf: 'flex-start' }} />
      )}
      {meta && (
        <Typography sx={{ color: 'text.secondary', fontSize: 12, mt: 0.35 }}>
          {meta}
        </Typography>
      )}
    </Box>
  );
  if (!href) return content;
  const externalHref = safeExternalHref(href);
  if (external || externalHref) {
    return (
      <Box
        component="a"
        href={externalHref || href}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ textDecoration: 'none' }}
      >
        {content}
      </Box>
    );
  }
  return <Box component={Link} href={href} sx={{ textDecoration: 'none' }}>{content}</Box>;
};

const EmptyWork = ({ message }) => (
  <Typography sx={{ color: 'text.disabled', fontSize: 13, py: 1 }}>{message}</Typography>
);

function paginateItems(items, page, pageSize = RESEARCH_PAGE_SIZE) {
  const list = Array.isArray(items) ? items : [];
  const start = page * pageSize;
  return list.slice(start, start + pageSize);
}

const ListPagination = ({ totalItems, page, onPageChange, theme }) => {
  const totalPages = Math.ceil(totalItems / RESEARCH_PAGE_SIZE);
  if (totalPages <= 1) return null;
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 2, pt: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
        {page * RESEARCH_PAGE_SIZE + 1}–{Math.min((page + 1) * RESEARCH_PAGE_SIZE, totalItems)} of {totalItems}
      </Typography>
      <Pagination
        count={totalPages}
        page={page + 1}
        onChange={(_, p) => onPageChange(p - 1)}
        size="small"
        shape="rounded"
        sx={{ '& .Mui-selected': { bgcolor: 'rgba(28,167,161,0.15) !important', color: '#1ca7a1' } }}
      />
    </Box>
  );
};

function formatOrcidWorkType(type) {
  if (!type) return '';
  return String(type).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAffiliationDate(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-').map((p) => parseInt(p, 10));
  const [year, month, day] = parts;
  if (!year) return '';
  const d = new Date(year, (month || 1) - 1, day || 1);
  if (Number.isNaN(d.getTime())) return dateStr;
  if (month && day) return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  if (month) return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  return String(year);
}

function formatAffiliationPeriod(item, presentLabel) {
  const start = formatAffiliationDate(item.start_date);
  const end = item.is_current || !item.end_date
    ? presentLabel
    : formatAffiliationDate(item.end_date);
  if (start && end) return `${start} – ${end}`;
  return start || end || '';
}

function mergeProfileKeywords(localKeywords, orcidKeywords) {
  const seen = new Set((localKeywords || []).map((k) => k.toLowerCase()));
  const merged = [...(localKeywords || [])];
  for (const kw of orcidKeywords || []) {
    const key = kw.toLowerCase();
    if (!seen.has(key)) {
      merged.push(kw);
      seen.add(key);
    }
  }
  return merged;
}

function isOrcidKeyword(keyword, orcidKeywords) {
  return (orcidKeywords || []).some((k) => k.toLowerCase() === keyword.toLowerCase());
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function safeExternalHref(url) {
  if (!url || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  return trimmed.startsWith('http') ? trimmed : undefined;
}

function safeFormatDate(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString();
  } catch {
    return null;
  }
}

const ReviewCard = ({
  headline,
  source,
  sourceColor = '#1ca7a1',
  chips = [],
  detail,
  subject,
  subjectLabel,
  href,
  theme,
  dark,
}) => {
  const inner = (
    <Box
      sx={{
        py: 1.5,
        px: 1.75,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
        transition: 'background-color 0.15s',
        '&:hover': href ? { bgcolor: dark ? 'rgba(28,167,161,0.08)' : 'rgba(28,167,161,0.06)' } : undefined,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: 1 }}>
        <Typography sx={{ color: 'text.primary', fontSize: 14, fontWeight: 600, lineHeight: 1.4, flex: 1 }}>
          {safeText(headline)}
        </Typography>
        {source && (
          <Chip
            label={source}
            size="small"
            sx={{ height: 22, fontSize: 10, fontWeight: 700, bgcolor: `${sourceColor}18`, color: sourceColor, flexShrink: 0 }}
          />
        )}
      </Box>
      {chips.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: detail || subject ? 0.75 : 0 }}>
          {chips.map((chip, idx) => (
            <Chip
              key={`${chip}-${idx}`}
              label={chip}
              size="small"
              variant="outlined"
              sx={{ height: 22, fontSize: 11, borderColor: theme.palette.divider }}
            />
          ))}
        </Box>
      )}
      {subject && (
        <Typography sx={{ color: 'text.secondary', fontSize: 12, mb: detail ? 0.5 : 0 }}>
          {subjectLabel}: {safeText(subject)}
        </Typography>
      )}
      {detail && (
        <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
          {safeText(detail)}
        </Typography>
      )}
    </Box>
  );
  const externalHref = safeExternalHref(href);
  if (externalHref) {
    return (
      <Box component="a" href={externalHref} target="_blank" rel="noopener noreferrer" sx={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
        {inner}
      </Box>
    );
  }
  if (typeof href === 'string' && href.startsWith('/')) {
    return <Box component={Link} href={href} sx={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>{inner}</Box>;
  }
  return inner;
};

const PublicationCard = ({ pub, theme, dark, untitled }) => {
  const meta = [pub.journal, pub.publication_date, formatOrcidWorkType(pub.type)].filter(Boolean).join(' · ');
  return (
    <WorkItem
      title={pub.title || untitled}
      meta={meta}
      href={pub.url || undefined}
      external
      badge={pub.doi ? 'DOI' : undefined}
      theme={theme}
      dark={dark}
    />
  );
};

const AffiliationItem = ({ item, presentLabel, theme, dark }) => {
  const title = item.role_title || item.organization || presentLabel;
  const period = formatAffiliationPeriod(item, presentLabel);
  const meta = [
    item.role_title && item.organization ? item.organization : null,
    item.department,
    item.location,
    period,
  ].filter(Boolean).join(' · ');

  const content = (
    <Box
      sx={{
        py: 1.25,
        px: 1.5,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        borderLeft: `3px solid ${item.is_current ? '#10b981' : '#1ca7a1'}`,
        bgcolor: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.35 }}>
        <Typography sx={{ color: 'text.primary', fontSize: 14, fontWeight: 600, lineHeight: 1.35 }}>
          {title}
        </Typography>
        {item.is_current && (
          <Chip label={presentLabel} size="small" sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(16,185,129,0.12)', color: '#10b981' }} />
        )}
      </Box>
      {meta && (
        <Typography sx={{ color: 'text.secondary', fontSize: 12, mt: 0.35 }}>
          {meta}
        </Typography>
      )}
    </Box>
  );

  if (item.url) {
    return (
      <Box component="a" href={item.url} target="_blank" rel="noopener noreferrer" sx={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
        {content}
      </Box>
    );
  }
  return content;
};

function parseKeywords(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return String(raw).split(',').map((k) => k.trim()).filter(Boolean);
  }
}

function formatStatus(status) {
  if (!status) return '';
  return String(status).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function orcidProfileUrl(orcidId) {
  const id = (orcidId || '').replace(/^https?:\/\/(sandbox\.)?orcid\.org\//, '');
  return id ? `https://orcid.org/${id}` : '';
}

function ScopusIcon({ size = 16, sx }) {
  return (
    <Box
      component="img"
      src="/icons/scopus.svg"
      alt=""
      sx={{ width: size, height: size, display: 'block', flexShrink: 0, ...sx }}
    />
  );
}

function OrcidIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="128" cy="128" r="128" fill="#A6CE39" />
      <path d="M86.3 186.2H70.9V79.1h15.4v107.1zM108.9 79.1h41.6c39.6 0 57 28.3 57 53.6 0 27.5-21.5 53.6-56.8 53.6h-41.8V79.1zm15.4 93.3h24.5c34.9 0 42.9-26.5 42.9-39.7C191.7 111.2 178 93 148 93h-23.7v79.4zM88.7 56.8c0 5.5-4.5 9.9-10 9.9s-10-4.4-10-9.9c0-5.5 4.5-9.9 10-9.9s10 4.4 10 9.9z" fill="#fff" />
    </svg>
  );
}

export default function ResearcherProfile() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const { t } = useLanguage();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    name: '',
    department: '',
    job_title: '',
    phone: '',
    keywords: [],
  });
  const [keywordInput, setKeywordInput] = useState('');
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [workLoading, setWorkLoading] = useState(true);
  const [pastWorkTab, setPastWorkTab] = useState(0);
  const [researchSubTab, setResearchSubTab] = useState(0);
  const [researchPage, setResearchPage] = useState(0);
  const [projects, setProjects] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [manuscripts, setManuscripts] = useState([]);
  const [ethicsApps, setEthicsApps] = useState([]);
  const [awards, setAwards] = useState([]);
  const [supervisees, setSupervisees] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [orcidPublications, setOrcidPublications] = useState([]);
  const [orcidPeerReviews, setOrcidPeerReviews] = useState([]);
  const [scopusProfile, setScopusProfile] = useState(null);
  const [orcidEmployments, setOrcidEmployments] = useState([]);
  const [orcidEducations, setOrcidEducations] = useState([]);
  const [orcidKeywords, setOrcidKeywords] = useState([]);
  const [orcidLoading, setOrcidLoading] = useState(false);

  const setField = useCallback((field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  useEffect(() => { checkAuth(); }, []);

  useEffect(() => {
    setResearchPage(0);
  }, [researchSubTab]);

  const checkAuth = async () => {
    const userData = await fetchUser();
    if (!userData) { router.push('/login'); return; }
    if (userData.is_global_admin) { router.push('/global-admin/dashboard'); return; }
    if (userData.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    setUser(userData);
    initForm(userData);
    setLoading(false);
    loadDepartments(userData);
    loadMetricsAndWork(userData);
  };

  const loadDepartments = async (userData) => {
    const institutionId = userData?.institution_id || userData?.primary_institution_id;
    if (!institutionId) return;
    setDepartmentsLoading(true);
    try {
      const res = await axios.get(`${API}/registration/departments`, {
        params: { institution_id: institutionId },
      });
      const list = (res.data?.departments || []).map((d) => (typeof d === 'string' ? d : d.name)).filter(Boolean);
      setDepartments(list);
    } catch {
      const domain = (userData?.email || '').split('@')[1];
      if (!domain) return;
      try {
        const res = await axios.get(`${API}/registration/departments/${domain}`);
        setDepartments(res.data?.departments || []);
      } catch {
        setDepartments([]);
      }
    } finally {
      setDepartmentsLoading(false);
    }
  };

  const loadMetricsAndWork = async (userData) => {
    setMetricsLoading(true);
    setWorkLoading(true);
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    const safeGet = (url) => axios.get(url, { headers }).catch(() => ({ data: null }));

    try {
      const [
        projectsRes,
        proposalsRes,
        ethicsRes,
        awardsRes,
        manuscriptsRes,
        reviewsRes,
      ] = await Promise.all([
        safeGet(`${API}/research/projects`),
        safeGet(`${API}/grants/proposals`),
        safeGet(`${API}/research/ethics/my`),
        safeGet(`${API}/grants/awards`),
        safeGet(`${API}/manuscripts`),
        safeGet(`${API}/reviewer/assignments/my`),
      ]);

      setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
      setProposals(Array.isArray(proposalsRes.data) ? proposalsRes.data : []);
      setEthicsApps(Array.isArray(ethicsRes.data) ? ethicsRes.data : []);
      setAwards(Array.isArray(awardsRes.data) ? awardsRes.data : []);
      setManuscripts(Array.isArray(manuscriptsRes.data) ? manuscriptsRes.data : []);
      setReviews(Array.isArray(reviewsRes.data) ? reviewsRes.data : []);

      if (userData?.orcid_id) {
        setOrcidLoading(true);
        try {
          const orcidRes = await researcherAPI.getOrcidActivities();
          setOrcidPublications(asArray(orcidRes.data?.publications));
          setOrcidPeerReviews(asArray(orcidRes.data?.peer_reviews));
          setScopusProfile(orcidRes.data?.scopus || null);
          setOrcidEmployments(asArray(orcidRes.data?.employments));
          setOrcidEducations(asArray(orcidRes.data?.educations));
          setOrcidKeywords(asArray(orcidRes.data?.keywords));
        } catch {
          setOrcidPublications([]);
          setOrcidPeerReviews([]);
          setScopusProfile(null);
          setOrcidEmployments([]);
          setOrcidEducations([]);
          setOrcidKeywords([]);
        } finally {
          setOrcidLoading(false);
        }
      } else {
        setOrcidPublications([]);
        setOrcidPeerReviews([]);
        setScopusProfile(null);
        setOrcidEmployments([]);
        setOrcidEducations([]);
        setOrcidKeywords([]);
        setOrcidLoading(false);
      }

      if (isSupervisorAccount(userData) || userData?.primary_account_type === 'RESEARCHER') {
        try {
          const studentsRes = await pgApi.supervisorStudents();
          setSupervisees(studentsRes.data?.students || []);
        } catch {
          try {
            const dash = await pgApi.supervisorDashboard();
            setSupervisees(dash.data?.assigned_students || []);
          } catch {
            setSupervisees([]);
          }
        }
      }
    } finally {
      setMetricsLoading(false);
      setWorkLoading(false);
    }
  };

  const metrics = useMemo(() => {
    const activeProjects = projects.filter((p) => normalize(p.status) === 'active').length;
    const completedProjects = projects.filter((p) => normalize(p.status) === 'completed').length;
    return {
      activeProjects,
      completedProjects,
      totalProjects: projects.length,
      proposals: proposals.length,
      ethicsApps: ethicsApps.length,
      awards: awards.length,
    };
  }, [projects, proposals, ethicsApps, awards]);

  const expertiseOptions = useMemo(() => {
    const selected = new Set((form.keywords || []).map((k) => k.toLowerCase()));
    return EXPERTISE_SUGGESTIONS.filter((s) => !selected.has(s.toLowerCase()));
  }, [form.keywords]);

  const initForm = (u) => {
    setForm({
      name: u.name || '',
      department: u.department || '',
      job_title: u.job_title || '',
      phone: u.phone || '',
      keywords: parseKeywords(u.expertise_keywords),
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await researcherAPI.updateProfile({
        name: form.name,
        department: form.department,
        job_title: form.job_title,
        phone: form.phone,
        expertise_keywords: JSON.stringify(form.keywords),
      });
      setUser(res.data);
      initForm(res.data);
      await fetchUser();
      setEditing(false);
      setSuccess(t('researcher.profile.successUpdate'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || t('researcher.profile.errorUpdate'));
    } finally {
      setSaving(false);
    }
  };

  const addKeyword = (raw) => {
    const kw = (raw ?? keywordInput).trim();
    if (!kw) return;
    setForm((f) => (f.keywords.includes(kw) ? f : { ...f, keywords: [...f.keywords, kw] }));
    setKeywordInput('');
  };

  const departmentOptions = useMemo(() => {
    const set = new Set(departments);
    if (form.department && !set.has(form.department)) set.add(form.department);
    return Array.from(set);
  }, [departments, form.department]);

  const profileKeywords = useMemo(() => parseKeywords(user?.expertise_keywords), [user?.expertise_keywords]);
  const allDisplayKeywords = useMemo(
    () => mergeProfileKeywords(profileKeywords, orcidKeywords),
    [profileKeywords, orcidKeywords],
  );
  const dacorisReviews = useMemo(() => asArray(reviews), [reviews]);
  const orcidReviews = useMemo(() => asArray(orcidPeerReviews), [orcidPeerReviews]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'R';
  const notSet = t('researcher.profile.notSet');
  const presentLabel = t('researcher.profile.orcidAffiliations.present');
  const hasOrcidAffiliations = orcidEmployments.length > 0 || orcidEducations.length > 0;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, width: '100%' }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ color: 'text.primary', fontSize: 26, fontWeight: 700, mb: 0.5 }}>{t('researcher.profile.title')}</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>{t('researcher.profile.subtitle')}</Typography>
        </Box>
        {!editing ? (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => setEditing(true)}
            sx={{ bgcolor: '#1ca7a1', textTransform: 'none', borderRadius: 2, fontWeight: 600, '&:hover': { bgcolor: '#0e7490' } }}
          >
            {t('researcher.profile.editProfile')}
          </Button>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={() => { initForm(user); setEditing(false); setKeywordInput(''); }}
              sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
              disabled={saving}
            >
              {t('researcher.profile.cancel')}
            </Button>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{ bgcolor: '#1ca7a1', textTransform: 'none', borderRadius: 2, fontWeight: 600, '&:hover': { bgcolor: '#0e7490' } }}
            >
              {t('researcher.profile.saveChanges')}
            </Button>
          </Box>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 3, mb: 3, border: `1px solid ${theme.palette.divider}`, boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 3 }}>
        <Box sx={{ width: 72, height: 72, borderRadius: 3, background: 'linear-gradient(135deg,#1ca7a1 0%,#0e7490 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {initials}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ color: 'text.primary', fontSize: 20, fontWeight: 700 }}>{user?.name || t('researcher.profile.fallbackName')}</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 13, mb: 1 }}>
            {user?.job_title || t('researcher.profile.fallbackRole')}{user?.department ? ` · ${user.department}` : ''}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {user?.email_verified && (
              <Chip
                icon={<CheckCircleIcon />}
                label={t('researcher.profile.emailVerified')}
                size="small"
                sx={{ bgcolor: 'rgba(16,185,129,0.1)', color: '#10b981', '& .MuiChip-icon': { color: '#10b981', fontSize: 14 } }}
              />
            )}
            {user?.orcid_id && (
              <Chip
                component="a"
                href={orcidProfileUrl(user.orcid_id)}
                target="_blank"
                rel="noopener noreferrer"
                clickable
                icon={<OrcidIcon size={14} />}
                label={t('researcher.profile.orcid', { id: user.orcid_id })}
                size="small"
                sx={{
                  bgcolor: 'rgba(166,124,0,0.1)',
                  color: '#a6a600',
                  textDecoration: 'none',
                  '& .MuiChip-icon': { ml: 0.75 },
                }}
              />
            )}
            {scopusProfile?.author_id && (
              <Chip
                component="a"
                href={scopusProfile.url}
                target="_blank"
                rel="noopener noreferrer"
                clickable
                icon={<ScopusIcon size={14} />}
                label={t('researcher.profile.scopus', { id: scopusProfile.author_id })}
                size="small"
                sx={{
                  bgcolor: 'rgba(233,113,28,0.12)',
                  color: '#c45f10',
                  textDecoration: 'none',
                  '& .MuiChip-icon': { ml: 0.75 },
                }}
              />
            )}
            <Chip label={t('researcher.profile.fallbackRole')} size="small" sx={{ bgcolor: 'rgba(28,167,161,0.1)', color: '#1ca7a1' }} />
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, mb: 0 }}>
      <Card
        overline={t('researcher.profile.overline')}
        title={t('researcher.profile.sections.activity.title')}
        subtitle={t('researcher.profile.sections.activity.subtitle')}
        theme={theme}
        dark={dark}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 1.5 }}>
          <StatTile icon={ScienceIcon} label={t('researcher.profile.metrics.activeProjects')} value={metrics.activeProjects} color="#10b981" theme={theme} dark={dark} loading={metricsLoading} />
          <StatTile icon={TaskAltIcon} label={t('researcher.profile.metrics.completedProjects')} value={metrics.completedProjects} color="#0ea5e9" theme={theme} dark={dark} loading={metricsLoading} />
          <StatTile icon={FolderOpenIcon} label={t('researcher.profile.metrics.totalProjects')} value={metrics.totalProjects} color="#1ca7a1" theme={theme} dark={dark} loading={metricsLoading} />
          <StatTile icon={MenuBookIcon} label={t('researcher.profile.pastWork.publications')} value={orcidPublications.length} color="#0ea5e9" theme={theme} dark={dark} loading={metricsLoading || orcidLoading} />
          <StatTile icon={DescriptionIcon} label={t('researcher.profile.metrics.grantProposals')} value={metrics.proposals} color="#f59e0b" theme={theme} dark={dark} loading={metricsLoading} />
          <StatTile icon={RateReviewIcon} label={t('researcher.profile.pastWork.tabs.reviews')} value={dacorisReviews.length + orcidReviews.length} color="#f97316" theme={theme} dark={dark} loading={metricsLoading || orcidLoading} />
        </Box>
      </Card>

      <Card
        overline={t('researcher.profile.overline')}
        title={t('researcher.profile.sections.profileDetails.title')}
        subtitle={t('researcher.profile.sections.profileDetails.subtitle')}
        theme={theme}
        dark={dark}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 0, md: 2 } }}>
          <Box>
            <Row icon={PersonIcon} label={t('researcher.profile.fields.fullName')} theme={theme} dark={dark}>
              {editing ? (
                <TextField
                  fullWidth
                  size="small"
                  value={form.name}
                  onChange={setField('name')}
                  placeholder={t('researcher.profile.placeholders.fullName')}
                  inputProps={{ 'aria-label': t('researcher.profile.fields.fullName') }}
                />
              ) : (
                <Typography sx={{ color: user?.name ? 'text.primary' : 'text.disabled', fontSize: 14 }}>{user?.name || notSet}</Typography>
              )}
            </Row>
            <Row icon={EmailIcon} label={t('researcher.profile.fields.emailAddress')} theme={theme} dark={dark}>
              <Typography sx={{ color: user?.email ? 'text.primary' : 'text.disabled', fontSize: 14 }}>{user?.email || notSet}</Typography>
            </Row>
            <Row icon={PhoneIcon} label={t('researcher.profile.fields.phoneNumber')} theme={theme} dark={dark}>
              {editing ? (
                <TextField
                  fullWidth
                  size="small"
                  value={form.phone}
                  onChange={setField('phone')}
                  placeholder={t('researcher.profile.placeholders.phone')}
                  inputProps={{ 'aria-label': t('researcher.profile.fields.phoneNumber') }}
                />
              ) : (
                <Typography sx={{ color: user?.phone ? 'text.primary' : 'text.disabled', fontSize: 14 }}>{user?.phone || notSet}</Typography>
              )}
            </Row>
          </Box>
          <Box>
            <Row icon={BadgeIcon} label={t('researcher.profile.fields.jobTitle')} theme={theme} dark={dark}>
              {editing ? (
                <TextField
                  fullWidth
                  size="small"
                  value={form.job_title}
                  onChange={setField('job_title')}
                  placeholder={t('researcher.profile.placeholders.jobTitle')}
                  inputProps={{ 'aria-label': t('researcher.profile.fields.jobTitle') }}
                />
              ) : (
                <Typography sx={{ color: user?.job_title ? 'text.primary' : 'text.disabled', fontSize: 14 }}>{user?.job_title || notSet}</Typography>
              )}
            </Row>
            <Row icon={BusinessIcon} label={t('researcher.profile.fields.department')} theme={theme} dark={dark}>
              {editing ? (
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={form.department || ''}
                  onChange={setField('department')}
                  disabled={departmentsLoading}
                  helperText={departmentsLoading ? t('researcher.profile.placeholders.loadingDepartments') : undefined}
                  inputProps={{ 'aria-label': t('researcher.profile.fields.department') }}
                >
                  <MenuItem value="">
                    <em>{t('researcher.profile.placeholders.selectDepartment')}</em>
                  </MenuItem>
                  {departmentOptions.map((dept) => (
                    <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                  ))}
                </TextField>
              ) : (
                <Typography sx={{ color: user?.department ? 'text.primary' : 'text.disabled', fontSize: 14 }}>{user?.department || notSet}</Typography>
              )}
            </Row>
            {user?.orcid_id && (
              <Row icon={ScienceIcon} label={t('researcher.profile.fields.orcidId')} theme={theme} dark={dark}>
                <Typography
                  component="a"
                  href={orcidProfileUrl(user.orcid_id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ color: '#1ca7a1', fontSize: 14, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  {user.orcid_id}
                </Typography>
              </Row>
            )}
            {scopusProfile?.author_id && (
              <Row icon={ScopusIcon} label={t('researcher.profile.fields.scopusId')} theme={theme} dark={dark}>
                <Box
                  component="a"
                  href={scopusProfile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1,
                    color: '#c45f10',
                    fontSize: 14,
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  <ScopusIcon size={18} />
                  {scopusProfile.author_id}
                </Box>
              </Row>
            )}
          </Box>
        </Box>
      </Card>
      </Box>

      {(user?.orcid_id && (orcidLoading || hasOrcidAffiliations)) && (
        <Card
          overline={t('researcher.profile.overline')}
          title={t('researcher.profile.sections.orcidAffiliations.title')}
          subtitle={t('researcher.profile.sections.orcidAffiliations.subtitle')}
          theme={theme}
          dark={dark}
        >
          {orcidLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={28} /></Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <BusinessIcon sx={{ fontSize: 18, color: '#1ca7a1' }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>
                    {t('researcher.profile.orcidAffiliations.work')} ({orcidEmployments.length})
                  </Typography>
                  <Chip label={t('researcher.profile.pastWork.viaOrcid')} size="small" sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(166,124,0,0.1)', color: '#a67c00' }} />
                </Box>
                {orcidEmployments.length === 0 ? (
                  <EmptyWork message={t('researcher.profile.orcidAffiliations.emptyWork')} />
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {orcidEmployments.map((item) => (
                      <AffiliationItem
                        key={item.put_code || `${item.organization}-${item.start_date}`}
                        item={item}
                        presentLabel={presentLabel}
                        theme={theme}
                        dark={dark}
                      />
                    ))}
                  </Box>
                )}
              </Box>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <SchoolIcon sx={{ fontSize: 18, color: '#0ea5e9' }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>
                    {t('researcher.profile.orcidAffiliations.education')} ({orcidEducations.length})
                  </Typography>
                  <Chip label={t('researcher.profile.pastWork.viaOrcid')} size="small" sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(166,124,0,0.1)', color: '#a67c00' }} />
                </Box>
                {orcidEducations.length === 0 ? (
                  <EmptyWork message={t('researcher.profile.orcidAffiliations.emptyEducation')} />
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {orcidEducations.map((item) => (
                      <AffiliationItem
                        key={item.put_code || `${item.organization}-${item.start_date}`}
                        item={item}
                        presentLabel={presentLabel}
                        theme={theme}
                        dark={dark}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Card>
      )}

      <Card
        overline={t('researcher.profile.overline')}
        title={t('researcher.profile.sections.expertise.title')}
        subtitle={t('researcher.profile.sections.expertise.subtitle')}
        theme={theme}
        dark={dark}
      >
        {editing ? (
          <Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'flex-start' }}>
              <Autocomplete
                freeSolo
                fullWidth
                options={expertiseOptions}
                inputValue={keywordInput}
                onInputChange={(_, value) => setKeywordInput(value)}
                onChange={(_, value) => {
                  if (typeof value === 'string' && value.trim()) addKeyword(value);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    placeholder={t('researcher.profile.placeholders.keyword')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addKeyword();
                      }
                    }}
                  />
                )}
              />
              <Button
                variant="contained"
                onClick={() => addKeyword()}
                startIcon={<AddIcon />}
                sx={{ bgcolor: '#1ca7a1', textTransform: 'none', borderRadius: 2, flexShrink: 0, '&:hover': { bgcolor: '#0e7490' } }}
              >
                {t('researcher.profile.add')}
              </Button>
            </Box>
            <Typography sx={{ color: 'text.secondary', fontSize: 12, mb: 1.5 }}>
              {t('researcher.profile.expertiseHint')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {expertiseOptions.slice(0, 12).map((suggestion) => (
                <Chip
                  key={suggestion}
                  label={suggestion}
                  size="small"
                  onClick={() => addKeyword(suggestion)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    color: 'text.secondary',
                    '&:hover': { bgcolor: 'rgba(28,167,161,0.15)', color: '#1ca7a1' },
                  }}
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {form.keywords.map((kw) => (
                <Chip
                  key={kw}
                  label={kw}
                  onDelete={() => setForm((f) => ({ ...f, keywords: f.keywords.filter((k) => k !== kw) }))}
                  deleteIcon={<CloseIcon />}
                  sx={{ bgcolor: 'rgba(28,167,161,0.1)', color: '#1ca7a1', '& .MuiChip-deleteIcon': { color: '#1ca7a1' } }}
                />
              ))}
              {form.keywords.length === 0 && (
                <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>{t('researcher.profile.noKeywordsYet')}</Typography>
              )}
            </Box>
            {orcidKeywords.length > 0 && (
              <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                <Typography sx={{ color: 'text.secondary', fontSize: 12, mb: 1 }}>
                  {t('researcher.profile.orcidKeywordsHint')}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {orcidKeywords.map((kw) => (
                    <Chip
                      key={kw}
                      label={kw}
                      size="small"
                      sx={{ bgcolor: 'rgba(166,124,0,0.1)', color: '#a67c00' }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        ) : (
          <Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {allDisplayKeywords.length > 0
                ? allDisplayKeywords.map((kw) => {
                  const fromOrcid = isOrcidKeyword(kw, orcidKeywords);
                  return (
                    <Chip
                      key={kw}
                      label={kw}
                      size="small"
                      sx={fromOrcid
                        ? { bgcolor: 'rgba(166,124,0,0.1)', color: '#a67c00' }
                        : { bgcolor: 'rgba(28,167,161,0.1)', color: '#1ca7a1' }}
                    />
                  );
                })
                : <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>{t('researcher.profile.noExpertiseKeywords')}</Typography>}
            </Box>
            {orcidKeywords.length > 0 && (
              <Typography sx={{ color: 'text.secondary', fontSize: 12, mt: 1.5 }}>
                {t('researcher.profile.orcidKeywordsLegend')}
              </Typography>
            )}
          </Box>
        )}
      </Card>

      <Card
        overline={t('researcher.profile.overline')}
        title={t('researcher.profile.sections.pastWork.title')}
        subtitle={t('researcher.profile.sections.pastWork.subtitle')}
        theme={theme}
        dark={dark}
      >
        <Tabs
          value={pastWorkTab}
          onChange={(_, v) => setPastWorkTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ ...tabSx, mb: 2.5 }}
        >
          <Tab icon={<ScienceIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={t('researcher.profile.pastWork.tabs.research')} />
          <Tab icon={<SchoolIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={t('researcher.profile.pastWork.tabs.supervision')} />
          <Tab icon={<RateReviewIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={t('researcher.profile.pastWork.tabs.reviews')} />
        </Tabs>

        {workLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={28} /></Box>
        ) : pastWorkTab === 0 ? (
          <Box>
            <Tabs
              value={researchSubTab}
              onChange={(_, v) => setResearchSubTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={nestedTabSx(dark)}
            >
              <Tab label={`${t('researcher.profile.pastWork.publications')} (${orcidPublications.length})`} />
              <Tab label={`${t('researcher.profile.pastWork.manuscripts')} (${manuscripts.length})`} />
              <Tab label={`${t('researcher.profile.pastWork.projects')} (${projects.length})`} />
            </Tabs>

            {researchSubTab === 0 && (
              <>
                {user?.orcid_id && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Chip
                      label={t('researcher.profile.pastWork.viaOrcid')}
                      size="small"
                      sx={{ height: 22, fontSize: 11, bgcolor: 'rgba(166,124,0,0.1)', color: '#a67c00' }}
                    />
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {t('researcher.profile.pastWork.publicationsHint')}
                    </Typography>
                  </Box>
                )}
                {orcidLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={22} /></Box>
                ) : !user?.orcid_id ? (
                  <EmptyWork message={t('researcher.profile.pastWork.noOrcidLinked')} />
                ) : orcidPublications.length === 0 ? (
                  <EmptyWork message={t('researcher.profile.pastWork.emptyPublications')} />
                ) : (
                  <>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {paginateItems(orcidPublications, researchPage).map((pub) => (
                        <PublicationCard
                          key={pub.put_code || pub.title}
                          pub={pub}
                          theme={theme}
                          dark={dark}
                          untitled={t('researcher.profile.pastWork.untitled')}
                        />
                      ))}
                    </Box>
                    <ListPagination
                      totalItems={orcidPublications.length}
                      page={researchPage}
                      onPageChange={setResearchPage}
                      theme={theme}
                    />
                  </>
                )}
              </>
            )}

            {researchSubTab === 1 && (
              manuscripts.length === 0 ? (
                <EmptyWork message={t('researcher.profile.pastWork.emptyManuscripts')} />
              ) : (
                <>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {paginateItems(manuscripts, researchPage).map((m) => (
                      <WorkItem
                        key={m.id}
                        title={m.title || t('researcher.profile.pastWork.untitled')}
                        meta={formatStatus(m.status)}
                        href={m.id ? `/researcher/manuscripts/${m.id}/editor` : '/researcher/manuscripts'}
                        theme={theme}
                        dark={dark}
                      />
                    ))}
                  </Box>
                  <ListPagination
                    totalItems={manuscripts.length}
                    page={researchPage}
                    onPageChange={setResearchPage}
                    theme={theme}
                  />
                </>
              )
            )}

            {researchSubTab === 2 && (
              projects.length === 0 ? (
                <EmptyWork message={t('researcher.profile.pastWork.emptyProjects')} />
              ) : (
                <>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {paginateItems(projects, researchPage).map((p) => (
                      <WorkItem
                        key={p.id}
                        title={p.title || p.short_title || t('researcher.profile.pastWork.untitled')}
                        meta={formatStatus(p.status)}
                        href={p.id ? `/researcher/projects/${p.id}` : undefined}
                        theme={theme}
                        dark={dark}
                      />
                    ))}
                  </Box>
                  <ListPagination
                    totalItems={projects.length}
                    page={researchPage}
                    onPageChange={setResearchPage}
                    theme={theme}
                  />
                </>
              )
            )}
          </Box>
        ) : pastWorkTab === 1 ? (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <SchoolIcon sx={{ fontSize: 18, color: '#0ea5e9' }} />
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>
                {t('researcher.profile.pastWork.supervisees')} ({supervisees.length})
              </Typography>
            </Box>
            {supervisees.length === 0 ? (
              <EmptyWork message={t('researcher.profile.pastWork.emptySupervision')} />
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {supervisees.map((s) => {
                  const id = s.student_id || s.id;
                  const name = s.full_name || s.name || s.student_name || id || t('researcher.profile.pastWork.untitled');
                  const meta = [s.programme || s.program, s.department, s.overall_status || s.status]
                    .filter(Boolean)
                    .map(formatStatus)
                    .join(' · ');
                  return (
                    <WorkItem
                      key={id || name}
                      title={name}
                      meta={meta}
                      href={id ? `/researcher/postgraduate/supervisor/students/${id}` : '/researcher/postgraduate/supervisor'}
                      theme={theme}
                      dark={dark}
                    />
                  );
                })}
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(dacorisReviews.length > 0 || orcidReviews.length > 0) ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {dacorisReviews.map((r, idx) => {
                  if (!r || typeof r !== 'object') return null;
                  const submitted = safeFormatDate(r.submitted_at);
                  const assigned = safeFormatDate(r.assigned_at);
                  const dateLabel = submitted
                    ? t('researcher.profile.pastWork.submittedOn', { date: submitted })
                    : assigned
                      ? t('researcher.profile.pastWork.assignedOn', { date: assigned })
                      : null;
                  const chips = [
                    r.review_type ? formatStatus(r.review_type) : null,
                    r.status ? formatStatus(r.status) : null,
                  ].filter(Boolean);
                  return (
                    <ReviewCard
                      key={r.id || `dacoris-review-${idx}`}
                      headline={t('researcher.profile.pastWork.reviewOf', { title: safeText(r.entity_title, t('researcher.profile.pastWork.untitled')) })}
                      source={t('researcher.profile.pastWork.sourceDacoris')}
                      sourceColor="#1ca7a1"
                      chips={chips}
                      detail={dateLabel}
                      theme={theme}
                      dark={dark}
                    />
                  );
                })}
                {orcidReviews.map((r, idx) => {
                  if (!r || typeof r !== 'object') return null;
                  const venue = safeText(r.venue || r.organization);
                  const headline = venue
                    ? t('researcher.profile.pastWork.reviewActivityFor', { venue })
                    : t('researcher.profile.pastWork.peerReview');
                  const chips = [
                    r.role ? formatStatus(r.role) : null,
                    r.review_type ? formatStatus(r.review_type) : null,
                  ].filter(Boolean);
                  const detailParts = [
                    r.completion_date ? t('researcher.profile.pastWork.completedOn', { date: safeText(r.completion_date) }) : null,
                    r.organization && safeText(r.organization) !== venue ? safeText(r.organization) : null,
                  ].filter(Boolean);
                  return (
                    <ReviewCard
                      key={r.put_code || `orcid-review-${idx}`}
                      headline={headline}
                      source={t('researcher.profile.pastWork.viaOrcid')}
                      sourceColor="#a67c00"
                      chips={chips}
                      subject={r.subject_title ? safeText(r.subject_title) : undefined}
                      subjectLabel={t('researcher.profile.pastWork.reviewSubject')}
                      detail={detailParts.join(' · ')}
                      href={safeExternalHref(r.url)}
                      theme={theme}
                      dark={dark}
                    />
                  );
                })}
              </Box>
            ) : orcidLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={22} /></Box>
            ) : (
              <EmptyWork message={t('researcher.profile.pastWork.emptyReviews')} />
            )}
          </Box>
        )}
      </Card>
    </Box>
  );
}
