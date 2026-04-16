'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, TextField, Button, CircularProgress, Alert, Chip, Divider, useTheme, IconButton } from '@mui/material';
import { Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon, Person as PersonIcon, Email as EmailIcon, Business as BusinessIcon, Badge as BadgeIcon, Phone as PhoneIcon, CheckCircle as CheckCircleIcon, Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { researcherAPI } from '../../../lib/api';

const ROLE_LABELS = {
  GRANT_MANAGER: 'Grant Manager', FINANCE_OFFICER: 'Finance Officer',
  ETHICS_COMMITTEE_MEMBER: 'Ethics Committee Member', DATA_STEWARD: 'Data Steward',
  DATA_ENGINEER: 'Data Engineer', INSTITUTIONAL_LEADERSHIP: 'Institutional Lead',
  EXTERNAL_REVIEWER: 'External Reviewer', ADMIN_STAFF: 'Admin Staff',
  GUEST_COLLABORATOR: 'Guest Collaborator', EXTERNAL_FUNDER: 'External Funder',
};

const ROLE_COLORS = {
  GRANT_MANAGER: '#8b5cf6', FINANCE_OFFICER: '#f59e0b',
  ETHICS_COMMITTEE_MEMBER: '#10b981', DATA_STEWARD: '#0ea5e9',
  DATA_ENGINEER: '#06b6d4', INSTITUTIONAL_LEADERSHIP: '#ef4444',
  EXTERNAL_REVIEWER: '#f97316', ADMIN_STAFF: '#6366f1',
  GUEST_COLLABORATOR: '#64748b', EXTERNAL_FUNDER: '#a855f7',
};

export default function AdminStaffProfile() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm]       = useState({});
  const [kwInput, setKwInput] = useState('');

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (u.is_global_admin)      { router.push('/global-admin/dashboard'); return; }
    if (u.is_institution_admin) { router.push('/institution-admin/dashboard'); return; }
    if (u.primary_account_type === 'RESEARCHER') { router.push('/researcher/dashboard'); return; }
    setUser(u); initForm(u); setLoading(false);
  };

  const initForm = (u) => {
    let kws = [];
    if (u.expertise_keywords) {
      try { kws = JSON.parse(u.expertise_keywords); }
      catch { kws = u.expertise_keywords.split(',').map(k => k.trim()).filter(Boolean); }
    }
    setForm({ name: u.name || '', department: u.department || '', job_title: u.job_title || '', phone: u.phone || '', keywords: kws });
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
      setEditing(false); setSuccess('Profile updated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setError(e.response?.data?.detail || 'Failed to save profile'); }
    finally { setSaving(false); }
  };

  const addKw = () => {
    const kw = kwInput.trim();
    if (kw && !form.keywords.includes(kw)) setForm(f => ({ ...f, keywords: [...f.keywords, kw] }));
    setKwInput('');
  };

  const Card = ({ title, accent, children }) => (
    <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 3, border: `1px solid ${theme.palette.divider}`, boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)', mb: 3 }}>
      {title && <>
        <Typography sx={{ color: accent || 'text.secondary', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', mb: 0.3 }}>Profile</Typography>
        <Typography sx={{ color: 'text.primary', fontSize: 17, fontWeight: 600, mb: 2 }}>{title}</Typography>
        <Divider sx={{ mb: 2 }} />
      </>}
      {children}
    </Box>
  );

  const Row = ({ icon: Icon, label, value, editNode }) => (
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

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>;

  const role    = user?.primary_account_type || 'ADMIN_STAFF';
  const accent  = ROLE_COLORS[role] || '#6366f1';
  const roleLabel = ROLE_LABELS[role] || 'Staff Member';
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'AS';

  let kws = [];
  if (user?.expertise_keywords) {
    try { kws = JSON.parse(user.expertise_keywords); }
    catch { kws = user.expertise_keywords.split(',').map(k => k.trim()).filter(Boolean); }
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 860, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ color: 'text.primary', fontSize: 26, fontWeight: 700, mb: 0.5 }}>My Profile</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>Manage your staff profile and contact information</Typography>
        </Box>
        {!editing ? (
          <Button variant="contained" startIcon={<EditIcon />} onClick={() => setEditing(true)}
            sx={{ bgcolor: accent, textTransform: 'none', borderRadius: 2, fontWeight: 600, '&:hover': { filter: 'brightness(0.9)' } }}>
            Edit Profile
          </Button>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<CancelIcon />} onClick={() => { initForm(user); setEditing(false); }} disabled={saving}
              sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>Cancel</Button>
            <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={handleSave} disabled={saving}
              sx={{ bgcolor: accent, textTransform: 'none', borderRadius: 2, fontWeight: 600, '&:hover': { filter: 'brightness(0.9)' } }}>
              Save Changes
            </Button>
          </Box>
        )}
      </Box>

      {error   && <Alert severity="error"   sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      {/* Banner */}
      <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 3, mb: 3, border: `1px solid ${theme.palette.divider}`, boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 3 }}>
        <Box sx={{ width: 72, height: 72, borderRadius: 3, background: `linear-gradient(135deg, ${accent} 0%, ${accent}bb 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {initials}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ color: 'text.primary', fontSize: 20, fontWeight: 700 }}>{user?.name || 'Staff Member'}</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 13, mb: 1 }}>{user?.job_title || roleLabel} {user?.department ? `· ${user.department}` : ''}</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {user?.email_verified && <Chip icon={<CheckCircleIcon />} label="Email Verified" size="small" sx={{ bgcolor: 'rgba(16,185,129,0.1)', color: '#10b981', '& .MuiChip-icon': { color: '#10b981', fontSize: 14 } }} />}
            <Chip label={roleLabel} size="small" sx={{ bgcolor: `${accent}18`, color: accent, fontWeight: 600 }} />
          </Box>
        </Box>
      </Box>

      {/* Personal Info */}
      <Card title="Personal Information" accent={accent}>
        <Row icon={PersonIcon} label="Full Name" value={user?.name}
          editNode={<TextField fullWidth size="small" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />} />
        <Row icon={EmailIcon} label="Email Address" value={user?.email} />
        <Row icon={PhoneIcon} label="Phone Number" value={user?.phone}
          editNode={<TextField fullWidth size="small" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 234 567 8900" />} />
      </Card>

      {/* Professional Info */}
      <Card title="Professional Details" accent={accent}>
        <Row icon={BadgeIcon} label="Job Title / Position" value={user?.job_title}
          editNode={<TextField fullWidth size="small" value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} placeholder="e.g. Grant Manager, Finance Officer" />} />
        <Row icon={BusinessIcon} label="Department" value={user?.department}
          editNode={<TextField fullWidth size="small" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Research Office" />} />
      </Card>

      {/* Expertise Keywords */}
      <Card title="Areas of Expertise" accent={accent}>
        {editing ? (
          <Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField size="small" fullWidth placeholder="Add keyword" value={kwInput}
                onChange={e => setKwInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKw())} />
              <Button variant="contained" onClick={addKw} startIcon={<AddIcon />}
                sx={{ bgcolor: accent, textTransform: 'none', borderRadius: 2, flexShrink: 0, '&:hover': { filter: 'brightness(0.9)' } }}>Add</Button>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {form.keywords.map(kw => (
                <Chip key={kw} label={kw} onDelete={() => setForm(f => ({ ...f, keywords: f.keywords.filter(k => k !== kw) }))}
                  deleteIcon={<CloseIcon />} sx={{ bgcolor: `${accent}15`, color: accent, '& .MuiChip-deleteIcon': { color: accent } }} />
              ))}
              {form.keywords.length === 0 && <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>No keywords added</Typography>}
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {kws.length > 0
              ? kws.map(kw => <Chip key={kw} label={kw} size="small" sx={{ bgcolor: `${accent}15`, color: accent }} />)
              : <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>No expertise keywords. Click Edit Profile to add.</Typography>}
          </Box>
        )}
      </Card>
    </Box>
  );
}
