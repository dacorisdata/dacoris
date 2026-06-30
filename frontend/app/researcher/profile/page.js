'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Box, Typography, TextField, Button, CircularProgress, Alert, Chip, Divider, useTheme, IconButton } from '@mui/material';
import { Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon, Person as PersonIcon, Email as EmailIcon, Business as BusinessIcon, Badge as BadgeIcon, Phone as PhoneIcon, Science as ScienceIcon, CheckCircle as CheckCircleIcon, Add as AddIcon, Close as CloseIcon, FolderOpen as FolderOpenIcon, TaskAlt as TaskAltIcon, Description as DescriptionIcon, Gavel as GavelIcon, EmojiEvents as EmojiEventsIcon } from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { researcherAPI } from '../../../lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';
const normalize = s => (s || '').toLowerCase();

const Card = ({ title, subtitle, accent = '#1ca7a1', children, theme, dark }) => (
  <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 3, border: `1px solid ${theme.palette.divider}`, boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)', mb: 3 }}>
    {title && (
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ color: accent, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', mb: 0.3 }}>Profile</Typography>
        <Typography sx={{ color: 'text.primary', fontSize: 17, fontWeight: 600 }}>{title}</Typography>
        {subtitle && <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.3 }}>{subtitle}</Typography>}
        <Divider sx={{ mt: 2 }} />
      </Box>
    )}
    {children}
  </Box>
);

