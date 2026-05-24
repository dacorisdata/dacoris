'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip, Paper, LinearProgress,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem,
  ListItemText, Divider, useTheme, Badge, Collapse, TextField, Avatar, AvatarGroup,
  Tooltip, Menu, MenuItem, FormControl, InputLabel, Select,
  Stepper, Step, StepLabel, StepConnector, stepConnectorClasses
} from '@mui/material';
import {
  ArrowBack as BackIcon, Save as SaveIcon, Send as SendIcon, Upload as UploadIcon,
  People as PeopleIcon, CheckCircle as CheckIcon, RadioButtonUnchecked as UncheckedIcon,
  Description as DocIcon, ExpandMore as ExpandIcon, ExpandLess as CollapseIcon,
  CloudUpload as CloudUploadIcon, Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon,
  History as HistoryIcon, DragIndicator as DragIcon, Lock as LockIcon, Restore as RestoreIcon,
  CommentBank as CommentIcon, Close as CloseIcon
} from '@mui/icons-material';
import axios from 'axios';

const TiptapEditor = dynamic(() => import('../../../../../components/TiptapEditor'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#16a699';

// Sortable Section Item Component
function SortableSection({ section, sectionData, isActive, isDraft, dark, onSwitch, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isComplete = (sectionData.wordCount || 0) > 50;

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      button
      selected={isActive}
      onClick={() => onSwitch(section.id)}
      sx={{
        borderRadius: 1.5,
        mb: 0.5,
        px: 1.5,
        py: 1,
        '&.Mui-selected': { 
          bgcolor: ACCENT + '15', 
          '&:hover': { bgcolor: ACCENT + '20' }
        },
        '&:hover': { bgcolor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
        cursor: isDragging ? 'grabbing' : 'pointer'
      }}
      secondaryAction={
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton 
            size="small" 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(section);
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
              onDelete(section.id);
            }}
            disabled={!isDraft}
            sx={{ opacity: isActive ? 1 : 0, '&:hover': { opacity: 1 }, color: '#ef4444' }}
          >
            <DeleteIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      }
    >
      <Box 
        {...attributes} 
        {...listeners} 
        sx={{ 
          mr: 1, 
          cursor: isDraft ? 'grab' : 'default',
          display: 'flex',
          alignItems: 'center',
          '&:active': { cursor: isDraft ? 'grabbing' : 'default' }
        }}
      >
        {isDraft && <DragIcon sx={{ fontSize: 16, color: 'text.disabled', mr: 0.5 }} />}
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
}

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
  const [currentSection, setCurrentSection] = useState(null);
  const [sectionContent, setSectionContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadRequirementId, setUploadRequirementId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [documentRequirements, setDocumentRequirements] = useState([]);
  const [addDocDialog, setAddDocDialog] = useState(false);
  const [newDocLabel, setNewDocLabel] = useState('');
  
  const [sectionsExpanded, setSectionsExpanded] = useState(true);
  const [docsExpanded, setDocsExpanded] = useState(true);
  const [versionDialog, setVersionDialog] = useState(false);
  const [sectionVersions, setSectionVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(null);
  const [permissionsDialog, setPermissionsDialog] = useState(false);
  const [editingPermSection, setEditingPermSection] = useState(null);
  const [allowedRoles, setAllowedRoles] = useState([]);
  const [collaboratorMenu, setCollaboratorMenu] = useState(null);
  // Comments state - keyed by sectionId
  const [commentsBySectionId, setCommentsBySectionId] = useState({});
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [pendingComment, setPendingComment] = useState(null); // { commentId, selectedText }
  const [currentUser, setCurrentUser] = useState(null);
  const [editTitleDialog, setEditTitleDialog] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadProposal({ initialLoad: true });
  }, [params.id]);

  const isSectionDirty = (sectionId, content, count, sectionsMap = sections) => {
    if (!sectionId) return false;
    const saved = sectionsMap[sectionId];
    if (!saved?.id) return false;
    return content !== (saved.content ?? '') || count !== (saved.wordCount ?? 0);
  };

  const persistCurrentSection = async (
    sectionId = currentSection,
    content = sectionContent,
    count = wordCount,
    { silent = true } = {}
  ) => {
    if (!proposal || proposal.status?.toUpperCase() !== 'DRAFT') return true;
    if (!sectionId || !isSectionDirty(sectionId, content, count)) return true;

    const sectionData = sections[sectionId];
    if (!sectionData?.id) return true;

    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      if (silent) setAutoSaving(true);
      await axios.put(
        `${API_URL}/grants/proposals/${params.id}/sections/${sectionData.id}`,
        { content_html: content, word_count: count },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSections(prev => ({
        ...prev,
        [sectionId]: { ...prev[sectionId], content, wordCount: count },
      }));
      return true;
    } catch (e) {
      console.error('Failed to save section:', e);
      if (e.response?.status === 401) {
        setError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        setTimeout(() => router.push('/login'), 2000);
      }
      return false;
    } finally {
      if (silent) setAutoSaving(false);
    }
  };

  // Auto-save every 30 seconds when the active section has unsaved changes
  useEffect(() => {
    if (!proposal || proposal.status?.toUpperCase() !== 'DRAFT' || !currentSection) return;

    const interval = setInterval(() => {
      if (isSectionDirty(currentSection, sectionContent, wordCount)) {
        persistCurrentSection();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [sectionContent, wordCount, proposal, currentSection, sections]);

  // Auto-save when leaving the page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!currentSection || !isSectionDirty(currentSection, sectionContent, wordCount)) return;

      const sectionData = sections[currentSection];
      if (!sectionData?.id || !proposal) return;

      const data = JSON.stringify({
        content_html: sectionContent,
        word_count: wordCount,
      });

      navigator.sendBeacon(
        `${API_URL}/grants/proposals/${params.id}/sections/${sectionData.id}`,
        new Blob([data], { type: 'application/json' })
      );
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentSection, sectionContent, sections, proposal, wordCount, params.id]);

  const sortSections = (sections) =>
    [...sections].sort(
      (a, b) => (a.section_order ?? 0) - (b.section_order ?? 0) || String(a.id).localeCompare(String(b.id))
    );

  const loadProposal = async (options = {}) => {
    const preserveSectionId = options.preserveSectionId;
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Load current user for @mentions
      try {
        const meRes = await axios.get(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        setCurrentUser(meRes.data);
      } catch {}
      
      const res = await axios.get(`${API_URL}/grants/proposals/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setProposal(res.data);
      setDocuments(res.data.documents || []);
      setDocumentRequirements(
        [...(res.data.document_requirements || [])].sort(
          (a, b) => (a.item_order ?? 0) - (b.item_order ?? 0) || String(a.id).localeCompare(String(b.id))
        )
      );
      
      if (res.data.sections && res.data.sections.length > 0) {
        const sortedSections = sortSections(res.data.sections);
        setProposalSections(sortedSections);
        const sectionsMap = {};
        sortedSections.forEach(section => {
          sectionsMap[section.id] = {
            content: section.content_html || '',
            wordCount: section.word_count || 0,
            id: section.id,
            title: section.title,
            version: section.version || 1
          };
        });
        setSections(sectionsMap);

        const activeSectionId =
          preserveSectionId && sectionsMap[preserveSectionId]
            ? preserveSectionId
            : null;

        setCurrentSection(activeSectionId);
        setSectionContent(activeSectionId ? (sectionsMap[activeSectionId]?.content || '') : '');
        setWordCount(activeSectionId ? (sectionsMap[activeSectionId]?.wordCount || 0) : 0);
      } else {
        setProposalSections([]);
        setSections({});
        setCurrentSection(null);
        setSectionContent('');
        setWordCount(0);
      }
    } catch (e) {
      if (e.response?.status === 401) {
        setError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        setTimeout(() => router.push('/login'), 2000);
      } else {
        setError(e.response?.data?.detail || 'Failed to load proposal');
      }
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const autoSaveSection = async () => {
    await persistCurrentSection();
  };

  const saveSection = async () => {
    if (!proposal || !currentSection) return;
    
    try {
      setSaving(true);
      const ok = await persistCurrentSection(currentSection, sectionContent, wordCount, { silent: false });
      if (!ok) {
        setError('Failed to save section');
        return;
      }
      setSuccess('Section saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const switchSection = async (sectionKey) => {
    if (sectionKey === currentSection) return;

    await persistCurrentSection();

    setCurrentSection(sectionKey);
    setSectionContent(sections[sectionKey]?.content || '');
    setWordCount(sections[sectionKey]?.wordCount || 0);
  };

  const uploadDocument = async () => {
    if (uploadFiles.length === 0) return;
    
    try {
      const token = localStorage.getItem('token');
      const requirement = documentRequirements.find(r => r.id === uploadRequirementId);
      
      for (const file of uploadFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_type', requirement?.label || 'other');
        if (uploadRequirementId) {
          formData.append('requirement_id', uploadRequirementId);
        }
        
        await axios.post(
          `${API_URL}/grants/proposals/${params.id}/documents`,
          formData,
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
        );
      }
      
      setUploadDialog(false);
      setUploadFiles([]);
      setUploadRequirementId(null);
      setSuccess(`${uploadFiles.length} document(s) uploaded`);
      await loadProposal({ preserveSectionId: currentSection });
    } catch (e) {
      console.error('Upload error:', e);
      console.error('Error response:', e.response?.data);
      setError(e.response?.data?.detail || 'Failed to upload documents');
    }
  };

  const addDocumentRequirement = async () => {
    if (!newDocLabel.trim()) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/grants/proposals/${params.id}/document-requirements`,
        { label: newDocLabel.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAddDocDialog(false);
      setNewDocLabel('');
      setSuccess('Document requirement added');
      await loadProposal({ preserveSectionId: currentSection });
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to add document requirement');
    }
  };

  const deleteDocumentRequirement = async (requirementId) => {
    if (!confirm('Remove this document requirement? Any uploaded file will also be deleted.')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_URL}/grants/proposals/${params.id}/document-requirements/${requirementId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Document requirement removed');
      await loadProposal({ preserveSectionId: currentSection });
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to remove document requirement');
    }
  };

  const openUploadForRequirement = (requirementId) => {
    setUploadRequirementId(requirementId);
    setUploadFiles([]);
    setUploadDialog(true);
  };

  const submitProposal = async () => {
    try {
      await persistCurrentSection();
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_URL}/grants/proposals/${params.id}/status?target_status=submitted`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess('Proposal submitted successfully! Your proposal is now under review.');
      await loadProposal({ preserveSectionId: currentSection });
    } catch (e) {
      if (e.response?.status === 401) {
        setError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        setTimeout(() => router.push('/login'), 2000);
      } else {
        setError(e.response?.data?.detail || 'Failed to submit proposal');
      }
      console.error(e);
    }
  };

  const addSection = async () => {
    if (!newSectionTitle.trim()) return;
    
    try {
      await persistCurrentSection();
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/grants/proposals/${params.id}/sections`,
        { title: newSectionTitle },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setAddSectionDialog(false);
      setNewSectionTitle('');
      setSuccess('Section added');
      await loadProposal({ preserveSectionId: response.data.id });
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to add section');
      console.error('Add section error:', e);
    }
  };

  const deleteSection = async (sectionId) => {
    if (!confirm('Are you sure you want to delete this section?')) return;
    
    try {
      if (sectionId === currentSection) {
        await persistCurrentSection();
      }
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_URL}/grants/proposals/${params.id}/sections/${sectionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess('Section deleted');
      const nextSectionId = sectionId === currentSection ? null : currentSection;
      await loadProposal({ preserveSectionId: nextSectionId });
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to delete section');
      console.error('Delete section error:', e);
    }
  };

  const renameSection = async () => {
    if (!editingSectionTitle.trim()) return;
    
    try {
      await persistCurrentSection();
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/grants/proposals/${params.id}/sections/${editingSectionId}/rename`,
        { title: editingSectionTitle },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setEditSectionDialog(false);
      setEditingSectionId(null);
      setEditingSectionTitle('');
      setSuccess('Section renamed');
      await loadProposal({ preserveSectionId: currentSection });
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to rename section');
      console.error('Rename section error:', e);
    }
  };

  const openEditSection = (section) => {
    setEditingSectionId(section.id);
    setEditingSectionTitle(section.title);
    setEditSectionDialog(true);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = proposalSections.findIndex((s) => s.id === active.id);
    const newIndex = proposalSections.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const newOrder = arrayMove(proposalSections, oldIndex, newIndex);
    setProposalSections(newOrder);

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/grants/proposals/${params.id}/sections/reorder`,
        { section_ids: newOrder.map(s => s.id) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (e) {
      console.error('Failed to save section order:', e);
      await loadProposal({ preserveSectionId: currentSection });
    }
  };

  const openVersionHistory = async (sectionId) => {
    setVersionsLoading(true);
    setPreviewVersion(null);
    setSectionVersions([]);
    setVersionDialog(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `${API_URL}/grants/proposals/${params.id}/sections/${sectionId}/versions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSectionVersions(res.data);
    } catch (e) {
      setError('Failed to load version history');
    } finally {
      setVersionsLoading(false);
    }
  };

  const restoreVersion = async (versionId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/grants/proposals/${params.id}/sections/${currentSection}/restore/${versionId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setVersionDialog(false);
      setSuccess('Version restored successfully');
      await loadProposal({ preserveSectionId: currentSection });
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to restore version');
    }
  };

  const openPermissions = (section) => {
    setEditingPermSection(section);
    setAllowedRoles(section.allowed_roles ? section.allowed_roles.split(',').filter(Boolean) : []);
    setPermissionsDialog(true);
  };

  const savePermissions = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/grants/proposals/${params.id}/sections/${editingPermSection.id}/permissions`,
        { allowed_roles: allowedRoles.join(',') },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPermissionsDialog(false);
      setSuccess('Section permissions updated');
      await loadProposal({ preserveSectionId: currentSection });
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to update permissions');
    }
  };

  const calculateCompletion = () => {
    const totalSections = proposalSections.length;
    const completedSections = proposalSections.filter(s => (sections[s.id]?.wordCount || 0) > 50).length;
    const overall = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

    return {
      overall,
      sections: completedSections,
      totalSections,
      uploadedDocItems: documentRequirements.filter(r => r.document).length,
      totalDocItems: documentRequirements.length,
    };
  };

  const updateProposalTitle = async () => {
    if (!editedTitle.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/grants/proposals/${params.id}/title?title=${encodeURIComponent(editedTitle.trim())}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess('Proposal title updated successfully');
      setEditTitleDialog(false);
      setEditedTitle('');
      await loadProposal({ preserveSectionId: currentSection });
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to update proposal title');
      console.error('Update title error:', e);
    }
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
  const isDraft = proposal.status?.toUpperCase() === 'DRAFT';

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
          onClick={async () => {
            await persistCurrentSection();
            router.push('/researcher/grants/proposals');
          }}
          sx={{ mb: 2, color: 'text.secondary' }}
        >
          Back to Proposals
        </Button>
        
        {/* ── Workflow Stepper ────────────────────────────── */}
        {proposal.status !== 'draft' && (() => {
          const STEPS = ['Received', 'Eligibility Review', 'Technical Review', 'Budget Review', 'Panel Review', 'Final Approval'];
          const step = proposal.review_step ?? 0;
          const isTerminal = ['awarded','declined'].includes(proposal.status);
          const terminalColor = proposal.status === 'awarded' ? '#10b981' : '#ef4444';
          return (
            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2.5, borderColor: isTerminal ? terminalColor + '55' : ACCENT + '44' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: isTerminal ? terminalColor : ACCENT }}>
                    {isTerminal
                      ? (proposal.status === 'awarded' ? '🏆 Proposal Awarded!' : '❌ Proposal Not Awarded')
                      : `📋 ${proposal.review_stage_name || 'Under Review'}`}
                  </Typography>
                  {proposal.stage_notes && (
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.3 }}>
                      Note: {proposal.stage_notes}
                    </Typography>
                  )}
                </Box>
                <Chip
                  label={proposal.status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  size="small"
                  sx={{ bgcolor: isTerminal ? terminalColor + '22' : ACCENT + '22', color: isTerminal ? terminalColor : ACCENT, fontWeight: 700, fontSize: 11 }}
                />
              </Box>
              {!isTerminal && (
                <Stepper activeStep={step} alternativeLabel connector={
                  <StepConnector sx={{
                    [`&.${stepConnectorClasses.active} .${stepConnectorClasses.line}`]: { borderColor: ACCENT },
                    [`&.${stepConnectorClasses.completed} .${stepConnectorClasses.line}`]: { borderColor: ACCENT },
                    [`& .${stepConnectorClasses.line}`]: { borderTopWidth: 2 },
                  }} />
                }>
                  {STEPS.map((label, i) => (
                    <Step key={label} completed={i < step}>
                      <StepLabel
                        sx={{
                          '& .MuiStepLabel-label': { fontSize: 10, mt: 0.5 },
                          '& .MuiStepIcon-root.Mui-active': { color: ACCENT },
                          '& .MuiStepIcon-root.Mui-completed': { color: ACCENT },
                        }}
                      >{label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
              )}
            </Paper>
          );
        })()}

        {/* ── Award Details Card ── */}
        {proposal.status === 'awarded' && proposal.award && (() => {
          const aw = proposal.award;
          const fmtNum = v => v ? new Intl.NumberFormat().format(v) : '—';
          const fmtD = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
          return (
            <Paper variant="outlined" sx={{ p: 2.5, mb: 2, borderRadius: 2.5, borderColor: '#10b98155', bgcolor: 'rgba(16,185,129,0.04)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: 18 }}>🏆</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#10b981' }}>Award Details</Typography>
                </Box>
                <Chip label={aw.award_number || `AWD-${aw.id}`} size="small"
                  sx={{ bgcolor: '#10b98122', color: '#10b981', fontWeight: 700, fontSize: 10.5 }} />
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1.5, mb: aw.conditions ? 2 : 0 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.08)' }}>
                  <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Total Award</Typography>
                  <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>{aw.currency} {fmtNum(aw.total_amount)}</Typography>
                </Box>
                {aw.funder_name && (
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.08)' }}>
                    <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Funder</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{aw.funder_name}</Typography>
                  </Box>
                )}
                {(aw.start_date || aw.end_date) && (
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.08)' }}>
                    <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Period</Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{fmtD(aw.start_date)} → {fmtD(aw.end_date)}</Typography>
                  </Box>
                )}
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.08)' }}>
                  <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Date Awarded</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{fmtD(aw.issued_at)}</Typography>
                </Box>
              </Box>
              {aw.conditions && (
                <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 1.5, bgcolor: '#fff8e1', border: '1px solid #f59e0b44' }}>
                  <Typography sx={{ fontSize: 10, color: '#92400e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.5 }}>Award Conditions</Typography>
                  <Typography sx={{ fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>{aw.conditions}</Typography>
                </Box>
              )}
            </Paper>
          );
        })()}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 24, fontWeight: 700, mb: 0.5 }}>{proposal.title}</Typography>
              {isDraft && (
                <IconButton
                  size="small"
                  onClick={() => {
                    setEditedTitle(proposal.title);
                    setEditTitleDialog(true);
                  }}
                  sx={{ color: 'text.secondary', '&:hover': { color: ACCENT } }}
                >
                  <EditIcon sx={{ fontSize: 18 }} />
                </IconButton>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                label={isDraft ? 'Draft' : proposal.status?.replace(/_/g, ' ')}
                size="small"
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  bgcolor: isDraft ? 'rgba(100,116,139,0.12)' : ACCENT + '22',
                  color: isDraft ? '#64748b' : ACCENT,
                }}
              />
              {/* Collaborators */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Team:</Typography>
                <AvatarGroup 
                  max={4} 
                  sx={{ 
                    '& .MuiAvatar-root': { width: 28, height: 28, fontSize: 12, cursor: 'pointer' },
                    cursor: 'pointer'
                  }}
                  onClick={(e) => setCollaboratorMenu(e.currentTarget)}
                >
                  <Tooltip title={`${proposal.lead_pi?.name || 'Lead PI'} (Lead PI)`} arrow>
                    <Avatar sx={{ bgcolor: ACCENT }}>
                      {proposal.lead_pi?.name?.charAt(0) || 'L'}
                    </Avatar>
                  </Tooltip>
                  {proposal.collaborators?.map((collab, idx) => (
                    <Tooltip 
                      key={idx}
                      title={`${collab.user?.name || collab.invited_name || 'Pending'} (${collab.role || 'Co-Investigator'})`}
                      arrow
                    >
                      <Avatar sx={{ bgcolor: '#8b5cf6', opacity: collab.status === 'pending' ? 0.6 : 1 }}>
                        {collab.user?.name?.charAt(0) || collab.invited_name?.charAt(0) || 'C'}
                      </Avatar>
                    </Tooltip>
                  ))}
                </AvatarGroup>
              </Box>
            </Box>
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
            {completion.totalDocItems > 0 && (
              <Typography sx={{ fontSize: 12 }}>
                Documents uploaded: {completion.uploadedDocItems}/{completion.totalDocItems}
              </Typography>
            )}
          </Box>
          {completion.overall < 80 && (
            <Alert severity="warning" sx={{ mt: 2, fontSize: 12 }}>
              Complete at least 80% of sections to submit.
              {completion.totalSections - completion.sections > 0 &&
                ` ${completion.totalSections - completion.sections} section(s) still need more content.`}
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
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={proposalSections.map(s => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <List dense sx={{ py: 0 }}>
                    {proposalSections.map((section) => (
                      <SortableSection
                        key={section.id}
                        section={section}
                        sectionData={sections[section.id] || {}}
                        isActive={currentSection === section.id}
                        isDraft={isDraft}
                        dark={dark}
                        onSwitch={switchSection}
                        onEdit={openEditSection}
                        onDelete={deleteSection}
                      />
                    ))}
                  </List>
                </SortableContext>
              </DndContext>
            </Collapse>
          </Box>

          <Divider />

          {/* Documents */}
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>
                DOCUMENTS ({documentRequirements.length})
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton
                  size="small"
                  onClick={() => setAddDocDialog(true)}
                  disabled={!isDraft}
                  sx={{ color: ACCENT }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => setDocsExpanded(!docsExpanded)}>
                  {docsExpanded ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}
                </IconButton>
              </Box>
            </Box>
            
            <Collapse in={docsExpanded}>
              <List dense sx={{ py: 0 }}>
                {documentRequirements.map((req) => {
                  const uploaded = req.document;
                  return (
                    <ListItem
                      key={req.id}
                      sx={{
                        px: 1,
                        py: 0.75,
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        borderRadius: 1.5,
                        mb: 0.5,
                        bgcolor: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        {uploaded ? (
                          <CheckIcon sx={{ fontSize: 14, mr: 0.75, color: '#10b981', flexShrink: 0 }} />
                        ) : (
                          <UncheckedIcon sx={{ fontSize: 14, mr: 0.75, color: 'text.disabled', flexShrink: 0 }} />
                        )}
                        <ListItemText
                          primary={req.label}
                          secondary={uploaded ? uploaded.original_filename : 'No file uploaded'}
                          primaryTypographyProps={{ fontSize: 12, fontWeight: 600 }}
                          secondaryTypographyProps={{ fontSize: 10 }}
                          sx={{ mr: 1 }}
                        />
                        {isDraft && (
                          <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
                            <IconButton
                              size="small"
                              onClick={() => openUploadForRequirement(req.id)}
                              sx={{ color: ACCENT }}
                            >
                              <UploadIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => deleteDocumentRequirement(req.id)}
                              sx={{ color: '#ef4444' }}
                            >
                              <DeleteIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Box>
                        )}
                      </Box>
                    </ListItem>
                  );
                })}
                {documentRequirements.length === 0 && (
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', fontStyle: 'italic', px: 1 }}>
                    Add required documents as line items, then upload files for each.
                  </Typography>
                )}
              </List>
            </Collapse>
          </Box>
        </Box>

        {/* Editor */}
        <Box sx={{ flex: 1, p: 3, overflowY: 'auto' }}>
          {!currentSection ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100%', textAlign: 'center', py: 8 }}>
              <DocIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
              <Typography sx={{ fontSize: 18, fontWeight: 600, mb: 1 }}>
                {proposalSections.length === 0 ? 'No sections yet' : 'Select a section to begin'}
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 3, maxWidth: 360 }}>
                {proposalSections.length === 0
                  ? 'Add your own proposal sections. Each section starts blank until you write in it.'
                  : 'Choose a section from the sidebar. Your work is saved automatically when you switch sections.'}
              </Typography>
              {isDraft && proposalSections.length === 0 && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setAddSectionDialog(true)}
                  sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' }, textTransform: 'none' }}
                >
                  Add First Section
                </Button>
              )}
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box>
                  <Typography sx={{ fontSize: 20, fontWeight: 700, mb: 0.5 }}>
                    {proposalSections.find(s => s.id === currentSection)?.title || 'Section'}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    Version {sections[currentSection]?.version || 1} • Last edited by {sections[currentSection]?.last_edited_by || 'you'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Tooltip title="Version History">
                    <IconButton
                      size="small"
                      onClick={() => openVersionHistory(currentSection)}
                      sx={{ color: 'text.secondary' }}
                    >
                      <HistoryIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Comments">
                    <IconButton
                      size="small"
                      onClick={() => setCommentsOpen(v => !v)}
                      sx={{ color: commentsOpen ? ACCENT : 'text.secondary' }}
                    >
                      <CommentIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {isDraft && proposal?.lead_pi_id && (
                    <Tooltip title="Section Permissions">
                      <IconButton
                        size="small"
                        onClick={() => {
                          const sec = proposalSections.find(s => s.id === currentSection);
                          if (sec) openPermissions(sec);
                        }}
                        sx={{ color: 'text.secondary' }}
                      >
                        <LockIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
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
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                {/* Editor */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <TiptapEditor
                    content={sectionContent}
                    onChange={setSectionContent}
                    onWordCount={setWordCount}
                    placeholder={`Write your ${proposalSections.find(s => s.id === currentSection)?.title.toLowerCase() || 'content'} here... Type @ to mention someone`}
                    disabled={!isDraft}
                    collaborators={proposal?.collaborators || []}
                    currentUser={currentUser}
                    comments={commentsBySectionId[currentSection] || []}
                    onAddComment={(commentId, selectedText) => {
                      setCommentsOpen(true);
                      setPendingComment({ commentId, selectedText });
                    }}
                    onResolveComment={(commentId) => {
                      setCommentsBySectionId(prev => ({
                        ...prev,
                        [currentSection]: (prev[currentSection] || []).map(c =>
                          c.commentId === commentId ? { ...c, resolved: true } : c
                        )
                      }));
                    }}
                  />
                </Box>

                {/* Comment Panel */}
                {commentsOpen && (
                  <Box sx={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Comments</Typography>
                      <IconButton size="small" onClick={() => setCommentsOpen(false)}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    {/* New comment input (shown when text is selected) */}
                    {pendingComment && (
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: '#f59e0b' }}>
                        <Typography sx={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, mb: 0.5 }}>NEW COMMENT ON:</Typography>
                        <Typography sx={{ fontSize: 12, fontStyle: 'italic', mb: 1, color: 'text.secondary' }}>
                          "{pendingComment.selectedText?.slice(0, 60)}{pendingComment.selectedText?.length > 60 ? '…' : ''}"
                        </Typography>
                        <TextField
                          fullWidth size="small" multiline rows={2}
                          placeholder="Add a comment..."
                          value={newCommentText}
                          onChange={e => setNewCommentText(e.target.value)}
                          sx={{ mb: 1 }}
                          autoFocus
                        />
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <Button size="small" onClick={() => { setPendingComment(null); setNewCommentText(''); }}>
                            Cancel
                          </Button>
                          <Button size="small" variant="contained"
                            disabled={!newCommentText.trim()}
                            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}
                            onClick={() => {
                              if (!newCommentText.trim()) return;
                              const comment = {
                                commentId: pendingComment.commentId,
                                text: newCommentText,
                                selectedText: pendingComment.selectedText,
                                author: currentUser?.name || 'You',
                                resolved: false,
                                createdAt: new Date().toISOString(),
                              };
                              setCommentsBySectionId(prev => ({
                                ...prev,
                                [currentSection]: [...(prev[currentSection] || []), comment]
                              }));
                              setPendingComment(null);
                              setNewCommentText('');
                            }}
                          >
                            Save
                          </Button>
                        </Box>
                      </Paper>
                    )}

                    {/* Existing comments */}
                    {(commentsBySectionId[currentSection] || []).length === 0 && !pendingComment ? (
                      <Typography sx={{ fontSize: 12, color: 'text.disabled', textAlign: 'center', py: 3 }}>
                        Select text in the editor and click the comment button to add a comment.
                      </Typography>
                    ) : (
                      (commentsBySectionId[currentSection] || []).map((c, i) => (
                        <Paper key={i} variant="outlined" sx={{ p: 1.5, borderRadius: 2, opacity: c.resolved ? 0.5 : 1, borderColor: c.resolved ? 'divider' : '#f59e0b22' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Avatar sx={{ width: 20, height: 20, fontSize: 10, bgcolor: ACCENT }}>{c.author?.charAt(0)}</Avatar>
                              <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{c.author}</Typography>
                            </Box>
                            {!c.resolved && (
                              <Tooltip title="Resolve">
                                <IconButton size="small" sx={{ p: 0.25 }}
                                  onClick={() => setCommentsBySectionId(prev => ({
                                    ...prev,
                                    [currentSection]: prev[currentSection].map(cc =>
                                      cc.commentId === c.commentId ? { ...cc, resolved: true } : cc
                                    )
                                  }))}>
                                  <CheckIcon sx={{ fontSize: 14, color: '#10b981' }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                          {c.selectedText && (
                            <Typography sx={{ fontSize: 11, fontStyle: 'italic', color: '#f59e0b', borderLeft: '2px solid #f59e0b', pl: 1, mb: 0.5 }}>
                              "{c.selectedText?.slice(0, 50)}…"
                            </Typography>
                          )}
                          <Typography sx={{ fontSize: 13 }}>{c.text}</Typography>
                          {c.resolved && <Chip label="Resolved" size="small" sx={{ mt: 0.5, fontSize: 10, bgcolor: '#10b98122', color: '#10b981' }} />}
                        </Paper>
                      ))
                    )}
                  </Box>
                )}
              </Box>
            </>
          )}
        </Box>
      </Box>

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onClose={() => { setUploadDialog(false); setUploadFiles([]); setUploadRequirementId(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>
          {uploadRequirementId
            ? `Upload: ${documentRequirements.find(r => r.id === uploadRequirementId)?.label || 'Document'}`
            : 'Upload Document'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
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
              <input 
                type="file" 
                multiple 
                hidden 
                onChange={(e) => setUploadFiles(Array.from(e.target.files))} 
              />
              <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 0.5 }}>
                {uploadFiles.length > 0 
                  ? `${uploadFiles.length} file(s) selected` 
                  : 'Click to upload or drag and drop'}
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                PDF, DOC, DOCX (max 10MB per file)
              </Typography>
            </Box>
            
            {uploadFiles.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                  SELECTED FILES
                </Typography>
                <List dense>
                  {uploadFiles.map((file, idx) => (
                    <ListItem 
                      key={idx}
                      secondaryAction={
                        <IconButton 
                          edge="end" 
                          size="small"
                          onClick={() => setUploadFiles(uploadFiles.filter((_, i) => i !== idx))}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <DocIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                      <ListItemText 
                        primary={file.name}
                        secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                        primaryTypographyProps={{ fontSize: 13 }}
                        secondaryTypographyProps={{ fontSize: 11 }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => { setUploadDialog(false); setUploadFiles([]); setUploadRequirementId(null); }}>Cancel</Button>
          <Button 
            onClick={uploadDocument} 
            variant="contained" 
            disabled={uploadFiles.length === 0}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}
          >
            Upload {uploadFiles.length > 0 && `(${uploadFiles.length})`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Document Requirement Dialog */}
      <Dialog open={addDocDialog} onClose={() => setAddDocDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Required Document</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Document name"
            placeholder="e.g. CV, Budget spreadsheet, Support letter"
            value={newDocLabel}
            onChange={(e) => setNewDocLabel(e.target.value)}
            sx={{ mt: 2 }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addDocumentRequirement();
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => { setAddDocDialog(false); setNewDocLabel(''); }}>Cancel</Button>
          <Button
            onClick={addDocumentRequirement}
            variant="contained"
            disabled={!newDocLabel.trim()}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}
          >
            Add Document
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

      {/* Version History Dialog */}
      <Dialog open={versionDialog} onClose={() => { setVersionDialog(false); setPreviewVersion(null); }} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography sx={{ fontWeight: 700 }}>Version History</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                {proposalSections.find(s => s.id === currentSection)?.title}
              </Typography>
            </Box>
            {sectionVersions.length > 0 && (
              <Chip label={`${sectionVersions.length} versions`} size="small" sx={{ bgcolor: ACCENT + '22', color: ACCENT }} />
            )}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {versionsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : sectionVersions.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography sx={{ color: 'text.secondary' }}>No version history yet.</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>Versions are saved automatically each time you save the section.</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', height: 480 }}>
              {/* Version list */}
              <Box sx={{ width: 260, borderRight: `1px solid`, borderColor: 'divider', overflowY: 'auto' }}>
                {sectionVersions.map((v) => (
                  <Box
                    key={v.id}
                    onClick={() => setPreviewVersion(v)}
                    sx={{
                      p: 2, cursor: 'pointer', borderBottom: `1px solid`, borderColor: 'divider',
                      bgcolor: previewVersion?.id === v.id ? ACCENT + '15' : 'transparent',
                      '&:hover': { bgcolor: ACCENT + '10' }
                    }}
                  >
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Version {v.version_number}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{v.saved_by}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                      {v.saved_at ? new Date(v.saved_at).toLocaleString() : '—'}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>{v.word_count} words</Typography>
                  </Box>
                ))}
              </Box>
              {/* Preview pane */}
              <Box sx={{ flex: 1, p: 2, overflowY: 'auto' }}>
                {previewVersion ? (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography sx={{ fontWeight: 600 }}>Version {previewVersion.version_number} Preview</Typography>
                      {isDraft && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<RestoreIcon />}
                          onClick={() => restoreVersion(previewVersion.id)}
                          sx={{ borderColor: ACCENT, color: ACCENT }}
                        >
                          Restore This Version
                        </Button>
                      )}
                    </Box>
                    <Box
                      sx={{ p: 2, border: `1px solid`, borderColor: 'divider', borderRadius: 2, fontSize: 14 }}
                      dangerouslySetInnerHTML={{ __html: previewVersion.content_html || '<em>Empty</em>' }}
                    />
                  </>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>Select a version to preview</Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => { setVersionDialog(false); setPreviewVersion(null); }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Section Permissions Dialog */}
      <Dialog open={permissionsDialog} onClose={() => setPermissionsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box>
            <Typography sx={{ fontWeight: 700 }}>Section Permissions</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{editingPermSection?.title}</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, fontSize: 12 }}>
            Restrict who can edit this section. Leave all roles unchecked to allow all team members to edit.
          </Alert>
          <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>Allowed Editors</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[
              { value: 'principal_investigator', label: 'Principal Investigator' },
              { value: 'grant_officer', label: 'Grant Officer' },
              { value: 'co_investigator', label: 'Co-Investigator' },
            ].map((role) => (
              <Box
                key={role.value}
                onClick={() => {
                  setAllowedRoles(prev =>
                    prev.includes(role.value)
                      ? prev.filter(r => r !== role.value)
                      : [...prev, role.value]
                  );
                }}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2,
                  border: `1px solid`, cursor: 'pointer',
                  borderColor: allowedRoles.includes(role.value) ? ACCENT : 'divider',
                  bgcolor: allowedRoles.includes(role.value) ? ACCENT + '10' : 'transparent',
                }}
              >
                {allowedRoles.includes(role.value)
                  ? <CheckIcon sx={{ fontSize: 18, color: ACCENT }} />
                  : <UncheckedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />}
                <Typography sx={{ fontSize: 13 }}>{role.label}</Typography>
              </Box>
            ))}
          </Box>
          {allowedRoles.length === 0 && (
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1.5 }}>
              No restrictions — all team members can edit this section.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setPermissionsDialog(false)}>Cancel</Button>
          <Button onClick={savePermissions} variant="contained" sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}>
            Save Permissions
          </Button>
        </DialogActions>
      </Dialog>

      {/* Collaborator Menu */}
      <Menu
        anchorEl={collaboratorMenu}
        open={Boolean(collaboratorMenu)}
        onClose={() => setCollaboratorMenu(null)}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 1 }}>
            TEAM MEMBERS
          </Typography>
        </Box>
        <MenuItem disabled>
          <Avatar sx={{ width: 24, height: 24, fontSize: 11, mr: 1.5, bgcolor: ACCENT }}>
            {proposal?.lead_pi?.name?.charAt(0) || 'L'}
          </Avatar>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
              {proposal?.lead_pi?.name || 'Lead PI'}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Lead PI</Typography>
          </Box>
        </MenuItem>
        {proposal?.collaborators?.map((collab, idx) => (
          <MenuItem key={idx} disabled>
            <Avatar sx={{ width: 24, height: 24, fontSize: 11, mr: 1.5, bgcolor: '#8b5cf6' }}>
              {collab.user?.name?.charAt(0) || collab.invited_name?.charAt(0) || 'C'}
            </Avatar>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                {collab.user?.name || collab.invited_name || 'Pending'}
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                {collab.role || 'Co-Investigator'} • {collab.status}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>

      {/* Edit Title Dialog */}
      <Dialog 
        open={editTitleDialog} 
        onClose={() => {
          setEditTitleDialog(false);
          setEditedTitle('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Proposal Title</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Proposal Title"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            sx={{ mt: 2 }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && editedTitle.trim()) {
                updateProposalTitle();
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => {
            setEditTitleDialog(false);
            setEditedTitle('');
          }}>
            Cancel
          </Button>
          <Button 
            onClick={updateProposalTitle}
            variant="contained"
            disabled={!editedTitle.trim()}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}
            startIcon={<EditIcon />}
          >
            Update Title
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
