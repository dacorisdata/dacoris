'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip, Paper, LinearProgress,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem,
  ListItemText, Divider, useTheme, Badge, Collapse, TextField
} from '@mui/material';
import {
  ArrowBack as BackIcon, Save as SaveIcon, Send as SendIcon, Upload as UploadIcon,
  People as PeopleIcon, CheckCircle as CheckIcon, RadioButtonUnchecked as UncheckedIcon,
  Description as DocIcon, ExpandMore as ExpandIcon, ExpandLess as CollapseIcon,
  CloudUpload as CloudUploadIcon, Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon
} from '@mui/icons-material';
import axios from 'axios';

const TiptapEditor = dynamic(() => import('../../../../../components/TiptapEditor'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#16a699';


export default function ProposalWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  
  const [loading, setLoading] = useState(true);
  const [proposalSections, setProposalSections] = useState([]);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [proposal, setProposal] = useState(null);
  const [sections, setSections] = useState({});
  const [addSectionDialog, setAddSectionDialog] = useState(false);
  const [editSectionDialog, setEditSectionDialog] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState('');
  const [currentSection, setCurrentSection] = useState('executive_summary');
  const [sectionContent, setSectionContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadType, setUploadType] = useState('cv');
  const [documents, setDocuments] = useState([]);
  
  const [sectionsExpanded, setSectionsExpanded] = useState(true);
  const [docsExpanded, setDocsExpanded] = useState(true);

  useEffect(() => {
    loadProposal();
  }, [params.id]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!proposal || proposal.status !== 'DRAFT') return;
    
    const interval = setInterval(() => {
      if (sectionContent && wordCount > 0) {
        autoSaveSection();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [sectionContent, wordCount, proposal]);

  const loadProposal = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const res = await axios.get(`${API_URL}/grants/proposals/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setProposal(res.data);
      setDocuments(res.data.documents || []);
      
      // Load sections
      if (res.data.sections && res.data.sections.length > 0) {
        setProposalSections(res.data.sections);
        const sectionsMap = {};
        res.data.sections.forEach(section => {
          sectionsMap[section.id] = {
            content: section.content_html || '',
            wordCount: section.word_count || 0,
            id: section.id,
            title: section.title
          };
        });
        setSections(sectionsMap);
        
        // Load first section
        const firstSection = res.data.sections[0];
        setCurrentSection(firstSection.id);
        setSectionContent(sectionsMap[firstSection.id]?.content || '');
        setWordCount(sectionsMap[firstSection.id]?.wordCount || 0);
      }
    } catch (e) {
      setError('Failed to load proposal');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const autoSaveSection = async () => {
    if (!proposal || !currentSection) return;
    
    try {
      setAutoSaving(true);
      const token = localStorage.getItem('token');
      
      const sectionData = sections[currentSection];
      if (!sectionData?.id) return;
      
      await axios.put(
        `${API_URL}/grants/proposals/${params.id}/sections/${sectionData.id}`,
        {
          content_html: sectionContent,
          word_count: wordCount
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSections(prev => ({
        ...prev,
        [currentSection]: { ...prev[currentSection], content: sectionContent, wordCount }
      }));
    } catch (e) {
      console.error('Auto-save failed:', e);
    } finally {
      setAutoSaving(false);
    }
  };

  const saveSection = async () => {
    if (!proposal || !currentSection) return;
    
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      const sectionData = sections[currentSection];
      if (!sectionData?.id) {
        setError('Section not found');
        return;
      }
      
      await axios.put(
        `${API_URL}/grants/proposals/${params.id}/sections/${sectionData.id}`,
        {
          content_html: sectionContent,
          word_count: wordCount
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSections(prev => ({
        ...prev,
        [currentSection]: { ...prev[currentSection], content: sectionContent, wordCount }
      }));
      
      setSuccess('Section saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError('Failed to save section');
    } finally {
      setSaving(false);
    }
  };

  const switchSection = (sectionKey) => {
    // Save current section before switching
    if (currentSection && sectionContent !== sections[currentSection]?.content) {
      setSections(prev => ({
        ...prev,
        [currentSection]: { ...prev[currentSection], content: sectionContent, wordCount }
      }));
    }
    
    setCurrentSection(sectionKey);
    setSectionContent(sections[sectionKey]?.content || '');
    setWordCount(sections[sectionKey]?.wordCount || 0);
  };

  const uploadDocument = async () => {
    if (!uploadFile) return;
    
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('document_type', uploadType);
      
      await axios.post(
        `${API_URL}/grants/proposals/${params.id}/documents`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );
      
      setUploadDialog(false);
      setUploadFile(null);
      setSuccess('Document uploaded');
      await loadProposal();
    } catch (e) {
      setError('Failed to upload document');
    }
  };

  const submitProposal = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_URL}/grants/proposals/${params.id}/status?target_status=SUBMITTED`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess('Proposal submitted successfully!');
      await loadProposal();
    } catch (e) {
      setError('Failed to submit proposal');
    }
  };

  const addSection = async () => {
    if (!newSectionTitle.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/grants/proposals/${params.id}/sections`,
        { title: newSectionTitle },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setAddSectionDialog(false);
      setNewSectionTitle('');
      setSuccess('Section added');
      await loadProposal();
    } catch (e) {
      setError('Failed to add section');
    }
  };

  const deleteSection = async (sectionId) => {
    if (!confirm('Are you sure you want to delete this section?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_URL}/grants/proposals/${params.id}/sections/${sectionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess('Section deleted');
      await loadProposal();
    } catch (e) {
      setError('Failed to delete section');
    }
  };

  const renameSection = async () => {
    if (!editingSectionTitle.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/grants/proposals/${params.id}/sections/${editingSectionId}`,
        { title: editingSectionTitle },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setEditSectionDialog(false);
      setEditingSectionId(null);
      setEditingSectionTitle('');
      setSuccess('Section renamed');
      await loadProposal();
    } catch (e) {
      setError('Failed to rename section');
    }
  };

  const openEditSection = (section) => {
    setEditingSectionId(section.id);
    setEditingSectionTitle(section.title);
    setEditSectionDialog(true);
  };

  const calculateCompletion = () => {
    const totalSections = proposalSections.length;
    const completedSections = proposalSections.filter(s => (sections[s.id]?.wordCount || 0) > 50).length;
    const requiredDocs = 3; // CV, Budget, Support Letter
    const uploadedDocs = documents.length;
    
    const sectionPercent = totalSections > 0 ? (completedSections / totalSections) * 70 : 0;
    const docPercent = Math.min((uploadedDocs / requiredDocs) * 30, 30);
    
    return {
      overall: Math.round(sectionPercent + docPercent),
      sections: completedSections,
      totalSections,
      docs: uploadedDocs,
      requiredDocs
    };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  if (!proposal) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Proposal not found</Alert>
        <Button startIcon={<BackIcon />} onClick={() => router.push('/researcher/grants/proposals')} sx={{ mt: 2 }}>
          Back to Proposals
        </Button>
      </Box>
    );
  }

  const completion = calculateCompletion();
  const canSubmit = completion.overall >= 80;
  const isDraft = proposal.status === 'DRAFT';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box sx={{ 
        bgcolor: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', 
        borderBottom: `1px solid ${theme.palette.divider}`,
        px: 3,
        py: 2
      }}>
        <Button 
          startIcon={<BackIcon />} 
          onClick={() => router.push('/researcher/grants/proposals')} 
          sx={{ mb: 2, color: 'text.secondary' }}
        >
          Back to Proposals
        </Button>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography sx={{ fontSize: 24, fontWeight: 700, mb: 0.5 }}>{proposal.title}</Typography>
            <Chip 
              label={proposal.status} 
              size="small" 
              sx={{ 
                fontSize: 11, 
                fontWeight: 700,
                bgcolor: ACCENT + '22', 
                color: ACCENT 
              }} 
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {autoSaving && (
              <Chip 
                label="Auto-saving..." 
                size="small" 
                sx={{ fontSize: 11, bgcolor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
              />
            )}
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => setUploadDialog(true)}
              disabled={!isDraft}
              sx={{ textTransform: 'none' }}
            >
              Upload Document
            </Button>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={submitProposal}
              disabled={!canSubmit || !isDraft}
              sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' }, textTransform: 'none' }}
            >
              Submit Proposal
            </Button>
          </Box>
        </Box>

        {/* Completion Progress */}
        <Paper elevation={0} sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Completion Progress</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: ACCENT }}>
              {completion.overall}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={completion.overall}
            sx={{ 
              height: 6, 
              borderRadius: 3, 
              bgcolor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              '& .MuiLinearProgress-bar': { bgcolor: ACCENT, borderRadius: 3 } 
            }}
          />
          <Box sx={{ display: 'flex', gap: 3, mt: 1.5, fontSize: 12, color: 'text.secondary' }}>
            <Typography sx={{ fontSize: 12 }}>
              Sections: {completion.sections}/{completion.totalSections}
            </Typography>
            <Typography sx={{ fontSize: 12 }}>
              Documents: {completion.docs}/{completion.requiredDocs}
            </Typography>
          </Box>
          {completion.overall < 80 && (
            <Alert severity="warning" sx={{ mt: 2, fontSize: 12 }}>
              Complete at least 80% to submit. Missing: {completion.requiredDocs - completion.docs} documents
            </Alert>
          )}
        </Paper>
      </Box>

      {error && <Alert severity="error" sx={{ m: 3 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ m: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Main Content */}
      <Box sx={{ display: 'flex', height: 'calc(100vh - 280px)' }}>
        {/* Sidebar */}
        <Box sx={{ 
          width: 280, 
          borderRight: `1px solid ${theme.palette.divider}`,
          overflowY: 'auto',
          bgcolor: dark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)'
        }}>
          {/* Sections */}
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>
                PROPOSAL SECTIONS
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton 
                  size="small" 
                  onClick={() => setAddSectionDialog(true)}
                  disabled={!isDraft}
                  sx={{ color: ACCENT }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => setSectionsExpanded(!sectionsExpanded)}>
                  {sectionsExpanded ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}
                </IconButton>
              </Box>
            </Box>
            
            <Collapse in={sectionsExpanded}>
              <List dense sx={{ py: 0 }}>
                {proposalSections.map((section) => {
                  const sectionData = sections[section.id] || {};
                  const isComplete = (sectionData.wordCount || 0) > 50;
                  const isActive = currentSection === section.id;
                  
                  return (
                    <ListItem
                      key={section.id}
                      button
                      selected={isActive}
                      onClick={() => switchSection(section.id)}
                      sx={{
                        borderRadius: 1.5,
                        mb: 0.5,
                        px: 1.5,
                        py: 1,
                        '&.Mui-selected': { 
                          bgcolor: ACCENT + '15', 
                          '&:hover': { bgcolor: ACCENT + '20' }
                        },
                        '&:hover': { bgcolor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }
                      }}
                      secondaryAction={
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditSection(section);
                            }}
                            disabled={!isDraft}
                            sx={{ opacity: isActive ? 1 : 0, '&:hover': { opacity: 1 } }}
                          >
                            <EditIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSection(section.id);
                            }}
                            disabled={!isDraft}
                            sx={{ opacity: isActive ? 1 : 0, '&:hover': { opacity: 1 }, color: '#ef4444' }}
                          >
                            <DeleteIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Box>
                      }
                    >
                      <Box sx={{ mr: 1 }}>
                        {isComplete ? (
                          <CheckIcon sx={{ fontSize: 16, color: '#10b981' }} />
                        ) : (
                          <UncheckedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        )}
                      </Box>
                      <ListItemText
                        primary={section.title}
                        secondary={`${sectionData.wordCount || 0} words`}
                        primaryTypographyProps={{ fontSize: 13, fontWeight: isActive ? 600 : 400 }}
                        secondaryTypographyProps={{ fontSize: 11 }}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </Collapse>
          </Box>

          <Divider />

          {/* Documents */}
          <Box sx={{ p: 2 }}>
            <Box 
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, cursor: 'pointer' }}
              onClick={() => setDocsExpanded(!docsExpanded)}
            >
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>
                DOCUMENTS ({documents.length})
              </Typography>
              <IconButton size="small">
                {docsExpanded ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}
              </IconButton>
            </Box>
            
            <Collapse in={docsExpanded}>
              <List dense sx={{ py: 0 }}>
                {documents.map((doc) => (
                  <ListItem key={doc.id} sx={{ px: 1, py: 0.5 }}>
                    <DocIcon sx={{ fontSize: 14, mr: 1, color: 'text.secondary' }} />
                    <ListItemText
                      primary={doc.original_filename || 'Document'}
                      secondary={doc.document_type}
                      primaryTypographyProps={{ fontSize: 12 }}
                      secondaryTypographyProps={{ fontSize: 10 }}
                    />
                  </ListItem>
                ))}
                {documents.length === 0 && (
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', fontStyle: 'italic', px: 1 }}>
                    No documents uploaded
                  </Typography>
                )}
              </List>
            </Collapse>
          </Box>
        </Box>

        {/* Editor */}
        <Box sx={{ flex: 1, p: 3, overflowY: 'auto' }}>
          {currentSection && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box>
                  <Typography sx={{ fontSize: 20, fontWeight: 700, mb: 0.5 }}>
                    {proposalSections.find(s => s.id === currentSection)?.title || 'Section'}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <SaveIcon />}
                  onClick={saveSection}
                  disabled={saving || !isDraft}
                  sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' }, textTransform: 'none' }}
                >
                  {saving ? 'Saving...' : 'Save Section'}
                </Button>
              </Box>
              
              <TiptapEditor
                content={sectionContent}
                onChange={setSectionContent}
                onWordCount={setWordCount}
                placeholder={`Write your ${proposalSections.find(s => s.id === currentSection)?.title.toLowerCase() || 'content'} here...`}
                disabled={!isDraft}
              />
            </>
          )}
        </Box>
      </Box>

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Document</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                DOCUMENT TYPE
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {['CV', 'Budget', 'Support Letter', 'Other'].map((type) => (
                  <Chip
                    key={type}
                    label={type}
                    onClick={() => setUploadType(type.toLowerCase().replace(' ', '_'))}
                    sx={{
                      bgcolor: uploadType === type.toLowerCase().replace(' ', '_') ? ACCENT : 'transparent',
                      color: uploadType === type.toLowerCase().replace(' ', '_') ? 'white' : 'text.primary',
                      border: `1px solid ${uploadType === type.toLowerCase().replace(' ', '_') ? ACCENT : theme.palette.divider}`,
                      '&:hover': {
                        bgcolor: uploadType === type.toLowerCase().replace(' ', '_') ? ACCENT : dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>
            
            <Box
              sx={{
                border: `2px dashed ${theme.palette.divider}`,
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                '&:hover': { bgcolor: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }
              }}
              component="label"
            >
              <input type="file" hidden onChange={(e) => setUploadFile(e.target.files[0])} />
              <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 0.5 }}>
                {uploadFile ? uploadFile.name : 'Click to upload or drag and drop'}
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                PDF, DOC, DOCX (max 10MB)
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setUploadDialog(false)}>Cancel</Button>
          <Button 
            onClick={uploadDocument} 
            variant="contained" 
            disabled={!uploadFile}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Section Dialog */}
      <Dialog open={addSectionDialog} onClose={() => setAddSectionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Section</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Section Title"
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            sx={{ mt: 2 }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addSection();
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setAddSectionDialog(false)}>Cancel</Button>
          <Button 
            onClick={addSection} 
            variant="contained" 
            disabled={!newSectionTitle.trim()}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}
          >
            Add Section
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Section Dialog */}
      <Dialog open={editSectionDialog} onClose={() => setEditSectionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Rename Section</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Section Title"
            value={editingSectionTitle}
            onChange={(e) => setEditingSectionTitle(e.target.value)}
            sx={{ mt: 2 }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                renameSection();
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setEditSectionDialog(false)}>Cancel</Button>
          <Button 
            onClick={renameSection} 
            variant="contained" 
            disabled={!editingSectionTitle.trim()}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}
          >
            Rename
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
