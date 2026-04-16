'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip, Paper, Grid, Tab, Tabs,
  TextField, LinearProgress, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemText, ListItemSecondaryAction, Card, CardContent, Divider,
  Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import {
  ArrowBack as BackIcon, Save as SaveIcon, Send as SendIcon, Add as AddIcon,
  Delete as DeleteIcon, Upload as UploadIcon, People as PeopleIcon,
  CheckCircle as CheckIcon, RadioButtonUnchecked as UncheckedIcon,
  Description as DocIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const ACCENT = '#8b5cf6';

export default function ProposalWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [proposal, setProposal] = useState(null);
  const [completion, setCompletion] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [currentSection, setCurrentSection] = useState(null);
  const [sectionContent, setSectionContent] = useState('');
  
  // Dialogs
  const [collaboratorDialog, setCollaboratorDialog] = useState(false);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [submitDialog, setSubmitDialog] = useState(false);
  
  // Form states
  const [newCollaboratorId, setNewCollaboratorId] = useState('');
  const [collaboratorRole, setCollaboratorRole] = useState('co_investigator');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadType, setUploadType] = useState('cv');

  useEffect(() => {
    loadProposal();
  }, [params.id]);

  const loadProposal = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const [propRes, compRes] = await Promise.all([
        axios.get(`${API_URL}/api/grants/proposals/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/grants/proposals/${params.id}/completion`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setProposal(propRes.data);
      setCompletion(compRes.data);
      
      if (propRes.data.sections && propRes.data.sections.length > 0) {
        setCurrentSection(propRes.data.sections[0]);
        setSectionContent(propRes.data.sections[0].content_html || '');
      }
    } catch (e) {
      setError('Failed to load proposal');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveSection = async () => {
    if (!currentSection) return;
    
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      await axios.put(
        `${API_URL}/api/grants/proposals/${params.id}/sections/${currentSection.id}`,
        {
          content_html: sectionContent,
          word_count: sectionContent.replace(/<[^>]*>/g, '').split(/\s+/).length
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess('Section saved successfully');
      setTimeout(() => setSuccess(''), 3000);
      await loadProposal();
    } catch (e) {
      setError('Failed to save section');
    } finally {
      setSaving(false);
    }
  };

  const addCollaborator = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/grants/proposals/${params.id}/collaborators?user_id=${newCollaboratorId}&role=${collaboratorRole}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setCollaboratorDialog(false);
      setNewCollaboratorId('');
      setSuccess('Collaborator added');
      await loadProposal();
    } catch (e) {
      setError('Failed to add collaborator');
    }
  };

  const removeCollaborator = async (collabId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_URL}/api/grants/proposals/${params.id}/collaborators/${collabId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess('Collaborator removed');
      await loadProposal();
    } catch (e) {
      setError('Failed to remove collaborator');
    }
  };

  const uploadDocument = async () => {
    if (!uploadFile) return;
    
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('document_type', uploadType);
      
      await axios.post(
        `${API_URL}/api/grants/proposals/${params.id}/documents`,
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
        `${API_URL}/api/grants/proposals/${params.id}/status?target_status=SUBMITTED`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSubmitDialog(false);
      setSuccess('Proposal submitted successfully!');
      await loadProposal();
    } catch (e) {
      setError('Failed to submit proposal');
    }
  };

  const selectSection = (section) => {
    setCurrentSection(section);
    setSectionContent(section.content_html || '');
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

  const canSubmit = completion && completion.overall_percentage >= 80;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => router.push('/researcher/grants/proposals')} sx={{ mb: 2 }}>
          Back to Proposals
        </Button>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>{proposal.title}</Typography>
            <Chip label={proposal.status} sx={{ bgcolor: `${ACCENT}15`, color: ACCENT }} />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<PeopleIcon />}
              onClick={() => setCollaboratorDialog(true)}
              disabled={proposal.status !== 'DRAFT'}
            >
              Collaborators ({proposal.collaborators?.length || 0})
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => setUploadDialog(true)}
              disabled={proposal.status !== 'DRAFT'}
            >
              Upload Document
            </Button>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={() => setSubmitDialog(true)}
              disabled={!canSubmit || proposal.status !== 'DRAFT'}
              sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#7c3aed' } }}
            >
              Submit Proposal
            </Button>
          </Box>
        </Box>

        {/* Completion Progress */}
        {completion && (
          <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Completion Progress</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: ACCENT }}>
                {completion.overall_percentage}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={completion.overall_percentage}
              sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(139,92,246,0.1)', '& .MuiLinearProgress-bar': { bgcolor: ACCENT } }}
            />
            <Box sx={{ display: 'flex', gap: 3, mt: 2, fontSize: 12 }}>
              <Typography>
                Sections: {completion.sections_completed}/{completion.sections_total}
              </Typography>
              <Typography>
                Documents: {completion.documents_completed}/{completion.documents_required}
              </Typography>
            </Box>
            {completion.missing_documents?.length > 0 && (
              <Alert severity="warning" sx={{ mt: 2, fontSize: 12 }}>
                Missing documents: {completion.missing_documents.join(', ')}
              </Alert>
            )}
          </Paper>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Sections List */}
        <Grid item xs={12} md={3}>
          <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2 }}>Proposal Sections</Typography>
            <List dense>
              {proposal.sections?.map((section) => (
                <ListItem
                  key={section.id}
                  button
                  selected={currentSection?.id === section.id}
                  onClick={() => selectSection(section)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    '&.Mui-selected': { bgcolor: `${ACCENT}15`, color: ACCENT }
                  }}
                >
                  <Box sx={{ mr: 1 }}>
                    {section.word_count > 50 ? (
                      <CheckIcon sx={{ fontSize: 18, color: '#10b981' }} />
                    ) : (
                      <UncheckedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                    )}
                  </Box>
                  <ListItemText
                    primary={section.title}
                    secondary={`${section.word_count} words`}
                    primaryTypographyProps={{ fontSize: 13 }}
                    secondaryTypographyProps={{ fontSize: 11 }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>

          {/* Documents */}
          <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, mt: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2 }}>Documents ({proposal.documents?.length || 0})</Typography>
            <List dense>
              {proposal.documents?.map((doc) => (
                <ListItem key={doc.id} sx={{ px: 0 }}>
                  <DocIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                  <ListItemText
                    primary={doc.original_filename}
                    secondary={doc.document_type}
                    primaryTypographyProps={{ fontSize: 12 }}
                    secondaryTypographyProps={{ fontSize: 10 }}
                  />
                </ListItem>
              ))}
              {(!proposal.documents || proposal.documents.length === 0) && (
                <Typography sx={{ fontSize: 12, color: 'text.secondary', fontStyle: 'italic' }}>
                  No documents uploaded
                </Typography>
              )}
            </List>
          </Paper>
        </Grid>

        {/* Editor */}
        <Grid item xs={12} md={9}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, minHeight: 600 }}>
            {currentSection ? (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>{currentSection.title}</Typography>
                  <Button
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <SaveIcon />}
                    onClick={saveSection}
                    disabled={saving || proposal.status !== 'DRAFT'}
                    sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#7c3aed' } }}
                  >
                    {saving ? 'Saving...' : 'Save Section'}
                  </Button>
                </Box>
                
                <TextField
                  fullWidth
                  multiline
                  rows={20}
                  value={sectionContent}
                  onChange={(e) => setSectionContent(e.target.value)}
                  disabled={proposal.status !== 'DRAFT'}
                  placeholder="Enter your content here..."
                  sx={{ 
                    '& .MuiInputBase-root': { 
                      fontFamily: 'monospace',
                      fontSize: 14,
                      lineHeight: 1.6
                    }
                  }}
                />
              </>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
                <Typography sx={{ color: 'text.secondary' }}>Select a section to edit</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Collaborator Dialog */}
      <Dialog open={collaboratorDialog} onClose={() => setCollaboratorDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Manage Collaborators</DialogTitle>
        <DialogContent>
          <List>
            {proposal.collaborators?.map((collab) => (
              <ListItem key={collab.id}>
                <ListItemText
                  primary={`User ID: ${collab.user_id}`}
                  secondary={collab.role}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => removeCollaborator(collab.id)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 2 }}>Add Collaborator</Typography>
          <TextField
            fullWidth
            label="User ID"
            type="number"
            value={newCollaboratorId}
            onChange={(e) => setNewCollaboratorId(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select value={collaboratorRole} onChange={(e) => setCollaboratorRole(e.target.value)}>
              <MenuItem value="co_investigator">Co-Investigator</MenuItem>
              <MenuItem value="consultant">Consultant</MenuItem>
              <MenuItem value="advisor">Advisor</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCollaboratorDialog(false)}>Cancel</Button>
          <Button onClick={addCollaborator} variant="contained" disabled={!newCollaboratorId}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Document</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel>Document Type</InputLabel>
            <Select value={uploadType} onChange={(e) => setUploadType(e.target.value)}>
              <MenuItem value="cv">CV/Resume</MenuItem>
              <MenuItem value="budget">Budget</MenuItem>
              <MenuItem value="support_letter">Support Letter</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>
          
          <Button variant="outlined" component="label" fullWidth>
            Choose File
            <input type="file" hidden onChange={(e) => setUploadFile(e.target.files[0])} />
          </Button>
          
          {uploadFile && (
            <Typography sx={{ mt: 1, fontSize: 12, color: 'text.secondary' }}>
              Selected: {uploadFile.name}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialog(false)}>Cancel</Button>
          <Button onClick={uploadDocument} variant="contained" disabled={!uploadFile}>
            Upload
          </Button>
        </DialogActions>
      </Dialog>

      {/* Submit Dialog */}
      <Dialog open={submitDialog} onClose={() => setSubmitDialog(false)}>
        <DialogTitle>Submit Proposal?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to submit this proposal? Once submitted, you won't be able to edit it unless it's returned for revision.
          </Typography>
          {completion && completion.overall_percentage < 100 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Your proposal is {completion.overall_percentage}% complete. You may want to complete all sections before submitting.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmitDialog(false)}>Cancel</Button>
          <Button onClick={submitProposal} variant="contained" sx={{ bgcolor: ACCENT }}>
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
