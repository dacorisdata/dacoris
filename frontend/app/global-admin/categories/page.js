'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Box, Typography, Button, Card, CardContent, Chip, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, CircularProgress, Grid, Menu, MenuItem, Divider,
  List, ListItem, ListItemText, TablePagination, FormControl, InputLabel,
  Select, InputAdornment, TableSortLabel
} from '@mui/material';
import { 
  Add, Edit, Delete, Category as CategoryIcon, 
  Download, Upload, Autorenew, MoreVert, Search, FilterList
} from '@mui/icons-material';

export default function GlobalAdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    slug: '',
    color: '#3B82F6',
    icon: ''
  });
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const fileInputRef = useRef(null);
  
  // Table state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/global-admin/categories', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch categories');
      
      const data = await response.json();
      setCategories(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        slug: category.slug,
        color: category.color,
        icon: category.icon || ''
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        description: '',
        slug: '',
        color: '#3B82F6',
        icon: ''
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      slug: '',
      color: '#3B82F6',
      icon: ''
    });
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    setFormData(prev => ({
      ...prev,
      name,
      slug: editingCategory ? prev.slug : generateSlug(name)
    }));
  };

  const handleSubmit = async () => {
    try {
      const url = editingCategory
        ? `/api/global-admin/categories/${editingCategory.id}`
        : '/api/global-admin/categories';
      
      const method = editingCategory ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save category');
      }
      
      setSuccess(editingCategory ? 'Category updated successfully' : 'Category created successfully');
      handleCloseDialog();
      await fetchCategories();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (categoryId) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/global-admin/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete category');
      }
      
      setSuccess('Category deleted successfully');
      await fetchCategories();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSeedFromExcel = async () => {
    if (!confirm('This will create categories from the opportunities Excel file. Continue?')) {
      return;
    }

    try {
      setSeeding(true);
      setMenuAnchor(null);
      const response = await fetch('/api/global-admin/categories/seed-from-excel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to seed categories');
      }
      
      const result = await response.json();
      setSuccess(
        `Seeded ${result.created_count} new categories. ` +
        `Skipped ${result.skipped_count} existing categories.`
      );
      await fetchCategories();
    } catch (err) {
      setError(err.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setMenuAnchor(null);
      const response = await fetch('/api/global-admin/categories/export-csv', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to export categories');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `categories_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSuccess('Categories exported successfully');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleImportCSV = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setMenuAnchor(null);
      const response = await fetch('/api/global-admin/categories/import-csv', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to import categories');
      }
      
      const result = await response.json();
      setImportResult(result);
      setImportDialogOpen(true);
      
      if (result.created > 0 || result.updated > 0) {
        await fetchCategories();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Filter categories
  const filteredCategories = categories.filter(cat => {
    const matchesSearch = cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         cat.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (cat.description && cat.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && cat.is_active) ||
                         (statusFilter === 'inactive' && !cat.is_active);
    
    return matchesSearch && matchesStatus;
  });

  // Sort categories
  const sortedCategories = [...filteredCategories].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];
    
    if (sortBy === 'is_active') {
      aValue = a.is_active ? 1 : 0;
      bValue = b.is_active ? 1 : 0;
    }
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Paginate categories
  const paginatedCategories = sortedCategories.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Opportunity Categories
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<MoreVert />}
            onClick={(e) => setMenuAnchor(e.currentTarget)}
          >
            Actions
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Create Category
          </Button>
        </Box>
      </Box>

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={handleSeedFromExcel} disabled={seeding}>
          <Autorenew sx={{ mr: 1 }} />
          {seeding ? 'Seeding...' : 'Seed from Excel'}
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleExportCSV}>
          <Download sx={{ mr: 1 }} />
          Export to CSV
        </MenuItem>
        <MenuItem onClick={() => fileInputRef.current?.click()}>
          <Upload sx={{ mr: 1 }} />
          Import from CSV
        </MenuItem>
      </Menu>

      {/* Hidden file input for CSV import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleImportCSV}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Filters */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(0);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ flex: '1 1 300px' }}
        />
        
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Table */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'name'}
                    direction={sortBy === 'name' ? sortOrder : 'asc'}
                    onClick={() => handleSort('name')}
                  >
                    Name
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'slug'}
                    direction={sortBy === 'slug' ? sortOrder : 'asc'}
                    onClick={() => handleSort('slug')}
                  >
                    Slug
                  </TableSortLabel>
                </TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Color</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'is_active'}
                    direction={sortBy === 'is_active' ? sortOrder : 'asc'}
                    onClick={() => handleSort('is_active')}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <CategoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      No categories found
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      {searchQuery || statusFilter !== 'all' 
                        ? 'Try adjusting your filters'
                        : 'Create your first category to start organizing opportunities'
                      }
                    </Typography>
                    {!searchQuery && statusFilter === 'all' && (
                      <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => handleOpenDialog()}
                      >
                        Create Category
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCategories.map((category) => (
                  <TableRow key={category.id} hover>
                    <TableCell>
                      <Chip
                        label={category.name}
                        sx={{ 
                          bgcolor: category.color,
                          color: 'white',
                          fontWeight: 600
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {category.slug}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300 }}>
                        {category.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: 1,
                            bgcolor: category.color,
                            border: 1,
                            borderColor: 'divider'
                          }}
                        />
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                          {category.color}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={category.is_active ? 'Active' : 'Inactive'}
                        size="small"
                        color={category.is_active ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpenDialog(category)}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(category.id)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Pagination */}
        <TablePagination
          component="div"
          count={sortedCategories.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50, 100]}
        />
      </Paper>

      {/* Create/Edit Category Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategory ? 'Edit Category' : 'Create New Category'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Category Name"
              value={formData.name}
              onChange={handleNameChange}
              fullWidth
              required
              placeholder="e.g., Health, Agriculture, Education"
            />
            
            <TextField
              label="Slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              fullWidth
              required
              helperText="URL-friendly identifier (auto-generated from name)"
            />
            
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
              placeholder="Brief description of this category"
            />
            
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Color
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  style={{ width: 60, height: 40, border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' }}
                />
                <Chip
                  label="Preview"
                  sx={{ bgcolor: formData.color, color: 'white' }}
                />
                <Typography variant="caption" color="text.secondary">
                  {formData.color}
                </Typography>
              </Box>
            </Box>
            
            <TextField
              label="Icon (optional)"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              fullWidth
              placeholder="e.g., health, agriculture, school"
              helperText="Material icon name (optional)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={!formData.name || !formData.slug}
          >
            {editingCategory ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Result Dialog */}
      <Dialog 
        open={importDialogOpen} 
        onClose={() => setImportDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Import Results</DialogTitle>
        <DialogContent>
          {importResult && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={4}>
                  <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4">{importResult.created}</Typography>
                      <Typography variant="body2">Created</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4">{importResult.updated}</Typography>
                      <Typography variant="body2">Updated</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4">{importResult.skipped}</Typography>
                      <Typography variant="body2">Skipped</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {importResult.duplicates_detected && importResult.duplicates_detected.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Alert severity="warning" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Duplicates Detected ({importResult.duplicates_detected.length})
                    </Typography>
                  </Alert>
                  <Paper sx={{ maxHeight: 200, overflow: 'auto', p: 2 }}>
                    <List dense>
                      {importResult.duplicates_detected.map((dup, idx) => (
                        <ListItem key={idx}>
                          <ListItemText 
                            primary={dup}
                            primaryTypographyProps={{ variant: 'body2', color: 'warning.main' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Box>
              )}

              {importResult.errors && importResult.errors.length > 0 && (
                <Box>
                  <Alert severity="error" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Errors ({importResult.errors.length})
                    </Typography>
                  </Alert>
                  <Paper sx={{ maxHeight: 200, overflow: 'auto', p: 2 }}>
                    <List dense>
                      {importResult.errors.map((error, idx) => (
                        <ListItem key={idx}>
                          <ListItemText 
                            primary={error}
                            primaryTypographyProps={{ variant: 'body2', color: 'error.main' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Box>
              )}

              {importResult.errors.length === 0 && importResult.duplicates_detected.length === 0 && (
                <Alert severity="success">
                  All categories imported successfully!
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
