'use client';

import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  PersonAdd,
  Refresh,
  Email,
  Phone,
  Business,
  Work,
} from '@mui/icons-material';

const roleOptions = [
  { value: 'GRANT_MANAGER', label: 'Grant Manager' },
  { value: 'FINANCE_OFFICER', label: 'Finance Officer' },
  { value: 'DATA_STEWARD', label: 'Data Steward' },
  { value: 'DATA_ENGINEER', label: 'Data Engineer' },
  { value: 'ETHICS_COMMITTEE_MEMBER', label: 'Ethics Committee Member' },
  { value: 'INSTITUTIONAL_LEADERSHIP', label: 'Institutional Leadership' },
];

export default function PendingUsersPage() {
  const theme = useTheme();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [approveDialog, setApproveDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [roleDialog, setRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  const fetchPendingUsers = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to view pending users');
        setLoading(false);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/institution-admin/pending-users/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPendingUsers(data);
      } else if (response.status === 403) {
        setError('You do not have permission to view pending users');
      } else {
        setError('Failed to load pending users');
      }
    } catch (err) {
      console.error('Error fetching pending users:', err);
      setError('An error occurred while loading pending users');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/institution-admin/pending-users/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: selectedUser.id }),
      });

      if (response.ok) {
        setSuccess(`User ${selectedUser.name} has been approved`);
        setApproveDialog(false);
        setSelectedUser(null);
        fetchPendingUsers();
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to approve user');
      }
    } catch (err) {
      console.error('Error approving user:', err);
      setError('An error occurred while approving the user');
    }
  };

  const handleReject = async () => {
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/institution-admin/pending-users/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: selectedUser.id,
          reason: rejectReason || null,
        }),
      });

      if (response.ok) {
        setSuccess(`User registration for ${selectedUser.email} has been rejected`);
        setRejectDialog(false);
        setSelectedUser(null);
        setRejectReason('');
        fetchPendingUsers();
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to reject user');
      }
    } catch (err) {
      console.error('Error rejecting user:', err);
      setError('An error occurred while rejecting the user');
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/institution-admin/pending-users/assign-role`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: selectedUser.id,
          role: selectedRole,
        }),
      });

      if (response.ok) {
        setSuccess(`Role assigned to ${selectedUser.name}`);
        setRoleDialog(false);
        setSelectedUser(null);
        setSelectedRole('');
        fetchPendingUsers();
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to assign role');
      }
    } catch (err) {
      console.error('Error assigning role:', err);
      setError('An error occurred while assigning the role');
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography sx={{ color: theme.palette.text.primary, fontSize: 28, fontWeight: 700, mb: 0.5 }}>
            Pending User Registrations
          </Typography>
          <Typography sx={{ color: theme.palette.text.secondary, fontSize: 14 }}>
            Review and approve new user registrations
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchPendingUsers}
          disabled={loading}
          sx={{
            borderColor: theme.palette.divider,
            color: theme.palette.text.secondary,
            '&:hover': { borderColor: '#1ca7a1', color: '#1ca7a1' },
          }}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Paper elevation={0} sx={{ 
        bgcolor: theme.palette.background.paper, 
        border: `1px solid ${theme.palette.divider}`, 
        borderRadius: 3,
        boxShadow: theme.palette.mode === 'light' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
      }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : pendingUsers.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              No pending user registrations
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: theme.palette.text.secondary, fontWeight: 600, borderBottom: `1px solid ${theme.palette.divider}` }}>Name</TableCell>
                  <TableCell sx={{ color: theme.palette.text.secondary, fontWeight: 600, borderBottom: `1px solid ${theme.palette.divider}` }}>Email</TableCell>
                  <TableCell sx={{ color: theme.palette.text.secondary, fontWeight: 600, borderBottom: `1px solid ${theme.palette.divider}` }}>Department</TableCell>
                  <TableCell sx={{ color: theme.palette.text.secondary, fontWeight: 600, borderBottom: `1px solid ${theme.palette.divider}` }}>Role</TableCell>
                  <TableCell sx={{ color: theme.palette.text.secondary, fontWeight: 600, borderBottom: `1px solid ${theme.palette.divider}` }}>Status</TableCell>
                  <TableCell sx={{ color: theme.palette.text.secondary, fontWeight: 600, borderBottom: `1px solid ${theme.palette.divider}` }}>Registered</TableCell>
                  <TableCell align="right" sx={{ color: theme.palette.text.secondary, fontWeight: 600, borderBottom: `1px solid ${theme.palette.divider}` }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingUsers.map((user) => (
                  <TableRow key={user.id} hover sx={{ '&:hover': { bgcolor: theme.palette.mode === 'dark' ? '#0f172a' : 'rgba(0,0,0,0.02)' } }}>
                    <TableCell sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                      <Typography variant="body2" fontWeight="500" sx={{ color: theme.palette.text.primary }}>
                        {user.name}
                      </Typography>
                      {user.job_title && (
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                          {user.job_title}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Email sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
                        <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>{user.email}</Typography>
                      </Box>
                      {user.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                          <Phone sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
                          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                            {user.phone}
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                      <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>{user.department || '-'}</Typography>
                    </TableCell>
                    <TableCell sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                      <Chip
                        label={user.primary_account_type?.replace('_', ' ')}
                        size="small"
                        sx={{ bgcolor: '#1ca7a1', color: '#fff', fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                      <Chip
                        label={user.email_verified ? 'Email Verified' : 'Email Not Verified'}
                        size="small"
                        sx={{ 
                          bgcolor: user.email_verified ? '#22c55e' : '#fbbf24',
                          color: '#fff',
                          fontWeight: 600
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                        {formatDate(user.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Tooltip title="Approve">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => {
                              setSelectedUser(user);
                              setApproveDialog(true);
                            }}
                            disabled={!user.email_verified}
                          >
                            <CheckCircle />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setSelectedUser(user);
                              setRejectDialog(true);
                            }}
                          >
                            <Cancel />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Assign Role">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setSelectedUser(user);
                              setRoleDialog(true);
                            }}
                          >
                            <PersonAdd />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Approve Dialog */}
      <Dialog open={approveDialog} onClose={() => setApproveDialog(false)}>
        <DialogTitle>Approve User Registration</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to approve <strong>{selectedUser?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This will activate their account and grant them access to the platform.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialog(false)}>Cancel</Button>
          <Button onClick={handleApprove} variant="contained" color="success">
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog} onClose={() => setRejectDialog(false)}>
        <DialogTitle>Reject User Registration</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to reject <strong>{selectedUser?.email}</strong>?
          </Typography>
          <TextField
            fullWidth
            label="Reason (optional)"
            multiline
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Provide a reason for rejection..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog(false)}>Cancel</Button>
          <Button onClick={handleReject} variant="contained" color="error">
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Role Dialog */}
      <Dialog open={roleDialog} onClose={() => setRoleDialog(false)}>
        <DialogTitle>Assign Role</DialogTitle>
        <DialogContent sx={{ minWidth: 400 }}>
          <Typography sx={{ mb: 3 }}>
            Assign a role to <strong>{selectedUser?.name}</strong>
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Select Role</InputLabel>
            <Select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              label="Select Role"
            >
              {roleOptions.map((role) => (
                <MenuItem key={role.value} value={role.value}>
                  {role.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialog(false)}>Cancel</Button>
          <Button
            onClick={handleAssignRole}
            variant="contained"
            disabled={!selectedRole}
          >
            Assign Role
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
