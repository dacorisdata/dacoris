'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme, Alert,
  Avatar, Divider, Paper, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, LinearProgress, Tooltip,
} from '@mui/material';
import {
  ArrowBack, Add as AddIcon, CheckCircle, RadioButtonUnchecked,
  Groups as TeamIcon, Gavel as EthicsIcon, Description as DocIcon,
  Science as ScienceIcon, Edit as EditIcon, Flag as FlagIcon,
  OpenInNew as OpenIcon, Delete as DeleteIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../../../contexts/AuthContext';

const API    = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#1ca7a1';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const statusColor = s => ({ active:'#10b981', proposed:'#f59e0b', completed:'#0ea5e9', suspended:'#ef4444' }[s?.toLowerCase()] || '#64748b');
const priorityColor = p => ({ critical:'#ef4444', high:'#f97316', medium:'#f59e0b', low:'#10b981' }[p] || '#64748b');
const milestoneStatusColor = s => ({ completed:'#10b981', in_progress:'#0ea5e9', pending:'#64748b', overdue:'#ef4444' }[s] || '#64748b');
const ethicsStatusColor = s => ({ approved:'#10b981', submitted:'#f59e0b', under_review:'#0ea5e9', rejected:'#ef4444' }[s] || '#64748b');

const MEMBER_ROLES = ['co_investigator','research_assistant','data_manager','external_collaborator'];
const PRIORITIES   = ['low','medium','high','critical'];

function MilestoneRow({ m, onToggle }) {
  const done = m.status === 'completed';
  const overdue = !done && m.due_date && new Date(m.due_date) < new Date();
  return (
    <Box sx={{ display:'flex', alignItems:'flex-start', gap:1.5, py:1.25, borderBottom:'1px solid', borderColor:'divider' }}>
      <IconButton size="small" onClick={() => onToggle(m.id, done ? 'pending' : 'completed')}
        sx={{ p:0, mt:0.2, color: done ? '#10b981' : 'text.disabled' }}>
        {done ? <CheckCircle sx={{ fontSize:20 }} /> : <RadioButtonUnchecked sx={{ fontSize:20 }} />}
      </IconButton>
      <Box sx={{ flex:1 }}>
        <Typography sx={{ fontSize:13, fontWeight:600, textDecoration: done ? 'line-through' : 'none', color: done ? 'text.disabled' : 'text.primary' }}>
          {m.title}
        </Typography>
        {m.description && <Typography sx={{ fontSize:11, color:'text.secondary', mt:0.2 }}>{m.description}</Typography>}
        <Box sx={{ display:'flex', gap:1, mt:0.5, flexWrap:'wrap', alignItems:'center' }}>
          <Typography sx={{ fontSize:10, color: overdue ? '#ef4444' : 'text.disabled' }}>
            Due {fmtDate(m.due_date)} {overdue ? '(Overdue)' : ''}
          </Typography>
          {m.task_count > 0 && (
            <Typography sx={{ fontSize:10, color:'text.disabled' }}>
              {m.done_count}/{m.task_count} tasks
            </Typography>
          )}
        </Box>
      </Box>
      <Box sx={{ display:'flex', gap:0.75, alignItems:'center', flexShrink:0 }}>
        <Chip label={m.priority} size="small"
          sx={{ fontSize:9, fontWeight:700, height:18, bgcolor:priorityColor(m.priority)+'22', color:priorityColor(m.priority), textTransform:'capitalize' }} />
        {m.assigned_to_name && (
          <Tooltip title={m.assigned_to_name}>
            <Avatar sx={{ width:20, height:20, fontSize:9, bgcolor:ACCENT }}>{m.assigned_to_name[0]}</Avatar>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
}

function AddMilestoneDialog({ open, onClose, onSave }) {
  const [form, setForm] = useState({ title:'', description:'', due_date:'', priority:'medium' });
  const [saving, setSaving] = useState(false);
  const handle = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    await onSave({ ...form, due_date: form.due_date ? new Date(form.due_date).toISOString() : null });
    setSaving(false);
    setForm({ title:'', description:'', due_date:'', priority:'medium' });
    onClose();
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx:{ borderRadius:3 } }}>
      <DialogTitle sx={{ fontWeight:700, pb:1 }}>Add Milestone</DialogTitle>
      <DialogContent sx={{ display:'flex', flexDirection:'column', gap:2, pt:'8px !important' }}>
        <TextField fullWidth size="small" label="Title *" value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} />
        <TextField fullWidth size="small" label="Description" multiline rows={2} value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} />
        <Box sx={{ display:'flex', gap:2 }}>
          <TextField size="small" label="Due Date" type="date" InputLabelProps={{ shrink:true }} value={form.due_date}
            onChange={e => setForm(f=>({...f,due_date:e.target.value}))} sx={{ flex:1 }} />
          <TextField size="small" select label="Priority" value={form.priority}
            onChange={e => setForm(f=>({...f,priority:e.target.value}))} sx={{ flex:1 }}>
            {PRIORITIES.map(p => <MenuItem key={p} value={p} sx={{ textTransform:'capitalize',fontSize:12 }}>{p}</MenuItem>)}
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p:2, pt:0 }}>
        <Button onClick={onClose} sx={{ textTransform:'none' }}>Cancel</Button>
        <Button variant="contained" onClick={handle} disabled={saving || !form.title.trim()}
          sx={{ bgcolor:ACCENT, textTransform:'none', borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
          {saving ? 'Saving…' : 'Add Milestone'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function InviteMemberDialog({ open, onClose, onSave }) {
  const [form, setForm] = useState({ email:'', name:'', role:'co_investigator' });
  const [saving, setSaving] = useState(false);
  const handle = async () => {
    if (!form.email.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
    setForm({ email:'', name:'', role:'co_investigator' });
    onClose();
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx:{ borderRadius:3 } }}>
      <DialogTitle sx={{ fontWeight:700, pb:1 }}>Invite Team Member</DialogTitle>
      <DialogContent sx={{ display:'flex', flexDirection:'column', gap:2, pt:'8px !important' }}>
        <TextField fullWidth size="small" label="Email *" type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} />
        <TextField fullWidth size="small" label="Name (optional)" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} />
        <TextField fullWidth size="small" select label="Role" value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value}))}>
          {MEMBER_ROLES.map(r => <MenuItem key={r} value={r} sx={{ textTransform:'capitalize', fontSize:12 }}>{r.replace(/_/g,' ')}</MenuItem>)}
        </TextField>
      </DialogContent>
      <DialogActions sx={{ p:2, pt:0 }}>
        <Button onClick={onClose} sx={{ textTransform:'none' }}>Cancel</Button>
        <Button variant="contained" onClick={handle} disabled={saving || !form.email.trim()}
          sx={{ bgcolor:ACCENT, textTransform:'none', borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
          {saving ? 'Inviting…' : 'Invite'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const { id }  = useParams();
  const { fetchUser } = useAuth();
  const theme   = useTheme();
  const dark    = theme.palette.mode === 'dark';

  const [loading, setLoading]       = useState(true);
  const [project, setProject]       = useState(null);
  const [error, setError]           = useState('');
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [memberOpen, setMemberOpen]       = useState(false);

  useEffect(() => {
    fetchUser().then(u => { if (!u) router.push('/login'); else loadProject(); });
  }, [id]);

  const loadProject = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/research/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProject(res.data);
    } catch (e) {
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const toggleMilestone = async (milestoneId, newStatus) => {
    const token = localStorage.getItem('token');
    try {
      await axios.patch(`${API}/research/projects/${id}/milestones/${milestoneId}`,
        { status: newStatus }, { headers: { Authorization: `Bearer ${token}` } });
      setProject(p => ({
        ...p,
        milestones: p.milestones.map(m => m.id === milestoneId ? { ...m, status: newStatus } : m),
      }));
    } catch (e) { setError('Failed to update milestone'); }
  };

  const addMilestone = async (data) => {
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${API}/research/projects/${id}/milestones`, data,
        { headers: { Authorization: `Bearer ${token}` } });
      await loadProject();
    } catch (e) { setError('Failed to add milestone'); }
  };

  const inviteMember = async (data) => {
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${API}/research/projects/${id}/members`, data,
        { headers: { Authorization: `Bearer ${token}` } });
      await loadProject();
    } catch (e) { setError(e.response?.data?.detail || 'Failed to invite member'); }
  };

  const removeMember = async (memberId) => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API}/research/projects/${id}/members/${memberId}`,
        { headers: { Authorization: `Bearer ${token}` } });
      setProject(p => ({ ...p, members: p.members.filter(m => m.id !== memberId) }));
    } catch (e) { setError('Failed to remove member'); }
  };

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;
  if (!project) return <Box sx={{ p:4 }}><Alert severity="error">Project not found</Alert></Box>;

  const milestones  = project.milestones || [];
  const members     = project.members    || [];
  const documents   = project.documents  || [];
  const ethicsApps  = project.ethics_applications || [];

  const doneMilestones = milestones.filter(m => m.status === 'completed').length;
  const milestonePct   = milestones.length > 0 ? Math.round(doneMilestones / milestones.length * 100) : 0;

  return (
    <Box sx={{ p:{ xs:2, md:3 } }}>
      {/* Header */}
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:3, gap:2 }}>
        <Box sx={{ display:'flex', gap:1.5, alignItems:'flex-start' }}>
          <IconButton onClick={() => router.push('/researcher/projects')} size="small" sx={{ mt:0.5 }}>
            <ArrowBack sx={{ fontSize:18 }} />
          </IconButton>
          <Box>
            <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:0.5 }}>
              <Chip label={project.status} size="small"
                sx={{ fontSize:11, fontWeight:700, textTransform:'capitalize',
                  bgcolor:statusColor(project.status)+'22', color:statusColor(project.status) }} />
              <Chip label={project.project_type} size="small"
                sx={{ fontSize:10, fontWeight:600, textTransform:'capitalize', bgcolor:'background.paper', border:'1px solid', borderColor:'divider' }} />
              {project.involves_human_subjects && (
                <Chip label="Human subjects" size="small" sx={{ fontSize:10, bgcolor:'rgba(239,68,68,0.08)', color:'#ef4444' }} />
              )}
            </Box>
            <Typography sx={{ fontSize:20, fontWeight:800, lineHeight:1.3 }}>{project.title}</Typography>
            {project.description && (
              <Typography sx={{ fontSize:13, color:'text.secondary', mt:0.5, maxWidth:700 }}>{project.description}</Typography>
            )}
            <Typography sx={{ fontSize:12, color:'text.disabled', mt:0.5 }}>
              {fmtDate(project.start_date)} → {fmtDate(project.end_date)} · PI: {project.pi_name}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display:'flex', gap:1, flexShrink:0 }}>
          <Button size="small" variant="outlined" onClick={() => router.push(`/researcher/ethics?project=${id}`)}
            startIcon={<EthicsIcon sx={{ fontSize:14 }} />}
            sx={{ textTransform:'none', fontSize:12, borderRadius:2 }}>
            Ethics
          </Button>
          <Button size="small" variant="contained" onClick={() => router.push(`/researcher/publications?project=${id}`)}
            startIcon={<DocIcon sx={{ fontSize:14 }} />}
            sx={{ bgcolor:ACCENT, textTransform:'none', fontSize:12, borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
            Outputs
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb:2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Progress bar */}
      <Paper elevation={0} variant="outlined" sx={{ p:2, borderRadius:2.5, mb:3 }}>
        <Box sx={{ display:'flex', justifyContent:'space-between', mb:0.75 }}>
          <Typography sx={{ fontSize:12, fontWeight:700, color:'text.secondary' }}>Overall Progress</Typography>
          <Typography sx={{ fontSize:12, fontWeight:800, color:ACCENT }}>{milestonePct}%</Typography>
        </Box>
        <LinearProgress variant="determinate" value={milestonePct}
          sx={{ height:6, borderRadius:3, bgcolor:'divider',
            '& .MuiLinearProgress-bar':{ bgcolor:ACCENT, borderRadius:3 } }} />
        <Typography sx={{ fontSize:11, color:'text.disabled', mt:0.5 }}>
          {doneMilestones} of {milestones.length} milestones completed
        </Typography>
      </Paper>

      <Box sx={{ display:'grid', gridTemplateColumns:{ xs:'1fr', lg:'1fr 340px' }, gap:3 }}>

        {/* LEFT: Milestones */}
        <Box>
          <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:2 }}>
            <Typography sx={{ fontSize:15, fontWeight:700 }}>
              Milestones <Typography component="span" sx={{ fontSize:12, color:'text.disabled', fontWeight:400 }}>({milestones.length})</Typography>
            </Typography>
            <Button size="small" startIcon={<AddIcon sx={{ fontSize:14 }} />} onClick={() => setMilestoneOpen(true)}
              sx={{ textTransform:'none', fontSize:12, color:ACCENT, fontWeight:600 }}>
              Add
            </Button>
          </Box>

          {milestones.length === 0 ? (
            <Box sx={{ textAlign:'center', py:5, color:'text.disabled' }}>
              <FlagIcon sx={{ fontSize:36, mb:1 }} />
              <Typography sx={{ fontSize:13 }}>No milestones yet. Add the first one to track project progress.</Typography>
            </Box>
          ) : (
            <Box>
              {milestones.map(m => (
                <MilestoneRow key={m.id} m={m} onToggle={toggleMilestone} />
              ))}
            </Box>
          )}
        </Box>

        {/* RIGHT: Team + Docs + Ethics */}
        <Box sx={{ display:'flex', flexDirection:'column', gap:2.5 }}>

          {/* Team */}
          <Paper elevation={0} variant="outlined" sx={{ borderRadius:2.5, overflow:'hidden' }}>
            <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', px:2, py:1.5,
              bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              borderBottom:'1px solid', borderColor:'divider' }}>
              <Box sx={{ display:'flex', alignItems:'center', gap:0.75 }}>
                <TeamIcon sx={{ fontSize:15, color:'text.secondary' }} />
                <Typography sx={{ fontSize:13, fontWeight:700 }}>Team ({members.length})</Typography>
              </Box>
              <Button size="small" startIcon={<AddIcon sx={{ fontSize:13 }} />} onClick={() => setMemberOpen(true)}
                sx={{ textTransform:'none', fontSize:11, color:ACCENT, fontWeight:600, minWidth:0 }}>
                Invite
              </Button>
            </Box>
            <Box sx={{ p:1.5 }}>
              {/* PI */}
              <Box sx={{ display:'flex', alignItems:'center', gap:1, py:0.75 }}>
                <Avatar sx={{ width:28, height:28, fontSize:11, bgcolor:ACCENT }}>{(project.pi_name||'P')[0]}</Avatar>
                <Box sx={{ flex:1, minWidth:0 }}>
                  <Typography sx={{ fontSize:12, fontWeight:600 }}>{project.pi_name}</Typography>
                  <Typography sx={{ fontSize:10, color:'text.disabled' }}>Principal Investigator</Typography>
                </Box>
                <Chip label="PI" size="small" sx={{ fontSize:9, height:18, bgcolor:`${ACCENT}22`, color:ACCENT, fontWeight:700 }} />
              </Box>
              {members.map(m => (
                <Box key={m.id} sx={{ display:'flex', alignItems:'center', gap:1, py:0.75 }}>
                  <Avatar sx={{ width:28, height:28, fontSize:11, bgcolor:'#8b5cf6' }}>{(m.user_name||m.invited_email||'?')[0].toUpperCase()}</Avatar>
                  <Box sx={{ flex:1, minWidth:0 }}>
                    <Typography sx={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {m.user_name || m.invited_email}
                    </Typography>
                    <Typography sx={{ fontSize:10, color:'text.disabled', textTransform:'capitalize' }}>
                      {m.role?.replace(/_/g,' ')} · {m.status}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => removeMember(m.id)}
                    sx={{ color:'text.disabled', '&:hover':{ color:'error.main' }, p:0.25 }}>
                    <DeleteIcon sx={{ fontSize:13 }} />
                  </IconButton>
                </Box>
              ))}
              {members.length === 0 && (
                <Typography sx={{ fontSize:12, color:'text.disabled', py:1, textAlign:'center' }}>No co-investigators yet</Typography>
              )}
            </Box>
          </Paper>

          {/* Ethics */}
          <Paper elevation={0} variant="outlined" sx={{ borderRadius:2.5, overflow:'hidden' }}>
            <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', px:2, py:1.5,
              bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              borderBottom:'1px solid', borderColor:'divider' }}>
              <Box sx={{ display:'flex', alignItems:'center', gap:0.75 }}>
                <EthicsIcon sx={{ fontSize:15, color:'text.secondary' }} />
                <Typography sx={{ fontSize:13, fontWeight:700 }}>Ethics ({ethicsApps.length})</Typography>
              </Box>
              <Button size="small" startIcon={<AddIcon sx={{ fontSize:13 }} />}
                onClick={() => router.push(`/researcher/ethics?project=${id}`)}
                sx={{ textTransform:'none', fontSize:11, color:ACCENT, fontWeight:600, minWidth:0 }}>
                Apply
              </Button>
            </Box>
            <Box sx={{ p:1.5 }}>
              {ethicsApps.length === 0 ? (
                <Box sx={{ textAlign:'center', py:1.5 }}>
                  {project.involves_human_subjects && (
                    <Alert severity="warning" sx={{ fontSize:11, mb:1 }}>
                      Ethics clearance required for data collection.
                    </Alert>
                  )}
                  <Typography sx={{ fontSize:12, color:'text.disabled' }}>No ethics applications</Typography>
                </Box>
              ) : ethicsApps.map(e => (
                <Box key={e.id} sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', py:0.75 }}>
                  <Box>
                    <Typography sx={{ fontSize:12, fontWeight:600 }}>{e.title || `App #${e.id}`}</Typography>
                    <Typography sx={{ fontSize:10, color:'text.disabled', textTransform:'capitalize' }}>{e.application_type?.replace(/_/g,' ')}</Typography>
                  </Box>
                  <Chip label={e.status?.replace(/_/g,' ')} size="small"
                    sx={{ fontSize:9, fontWeight:700, height:18, textTransform:'capitalize',
                      bgcolor:ethicsStatusColor(e.status)+'22', color:ethicsStatusColor(e.status) }} />
                </Box>
              ))}
            </Box>
          </Paper>

          {/* Documents */}
          <Paper elevation={0} variant="outlined" sx={{ borderRadius:2.5, overflow:'hidden' }}>
            <Box sx={{ px:2, py:1.5, bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              borderBottom:'1px solid', borderColor:'divider' }}>
              <Box sx={{ display:'flex', alignItems:'center', gap:0.75 }}>
                <DocIcon sx={{ fontSize:15, color:'text.secondary' }} />
                <Typography sx={{ fontSize:13, fontWeight:700 }}>Documents ({documents.length})</Typography>
              </Box>
            </Box>
            <Box sx={{ p:1.5 }}>
              {documents.length === 0 ? (
                <Typography sx={{ fontSize:12, color:'text.disabled', textAlign:'center', py:1 }}>No documents uploaded</Typography>
              ) : documents.map(d => (
                <Box key={d.id} sx={{ display:'flex', alignItems:'center', gap:1, py:0.75 }}>
                  <DocIcon sx={{ fontSize:14, color:'text.disabled' }} />
                  <Box sx={{ flex:1, minWidth:0 }}>
                    <Typography sx={{ fontSize:12, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {d.original_filename}
                    </Typography>
                    <Typography sx={{ fontSize:10, color:'text.disabled', textTransform:'capitalize' }}>
                      {d.document_type?.replace(/_/g,' ')} · {fmtDate(d.uploaded_at)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>

        </Box>
      </Box>

      <AddMilestoneDialog open={milestoneOpen} onClose={() => setMilestoneOpen(false)} onSave={addMilestone} />
      <InviteMemberDialog open={memberOpen}    onClose={() => setMemberOpen(false)}    onSave={inviteMember} />
    </Box>
  );
}
