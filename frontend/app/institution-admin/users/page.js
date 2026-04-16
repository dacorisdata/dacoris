'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Alert, CircularProgress, Avatar, FormControl, InputLabel, Select,
  MenuItem, useTheme, Checkbox, FormControlLabel, FormGroup, Divider, Tooltip,
  IconButton, Paper,
} from '@mui/material';
import {
  Search as SearchIcon, ManageAccounts as RoleIcon,
  CheckBox as CheckAllIcon, CheckBoxOutlineBlank as UncheckIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { institutionAdminAPI } from '../../../lib/api';

// ── Constants ──────────────────────────────────────────────────────────────────

const PRIMARY_ACCOUNT_TYPES = [
  { value: 'RESEARCHER',              label: 'Researcher' },
  { value: 'ADMIN_STAFF',             label: 'Admin Staff (General)' },
  { value: 'GRANT_MANAGER',           label: 'Grant Manager' },
  { value: 'FINANCE_OFFICER',         label: 'Finance Officer' },
  { value: 'ETHICS_COMMITTEE_MEMBER', label: 'Ethics Committee Member' },
  { value: 'DATA_STEWARD',            label: 'Data Steward' },
  { value: 'DATA_ENGINEER',           label: 'Data Engineer' },
  { value: 'INSTITUTIONAL_LEADERSHIP',label: 'Institutional Leadership' },
  { value: 'EXTERNAL_REVIEWER',       label: 'External Reviewer' },
  { value: 'GUEST_COLLABORATOR',      label: 'Guest Collaborator' },
  { value: 'EXTERNAL_FUNDER',         label: 'External Funder' },
];

const ROLE_GROUPS = [
  {
    label: 'Research Roles',
    color: '#3b82f6',
    roles: [
      { value: 'researcher',           label: 'Researcher' },
      { value: 'principal_investigator',label: 'Principal Investigator (PI)' },
      { value: 'co_investigator',       label: 'Co-Investigator (Co-I)' },
      { value: 'applicant',             label: 'Applicant' },
    ],
  },
  {
    label: 'Grant & Finance',
    color: '#8b5cf6',
    roles: [
      { value: 'grant_officer',  label: 'Grant Officer' },
      { value: 'research_admin', label: 'Research Administrator' },
      { value: 'finance_officer',label: 'Finance Officer' },
      { value: 'external_funder',label: 'External Funder' },
    ],
  },
  {
    label: 'Ethics & Compliance',
    color: '#10b981',
    roles: [
      { value: 'ethics_reviewer', label: 'Ethics Reviewer' },
      { value: 'ethics_chair',    label: 'Ethics Chair' },
      { value: 'external_reviewer',label: 'External Reviewer' },
    ],
  },
  {
    label: 'Data & Systems',
    color: '#0ea5e9',
    roles: [
      { value: 'data_steward',    label: 'Data Steward' },
      { value: 'data_engineer',   label: 'Data Engineer' },
      { value: 'system_admin',    label: 'System Administrator' },
    ],
  },
  {
    label: 'Leadership & Guests',
    color: '#ef4444',
    roles: [
      { value: 'institutional_lead', label: 'Institutional Lead' },
      { value: 'guest_collaborator', label: 'Guest Collaborator' },
    ],
  },
];

const ALL_ADMIN_STAFF_ROLES = [
  'grant_officer','research_admin','finance_officer','ethics_reviewer','ethics_chair',
  'data_steward','data_engineer','institutional_lead','system_admin','external_reviewer',
  'external_funder',
];

const ALL_ROLES = ROLE_GROUPS.flatMap(g => g.roles.map(r => r.value));

export default function InstitutionAdminUsersPage() {
  const router  = useRouter();
  const { fetchUser } = useAuth();
  const theme   = useTheme();
  const dark    = theme.palette.mode === 'dark';

  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Role management dialog
  const [roleTarget, setRoleTarget]         = useState(null);   // user being edited
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedRoles, setSelectedRoles]   = useState([]);
  const [primaryType, setPrimaryType]       = useState('');
  const [savingRoles, setSavingRoles]       = useState(false);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (!u.is_institution_admin) {
      router.push(u.is_global_admin ? '/global-admin/dashboard' : '/login');
      return;
    }
    loadData();
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await institutionAdminAPI.getUsers();
      setUsers(res.data);
    } catch { setError('Failed to load users'); }
    setLoading(false);
  };

  const handleApproveUser = async (userId) => {
    try {
      await institutionAdminAPI.approveUser(userId, { status: 'active' });
      setSuccess('User approved'); loadData();
    } catch { setError('Failed to approve user'); }
  };

  const handleRejectUser = async (userId) => {
    try {
      await institutionAdminAPI.rejectUser(userId);
      setSuccess('User rejected'); loadData();
    } catch { setError('Failed to reject user'); }
  };

  const openRoleDialog = (user) => {
    setRoleTarget(user);
    setSelectedRoles(user.roles || []);
    setPrimaryType(user.primary_account_type || '');
    setRoleDialogOpen(true);
  };

  const toggleRole = (val) =>
    setSelectedRoles(prev => prev.includes(val) ? prev.filter(r => r !== val) : [...prev, val]);

  const handleSelectAdminStaff = () => setSelectedRoles(ALL_ADMIN_STAFF_ROLES);
  const handleSelectAll        = () => setSelectedRoles(ALL_ROLES);
  const handleClearAll         = () => setSelectedRoles([]);

  const handleSaveRoles = async () => {
    if (!roleTarget) return;
    setSavingRoles(true); setError('');
    try {
      await institutionAdminAPI.assignRoles(roleTarget.id, selectedRoles, primaryType || undefined);
      setSuccess(`Roles updated for ${roleTarget.name || roleTarget.email}`);
      setTimeout(() => setSuccess(''), 4000);
      setRoleDialogOpen(false);
      await loadData();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to save roles');
    } finally { setSavingRoles(false); }
  };

  const filteredUsers = users.filter(u => {
    const matchSearch  = !searchQuery ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || u.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
  });

  const statusChip = (s) => ({
    label: s,
    sx: {
      bgcolor: s === 'active' || s === 'ACTIVE' ? 'rgba(34,197,94,0.1)' :
               s === 'pending' || s === 'PENDING' ? 'rgba(251,191,36,0.1)' : 'rgba(239,68,68,0.1)',
      color:  s === 'active' || s === 'ACTIVE' ? '#22c55e' :
              s === 'pending' || s === 'PENDING' ? '#fbbf24' : '#ef4444',
      fontSize: 11, fontWeight: 600, border: 'none',
    },
  });

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography sx={{ color: 'text.primary', fontSize: 24, fontWeight: 700, mb: 0.5 }}>Users</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>Manage users, account types, and role assignments</Typography>
        </Box>
      </Box>

      {error   && <Alert severity="error"   sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField placeholder="Search by name or email…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          size="small" InputProps={{ startAdornment: <SearchIcon sx={{ color: 'text.disabled', mr: 1, fontSize: 18 }} /> }}
          sx={{ flex: '1 1 300px', '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} label="Status" sx={{ borderRadius: 2 }}>
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="suspended">Suspended</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Table */}
      <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden', boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.08)' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: dark ? '#0f172a' : 'background.default', color: 'text.secondary', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `1px solid ${theme.palette.divider}` } }}>
                <TableCell>User</TableCell>
                <TableCell>Account Type</TableCell>
                <TableCell>Roles</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map(u => (
                <TableRow key={u.id} sx={{ '&:hover': { bgcolor: dark ? '#0f172a' : 'rgba(0,0,0,0.02)' } }}>
                  <TableCell sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: '#1ca7a1', fontSize: 14 }}>
                        {u.name?.charAt(0) || u.email?.charAt(0) || 'U'}
                      </Avatar>
                      <Box>
                        <Typography sx={{ color: 'text.primary', fontSize: 14, fontWeight: 600 }}>{u.name || 'No name'}</Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>{u.email}</Typography>
                        {u.job_title && <Typography sx={{ color: 'text.disabled', fontSize: 11 }}>{u.job_title}</Typography>}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                    {u.primary_account_type ? (
                      <Chip label={u.primary_account_type.replace(/_/g, ' ')} size="small"
                        sx={{ bgcolor: 'rgba(28,167,161,0.1)', color: '#1ca7a1', fontWeight: 600, fontSize: 11 }} />
                    ) : <Typography sx={{ color: 'text.disabled', fontSize: 12 }}>—</Typography>}
                  </TableCell>
                  <TableCell sx={{ borderBottom: `1px solid ${theme.palette.divider}`, maxWidth: 220 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(u.roles || []).slice(0, 3).map(r => (
                        <Chip key={r} label={r.replace(/_/g, ' ')} size="small"
                          sx={{ fontSize: 10, fontWeight: 600, bgcolor: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', color: 'text.secondary' }} />
                      ))}
                      {(u.roles || []).length > 3 && (
                        <Chip label={`+${u.roles.length - 3}`} size="small"
                          sx={{ fontSize: 10, fontWeight: 700, bgcolor: 'rgba(28,167,161,0.1)', color: '#1ca7a1' }} />
                      )}
                      {(!u.roles || u.roles.length === 0) && <Typography sx={{ color: 'text.disabled', fontSize: 12 }}>No roles</Typography>}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                    <Chip label={u.status} size="small" {...statusChip(u.status)} />
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 13, borderBottom: `1px solid ${theme.palette.divider}` }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB') : '—'}
                  </TableCell>
                  <TableCell sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {(u.status === 'PENDING' || u.status === 'pending') && (
                        <>
                          <Button size="small" onClick={() => handleApproveUser(u.id)}
                            sx={{ color: '#22c55e', textTransform: 'none', fontSize: 12, fontWeight: 600, '&:hover': { bgcolor: 'rgba(34,197,94,0.1)' } }}>
                            Approve
                          </Button>
                          <Button size="small" onClick={() => handleRejectUser(u.id)}
                            sx={{ color: '#ef4444', textTransform: 'none', fontSize: 12, fontWeight: 600, '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' } }}>
                            Reject
                          </Button>
                        </>
                      )}
                      <Button size="small" startIcon={<RoleIcon sx={{ fontSize: '14px !important' }} />} onClick={() => openRoleDialog(u)}
                        sx={{ color: '#1ca7a1', textTransform: 'none', fontSize: 12, fontWeight: 600, '&:hover': { bgcolor: 'rgba(28,167,161,0.1)' } }}>
                        Roles
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {filteredUsers.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>No users found</Typography>
          </Box>
        )}
      </Box>

      {/* ── Role Management Dialog ─────────────────────────────────────── */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="md" fullWidth disableScrollLock
        PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3, border: `1px solid ${theme.palette.divider}` } }}>
        {roleTarget && (
          <>
            <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}`, pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ width: 44, height: 44, bgcolor: '#1ca7a1', fontSize: 16 }}>
                  {roleTarget.name?.charAt(0) || roleTarget.email?.charAt(0) || 'U'}
                </Avatar>
                <Box>
                  <Typography sx={{ color: 'text.primary', fontSize: 17, fontWeight: 700 }}>
                    Manage Roles
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                    {roleTarget.name || 'User'} · {roleTarget.email}
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>

            <DialogContent sx={{ pt: 3 }}>
              {/* Primary Account Type */}
              <Typography sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', mb: 1 }}>
                Primary Account Type
              </Typography>
              <FormControl fullWidth size="small" sx={{ mb: 3 }}>
                <Select value={primaryType} onChange={e => setPrimaryType(e.target.value)}
                  displayEmpty renderValue={v => v ? PRIMARY_ACCOUNT_TYPES.find(t => t.value === v)?.label || v : 'Select account type…'}
                  sx={{ borderRadius: 2 }}>
                  <MenuItem value=""><em>— None —</em></MenuItem>
                  {PRIMARY_ACCOUNT_TYPES.map(t => (
                    <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Divider sx={{ mb: 2.5 }} />

              {/* Quick Select Buttons */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', mr: 1 }}>
                  Quick Select:
                </Typography>
                <Button size="small" variant="outlined" startIcon={<AdminIcon />} onClick={handleSelectAdminStaff}
                  sx={{ textTransform: 'none', fontSize: 12, fontWeight: 600, borderRadius: 2, borderColor: '#8b5cf6', color: '#8b5cf6', '&:hover': { bgcolor: 'rgba(139,92,246,0.08)', borderColor: '#8b5cf6' } }}>
                  All Admin Staff Roles
                </Button>
                <Button size="small" variant="outlined" startIcon={<CheckAllIcon />} onClick={handleSelectAll}
                  sx={{ textTransform: 'none', fontSize: 12, fontWeight: 600, borderRadius: 2, borderColor: '#1ca7a1', color: '#1ca7a1', '&:hover': { bgcolor: 'rgba(28,167,161,0.08)', borderColor: '#1ca7a1' } }}>
                  Select All
                </Button>
                <Button size="small" variant="outlined" startIcon={<UncheckIcon />} onClick={handleClearAll}
                  sx={{ textTransform: 'none', fontSize: 12, fontWeight: 600, borderRadius: 2, borderColor: 'divider', color: 'text.secondary', '&:hover': { bgcolor: 'action.hover' } }}>
                  Clear All
                </Button>
                <Chip label={`${selectedRoles.length} selected`} size="small"
                  sx={{ ml: 'auto', bgcolor: 'rgba(28,167,161,0.1)', color: '#1ca7a1', fontWeight: 700, fontSize: 11 }} />
              </Box>

              {/* Role Groups */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {ROLE_GROUPS.map(group => (
                  <Paper key={group.label} elevation={0} sx={{
                    flex: '1 1 240px', border: `1px solid ${theme.palette.divider}`, borderRadius: 2.5,
                    p: 2, bgcolor: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: group.color, flexShrink: 0 }} />
                      <Typography sx={{ color: 'text.primary', fontSize: 12, fontWeight: 700 }}>{group.label}</Typography>
                    </Box>
                    <FormGroup>
                      {group.roles.map(role => (
                        <FormControlLabel key={role.value}
                          control={
                            <Checkbox size="small" checked={selectedRoles.includes(role.value)}
                              onChange={() => toggleRole(role.value)}
                              sx={{ '&.Mui-checked': { color: group.color }, py: 0.5 }} />
                          }
                          label={<Typography sx={{ fontSize: 13, color: 'text.primary' }}>{role.label}</Typography>}
                        />
                      ))}
                    </FormGroup>
                  </Paper>
                ))}
              </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}`, gap: 1 }}>
              <Button onClick={() => setRoleDialogOpen(false)} disabled={savingRoles}
                sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 600, borderRadius: 2, '&:hover': { bgcolor: 'action.hover' } }}>
                Cancel
              </Button>
              <Button variant="contained" onClick={handleSaveRoles} disabled={savingRoles}
                startIcon={savingRoles ? <CircularProgress size={16} color="inherit" /> : <RoleIcon />}
                sx={{ bgcolor: '#1ca7a1', textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 3, '&:hover': { bgcolor: '#0e7490' } }}>
                Save Role Assignment
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
