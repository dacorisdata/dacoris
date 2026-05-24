'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme,
  Alert, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Select, FormControl, InputLabel,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon, Gavel as EthicsIcon,
  UploadFile as UploadIcon, Close as CloseIcon,
  Download as DownloadIcon, VerifiedUser as CertIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';
import { SAMPLE_PROJECTS } from '../projects/page';

const API    = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#1ca7a1';

const STATUS_META = {
  approved:      { label: 'Approved',      color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  final_approval:{ label: 'Approved',      color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  under_review:  { label: 'Under Review',  color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)'  },
  assigned:      { label: 'Assigned',      color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)'  },
  submitted:     { label: 'Submitted',     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  screened:      { label: 'Screened',      color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  decision:      { label: 'Decision',      color: '#f97316', bg: 'rgba(249,115,22,0.1)'  },
  rejected:      { label: 'Rejected',      color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
  draft:         { label: 'Draft',         color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
};

const TYPE_META = {
  existing_clearance: { label: 'Existing Clearance', color: '#10b981' },
  initial_review:   { label: 'Initial Review',    color: '#8b5cf6' },
  amendment:        { label: 'Amendment',          color: '#f97316' },
  renewal:          { label: 'Renewal',            color: '#0ea5e9' },
  full_review:      { label: 'Full Review',        color: '#8b5cf6' },
  expedited_review: { label: 'Expedited Review',   color: '#0ea5e9' },
  exempt:           { label: 'Exempt',             color: '#10b981' },
};

const inp = { '& .MuiOutlinedInput-root': { borderRadius: 2 } };

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function CertificateDropZone({ file, onFile, accent, dark, analyzing }) {
  const onDrop = useCallback(accepted => { if (accepted[0]) onFile(accepted[0]); }, [onFile]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    disabled: analyzing,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
  });

  return (
    <Box {...getRootProps()} sx={{
      border: `2px dashed ${isDragActive ? accent : 'divider'}`,
      borderRadius: 2, p: 3, textAlign: 'center', cursor: analyzing ? 'wait' : 'pointer',
      bgcolor: isDragActive ? `${accent}08` : dark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
      transition: 'all 0.15s', opacity: analyzing ? 0.85 : 1,
      '&:hover': { borderColor: accent, bgcolor: `${accent}06` },
    }}>
      <input {...getInputProps()} />
      {analyzing ? (
        <>
          <CircularProgress size={26} sx={{ color: accent, mb: 1 }} />
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Reading certificate…</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>Extracting title, issuing body, and dates</Typography>
        </>
      ) : file ? (
        <>
          <UploadIcon sx={{ fontSize: 28, color: accent, mb: 1 }} />
          <Typography sx={{ fontSize: 13, color: accent, fontWeight: 600 }}>{file.name}</Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>Click or drop to replace</Typography>
        </>
      ) : (
        <>
          <UploadIcon sx={{ fontSize: 28, color: 'text.disabled', mb: 1 }} />
          <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>Upload approval certificate</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>PDF, JPG, or PNG — fields auto-fill from file content</Typography>
        </>
      )}
    </Box>
  );
}

export default function EthicsPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark  = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [apps, setApps]       = useState([]);
  const [projects, setProjects] = useState([]);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const [certOpen, setCertOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeNote, setAnalyzeNote] = useState('');
  const [certForm, setCertForm] = useState({
    projectId: '',
    title: '',
    issuingBody: '',
    approvedUntil: '',
    approvalDate: '',
    protocolId: '',
    principalInvestigator: '',
    reviewType: '',
    file: null,
  });

  const setCert = (f, v) => setCertForm(p => ({ ...p, [f]: v }));

  useEffect(() => {
    fetchUser().then(u => {
      if (!u) { router.push('/login'); return; }
      loadData();
    });
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [appsRes, projectsRes] = await Promise.all([
        axios.get(`${API}/research/ethics/my`, { headers }),
        axios.get(`${API}/research/projects`, { headers }),
      ]);
      setApps(appsRes.data || []);
      const liveProjects = projectsRes.data || [];
      setProjects(liveProjects.length > 0 ? liveProjects : SAMPLE_PROJECTS);
    } catch {
      setApps([]);
      setProjects(SAMPLE_PROJECTS);
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (docId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/research/ethics/documents/${docId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const disposition = res.headers['content-disposition'];
      const match = disposition?.match(/filename="?([^"]+)"?/);
      link.download = match?.[1] || 'ethics-certificate';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Could not download certificate file.');
    }
  };

  const handleCertificateFile = async (file) => {
    setCert('file', file);
    setAnalyzing(true);
    setAnalyzeNote('');
    setError('');
    try {
      const token = localStorage.getItem('token');
      const body = new FormData();
      body.append('file', file);
      const res = await axios.post(`${API}/research/ethics/certificates/analyze`, body, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      const data = res.data || {};
      setCertForm(p => ({
        ...p,
        file,
        title: data.title || '',
        issuingBody: data.issuing_body || '',
        approvedUntil: data.approved_until || '',
        approvalDate: data.approval_date || '',
        protocolId: data.protocol_id || '',
        principalInvestigator: data.principal_investigator || '',
        reviewType: data.review_type || '',
        projectId: data.suggested_project_id || p.projectId,
      }));
      if (data.text_extracted) {
        if (data.confidence === 'high') {
          setAnalyzeNote('Fields auto-filled from the certificate. Review and edit if needed.');
        } else if (data.confidence === 'partial') {
          setAnalyzeNote('Some details were detected. Please verify and complete any missing fields.');
        } else {
          setAnalyzeNote('Limited text found. Please complete the fields manually.');
        }
      } else {
        setAnalyzeNote('Could not read text from this file (it may be a scan). Please enter details manually.');
      }
    } catch {
      setAnalyzeNote('Auto-fill unavailable. Please enter certificate details manually.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUploadCertificate = async () => {
    if (!certForm.file) {
      setError('Please upload the ethics approval certificate file.');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const body = new FormData();
      if (certForm.projectId) body.append('project_id', certForm.projectId);
      if (certForm.title.trim()) body.append('title', certForm.title.trim());
      if (certForm.issuingBody.trim()) body.append('issuing_body', certForm.issuingBody.trim());
      if (certForm.approvedUntil) body.append('approved_until', certForm.approvedUntil);
      if (certForm.approvalDate) body.append('approval_date', certForm.approvalDate);
      if (certForm.protocolId.trim()) body.append('protocol_id', certForm.protocolId.trim());
      if (certForm.principalInvestigator.trim()) body.append('principal_investigator', certForm.principalInvestigator.trim());
      if (certForm.reviewType.trim()) body.append('review_type', certForm.reviewType.trim());
      body.append('file', certForm.file);

      await axios.post(`${API}/research/ethics/certificates`, body, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });

      setSuccess('Ethics approval certificate uploaded successfully.');
      setCertOpen(false);
      setCertForm({
        projectId: '', title: '', issuingBody: '', approvedUntil: '', approvalDate: '',
        protocolId: '', principalInvestigator: '', reviewType: '', file: null,
      });
      setAnalyzeNote('');
      await loadData();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to upload certificate.');
    } finally {
      setUploading(false);
    }
  };

  const stats = {
    total:     apps.length,
    approved:  apps.filter(a => ['approved', 'final_approval'].includes(a.status)).length,
    reviewing: apps.filter(a => ['under_review', 'assigned', 'screened', 'submitted'].includes(a.status)).length,
    certificates: apps.filter(a => a.application_type === 'existing_clearance' || a.is_certificate).length,
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress sx={{ color: ACCENT }} />
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 42, height: 42, borderRadius: 2.5, bgcolor: `${ACCENT}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <EthicsIcon sx={{ fontSize: 22, color: ACCENT }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>Ethics Applications</Typography>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Submit applications or upload existing IRB / ethics approval certificates</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<UploadIcon sx={{ fontSize: 15 }} />}
            onClick={() => { setError(''); setSuccess(''); setAnalyzeNote(''); setCertOpen(true); }}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, borderColor: ACCENT, color: ACCENT,
              '&:hover': { borderColor: '#0e8a85', bgcolor: `${ACCENT}08` } }}>
            Upload Certificate
          </Button>
          <Button variant="contained" startIcon={<AddIcon sx={{ fontSize: 15 }} />}
            onClick={() => router.push('/researcher/ethics/new')}
            sx={{ bgcolor: ACCENT, textTransform: 'none', fontWeight: 600, borderRadius: 2, '&:hover': { bgcolor: '#0e8a85' } }}>
            New Application
          </Button>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3, fontSize: 12, borderRadius: 2 }}>
        <strong>Ethics Gate:</strong> Data collection for human-subjects research cannot commence until a valid ethics clearance is linked to your project. Upload an existing approval certificate or submit a new application.
      </Alert>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        {[
          { label: 'Total',         value: stats.total,        color: '#64748b' },
          { label: 'Approved',      value: stats.approved,     color: '#10b981' },
          { label: 'In Review',     value: stats.reviewing,    color: ACCENT   },
          { label: 'Certificates',  value: stats.certificates, color: '#8b5cf6' },
        ].map(s => (
          <Paper key={s.label} elevation={0} variant="outlined" sx={{ flex: '1 1 110px', p: 1.5, borderRadius: 2, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{s.label}</Typography>
          </Paper>
        ))}
      </Box>

      <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider',
          background: dark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>My Applications & Certificates</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{apps.length} record{apps.length !== 1 ? 's' : ''}</Typography>
        </Box>

        {apps.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <EthicsIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1.5 }} />
            <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 0.5 }}>No ethics records yet</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 3 }}>
              Submit a new ethics application or upload an existing approval certificate.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button variant="outlined" startIcon={<UploadIcon />}
                onClick={() => setCertOpen(true)}
                sx={{ textTransform: 'none', borderRadius: 2, borderColor: ACCENT, color: ACCENT }}>
                Upload Certificate
              </Button>
              <Button variant="contained" startIcon={<AddIcon />}
                onClick={() => router.push('/researcher/ethics/new')}
                sx={{ bgcolor: ACCENT, textTransform: 'none', borderRadius: 2, '&:hover': { bgcolor: '#0e8a85' } }}>
                New Application
              </Button>
            </Box>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.02)' : '#f8fafc' }}>
                  {['Reference', 'Title', 'Project', 'Type', 'PI', 'Status', 'Submitted', 'Actions'].map(h => (
                    <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, py: 1.5 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {apps.map(app => {
                  const sm = STATUS_META[app.status] || STATUS_META.draft;
                  const tm = TYPE_META[app.application_type] || TYPE_META.initial_review;
                  const isCert = app.application_type === 'existing_clearance' || app.is_certificate;
                  const certDoc = app.documents?.[0];
                  return (
                    <TableRow key={app.id} hover sx={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/researcher/ethics/${app.id}`)}>
                      <TableCell sx={{ fontSize: 12, fontWeight: 700, color: ACCENT, whiteSpace: 'nowrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {isCert && <CertIcon sx={{ fontSize: 14, color: '#10b981' }} />}
                          {app.ref || `ETHICS-${String(app.id).slice(0, 8).toUpperCase()}`}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 240 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.35 }} noWrap>{app.title}</Typography>
                        {app.approved_until && (
                          <Typography sx={{ fontSize: 10, color: '#10b981' }}>Valid until {fmtDate(app.approved_until)}</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 180 }}>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }} noWrap>{app.project_title || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={tm.label} size="small"
                          sx={{ bgcolor: `${tm.color}18`, color: tm.color, fontWeight: 700, fontSize: 10, height: 20 }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{app.pi || app.submitted_by_name || '—'}</TableCell>
                      <TableCell>
                        <Chip label={sm.label} size="small"
                          sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 700, fontSize: 10, height: 20 }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>{fmtDate(app.submitted_at)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }} onClick={e => e.stopPropagation()}>
                          {isCert && certDoc && (
                            <Tooltip title="Download certificate">
                              <IconButton size="small" onClick={() => downloadDocument(certDoc.id)}
                                sx={{ color: ACCENT }}>
                                <DownloadIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="View details">
                            <Button size="small" variant="outlined"
                              onClick={() => router.push(`/researcher/ethics/${app.id}`)}
                              sx={{ textTransform: 'none', fontSize: 11, borderRadius: 1.5, py: 0.3, minWidth: 0, px: 1.2 }}>
                              View
                            </Button>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={certOpen} onClose={() => !uploading && !analyzing && setCertOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CertIcon sx={{ color: ACCENT }} />
            <Typography sx={{ fontWeight: 800, fontSize: 18 }}>Upload Ethics Certificate</Typography>
          </Box>
          <IconButton size="small" onClick={() => !uploading && !analyzing && setCertOpen(false)} disabled={uploading || analyzing}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 2 }}>
            Upload an existing IRB / REC approval. The system reads the file and suggests certificate details you can edit before saving.
          </Typography>

          <CertificateDropZone
            file={certForm.file}
            onFile={handleCertificateFile}
            accent={ACCENT}
            dark={dark}
            analyzing={analyzing}
          />

          {analyzeNote && (
            <Alert severity="info" sx={{ mt: 2, mb: 2, borderRadius: 2, fontSize: 12 }}>{analyzeNote}</Alert>
          )}

          <TextField fullWidth size="small" label="Project Title"
            value={certForm.title} onChange={e => setCert('title', e.target.value)}
            placeholder="From certificate — e.g. study / project title"
            helperText="Uses Project Title from the certificate, not the generic certificate heading"
            sx={{ mb: 2, mt: 2, ...inp }} />

          <TextField fullWidth size="small" label="Issuing Body"
            value={certForm.issuingBody} onChange={e => setCert('issuingBody', e.target.value)}
            placeholder="e.g. Global Research Review Board"
            sx={{ mb: 2, ...inp }} />

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <TextField size="small" label="Protocol / Reference ID"
              value={certForm.protocolId} onChange={e => setCert('protocolId', e.target.value)}
              placeholder="e.g. GRRB-2026-NX84"
              sx={{ flex: '1 1 180px', ...inp }} />
            <TextField size="small" label="Principal Investigator"
              value={certForm.principalInvestigator} onChange={e => setCert('principalInvestigator', e.target.value)}
              placeholder="e.g. Stephen Gaita"
              sx={{ flex: '1 1 180px', ...inp }} />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <TextField size="small" label="Expiration Date" type="date"
              value={certForm.approvedUntil} onChange={e => setCert('approvedUntil', e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="Valid until / expiry on certificate"
              sx={{ flex: '1 1 180px', ...inp }} />
            <TextField size="small" label="Approval Date" type="date"
              value={certForm.approvalDate} onChange={e => setCert('approvalDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: '1 1 180px', ...inp }} />
          </Box>

          <TextField fullWidth size="small" label="Review Type"
            value={certForm.reviewType} onChange={e => setCert('reviewType', e.target.value)}
            placeholder="e.g. Expedited Full-Board Review"
            sx={{ mb: 2, ...inp }} />

          <FormControl fullWidth size="small" sx={{ ...inp }}>
            <InputLabel>Linked Project (optional)</InputLabel>
            <Select value={certForm.projectId} label="Linked Project (optional)"
              onChange={e => setCert('projectId', e.target.value)}>
              <MenuItem value="">None — link later</MenuItem>
              {projects.map(p => (
                <MenuItem key={p.id} value={p.id}>{p.title}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCertOpen(false)} disabled={uploading || analyzing} sx={{ textTransform: 'none', borderRadius: 2 }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleUploadCertificate} disabled={uploading || analyzing || !certForm.file}
            startIcon={uploading ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : <UploadIcon sx={{ fontSize: 16 }} />}
            sx={{ bgcolor: ACCENT, textTransform: 'none', borderRadius: 2, '&:hover': { bgcolor: '#0e8a85' } }}>
            {uploading ? 'Uploading…' : 'Upload Certificate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
