'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, TextField, MenuItem, Stepper, Step, StepLabel,
  Switch, FormControlLabel, Chip, Avatar, Alert, CircularProgress,
  Paper, IconButton, useTheme, Divider, Tooltip,
} from '@mui/material';
import {
  ArrowBack, ArrowForward, Check, Add as AddIcon,
  Delete as DeleteIcon, Upload as UploadIcon, Person as PersonIcon,
  Science as ScienceIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { useAuth } from '../../../../contexts/AuthContext';

const API    = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#1ca7a1';

const STEPS      = ['Basic Info', 'Team / Co-Investigators', 'Documents'];
const TYPES      = ['funded','internal','unfunded','collaborative','independent'];
const ROLES      = ['co_investigator','research_assistant','data_manager','external_collaborator'];
const DOC_TYPES  = ['proposal','ethics_clearance','budget','data_management_plan','IRB_protocol','consent_form','report','other'];

function StepBasicInfo({ form, onChange }) {
  return (
    <Box sx={{ display:'flex', flexDirection:'column', gap:2.5 }}>
      <TextField fullWidth label="Project Title *" value={form.title} onChange={e => onChange('title', e.target.value)}
        placeholder="A descriptive title for your research project" />
      <TextField fullWidth label="Description" value={form.description} onChange={e => onChange('description', e.target.value)}
        multiline rows={3} placeholder="Brief overview of the project aims and approach" />
      <Box sx={{ display:'flex', gap:2 }}>
        <TextField select fullWidth label="Project Type" value={form.project_type} onChange={e => onChange('project_type', e.target.value)}>
          {TYPES.map(t => <MenuItem key={t} value={t} sx={{ textTransform:'capitalize' }}>{t.replace(/_/g,' ')}</MenuItem>)}
        </TextField>
        <TextField fullWidth label="Year" type="number" value={form.year || ''} onChange={e => onChange('year', e.target.value)}
          inputProps={{ min: 2000, max: 2040 }} />
      </Box>
      <Box sx={{ display:'flex', gap:2 }}>
        <TextField fullWidth label="Start Date" type="date" value={form.start_date}
          onChange={e => onChange('start_date', e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField fullWidth label="End Date" type="date" value={form.end_date}
          onChange={e => onChange('end_date', e.target.value)} InputLabelProps={{ shrink: true }} />
      </Box>
      <FormControlLabel
        control={<Switch checked={form.involves_human_subjects}
          onChange={e => onChange('involves_human_subjects', e.target.checked)}
          sx={{ '& .MuiSwitch-switchBase.Mui-checked':{ color:'#ef4444' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track':{ bgcolor:'#ef4444' } }} />}
        label={
          <Box>
            <Typography sx={{ fontSize:13, fontWeight:600 }}>Involves human subjects</Typography>
            <Typography sx={{ fontSize:11, color:'text.secondary' }}>Ethics clearance will be required before data collection</Typography>
          </Box>
        }
      />
    </Box>
  );
}

function StepTeam({ members, onAdd, onRemove }) {
  const [email, setEmail] = useState('');
  const [name, setName]   = useState('');
  const [role, setRole]   = useState('co_investigator');
  const theme = useTheme();

  const handleAdd = () => {
    if (!email) return;
    onAdd({ email, name: name || email, role });
    setEmail(''); setName(''); setRole('co_investigator');
  };

  return (
    <Box>
      <Typography sx={{ fontSize:13, color:'text.secondary', mb:2 }}>
        Invite Co-Investigators and team members. They will receive a notification once the project is created.
      </Typography>

      <Paper elevation={0} variant="outlined" sx={{ p:2, borderRadius:2, mb:2 }}>
        <Typography sx={{ fontSize:12, fontWeight:700, mb:1.5, color:'text.secondary', textTransform:'uppercase', letterSpacing:0.5 }}>
          Invite a member
        </Typography>
        <Box sx={{ display:'flex', gap:1.5, flexWrap:'wrap' }}>
          <TextField size="small" label="Email *" value={email} onChange={e => setEmail(e.target.value)}
            sx={{ flex:'2 1 200px' }} />
          <TextField size="small" label="Name (optional)" value={name} onChange={e => setName(e.target.value)}
            sx={{ flex:'2 1 160px' }} />
          <TextField size="small" select label="Role" value={role} onChange={e => setRole(e.target.value)}
            sx={{ flex:'1 1 180px' }}>
            {ROLES.map(r => <MenuItem key={r} value={r} sx={{ fontSize:12, textTransform:'capitalize' }}>{r.replace(/_/g,' ')}</MenuItem>)}
          </TextField>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}
            disabled={!email}
            sx={{ bgcolor:ACCENT, textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#0e7490' }, '&:disabled':{ bgcolor:'action.disabledBackground' } }}>
            Add
          </Button>
        </Box>
      </Paper>

      {members.length === 0 ? (
        <Box sx={{ textAlign:'center', py:4, color:'text.disabled' }}>
          <PersonIcon sx={{ fontSize:36, mb:1 }} />
          <Typography sx={{ fontSize:13 }}>No team members added yet. You can also add them after creating the project.</Typography>
        </Box>
      ) : (
        <Box sx={{ display:'flex', flexDirection:'column', gap:1 }}>
          {members.map((m, i) => (
            <Box key={i} sx={{ display:'flex', alignItems:'center', gap:1.5, p:1.5,
              bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2 }}>
              <Avatar sx={{ width:32, height:32, fontSize:12, bgcolor:ACCENT }}>
                {(m.name || m.email)[0].toUpperCase()}
              </Avatar>
              <Box sx={{ flex:1, minWidth:0 }}>
                <Typography sx={{ fontSize:13, fontWeight:600 }}>{m.name || m.email}</Typography>
                <Typography sx={{ fontSize:11, color:'text.secondary' }}>{m.email}</Typography>
              </Box>
              <Chip label={m.role.replace(/_/g,' ')} size="small"
                sx={{ fontSize:10, fontWeight:600, textTransform:'capitalize' }} />
              <IconButton size="small" onClick={() => onRemove(i)} sx={{ color:'text.disabled', '&:hover':{ color:'error.main' } }}>
                <DeleteIcon sx={{ fontSize:16 }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

function StepDocuments({ files, onAdd, onRemove }) {
  const theme = useTheme();
  const [docType, setDocType] = useState('proposal');

  const onDrop = useCallback(accepted => {
    accepted.forEach(file => onAdd({ file, document_type: docType }));
  }, [docType, onAdd]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, multiple: true,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.png','.jpg','.jpeg'],
    },
  });

  return (
    <Box>
      <Typography sx={{ fontSize:13, color:'text.secondary', mb:2 }}>
        Upload project documents (protocol, ethics application, budget). You can upload more later.
      </Typography>

      <Box sx={{ display:'flex', gap:2, mb:2, alignItems:'center', flexWrap:'wrap' }}>
        <TextField select size="small" label="Document Type" value={docType}
          onChange={e => setDocType(e.target.value)} sx={{ minWidth:220 }}>
          {DOC_TYPES.map(t => <MenuItem key={t} value={t} sx={{ fontSize:12, textTransform:'capitalize' }}>{t.replace(/_/g,' ')}</MenuItem>)}
        </TextField>
      </Box>

      <Box {...getRootProps()} sx={{
        border:`2px dashed ${isDragActive ? ACCENT : theme.palette.divider}`,
        borderRadius:2.5, p:4, textAlign:'center', cursor:'pointer', mb:2,
        bgcolor: isDragActive ? `${ACCENT}08` : 'transparent',
        transition:'all 0.15s',
        '&:hover':{ borderColor:ACCENT, bgcolor:`${ACCENT}06` },
      }}>
        <input {...getInputProps()} />
        <UploadIcon sx={{ fontSize:32, color: isDragActive ? ACCENT : 'text.disabled', mb:1 }} />
        <Typography sx={{ fontSize:13, fontWeight:600, color: isDragActive ? ACCENT : 'text.secondary' }}>
          {isDragActive ? 'Drop files here' : 'Drag & drop files or click to browse'}
        </Typography>
        <Typography sx={{ fontSize:11, color:'text.disabled', mt:0.5 }}>
          PDF, Word, Images · Document type: <strong>{docType.replace(/_/g,' ')}</strong>
        </Typography>
      </Box>

      {files.length > 0 && (
        <Box sx={{ display:'flex', flexDirection:'column', gap:0.75 }}>
          {files.map((f, i) => (
            <Box key={i} sx={{ display:'flex', alignItems:'center', gap:1.5, p:1.25,
              bgcolor:'background.paper', border:`1px solid ${theme.palette.divider}`, borderRadius:2 }}>
              <UploadIcon sx={{ fontSize:16, color:ACCENT }} />
              <Box sx={{ flex:1, minWidth:0 }}>
                <Typography sx={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {f.file.name}
                </Typography>
                <Typography sx={{ fontSize:10, color:'text.disabled' }}>
                  {(f.file.size / 1024).toFixed(0)} KB · {f.document_type.replace(/_/g,' ')}
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => onRemove(i)} sx={{ color:'text.disabled', '&:hover':{ color:'error.main' } }}>
                <DeleteIcon sx={{ fontSize:15 }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default function NewProjectPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme  = useTheme();
  const [step, setStep]       = useState(0);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [members, setMembers] = useState([]);
  const [files, setFiles]     = useState([]);
  const [form, setForm] = useState({
    title: '', description: '', project_type: 'funded',
    start_date: '', end_date: '', involves_human_subjects: false, year: '',
  });

  useEffect(() => { fetchUser().then(u => { if (!u) router.push('/login'); }); }, []);

  const onChange = (field, val) => setForm(f => ({ ...f, [field]: val }));
  const canNext  = step === 0 ? !!form.title.trim() : true;

  const handleSubmit = async () => {
    setError('');
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const body = {
        title: form.title.trim(),
        description: form.description || null,
        project_type: form.project_type,
        involves_human_subjects: form.involves_human_subjects,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
        end_date:   form.end_date   ? new Date(form.end_date).toISOString()   : null,
      };

      const proj = await axios.post(`${API}/research/projects`, body, { headers });
      const id = proj.data.id;

      // Invite members
      await Promise.allSettled(members.map(m =>
        axios.post(`${API}/research/projects/${id}/members`, m, { headers })
      ));

      // Upload documents
      for (const f of files) {
        const fd = new FormData();
        fd.append('document_type', f.document_type);
        fd.append('file', f.file);
        await axios.post(`${API}/research/projects/${id}/documents`, fd, { headers });
      }

      router.push(`/researcher/projects/${id}/setup`);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create project');
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p:{ xs:2, md:4 }, maxWidth:760, mx:'auto' }}>
      <Button startIcon={<ArrowBack />} onClick={() => router.back()}
        sx={{ mb:3, textTransform:'none', color:'text.secondary' }}>
        Back
      </Button>

      <Box sx={{ display:'flex', alignItems:'center', gap:1.5, mb:4 }}>
        <ScienceIcon sx={{ fontSize:28, color:ACCENT }} />
        <Box>
          <Typography sx={{ fontSize:22, fontWeight:800 }}>Register Research Project</Typography>
          <Typography sx={{ fontSize:13, color:'text.secondary' }}>Set up your project with team, documents, and ethics information</Typography>
        </Box>
      </Box>

      <Stepper activeStep={step} sx={{ mb:4,
        '& .MuiStepIcon-root.Mui-completed':{ color:ACCENT },
        '& .MuiStepIcon-root.Mui-active':{ color:ACCENT },
      }}>
        {STEPS.map(s => <Step key={s}><StepLabel sx={{ '& .MuiStepLabel-label':{ fontSize:13 } }}>{s}</StepLabel></Step>)}
      </Stepper>

      {error && <Alert severity="error" sx={{ mb:2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper elevation={0} variant="outlined" sx={{ p:3, borderRadius:3, mb:3 }}>
        {step === 0 && <StepBasicInfo form={form} onChange={onChange} />}
        {step === 1 && <StepTeam members={members}
          onAdd={m => setMembers(ms => [...ms, m])}
          onRemove={i => setMembers(ms => ms.filter((_,j) => j !== i))} />}
        {step === 2 && <StepDocuments files={files}
          onAdd={f => setFiles(fs => [...fs, f])}
          onRemove={i => setFiles(fs => fs.filter((_,j) => j !== i))} />}
      </Paper>

      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <Button onClick={() => setStep(s => s - 1)} disabled={step === 0}
          startIcon={<ArrowBack />} sx={{ textTransform:'none' }}>
          Back
        </Button>

        <Box sx={{ display:'flex', gap:1 }}>
          {step < STEPS.length - 1 ? (
            <Button variant="contained" endIcon={<ArrowForward />}
              disabled={!canNext} onClick={() => setStep(s => s + 1)}
              sx={{ bgcolor:ACCENT, textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
              Continue
            </Button>
          ) : (
            <Button variant="contained" startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Check />}
              disabled={saving || !form.title.trim()} onClick={handleSubmit}
              sx={{ bgcolor:ACCENT, textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
              {saving ? 'Creating…' : 'Create Project'}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}
