'use client';
import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme, TextField,
  MenuItem, IconButton, Tooltip, Avatar, Alert, Divider, Dialog,
  DialogTitle, DialogContent, DialogActions, Paper,
} from '@mui/material';
import {
  Add as AddIcon, Save as SaveIcon, Delete as DeleteIcon,
  FormatBold, FormatItalic, FormatUnderlined, FormatListBulleted,
  FormatListNumbered, FormatQuote, Code, Link as LinkIcon,
  TableChart, Undo, Redo, FormatAlignLeft, FormatAlignCenter,
  FormatAlignRight, Check as CheckIcon, People as PeopleIcon,
  Article as ArticleIcon, AutoAwesome as DraftIcon,
} from '@mui/icons-material';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import CharacterCount from '@tiptap/extension-character-count';
import Placeholder from '@tiptap/extension-placeholder';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';

const API    = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#1ca7a1';

const OUTPUT_TYPES = [
  'journal_article','conference_paper','book_chapter','dataset',
  'patent','thesis','report','software','preprint',
];
const STATUS_OPTS = ['draft','in_review','published'];

const typeColor = t => ({
  journal_article:'#0ea5e9', conference_paper:'#8b5cf6', dataset:'#10b981',
  report:'#f59e0b', book_chapter:'#f97316', patent:'#ef4444',
  thesis:'#6366f1', software:'#84cc16', preprint:'#64748b',
}[t] || '#64748b');

const statusColor = s => ({
  published:'#10b981', in_review:'#0ea5e9', draft:'#64748b',
}[s] || '#64748b');

