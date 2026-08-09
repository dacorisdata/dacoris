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
  Gavel as GavelIcon,
  EmojiEvents as EmojiEventsIcon,
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

const WorkItem = ({ title, meta, href, theme, dark }) => {
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
      {meta && (
        <Typography sx={{ color: 'text.secondary', fontSize: 12, mt: 0.35 }}>
          {meta}
        </Typography>
      )}
    </Box>
  );
  return href ? <Box component={Link} href={href} sx={{ textDecoration: 'none' }}>{content}</Box> : content;
};

const EmptyWork = ({ message }) => (
  <Typography sx={{ color: 'text.disabled', fontSize: 13, py: 1 }}>{message}</Typography>
);

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
  const [projects, setProjects] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [manuscripts, setManuscripts] = useState([]);
  const [ethicsApps, setEthicsApps] = useState([]);
  const [awards, setAwards] = useState([]);
  const [supervisees, setSupervisees] = useState([]);
  const [reviews, setReviews] = useState([]);

  const setField = useCallback((field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  useEffect(() => { checkAuth(); }, []);

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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'R';
  const notSet = t('researcher.profile.notSet');
  const displayKeywords = parseKeywords(user?.expertise_keywords);

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
                label={t('researcher.profile.orcid', { id: user.orcid_id })}
                size="small"
                sx={{ bgcolor: 'rgba(166,124,0,0.1)', color: '#a6a600' }}
              />
            )}
            <Chip label={t('researcher.profile.fallbackRole')} size="small" sx={{ bgcolor: 'rgba(28,167,161,0.1)', color: '#1ca7a1' }} />
          </Box>
        </Box>
      </Box>

      <Card
        overline={t('researcher.profile.overline')}
        title={t('researcher.profile.sections.activity.title')}
        subtitle={t('researcher.profile.sections.activity.subtitle')}
        theme={theme}
        dark={dark}
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <StatTile icon={ScienceIcon} label={t('researcher.profile.metrics.activeProjects')} value={metrics.activeProjects} color="#10b981" theme={theme} dark={dark} loading={metricsLoading} />
          <StatTile icon={TaskAltIcon} label={t('researcher.profile.metrics.completedProjects')} value={metrics.completedProjects} color="#0ea5e9" theme={theme} dark={dark} loading={metricsLoading} />
          <StatTile icon={FolderOpenIcon} label={t('researcher.profile.metrics.totalProjects')} value={metrics.totalProjects} color="#1ca7a1" theme={theme} dark={dark} loading={metricsLoading} />
          <StatTile icon={DescriptionIcon} label={t('researcher.profile.metrics.grantProposals')} value={metrics.proposals} color="#f59e0b" theme={theme} dark={dark} loading={metricsLoading} />
          <StatTile icon={GavelIcon} label={t('researcher.profile.metrics.ethicsApplications')} value={metrics.ethicsApps} color="#8b5cf6" theme={theme} dark={dark} loading={metricsLoading} />
          <StatTile icon={EmojiEventsIcon} label={t('researcher.profile.metrics.grantAwards')} value={metrics.awards} color="#a67c00" theme={theme} dark={dark} loading={metricsLoading} />
        </Box>
      </Card>

      <Card
        overline={t('researcher.profile.overline')}
        title={t('researcher.profile.sections.personal.title')}
        subtitle={t('researcher.profile.sections.personal.subtitle')}
        theme={theme}
        dark={dark}
      >
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
      </Card>

      <Card
        overline={t('researcher.profile.overline')}
        title={t('researcher.profile.sections.professional.title')}
        subtitle={t('researcher.profile.sections.professional.subtitle')}
        theme={theme}
        dark={dark}
      >
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
            <Typography sx={{ color: 'text.primary', fontSize: 14 }}>{user.orcid_id}</Typography>
          </Row>
        )}
      </Card>

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
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {displayKeywords.length > 0
              ? displayKeywords.map((kw) => (
                <Chip key={kw} label={kw} size="small" sx={{ bgcolor: 'rgba(28,167,161,0.1)', color: '#1ca7a1' }} />
              ))
              : <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>{t('researcher.profile.noExpertiseKeywords')}</Typography>}
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
          sx={{
            mb: 2.5,
            minHeight: 40,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 40, fontSize: 13 },
            '& .Mui-selected': { color: '#1ca7a1' },
            '& .MuiTabs-indicator': { bgcolor: '#1ca7a1' },
          }}
        >
          <Tab icon={<ScienceIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={t('researcher.profile.pastWork.tabs.research')} />
          <Tab icon={<SchoolIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={t('researcher.profile.pastWork.tabs.supervision')} />
          <Tab icon={<RateReviewIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={t('researcher.profile.pastWork.tabs.reviews')} />
        </Tabs>

        {workLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={28} /></Box>
        ) : pastWorkTab === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <FolderOpenIcon sx={{ fontSize: 18, color: '#1ca7a1' }} />
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>
                  {t('researcher.profile.pastWork.projects')} ({projects.length})
                </Typography>
              </Box>
              {projects.length === 0 ? (
                <EmptyWork message={t('researcher.profile.pastWork.emptyProjects')} />
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {projects.map((p) => (
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
              )}
            </Box>

            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <DescriptionIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>
                  {t('researcher.profile.pastWork.proposals')} ({proposals.length})
                </Typography>
              </Box>
              {proposals.length === 0 ? (
                <EmptyWork message={t('researcher.profile.pastWork.emptyProposals')} />
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {proposals.map((p) => (
                    <WorkItem
                      key={p.id}
                      title={p.title || p.proposal_title || t('researcher.profile.pastWork.untitled')}
                      meta={formatStatus(p.status)}
                      href={p.id ? `/researcher/grants/proposals/${p.id}` : undefined}
                      theme={theme}
                      dark={dark}
                    />
                  ))}
                </Box>
              )}
            </Box>

            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <MenuBookIcon sx={{ fontSize: 18, color: '#8b5cf6' }} />
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>
                  {t('researcher.profile.pastWork.manuscripts')} ({manuscripts.length})
                </Typography>
              </Box>
              {manuscripts.length === 0 ? (
                <EmptyWork message={t('researcher.profile.pastWork.emptyManuscripts')} />
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {manuscripts.map((m) => (
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
              )}
            </Box>
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
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <RateReviewIcon sx={{ fontSize: 18, color: '#f97316' }} />
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>
                {t('researcher.profile.pastWork.pastReviews')} ({reviews.length})
              </Typography>
            </Box>
            {reviews.length === 0 ? (
              <EmptyWork message={t('researcher.profile.pastWork.emptyReviews')} />
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {reviews.map((r) => {
                  const meta = [
                    formatStatus(r.review_type),
                    formatStatus(r.status),
                    r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : null,
                  ].filter(Boolean).join(' · ');
                  return (
                    <WorkItem
                      key={r.id}
                      title={r.entity_title || t('researcher.profile.pastWork.untitled')}
                      meta={meta}
                      theme={theme}
                      dark={dark}
                    />
                  );
                })}
              </Box>
            )}
          </Box>
        )}
      </Card>
    </Box>
  );
}
