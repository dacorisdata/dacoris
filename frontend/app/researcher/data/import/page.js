'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  InputAdornment,
  Alert,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  CircularProgress,
  Slider,
  TablePagination,
} from '@mui/material';
import {
  Google as GoogleIcon,
  TableChart as ExcelIcon,
  DynamicForm as KoboIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Replay as RetryIcon,
  CheckCircle as SuccessIcon,
  Link as LinkIcon,
  OpenInNew as OpenInNewIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';

const ACCENT = '#1ca7a1';

const extractSheetId = (url) => {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
};

const extractGid = (url) => {
  const match = url.match(/[?&#]gid=(\d+)/);
  return match ? match[1] : '0';
};

const sanitizeTag = (s) =>
  s.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 100);

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   bgcolor: '#f3f4f6', color: '#6b7280' },
  queued:    { label: 'Queued',    bgcolor: '#fef3c7', color: '#d97706' },
  ingesting: { label: 'Ingesting', bgcolor: '#dbeafe', color: '#2563eb' },
  ingested:  { label: 'Ingested',  bgcolor: '#d1fae5', color: '#059669' },
  failed:    { label: 'Failed',    bgcolor: '#fee2e2', color: '#dc2626' },
};

const SOURCE_TABS = [
  {
    id: 'google_sheets',
    label: 'Google Sheets',
    icon: GoogleIcon,
    color: '#34a853',
    desc: 'Import from a public Google Sheet',
    steps: ['Connect Sheet', 'Configure', 'Review & Register'],
  },
  {
    id: 'excel',
    label: 'Excel Upload',
    icon: ExcelIcon,
    color: '#217346',
    desc: 'Upload an Excel (.xlsx / .xls) file',
    steps: ['Upload File', 'Configure', 'Review & Register'],
  },
  {
    id: 'kobo_collect',
    label: 'KoboCollect',
    icon: KoboIcon,
    color: '#1ca7a1',
    desc: 'Import from KoboToolbox / KoboCollect',
    steps: ['Connect KoboCollect', 'Configure', 'Review & Register'],
  },
];

