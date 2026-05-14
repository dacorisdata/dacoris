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
  Autocomplete,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  PersonAdd as PersonAddIcon,
  Category as CategoryIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '@mui/material/styles';
import { globalAdminAPI } from '../../../lib/api';

export default function InstitutionsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  
  const [institutions, setInstitutions] = useState([]);
  const [institutionCategoriesMap, setInstitutionCategoriesMap] = useState({});
  const [institutionAdminCounts, setInstitutionAdminCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [institutionDialogOpen, setInstitutionDialogOpen] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  
  const [institutionForm, setInstitutionForm] = useState({
    name: '',
    domain: '',
    verified_domains: '',
    category_ids: [],
  });
  const [adminForm, setAdminForm] = useState({
    email: '',
    name: '',
    password: '',
  });
  
  const [categories, setCategories] = useState([]);
  const [institutionCategories, setInstitutionCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [institutionAdmins, setInstitutionAdmins] = useState([]);
  const [showAddAdminForm, setShowAddAdminForm] = useState(false);

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
      await loadCategories();
      await loadInstitutionCategories(response.data);
      await loadInstitutionAdminCounts(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load institutions');
      setLoading(false);
    }
  };

  const handleCreateInstitution = async () => {
    if (institutionForm.category_ids.length === 0) {
      setError('Please select at least one category');
      return;
    }
    
    try {
      const response = await globalAdminAPI.createInstitution({
        name: institutionForm.name,
        domain: institutionForm.domain,
        verified_domains: institutionForm.verified_domains,
      });
      
      const institutionId = response.data.id;
      
      const token = localStorage.getItem('token');
      await fetch(`/api/global-admin/institutions/${institutionId}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ category_ids: institutionForm.category_ids })
      });
      
      setSuccess('Institution created successfully with categories assigned');
      setInstitutionDialogOpen(false);
      setInstitutionForm({ name: '', domain: '', verified_domains: '', category_ids: [] });
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create institution');
    }
  };

  const handleOpenAdminDialog = async (institution) => {
    setSelectedInstitution(institution);
    setAdminDialogOpen(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/global-admin/institutions/${institution.id}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const users = await response.json();
      const admins = users.filter(user => user.is_institution_admin);
      setInstitutionAdmins(admins);
      setShowAddAdminForm(admins.length === 0);
    } catch (err) {
      console.error('Failed to load institution admins:', err);
      setInstitutionAdmins([]);
      setShowAddAdminForm(true);
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
      setAdminForm({ email: '', name: '', password: '' });
      setShowAddAdminForm(false);
      
      // Reload admin counts and dialog to reflect changes
      setTimeout(async () => {
        await loadInstitutionAdminCounts(institutions);
      }, 100);
      await handleOpenAdminDialog(selectedInstitution);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create admin');
    }
  };

  const handleDeleteAdmin = async (userId) => {
    if (!selectedInstitution) return;
    
    if (!confirm('Are you sure you want to delete this admin? This action cannot be undone.')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/global-admin/institutions/${selectedInstitution.id}/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete admin');
      }
      
      setSuccess('Admin deleted successfully');
      
      // Reload admin counts and dialog to reflect changes
      setTimeout(async () => {
        await loadInstitutionAdminCounts(institutions);
      }, 100);
      await handleOpenAdminDialog(selectedInstitution);
    } catch (err) {
      setError(err.message || 'Failed to delete admin');
    }
  };

  const handleSetPrimaryAdmin = async (userId) => {
    if (!selectedInstitution) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/global-admin/institutions/${selectedInstitution.id}/set-primary-admin/${userId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to set primary admin');
      }
      
      setSuccess('Primary admin set successfully');
      
      // Reload institutions and dialog to reflect changes
      await loadData();
      await handleOpenAdminDialog(selectedInstitution);
    } catch (err) {
      setError(err.message || 'Failed to set primary admin');
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

  const loadCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/global-admin/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadInstitutionCategories = async (institutionsList) => {
    try {
      const token = localStorage.getItem('token');
      const categoriesMap = {};
      
      await Promise.all(
        institutionsList.map(async (institution) => {
          try {
            const response = await fetch(`/api/global-admin/institutions/${institution.id}/categories`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            categoriesMap[institution.id] = data;
          } catch (err) {
            categoriesMap[institution.id] = [];
          }
        })
      );
      
      setInstitutionCategoriesMap(categoriesMap);
    } catch (err) {
      console.error('Failed to load institution categories:', err);
    }
  };

  const loadInstitutionAdminCounts = async (institutionsList) => {
    try {
      const token = localStorage.getItem('token');
      const adminCounts = {};
      
      await Promise.all(
        institutionsList.map(async (institution) => {
          try {
            const response = await fetch(`/api/global-admin/institutions/${institution.id}/users`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const users = await response.json();
            const adminCount = users.filter(user => user.is_institution_admin).length;
            adminCounts[institution.id] = adminCount;
          } catch (err) {
            adminCounts[institution.id] = 0;
          }
        })
      );
      
      setInstitutionAdminCounts(adminCounts);
    } catch (err) {
      console.error('Failed to load institution admin counts:', err);
    }
  };

  const handleOpenCategoryDialog = async (institution) => {
    setSelectedInstitution(institution);
    await loadCategories();
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/global-admin/institutions/${institution.id}/categories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setInstitutionCategories(data);
      setSelectedCategories(data.map(ic => ic.category_id));
    } catch (err) {
      console.error('Failed to load institution categories:', err);
    }
    
    setCategoryDialogOpen(true);
  };

  const handleAssignCategories = async () => {
    if (!selectedInstitution) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/global-admin/institutions/${selectedInstitution.id}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ category_ids: selectedCategories })
      });
      
      if (!response.ok) throw new Error('Failed to assign categories');
      
      setSuccess('Categories assigned successfully');
      setCategoryDialogOpen(false);
      setSelectedInstitution(null);
      setSelectedCategories([]);
      
      // Reload institution categories to reflect changes in the table
      setTimeout(async () => {
        await loadInstitutionCategories(institutions);
      }, 100);
    } catch (err) {
      setError(err.message);
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
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>Institutions</Typography>
          <Typography variant="body2" color="text.secondary">Manage all registered institutions</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setInstitutionDialogOpen(true)}
          sx={{
            textTransform: 'none',
            borderRadius: 2,
            px: 3,
            py: 1.5,
            fontSize: 14,
            fontWeight: 600,
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
      <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', borderBottom: 1, borderColor: 'divider' }}>Name</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', borderBottom: 1, borderColor: 'divider' }}>Domain</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', borderBottom: 1, borderColor: 'divider' }}>Categories</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', borderBottom: 1, borderColor: 'divider' }}>Admins</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', borderBottom: 1, borderColor: 'divider' }}>Status</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', borderBottom: 1, borderColor: 'divider' }}>Created</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', borderBottom: 1, borderColor: 'divider' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {institutions.map((institution) => {
                const assignedCategories = institutionCategoriesMap[institution.id] || [];
                const categoryObjects = assignedCategories.map(ic => 
                  categories.find(cat => cat.id === ic.category_id)
                ).filter(Boolean);
                const adminCount = institutionAdminCounts[institution.id] || 0;
                
                return (
                <TableRow key={institution.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                  <TableCell sx={{ fontSize: 14, fontWeight: 600, borderBottom: 1, borderColor: 'divider' }}>{institution.name}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 13, borderBottom: 1, borderColor: 'divider' }}>{institution.domain}</TableCell>
                  <TableCell sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tooltip 
                      title={categoryObjects.length > 0 ? 'Click to manage categories' : 'Click to assign categories'}
                      arrow
                    >
                      <Box
                        onClick={() => handleOpenCategoryDialog(institution)}
                        sx={{
                          cursor: 'pointer',
                          display: 'flex',
                          gap: 0.5,
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          '&:hover': {
                            opacity: 0.8,
                          },
                        }}
                      >
                        {categoryObjects.length > 0 ? (
                          categoryObjects.map((cat) => (
                            <Chip
                              key={cat.id}
                              label={cat.name}
                              size="small"
                              sx={{
                                bgcolor: cat.color,
                                color: theme.palette.getContrastText(cat.color),
                                fontSize: 11,
                                fontWeight: 600,
                              }}
                            />
                          ))
                        ) : (
                          <Typography
                            variant="body2"
                            sx={{
                              color: 'text.secondary',
                              fontSize: 13,
                              fontStyle: 'italic',
                            }}
                          >
                            Assign Categories
                          </Typography>
                        )}
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tooltip 
                      title={adminCount > 0 ? `${adminCount} admin${adminCount > 1 ? 's' : ''} assigned` : 'Click to add admin'}
                      arrow
                    >
                      <Box
                        onClick={() => handleOpenAdminDialog(institution)}
                        sx={{
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          '&:hover': {
                            opacity: 0.8,
                          },
                        }}
                      >
                        {adminCount > 0 ? (
                          <Chip
                            label={`${adminCount} Admin${adminCount > 1 ? 's' : ''}`}
                            size="small"
                            color="primary"
                            sx={{
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          />
                        ) : (
                          <Typography
                            variant="body2"
                            sx={{
                              color: 'text.secondary',
                              fontSize: 13,
                              fontStyle: 'italic',
                            }}
                          >
                            Add Admin
                          </Typography>
                        )}
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Chip
                      label={institution.is_active ? 'Active' : 'Inactive'}
                      size="small"
                      color={institution.is_active ? 'success' : 'default'}
                      sx={{
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 13, borderBottom: 1, borderColor: 'divider' }}>
                    {new Date(institution.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button
                        size="small"
                        startIcon={<CategoryIcon />}
                        onClick={() => handleOpenCategoryDialog(institution)}
                        color="success"
                        sx={{
                          textTransform: 'none',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        Categories
                      </Button>
                      <Button
                        size="small"
                        startIcon={<PersonAddIcon />}
                        onClick={() => handleOpenAdminDialog(institution)}
                        color="primary"
                        sx={{
                          textTransform: 'none',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        Add Admin
                      </Button>
                      <Button
                        size="small"
                        onClick={() => handleToggleInstitutionStatus(institution.id)}
                        sx={{
                          textTransform: 'none',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {institution.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
                );
              })}
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
            bgcolor: 'background.paper',
            borderRadius: 3,
            border: 1,
            borderColor: 'divider',
          },
        }}
      >
        <DialogTitle sx={{ fontSize: 18, fontWeight: 700 }}>Create New Institution</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Institution Name"
            fullWidth
            value={institutionForm.name}
            onChange={(e) => setInstitutionForm({ ...institutionForm, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Primary Domain"
            fullWidth
            placeholder="example.edu"
            value={institutionForm.domain}
            onChange={(e) => setInstitutionForm({ ...institutionForm, domain: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Verified Domains (comma-separated)"
            fullWidth
            placeholder="example.edu, example.org"
            value={institutionForm.verified_domains}
            onChange={(e) => setInstitutionForm({ ...institutionForm, verified_domains: e.target.value })}
            helperText="Users with these email domains will be auto-approved"
            sx={{ mb: 3 }}
          />
          
          <Autocomplete
            multiple
            options={categories}
            getOptionLabel={(option) => option.name}
            value={categories.filter(cat => institutionForm.category_ids.includes(cat.id))}
            onChange={(event, newValue) => {
              setInstitutionForm(prev => ({
                ...prev,
                category_ids: newValue.map(cat => cat.id)
              }));
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Institution Categories *"
                placeholder="Select categories..."
                helperText="Select at least one category for this institution"
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: 1,
                    bgcolor: option.color,
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {option.name}
                  </Typography>
                  {option.description && (
                    <Typography variant="caption" color="text.secondary">
                      {option.description}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  {...getTagProps({ index })}
                  label={option.name}
                  size="small"
                  sx={{
                    bgcolor: option.color,
                    color: theme.palette.getContrastText(option.color),
                    fontWeight: 600,
                    '& .MuiChip-deleteIcon': {
                      color: theme.palette.getContrastText(option.color),
                      opacity: 0.7,
                      '&:hover': {
                        opacity: 1,
                      },
                    },
                  }}
                />
              ))
            }
            noOptionsText="No categories available. Create categories first."
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setInstitutionDialogOpen(false)}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateInstitution}
            variant="contained"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Institution Admin Dialog */}
      <Dialog
        open={adminDialogOpen}
        onClose={() => {
          setAdminDialogOpen(false);
          setShowAddAdminForm(false);
          setAdminForm({ email: '', name: '', password: '' });
        }}
        maxWidth="sm"
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
        <DialogTitle sx={{ fontSize: 18, fontWeight: 700 }}>
          {institutionAdmins.length > 0 ? 'Institution Admins' : 'Create Institution Admin'}
          {selectedInstitution && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {selectedInstitution.name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {institutionAdmins.length > 0 && !showAddAdminForm && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Current institution administrators
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                {institutionAdmins.map((admin) => {
                  const isPrimary = selectedInstitution?.primary_admin_id === admin.id;
                  return (
                  <Box
                    key={admin.id}
                    sx={{
                      p: 2,
                      bgcolor: isPrimary ? 'action.hover' : 'background.default',
                      border: 1,
                      borderColor: isPrimary ? 'primary.main' : 'divider',
                      borderRadius: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {admin.name}
                          </Typography>
                          <Tooltip title={isPrimary ? "Primary Admin" : "Set as Primary Admin"} arrow>
                            <StarIcon 
                              onClick={() => !isPrimary && handleSetPrimaryAdmin(admin.id)}
                              sx={{ 
                                fontSize: 18, 
                                color: isPrimary ? 'warning.main' : 'action.disabled',
                                cursor: isPrimary ? 'default' : 'pointer',
                                '&:hover': {
                                  color: isPrimary ? 'warning.main' : 'warning.light',
                                },
                              }} 
                            />
                          </Tooltip>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {admin.email}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Chip
                            label="Institution Admin"
                            size="small"
                            color="primary"
                            sx={{ fontSize: 11, fontWeight: 600 }}
                          />
                          {isPrimary && (
                            <Chip
                              label="Primary"
                              size="small"
                              color="warning"
                              sx={{ fontSize: 11, fontWeight: 600 }}
                            />
                          )}
                        </Box>
                      </Box>
                      <Tooltip title="Delete Admin" arrow>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => handleDeleteAdmin(admin.id)}
                          sx={{
                            minWidth: 'auto',
                            p: 1,
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </Button>
                      </Tooltip>
                    </Box>
                  </Box>
                  );
                })}
              </Box>
              
              <Button
                variant="outlined"
                startIcon={<PersonAddIcon />}
                onClick={() => setShowAddAdminForm(true)}
                fullWidth
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                }}
              >
                Add Another Admin
              </Button>
            </Box>
          )}
          
          {(institutionAdmins.length === 0 || showAddAdminForm) && (
            <Box>
              {showAddAdminForm && institutionAdmins.length > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Add a new administrator
                </Typography>
              )}
              
              <TextField
                autoFocus
                margin="dense"
                label="Email"
                type="email"
                fullWidth
                value={adminForm.email}
                onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                margin="dense"
                label="Name"
                fullWidth
                value={adminForm.name}
                onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                margin="dense"
                label="Password"
                type="password"
                fullWidth
                value={adminForm.password}
                onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                helperText="Minimum 8 characters"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => {
              setAdminDialogOpen(false);
              setShowAddAdminForm(false);
              setAdminForm({ email: '', name: '', password: '' });
            }}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {showAddAdminForm && institutionAdmins.length > 0 ? 'Cancel' : 'Close'}
          </Button>
          {(institutionAdmins.length === 0 || showAddAdminForm) && (
            <Button
              onClick={handleCreateAdmin}
              variant="contained"
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Create Admin
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Manage Categories Dialog */}
      <Dialog
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
        maxWidth="sm"
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
        <DialogTitle sx={{ fontSize: 18, fontWeight: 700 }}>
          Manage Categories
          {selectedInstitution && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {selectedInstitution.name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select which opportunity categories this institution can access
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {categories.map((category) => (
              <Box
                key={category.id}
                onClick={() => {
                  setSelectedCategories(prev => 
                    prev.includes(category.id)
                      ? prev.filter(id => id !== category.id)
                      : [...prev, category.id]
                  );
                }}
                sx={{
                  p: 2,
                  bgcolor: selectedCategories.includes(category.id) ? 'success.light' : 'background.default',
                  border: 1,
                  borderColor: selectedCategories.includes(category.id) ? 'success.main' : 'divider',
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: selectedCategories.includes(category.id) ? 'success.light' : 'action.hover',
                    borderColor: selectedCategories.includes(category.id) ? 'success.main' : 'action.selected',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: 1,
                        bgcolor: category.color,
                      }}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {category.name}
                    </Typography>
                  </Box>
                  {selectedCategories.includes(category.id) && (
                    <Chip
                      label="Selected"
                      size="small"
                      color="success"
                      sx={{
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    />
                  )}
                </Box>
                {category.description && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    {category.description}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
          
          {categories.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                No categories available. Create categories first.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setCategoryDialogOpen(false)}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssignCategories}
            variant="contained"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Save Categories
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
