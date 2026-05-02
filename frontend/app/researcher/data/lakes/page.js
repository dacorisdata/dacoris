'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tabs,
  Tab,
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Avatar,
  Tooltip,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  Storage as StorageIcon,
  MoreVert as MoreIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  CloudUpload as KoboIcon,
  Google as GoogleIcon,
  TableChart as ExcelIcon,
  TrendingUp as TrendingIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';

const DATA_STAGES = {
  raw: { label: 'Raw', color: '#6b7280', icon: StorageIcon, description: 'Unprocessed data from sources' },
  cleaned: { label: 'Cleaned', color: '#f59e0b', icon: CheckIcon, description: 'Data cleaned and validated' },
  processed: { label: 'Processed', color: '#3b82f6', icon: TrendingIcon, description: 'Transformed and enriched data' },
  analyzed: { label: 'Analyzed', color: '#8b5cf6', icon: TrendingIcon, description: 'Data with analysis results' },
  published: { label: 'Published', color: '#10b981', icon: CheckIcon, description: 'Finalized and published data' },
};

const SOURCE_TYPES = {
  'KoboCollect': { icon: KoboIcon, color: '#1ca7a1' },
  'Google Sheets': { icon: GoogleIcon, color: '#34a853' },
  'Excel': { icon: ExcelIcon, color: '#217346' },
};

