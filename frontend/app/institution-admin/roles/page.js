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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormGroup,
  FormControlLabel,
  useTheme,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { institutionAdminAPI } from '../../../lib/api';

export default function InstitutionAdminRolesPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: [],
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
    if (!userData.is_institution_admin) {
      if (userData.is_global_admin) {
        router.push('/global-admin/dashboard');
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
      const response = await institutionAdminAPI.getRoles();
      setRoles(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load roles');
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    try {
      await institutionAdminAPI.createRole(roleForm);
      setSuccess('Role created successfully');
      setRoleDialogOpen(false);
      setRoleForm({ name: '', description: '', permissions: [] });
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create role');
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
          <Typography sx={{ color: theme.palette.text.primary, fontSize: 24, fontWeight: 700, mb: 0.5 }}>Roles & Permissions</Typography>
          <Typography sx={{ color: theme.palette.text.secondary, fontSize: 14 }}>Manage user roles and access control</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setRoleDialogOpen(true)}
          sx={{
            bgcolor: '#1ca7a1',
            color: '#fff',
            textTransform: 'none',
            borderRadius: 2,
            px: 3,
            py: 1.5,
            fontSize: 14,
            fontWeight: 600,
            '&:hover': { bgcolor: '#0e7490' },
          }}
        >
          Create Role
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

      {/* Roles Table */}
      <Box sx={{ 
        bgcolor: theme.palette.background.paper, 
        borderRadius: 3, 
        border: `1px solid ${theme.palette.divider}`, 
        overflow: 'hidden',
        boxShadow: theme.palette.mode === 'light' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
      }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: theme.palette.mode === 'dark' ? '#0f172a' : theme.palette.background.default }}>
                <TableCell sx={{ color: theme.palette.text.secondary, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', borderBottom: `1px solid ${theme.palette.divider}` }}>Role Name</TableCell>
                <TableCell sx={{ color: theme.palette.text.secondary, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', borderBottom: `1px solid ${theme.palette.divider}` }}>Description</TableCell>
                <TableCell sx={{ color: theme.palette.text.secondary, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', borderBottom: `1px solid ${theme.palette.divider}` }}>Users</TableCell>
                <TableCell sx={{ color: theme.palette.text.secondary, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', borderBottom: `1px solid ${theme.palette.divider}` }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id} sx={{ '&:hover': { bgcolor: theme.palette.mode === 'dark' ? '#0f172a' : 'rgba(0,0,0,0.02)' } }}>
                  <TableCell sx={{ color: theme.palette.text.primary, fontSize: 14, fontWeight: 600, borderBottom: `1px solid ${theme.palette.divider}` }}>
                    {role.name}
                  </TableCell>
                  <TableCell sx={{ color: theme.palette.text.secondary, fontSize: 13, borderBottom: `1px solid ${theme.palette.divider}` }}>
                    {role.description || '-'}
                  </TableCell>
                  <TableCell sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                    <Chip
                      label={`${role.user_count || 0} users`}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(8, 145, 178, 0.1)',
                        color: '#1ca7a1',
                        border: 'none',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                    <Button
                      size="small"
                      sx={{
                        color: '#1ca7a1',
                        textTransform: 'none',
                        fontSize: 12,
                        fontWeight: 600,
                        '&:hover': { bgcolor: 'rgba(8, 145, 178, 0.1)' },
                      }}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {roles.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography sx={{ color: theme.palette.text.secondary, fontSize: 14 }}>No roles created yet</Typography>
          </Box>
        )}
      </Box>

      {/* Create Role Dialog */}
      <Dialog
        open={roleDialogOpen}
        onClose={() => setRoleDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: theme.palette.background.paper,
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        <DialogTitle sx={{ color: theme.palette.text.primary, fontSize: 18, fontWeight: 700 }}>Create New Role</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Role Name"
            fullWidth
            value={roleForm.name}
            onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                bgcolor: '#0f172a',
                '& fieldset': { borderColor: '#334155' },
                '&:hover fieldset': { borderColor: '#475569' },
                '&.Mui-focused fieldset': { borderColor: '#1ca7a1' },
              },
              '& .MuiInputLabel-root': { color: '#94a3b8' },
            }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={roleForm.description}
            onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
            sx={{ mb: 2 }}
          />
          <Typography sx={{ color: theme.palette.text.secondary, fontSize: 14, mb: 1 }}>Permissions</Typography>
          <FormGroup>
            <FormControlLabel
              control={<Checkbox sx={{ '&.Mui-checked': { color: '#1ca7a1' } }} />}
              label={<Typography sx={{ color: theme.palette.text.primary, fontSize: 14 }}>View Users</Typography>}
            />
            <FormControlLabel
              control={<Checkbox sx={{ '&.Mui-checked': { color: '#1ca7a1' } }} />}
              label={<Typography sx={{ color: theme.palette.text.primary, fontSize: 14 }}>Manage Users</Typography>}
            />
            <FormControlLabel
              control={<Checkbox sx={{ '&.Mui-checked': { color: '#1ca7a1' } }} />}
              label={<Typography sx={{ color: theme.palette.text.primary, fontSize: 14 }}>Manage Roles</Typography>}
            />
          </FormGroup>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setRoleDialogOpen(false)}
            sx={{
              color: theme.palette.text.secondary,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { bgcolor: theme.palette.mode === 'dark' ? 'rgba(148, 163, 184, 0.1)' : 'rgba(0,0,0,0.05)' },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateRole}
            variant="contained"
            sx={{
              bgcolor: '#1ca7a1',
              color: '#fff',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { bgcolor: '#0e7490' },
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