export default function DataImportPage() {
  const { user, token } = useAuth();

  const [activeSource, setActiveSource] = useState('google_sheets');
  const [activeStep, setActiveStep] = useState(0);

  const [gsUrl, setGsUrl] = useState('');
  const [gsSheetId, setGsSheetId] = useState(null);
  const [gsGid, setGsGid] = useState('0');
  const [gsUrlError, setGsUrlError] = useState('');

  const [excelFile, setExcelFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const [koboServer, setKoboServer] = useState('https://kf.kobotoolbox.org');
  const [koboToken, setKoboToken] = useState('');
  const [koboAssetUid, setKoboAssetUid] = useState('');
  const [koboShowToken, setKoboShowToken] = useState(false);

  const [importTag, setImportTag] = useState('');
  const [importDesc, setImportDesc] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [priority, setPriority] = useState(5);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');

  const [projects, setProjects] = useState([]);
  const [importHistory, setImportHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [histPage, setHistPage] = useState(0);
  const [histRowsPerPage, setHistRowsPerPage] = useState(10);

  const currentTab = SOURCE_TABS.find(t => t.id === activeSource);

  const loadProjects = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/research/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(Array.isArray(data) ? data : []);
      }
    } catch (_) {}
  }, [token]);

  const loadHistory = useCallback(async () => {
    if (!token) return;
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/research/lakehouse-imports', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setImportHistory(data.imports || []);
      }
    } catch (_) {} finally {
      setHistoryLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadProjects();
      loadHistory();
    }
  }, [token]);

  const resetWizard = () => {
    setActiveStep(0);
    setGsUrl(''); setGsSheetId(null); setGsUrlError('');
    setExcelFile(null);
    setKoboServer('https://kf.kobotoolbox.org'); setKoboToken(''); setKoboAssetUid('');
    setImportTag(''); setImportDesc('');
    setSelectedProject(''); setPriority(5);
    setImportResult(null); setImportError('');
  };

  const handleSourceSwitch = (src) => {
    setActiveSource(src);
    resetWizard();
  };

  const handleGsUrlChange = (val) => {
    setGsUrl(val);
    const id = extractSheetId(val);
    if (val && !id) {
      setGsUrlError('Not a valid Google Sheets URL');
      setGsSheetId(null);
    } else {
      setGsUrlError('');
      setGsSheetId(id);
      if (id) {
        setGsGid(extractGid(val));
        if (!importTag) setImportTag('sheet_import');
      }
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    const ext = file.name.toLowerCase().split('.').pop();
    if (!['xlsx', 'xls'].includes(ext)) {
      setImportError('Only .xlsx and .xls files are supported');
      return;
    }
    setExcelFile(file);
    setImportError('');
    if (!importTag) setImportTag(sanitizeTag(file.name.replace(/\.[^.]+$/, '')));
  };

  const canProceed = () => {
    if (activeStep === 0) {
      if (activeSource === 'google_sheets') return !!gsSheetId;
      if (activeSource === 'excel') return !!excelFile;
      if (activeSource === 'kobo_collect') return koboToken.trim().length > 0 && koboAssetUid.trim().length > 0;
    }
    if (activeStep === 1) return importTag.trim().length > 0;
    return true;
  };

  const handleNext = () => {
    if (activeStep < 2) setActiveStep(s => s + 1);
    else handleImport();
  };

  const handleBack = () => setActiveStep(s => s - 1);

  const handleImport = async () => {
    if (!user?.primary_institution_id) {
      setImportError('No institution linked to your account');
      return;
    }
    setImporting(true);
    setImportError('');
    const tag = sanitizeTag(importTag) || 'import';

    try {
      const headers = { Authorization: `Bearer ${token}` };
      let result;

      if (activeSource === 'google_sheets') {
        const res = await fetch('/api/research/lakehouse-imports/register', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            institution_id: user.primary_institution_id,
            researcher_id: user.id,
            project_id: selectedProject || null,
            source_url: gsUrl,
            source_type: 'google_sheets',
            source_tag: tag,
            file_name: `${tag}.csv`,
            file_format: 'csv',
            description: importDesc || null,
            priority,
          }),
        });
        if (!res.ok) {
          const e = await res.json();
          throw new Error(e.detail || 'Registration failed');
        }
        result = await res.json();
      } else if (activeSource === 'kobo_collect') {
        const koboDataUrl = `${koboServer.replace(/\/$/, '')}/api/v2/assets/${koboAssetUid}/data.csv?format=csv`;
        const metaJson = JSON.stringify({ server: koboServer, asset_uid: koboAssetUid, api_token: koboToken });
        const res = await fetch('/api/research/lakehouse-imports/register', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            institution_id: user.primary_institution_id,
            researcher_id: user.id,
            project_id: selectedProject || null,
            source_url: koboDataUrl,
            source_type: 'kobo_collect',
            source_tag: tag,
            file_name: `${tag}.csv`,
            file_format: 'csv',
            description: importDesc || null,
            priority,
            metadata_json: metaJson,
          }),
        });
        if (!res.ok) {
          const e = await res.json();
          throw new Error(e.detail || 'Registration failed');
        }
        result = await res.json();
      } else {
        const qs = new URLSearchParams({
          institution_id: user.primary_institution_id,
          source_tag: tag,
          priority,
          ...(selectedProject && { project_id: selectedProject }),
          ...(importDesc && { description: importDesc }),
        });
        const fd = new FormData();
        fd.append('file', excelFile);
        const res = await fetch(`/api/research/lakehouse-imports/upload-excel?${qs}`, {
          method: 'POST',
          headers,
          body: fd,
        });
        if (!res.ok) {
          const e = await res.json();
          throw new Error(e.detail || 'Upload failed');
        }
        result = await res.json();
      }

      setImportResult(result);
      loadHistory();
    } catch (err) {
      setImportError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`/api/research/lakehouse-imports/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      loadHistory();
    } catch (_) {}
  };

  const handleRetry = async (id) => {
    try {
      const res = await fetch(`/api/research/lakehouse-imports/${id}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) loadHistory();
    } catch (_) {}
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const renderStep0 = () => {
    if (activeSource === 'google_sheets') {
      return (
        <Box sx={{ maxWidth: 580, mx: 'auto' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>Connect Google Sheet</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Paste the URL of your Google Sheet. The sheet must be publicly shared ("Anyone with the link").
          </Typography>
          <TextField
            fullWidth
            label="Google Sheets URL"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={gsUrl}
            onChange={(e) => handleGsUrlChange(e.target.value)}
            error={!!gsUrlError}
            helperText={gsUrlError || (gsSheetId ? `Sheet ID: ${gsSheetId}` : 'Paste the full Google Sheets URL')}
            InputProps={{ startAdornment: <LinkIcon sx={{ mr: 1, color: 'text.disabled', fontSize: 18 }} /> }}
            sx={{ mb: 2 }}
          />
          {gsSheetId && (
            <Alert severity="success" icon={<SuccessIcon />} sx={{ borderRadius: 2, mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Sheet connected</Typography>
              <Typography variant="caption">Data will be exported as CSV. Make sure the sheet is publicly accessible.</Typography>
            </Alert>
          )}
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            <Typography variant="caption">
              <strong>How to share:</strong> In Google Sheets → Share → Change to "Anyone with the link" → Copy link
            </Typography>
          </Alert>
        </Box>
      );
    }

    if (activeSource === 'kobo_collect') {
      return (
        <Box sx={{ maxWidth: 580, mx: 'auto' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>Connect KoboCollect</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Enter your KoboToolbox credentials to register this form as a data import.
          </Typography>
          <TextField
            fullWidth
            label="KoboToolbox Server URL"
            value={koboServer}
            onChange={(e) => setKoboServer(e.target.value)}
            helperText="Default: https://kf.kobotoolbox.org — change for self-hosted instances"
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Asset UID (Form ID)"
            placeholder="aXXXXXXXXXXXXXXXXXXXX"
            value={koboAssetUid}
            onChange={(e) => { setKoboAssetUid(e.target.value); if (!importTag) setImportTag('kobo_import'); }}
            helperText="Found in KoboToolbox → your form → Settings → or the URL path segment after /assets/"
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="API Token"
            type={koboShowToken ? 'text' : 'password'}
            value={koboToken}
            onChange={(e) => setKoboToken(e.target.value)}
            helperText="KoboToolbox → Account Settings → API token"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setKoboShowToken(v => !v)}>
                    {koboShowToken ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
          {koboToken && koboAssetUid && (
            <Alert severity="success" icon={<SuccessIcon />} sx={{ borderRadius: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Ready to register</Typography>
              <Typography variant="caption">
                Endpoint: {koboServer.replace(/\/$/, '')}/api/v2/assets/{koboAssetUid}/data.csv
              </Typography>
            </Alert>
          )}
        </Box>
      );
    }

    return (
      <Box sx={{ maxWidth: 580, mx: 'auto' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>Upload Excel File</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Upload your Excel workbook. Supported formats: .xlsx, .xls
        </Typography>
        <Box
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault(); setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFileSelect(f);
          }}
          onClick={() => fileInputRef.current?.click()}
          sx={{
            border: `2px dashed ${dragOver ? ACCENT : '#e0e0e0'}`,
            borderRadius: 3, p: 5, textAlign: 'center', cursor: 'pointer',
            bgcolor: dragOver ? `${ACCENT}08` : 'background.paper',
            transition: 'all 0.2s',
            '&:hover': { borderColor: ACCENT, bgcolor: `${ACCENT}08` },
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={(e) => handleFileSelect(e.target.files[0])}
          />
          <ExcelIcon sx={{ fontSize: 48, color: excelFile ? '#217346' : 'text.disabled', mb: 1.5 }} />
          {excelFile ? (
            <>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#217346' }}>{excelFile.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {(excelFile.size / 1024 / 1024).toFixed(2)} MB · Click to change file
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>Drag & drop your Excel file here</Typography>
              <Typography variant="caption" color="text.secondary">or click to browse</Typography>
            </>
          )}
        </Box>
        {importError && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{importError}</Alert>}
      </Box>
    );
  };

  const renderStep1 = () => (
    <Box sx={{ maxWidth: 560, mx: 'auto' }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>Configure Import</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Set a label and optional metadata for this import
      </Typography>
      <TextField
        fullWidth required
        label="Import Label"
        value={importTag}
        onChange={(e) => setImportTag(e.target.value)}
        helperText={`Stored as: ${sanitizeTag(importTag) || 'import'}`}
        sx={{ mb: 2.5 }}
      />
      <TextField
        fullWidth multiline rows={2}
        label="Description (optional)"
        value={importDesc}
        onChange={(e) => setImportDesc(e.target.value)}
        sx={{ mb: 2.5 }}
      />
      <FormControl fullWidth sx={{ mb: 2.5 }}>
        <InputLabel>Link to Project (optional)</InputLabel>
        <Select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          label="Link to Project (optional)"
        >
          <MenuItem value=""><em>None</em></MenuItem>
          {projects.map(p => (
            <MenuItem key={p.id} value={p.id}>{p.title}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <Box sx={{ px: 0.5 }}>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
          Ingestion Priority: <strong>{priority}</strong> / 10
        </Typography>
        <Slider
          value={priority} min={1} max={10} step={1}
          onChange={(_, v) => setPriority(v)}
          marks sx={{ color: ACCENT }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary">Low</Typography>
          <Typography variant="caption" color="text.secondary">High</Typography>
        </Box>
      </Box>
    </Box>
  );

  const renderStep2 = () => {
    if (importing) {
      return (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <CircularProgress sx={{ color: ACCENT, mb: 2 }} size={48} />
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            {activeSource === 'excel' ? 'Uploading file...' : 'Registering import...'}
          </Typography>
          <Typography variant="body2" color="text.secondary">Persisting metadata to database</Typography>
        </Box>
      );
    }

    if (importResult) {
      return (
        <Box sx={{ maxWidth: 520, mx: 'auto' }}>
          <Alert severity="success" icon={<SuccessIcon />} sx={{ mb: 3, borderRadius: 2 }}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>Import registered successfully!</Typography>
            <Typography variant="caption">
              Status: <strong>{importResult.ingest_status}</strong> · ID: {importResult.id}
            </Typography>
          </Alert>
          <Paper sx={{ p: 2.5, bgcolor: 'grey.50', borderRadius: 2, mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Bronze Path (assigned)</Typography>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Typography variant="body2" sx={{ flex: 1, fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>
                {importResult.bronze_path}
              </Typography>
              <Tooltip title="Copy path">
                <IconButton size="small" onClick={() => handleCopy(importResult.bronze_path)}>
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Paper>
          <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
            <Typography variant="caption">
              The background worker will ingest the raw data to MinIO Bronze. Check the Import History below for status updates.
            </Typography>
          </Alert>
          <Button
            variant="contained" fullWidth onClick={resetWizard}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#158f8a' } }}
          >
            Register Another Import
          </Button>
        </Box>
      );
    }

    const tag = sanitizeTag(importTag) || 'import';
    const project = projects.find(p => p.id === selectedProject);
    return (
      <Box sx={{ maxWidth: 560, mx: 'auto' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Review Import</Typography>
        <Paper sx={{ p: 2.5, bgcolor: 'grey.50', borderRadius: 2, mb: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Source Type</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {SOURCE_TABS.find(t => t.id === activeSource)?.label || activeSource}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Import Label</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{tag}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {activeSource === 'google_sheets' ? 'Sheet ID' : activeSource === 'kobo_collect' ? 'Asset UID' : 'File'}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-all' }}>
                {activeSource === 'google_sheets' ? gsSheetId : activeSource === 'kobo_collect' ? koboAssetUid : excelFile?.name}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Project</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{project?.title || 'None'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Priority</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{priority} / 10</Typography>
            </Box>
            {importDesc && (
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography variant="caption" color="text.secondary">Description</Typography>
                <Typography variant="body2">{importDesc}</Typography>
              </Box>
            )}
          </Box>
        </Paper>
        {importError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{importError}</Alert>}
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          <Typography variant="caption">
            Only metadata is stored in PostgreSQL. Raw data will be ingested to MinIO Bronze by the background worker.
          </Typography>
        </Alert>
      </Box>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>Data Import</Typography>
        <Typography variant="body2" color="text.secondary">
          Register data sources for Lakehouse ingestion — metadata in PostgreSQL, raw data in MinIO Bronze
        </Typography>
      </Box>

      {/* Import Method Selector */}
      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>Import Method</Typography>
        <FormControl fullWidth>
          <InputLabel>Select import method</InputLabel>
          <Select
            value={activeSource}
            onChange={(e) => handleSourceSwitch(e.target.value)}
            label="Select import method"
            renderValue={(value) => {
              const tab = SOURCE_TABS.find(t => t.id === value);
              if (!tab) return value;
              const Icon = tab.icon;
              return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Icon sx={{ fontSize: 20, color: tab.color }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{tab.label}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>— {tab.desc}</Typography>
                </Box>
              );
            }}
          >
            {SOURCE_TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <MenuItem key={tab.id} value={tab.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
                    <Icon sx={{ fontSize: 22, color: tab.color }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{tab.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{tab.desc}</Typography>
                    </Box>
                  </Box>
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      </Paper>

      {/* Import Wizard */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {currentTab.steps.map(label => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>

        <Box sx={{ minHeight: 280, mb: 3 }}>
          {activeStep === 0 && renderStep0()}
          {activeStep === 1 && renderStep1()}
          {activeStep === 2 && renderStep2()}
        </Box>

        {!importResult && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button disabled={activeStep === 0 || importing} onClick={handleBack}>Back</Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!canProceed() || importing}
              sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#158f8a' } }}
            >
              {activeStep === 2
                ? (importing ? 'Registering...' : activeSource === 'excel' ? 'Upload & Register' : 'Register Import')
                : 'Next'}
            </Button>
          </Box>
        )}
      </Paper>

      {/* Import History */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>Import History</Typography>
          <Typography variant="caption" color="text.secondary">All imports registered in this session and previously</Typography>
        </Box>
        <Button startIcon={<RefreshIcon />} onClick={loadHistory} size="small">Refresh</Button>
      </Box>

      {historyLoading ? (
        <LinearProgress sx={{ borderRadius: 1 }} />
      ) : importHistory.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center' }}>
          <Typography color="text.secondary">No imports registered yet.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Label</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Source / File</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Project</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Bronze Path</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Registered</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {importHistory.slice(histPage * histRowsPerPage, histPage * histRowsPerPage + histRowsPerPage).map((imp) => {
                const sc = STATUS_CONFIG[imp.ingest_status] || STATUS_CONFIG.pending;
                const project = projects.find(p => p.id === imp.project_id);
                const typeColor = imp.source_type === 'google_sheets' ? '#34a853' : imp.source_type === 'kobo_collect' ? '#1ca7a1' : '#217346';
                return (
                  <TableRow key={imp.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{imp.source_tag}</TableCell>
                    <TableCell>
                      <Chip
                        label={imp.source_type.replace(/_/g, ' ')}
                        size="small"
                        sx={{
                          bgcolor: `${typeColor}15`, color: typeColor,
                          fontWeight: 600, fontSize: 10, textTransform: 'capitalize',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {imp.source_url && imp.source_url.startsWith('http') ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap', display: 'block',
                            }}
                            title={imp.source_url}
                          >
                            {imp.file_name || imp.source_url}
                          </Typography>
                          <Tooltip title="Open source">
                            <IconButton
                              size="small"
                              component="a"
                              href={imp.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <OpenInNewIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          {imp.file_name || '—'}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={sc.label} size="small"
                        sx={{ bgcolor: sc.bgcolor, color: sc.color, fontWeight: 600, fontSize: 11 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{project?.title || '—'}</Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      {imp.bronze_path ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              fontFamily: 'monospace', fontSize: 10,
                              overflow: 'hidden', textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap', maxWidth: 160, display: 'block',
                            }}
                            title={imp.bronze_path}
                          >
                            {imp.bronze_path}
                          </Typography>
                          <Tooltip title="Copy path">
                            <IconButton size="small" onClick={() => handleCopy(imp.bronze_path)}>
                              <CopyIcon sx={{ fontSize: 13 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.disabled">Pending</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{new Date(imp.created_at).toLocaleString()}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {imp.ingest_status === 'failed' && (
                          <Tooltip title="Retry ingestion">
                            <IconButton size="small" color="primary" onClick={() => handleRetry(imp.id)}>
                              <RetryIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete record">
                          <IconButton size="small" color="error" onClick={() => handleDelete(imp.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={importHistory.length}
            page={histPage}
            onPageChange={(_, p) => setHistPage(p)}
            rowsPerPage={histRowsPerPage}
            onRowsPerPageChange={(e) => { setHistRowsPerPage(parseInt(e.target.value, 10)); setHistPage(0); }}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </TableContainer>
      )}
    </Container>
  );
}