export default function DataLakesPage() {
  const [currentTab, setCurrentTab] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [dataLakeEntries, setDataLakeEntries] = useState([
    {
      id: 1,
      name: 'Field Survey - Nairobi Dataset',
      source: 'KoboCollect',
      project: 'Malaria Prevention Study',
      stage: 'processed',
      records: 1380,
      size: '2.4 MB',
      created: '2026-05-02T10:30:00',
      updated: '2026-05-02T14:15:00',
      version: 2,
      tags: ['survey', 'nairobi', 'malaria'],
    },
    {
      id: 2,
      name: 'Lab Results - Q1 2026',
      source: 'Google Sheets',
      project: 'Maternal Health Survey',
      stage: 'cleaned',
      records: 856,
      size: '1.2 MB',
      created: '2026-04-15T08:00:00',
      updated: '2026-04-20T16:45:00',
      version: 3,
      tags: ['lab', 'maternal', 'health'],
    },
    {
      id: 3,
      name: 'Baseline Survey Data',
      source: 'KoboCollect',
      project: 'Water Quality Assessment',
      stage: 'raw',
      records: 542,
      size: '890 KB',
      created: '2026-04-30T16:45:00',
      updated: '2026-04-30T16:45:00',
      version: 1,
      tags: ['baseline', 'water', 'quality'],
    },
    {
      id: 4,
      name: 'Follow-up Survey - Mombasa',
      source: 'KoboCollect',
      project: 'Malaria Prevention Study',
      stage: 'published',
      records: 980,
      size: '1.8 MB',
      created: '2026-03-15T10:00:00',
      updated: '2026-04-10T14:20:00',
      version: 4,
      tags: ['survey', 'mombasa', 'followup'],
    },
    {
      id: 5,
      name: 'Patient Demographics',
      source: 'Google Sheets',
      project: 'COVID-19 Vaccine Efficacy',
      stage: 'analyzed',
      records: 1120,
      size: '1.5 MB',
      created: '2026-05-01T09:20:00',
      updated: '2026-05-02T11:30:00',
      version: 2,
      tags: ['patient', 'demographics', 'covid'],
    },
    {
      id: 6,
      name: 'Historical Patient Records',
      source: 'Excel',
      project: 'COVID-19 Vaccine Efficacy',
      stage: 'cleaned',
      records: 3420,
      size: '5.2 MB',
      created: '2026-04-25T14:00:00',
      updated: '2026-04-28T10:15:00',
      version: 1,
      tags: ['patient', 'historical', 'archive'],
    },
  ]);

  const handleMenuOpen = (event, dataset) => {
    setAnchorEl(event.currentTarget);
    setSelectedDataset(dataset);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleViewDetails = () => {
    setViewDialog(true);
    handleMenuClose();
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${selectedDataset?.name}"?`)) {
      setDataLakeEntries(dataLakeEntries.filter(e => e.id !== selectedDataset.id));
    }
    handleMenuClose();
  };

  const getFilteredEntries = () => {
    let filtered = dataLakeEntries;

    if (currentTab !== 'all') {
      filtered = filtered.filter(e => e.stage === currentTab);
    }

    if (searchTerm) {
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return filtered;
  };

  const getStageStats = () => {
    const stats = {};
    Object.keys(DATA_STAGES).forEach(stage => {
      stats[stage] = dataLakeEntries.filter(e => e.stage === stage).length;
    });
    return stats;
  };

  const stageStats = getStageStats();
  const filteredEntries = getFilteredEntries();
  const totalDatasets = dataLakeEntries.length;
  const totalRecords = dataLakeEntries.reduce((sum, e) => sum + e.records, 0);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: 'text.primary' }}>
          Data Lakes
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          View and manage all your data across different processing stages
        </Typography>

        {/* Stats Cards */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Card sx={{ 
            flex: '1 1 calc(25% - 16px)', 
            minWidth: 180,
            background: 'linear-gradient(135deg, #1ca7a1 0%, #158f8a 100%)', 
            color: 'white' 
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5, fontSize: 13 }}>
                Total Datasets
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {totalDatasets}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ 
            flex: '1 1 calc(25% - 16px)', 
            minWidth: 180,
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
            color: 'white' 
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5, fontSize: 13 }}>
                Total Records
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {totalRecords.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ 
            flex: '1 1 calc(25% - 16px)', 
            minWidth: 180,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
            color: 'white' 
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5, fontSize: 13 }}>
                Published
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {stageStats.published}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ 
            flex: '1 1 calc(25% - 16px)', 
            minWidth: 180,
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', 
            color: 'white' 
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5, fontSize: 13 }}>
                In Analysis
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {stageStats.analyzed}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Search Bar */}
        <TextField
          fullWidth
          placeholder="Search datasets by name, project, or tags..."
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

      {/* Stage Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={currentTab}
          onChange={(e, newValue) => setCurrentTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              minHeight: 56,
            },
          }}
        >
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                All Stages
                <Chip
                  label={totalDatasets}
                  size="small"
                  sx={{
                    bgcolor: '#1ca7a115',
                    color: '#1ca7a1',
                    fontWeight: 600,
                    height: 20,
                    fontSize: 11,
                  }}
                />
              </Box>
            }
            value="all"
          />
          {Object.entries(DATA_STAGES).map(([key, stage]) => (
            <Tab
              key={key}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {stage.label}
                  <Chip
                    label={stageStats[key]}
                    size="small"
                    sx={{
                      bgcolor: `${stage.color}15`,
                      color: stage.color,
                      fontWeight: 600,
                      height: 20,
                      fontSize: 11,
                    }}
                  />
                </Box>
              }
              value={key}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Data Lake Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 600, fontSize: 13, color: 'text.secondary' }}>
                DATASET
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: 13, color: 'text.secondary' }}>
                SOURCE
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: 13, color: 'text.secondary' }}>
                PROJECT
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: 13, color: 'text.secondary' }}>
                STAGE
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: 13, color: 'text.secondary' }}>
                RECORDS
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: 13, color: 'text.secondary' }}>
                SIZE
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: 13, color: 'text.secondary' }}>
                VERSION
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: 13, color: 'text.secondary' }}>
                LAST UPDATED
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: 13, color: 'text.secondary', width: 80 }}>
                ACTIONS
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">
                    {searchTerm ? 'No datasets found matching your search' : 'No datasets in this stage'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry) => {
                const stageInfo = DATA_STAGES[entry.stage];
                const sourceInfo = SOURCE_TYPES[entry.source];
                const SourceIcon = sourceInfo?.icon || StorageIcon;
                
                return (
                  <TableRow
                    key={entry.id}
                    hover
                    sx={{
                      '&:hover': { bgcolor: 'grey.50' },
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {entry.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {entry.tags.map((tag) => (
                            <Chip
                              key={tag}
                              label={tag}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: 10,
                                bgcolor: 'grey.100',
                                color: 'text.secondary',
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar
                          sx={{
                            width: 28,
                            height: 28,
                            bgcolor: `${sourceInfo?.color || '#1ca7a1'}15`,
                            color: sourceInfo?.color || '#1ca7a1',
                          }}
                        >
                          <SourceIcon sx={{ fontSize: 16 }} />
                        </Avatar>
                        <Typography variant="body2" sx={{ fontSize: 13 }}>
                          {entry.source}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: 13 }}>
                        {entry.project}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={stageInfo.label}
                        size="small"
                        sx={{
                          bgcolor: `${stageInfo.color}15`,
                          color: stageInfo.color,
                          fontWeight: 600,
                          fontSize: 11,
                          borderRadius: 1.5,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {entry.records.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: 13, color: 'text.secondary' }}>
                        {entry.size}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`v${entry.version}`}
                        size="small"
                        sx={{
                          bgcolor: '#1ca7a115',
                          color: '#1ca7a1',
                          fontWeight: 600,
                          fontSize: 11,
                          borderRadius: 1.5,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {new Date(entry.updated).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled' }}>
                        {new Date(entry.updated).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, entry)}
                        sx={{ '&:hover': { bgcolor: 'grey.100' } }}
                      >
                        <MoreIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { borderRadius: 2, minWidth: 180 },
        }}
      >
        <MenuItem onClick={handleViewDetails}>
          <ViewIcon fontSize="small" sx={{ mr: 1.5 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <DownloadIcon fontSize="small" sx={{ mr: 1.5 }} />
          Download
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* View Details Dialog */}
      <Dialog
        open={viewDialog}
        onClose={() => setViewDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Dataset Details
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedDataset && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    {selectedDataset.name}
                  </Typography>
                  <Chip
                    label={DATA_STAGES[selectedDataset.stage].label}
                    sx={{
                      bgcolor: `${DATA_STAGES[selectedDataset.stage].color}15`,
                      color: DATA_STAGES[selectedDataset.stage].color,
                      fontWeight: 600,
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Source
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {selectedDataset.source}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Project
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {selectedDataset.project}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Records
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {selectedDataset.records.toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Size
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {selectedDataset.size}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Version
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    v{selectedDataset.version}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body2">
                    {new Date(selectedDataset.created).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Last Updated
                  </Typography>
                  <Typography variant="body2">
                    {new Date(selectedDataset.updated).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Tags
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                    {selectedDataset.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setViewDialog(false)} sx={{ textTransform: 'none' }}>
            Close
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            sx={{
              bgcolor: '#1ca7a1',
              '&:hover': { bgcolor: '#158f8a' },
              textTransform: 'none',
              px: 3,
            }}
          >
            Download
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
