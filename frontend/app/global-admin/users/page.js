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
import { globalAdminAPI } from '../../../lib/api';

export default function UsersPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  
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
          <Typography sx={{ color: '#fff', fontSize: 24, fontWeight: 700, mb: 0.5 }}>All Users</Typography>
          <Typography sx={{ color: '#2c3035', fontSize: 14 }}>Manage all registered users across institutions</Typography>
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
            startAdornment: <SearchIcon sx={{ color: '#2c3035', mr: 1 }} />,
          }}
          sx={{
            flex: '1 1 300px',
            '& .MuiOutlinedInput-root': {
              color: '#fff',
              bgcolor: '#1e293b',
              borderRadius: 2,
              '& fieldset': { borderColor: '#334155' },
              '&:hover fieldset': { borderColor: '#475569' },
              '&.Mui-focused fieldset': { borderColor: '#4f46e5' },
            },
          }}
        />
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel sx={{ color: '#94a3b8' }}>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Status"
            sx={{
              color: '#fff',
              bgcolor: '#1e293b',
              borderRadius: 2,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#475569' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#4f46e5' },
            }}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="SUSPENDED">Suspended</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel sx={{ color: '#94a3b8' }}>Account Type</InputLabel>
          <Select
            value={accountTypeFilter}
            onChange={(e) => setAccountTypeFilter(e.target.value)}
            label="Account Type"
            sx={{
              color: '#fff',
              bgcolor: '#1e293b',
              borderRadius: 2,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#475569' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#4f46e5' },
            }}
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="ORCID">ORCID Researcher</MenuItem>
            <MenuItem value="INSTITUTION_ADMIN">Institution Admin</MenuItem>
            <MenuItem value="GLOBAL_ADMIN">Global Admin</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Users Table */}
      <Box sx={{ bgcolor: '#1e293b', borderRadius: 3, border: '1px solid #334155', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#0f172a' }}>
                <TableCell sx={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #334155' }}>User</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #334155' }}>Account Type</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #334155' }}>Institution</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #334155' }}>Status</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #334155' }}>Joined</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #334155' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} sx={{ '&:hover': { bgcolor: '#0f172a' } }}>
                  <TableCell sx={{ borderBottom: '1px solid #334155' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: '#4f46e5', fontSize: 14 }}>
                        {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </Avatar>
                      <Box>
                        <Typography sx={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
                          {user.name || 'No name'}
                        </Typography>
                        <Typography sx={{ color: '#2c3035', fontSize: 12 }}>
                          {user.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #334155' }}>
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
                  <TableCell sx={{ color: '#94a3b8', fontSize: 13, borderBottom: '1px solid #334155' }}>
                    {user.institution_id ? 
                      institutions.find(i => i.id === user.institution_id)?.name || `ID: ${user.institution_id}` :
                      '-'
                    }
                  </TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #334155' }}>
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
                  <TableCell sx={{ color: '#94a3b8', fontSize: 13, borderBottom: '1px solid #334155' }}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #334155' }}>
                    <Button
                      size="small"
                      onClick={() => {
                        setSelectedUser(user);
                        setUserDetailsOpen(true);
                      }}
                      sx={{
                        color: '#818cf8',
                        textTransform: 'none',
                        fontSize: 12,
                        fontWeight: 600,
                        '&:hover': { bgcolor: 'rgba(129, 140, 248, 0.1)' },
                      }}
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
            <Typography sx={{ color: '#2c3035', fontSize: 14 }}>No users found</Typography>
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
            bgcolor: '#1e293b',
            borderRadius: 3,
            border: '1px solid #334155',
          },
        }}
      >
        {selectedUser && (
          <>
            <DialogTitle sx={{ color: '#fff', fontSize: 18, fontWeight: 700, borderBottom: '1px solid #334155' }}>
              User Details
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ width: 64, height: 64, bgcolor: '#4f46e5', fontSize: 24 }}>
                    {selectedUser.name?.charAt(0) || selectedUser.email?.charAt(0) || 'U'}
                  </Avatar>
                  <Box>
                    <Typography sx={{ color: '#fff', fontSize: 20, fontWeight: 600 }}>
                      {selectedUser.name || 'No name'}
                    </Typography>
                    <Typography sx={{ color: '#2c3035', fontSize: 14 }}>
                      {selectedUser.email}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography sx={{ color: '#2c3035', fontSize: 12, mb: 0.5 }}>Account Type</Typography>
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
                    <Typography sx={{ color: '#2c3035', fontSize: 12, mb: 0.5 }}>Status</Typography>
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
                    <Typography sx={{ color: '#2c3035', fontSize: 12, mb: 0.5 }}>Institution</Typography>
                    <Typography sx={{ color: '#fff', fontSize: 14 }}>
                      {selectedUser.institution_id ? 
                        institutions.find(i => i.id === selectedUser.institution_id)?.name || `ID: ${selectedUser.institution_id}` :
                        'None'
                      }
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#2c3035', fontSize: 12, mb: 0.5 }}>User ID</Typography>
                    <Typography sx={{ color: '#fff', fontSize: 14 }}>{selectedUser.id}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#2c3035', fontSize: 12, mb: 0.5 }}>Joined</Typography>
                    <Typography sx={{ color: '#fff', fontSize: 14 }}>
                      {new Date(selectedUser.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#2c3035', fontSize: 12, mb: 0.5 }}>Last Login</Typography>
                    <Typography sx={{ color: '#fff', fontSize: 14 }}>
                      {selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleDateString() : 'Never'}
                    </Typography>
                  </Box>
                </Box>

                {selectedUser.orcid_id && (
                  <Box>
                    <Typography sx={{ color: '#2c3035', fontSize: 12, mb: 0.5 }}>ORCID iD</Typography>
                    <Typography sx={{ color: '#fff', fontSize: 14 }}>{selectedUser.orcid_id}</Typography>
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3, borderTop: '1px solid #334155', pt: 2 }}>
              <Button
                onClick={() => setUserDetailsOpen(false)}
                sx={{
                  color: '#94a3b8',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { bgcolor: 'rgba(148, 163, 184, 0.1)' },
                }}
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