const Row = ({ icon: Icon, label, value, editNode, editing, theme, dark }) => (
  <Box sx={{ display: 'flex', gap: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}`, '&:last-child': { borderBottom: 'none' } }}>
    <Box sx={{ width: 34, height: 34, borderRadius: 1.5, bgcolor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.3 }}>
      <Icon sx={{ fontSize: 17, color: 'text.secondary' }} />
    </Box>
    <Box sx={{ flex: 1 }}>
      <Typography sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>{label}</Typography>
      {editing && editNode ? editNode : <Typography sx={{ color: value ? 'text.primary' : 'text.disabled', fontSize: 14 }}>{value || 'Not set'}</Typography>}
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

export default function ResearcherProfile() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({});
  const [keywordInput, setKeywordInput] = useState('');
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [ethicsApps, setEthicsApps] = useState([]);
  const [awards, setAwards] = useState([]);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const userData = await fetchUser();
    if (!userData) { router.push('/login'); return; }
    if (userData.is_global_admin) { router.push('/global-admin/dashboard'); return; }
    if (userData.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    setUser(userData);
    initForm(userData);
    setLoading(false);
    loadMetrics();
  };

  const loadMetrics = async () => {
    setMetricsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [projectsRes, proposalsRes, ethicsRes, awardsRes] = await Promise.all([
        axios.get(`${API}/research/projects`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/grants/proposals`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/research/ethics/my`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/grants/awards`, { headers }).catch(() => ({ data: [] })),
      ]);
      setProjects(projectsRes.data || []);
      setProposals(proposalsRes.data || []);
      setEthicsApps(ethicsRes.data || []);
      setAwards(awardsRes.data || []);
    } catch {
      // metrics are non-critical; leave defaults
    } finally {
      setMetricsLoading(false);
    }
  };

  const metrics = useMemo(() => {
    const activeProjects = projects.filter(p => normalize(p.status) === 'active').length;
    const completedProjects = projects.filter(p => normalize(p.status) === 'completed').length;
    return {
      activeProjects,
      completedProjects,
      totalProjects: projects.length,
      proposals: proposals.length,
      ethicsApps: ethicsApps.length,
      awards: awards.length,
    };
  }, [projects, proposals, ethicsApps, awards]);

  const initForm = (u) => {
    let keywords = [];
    if (u.expertise_keywords) {
      try { keywords = JSON.parse(u.expertise_keywords); }
      catch { keywords = u.expertise_keywords.split(',').map(k => k.trim()).filter(Boolean); }
    }
    setForm({ name: u.name || '', department: u.department || '', job_title: u.job_title || '', phone: u.phone || '', keywords });
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const res = await researcherAPI.updateProfile({
        name: form.name, department: form.department,
        job_title: form.job_title, phone: form.phone,
        expertise_keywords: JSON.stringify(form.keywords),
      });
      setUser(res.data); initForm(res.data); await fetchUser();
      setEditing(false);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    } finally { setSaving(false); }
  };

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && !form.keywords.includes(kw)) setForm(f => ({ ...f, keywords: [...f.keywords, kw] }));
    setKeywordInput('');
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>;

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'R';

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ color: 'text.primary', fontSize: 26, fontWeight: 700, mb: 0.5 }}>My Profile</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>Manage your researcher profile and personal information</Typography>
        </Box>
        {!editing ? (
          <Button variant="contained" startIcon={<EditIcon />} onClick={() => setEditing(true)}
            sx={{ bgcolor: '#1ca7a1', textTransform: 'none', borderRadius: 2, fontWeight: 600, '&:hover': { bgcolor: '#0e7490' } }}>
            Edit Profile
          </Button>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<CancelIcon />} onClick={() => { initForm(user); setEditing(false); }}
              sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }} disabled={saving}>
              Cancel
            </Button>
            <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />} onClick={handleSave} disabled={saving}
              sx={{ bgcolor: '#1ca7a1', textTransform: 'none', borderRadius: 2, fontWeight: 600, '&:hover': { bgcolor: '#0e7490' } }}>
              Save Changes
            </Button>
          </Box>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      {/* Avatar + Name Banner */}
      <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 3, mb: 3, border: `1px solid ${theme.palette.divider}`, boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 3 }}>
        <Box sx={{ width: 72, height: 72, borderRadius: 3, background: 'linear-gradient(135deg,#1ca7a1 0%,#0e7490 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {initials}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ color: 'text.primary', fontSize: 20, fontWeight: 700 }}>{user?.name || 'Researcher'}</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 13, mb: 1 }}>{user?.job_title || 'Researcher'} {user?.department ? `· ${user.department}` : ''}</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {user?.email_verified && <Chip icon={<CheckCircleIcon />} label="Email Verified" size="small" sx={{ bgcolor: 'rgba(16,185,129,0.1)', color: '#10b981', '& .MuiChip-icon': { color: '#10b981', fontSize: 14 } }} />}
            {user?.orcid_id && <Chip label={`ORCID: ${user.orcid_id}`} size="small" sx={{ bgcolor: 'rgba(166,124,0,0.1)', color: '#a6a600' }} />}
            <Chip label="Researcher" size="small" sx={{ bgcolor: 'rgba(28,167,161,0.1)', color: '#1ca7a1' }} />
          </Box>
        </Box>
      </Box>

      {/* Research Activity & Metrics */}
      <Card title="Research Activity" subtitle="A snapshot of your projects and research output" theme={theme} dark={dark}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <StatTile icon={ScienceIcon} label="Active Projects" value={metrics.activeProjects} color="#10b981" theme={theme} dark={dark} loading={metricsLoading} />
          <StatTile icon={TaskAltIcon} label="Completed Projects" value={metrics.completedProjects} color="#0ea5e9" theme={theme} dark={dark} loading={metricsLoading} />
          <StatTile icon={FolderOpenIcon} label="Total Projects" value={metrics.totalProjects} color="#1ca7a1" theme={theme} dark={dark} loading={metricsLoading} />
          <StatTile icon={DescriptionIcon} label="Grant Proposals" value={metrics.proposals} color="#f59e0b" theme={theme} dark={dark} loading={metricsLoading} />
          <StatTile icon={GavelIcon} label="Ethics Applications" value={metrics.ethicsApps} color="#8b5cf6" theme={theme} dark={dark} loading={metricsLoading} />
          <StatTile icon={EmojiEventsIcon} label="Grant Awards" value={metrics.awards} color="#a67c00" theme={theme} dark={dark} loading={metricsLoading} />
        </Box>
      </Card>

      {/* Personal Info */}
      <Card title="Personal Information" subtitle="Your basic profile details" theme={theme} dark={dark}>
        <Row icon={PersonIcon} label="Full Name" value={user?.name} editing={editing} theme={theme} dark={dark}
          editNode={<TextField fullWidth size="small" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your full name" />} />
        <Row icon={EmailIcon} label="Email Address" value={user?.email} editing={editing} theme={theme} dark={dark} />
        <Row icon={PhoneIcon} label="Phone Number" value={user?.phone} editing={editing} theme={theme} dark={dark}
          editNode={<TextField fullWidth size="small" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 234 567 8900" />} />
      </Card>

      {/* Professional Info */}
      <Card title="Professional Details" subtitle="Your role and institutional affiliation" theme={theme} dark={dark}>
        <Row icon={BadgeIcon} label="Job Title / Position" value={user?.job_title} editing={editing} theme={theme} dark={dark}
          editNode={<TextField fullWidth size="small" value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} placeholder="e.g. Senior Researcher, PhD Candidate" />} />
        <Row icon={BusinessIcon} label="Department" value={user?.department} editing={editing} theme={theme} dark={dark}
          editNode={<TextField fullWidth size="small" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Department of Biology" />} />
        {user?.orcid_id && (
          <Row icon={ScienceIcon} label="ORCID iD" value={user.orcid_id} editing={editing} theme={theme} dark={dark} />
        )}
      </Card>

      {/* Expertise Keywords */}
      <Card title="Research Expertise" subtitle="Keywords describing your areas of research" theme={theme} dark={dark}>
        {editing ? (
          <Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                size="small" fullWidth placeholder="Add a keyword (e.g. Machine Learning)" value={keywordInput}
                onChange={e => setKeywordInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
              />
              <Button variant="contained" onClick={addKeyword} startIcon={<AddIcon />}
                sx={{ bgcolor: '#1ca7a1', textTransform: 'none', borderRadius: 2, flexShrink: 0, '&:hover': { bgcolor: '#0e7490' } }}>
                Add
              </Button>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {form.keywords.map(kw => (
                <Chip key={kw} label={kw} onDelete={() => setForm(f => ({ ...f, keywords: f.keywords.filter(k => k !== kw) }))}
                  deleteIcon={<CloseIcon />}
                  sx={{ bgcolor: 'rgba(28,167,161,0.1)', color: '#1ca7a1', '& .MuiChip-deleteIcon': { color: '#1ca7a1' } }} />
              ))}
              {form.keywords.length === 0 && <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>No keywords added yet</Typography>}
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {(() => {
              let kws = [];
              if (user?.expertise_keywords) {
                try { kws = JSON.parse(user.expertise_keywords); } catch { kws = user.expertise_keywords.split(',').map(k => k.trim()).filter(Boolean); }
              }
              return kws.length > 0
                ? kws.map(kw => <Chip key={kw} label={kw} size="small" sx={{ bgcolor: 'rgba(28,167,161,0.1)', color: '#1ca7a1' }} />)
                : <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>No expertise keywords added. Click Edit Profile to add some.</Typography>;
            })()}
          </Box>
        )}
      </Card>
    </Box>
  );
}
