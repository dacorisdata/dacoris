'use client';

import { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Card, CardContent, Chip, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions,
  Checkbox, FormControl, InputLabel, Select, MenuItem, OutlinedInput,
  Alert, CircularProgress, TextField, InputAdornment
} from '@mui/material';
import { 
  CheckCircle, Cancel, Edit, Category as CategoryIcon,
  Search, FilterList, Publish, Unpublished
} from '@mui/icons-material';

export default function GlobalAdminOpportunities() {
  const [opportunities, setOpportunities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOpportunities, setSelectedOpportunities] = useState([]);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [selectedOppForCategories, setSelectedOppForCategories] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCurated, setFilterCurated] = useState('all');
  const [syncing, setSyncing] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchOpportunities();
    fetchCategories();
  }, []);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/global-admin/opportunities', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch opportunities');
      
      const data = await response.json();
      setOpportunities(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/global-admin/categories', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch categories');
      
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const toggleCuration = async (opportunityId) => {
    try {
      const response = await fetch(`/api/global-admin/opportunities/${opportunityId}/curate`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to update curation status');
      
      await fetchOpportunities();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBulkCurate = async (curate) => {
    if (selectedOpportunities.length === 0) {
      setError('Please select at least one opportunity');
      return;
    }

    try {
      const response = await fetch('/api/global-admin/opportunities/bulk-curate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          opportunity_ids: selectedOpportunities,
          curate
        })
      });
      
      if (!response.ok) throw new Error('Failed to bulk update');
      
      setSelectedOpportunities([]);
      await fetchOpportunities();
    } catch (err) {
      setError(err.message);
    }
  };

  const openCategoryDialog = (opportunity) => {
    setSelectedOppForCategories(opportunity);
    setSelectedCategories(opportunity.categories.map(c => c.id));
    setCategoryDialogOpen(true);
  };

  const handleAssignCategories = async () => {
    try {
      const response = await fetch(
        `/api/global-admin/opportunities/${selectedOppForCategories.id}/categories`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            category_ids: selectedCategories
          })
        }
      );
      
      if (!response.ok) throw new Error('Failed to assign categories');
      
      setCategoryDialogOpen(false);
      setSelectedOppForCategories(null);
      setSelectedCategories([]);
      await fetchOpportunities();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSyncCategories = async () => {
    if (!confirm('This will migrate categories from the opportunity data to the new category system. Continue?')) {
      return;
    }

    try {
      setSyncing(true);
      const response = await fetch('/api/global-admin/opportunities/migrate-categories', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to migrate categories');
      }
      
      const result = await response.json();
      setSuccess(
        `Migrated ${result.migrated_count} categories. ` +
        `Skipped ${result.skipped_count}. ` +
        (result.not_found_categories.length > 0 
          ? `Missing categories: ${result.not_found_categories.join(', ')}`
          : '')
      );
      await fetchOpportunities();
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedOpportunities(filteredOpportunities.map(opp => opp.id));
    } else {
      setSelectedOpportunities([]);
    }
  };

  const handleSelectOne = (opportunityId) => {
    setSelectedOpportunities(prev => {
      if (prev.includes(opportunityId)) {
        return prev.filter(id => id !== opportunityId);
      } else {
        return [...prev, opportunityId];
      }
    });
  };

  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (opp.sponsor && opp.sponsor.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCurated = filterCurated === 'all' ||
                          (filterCurated === 'curated' && opp.is_curated) ||
                          (filterCurated === 'uncurated' && !opp.is_curated);
    return matchesSearch && matchesCurated;
  });

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
          Opportunity Curation
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<CategoryIcon />}
            onClick={handleSyncCategories}
            disabled={syncing}
          >
            {syncing ? 'Migrating...' : 'Migrate Categories'}
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<Publish />}
            onClick={() => handleBulkCurate(true)}
            disabled={selectedOpportunities.length === 0}
          >
            Publish Selected ({selectedOpportunities.length})
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<Unpublished />}
            onClick={() => handleBulkCurate(false)}
            disabled={selectedOpportunities.length === 0}
          >
            Unpublish Selected
          </Button>
        </Box>
      </Box>

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

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              placeholder="Search opportunities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ flexGrow: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Filter by Status</InputLabel>
              <Select
                value={filterCurated}
                onChange={(e) => setFilterCurated(e.target.value)}
                label="Filter by Status"
              >
                <MenuItem value="all">All Opportunities</MenuItem>
                <MenuItem value="curated">Published Only</MenuItem>
                <MenuItem value="uncurated">Unpublished Only</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedOpportunities.length === filteredOpportunities.length && filteredOpportunities.length > 0}
                  indeterminate={selectedOpportunities.length > 0 && selectedOpportunities.length < filteredOpportunities.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell><strong>Title</strong></TableCell>
              <TableCell><strong>Sponsor</strong></TableCell>
              <TableCell><strong>Deadline</strong></TableCell>
              <TableCell><strong>Categories</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOpportunities.map((opp) => (
              <TableRow key={opp.id} hover>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedOpportunities.includes(opp.id)}
                    onChange={() => handleSelectOne(opp.id)}
                  />
                </TableCell>
                <TableCell>{opp.title}</TableCell>
                <TableCell>{opp.sponsor || 'N/A'}</TableCell>
                <TableCell>
                  {opp.deadline ? new Date(opp.deadline).toLocaleDateString() : 'N/A'}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {opp.categories.length > 0 ? (
                      opp.categories.map(cat => (
                        <Chip
                          key={cat.id}
                          label={cat.name}
                          size="small"
                          sx={{ 
                            bgcolor: cat.color,
                            color: 'white',
                            fontSize: '0.75rem'
                          }}
                        />
                      ))
                    ) : (
                      <Chip label="No categories" size="small" variant="outlined" />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  {opp.is_curated ? (
                    <Chip
                      icon={<CheckCircle />}
                      label="Published"
                      color="success"
                      size="small"
                    />
                  ) : (
                    <Chip
                      icon={<Cancel />}
                      label="Unpublished"
                      color="default"
                      size="small"
                    />
                  )}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => openCategoryDialog(opp)}
                      title="Manage Categories"
                    >
                      <CategoryIcon />
                    </IconButton>
                    <Button
                      size="small"
                      variant={opp.is_curated ? 'outlined' : 'contained'}
                      color={opp.is_curated ? 'warning' : 'success'}
                      onClick={() => toggleCuration(opp.id)}
                    >
                      {opp.is_curated ? 'Unpublish' : 'Publish'}
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredOpportunities.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">
            No opportunities found
          </Typography>
        </Box>
      )}

      <Dialog open={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Assign Categories
          {selectedOppForCategories && (
            <Typography variant="body2" color="text.secondary">
              {selectedOppForCategories.title}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Categories</InputLabel>
            <Select
              multiple
              value={selectedCategories}
              onChange={(e) => setSelectedCategories(e.target.value)}
              input={<OutlinedInput label="Categories" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const cat = categories.find(c => c.id === value);
                    return cat ? (
                      <Chip
                        key={value}
                        label={cat.name}
                        size="small"
                        sx={{ bgcolor: cat.color, color: 'white' }}
                      />
                    ) : null;
                  })}
                </Box>
              )}
            >
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  <Checkbox checked={selectedCategories.includes(cat.id)} />
                  <Chip
                    label={cat.name}
                    size="small"
                    sx={{ bgcolor: cat.color, color: 'white', ml: 1 }}
                  />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAssignCategories} variant="contained">
            Assign Categories
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