/* ── Toolbar button ─────────────────────────────────────────────────── */
function TB({ title, onClick, active, children, disabled }) {
  return (
    <Tooltip title={title}>
      <span>
        <IconButton size="small" onClick={onClick} disabled={disabled}
          sx={{ borderRadius:1.5, p:0.6,
            bgcolor: active ? `${ACCENT}22` : 'transparent',
            color:   active ? ACCENT : 'text.secondary',
            '&:hover':{ bgcolor:`${ACCENT}15` }, '&:disabled':{ opacity:0.3 } }}>
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}

/* ── Editor toolbar ─────────────────────────────────────────────────── */
function EditorToolbar({ editor }) {
  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt('URL');
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  return (
    <Box sx={{ display:'flex', alignItems:'center', gap:0.25, flexWrap:'wrap',
      px:1.5, py:0.75, borderBottom:'1px solid', borderColor:'divider',
      bgcolor:'background.paper', position:'sticky', top:0, zIndex:10 }}>

      <TB title="Undo" onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}><Undo sx={{ fontSize:16 }} /></TB>
      <TB title="Redo" onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}><Redo sx={{ fontSize:16 }} /></TB>

      <Divider orientation="vertical" flexItem sx={{ mx:0.5 }} />

      {[1,2,3].map(n => (
        <TB key={n} title={`Heading ${n}`}
          active={editor.isActive('heading', { level: n })}
          onClick={() => editor.chain().focus().toggleHeading({ level: n }).run()}>
          <Typography sx={{ fontSize:11, fontWeight:800, lineHeight:1, px:0.25 }}>H{n}</Typography>
        </TB>
      ))}

      <Divider orientation="vertical" flexItem sx={{ mx:0.5 }} />

      <TB title="Bold" active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}>
        <FormatBold sx={{ fontSize:16 }} />
      </TB>
      <TB title="Italic" active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}>
        <FormatItalic sx={{ fontSize:16 }} />
      </TB>
      <TB title="Underline" active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <FormatUnderlined sx={{ fontSize:16 }} />
      </TB>
      <TB title="Highlight" active={editor.isActive('highlight')}
        onClick={() => editor.chain().focus().toggleHighlight().run()}>
        <Box sx={{ width:16, height:16, bgcolor:'#fef08a', borderRadius:0.5, border:'1px solid #ca8a04' }} />
      </TB>
      <TB title="Code" active={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code sx={{ fontSize:16 }} />
      </TB>

      <Divider orientation="vertical" flexItem sx={{ mx:0.5 }} />

      <TB title="Align Left"   active={editor.isActive({ textAlign:'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}>
        <FormatAlignLeft sx={{ fontSize:16 }} />
      </TB>
      <TB title="Align Center" active={editor.isActive({ textAlign:'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}>
        <FormatAlignCenter sx={{ fontSize:16 }} />
      </TB>
      <TB title="Align Right"  active={editor.isActive({ textAlign:'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}>
        <FormatAlignRight sx={{ fontSize:16 }} />
      </TB>

      <Divider orientation="vertical" flexItem sx={{ mx:0.5 }} />

      <TB title="Bullet list" active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <FormatListBulleted sx={{ fontSize:16 }} />
      </TB>
      <TB title="Ordered list" active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <FormatListNumbered sx={{ fontSize:16 }} />
      </TB>
      <TB title="Task list" active={editor.isActive('taskList')}
        onClick={() => editor.chain().focus().toggleTaskList().run()}>
        <CheckIcon sx={{ fontSize:16 }} />
      </TB>
      <TB title="Blockquote" active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <FormatQuote sx={{ fontSize:16 }} />
      </TB>

      <Divider orientation="vertical" flexItem sx={{ mx:0.5 }} />

      <TB title="Insert link" active={editor.isActive('link')} onClick={addLink}>
        <LinkIcon sx={{ fontSize:16 }} />
      </TB>
      <TB title="Insert table" onClick={insertTable}>
        <TableChart sx={{ fontSize:16 }} />
      </TB>
    </Box>
  );
}

/* ── New output dialog ──────────────────────────────────────────────── */
function NewOutputDialog({ open, onClose, onCreated, projects }) {
  const [form, setForm] = useState({ title:'', output_type:'journal_article', project_id:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handle = async () => {
    if (!form.title.trim()) return;
    setSaving(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const body  = { ...form, project_id: form.project_id || null };
      const res   = await axios.post(`${API}/research/outputs`, body,
        { headers: { Authorization: `Bearer ${token}` } });
      onCreated(res.data);
      setForm({ title:'', output_type:'journal_article', project_id:'' });
      onClose();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx:{ borderRadius:3 } }}>
      <DialogTitle sx={{ fontWeight:700, pb:1 }}>New Research Output</DialogTitle>
      <DialogContent sx={{ display:'flex', flexDirection:'column', gap:2, pt:'8px !important' }}>
        {error && <Alert severity="error" sx={{ fontSize:12 }}>{error}</Alert>}
        <TextField fullWidth size="small" label="Title *" value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        <TextField fullWidth size="small" select label="Output Type" value={form.output_type}
          onChange={e => setForm(f => ({ ...f, output_type: e.target.value }))}>
          {OUTPUT_TYPES.map(t => (
            <MenuItem key={t} value={t} sx={{ fontSize:13, textTransform:'capitalize' }}>
              {t.replace(/_/g,' ')}
            </MenuItem>
          ))}
        </TextField>
        <TextField fullWidth size="small" select label="Linked Project (optional)"
          value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}>
          <MenuItem value="">— None —</MenuItem>
          {projects.map(p => <MenuItem key={p.id} value={p.id} sx={{ fontSize:13 }}>{p.title}</MenuItem>)}
        </TextField>
      </DialogContent>
      <DialogActions sx={{ p:2, pt:0 }}>
        <Button onClick={onClose} sx={{ textTransform:'none' }}>Cancel</Button>
        <Button variant="contained" onClick={handle} disabled={saving || !form.title.trim()}
          sx={{ bgcolor:ACCENT, textTransform:'none', borderRadius:2, '&:hover':{ bgcolor:'#0e7490' } }}>
          {saving ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Main page ──────────────────────────────────────────────────────── */
function ResearchOutputsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark  = theme.palette.mode === 'dark';

  const [loading, setLoading]           = useState(true);
  const [outputs, setOutputs]           = useState([]);
  const [projects, setProjects]         = useState([]);
  const [selected, setSelected]         = useState(null);
  const [meta, setMeta]                 = useState({});
  const [saveStatus, setSaveStatus]     = useState('saved'); // saved | saving | unsaved
  const [collaborators, setCollaborators] = useState([]);
  const [newOpen, setNewOpen]           = useState(false);
  const [error, setError]               = useState('');

  const saveTimerRef    = useRef(null);
  const presenceTimerRef = useRef(null);
  const editorRef       = useRef(null);

  /* TipTap editor */
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      TextAlign.configure({ types: ['heading','paragraph'] }),
      Link.configure({ openOnClick: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      CharacterCount,
      Placeholder.configure({ placeholder: 'Start writing your research output…' }),
    ],
    content: {},
    onUpdate: () => {
      setSaveStatus('unsaved');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => triggerAutoSave(), 3000);
    },
  });

  useEffect(() => {
    fetchUser().then(u => {
      if (!u) { router.push('/login'); return; }
      loadData();
    });
    return () => {
      if (saveTimerRef.current)    clearTimeout(saveTimerRef.current);
      if (presenceTimerRef.current) clearInterval(presenceTimerRef.current);
    };
  }, []);

  const loadData = async () => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [outRes, projRes] = await Promise.all([
        axios.get(`${API}/research/outputs`, { headers }),
        axios.get(`${API}/research/projects`, { headers }).catch(() => ({ data:[] })),
      ]);
      setOutputs(outRes.data || []);
      setProjects(projRes.data || []);

      const projectId = searchParams.get('project');
      if (projectId && outRes.data.length === 0) setNewOpen(true);
    } catch (e) { setError('Failed to load outputs'); }
    finally { setLoading(false); }
  };

  const openOutput = async (output) => {
    setSelected(output);
    setMeta({ title: output.title, abstract: output.abstract || '', doi: output.doi || '',
               year: output.year || '', journal_name: output.journal_name || '',
               output_type: output.output_type, status: output.status });
    setSaveStatus('saved');

    const token = localStorage.getItem('token');
    const res = await axios.get(`${API}/research/outputs/${output.id}`,
      { headers: { Authorization: `Bearer ${token}` } });
    try {
      const content = JSON.parse(res.data.content_tiptap || '{}');
      editor?.commands.setContent(content);
    } catch { editor?.commands.setContent({}); }

    if (presenceTimerRef.current) clearInterval(presenceTimerRef.current);
    pingPresence(output.id);
    presenceTimerRef.current = setInterval(() => pingPresence(output.id), 10000);
  };

  const pingPresence = async (id) => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    try {
      await axios.post(`${API}/research/outputs/${id}/presence`, {}, { headers });
      const res = await axios.get(`${API}/research/outputs/${id}/presence`, { headers });
      setCollaborators(res.data?.collaborators || []);
    } catch {}
  };

  const triggerAutoSave = useCallback(async () => {
    if (!selected || !editor) return;
    setSaveStatus('saving');
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API}/research/outputs/${selected.id}`, {
        content_tiptap: JSON.stringify(editor.getJSON()),
        title:        meta.title,
        abstract:     meta.abstract || null,
        doi:          meta.doi || null,
        year:         meta.year ? parseInt(meta.year) : null,
        journal_name: meta.journal_name || null,
        status:       meta.status,
        output_type:  meta.output_type,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setSaveStatus('saved');
      setOutputs(os => os.map(o => o.id === selected.id ? { ...o, ...meta } : o));
    } catch { setSaveStatus('unsaved'); }
  }, [selected, editor, meta]);

  const manualSave = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    triggerAutoSave();
  };

  const deleteOutput = async (id) => {
    if (!window.confirm('Delete this output?')) return;
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API}/research/outputs/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setOutputs(os => os.filter(o => o.id !== id));
      if (selected?.id === id) { setSelected(null); editor?.commands.clearContent(); }
    } catch { setError('Failed to delete'); }
  };

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  const wordCount = editor ? editor.storage.characterCount?.words?.() ?? 0 : 0;
  const charCount = editor ? editor.storage.characterCount?.characters?.() ?? 0 : 0;

  return (
    <Box sx={{ display:'flex', height:'100vh', overflow:'hidden' }}>

      {/* ── LEFT: Output list ────────────────────────────── */}
      <Box sx={{ width:280, flexShrink:0, borderRight:'1px solid', borderColor:'divider',
        display:'flex', flexDirection:'column', bgcolor:'background.paper' }}>
        <Box sx={{ p:2, borderBottom:'1px solid', borderColor:'divider' }}>
          <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:1 }}>
            <Typography sx={{ fontSize:14, fontWeight:700 }}>Research Outputs</Typography>
            <Tooltip title="New output">
              <IconButton size="small" onClick={() => setNewOpen(true)}
                sx={{ bgcolor:`${ACCENT}22`, color:ACCENT, '&:hover':{ bgcolor:`${ACCENT}33` } }}>
                <AddIcon sx={{ fontSize:16 }} />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography sx={{ fontSize:11, color:'text.disabled' }}>{outputs.length} output{outputs.length !== 1 ? 's' : ''}</Typography>
        </Box>

        <Box sx={{ flex:1, overflowY:'auto' }}>
          {error && <Alert severity="error" sx={{ m:1.5, fontSize:11 }}>{error}</Alert>}
          {outputs.length === 0 ? (
            <Box sx={{ textAlign:'center', p:3 }}>
              <ArticleIcon sx={{ fontSize:36, color:'text.disabled', mb:1 }} />
              <Typography sx={{ fontSize:12, color:'text.secondary' }}>No outputs yet.</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={() => setNewOpen(true)}
                sx={{ mt:1.5, textTransform:'none', color:ACCENT, fontSize:12 }}>
                Create Output
              </Button>
            </Box>
          ) : outputs.map(o => (
            <Box key={o.id} onClick={() => openOutput(o)}
              sx={{ px:2, py:1.5, cursor:'pointer', borderBottom:'1px solid', borderColor:'divider',
                bgcolor: selected?.id === o.id ? `${ACCENT}12` : 'transparent',
                borderLeft: selected?.id === o.id ? `3px solid ${ACCENT}` : '3px solid transparent',
                transition:'all 0.12s',
                '&:hover':{ bgcolor: selected?.id === o.id ? `${ACCENT}12` : 'action.hover' } }}>
              <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:0.5 }}>
                <Typography sx={{ fontSize:12, fontWeight:600, lineHeight:1.35, flex:1, pr:1,
                  color: selected?.id === o.id ? ACCENT : 'text.primary',
                  overflow:'hidden', textOverflow:'ellipsis',
                  display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                  {o.title}
                </Typography>
                <IconButton size="small" onClick={e => { e.stopPropagation(); deleteOutput(o.id); }}
                  sx={{ p:0.25, color:'text.disabled', opacity:0, '&:hover':{ color:'error.main', opacity:1 },
                    '.MuiBox-root:hover &':{ opacity:1 } }}>
                  <DeleteIcon sx={{ fontSize:13 }} />
                </IconButton>
              </Box>
              <Box sx={{ display:'flex', gap:0.5, alignItems:'center', flexWrap:'wrap' }}>
                <Chip label={o.output_type?.replace(/_/g,' ')} size="small"
                  sx={{ fontSize:9, height:16, fontWeight:700, textTransform:'capitalize',
                    bgcolor:typeColor(o.output_type)+'22', color:typeColor(o.output_type) }} />
                <Chip label={o.status} size="small"
                  sx={{ fontSize:9, height:16, fontWeight:700, textTransform:'capitalize',
                    bgcolor:statusColor(o.status)+'22', color:statusColor(o.status) }} />
              </Box>
              {o.project_title && (
                <Typography sx={{ fontSize:10, color:'text.disabled', mt:0.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {o.project_title}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── RIGHT: Editor area ───────────────────────────── */}
      {!selected ? (
        <Box sx={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2 }}>
          <DraftIcon sx={{ fontSize:64, color:'text.disabled' }} />
          <Typography sx={{ fontWeight:700, fontSize:18, color:'text.secondary' }}>Select or create a research output</Typography>
          <Typography sx={{ fontSize:13, color:'text.disabled', maxWidth:380, textAlign:'center' }}>
            Write journal articles, conference papers, datasets, reports and more — with rich formatting, auto-save, and collaborator awareness.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNewOpen(true)}
            sx={{ bgcolor:ACCENT, textTransform:'none', borderRadius:2, mt:1, '&:hover':{ bgcolor:'#0e7490' } }}>
            New Output
          </Button>
        </Box>
      ) : (
        <Box sx={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* Top bar */}
          <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            px:2.5, py:1.25, borderBottom:'1px solid', borderColor:'divider', flexShrink:0, flexWrap:'wrap', gap:1 }}>
            <Box sx={{ flex:1, minWidth:0 }}>
              <TextField value={meta.title} onChange={e => setMeta(m => ({ ...m, title: e.target.value }))}
                onBlur={manualSave}
                variant="standard" fullWidth
                inputProps={{ style:{ fontSize:17, fontWeight:700 } }}
                sx={{ '& .MuiInput-underline:before':{ borderColor:'transparent' },
                  '& .MuiInput-underline:hover:before':{ borderColor:'divider' } }} />
            </Box>
            <Box sx={{ display:'flex', gap:1, alignItems:'center', flexShrink:0 }}>
              {collaborators.map(c => (
                <Tooltip key={c.user_id} title={`${c.name} is editing`}>
                  <Avatar sx={{ width:24, height:24, fontSize:10, bgcolor:'#8b5cf6', border:'2px solid', borderColor:'background.paper' }}>
                    {c.name?.[0]?.toUpperCase()}
                  </Avatar>
                </Tooltip>
              ))}
              {collaborators.length > 0 && (
                <Chip icon={<PeopleIcon sx={{ fontSize:12 }} />}
                  label={`${collaborators.length} editing`} size="small"
                  sx={{ fontSize:10, bgcolor:'rgba(139,92,246,0.1)', color:'#8b5cf6', fontWeight:600 }} />
              )}
              <Chip
                label={saveStatus === 'saving' ? 'Saving…' : saveStatus === 'unsaved' ? 'Unsaved' : '✓ Saved'}
                size="small"
                sx={{ fontSize:10, fontWeight:600,
                  bgcolor: saveStatus === 'saved' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                  color:   saveStatus === 'saved' ? '#10b981' : '#f59e0b' }} />
              <Tooltip title="Save now (Ctrl+S)">
                <IconButton size="small" onClick={manualSave}
                  sx={{ color:ACCENT, '&:hover':{ bgcolor:`${ACCENT}15` } }}>
                  <SaveIcon sx={{ fontSize:18 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Metadata strip */}
          <Box sx={{ display:'flex', gap:1.5, px:2.5, py:1, borderBottom:'1px solid', borderColor:'divider',
            flexShrink:0, flexWrap:'wrap', alignItems:'center', bgcolor: dark?'rgba(255,255,255,0.02)':'rgba(0,0,0,0.015)' }}>
            <TextField size="small" select label="Type" value={meta.output_type}
              onChange={e => { setMeta(m => ({ ...m, output_type: e.target.value })); setSaveStatus('unsaved'); }}
              sx={{ minWidth:150, '& .MuiOutlinedInput-root':{ borderRadius:2, fontSize:12 } }}>
              {OUTPUT_TYPES.map(t => <MenuItem key={t} value={t} sx={{ fontSize:12, textTransform:'capitalize' }}>{t.replace(/_/g,' ')}</MenuItem>)}
            </TextField>
            <TextField size="small" select label="Status" value={meta.status}
              onChange={e => { setMeta(m => ({ ...m, status: e.target.value })); setSaveStatus('unsaved'); }}
              sx={{ minWidth:120, '& .MuiOutlinedInput-root':{ borderRadius:2, fontSize:12 } }}>
              {STATUS_OPTS.map(s => <MenuItem key={s} value={s} sx={{ fontSize:12, textTransform:'capitalize' }}>{s.replace(/_/g,' ')}</MenuItem>)}
            </TextField>
            <TextField size="small" label="Year" type="number" value={meta.year}
              onChange={e => { setMeta(m => ({ ...m, year: e.target.value })); setSaveStatus('unsaved'); }}
              onBlur={manualSave} sx={{ width:90, '& .MuiOutlinedInput-root':{ borderRadius:2, fontSize:12 } }} />
            <TextField size="small" label="Journal / Venue" value={meta.journal_name}
              onChange={e => { setMeta(m => ({ ...m, journal_name: e.target.value })); setSaveStatus('unsaved'); }}
              onBlur={manualSave} sx={{ flex:'1 1 200px', '& .MuiOutlinedInput-root':{ borderRadius:2, fontSize:12 } }} />
            <TextField size="small" label="DOI" value={meta.doi}
              onChange={e => { setMeta(m => ({ ...m, doi: e.target.value })); setSaveStatus('unsaved'); }}
              onBlur={manualSave} sx={{ flex:'1 1 180px', '& .MuiOutlinedInput-root':{ borderRadius:2, fontSize:12, fontFamily:'monospace' } }} />
          </Box>

          {/* Abstract */}
          <Box sx={{ px:2.5, py:1.25, borderBottom:'1px solid', borderColor:'divider', flexShrink:0 }}>
            <TextField multiline rows={2} fullWidth size="small" label="Abstract"
              value={meta.abstract} placeholder="Summarise the key findings and contributions…"
              onChange={e => { setMeta(m => ({ ...m, abstract: e.target.value })); setSaveStatus('unsaved'); }}
              onBlur={manualSave}
              sx={{ '& .MuiOutlinedInput-root':{ borderRadius:2, fontSize:12 } }} />
          </Box>

          {/* Toolbar + Editor */}
          <EditorToolbar editor={editor} />

          <Box sx={{ flex:1, overflow:'auto', px:{ xs:2, md:6 }, py:3,
            '& .ProseMirror':{ outline:'none', minHeight:400, fontSize:15, lineHeight:1.75,
              '& h1':{ fontSize:'1.75em', fontWeight:800, mt:0 },
              '& h2':{ fontSize:'1.4em', fontWeight:700 },
              '& h3':{ fontSize:'1.15em', fontWeight:700 },
              '& blockquote':{ borderLeft:`3px solid ${ACCENT}`, pl:2, ml:0, color:'text.secondary', fontStyle:'italic' },
              '& code':{ bgcolor: dark?'#1e293b':'#f1f5f9', px:0.75, py:0.25, borderRadius:1, fontFamily:'monospace', fontSize:'0.88em' },
              '& table':{ borderCollapse:'collapse', width:'100%', my:2 },
              '& td, & th':{ border:`1px solid ${theme.palette.divider}`, p:'6px 10px' },
              '& th':{ bgcolor: dark?'#1e293b':'#f8fafc', fontWeight:700 },
              '& ul[data-type="taskList"]':{ listStyle:'none', pl:0 },
              '& li[data-type="taskItem"]':{ display:'flex', gap:1, alignItems:'flex-start' },
              '& p.is-editor-empty:first-child::before':{ content:'attr(data-placeholder)', color:'text.disabled', float:'left', pointerEvents:'none', height:0 },
            } }}>
            <EditorContent editor={editor} />
          </Box>

          {/* Status bar */}
          <Box sx={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:2,
            px:2.5, py:0.75, borderTop:'1px solid', borderColor:'divider', flexShrink:0,
            bgcolor: dark?'rgba(255,255,255,0.02)':'rgba(0,0,0,0.01)' }}>
            <Typography sx={{ fontSize:10, color:'text.disabled' }}>{wordCount} words · {charCount} characters</Typography>
            {selected.last_edited_by_name && (
              <Typography sx={{ fontSize:10, color:'text.disabled' }}>
                Last edited by {selected.last_edited_by_name}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      <NewOutputDialog open={newOpen} onClose={() => setNewOpen(false)} projects={projects}
        onCreated={o => { setOutputs(os => [o, ...os]); openOutput(o); }} />
    </Box>
  );
}

export default function ResearchOutputsPage() {
  return (
    <Suspense fallback={null}>
      <ResearchOutputsContent />
    </Suspense>
  );
}
