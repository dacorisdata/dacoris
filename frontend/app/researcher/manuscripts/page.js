'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Paper, TextField, Dialog, DialogContent, DialogTitle, DialogActions,
  Stepper, Step, StepLabel, Chip, IconButton, Autocomplete, useTheme, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Menu, MenuItem,
  Avatar, AvatarGroup, Tooltip, Stack, Divider, Select, FormControl, InputLabel,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, MoreVert as MoreIcon,
  Article as ArticleIcon, Person as PersonIcon, Close as CloseIcon, Search as SearchIcon,
} from '@mui/icons-material';
import {
  TeamInvitePanel, MANUSCRIPT_TEAM_ROLES,
} from '../../../components/TeamInvitePanel';

const ACCENT = '#1ca7a1';

const STEPS = ['Manuscript Details', 'Team'];

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

const STATUS_STYLES = {
  draft:      { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0', label: 'Draft' },
  in_review:  { bg: '#eff6ff', color: '#3b82f6', border: '#bfdbfe', label: 'In Review' },
  submitted:  { bg: '#fffbeb', color: '#d97706', border: '#fde68a', label: 'Submitted' },
  published:  { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'Published' },
};

export default function ManuscriptsPage() {
  const router = useRouter();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [manuscripts, setManuscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentManuscript, setCurrentManuscript] = useState(null);
  
  // Inline editing state
  const [editingTitle, setEditingTitle] = useState(null);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [editingDescription, setEditingDescription] = useState(null);
  const [editingKeywords, setEditingKeywords] = useState(null);
  const [tempTitle, setTempTitle] = useState('');
  const [tempDepartments, setTempDepartments] = useState([]);
  const [tempDescription, setTempDescription] = useState('');
  const [tempKeywords, setTempKeywords] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    keywords: [],
    shortDescription: '',
    coAuthors: [],
  });
  const [teamMembers, setTeamMembers] = useState([]);
  
  // Available departments list
  const availableDepartments = [
    'Computer Science',
    'Biology',
    'Chemistry',
    'Physics',
    'Mathematics',
    'Engineering',
    'Medicine',
    'Psychology',
    'Economics',
    'Sociology',
  ];

  // Co-author search state (legacy team dialog on manuscript list)

  // Team management state
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [teamManuscript, setTeamManuscript] = useState(null);
  const [teamInviteForm, setTeamInviteForm] = useState({ givenName: '', familyName: '', email: '', orcid: '', role: 'author' });
  const [teamSearchingOrcid, setTeamSearchingOrcid] = useState(false);
  const [teamOrcidResults, setTeamOrcidResults] = useState([]);
  const [teamActionLoading, setTeamActionLoading] = useState(null);
  const [teamInviteOpen, setTeamInviteOpen] = useState(false);

  useEffect(() => {
    fetchManuscripts();
  }, []);

  const fetchManuscripts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/manuscripts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setManuscripts(data);
      }
    } catch (error) {
      console.error('Error fetching manuscripts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/manuscripts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          short_description: formData.shortDescription,
          department: formData.department,
          keywords: JSON.stringify(formData.keywords),
          co_authors: teamMembers.map((ca, idx) => ({
            given_name: ca.given_name,
            family_name: ca.family_name,
            email: ca.email,
            orcid: ca.orcid,
            role: ca.role || 'author',
            author_order: idx + 2,
          })),
        }),
      });

      if (response.ok) {
        await fetchManuscripts();
        handleCloseDialog();
      } else {
        alert('Failed to create manuscript');
      }
    } catch (error) {
      console.error('Error creating manuscript:', error);
      alert('Failed to create manuscript');
    }
  };

  const handleCloseDialog = () => {
    setCreateDialogOpen(false);
    setActiveStep(0);
    setTeamMembers([]);
    setFormData({
      title: '',
      department: '',
      keywords: [],
      shortDescription: '',
      coAuthors: [],
    });
  };
  const handleNext = () => {
    if (activeStep === 0) {
      if (!formData.title.trim()) {
        alert('Please enter a manuscript title');
        return;
      }
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const openTeamDialog = (manuscript) => {
    setTeamManuscript(manuscript);
    setTeamDialogOpen(true);
  };

  const closeTeamDialog = () => {
    setTeamDialogOpen(false);
    setTeamManuscript(null);
    setTeamInviteForm({ givenName: '', familyName: '', email: '', orcid: '', role: 'author' });
    setTeamOrcidResults([]);
    setTeamInviteOpen(false);
  };

  const disinviteCoAuthor = async (manuscriptId, coAuthorId) => {
    setTeamActionLoading(coAuthorId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/manuscripts/${manuscriptId}/co-authors/${coAuthorId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        setTeamManuscript(prev => ({ ...prev, co_authors: prev.co_authors.filter(ca => ca.id !== coAuthorId) }));
        setManuscripts(prev => prev.map(m => m.id === manuscriptId ? { ...m, co_authors: m.co_authors.filter(ca => ca.id !== coAuthorId) } : m));
      }
    } finally {
      setTeamActionLoading(null);
    }
  };

  const updateCoAuthorRole = async (manuscriptId, coAuthorId, role) => {
    setTeamActionLoading(coAuthorId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/manuscripts/${manuscriptId}/co-authors/${coAuthorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTeamManuscript(prev => ({ ...prev, co_authors: prev.co_authors.map(ca => ca.id === coAuthorId ? { ...ca, role: updated.role } : ca) }));
        setManuscripts(prev => prev.map(m => m.id === manuscriptId ? { ...m, co_authors: m.co_authors.map(ca => ca.id === coAuthorId ? { ...ca, role: updated.role } : ca) } : m));
      }
    } finally {
      setTeamActionLoading(null);
    }
  };

  const searchTeamOrcid = async () => {
    if (!teamInviteForm.givenName.trim() || !teamInviteForm.familyName.trim()) return;
    setTeamSearchingOrcid(true);
    setTeamOrcidResults([]);
    try {
      const query = `given-names:${teamInviteForm.givenName} AND family-name:${teamInviteForm.familyName}`;
      const res = await fetch(`https://pub.orcid.org/v3.0/search/?q=${encodeURIComponent(query)}`, { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        const results = (data.result || []).slice(0, 5).map(item => ({
          orcid: item['orcid-identifier']?.path,
          givenName: item['given-names'] || teamInviteForm.givenName,
          familyName: item['family-name'] || teamInviteForm.familyName,
        })).filter(r => r.orcid);
        setTeamOrcidResults(results);
        if (results.length === 1) setTeamInviteForm(prev => ({ ...prev, orcid: results[0].orcid }));
      }
    } catch (e) {
      console.error('ORCID search error:', e);
    } finally {
      setTeamSearchingOrcid(false);
    }
  };

  const inviteTeamCoAuthor = async () => {
    if (!teamInviteForm.givenName.trim() || !teamInviteForm.familyName.trim()) return;
    setTeamActionLoading('invite');
    try {
      const token = localStorage.getItem('token');
      const nextOrder = (teamManuscript.co_authors?.length || 0) + 2;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/manuscripts/${teamManuscript.id}/co-authors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          given_name: teamInviteForm.givenName,
          family_name: teamInviteForm.familyName,
          email: teamInviteForm.email,
          orcid: teamInviteForm.orcid,
          role: teamInviteForm.role,
          author_order: nextOrder,
        }),
      });
      if (res.ok) {
        const newCa = await res.json();
        setTeamManuscript(prev => ({ ...prev, co_authors: [...(prev.co_authors || []), newCa] }));
        setManuscripts(prev => prev.map(m => m.id === teamManuscript.id ? { ...m, co_authors: [...(m.co_authors || []), newCa] } : m));
        setTeamInviteForm({ givenName: '', familyName: '', email: '', orcid: '', role: 'author' });
        setTeamOrcidResults([]);
      }
    } finally {
      setTeamActionLoading(null);
    }
  };

  const deleteManuscript = async (id) => {
    if (!confirm('Delete this manuscript?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/manuscripts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchManuscripts();
        setAnchorEl(null);
      }
    } catch (error) {
      console.error('Error deleting manuscript:', error);
    }
  };

  const updateManuscriptTitle = async (id, newTitle) => {
    if (!newTitle.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/manuscripts/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ title: newTitle }),
      });

      if (response.ok) {
        await fetchManuscripts();
        setEditingTitle(null);
      }
    } catch (error) {
      console.error('Error updating title:', error);
    }
  };

  const updateManuscriptDepartments = async (id, departments) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/manuscripts/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ department: departments.join(', ') }),
      });

      if (response.ok) {
        await fetchManuscripts();
        setEditingDepartment(null);
      }
    } catch (error) {
      console.error('Error updating departments:', error);
    }
  };

  const updateManuscriptDescription = async (id, description) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/manuscripts/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ short_description: description }),
      });

      if (response.ok) {
        await fetchManuscripts();
        setEditingDescription(null);
      }
    } catch (error) {
      console.error('Error updating description:', error);
    }
  };

  const updateManuscriptKeywords = async (id, keywords) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/manuscripts/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ keywords: keywords }),
      });

      if (response.ok) {
        await fetchManuscripts();
        setEditingKeywords(null);
      }
    } catch (error) {
      console.error('Error updating keywords:', error);
    }
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
            <TextField
              fullWidth
              label="Manuscript Title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <Autocomplete
              freeSolo
              options={[]}
              value={formData.department}
              onInputChange={(_, newValue) => setFormData(prev => ({ ...prev, department: newValue }))}
              renderInput={(params) => (
                <TextField {...params} label="Department" placeholder="Type or select department" />
              )}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={formData.keywords}
              onChange={(_, newValue) => setFormData(prev => ({ ...prev, keywords: newValue }))}
              renderInput={(params) => (
                <TextField {...params} label="Keywords" placeholder="Add keywords" />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option}
                    {...getTagProps({ index })}
                    size="small"
                    sx={{ bgcolor: `${ACCENT}15`, color: ACCENT }}
                  />
                ))
              }
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Short Description"
              value={formData.shortDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, shortDescription: e.target.value }))}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>
        );

      case 1:
        return (
          <Box sx={{ pt: 2 }}>
            <TeamInvitePanel
              invitees={teamMembers}
              onChange={setTeamMembers}
              roles={MANUSCRIPT_TEAM_ROLES}
              defaultRole="author"
              accent={ACCENT}
              listLabel="Authors List"
              manuscriptTitle={formData.title}
              manuscriptDescription={formData.shortDescription}
              manuscriptKeywords={formData.keywords}
              manuscriptDepartment={formData.department}
              suggestionsLabel="Suggested Co-Authors"
              suggestionsHint="Researchers whose specialty and past works align with this manuscript. Click a name to review their profile before inviting."
              inviteFromProfileLabel="Add as Co-Author"
              description="Review suggested co-authors, search ORCID, or enter details manually."
              roleLabel="Default Role for New Authors"
              formatRole={(r) => ({
                author: 'Author',
                corresponding_author: 'Corresponding Author',
                contributor: 'Contributor',
              }[r] || r.replace(/_/g, ' '))}
            />
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: 26, fontWeight: 700, mb: 0.5 }}>Manuscripts</Typography>
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            {manuscripts.length} manuscripts
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          sx={{ textTransform: 'none', borderRadius: 2, bgcolor: ACCENT, '&:hover': { bgcolor: '#0e7490' } }}
        >
          New Manuscript
        </Button>
      </Box>

      {/* Stats */}
      {!loading && manuscripts.length > 0 && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {[
            { label: 'Total', count: manuscripts.length, color: ACCENT },
            { label: 'Draft', count: manuscripts.filter(m => m.status === 'draft').length, color: '#64748b' },
            { label: 'In Review', count: manuscripts.filter(m => m.status === 'in_review').length, color: '#3b82f6' },
            { label: 'Submitted', count: manuscripts.filter(m => m.status === 'submitted').length, color: '#d97706' },
            { label: 'Published', count: manuscripts.filter(m => m.status === 'published').length, color: '#16a34a' },
          ].map(s => (
            <Paper key={s.label} elevation={0} variant="outlined" sx={{ px: 3, py: 1.5, borderRadius: 2, textAlign: 'center', minWidth: 90 }}>
              <Typography sx={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.count}</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>{s.label}</Typography>
            </Paper>
          ))}
        </Box>
      )}

      {/* Manuscripts Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: ACCENT }} />
        </Box>
      ) : manuscripts.length === 0 ? (
        <Paper elevation={0} variant="outlined" sx={{ p: 8, textAlign: 'center', borderRadius: 3, borderStyle: 'dashed' }}>
          <ArticleIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
          <Typography sx={{ fontSize: 16, fontWeight: 600, mb: 1 }}>No manuscripts yet</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 3 }}>
            Create your first manuscript to start writing
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ textTransform: 'none', borderRadius: 2, bgcolor: ACCENT, '&:hover': { bgcolor: '#0e7490' } }}
          >
            New Manuscript
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Department</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Authors</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Created</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Last Saved</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Saved By</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {manuscripts.map((manuscript) => (
                <TableRow key={manuscript.id} hover sx={{ '&:hover': { bgcolor: `${ACCENT}05` } }}>
                  <TableCell sx={{ maxWidth: 300 }}>
                    {editingTitle === manuscript.id ? (
                      <TextField
                        fullWidth
                        size="small"
                        value={tempTitle}
                        onChange={(e) => setTempTitle(e.target.value)}
                        onBlur={() => {
                          updateManuscriptTitle(manuscript.id, tempTitle);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateManuscriptTitle(manuscript.id, tempTitle);
                          } else if (e.key === 'Escape') {
                            setEditingTitle(null);
                          }
                        }}
                        autoFocus
                        sx={{ '& .MuiInputBase-root': { fontSize: 13, fontWeight: 600 } }}
                      />
                    ) : (
                      <Typography 
                        sx={{ 
                          fontSize: 13, 
                          fontWeight: 600,
                          cursor: 'pointer',
                          '&:hover': { color: ACCENT, textDecoration: 'underline' }
                        }}
                        onClick={() => {
                          setEditingTitle(manuscript.id);
                          setTempTitle(manuscript.title);
                        }}
                      >
                        {manuscript.title}
                      </Typography>
                    )}
                    {editingDescription === manuscript.id ? (
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        size="small"
                        value={tempDescription}
                        onChange={(e) => setTempDescription(e.target.value)}
                        onBlur={() => {
                          updateManuscriptDescription(manuscript.id, tempDescription);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.ctrlKey) {
                            updateManuscriptDescription(manuscript.id, tempDescription);
                          } else if (e.key === 'Escape') {
                            setEditingDescription(null);
                          }
                        }}
                        placeholder="Add a short description..."
                        autoFocus
                        sx={{ mt: 0.5, '& .MuiInputBase-root': { fontSize: 11 } }}
                      />
                    ) : (
                      manuscript.short_description ? (
                        <Tooltip 
                          title={
                            <Box>
                              <Typography sx={{ fontSize: 11, mb: 0.5 }}>{manuscript.short_description}</Typography>
                              <Typography sx={{ fontSize: 9, fontStyle: 'italic', opacity: 0.7 }}>Click to edit</Typography>
                            </Box>
                          } 
                          arrow 
                          placement="top-start"
                          enterDelay={300}
                        >
                          <Typography 
                            onClick={() => {
                              setEditingDescription(manuscript.id);
                              setTempDescription(manuscript.short_description || '');
                            }}
                            sx={{ 
                              fontSize: 11, 
                              color: 'text.secondary', 
                              mt: 0.3,
                              cursor: 'pointer',
                              '&:hover': { color: 'text.primary', textDecoration: 'underline' }
                            }}
                          >
                            {manuscript.short_description.length > 80 
                              ? `${manuscript.short_description.substring(0, 80)}...` 
                              : manuscript.short_description}
                          </Typography>
                        </Tooltip>
                      ) : (
                        <Typography 
                          onClick={() => {
                            setEditingDescription(manuscript.id);
                            setTempDescription('');
                          }}
                          sx={{ 
                            fontSize: 11, 
                            color: 'text.disabled', 
                            mt: 0.3,
                            fontStyle: 'italic',
                            cursor: 'pointer',
                            '&:hover': { color: 'text.secondary', textDecoration: 'underline' }
                          }}
                        >
                          Click to add description...
                        </Typography>
                      )
                    )}
                    {editingKeywords === manuscript.id ? (
                      <Autocomplete
                        multiple
                        freeSolo
                        size="small"
                        options={[]}
                        value={tempKeywords}
                        onChange={(e, newValue) => setTempKeywords(newValue)}
                        onBlur={() => {
                          updateManuscriptKeywords(manuscript.id, tempKeywords);
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Add keywords (press Enter)..."
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                setEditingKeywords(null);
                              }
                            }}
                          />
                        )}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip
                              label={option}
                              size="small"
                              {...getTagProps({ index })}
                              sx={{ 
                                fontSize: 9, 
                                height: 18,
                                bgcolor: `${ACCENT}10`,
                                color: ACCENT,
                                fontWeight: 600,
                              }}
                            />
                          ))
                        }
                        sx={{ mt: 0.8, '& .MuiInputBase-root': { fontSize: 11 } }}
                      />
                    ) : (
                      <Box 
                        onClick={() => {
                          setEditingKeywords(manuscript.id);
                          const keywords = Array.isArray(manuscript.keywords) ? manuscript.keywords : [];
                          setTempKeywords(keywords);
                        }}
                        sx={{ 
                          display: 'flex', 
                          flexWrap: 'wrap', 
                          gap: 0.5, 
                          mt: 0.8,
                          cursor: 'pointer',
                          p: 0.5,
                          ml: -0.5,
                          borderRadius: 1,
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                      >
                        {Array.isArray(manuscript.keywords) && manuscript.keywords.length > 0 ? (
                          <>
                            {manuscript.keywords.slice(0, 3).map((keyword, idx) => (
                              <Chip
                                key={idx}
                                label={keyword}
                                size="small"
                                sx={{ 
                                  fontSize: 9, 
                                  height: 18,
                                  bgcolor: `${ACCENT}10`,
                                  color: ACCENT,
                                  fontWeight: 600,
                                  '& .MuiChip-label': { px: 1 }
                                }}
                              />
                            ))}
                            {manuscript.keywords.length > 3 && (
                              <Chip
                                label={`+${manuscript.keywords.length - 3}`}
                                size="small"
                                sx={{ 
                                  fontSize: 9, 
                                  height: 18,
                                  bgcolor: 'action.hover',
                                  color: 'text.secondary',
                                  fontWeight: 600,
                                  '& .MuiChip-label': { px: 1 }
                                }}
                              />
                            )}
                          </>
                        ) : (
                          <Typography sx={{ fontSize: 10, color: 'text.disabled', fontStyle: 'italic' }}>
                            Click to add keywords...
                          </Typography>
                        )}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, minWidth: 200 }}>
                    {editingDepartment === manuscript.id ? (
                      <Autocomplete
                        multiple
                        size="small"
                        options={availableDepartments}
                        value={tempDepartments}
                        onChange={(e, newValue) => setTempDepartments(newValue)}
                        onBlur={() => {
                          updateManuscriptDepartments(manuscript.id, tempDepartments);
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Select departments..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.target.value) {
                                updateManuscriptDepartments(manuscript.id, tempDepartments);
                              } else if (e.key === 'Escape') {
                                setEditingDepartment(null);
                              }
                            }}
                          />
                        )}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip
                              label={option}
                              size="small"
                              {...getTagProps({ index })}
                              sx={{ fontSize: 10 }}
                            />
                          ))
                        }
                        sx={{ '& .MuiInputBase-root': { fontSize: 12 } }}
                      />
                    ) : (
                      <Box
                        onClick={() => {
                          setEditingDepartment(manuscript.id);
                          setTempDepartments(manuscript.department ? manuscript.department.split(', ').filter(d => d) : []);
                        }}
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': { color: ACCENT }
                        }}
                      >
                        {manuscript.department ? (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {manuscript.department.split(', ').map((dept, idx) => (
                              <Chip
                                key={idx}
                                label={dept}
                                size="small"
                                sx={{ fontSize: 10, height: 20 }}
                              />
                            ))}
                          </Box>
                        ) : (
                          <Typography sx={{ fontSize: 12, color: 'text.disabled', fontStyle: 'italic' }}>
                            Click to add departments
                          </Typography>
                        )}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell sx={{ minWidth: 220 }}>
                    <Box
                      onClick={() => openTeamDialog(manuscript)}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', borderRadius: 1.5, px: 0.5, py: 0.5, mx: -0.5, transition: 'background 0.15s', '&:hover': { bgcolor: `${ACCENT}10` } }}
                    >
                      <AvatarGroup
                        max={5}
                        sx={{
                          '& .MuiAvatar-root': {
                            width: 30, height: 30, fontSize: 10, fontWeight: 700,
                            border: '2px solid', borderColor: 'background.paper',
                          },
                        }}
                      >
                        {/* Creator */}
                        {manuscript.creator && (
                          <Tooltip
                            arrow
                            title={
                              <Box sx={{ p: 0.5 }}>
                                <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{manuscript.creator.name || 'Creator'}</Typography>
                                <Typography sx={{ fontSize: 10, opacity: 0.85, mt: 0.3 }}>
                                  {manuscript.creator.orcid_id ? `ORCID: ${manuscript.creator.orcid_id}` : 'No ORCID linked'}
                                </Typography>
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.8, bgcolor: '#10b98125', borderRadius: 1, px: 0.8, py: 0.3 }}>
                                  <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#10b981' }} />
                                  <Typography sx={{ fontSize: 9, color: '#10b981', fontWeight: 700 }}>Creator · Active</Typography>
                                </Box>
                              </Box>
                            }
                          >
                            <Avatar sx={{ bgcolor: ACCENT }}>
                              {getInitials(manuscript.creator.name)}
                            </Avatar>
                          </Tooltip>
                        )}
                        {/* Co-authors */}
                        {manuscript.co_authors?.map((ca) => (
                          <Tooltip
                            key={ca.id}
                            arrow
                            title={
                              <Box sx={{ p: 0.5 }}>
                                <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{ca.given_name} {ca.family_name}</Typography>
                                <Typography sx={{ fontSize: 10, opacity: 0.85, mt: 0.3 }}>
                                  {ca.orcid ? `ORCID: ${ca.orcid}` : 'No ORCID linked'}
                                </Typography>
                                {ca.email && (
                                  <Typography sx={{ fontSize: 10, opacity: 0.7, mt: 0.2 }}>{ca.email}</Typography>
                                )}
                                <Box sx={{
                                  display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.8,
                                  bgcolor: ca.status === 'accepted' ? '#10b98125' : '#f59e0b25',
                                  borderRadius: 1, px: 0.8, py: 0.3,
                                }}>
                                  <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: ca.status === 'accepted' ? '#10b981' : '#f59e0b' }} />
                                  <Typography sx={{ fontSize: 9, color: ca.status === 'accepted' ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                                    {ca.status === 'accepted' ? 'Active' : 'Pending'}
                                  </Typography>
                                </Box>
                              </Box>
                            }
                          >
                            <Avatar sx={{ bgcolor: ca.status === 'accepted' ? '#10b981' : '#94a3b8' }}>
                              {`${(ca.given_name[0] || '?')}${(ca.family_name[0] || '?')}`.toUpperCase()}
                            </Avatar>
                          </Tooltip>
                        ))}
                      </AvatarGroup>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                        {1 + (manuscript.co_authors?.length || 0)} author{(1 + (manuscript.co_authors?.length || 0)) !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const s = STATUS_STYLES[manuscript.status] || STATUS_STYLES.draft;
                      return (
                        <Chip
                          label={s.label}
                          size="small"
                          sx={{ fontSize: 10, fontWeight: 600, bgcolor: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                        />
                      );
                    })()}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {new Date(manuscript.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {manuscript.updated_at 
                      ? new Date(manuscript.updated_at).toLocaleString()
                      : new Date(manuscript.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {manuscript.creator?.name || manuscript.creator?.email || 'Unknown'}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        setAnchorEl(e.currentTarget);
                        setCurrentManuscript(manuscript);
                      }}
                    >
                      <MoreIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create Manuscript Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Create New Manuscript
          <IconButton onClick={handleCloseDialog} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} sx={{ pt: 2, pb: 3 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          {getStepContent(activeStep)}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={handleCloseDialog} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          {activeStep > 0 && (
            <Button onClick={handleBack} sx={{ textTransform: 'none' }}>
              Back
            </Button>
          )}
          {activeStep < STEPS.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleNext}
              sx={{ textTransform: 'none', bgcolor: ACCENT, '&:hover': { bgcolor: '#0e7490' } }}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleSubmit}
              sx={{ textTransform: 'none', bgcolor: ACCENT, '&:hover': { bgcolor: '#0e7490' } }}
            >
              Create Manuscript
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Team Management Dialog */}
      <Dialog open={teamDialogOpen} onClose={closeTeamDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>Manage Team</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.3, maxWidth: 380 }} noWrap>
              {teamManuscript?.title}
            </Typography>
          </Box>
          <IconButton size="small" onClick={closeTeamDialog} sx={{ mt: -0.5 }}><CloseIcon /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2, pb: 1 }}>
          {/* Creator */}
          {teamManuscript?.creator && (
            <Box sx={{ mb: 2.5 }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1.2, mb: 1 }}>Creator</Typography>
              <Paper elevation={0} variant="outlined" sx={{ p: 2, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: ACCENT, width: 42, height: 42, fontSize: 14, fontWeight: 700 }}>{getInitials(teamManuscript.creator.name)}</Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{teamManuscript.creator.name || 'Unknown'}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                    {teamManuscript.creator.orcid_id ? `ORCID: ${teamManuscript.creator.orcid_id}` : 'No ORCID linked'}
                  </Typography>
                </Box>
                <Stack direction="column" spacing={0.5} alignItems="flex-end">
                  <Chip label="Admin" size="small" sx={{ fontSize: 10, fontWeight: 700, height: 20, bgcolor: `${ACCENT}18`, color: ACCENT }} />
                  <Chip label="Active" size="small" sx={{ fontSize: 9, height: 18, bgcolor: '#10b98118', color: '#10b981', border: '1px solid #10b98140' }} />
                </Stack>
              </Paper>
            </Box>
          )}

          {/* Co-Authors */}
          <Box sx={{ mb: 2.5 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1.2, mb: 1 }}>
              Co-Authors ({teamManuscript?.co_authors?.length || 0})
            </Typography>
            {(!teamManuscript?.co_authors || teamManuscript.co_authors.length === 0) ? (
              <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 2, textAlign: 'center', borderStyle: 'dashed' }}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>No co-authors yet. Invite one below.</Typography>
              </Paper>
            ) : (
              <Stack spacing={1.5}>
                {teamManuscript.co_authors.map((ca) => (
                  <Paper key={ca.id} elevation={0} variant="outlined" sx={{ p: 2, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ width: 42, height: 42, fontSize: 13, fontWeight: 700, bgcolor: ca.status === 'accepted' ? '#10b981' : '#94a3b8' }}>
                      {`${(ca.given_name[0] || '?')}${(ca.family_name[0] || '?')}`.toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{ca.given_name} {ca.family_name}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ca.orcid ? `ORCID: ${ca.orcid}` : ca.email || 'No contact info'}
                      </Typography>
                      <Chip
                        label={ca.status === 'accepted' ? 'Active' : 'Pending'}
                        size="small"
                        sx={{ fontSize: 9, mt: 0.5, height: 18, bgcolor: ca.status === 'accepted' ? '#10b98118' : '#f59e0b18', color: ca.status === 'accepted' ? '#10b981' : '#f59e0b', border: `1px solid ${ca.status === 'accepted' ? '#10b98140' : '#f59e0b40'}` }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                      <FormControl size="small" sx={{ minWidth: 105 }}>
                        <Select
                          value={ca.role || 'author'}
                          onChange={(e) => updateCoAuthorRole(teamManuscript.id, ca.id, e.target.value)}
                          disabled={teamActionLoading === ca.id}
                          sx={{ fontSize: 12, borderRadius: 2 }}
                        >
                          <MenuItem value="author" sx={{ fontSize: 12 }}>Author</MenuItem>
                          <MenuItem value="editor" sx={{ fontSize: 12 }}>Editor</MenuItem>
                          <MenuItem value="reviewer" sx={{ fontSize: 12 }}>Reviewer</MenuItem>
                          <MenuItem value="admin" sx={{ fontSize: 12 }}>Admin</MenuItem>
                        </Select>
                      </FormControl>
                      <Tooltip title="Remove from team">
                        <span>
                          <IconButton size="small" color="error" disabled={teamActionLoading === ca.id} onClick={() => disinviteCoAuthor(teamManuscript.id, ca.id)}>
                            {teamActionLoading === ca.id ? <CircularProgress size={16} /> : <DeleteIcon sx={{ fontSize: 16 }} />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>

          {/* Invite new co-author */}
          <Box>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<AddIcon />}
              onClick={() => setTeamInviteOpen(prev => !prev)}
              sx={{ textTransform: 'none', borderRadius: 2, borderColor: teamInviteOpen ? ACCENT : 'divider', color: teamInviteOpen ? ACCENT : 'text.secondary', mb: teamInviteOpen ? 2 : 0 }}
            >
              {teamInviteOpen ? 'Hide Invite Form' : 'Invite New Co-Author'}
            </Button>
            {teamInviteOpen && (
              <Paper elevation={0} sx={{ p: 2.5, bgcolor: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                  <TextField size="small" label="Given Name" value={teamInviteForm.givenName} onChange={(e) => { setTeamInviteForm(prev => ({ ...prev, givenName: e.target.value })); setTeamOrcidResults([]); }} required />
                  <TextField size="small" label="Family Name" value={teamInviteForm.familyName} onChange={(e) => { setTeamInviteForm(prev => ({ ...prev, familyName: e.target.value })); setTeamOrcidResults([]); }} required />
                  <TextField size="small" label="Email (optional)" type="email" value={teamInviteForm.email} onChange={(e) => setTeamInviteForm(prev => ({ ...prev, email: e.target.value }))} />
                  <TextField size="small" label="ORCID" value={teamInviteForm.orcid} onChange={(e) => setTeamInviteForm(prev => ({ ...prev, orcid: e.target.value }))} placeholder="0000-0000-0000-0000" InputProps={{ sx: { bgcolor: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' } }} />
                </Box>
                <FormControl size="small" fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Role</InputLabel>
                  <Select value={teamInviteForm.role} label="Role" onChange={(e) => setTeamInviteForm(prev => ({ ...prev, role: e.target.value }))} sx={{ borderRadius: 2 }}>
                    <MenuItem value="author">Author</MenuItem>
                    <MenuItem value="editor">Editor</MenuItem>
                    <MenuItem value="reviewer">Reviewer</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </Select>
                </FormControl>
                <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                  <Button variant="outlined" onClick={searchTeamOrcid} disabled={!teamInviteForm.givenName.trim() || !teamInviteForm.familyName.trim() || teamSearchingOrcid} startIcon={teamSearchingOrcid ? <CircularProgress size={16} /> : <SearchIcon />} sx={{ textTransform: 'none', borderRadius: 2, borderColor: 'divider', color: 'text.secondary' }}>
                    {teamSearchingOrcid ? 'Searching...' : 'Search ORCID'}
                  </Button>
                  <Button variant="contained" onClick={inviteTeamCoAuthor} disabled={!teamInviteForm.givenName.trim() || !teamInviteForm.familyName.trim() || teamActionLoading === 'invite'} startIcon={teamActionLoading === 'invite' ? <CircularProgress size={16} /> : <AddIcon />} sx={{ textTransform: 'none', borderRadius: 2, bgcolor: ACCENT, '&:hover': { bgcolor: '#0e7490' } }}>
                    {teamActionLoading === 'invite' ? 'Inviting...' : 'Send Invite'}
                  </Button>
                </Box>
                {teamOrcidResults.length > 0 && (
                  <Box>
                    <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 1, color: 'text.secondary' }}>Select ORCID Profile:</Typography>
                    {teamOrcidResults.map((result, index) => (
                      <Paper key={index} elevation={0} variant="outlined" sx={{ p: 1.5, mb: 1, cursor: 'pointer', borderRadius: 2, transition: 'all 0.15s', '&:hover': { borderColor: ACCENT, bgcolor: `${ACCENT}05` }, borderColor: teamInviteForm.orcid === result.orcid ? ACCENT : 'divider', bgcolor: teamInviteForm.orcid === result.orcid ? `${ACCENT}08` : 'transparent' }} onClick={() => setTeamInviteForm(prev => ({ ...prev, orcid: result.orcid }))}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{result.givenName} {result.familyName}</Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary', fontFamily: 'monospace' }}>ORCID: {result.orcid}</Typography>
                      </Paper>
                    ))}
                  </Box>
                )}
              </Paper>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeTeamDialog} sx={{ textTransform: 'none' }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Action Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => { 
          router.push(`/researcher/manuscripts/${currentManuscript?.id}/editor`);
          setAnchorEl(null); 
        }}>
          <EditIcon sx={{ fontSize: 16, mr: 1.5 }} /> Start Writing
        </MenuItem>
        <MenuItem onClick={() => { 
          openTeamDialog(currentManuscript);
          setAnchorEl(null); 
        }}>
          <PersonIcon sx={{ fontSize: 16, mr: 1.5 }} /> Team Manager
        </MenuItem>
        <MenuItem onClick={() => deleteManuscript(currentManuscript?.id)} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ fontSize: 16, mr: 1.5 }} /> Delete
        </MenuItem>
      </Menu>
    </Box>
  );
}
