'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  CircularProgress,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '@mui/material/styles';
import { globalAdminAPI } from '../../../lib/api';

export default function UsersPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  
  const [users, setUsers] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [accountTypeFilter, setAccountTypeFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const userData = await fetchUser();
    if (!userData) {
      router.push('/login');
      return;
    }
    if (!userData.is_global_admin) {
      if (userData.is_institution_admin) {
        router.push('/institution-admin/dashboard');
      } else {
        router.push('/login');
      }
      return;
    }
    loadData();
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, institutionsRes] = await Promise.all([
        globalAdminAPI.listAllUsers(0, 1000),
        globalAdminAPI.listInstitutions(),
      ]);
      console.log('Users loaded:', usersRes.data);
      setUsers(usersRes.data);
      setInstitutions(institutionsRes.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load data');
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchQuery === '' || 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesType = accountTypeFilter === 'all' || user.account_type === accountTypeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>All Users</Typography>
          <Typography variant="body2" color="text.secondary">Manage all registered users across institutions</Typography>
        </Box>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Search and Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
          }}
          sx={{ flex: '1 1 300px' }}
        />
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Status"
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="SUSPENDED">Suspended</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel>Account Type</InputLabel>
          <Select
            value={accountTypeFilter}
            onChange={(e) => setAccountTypeFilter(e.target.value)}
            label="Account Type"
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="ORCID">ORCID Researcher</MenuItem>
            <MenuItem value="INSTITUTION_ADMIN">Institution Admin</MenuItem>
            <MenuItem value="GLOBAL_ADMIN">Global Admin</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Users Table */}
      <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', borderBottom: 1, borderColor: 'divider' }}>User</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', borderBottom: 1, borderColor: 'divider' }}>Account Type</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', borderBottom: 1, borderColor: 'divider' }}>Institution</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', borderBottom: 1, borderColor: 'divider' }}>Status</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', borderBottom: 1, borderColor: 'divider' }}>Joined</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', borderBottom: 1, borderColor: 'divider' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                  <TableCell sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 14 }}>
                        {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {user.name || 'No name'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Chip
                      label={
                        user.is_global_admin ? 'Global Admin' :
                        user.is_institution_admin ? 'Institution Admin' :
                        user.account_type === 'ORCID' ? 'ORCID Researcher' :
                        user.account_type
                      }
                      size="small"
                      sx={{
                        bgcolor: user.is_global_admin ? 'rgba(139, 92, 246, 0.1)' :
                                 user.is_institution_admin ? 'rgba(59, 130, 246, 0.1)' :
                                 'rgba(100, 116, 139, 0.1)',
                        color: user.is_global_admin ? '#8b5cf6' :
                               user.is_institution_admin ? '#3b82f6' :
                               '#2c3035',
                        border: 'none',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary">
                      {user.institution_id ? 
                        institutions.find(i => i.id === user.institution_id)?.name || `ID: ${user.institution_id}` :
                        '-'
                      }
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Chip
                      label={user.status}
                      size="small"
                      sx={{
                        bgcolor: user.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.1)' :
                                 user.status === 'PENDING' ? 'rgba(251, 191, 36, 0.1)' :
                                 'rgba(239, 68, 68, 0.1)',
                        color: user.status === 'ACTIVE' ? '#22c55e' :
                               user.status === 'PENDING' ? '#fbbf24' :
                               '#ef4444',
                        border: 'none',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(user.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Button
                      size="small"
                      onClick={() => {
                        setSelectedUser(user);
                        setUserDetailsOpen(true);
                      }}
                      sx={{ textTransform: 'none', fontSize: 12, fontWeight: 600 }}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        {filteredUsers.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">No users found</Typography>
          </Box>
        )}
      </Box>

      {/* User Details Dialog */}
      <Dialog
        open={userDetailsOpen}
        onClose={() => setUserDetailsOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            borderRadius: 3,
            border: 1,
            borderColor: 'divider',
          },
        }}
      >
        {selectedUser && (
          <>
            <DialogTitle sx={{ fontSize: 18, fontWeight: 700, borderBottom: 1, borderColor: 'divider' }}>
              User Details
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: 24 }}>
                    {selectedUser.name?.charAt(0) || selectedUser.email?.charAt(0) || 'U'}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {selectedUser.name || 'No name'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedUser.email}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Account Type</Typography>
                    <Chip
                      label={
                        selectedUser.is_global_admin ? 'Global Admin' :
                        selectedUser.is_institution_admin ? 'Institution Admin' :
                        selectedUser.account_type === 'ORCID' ? 'ORCID Researcher' :
                        selectedUser.account_type
                      }
                      sx={{
                        bgcolor: selectedUser.is_global_admin ? 'rgba(139, 92, 246, 0.1)' :
                                 selectedUser.is_institution_admin ? 'rgba(59, 130, 246, 0.1)' :
                                 'rgba(100, 116, 139, 0.1)',
                        color: selectedUser.is_global_admin ? '#8b5cf6' :
                               selectedUser.is_institution_admin ? '#3b82f6' :
                               '#2c3035',
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Status</Typography>
                    <Chip
                      label={selectedUser.status}
                      sx={{
                        bgcolor: selectedUser.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.1)' :
                                 selectedUser.status === 'PENDING' ? 'rgba(251, 191, 36, 0.1)' :
                                 'rgba(239, 68, 68, 0.1)',
                        color: selectedUser.status === 'ACTIVE' ? '#22c55e' :
                               selectedUser.status === 'PENDING' ? '#fbbf24' :
                               '#ef4444',
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Institution</Typography>
                    <Typography variant="body2">
                      {selectedUser.institution_id ? 
                        institutions.find(i => i.id === selectedUser.institution_id)?.name || `ID: ${selectedUser.institution_id}` :
                        'None'
                      }
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>User ID</Typography>
                    <Typography variant="body2">{selectedUser.id}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Joined</Typography>
                    <Typography variant="body2">
                      {new Date(selectedUser.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Last Login</Typography>
                    <Typography variant="body2">
                      {selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleDateString() : 'Never'}
                    </Typography>
                  </Box>
                </Box>

                {selectedUser.orcid_id && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>ORCID iD</Typography>
                    <Typography variant="body2">{selectedUser.orcid_id}</Typography>
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3, borderTop: 1, borderColor: 'divider', pt: 2 }}>
              <Button
                onClick={() => setUserDetailsOpen(false)}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
