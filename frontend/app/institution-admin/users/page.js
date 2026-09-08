'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Alert, CircularProgress, Avatar, FormControl, InputLabel, Select,
  MenuItem, useTheme, Checkbox, FormControlLabel, FormGroup, Divider, Tooltip,
  IconButton, Paper, ListSubheader, InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon, ManageAccounts as RoleIcon,
  CheckBox as CheckAllIcon, CheckBoxOutlineBlank as UncheckIcon,
  AdminPanelSettings as AdminIcon, Delete as DeleteIcon,
  Block as SuspendIcon, CheckCircle as ActivateIcon,
  PersonAdd as PersonAddIcon, LockReset as LockResetIcon,
  Badge as OrcidIcon, Visibility, VisibilityOff,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { institutionAdminAPI } from '../../../lib/api';
import {
  PERMISSION_ROLE_GROUPS,
  ALL_PERMISSION_ROLES,
  ALL_ADMIN_STAFF_PERMISSION_ROLES,
  getPrimaryAccountTypeLabel,
  getPermissionRoleLabel,
  getDefaultRolesForPrimaryType,
  getPrimaryTypesForInstitution,
  mergeRoles,
} from '../../../lib/institutionAdminRoles';

const EMPTY_CREATE_FORM = {
  email: '',
  name: '',
  password: '',
  confirmPassword: '',
  primary_account_type: '',
  orcid_id: '',
  department: '',
  job_title: '',
};

function isResearcherType(type) {
  return type === 'RESEARCHER';
}

