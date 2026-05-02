'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Visibility as PreviewIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  History as VersionIcon,
  Link as LinkIcon,
} from '@mui/icons-material';

const STEPS = ['Select Source', 'Configure Import', 'Preview Data', 'Link to Project', 'Import'];

export default function DataImportPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedSource, setSelectedSource] = useState(null);
  const [selectedProject, setSelectedProject] = useState('');
  const [importName, setImportName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [previewData, setPreviewData] = useState([]);
  const [showVersions, setShowVersions] = useState(false);

  // Mock data sources
  const dataSources = [
    { id: 1, name: 'Field Survey - Nairobi', type: 'KoboCollect', records: 1250 },
    { id: 2, name: 'Patient Records', type: 'ODK', records: 3420 },
    { id: 3, name: 'Lab Results Sheet', type: 'Google Sheets', records: 856 },
    { id: 4, name: 'Baseline Data', type: 'Excel', records: 542 },
  ];

  // Mock projects
  const projects = [
    { id: 1, name: 'Malaria Prevention Study' },
    { id: 2, name: 'COVID-19 Vaccine Efficacy' },
    { id: 3, name: 'Maternal Health Survey' },
    { id: 4, name: 'Water Quality Assessment' },
  ];

  // Mock import history with versions
  const [importHistory, setImportHistory] = useState([
    {
      id: 1,
      name: 'Field Survey Import v1',
      source: 'Field Survey - Nairobi',
      project: 'Malaria Prevention Study',
      records: 1250,
      date: '2026-05-02T10:30:00',
      status: 'completed',
      version: 1,
    },
    {
      id: 2,
      name: 'Field Survey Import v2',
      source: 'Field Survey - Nairobi',
      project: 'Malaria Prevention Study',
      records: 1380,
      date: '2026-05-02T14:15:00',
      status: 'completed',
      version: 2,
    },
    {
      id: 3,
      name: 'Patient Records Import v1',
      source: 'Patient Records',
      project: 'COVID-19 Vaccine Efficacy',
      records: 3420,
      date: '2026-05-01T09:20:00',
      status: 'completed',
      version: 1,
    },
  ]);

  const handleSourceSelect = (source) => {
    setSelectedSource(source);
    // Generate preview data
    const mockPreview = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      participant_id: `P${1000 + i}`,
      age: 25 + i * 5,
      gender: i % 2 === 0 ? 'Male' : 'Female',
      location: ['Nairobi', 'Mombasa', 'Kisumu'][i % 3],
      date: new Date(2026, 4, i + 1).toISOString().split('T')[0],
    }));
    setPreviewData(mockPreview);
  };

  const handleNext = () => {
    if (activeStep === STEPS.length - 1) {
      handleImport();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleImport = () => {
    setImporting(true);
    setImportProgress(0);

    // Simulate import progress
    const interval = setInterval(() => {
      setImportProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setImporting(false);
          
          // Add to import history
          const newImport = {
            id: importHistory.length + 1,
            name: importName || `${selectedSource.name} Import`,
            source: selectedSource.name,
            project: projects.find(p => p.id === selectedProject)?.name || 'No Project',
            records: selectedSource.records,
            date: new Date().toISOString(),
            status: 'completed',
            version: importHistory.filter(h => h.source === selectedSource.name).length + 1,
          };
          setImportHistory([newImport, ...importHistory]);
          
          // Reset form
          setTimeout(() => {
            setActiveStep(0);
            setSelectedSource(null);
            setSelectedProject('');
            setImportName('');
          }, 2000);
          
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Grid container spacing={3}>
            {dataSources.map((source) => (
              <Grid item xs={12} sm={6} md={4} key={source.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    border: selectedSource?.id === source.id ? '2px solid #1ca7a1' : '1px solid #e5e7eb',
                    '&:hover': { borderColor: '#1ca7a1', boxShadow: 2 },
                  }}
                  onClick={() => handleSourceSelect(source)}
                >
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {source.name}
                    </Typography>
                    <Chip label={source.type} size="small" sx={{ mb: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      {source.records.toLocaleString()} records available
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        );

      case 1:
        return (
          <Box sx={{ maxWidth: 600, mx: 'auto' }}>
            <TextField
              fullWidth
              label="Import Name"
              value={importName}
              onChange={(e) => setImportName(e.target.value)}
              helperText="Give this import a descriptive name"
              sx={{ mb: 3 }}
            />
            <Alert severity="info">
              Importing from: <strong>{selectedSource?.name}</strong>
              <br />
              Total records: <strong>{selectedSource?.records.toLocaleString()}</strong>
            </Alert>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Alert severity="success" sx={{ mb: 3 }}>
              Preview of first 5 records from <strong>{selectedSource?.name}</strong>
            </Alert>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {Object.keys(previewData[0] || {}).map((key) => (
                      <TableCell key={key} sx={{ fontWeight: 600 }}>
                        {key.replace(/_/g, ' ').toUpperCase()}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewData.map((row) => (
                    <TableRow key={row.id}>
                      {Object.values(row).map((value, idx) => (
                        <TableCell key={idx}>{value}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );

      case 3:
        return (
          <Box sx={{ maxWidth: 600, mx: 'auto' }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              Link this import to a project for better organization and tracking
            </Alert>
            <FormControl fullWidth>
              <InputLabel>Select Project (Optional)</InputLabel>
              <Select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                label="Select Project (Optional)"
              >
                <MenuItem value="">
                  <em>No Project</em>
                </MenuItem>
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        );

      case 4:
        return (
          <Box sx={{ maxWidth: 600, mx: 'auto' }}>
            {importing ? (
              <Box>
                <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
                  Importing data...
                </Typography>
                <LinearProgress variant="determinate" value={importProgress} sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  {importProgress}% complete
                </Typography>
              </Box>
            ) : importProgress === 100 ? (
              <Alert severity="success" icon={<SuccessIcon />}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Import Completed Successfully!
                </Typography>
                <Typography variant="body2">
                  {selectedSource?.records.toLocaleString()} records imported from {selectedSource?.name}
                </Typography>
              </Alert>
            ) : (
              <Box>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Review Import Details
                </Typography>
                <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Import Name
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {importName || `${selectedSource?.name} Import`}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Data Source
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {selectedSource?.name}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Records
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {selectedSource?.records.toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Linked Project
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {selectedProject
                          ? projects.find((p) => p.id === selectedProject)?.name
                          : 'None'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Box>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Data Import
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Import data from your connected sources with version control
          </Typography>
        </Box>

        {/* Stepper */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Step Content */}
          <Box sx={{ minHeight: 300, mb: 3 }}>
            {renderStepContent()}
          </Box>

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              disabled={activeStep === 0 || importing}
              onClick={handleBack}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={
                (activeStep === 0 && !selectedSource) ||
                importing ||
                importProgress === 100
              }
              sx={{ bgcolor: '#1ca7a1', '&:hover': { bgcolor: '#158f8a' } }}
            >
              {activeStep === STEPS.length - 1 ? 'Start Import' : 'Next'}
            </Button>
          </Box>
        </Paper>

        {/* Import History */}
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Import History
          </Typography>
          <Button
            startIcon={<VersionIcon />}
            onClick={() => setShowVersions(!showVersions)}
          >
            {showVersions ? 'Hide' : 'Show'} Versions
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Import Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Source</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Project</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Records</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Version</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {importHistory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.source}</TableCell>
                  <TableCell>{item.project}</TableCell>
                  <TableCell>{item.records.toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={`v${item.version}`}
                      size="small"
                      sx={{ bgcolor: '#1ca7a115', color: '#1ca7a1', fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(item.date).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.status}
                      size="small"
                      color={item.status === 'completed' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" color="primary">
                      <PreviewIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
  );
}
