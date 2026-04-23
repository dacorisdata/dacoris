'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme,
  Stepper, Step, StepLabel, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Paper,
} from '@mui/material';
import { Add as AddIcon, UploadFile as UploadIcon, Gavel as EthicsIcon } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';

const API    = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#1ca7a1';

const ETHICS_STAGES = ['Submitted','Screened','Assigned','Under Review','Decision','Final Approval'];
const APP_TYPES = [
  { value:'full_review',     label:'Full Review' },
  { value:'expedited_review',label:'Expedited Review' },
  { value:'exempt',          label:'Exempt' },
];
const DOC_TYPES = ['protocol','consent_form','data_management_plan','site_permission','other'];

const statusColor = s => ({
  approved:'#10b981', final_approval:'#10b981', rejected:'#ef4444',
  under_review:'#0ea5e9', assigned:'#0ea5e9',
  submitted:'#f59e0b', screened:'#f59e0b', decision:'#f97316',
}[s] || '#64748b');
const typeColor = t => ({
  full_review:'#8b5cf6', expedited_review:'#0ea5e9', exempt:'#10b981',
}[t] || '#64748b');
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';

function NewApplicationDialog({ open, onClose, projects, onCreated }) {
  const theme = useTheme();
  const dark  = theme.palette.mode === 'dark';
  const [step, setStep]   = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [files, setFiles]   = useState([]);
  const [docType, setDocType] = useState('protocol');
  const [form, setForm] = useState({
    project_id:'', application_type:'full_review', title:'',
    lay_summary:'', methodology:'', risk_assessment:'', data_handling:'',
  });
  const [createdId, setCreatedId] = useState(null);

  const onDrop = useCallback(accepted => {
    setFiles(fs => [...fs, ...accepted.map(f => ({ file:f, document_type:docType }))]);
  }, [docType]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple:true });

  const submit = async () => {
    if (!form.project_id || !form.title.trim()) return;
    setSaving(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`${API}/research/ethics`, {
        ...form, project_id: parseInt(form.project_id),
      }, { headers });
      const newId = res.data.id;
      setCreatedId(newId);

      for (const f of files) {
        const fd = new FormData();
        fd.append('document_type', f.document_type);
        fd.append('file', f.file);
        await axios.post(`${API}/research/ethics/${newId}/documents`, fd, { headers });
      }
      onCreated(res.data);
      onClose();
      setForm({ project_id:'', application_type:'full_review', title:'', lay_summary:'', methodology:'', risk_assessment:'', data_handling:'' });
      setFiles([]); setStep(0);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to submit');
    } finally { setSaving(false); }
  };

  const SUB_STEPS = ['Application Info', 'Methodology & Risk', 'Documents'];
  const canNext = step === 0
    ? !!(form.project_id && form.title.trim())
    : true;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx:{ borderRadius:3 } }}>
      <DialogTitle sx={{ fontWeight:700, pb:1 }}>New Ethics Application</DialogTitle>
      <DialogContent>
        <Stepper activeStep={step} sx={{ mb:3,
          '& .MuiStepIcon-root.Mui-completed':{ color:ACCENT },
          '& .MuiStepIcon-root.Mui-active':{ color:ACCENT },
        }}>
          {SUB_STEPS.map(s => <Step key={s}><StepLabel sx={{ '& .MuiStepLabel-label':{ fontSize:12 } }}>{s}</StepLabel></Step>)}
        </Stepper>

        {error && <Alert severity="error" sx={{ mb:2, fontSize:12 }}>{error}</Alert>}

        {step === 0 && (
          <Box sx={{ display:'flex', flexDirection:'column', gap:2 }}>
            <TextField select fullWidth size="small" label="Project *" value={form.project_id}
              onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}>
              {projects.map(p => <MenuItem key={p.id} value={p.id} sx={{ fontSize:13 }}>{p.title}</MenuItem>)}
            </TextField>
            <TextField select fullWidth size="small" label="Application Type" value={form.application_type}
              onChange={e => setForm(f => ({ ...f, application_type: e.target.value }))}>
              {APP_TYPES.map(t => <MenuItem key={t.value} value={t.value} sx={{ fontSize:13 }}>{t.label}</MenuItem>)}
            </TextField>
            <TextField fullWidth size="small" label="Application Title *" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <TextField fullWidth size="small" label="Lay Summary" multiline rows={3} value={form.lay_summary}
              onChange={e => setForm(f => ({ ...f, lay_summary: e.target.value }))}
              placeholder="Briefly describe the research in plain language…" />
          </Box>
        )}

        {step === 1 && (
          <Box sx={{ display:'flex', flexDirection:'column', gap:2 }}>
            <TextField fullWidth size="small" label="Methodology" multiline rows={4} value={form.methodology}
              onChange={e => setForm(f => ({ ...f, methodology: e.target.value }))}
              placeholder="Describe the research design and data collection methods…" />
            <TextField fullWidth size="small" label="Risk Assessment" multiline rows={3} value={form.risk_assessment}
              onChange={e => setForm(f => ({ ...f, risk_assessment: e.target.value }))}
              placeholder="Identify potential risks to participants and mitigation strategies…" />
            <TextField fullWidth size="small" label="Data Handling" multiline rows={3} value={form.data_handling}
              onChange={e => setForm(f => ({ ...f, data_handling: e.target.value }))}
              placeholder="How will participant data be collected, stored, and protected?…" />
          </Box>
        )}

        {step === 2 && (
          <Box>
            <Box sx={{ display:'flex', gap:2, mb:2, alignItems:'center' }}>
              <TextField select size="small" label="Document Type" value={docType}
                onChange={e => setDocType(e.target.value)} sx={{ minWidth:200 }}>
                {DOC_TYPES.map(t => <MenuItem key={t} value={t} sx={{ fontSize:12, textTransform:'capitalize' }}>{t.replace(/_/g,' ')}</MenuItem>)}
              </TextField>
            </Box>
            <Box {...getRootProps()} sx={{
              border:`2px dashed ${isDragActive ? ACCENT : theme.palette.divider}`,
              borderRadius:2.5, p:3.5, textAlign:'center', cursor:'pointer',
              bgcolor: isDragActive ? `${ACCENT}08` : 'transparent',
              '&:hover':{ borderColor:ACCENT, bgcolor:`${ACCENT}06` }, mb:2, transition:'all 0.15s',
            }}>
              <input {...getInputProps()} />
              <UploadIcon sx={{ fontSize:28, color:'text.disabled', mb:0.5 }} />
              <Typography sx={{ fontSize:12, color:'text.secondary' }}>
                {isDragActive ? 'Drop files here' : 'Drag & drop or click — protocol, consent forms, etc.'}
              </Typography>
            </Box>
            {files.map((f, i) => (
              <Box key={i} sx={{ display:'flex', alignItems:'center', gap:1, mb:0.75,
                p:1.25, border:`1px solid ${theme.palette.divider}`, borderRadius:1.5 }}>
                <UploadIcon sx={{ fontSize:14, color:ACCENT }} />
                <Typography sx={{ fontSize:12, flex:1 }}>{f.file.name}</Typography>
                <Chip label={f.document_type.replace(/_/g,' ')} size="small"
                  sx={{ fontSize:9, height:18, textTransform:'capitalize' }} />
                <Button size="small" onClick={() => setFiles(fs => fs.filter((_,j) => j !== i))}
                  sx={{ p:0, minWidth:0, fontSize:11, color:'text.disabled' }}>✕</Button>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p:2, pt:0, justifyContent:'space-between' }}>
        <Button onClick={() => step > 0 ? setStep(s => s-1) : onClose()}
          sx={{ textTransform:'none' }}>{step === 0 ? 'Cancel' : 'Back'}</Button>
        <Box sx={{ display:'flex', gap:1 }}>
          {step < SUB_STEPS.length - 1 ? (
            <Button variant="contained" onClick={() => setStep(s => s+1)} disabled={!canNext}
              sx={{ bgcolor:ACCENT, textTransform:'none', borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
              Continue
            </Button>
          ) : (
            <Button variant="contained" onClick={submit} disabled={saving || !form.project_id || !form.title.trim()}
              sx={{ bgcolor:ACCENT, textTransform:'none', borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
              {saving ? 'Submitting…' : 'Submit Application'}
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
}

function EthicsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark  = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [apps, setApps]       = useState([]);
  const [projects, setProjects] = useState([]);
  const [newOpen, setNewOpen] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    fetchUser().then(u => {
      if (!u) router.push('/login');
      else loadData();
    });
  }, []);

  const loadData = async () => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [ethRes, projRes] = await Promise.all([
        axios.get(`${API}/research/ethics/my`, { headers }),
        axios.get(`${API}/research/projects`, { headers }).catch(() => ({ data:[] })),
      ]);
      setApps(ethRes.data || []);
      setProjects(projRes.data || []);

      const projectId = searchParams.get('project');
      if (projectId) setNewOpen(true);
    } catch (e) { setError('Failed to load ethics applications'); }
    finally { setLoading(false); }
  };

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  const statuses = ['approved','under_review','submitted','screened','rejected'];

  return (
    <Box sx={{ p:3 }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:3 }}>
        <Box>
          <Typography sx={{ fontSize:22, fontWeight:700 }}>Ethics Applications</Typography>
          <Typography sx={{ fontSize:13, color:'text.secondary', mt:0.3 }}>Submit and track IRB / ethics committee applications for your research projects</Typography>
        </Box>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setNewOpen(true)}
          sx={{ bgcolor:ACCENT, textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
          New Application
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb:3, fontSize:12 }}>
        <strong>Ethics Gate:</strong> Data collection for human-subjects research cannot begin until a valid ethics clearance is linked to your project.
      </Alert>

      {error && <Alert severity="error" sx={{ mb:2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Stats */}
      <Box sx={{ display:'flex', gap:1.5, mb:3, flexWrap:'wrap' }}>
        {[
          { label:'Approved',    value: apps.filter(a => a.status === 'approved' || a.status === 'final_approval').length, color:'#10b981' },
          { label:'Under Review',value: apps.filter(a => ['under_review','assigned','screened'].includes(a.status)).length, color:'#0ea5e9' },
          { label:'Submitted',   value: apps.filter(a => a.status === 'submitted').length, color:'#f59e0b' },
        ].map(s => (
          <Box key={s.label} sx={{ flex:'1 1 120px', bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2, p:1.5, textAlign:'center' }}>
            <Typography sx={{ fontSize:20, fontWeight:700, color:s.color }}>{s.value}</Typography>
            <Typography sx={{ fontSize:11, color:'text.secondary', fontWeight:600 }}>{s.label}</Typography>
          </Box>
        ))}
      </Box>

      {apps.length === 0 ? (
        <Box sx={{ textAlign:'center', py:8 }}>
          <EthicsIcon sx={{ fontSize:52, color:'text.disabled', mb:2 }} />
          <Typography sx={{ fontWeight:700, mb:0.5 }}>No applications yet</Typography>
          <Typography sx={{ fontSize:13, color:'text.secondary', mb:3 }}>Submit an ethics application for projects that involve human subjects.</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNewOpen(true)}
            sx={{ bgcolor:ACCENT, textTransform:'none', borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
            New Application
          </Button>
        </Box>
      ) : (
        <Box sx={{ display:'flex', flexDirection:'column', gap:3 }}>
          {apps.map(app => (
            <Paper key={app.id} elevation={0} variant="outlined" sx={{ borderRadius:2.5, p:3 }}>
              {app.status === 'approved' || app.status === 'final_approval' ? (
                <Alert severity="success" sx={{ mb:2, fontSize:12 }}>
                  Ethics clearance approved. Valid until {fmtDate(app.approved_until)}.
                </Alert>
              ) : app.status === 'rejected' ? (
                <Alert severity="error" sx={{ mb:2, fontSize:12 }}>
                  Application rejected. {app.decision_notes}
                </Alert>
              ) : null}

              <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:2 }}>
                <Box>
                  <Typography sx={{ fontSize:15, fontWeight:700, mb:0.5 }}>{app.title}</Typography>
                  <Typography sx={{ fontSize:13, color:'text.secondary', mb:0.75 }}>{app.project_title}</Typography>
                  <Chip label={app.application_type?.replace(/_/g,' ')} size="small"
                    sx={{ fontSize:10, fontWeight:700, textTransform:'capitalize',
                      bgcolor:typeColor(app.application_type)+'22', color:typeColor(app.application_type) }} />
                </Box>
                <Box sx={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:0.5 }}>
                  <Chip label={app.status?.replace(/_/g,' ')} size="small"
                    sx={{ fontSize:11, fontWeight:700, textTransform:'capitalize',
                      bgcolor:statusColor(app.status)+'22', color:statusColor(app.status) }} />
                  {app.approved_until && (
                    <Typography sx={{ fontSize:10, color:'text.disabled' }}>Valid until {fmtDate(app.approved_until)}</Typography>
                  )}
                </Box>
              </Box>

              <Stepper activeStep={app.stage_index} alternativeLabel sx={{ mb:2.5,
                '& .MuiStepLabel-label':{ fontSize:10 },
                '& .MuiStepIcon-root.Mui-completed':{ color:'#10b981' },
                '& .MuiStepIcon-root.Mui-active':{ color:ACCENT },
              }}>
                {ETHICS_STAGES.map(l => <Step key={l}><StepLabel>{l}</StepLabel></Step>)}
              </Stepper>

              {app.documents?.length > 0 && (
                <Box sx={{ mb:2 }}>
                  <Typography sx={{ fontSize:11, color:'text.secondary', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, mb:0.75 }}>Documents</Typography>
                  <Box sx={{ display:'flex', gap:0.75, flexWrap:'wrap' }}>
                    {app.documents.map(d => (
                      <Chip key={d.id} label={d.original_filename} size="small"
                        icon={<UploadIcon sx={{ fontSize:'12px !important' }} />}
                        sx={{ fontSize:10, fontWeight:600, bgcolor: dark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.05)', color:'text.secondary' }} />
                    ))}
                  </Box>
                </Box>
              )}

              <Typography sx={{ fontSize:11, color:'text.disabled' }}>
                Submitted {fmtDate(app.submitted_at)} · {app.document_count} document{app.document_count !== 1 ? 's' : ''}
              </Typography>
            </Paper>
          ))}
        </Box>
      )}

      <NewApplicationDialog open={newOpen} onClose={() => setNewOpen(false)}
        projects={projects}
        onCreated={app => setApps(as => [app, ...as])} />
    </Box>
  );
}

export default function EthicsPage() {
  return (
    <Suspense fallback={null}>
      <EthicsPageContent />
    </Suspense>
  );
}