function formatApiError(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg || d).join(', ');
  return fallback;
}

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
  const [roleTarget, setRoleTarget]         = useState(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedRoles, setSelectedRoles]   = useState([]);
  const [primaryType, setPrimaryType]       = useState('');
  const [savingRoles, setSavingRoles]       = useState(false);
  const [loadingRoles, setLoadingRoles]     = useState(false);
  const [institutionTypes, setInstitutionTypes] = useState([]);

  // Create user dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [creating, setCreating] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // Password reset dialog
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // ORCID dialog
  const [orcidTarget, setOrcidTarget] = useState(null);
  const [orcidDialogOpen, setOrcidDialogOpen] = useState(false);
  const [orcidValue, setOrcidValue] = useState('');
  const [savingOrcid, setSavingOrcid] = useState(false);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const u = await fetchUser();
    if (!u) { router.push('/login'); return; }
    if (!u.is_institution_admin) {
      router.push(u.is_global_admin ? '/global-admin/dashboard' : '/login');
      return;
    }
    setInstitutionTypes(u.institution_types || []);
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

  const flashSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

  const handleApproveUser = async (userId) => {
    try {
      await institutionAdminAPI.approveUser(userId, { status: 'active' });
      flashSuccess('User approved');
      loadData();
    } catch (e) { setError(formatApiError(e, 'Failed to approve user')); }
  };

  const handleRejectUser = async (userId) => {
    try {
      await institutionAdminAPI.rejectUser(userId);
      flashSuccess('User rejected');
      loadData();
    } catch (e) { setError(formatApiError(e, 'Failed to reject user')); }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) return;
    try {
      await institutionAdminAPI.deleteUser(userId);
      flashSuccess('User deleted successfully');
      loadData();
    } catch (e) {
      setError(formatApiError(e, 'Failed to delete user'));
    }
  };

  const handleSuspendUser = async (userId) => {
    try {
      await institutionAdminAPI.suspendUser(userId);
      flashSuccess('User deactivated');
      loadData();
    } catch (e) { setError(formatApiError(e, 'Failed to deactivate user')); }
  };

  const handleActivateUser = async (userId) => {
    try {
      await institutionAdminAPI.activateUser(userId);
      flashSuccess('User activated');
      loadData();
    } catch (e) { setError(formatApiError(e, 'Failed to activate user')); }
  };

  const openRoleDialog = async (user) => {
    setRoleTarget(user);
    setPrimaryType(user.primary_account_type || '');
    setRoleDialogOpen(true);
    setLoadingRoles(true);
    setError('');
    try {
      const res = await institutionAdminAPI.getUserRoles(user.id);
      let roles = res.data?.roles || user.roles || [];
      if (roles.length === 0 && user.primary_account_type) {
        roles = getDefaultRolesForPrimaryType(user.primary_account_type);
      }
      setSelectedRoles(roles);
    } catch {
      const fallback = user.roles?.length
        ? user.roles
        : getDefaultRolesForPrimaryType(user.primary_account_type);
      setSelectedRoles(fallback || []);
    } finally {
      setLoadingRoles(false);
    }
  };

  const handlePrimaryTypeChange = (nextType) => {
    setPrimaryType(nextType);
    if (!nextType) return;
    const defaults = getDefaultRolesForPrimaryType(nextType);
    if (defaults.length > 0) {
      setSelectedRoles((prev) => mergeRoles(prev, defaults));
    }
  };

  const toggleRole = (val) =>
    setSelectedRoles(prev => prev.includes(val) ? prev.filter(r => r !== val) : [...prev, val]);

  const handleSelectAdminStaff = () => setSelectedRoles(ALL_ADMIN_STAFF_PERMISSION_ROLES);
  const handleSelectAll        = () => setSelectedRoles(ALL_PERMISSION_ROLES);
  const handleApplyDefaults    = () => {
    if (!primaryType) return;
    setSelectedRoles(getDefaultRolesForPrimaryType(primaryType));
  };
  const handleClearAll         = () => setSelectedRoles([]);

  const handleSaveRoles = async () => {
    if (!roleTarget) return;
    if (!primaryType) {
      setError('Please select a primary account type');
      return;
    }
    const rolesToSave = selectedRoles.filter((r) => ALL_PERMISSION_ROLES.includes(r));
    setSavingRoles(true); setError('');
    try {
      await institutionAdminAPI.assignRoles(roleTarget.id, rolesToSave, primaryType);
      flashSuccess(`Roles updated for ${roleTarget.name || roleTarget.email}`);
      setRoleDialogOpen(false);
      await loadData();
    } catch (e) {
      setError(formatApiError(e, 'Failed to save roles'));
    } finally { setSavingRoles(false); }
  };

  const openCreateDialog = () => {
    setCreateForm(EMPTY_CREATE_FORM);
    setShowCreatePassword(false);
    setCreateOpen(true);
    setError('');
  };

  const handleCreatePrimaryTypeChange = (nextType) => {
    setCreateForm((prev) => ({
      ...prev,
      primary_account_type: nextType,
      orcid_id: isResearcherType(nextType) ? prev.orcid_id : '',
    }));
  };

  const handleCreateUser = async () => {
    setError('');
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password) {
      setError('Name, email, and password are required');
      return;
    }
    if (!createForm.primary_account_type) {
      setError('Please select a primary account type');
      return;
    }
    if (createForm.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (createForm.password !== createForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setCreating(true);
    try {
      const defaults = getDefaultRolesForPrimaryType(createForm.primary_account_type);
      const payload = {
        email: createForm.email.trim(),
        name: createForm.name.trim(),
        password: createForm.password,
        primary_account_type: createForm.primary_account_type,
        roles: defaults,
        department: createForm.department.trim() || null,
        job_title: createForm.job_title.trim() || null,
      };
      if (isResearcherType(createForm.primary_account_type) && createForm.orcid_id.trim()) {
        payload.orcid_id = createForm.orcid_id.trim();
      }
      await institutionAdminAPI.createUser(payload);
      flashSuccess('User created successfully');
      setCreateOpen(false);
      await loadData();
    } catch (e) {
      setError(formatApiError(e, 'Failed to create user'));
    } finally {
      setCreating(false);
    }
  };

  const openPasswordDialog = (user) => {
    setPasswordTarget(user);
    setNewPassword('');
    setConfirmPassword('');
    setShowResetPassword(false);
    setPasswordDialogOpen(true);
    setError('');
  };

  const handleResetPassword = async () => {
    if (!passwordTarget) return;
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setResettingPassword(true);
    setError('');
    try {
      await institutionAdminAPI.resetUserPassword(passwordTarget.id, newPassword);
      flashSuccess(`Password updated for ${passwordTarget.name || passwordTarget.email}`);
      setPasswordDialogOpen(false);
    } catch (e) {
      setError(formatApiError(e, 'Failed to reset password'));
    } finally {
      setResettingPassword(false);
    }
  };

  const openOrcidDialog = (user) => {
    setOrcidTarget(user);
    setOrcidValue(user.orcid_id || '');
    setOrcidDialogOpen(true);
    setError('');
  };

  const handleSaveOrcid = async () => {
    if (!orcidTarget) return;
    setSavingOrcid(true);
    setError('');
    try {
      await institutionAdminAPI.updateUserOrcid(orcidTarget.id, orcidValue.trim() || null);
      flashSuccess(`ORCID updated for ${orcidTarget.name || orcidTarget.email}`);
      setOrcidDialogOpen(false);
      await loadData();
    } catch (e) {
      setError(formatApiError(e, 'Failed to update ORCID'));
    } finally {
      setSavingOrcid(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchSearch  = !searchQuery ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.orcid_id?.toLowerCase().includes(searchQuery.toLowerCase());
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ color: 'text.primary', fontSize: 24, fontWeight: 700, mb: 0.5 }}>Users</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
            Create accounts, manage roles, activate or deactivate users, reset passwords, and set ORCID iDs
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={openCreateDialog}
          sx={{ bgcolor: '#1ca7a1', textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 2.5, '&:hover': { bgcolor: '#0e7490' } }}
        >
          Create User
        </Button>
      </Box>

      {error   && <Alert severity="error"   sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField placeholder="Search by name, email, or ORCID…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          size="small" InputProps={{ startAdornment: <SearchIcon sx={{ color: 'text.disabled', mr: 1, fontSize: 18 }} /> }}
          sx={{ flex: '1 1 300px', '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} label="Status" sx={{ borderRadius: 2 }}>
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="suspended">Deactivated</MenuItem>
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
                <TableCell>ORCID</TableCell>
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
                      <Chip label={getPrimaryAccountTypeLabel(u.primary_account_type)} size="small"
                        sx={{ bgcolor: 'rgba(28,167,161,0.1)', color: '#1ca7a1', fontWeight: 600, fontSize: 11 }} />
                    ) : <Typography sx={{ color: 'text.disabled', fontSize: 12 }}>—</Typography>}
                  </TableCell>
                  <TableCell sx={{ borderBottom: `1px solid ${theme.palette.divider}`, maxWidth: 220 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(u.roles || []).slice(0, 3).map(r => (
                        <Chip key={r} label={getPermissionRoleLabel(r)} size="small"
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
                    {u.orcid_id ? (
                      <Typography sx={{ color: 'text.secondary', fontSize: 12, fontFamily: 'monospace' }}>{u.orcid_id}</Typography>
                    ) : (
                      <Typography sx={{ color: 'text.disabled', fontSize: 12 }}>—</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                    <Chip
                      label={(u.status === 'suspended' || u.status === 'SUSPENDED') ? 'deactivated' : u.status}
                      size="small"
                      {...statusChip(u.status)}
                    />
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 13, borderBottom: `1px solid ${theme.palette.divider}` }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB') : '—'}
                  </TableCell>
                  <TableCell sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
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
                      <Tooltip title="Manage Roles">
                        <IconButton size="small" onClick={() => openRoleDialog(u)}
                          sx={{ color: '#1ca7a1', '&:hover': { bgcolor: 'rgba(28,167,161,0.1)' } }}>
                          <RoleIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reset Password">
                        <IconButton size="small" onClick={() => openPasswordDialog(u)}
                          sx={{ color: '#6366f1', '&:hover': { bgcolor: 'rgba(99,102,241,0.1)' } }}>
                          <LockResetIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      {isResearcherType(u.primary_account_type) && (
                        <Tooltip title={u.orcid_id ? 'Edit ORCID' : 'Add ORCID'}>
                          <IconButton size="small" onClick={() => openOrcidDialog(u)}
                            sx={{ color: '#a6ce39', '&:hover': { bgcolor: 'rgba(166,206,57,0.12)' } }}>
                            <OrcidIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {(u.status === 'ACTIVE' || u.status === 'active') && (
                        <Tooltip title="Deactivate User">
                          <IconButton size="small" onClick={() => handleSuspendUser(u.id)}
                            sx={{ color: '#f59e0b', '&:hover': { bgcolor: 'rgba(245,158,11,0.1)' } }}>
                            <SuspendIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {(u.status === 'SUSPENDED' || u.status === 'suspended') && (
                        <Tooltip title="Activate User">
                          <IconButton size="small" onClick={() => handleActivateUser(u.id)}
                            sx={{ color: '#22c55e', '&:hover': { bgcolor: 'rgba(34,197,94,0.1)' } }}>
                            <ActivateIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {!u.is_global_admin && !u.is_institution_admin && (
                        <Tooltip title="Delete User">
                          <IconButton size="small" onClick={() => handleDeleteUser(u.id, u.name || u.email)}
                            sx={{ color: '#ef4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' } }}>
                            <DeleteIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      )}
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

      {/* ── Create User Dialog ─────────────────────────────────────────── */}
      <Dialog open={createOpen} onClose={() => !creating && setCreateOpen(false)} maxWidth="sm" fullWidth disableScrollLock
        PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3, border: `1px solid ${theme.palette.divider}` } }}>
        <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}`, pb: 2 }}>
          <Typography sx={{ fontSize: 17, fontWeight: 700 }}>Create User Account</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.5 }}>
            The user is created as active and can sign in immediately with the password you set.
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            label="Full Name"
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            fullWidth
            required
            sx={{ mt: 1 }}
          />
          <TextField
            label="Email"
            type="email"
            value={createForm.email}
            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            fullWidth
            required
            helperText="Must use an institution email domain"
          />
          <FormControl fullWidth size="small" required>
            <InputLabel>Primary Account Type</InputLabel>
            <Select
              label="Primary Account Type"
              value={createForm.primary_account_type}
              onChange={(e) => handleCreatePrimaryTypeChange(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              {getPrimaryTypesForInstitution(institutionTypes).map((group) => [
                <ListSubheader key={`create-header-${group.label}`} sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  {group.label}
                </ListSubheader>,
                ...group.types.map((t) => (
                  <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                )),
              ])}
            </Select>
          </FormControl>
          {isResearcherType(createForm.primary_account_type) && (
            <TextField
              label="ORCID iD (optional)"
              value={createForm.orcid_id}
              onChange={(e) => setCreateForm({ ...createForm, orcid_id: e.target.value })}
              fullWidth
              placeholder="0000-0000-0000-0000"
              helperText="You can also add this later from the users table"
            />
          )}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              label="Department"
              value={createForm.department}
              onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
              sx={{ flex: '1 1 180px' }}
            />
            <TextField
              label="Job Title"
              value={createForm.job_title}
              onChange={(e) => setCreateForm({ ...createForm, job_title: e.target.value })}
              sx={{ flex: '1 1 180px' }}
            />
          </Box>
          <TextField
            label="Password"
            type={showCreatePassword ? 'text' : 'password'}
            value={createForm.password}
            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
            fullWidth
            required
            helperText="At least 8 characters"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowCreatePassword((v) => !v)}>
                    {showCreatePassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="Confirm Password"
            type={showCreatePassword ? 'text' : 'password'}
            value={createForm.confirmPassword}
            onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
            fullWidth
            required
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}`, gap: 1 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={creating}
            sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreateUser} disabled={creating}
            startIcon={creating ? <CircularProgress size={16} color="inherit" /> : <PersonAddIcon />}
            sx={{ bgcolor: '#1ca7a1', textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 3, '&:hover': { bgcolor: '#0e7490' } }}>
            Create User
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Reset Password Dialog ──────────────────────────────────────── */}
      <Dialog open={passwordDialogOpen} onClose={() => !resettingPassword && setPasswordDialogOpen(false)} maxWidth="xs" fullWidth disableScrollLock
        PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3, border: `1px solid ${theme.palette.divider}` } }}>
        <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}`, pb: 2 }}>
          <Typography sx={{ fontSize: 17, fontWeight: 700 }}>Reset Password</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.5 }}>
            {passwordTarget?.name || passwordTarget?.email}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            label="New Password"
            type={showResetPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
            required
            sx={{ mt: 1 }}
            helperText="At least 8 characters"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowResetPassword((v) => !v)}>
                    {showResetPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="Confirm Password"
            type={showResetPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth
            required
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}`, gap: 1 }}>
          <Button onClick={() => setPasswordDialogOpen(false)} disabled={resettingPassword}
            sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleResetPassword} disabled={resettingPassword}
            startIcon={resettingPassword ? <CircularProgress size={16} color="inherit" /> : <LockResetIcon />}
            sx={{ bgcolor: '#6366f1', textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 3, '&:hover': { bgcolor: '#4f46e5' } }}>
            Update Password
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── ORCID Dialog ───────────────────────────────────────────────── */}
      <Dialog open={orcidDialogOpen} onClose={() => !savingOrcid && setOrcidDialogOpen(false)} maxWidth="xs" fullWidth disableScrollLock
        PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3, border: `1px solid ${theme.palette.divider}` } }}>
        <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}`, pb: 2 }}>
          <Typography sx={{ fontSize: 17, fontWeight: 700 }}>
            {orcidTarget?.orcid_id ? 'Edit ORCID iD' : 'Add ORCID iD'}
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.5 }}>
            {orcidTarget?.name || orcidTarget?.email}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            label="ORCID iD"
            value={orcidValue}
            onChange={(e) => setOrcidValue(e.target.value)}
            fullWidth
            placeholder="0000-0000-0000-0000"
            helperText="Format: 0000-0000-0000-0000. Leave blank to clear."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}`, gap: 1 }}>
          <Button onClick={() => setOrcidDialogOpen(false)} disabled={savingOrcid}
            sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSaveOrcid} disabled={savingOrcid}
            startIcon={savingOrcid ? <CircularProgress size={16} color="inherit" /> : <OrcidIcon />}
            sx={{ bgcolor: '#a6ce39', color: '#1a1a1a', textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 3, '&:hover': { bgcolor: '#95ba32' } }}>
            Save ORCID
          </Button>
        </DialogActions>
      </Dialog>

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
              <Typography sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', mb: 1 }}>
                Primary Account Type
              </Typography>
              <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                <Select value={primaryType} onChange={e => handlePrimaryTypeChange(e.target.value)}
                  displayEmpty renderValue={v => v ? getPrimaryAccountTypeLabel(v) : 'Select account type…'}
                  sx={{ borderRadius: 2 }}>
                  <MenuItem value=""><em>— None —</em></MenuItem>
                  {getPrimaryTypesForInstitution(institutionTypes).map((group) => [
                    <ListSubheader key={`header-${group.label}`} sx={{ fontWeight: 700, color: 'text.secondary' }}>
                      {group.label}
                    </ListSubheader>,
                    ...group.types.map((t) => (
                      <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                    )),
                  ])}
                </Select>
              </FormControl>
              <Typography sx={{ color: 'text.secondary', fontSize: 12, mb: 3 }}>
                Primary account type sets the user&apos;s main dashboard. You can also assign multiple permission roles below.
              </Typography>

              <Divider sx={{ mb: 2.5 }} />

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
                <Button size="small" variant="outlined" onClick={handleApplyDefaults} disabled={!primaryType}
                  sx={{ textTransform: 'none', fontSize: 12, fontWeight: 600, borderRadius: 2, borderColor: '#f59e0b', color: '#f59e0b', '&:hover': { bgcolor: 'rgba(245,158,11,0.08)', borderColor: '#f59e0b' } }}>
                  Apply Defaults
                </Button>
                <Button size="small" variant="outlined" startIcon={<UncheckIcon />} onClick={handleClearAll}
                  sx={{ textTransform: 'none', fontSize: 12, fontWeight: 600, borderRadius: 2, borderColor: 'divider', color: 'text.secondary', '&:hover': { bgcolor: 'action.hover' } }}>
                  Clear All
                </Button>
                <Chip label={`${selectedRoles.length} selected`} size="small"
                  sx={{ ml: 'auto', bgcolor: 'rgba(28,167,161,0.1)', color: '#1ca7a1', fontWeight: 700, fontSize: 11 }} />
              </Box>

              {loadingRoles ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {PERMISSION_ROLE_GROUPS.map(group => (
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
              )}
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
