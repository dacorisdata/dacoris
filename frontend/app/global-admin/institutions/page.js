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
} from '@mui/material';
import {
  Add as AddIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { globalAdminAPI } from '../../../lib/api';

export default function InstitutionsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [institutionDialogOpen, setInstitutionDialogOpen] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  
  const [institutionForm, setInstitutionForm] = useState({
    name: '',
    domain: '',
    verified_domains: '',
  });
  const [adminForm, setAdminForm] = useState({
    email: '',
    name: '',
    password: '',
  });

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
      const response = await globalAdminAPI.listInstitutions();
      setInstitutions(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load institutions');
      setLoading(false);
    }
  };

  const handleCreateInstitution = async () => {
    try {
      await globalAdminAPI.createInstitution(institutionForm);
      setSuccess('Institution created successfully');
      setInstitutionDialogOpen(false);
      setInstitutionForm({ name: '', domain: '', verified_domains: '' });
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create institution');
    }
  };

  const handleCreateAdmin = async () => {
    if (!selectedInstitution) return;
    try {
      await globalAdminAPI.createInstitutionAdmin(selectedInstitution.id, {
        ...adminForm,
        institution_id: selectedInstitution.id,
      });
      setSuccess('Institution admin created successfully');
      setAdminDialogOpen(false);
      setAdminForm({ email: '', name: '', password: '' });
      setSelectedInstitution(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create admin');
    }
  };

  const handleToggleInstitutionStatus = async (id) => {
    try {
      await globalAdminAPI.toggleInstitutionStatus(id);
      setSuccess('Institution status updated');
      loadData();
    } catch (err) {
      setError('Failed to update institution status');
    }
  };

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
          <Typography sx={{ color: '#fff', fontSize: 24, fontWeight: 700, mb: 0.5 }}>Institutions</Typography>
          <Typography sx={{ color: '#2c3035', fontSize: 14 }}>Manage all registered institutions</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setInstitutionDialogOpen(true)}
          sx={{
            bgcolor: '#4f46e5',
            color: '#fff',
            textTransform: 'none',
            borderRadius: 2,
            px: 3,
            py: 1.5,
            fontSize: 14,
            fontWeight: 600,
            '&:hover': { bgcolor: '#4338ca' },
          }}
        >
          Create Institution
        </Button>
      </Box>

      {/* Alerts */}
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

      {/* Institutions Table */}
      <Box sx={{ bgcolor: '#1e293b', borderRadius: 3, border: '1px solid #334155', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#0f172a' }}>
                <TableCell sx={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #334155' }}>Name</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #334155' }}>Domain</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #334155' }}>Status</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #334155' }}>Created</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #334155' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {institutions.map((institution) => (
                <TableRow key={institution.id} sx={{ '&:hover': { bgcolor: '#0f172a' } }}>
                  <TableCell sx={{ color: '#fff', fontSize: 14, fontWeight: 600, borderBottom: '1px solid #334155' }}>{institution.name}</TableCell>
                  <TableCell sx={{ color: '#94a3b8', fontSize: 13, borderBottom: '1px solid #334155' }}>{institution.domain}</TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #334155' }}>
                    <Chip
                      label={institution.is_active ? 'Active' : 'Inactive'}
                      size="small"
                      sx={{
                        bgcolor: institution.is_active ? 'rgba(34, 197, 94, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                        color: institution.is_active ? '#22c55e' : '#2c3035',
                        border: 'none',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: '#94a3b8', fontSize: 13, borderBottom: '1px solid #334155' }}>
                    {new Date(institution.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #334155' }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        startIcon={<PersonAddIcon />}
                        onClick={() => {
                          setSelectedInstitution(institution);
                          setAdminDialogOpen(true);
                        }}
                        sx={{
                          color: '#818cf8',
                          textTransform: 'none',
                          fontSize: 12,
                          fontWeight: 600,
                          '&:hover': { bgcolor: 'rgba(129, 140, 248, 0.1)' },
                        }}
                      >
                        Add Admin
                      </Button>
                      <Button
                        size="small"
                        onClick={() => handleToggleInstitutionStatus(institution.id)}
                        sx={{
                          color: '#94a3b8',
                          textTransform: 'none',
                          fontSize: 12,
                          fontWeight: 600,
                          '&:hover': { bgcolor: 'rgba(148, 163, 184, 0.1)' },
                        }}
                      >
                        {institution.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Create Institution Dialog */}
      <Dialog
        open={institutionDialogOpen}
        onClose={() => setInstitutionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1e293b',
            borderRadius: 3,
            border: '1px solid #334155',
          },
        }}
      >
        <DialogTitle sx={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>Create New Institution</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Institution Name"
            fullWidth
            value={institutionForm.name}
            onChange={(e) => setInstitutionForm({ ...institutionForm, name: e.target.value })}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                bgcolor: '#0f172a',
                '& fieldset': { borderColor: '#334155' },
                '&:hover fieldset': { borderColor: '#475569' },
                '&.Mui-focused fieldset': { borderColor: '#4f46e5' },
              },
              '& .MuiInputLabel-root': { color: '#94a3b8' },
            }}
          />
          <TextField
            margin="dense"
            label="Primary Domain"
            fullWidth
            placeholder="example.edu"
            value={institutionForm.domain}
            onChange={(e) => setInstitutionForm({ ...institutionForm, domain: e.target.value })}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                bgcolor: '#0f172a',
                '& fieldset': { borderColor: '#334155' },
                '&:hover fieldset': { borderColor: '#475569' },
                '&.Mui-focused fieldset': { borderColor: '#4f46e5' },
              },
              '& .MuiInputLabel-root': { color: '#94a3b8' },
            }}
          />
          <TextField
            margin="dense"
            label="Verified Domains (comma-separated)"
            fullWidth
            placeholder="example.edu, example.org"
            value={institutionForm.verified_domains}
            onChange={(e) => setInstitutionForm({ ...institutionForm, verified_domains: e.target.value })}
            helperText="Users with these email domains will be auto-approved"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                bgcolor: '#0f172a',
                '& fieldset': { borderColor: '#334155' },
                '&:hover fieldset': { borderColor: '#475569' },
                '&.Mui-focused fieldset': { borderColor: '#4f46e5' },
              },
              '& .MuiInputLabel-root': { color: '#94a3b8' },
              '& .MuiFormHelperText-root': { color: '#2c3035' },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setInstitutionDialogOpen(false)}
            sx={{
              color: '#94a3b8',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { bgcolor: 'rgba(148, 163, 184, 0.1)' },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateInstitution}
            variant="contained"
            sx={{
              bgcolor: '#4f46e5',
              color: '#fff',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { bgcolor: '#4338ca' },
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Institution Admin Dialog */}
      <Dialog
        open={adminDialogOpen}
        onClose={() => setAdminDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1e293b',
            borderRadius: 3,
            border: '1px solid #334155',
          },
        }}
      >
        <DialogTitle sx={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>
          Create Institution Admin
          {selectedInstitution && (
            <Typography sx={{ color: '#2c3035', fontSize: 14, fontWeight: 400, mt: 0.5 }}>
              {selectedInstitution.name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            value={adminForm.email}
            onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                bgcolor: '#0f172a',
                '& fieldset': { borderColor: '#334155' },
                '&:hover fieldset': { borderColor: '#475569' },
                '&.Mui-focused fieldset': { borderColor: '#4f46e5' },
              },
              '& .MuiInputLabel-root': { color: '#94a3b8' },
            }}
          />
          <TextField
            margin="dense"
            label="Name"
            fullWidth
            value={adminForm.name}
            onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                bgcolor: '#0f172a',
                '& fieldset': { borderColor: '#334155' },
                '&:hover fieldset': { borderColor: '#475569' },
                '&.Mui-focused fieldset': { borderColor: '#4f46e5' },
              },
              '& .MuiInputLabel-root': { color: '#94a3b8' },
            }}
          />
          <TextField
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            value={adminForm.password}
            onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
            helperText="Minimum 8 characters"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                bgcolor: '#0f172a',
                '& fieldset': { borderColor: '#334155' },
                '&:hover fieldset': { borderColor: '#475569' },
                '&.Mui-focused fieldset': { borderColor: '#4f46e5' },
              },
              '& .MuiInputLabel-root': { color: '#94a3b8' },
              '& .MuiFormHelperText-root': { color: '#2c3035' },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setAdminDialogOpen(false)}
            sx={{
              color: '#94a3b8',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { bgcolor: 'rgba(148, 163, 184, 0.1)' },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateAdmin}
            variant="contained"
            sx={{
              bgcolor: '#4f46e5',
              color: '#fff',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { bgcolor: '#4338ca' },
            }}
          >
            Create Admin
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
