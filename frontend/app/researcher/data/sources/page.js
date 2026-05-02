'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Avatar,
  InputAdornment,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  CloudUpload as KoboIcon,
  TableChart as ExcelIcon,
  Google as GoogleIcon,
  MoreVert as MoreIcon,
  Sync as SyncIcon,
  Search as SearchIcon,
  Link as LinkIcon,
  FiberManualRecord as DotIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';

const DATA_SOURCE_TYPES = [
  { id: 'kobocollect', name: 'KoboCollect', icon: KoboIcon, color: '#1ca7a1', description: 'Mobile data collection platform' },
  { id: 'google_sheets', name: 'Google Sheets', icon: GoogleIcon, color: '#34a853', description: 'Cloud-based spreadsheet' },
  { id: 'excel', name: 'Excel', icon: ExcelIcon, color: '#217346', description: 'Microsoft Excel files' },
];

export default function DataSourcesPage() {
  const [sources, setSources] = useState([
    {
      id: 1,
      name: 'Field Survey - Nairobi',
      type: 'kobocollect',
      url: 'https://kf.kobotoolbox.org/api/v2/assets/abc123',
      apiKey: '***************',
      isActive: true,
      lastSync: '2026-05-02T10:30:00',
      recordCount: 1250,
      description: 'Primary field data collection for malaria study',
    },
    {
      id: 2,
      name: 'Baseline Survey Data',
      type: 'kobocollect',
      url: 'https://kf.kobotoolbox.org/api/v2/assets/def456',
      apiKey: '***************',
      isActive: true,
      lastSync: '2026-05-01T14:20:00',
      recordCount: 542,
      description: 'Baseline demographic and health data',
    },
    {
      id: 3,
      name: 'Follow-up Survey - Mombasa',
      type: 'kobocollect',
      url: 'https://kf.kobotoolbox.org/api/v2/assets/ghi789',
      apiKey: '***************',
      isActive: true,
      lastSync: '2026-05-02T08:45:00',
      recordCount: 890,
      description: 'Follow-up data collection in coastal region',
    },
    {
      id: 4,
      name: 'Lab Results Sheet',
      type: 'google_sheets',
      url: 'https://docs.google.com/spreadsheets/d/1abc...',
      apiKey: '***************',
      isActive: true,
      lastSync: '2026-05-02T09:15:00',
      recordCount: 856,
      description: 'Laboratory test results and analysis',
    },
    {
      id: 5,
      name: 'Patient Demographics',
      type: 'google_sheets',
      url: 'https://docs.google.com/spreadsheets/d/2def...',
      apiKey: '***************',
      isActive: true,
      lastSync: '2026-05-01T16:30:00',
      recordCount: 1120,
      description: 'Patient demographic information',
    },
    {
      id: 6,
      name: 'Patient Records Archive',
      type: 'excel',
      url: '/uploads/patient_records_2025.xlsx',
      apiKey: null,
      isActive: false,
      lastSync: '2026-04-30T16:45:00',
      recordCount: 3420,
      description: 'Historical patient data from 2025',
    },
  ]);

  const [openDialog, setOpenDialog] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedSource, setSelectedSource] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    url: '',
    apiKey: '',
    isActive: true,
    description: '',
  });

  const handleOpenDialog = (source = null) => {
    if (source) {
      setEditingSource(source);
      setFormData({
        name: source.name,
        type: source.type,
        url: source.url,
        apiKey: source.apiKey || '',
        isActive: source.isActive,
        description: source.description || '',
      });
    } else {
      setEditingSource(null);
      setFormData({
        name: '',
        type: '',
        url: '',
        apiKey: '',
        isActive: true,
        description: '',
      });
    }
    setOpenDialog(true);
    setAnchorEl(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSource(null);
  };

  const handleSaveSource = () => {
    if (editingSource) {
      setSources(sources.map(s => 
        s.id === editingSource.id 
          ? { ...s, ...formData, lastSync: new Date().toISOString() }
          : s
      ));
    } else {
      const newSource = {
        id: Math.max(...sources.map(s => s.id), 0) + 1,
        ...formData,
        lastSync: new Date().toISOString(),
        recordCount: 0,
      };
      setSources([...sources, newSource]);
    }
    handleCloseDialog();
  };

  const handleMenuOpen = (event, source) => {
    setAnchorEl(event.currentTarget);
    setSelectedSource(source);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSync = () => {
    if (selectedSource) {
      setSources(sources.map(s =>
        s.id === selectedSource.id
          ? { ...s, lastSync: new Date().toISOString() }
          : s
      ));
    }
    handleMenuClose();
  };

  const handleDeleteSource = () => {
    if (selectedSource && confirm(`Are you sure you want to delete "${selectedSource.name}"?`)) {
      setSources(sources.filter(s => s.id !== selectedSource.id));
    }
    handleMenuClose();
  };

  const getSourceTypeInfo = (typeId) => {
    return DATA_SOURCE_TYPES.find(t => t.id === typeId) || DATA_SOURCE_TYPES[0];
  };

  const getFilteredSources = () => {
    if (!searchTerm) return sources;
    return sources.filter(s =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getSourceTypeInfo(s.type).name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredSources = getFilteredSources();
  const activeCount = sources.filter(s => s.isActive).length;
  const totalRecords = sources.reduce((sum, s) => sum + s.recordCount, 0);

  // Group sources by type
  const groupedSources = DATA_SOURCE_TYPES.map(type => {
    const typeSources = filteredSources.filter(s => s.type === type.id);
    return {
      ...type,
      sources: typeSources,
      count: typeSources.length,
      activeCount: typeSources.filter(s => s.isActive).length,
      totalRecords: typeSources.reduce((sum, s) => sum + s.recordCount, 0),
    };
  }).filter(group => group.sources.length > 0);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: 'text.primary' }}>
              Data Sources
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Connect and manage external data sources for your research
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              bgcolor: '#1ca7a1',
              '&:hover': { bgcolor: '#158f8a' },
              textTransform: 'none',
              px: 3,
              py: 1,
              borderRadius: 2,
            }}
          >
            Add Data Source
          </Button>
        </Box>

        {/* Stats Cards */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Paper
            sx={{
              flex: '1 1 calc(33.333% - 16px)',
              minWidth: 200,
              p: 2.5,
              background: 'linear-gradient(135deg, #1ca7a1 0%, #158f8a 100%)',
              color: 'white',
              borderRadius: 2,
            }}
          >
            <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5, fontSize: 13 }}>
              Total Sources
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 700 }}>
              {sources.length}
            </Typography>
          </Paper>
          <Paper
            sx={{
              flex: '1 1 calc(33.333% - 16px)',
              minWidth: 200,
              p: 2.5,
              background: 'linear-gradient(135deg, #34a853 0%, #2d8e47 100%)',
              color: 'white',
              borderRadius: 2,
            }}
          >
            <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5, fontSize: 13 }}>
              Active Sources
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 700 }}>
              {activeCount}
            </Typography>
          </Paper>
          <Paper
            sx={{
              flex: '1 1 calc(33.333% - 16px)',
              minWidth: 200,
              p: 2.5,
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              borderRadius: 2,
            }}
          >
            <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5, fontSize: 13 }}>
              Total Records
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 700 }}>
              {totalRecords.toLocaleString()}
            </Typography>
          </Paper>
        </Box>

        {/* Search Bar */}
        <TextField
          fullWidth
          placeholder="Search data sources..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              bgcolor: 'background.paper',
            },
          }}
        />
      </Box>

      {/* Grouped Data Sources */}
      {filteredSources.length === 0 ? (
        <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 2 }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {searchTerm ? 'No sources found matching your search' : 'No data sources configured yet'}
          </Typography>
          {!searchTerm && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{ bgcolor: '#1ca7a1', '&:hover': { bgcolor: '#158f8a' } }}
            >
              Add Your First Source
            </Button>
          )}
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {groupedSources.map((group) => {
            const Icon = group.icon;
            
            return (
              <Accordion
                key={group.id}
                defaultExpanded
                sx={{
                  borderRadius: 2,
                  '&:before': { display: 'none' },
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    bgcolor: `${group.color}08`,
                    borderRadius: 2,
                    '&:hover': { bgcolor: `${group.color}12` },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: `${group.color}15`,
                        color: group.color,
                      }}
                    >
                      <Icon />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 16 }}>
                        {group.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {group.description}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 3, mr: 2 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: group.color }}>
                          {group.count}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Sources
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#34a853' }}>
                          {group.activeCount}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Active
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                          {group.totalRecords.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Records
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                          <TableCell sx={{ fontWeight: 600, fontSize: 13, color: 'text.secondary' }}>
                            SOURCE NAME
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: 13, color: 'text.secondary' }}>
                            CONNECTION
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: 13, color: 'text.secondary' }}>
                            RECORDS
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: 13, color: 'text.secondary' }}>
                            LAST SYNC
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: 13, color: 'text.secondary' }}>
                            STATUS
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: 13, color: 'text.secondary', width: 80 }}>
                            ACTIONS
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {group.sources.map((source) => {
                const typeInfo = getSourceTypeInfo(source.type);
                const Icon = typeInfo.icon;
                
                return (
                  <TableRow
                    key={source.id}
                    hover
                    sx={{
                      '&:hover': { bgcolor: 'grey.50' },
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            bgcolor: `${typeInfo.color}15`,
                            color: typeInfo.color,
                          }}
                        >
                          <Icon sx={{ fontSize: 20 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>
                            {source.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                            {source.description}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={source.url}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LinkIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: 12,
                              color: 'text.secondary',
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {source.url}
                          </Typography>
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {source.recordCount.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {new Date(source.lastSync).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled' }}>
                        {new Date(source.lastSync).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<DotIcon sx={{ fontSize: 12 }} />}
                        label={source.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        sx={{
                          bgcolor: source.isActive ? '#34a85315' : '#9ca3af15',
                          color: source.isActive ? '#34a853' : '#6b7280',
                          fontWeight: 600,
                          fontSize: 11,
                          borderRadius: 1.5,
                          '& .MuiChip-icon': {
                            color: source.isActive ? '#34a853' : '#6b7280',
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, source)}
                        sx={{
                          '&:hover': { bgcolor: 'grey.100' },
                        }}
                      >
                        <MoreIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { borderRadius: 2, minWidth: 180 },
        }}
      >
        <MenuItem onClick={handleSync}>
          <ListItemIcon>
            <SyncIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Sync Now</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleOpenDialog(selectedSource); }}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Source</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteSource} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete Source</ListItemText>
        </MenuItem>
      </Menu>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {editingSource ? 'Edit Data Source' : 'Add Data Source'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {editingSource ? 'Update source configuration' : 'Connect a new data source'}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Source Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Field Survey - Nairobi"
            />

            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this data source"
            />

            <TextField
              select
              label="Source Type"
              fullWidth
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              SelectProps={{ native: true }}
            >
              <option value="">Select type...</option>
              {DATA_SOURCE_TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </TextField>

            <TextField
              label="URL/Path"
              fullWidth
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              helperText="API endpoint URL or file path"
              placeholder="https://..."
            />

            {formData.type !== 'excel' && (
              <TextField
                label="API Key / Token"
                fullWidth
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                helperText="Authentication credentials for the data source"
              />
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseDialog} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveSource}
            disabled={!formData.name || !formData.type || !formData.url}
            sx={{
              bgcolor: '#1ca7a1',
              '&:hover': { bgcolor: '#158f8a' },
              textTransform: 'none',
              px: 3,
            }}
          >
            {editingSource ? 'Update Source' : 'Add Source'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
