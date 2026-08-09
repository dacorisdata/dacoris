'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
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
  History as HistoryIcon, Lock as LockIcon, Restore as RestoreIcon,
  CommentBank as CommentIcon, Close as CloseIcon,
  KeyboardArrowUp as MoveUpIcon, KeyboardArrowDown as MoveDownIcon,
  Download as DownloadIcon, PictureAsPdf as PdfIcon, Article as WordIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useLanguage } from '../../../../../contexts/LanguageContext';

const TiptapEditor = dynamic(() => import('../../../../../components/TiptapEditor'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#16a699';
const LOCALE_MAP = { en: 'en-US', fr: 'fr-FR', ar: 'ar', sw: 'sw-KE' };
const WORKFLOW_STEP_KEYS = ['received', 'eligibility', 'technical', 'budget', 'panel', 'final'];
const PW = 'researcher.proposalWorkspace';

const normalizeStatusKey = (status) => (status || '').toLowerCase().replace(/\s+/g, '_');

const getStatusLabel = (status, t) => {
  const key = normalizeStatusKey(status);
  const labelKey = `researcher.grantsProposals.status.${key}`;
  const label = t(labelKey);
  return label !== labelKey ? label : (status || t('researcher.grantsProposals.status.unknown'));
};

const formatRole = (role, t) => {
  const map = {
    'Co-Investigator': t('researcher.grantsProposals.roles.coInvestigator'),
    Consultant: t('researcher.grantsProposals.roles.consultant'),
    Advisor: t('researcher.grantsProposals.roles.advisor'),
    Collaborator: t('researcher.grantsProposals.roles.collaborator'),
  };
  return map[role] || role;
};

const formatCollabStatus = (status, t) => {
  const key = (status || '').toLowerCase();
  if (key === 'accepted') return t('researcher.grantsProposals.collab.statusAccepted');
  if (key === 'pending') return t('researcher.grantsProposals.collab.statusPending');
  return status;
};

const fmtDate = (d, locale, options = { year: 'numeric', month: 'short', day: 'numeric' }) =>
  d ? new Date(d).toLocaleDateString(LOCALE_MAP[locale] || 'en-US', options) : '—';

// Section list item with up/down reorder controls
function SectionListItem({
  section,
  sectionData,
  isActive,
  isDraft,
  dark,
  index,
  totalCount,
  onSwitch,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  t,
}) {
  const isComplete = (sectionData.wordCount || 0) > 50;
  const canMoveUp = isDraft && index > 0;
  const canMoveDown = isDraft && index < totalCount - 1;

  return (
    <ListItem
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
          '&:hover': { bgcolor: ACCENT + '20' },
        },
        '&:hover': { bgcolor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
      }}
      secondaryAction={
        <Box sx={{ display: 'flex', gap: 0.25, alignItems: 'center' }}>
          {isDraft && (
            <Box sx={{ display: 'flex', flexDirection: 'column', mr: 0.25 }}>
              <IconButton
                size="small"
                disabled={!canMoveUp}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp(section.id);
                }}
                sx={{ p: 0.25 }}
              >
                <MoveUpIcon sx={{ fontSize: 16 }} />
              </IconButton>
              <IconButton
                size="small"
                disabled={!canMoveDown}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown(section.id);
                }}
                sx={{ p: 0.25 }}
              >
                <MoveDownIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          )}
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
      <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
        {isComplete ? (
          <CheckIcon sx={{ fontSize: 16, color: '#10b981' }} />
        ) : (
          <UncheckedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
        )}
      </Box>
      <ListItemText
        primary={section.title}
        secondary={t(`${PW}.words`, { count: sectionData.wordCount || 0 })}
        primaryTypographyProps={{ fontSize: 13, fontWeight: isActive ? 600 : 400, noWrap: true }}
        secondaryTypographyProps={{ fontSize: 11 }}
        sx={{ pr: isDraft ? 11 : 6 }}
      />
    </ListItem>
  );
}

export default function ProposalWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const { t, locale } = useLanguage();
  
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
  const [reorderingSection, setReorderingSection] = useState(false);
  const [downloadMenu, setDownloadMenu] = useState(null);
  const [downloading, setDownloading] = useState(false);

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
        setError(t(`${PW}.sessionExpired`));
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
    if (!proposal || proposal.status?.toUpperCase() !== 'DRAFT' || !currentSection || reorderingSection) return;

    const interval = setInterval(() => {
      if (isSectionDirty(currentSection, sectionContent, wordCount)) {
        persistCurrentSection();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [sectionContent, wordCount, proposal, currentSection, sections, reorderingSection]);

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
        setError(t(`${PW}.sessionExpired`));
        localStorage.removeItem('token');
        setTimeout(() => router.push('/login'), 2000);
      } else {
        setError(e.response?.data?.detail || t(`${PW}.errorLoad`));
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
        setError(t(`${PW}.errorSaveSection`));
        return;
      }
      setSuccess(t(`${PW}.successSaveSection`));
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
      setSuccess(t(`${PW}.successUpload`, { count: uploadFiles.length }));
      await loadProposal({ preserveSectionId: currentSection });
    } catch (e) {
      console.error('Upload error:', e);
      console.error('Error response:', e.response?.data);
      setError(e.response?.data?.detail || t(`${PW}.errorUpload`));
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
      setSuccess(t(`${PW}.successDocRequirement`));
      await loadProposal({ preserveSectionId: currentSection });
    } catch (e) {
      setError(e.response?.data?.detail || t(`${PW}.errorDocRequirement`));
    }
  };

  const deleteDocumentRequirement = async (requirementId) => {
    if (!confirm(t(`${PW}.confirmDeleteDocReq`))) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_URL}/grants/proposals/${params.id}/document-requirements/${requirementId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(t(`${PW}.successDocReqRemoved`));
      await loadProposal({ preserveSectionId: currentSection });
    } catch (e) {
      setError(e.response?.data?.detail || t(`${PW}.errorDocReqRemoved`));
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
      
      setSuccess(t(`${PW}.successSubmit`));
      await loadProposal({ preserveSectionId: currentSection });
    } catch (e) {
      if (e.response?.status === 401) {
        setError(t(`${PW}.sessionExpired`));
        localStorage.removeItem('token');
        setTimeout(() => router.push('/login'), 2000);
      } else {
        setError(e.response?.data?.detail || t(`${PW}.errorSubmit`));
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
      setSuccess(t(`${PW}.successSectionAdded`));
      await loadProposal({ preserveSectionId: response.data.id });
    } catch (e) {
      setError(e.response?.data?.detail || t(`${PW}.errorSectionAdded`));
      console.error('Add section error:', e);
    }
  };

  const deleteSection = async (sectionId) => {
    if (!confirm(t(`${PW}.confirmDeleteSection`))) return;
    
    try {
      if (sectionId === currentSection) {
        await persistCurrentSection();
      }
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_URL}/grants/proposals/${params.id}/sections/${sectionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess(t(`${PW}.successSectionDeleted`));
      const nextSectionId = sectionId === currentSection ? null : currentSection;
      await loadProposal({ preserveSectionId: nextSectionId });
    } catch (e) {
      setError(e.response?.data?.detail || t(`${PW}.errorSectionDeleted`));
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
      setSuccess(t(`${PW}.successSectionRenamed`));
      await loadProposal({ preserveSectionId: currentSection });
    } catch (e) {
      setError(e.response?.data?.detail || t(`${PW}.errorSectionRenamed`));
      console.error('Rename section error:', e);
    }
  };

  const openEditSection = (section) => {
    setEditingSectionId(section.id);
    setEditingSectionTitle(section.title);
    setEditSectionDialog(true);
  };

  const persistSectionOrder = async (newOrder) => {
    const previousOrder = proposalSections;
    setProposalSections(newOrder);
    setReorderingSection(true);

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/grants/proposals/${params.id}/sections/reorder`,
        { section_ids: newOrder.map((s) => s.id) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (e) {
      console.error('Failed to save section order:', e);
      setProposalSections(previousOrder);
      setError(e.response?.data?.detail || t(`${PW}.errorSectionOrder`));
    } finally {
      setReorderingSection(false);
    }
  };

  const moveSection = (sectionId, direction) => {
    if (proposal?.status?.toUpperCase() !== 'DRAFT' || reorderingSection) return;

    const index = proposalSections.findIndex((s) => s.id === sectionId);
    if (index < 0) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= proposalSections.length) return;

    const newOrder = [...proposalSections];
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    persistSectionOrder(newOrder);
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
      setError(t(`${PW}.errorVersions`));
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
      setSuccess(t(`${PW}.successVersionRestored`));
      await loadProposal({ preserveSectionId: currentSection });
    } catch (e) {
      setError(e.response?.data?.detail || t(`${PW}.errorVersionRestored`));
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
      setSuccess(t(`${PW}.successPermissions`));
      await loadProposal({ preserveSectionId: currentSection });
    } catch (e) {
      setError(e.response?.data?.detail || t(`${PW}.errorPermissions`));
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
      
      setSuccess(t(`${PW}.successTitleUpdated`));
      setEditTitleDialog(false);
      setEditedTitle('');
      await loadProposal({ preserveSectionId: currentSection });
    } catch (e) {
      setError(e.response?.data?.detail || t(`${PW}.errorTitleUpdated`));
      console.error('Update title error:', e);
    }
  };

  const downloadProposal = async (format) => {
    setDownloadMenu(null);
    try {
      setDownloading(true);
      await persistCurrentSection();
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `${API_URL}/grants/proposals/${params.id}/export`,
        {
          params: { format },
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
          validateStatus: (status) => status >= 200 && status < 300,
        }
      );

      const contentType = res.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        const message = await res.data.text();
        throw new Error(message);
      }

      let filename = format === 'pdf' ? 'proposal.pdf' : 'proposal.doc';
      const disposition = res.headers['content-disposition'];
      const match = disposition?.match(/filename="?([^";]+)"?/i);
      if (match?.[1]) filename = match[1];

      const blob = new Blob([res.data], { type: contentType || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccess(t(`${PW}.successDownload`));
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      if (e.response?.status === 401) {
        setError(t(`${PW}.sessionExpired`));
        localStorage.removeItem('token');
        setTimeout(() => router.push('/login'), 2000);
        return;
      }

      let detail = t(`${PW}.errorDownload`);
      const errorBlob = e.response?.data;
      if (errorBlob instanceof Blob) {
        try {
          const text = await errorBlob.text();
          const parsed = JSON.parse(text);
          detail = parsed.detail || detail;
        } catch {
          // keep generic message
        }
      }
      setError(detail);
    } finally {
      setDownloading(false);
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
        <Alert severity="error">{t(`${PW}.notFound`)}</Alert>
        <Button startIcon={<BackIcon />} onClick={() => router.push('/researcher/grants/proposals')} sx={{ mt: 2 }}>
          {t(`${PW}.backToProposals`)}
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
          {t(`${PW}.backToProposals`)}
        </Button>
        
        {/* ── Workflow Stepper ────────────────────────────── */}
        {proposal.status !== 'draft' && (() => {
          const step = proposal.review_step ?? 0;
          const isTerminal = ['awarded','declined'].includes(proposal.status);
          const terminalColor = proposal.status === 'awarded' ? '#10b981' : '#ef4444';
          const reviewStage = proposal.review_stage_name || t(`${PW}.workflow.underReviewDefault`);
          return (
            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2.5, borderColor: isTerminal ? terminalColor + '55' : ACCENT + '44' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: isTerminal ? terminalColor : ACCENT }}>
                    {isTerminal
                      ? (proposal.status === 'awarded' ? `🏆 ${t(`${PW}.workflow.awarded`)}` : `❌ ${t(`${PW}.workflow.notAwarded`)}`)
                      : `📋 ${t(`${PW}.workflow.underReview`, { stage: reviewStage })}`}
                  </Typography>
                  {proposal.stage_notes && (
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.3 }}>
                      {t(`${PW}.workflow.note`, { notes: proposal.stage_notes })}
                    </Typography>
                  )}
                </Box>
                <Chip
                  label={getStatusLabel(proposal.status, t)}
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
                  {WORKFLOW_STEP_KEYS.map((stepKey, i) => (
                    <Step key={stepKey} completed={i < step}>
                      <StepLabel
                        sx={{
                          '& .MuiStepLabel-label': { fontSize: 10, mt: 0.5 },
                          '& .MuiStepIcon-root.Mui-active': { color: ACCENT },
                          '& .MuiStepIcon-root.Mui-completed': { color: ACCENT },
                        }}
                      >{t(`${PW}.workflow.steps.${stepKey}`)}</StepLabel>
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
          const fmtNum = v => v ? new Intl.NumberFormat(LOCALE_MAP[locale] || 'en-US').format(v) : '—';
          const fmtD = d => fmtDate(d, locale);
          return (
            <Paper variant="outlined" sx={{ p: 2.5, mb: 2, borderRadius: 2.5, borderColor: '#10b98155', bgcolor: 'rgba(16,185,129,0.04)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: 18 }}>🏆</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#10b981' }}>{t(`${PW}.award.title`)}</Typography>
                </Box>
                <Chip label={aw.award_number || `AWD-${aw.id}`} size="small"
                  sx={{ bgcolor: '#10b98122', color: '#10b981', fontWeight: 700, fontSize: 10.5 }} />
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1.5, mb: aw.conditions ? 2 : 0 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.08)' }}>
                  <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{t(`${PW}.award.totalAward`)}</Typography>
                  <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>{aw.currency} {fmtNum(aw.total_amount)}</Typography>
                </Box>
                {aw.funder_name && (
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.08)' }}>
                    <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{t(`${PW}.award.funder`)}</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{aw.funder_name}</Typography>
                  </Box>
                )}
                {(aw.start_date || aw.end_date) && (
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.08)' }}>
                    <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{t(`${PW}.award.period`)}</Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{fmtD(aw.start_date)} → {fmtD(aw.end_date)}</Typography>
                  </Box>
                )}
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.08)' }}>
                  <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{t(`${PW}.award.dateAwarded`)}</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{fmtD(aw.issued_at)}</Typography>
                </Box>
              </Box>
              {aw.conditions && (
                <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 1.5, bgcolor: '#fff8e1', border: '1px solid #f59e0b44' }}>
                  <Typography sx={{ fontSize: 10, color: '#92400e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.5 }}>{t(`${PW}.award.conditions`)}</Typography>
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
                label={isDraft ? t(`${PW}.header.draft`) : getStatusLabel(proposal.status, t)}
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
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{t(`${PW}.header.team`)}</Typography>
                <AvatarGroup 
                  max={4} 
                  sx={{ 
                    '& .MuiAvatar-root': { width: 28, height: 28, fontSize: 12, cursor: 'pointer' },
                    cursor: 'pointer'
                  }}
                  onClick={(e) => setCollaboratorMenu(e.currentTarget)}
                >
                  <Tooltip title={`${proposal.lead_pi?.name || t('researcher.grantsProposals.roles.leadPi')} (${t('researcher.grantsProposals.roles.leadPi')})`} arrow>
                    <Avatar sx={{ bgcolor: ACCENT }}>
                      {proposal.lead_pi?.name?.charAt(0) || 'L'}
                    </Avatar>
                  </Tooltip>
                  {proposal.collaborators?.map((collab, idx) => (
                    <Tooltip 
                      key={idx}
                      title={`${collab.user?.name || collab.invited_name || t('researcher.grantsProposals.roles.pending')} (${formatRole(collab.role || 'Co-Investigator', t)})`}
                      arrow
                    >
                      <Avatar sx={{
                        bgcolor: '#8b5cf6',
                        ...(collab.status !== 'accepted' ? { opacity: 0.42, filter: 'grayscale(0.9)', borderStyle: 'dashed' } : {}),
                      }}>
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
                label={t(`${PW}.header.autoSaving`)} 
                size="small" 
                sx={{ fontSize: 11, bgcolor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
              />
            )}
            {downloading && (
              <Chip
                label={t(`${PW}.header.downloading`)}
                size="small"
                sx={{ fontSize: 11, bgcolor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
              />
            )}
            <Button
              variant="outlined"
              startIcon={downloading ? <CircularProgress size={14} /> : <DownloadIcon />}
              onClick={(e) => setDownloadMenu(e.currentTarget)}
              disabled={downloading}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              {t(`${PW}.header.download`)}
            </Button>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={submitProposal}
              disabled={!canSubmit || !isDraft}
              sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' }, textTransform: 'none' }}
            >
              {t(`${PW}.header.submitProposal`)}
            </Button>
          </Box>
        </Box>

        {/* Completion Progress */}
        <Paper elevation={0} sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{t(`${PW}.progress.title`)}</Typography>
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
              {t(`${PW}.progress.sections`, { completed: completion.sections, total: completion.totalSections })}
            </Typography>
            {completion.totalDocItems > 0 && (
              <Typography sx={{ fontSize: 12 }}>
                {t(`${PW}.progress.documents`, { uploaded: completion.uploadedDocItems, total: completion.totalDocItems })}
              </Typography>
            )}
          </Box>
          {completion.overall < 80 && (
            <Alert severity="warning" sx={{ mt: 2, fontSize: 12 }}>
              {t(`${PW}.progress.warning`)}
              {completion.totalSections - completion.sections > 0 &&
                ` ${t(`${PW}.progress.sectionsNeeded`, { count: completion.totalSections - completion.sections })}`}
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
          width: 300, 
          borderRight: `1px solid ${theme.palette.divider}`,
          overflowY: 'auto',
          bgcolor: dark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)'
        }}>
          {/* Sections */}
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>
                {t(`${PW}.sidebar.sections`)}
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
                {proposalSections.map((section, index) => (
                  <SectionListItem
                    key={section.id}
                    section={section}
                    sectionData={sections[section.id] || {}}
                    isActive={currentSection === section.id}
                    isDraft={isDraft}
                    dark={dark}
                    index={index}
                    totalCount={proposalSections.length}
                    onSwitch={switchSection}
                    onEdit={openEditSection}
                    onDelete={deleteSection}
                    onMoveUp={(sectionId) => moveSection(sectionId, 'up')}
                    onMoveDown={(sectionId) => moveSection(sectionId, 'down')}
                    t={t}
                  />
                ))}
              </List>
            </Collapse>
          </Box>

          <Divider />

          {/* Documents */}
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>
                {t(`${PW}.sidebar.documents`, { count: documentRequirements.length })}
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
                          secondary={uploaded ? uploaded.original_filename : t(`${PW}.sidebar.noFileUploaded`)}
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
                    {t(`${PW}.sidebar.addDocumentsHint`)}
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
                {proposalSections.length === 0 ? t(`${PW}.editor.noSections`) : t(`${PW}.editor.selectSection`)}
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 3, maxWidth: 360 }}>
                {proposalSections.length === 0
                  ? t(`${PW}.editor.noSectionsHint`)
                  : t(`${PW}.editor.selectSectionHint`)}
              </Typography>
              {isDraft && proposalSections.length === 0 && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setAddSectionDialog(true)}
                  sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' }, textTransform: 'none' }}
                >
                  {t(`${PW}.editor.addFirstSection`)}
                </Button>
              )}
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box>
                  <Typography sx={{ fontSize: 20, fontWeight: 700, mb: 0.5 }}>
                    {proposalSections.find(s => s.id === currentSection)?.title || t(`${PW}.editor.sectionFallback`)}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {t(`${PW}.editor.versionInfo`, {
                      version: sections[currentSection]?.version || 1,
                      editor: sections[currentSection]?.last_edited_by || t(`${PW}.editor.you`),
                    })}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Tooltip title={t(`${PW}.tooltips.versionHistory`)}>
                    <IconButton
                      size="small"
                      onClick={() => openVersionHistory(currentSection)}
                      sx={{ color: 'text.secondary' }}
                    >
                      <HistoryIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t(`${PW}.tooltips.comments`)}>
                    <IconButton
                      size="small"
                      onClick={() => setCommentsOpen(v => !v)}
                      sx={{ color: commentsOpen ? ACCENT : 'text.secondary' }}
                    >
                      <CommentIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {isDraft && proposal?.lead_pi_id && (
                    <Tooltip title={t(`${PW}.tooltips.sectionPermissions`)}>
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
                    {saving ? t(`${PW}.editor.saving`) : t(`${PW}.editor.saveSection`)}
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
                    placeholder={t(`${PW}.editor.placeholder`, {
                      section: proposalSections.find(s => s.id === currentSection)?.title.toLowerCase() || t(`${PW}.editor.writeContent`),
                    })}
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
                      <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{t(`${PW}.comments.title`)}</Typography>
                      <IconButton size="small" onClick={() => setCommentsOpen(false)}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    {/* New comment input (shown when text is selected) */}
                    {pendingComment && (
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: '#f59e0b' }}>
                        <Typography sx={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, mb: 0.5 }}>{t(`${PW}.comments.newOn`)}</Typography>
                        <Typography sx={{ fontSize: 12, fontStyle: 'italic', mb: 1, color: 'text.secondary' }}>
                          "{pendingComment.selectedText?.slice(0, 60)}{pendingComment.selectedText?.length > 60 ? '…' : ''}"
                        </Typography>
                        <TextField
                          fullWidth size="small" multiline rows={2}
                          placeholder={t(`${PW}.comments.placeholder`)}
                          value={newCommentText}
                          onChange={e => setNewCommentText(e.target.value)}
                          sx={{ mb: 1 }}
                          autoFocus
                        />
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <Button size="small" onClick={() => { setPendingComment(null); setNewCommentText(''); }}>
                            {t(`${PW}.comments.cancel`)}
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
                                author: currentUser?.name || t(`${PW}.comments.authorYou`),
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
                            {t(`${PW}.comments.save`)}
                          </Button>
                        </Box>
                      </Paper>
                    )}

                    {/* Existing comments */}
                    {(commentsBySectionId[currentSection] || []).length === 0 && !pendingComment ? (
                      <Typography sx={{ fontSize: 12, color: 'text.disabled', textAlign: 'center', py: 3 }}>
                        {t(`${PW}.comments.emptyHint`)}
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
                              <Tooltip title={t(`${PW}.tooltips.resolve`)}>
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
                          {c.resolved && <Chip label={t(`${PW}.comments.resolved`)} size="small" sx={{ mt: 0.5, fontSize: 10, bgcolor: '#10b98122', color: '#10b981' }} />}
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
            ? t(`${PW}.uploadDialog.title`, { label: documentRequirements.find(r => r.id === uploadRequirementId)?.label || t(`${PW}.uploadDialog.titleGeneric`) })
            : t(`${PW}.uploadDialog.titleGeneric`)}
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
                  ? t(`${PW}.uploadDialog.filesSelected`, { count: uploadFiles.length })
                  : t(`${PW}.uploadDialog.clickToUpload`)}
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                {t(`${PW}.uploadDialog.fileTypes`)}
              </Typography>
            </Box>
            
            {uploadFiles.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                  {t(`${PW}.uploadDialog.selectedFiles`)}
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
          <Button onClick={() => { setUploadDialog(false); setUploadFiles([]); setUploadRequirementId(null); }}>{t(`${PW}.uploadDialog.cancel`)}</Button>
          <Button 
            onClick={uploadDocument} 
            variant="contained" 
            disabled={uploadFiles.length === 0}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}
          >
            {uploadFiles.length > 0
              ? t(`${PW}.uploadDialog.uploadCount`, { count: uploadFiles.length })
              : t(`${PW}.uploadDialog.upload`)}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Document Requirement Dialog */}
      <Dialog open={addDocDialog} onClose={() => setAddDocDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t(`${PW}.addDocDialog.title`)}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label={t(`${PW}.addDocDialog.label`)}
            placeholder={t(`${PW}.addDocDialog.placeholder`)}
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
          <Button onClick={() => { setAddDocDialog(false); setNewDocLabel(''); }}>{t(`${PW}.addDocDialog.cancel`)}</Button>
          <Button
            onClick={addDocumentRequirement}
            variant="contained"
            disabled={!newDocLabel.trim()}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}
          >
            {t(`${PW}.addDocDialog.add`)}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Section Dialog */}
      <Dialog open={addSectionDialog} onClose={() => setAddSectionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t(`${PW}.addSectionDialog.title`)}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label={t(`${PW}.addSectionDialog.label`)}
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
          <Button onClick={() => setAddSectionDialog(false)}>{t(`${PW}.addSectionDialog.cancel`)}</Button>
          <Button 
            onClick={addSection} 
            variant="contained" 
            disabled={!newSectionTitle.trim()}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}
          >
            {t(`${PW}.addSectionDialog.add`)}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Section Dialog */}
      <Dialog open={editSectionDialog} onClose={() => setEditSectionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t(`${PW}.renameSectionDialog.title`)}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label={t(`${PW}.renameSectionDialog.label`)}
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
          <Button onClick={() => setEditSectionDialog(false)}>{t(`${PW}.renameSectionDialog.cancel`)}</Button>
          <Button 
            onClick={renameSection} 
            variant="contained" 
            disabled={!editingSectionTitle.trim()}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}
          >
            {t(`${PW}.renameSectionDialog.rename`)}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={versionDialog} onClose={() => { setVersionDialog(false); setPreviewVersion(null); }} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography sx={{ fontWeight: 700 }}>{t(`${PW}.versionDialog.title`)}</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                {proposalSections.find(s => s.id === currentSection)?.title}
              </Typography>
            </Box>
            {sectionVersions.length > 0 && (
              <Chip label={t(`${PW}.versionDialog.versionsCount`, { count: sectionVersions.length })} size="small" sx={{ bgcolor: ACCENT + '22', color: ACCENT }} />
            )}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {versionsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : sectionVersions.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography sx={{ color: 'text.secondary' }}>{t(`${PW}.versionDialog.noHistory`)}</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>{t(`${PW}.versionDialog.autoSaveHint`)}</Typography>
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
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{t(`${PW}.versionDialog.version`, { number: v.version_number })}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{v.saved_by}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                      {v.saved_at ? new Date(v.saved_at).toLocaleString(LOCALE_MAP[locale] || 'en-US') : '—'}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>{t(`${PW}.words`, { count: v.word_count })}</Typography>
                  </Box>
                ))}
              </Box>
              {/* Preview pane */}
              <Box sx={{ flex: 1, p: 2, overflowY: 'auto' }}>
                {previewVersion ? (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography sx={{ fontWeight: 600 }}>{t(`${PW}.versionDialog.preview`, { number: previewVersion.version_number })}</Typography>
                      {isDraft && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<RestoreIcon />}
                          onClick={() => restoreVersion(previewVersion.id)}
                          sx={{ borderColor: ACCENT, color: ACCENT }}
                        >
                          {t(`${PW}.versionDialog.restore`)}
                        </Button>
                      )}
                    </Box>
                    <Box
                      sx={{ p: 2, border: `1px solid`, borderColor: 'divider', borderRadius: 2, fontSize: 14 }}
                      dangerouslySetInnerHTML={{ __html: previewVersion.content_html || `<em>${t(`${PW}.versionDialog.empty`)}</em>` }}
                    />
                  </>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>{t(`${PW}.versionDialog.selectPreview`)}</Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => { setVersionDialog(false); setPreviewVersion(null); }}>{t(`${PW}.versionDialog.close`)}</Button>
        </DialogActions>
      </Dialog>

      {/* Section Permissions Dialog */}
      <Dialog open={permissionsDialog} onClose={() => setPermissionsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box>
            <Typography sx={{ fontWeight: 700 }}>{t(`${PW}.permissionsDialog.title`)}</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{editingPermSection?.title}</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, fontSize: 12 }}>
            {t(`${PW}.permissionsDialog.info`)}
          </Alert>
          <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>{t(`${PW}.permissionsDialog.allowedEditors`)}</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[
              { value: 'principal_investigator', label: t(`${PW}.permissionsDialog.principalInvestigator`) },
              { value: 'grant_officer', label: t(`${PW}.permissionsDialog.grantOfficer`) },
              { value: 'co_investigator', label: t(`${PW}.permissionsDialog.coInvestigator`) },
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
              {t(`${PW}.permissionsDialog.noRestrictions`)}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setPermissionsDialog(false)}>{t(`${PW}.permissionsDialog.cancel`)}</Button>
          <Button onClick={savePermissions} variant="contained" sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}>
            {t(`${PW}.permissionsDialog.save`)}
          </Button>
        </DialogActions>
      </Dialog>

      <Menu
        anchorEl={downloadMenu}
        open={Boolean(downloadMenu)}
        onClose={() => setDownloadMenu(null)}
      >
        <MenuItem onClick={() => downloadProposal('pdf')} disabled={downloading}>
          <PdfIcon sx={{ fontSize: 18, mr: 1.5, color: '#ef4444' }} />
          {t(`${PW}.header.downloadPdf`)}
        </MenuItem>
        <MenuItem onClick={() => downloadProposal('docx')} disabled={downloading}>
          <WordIcon sx={{ fontSize: 18, mr: 1.5, color: '#2563eb' }} />
          {t(`${PW}.header.downloadWord`)}
        </MenuItem>
      </Menu>

      {/* Collaborator Menu */}
      <Menu
        anchorEl={collaboratorMenu}
        open={Boolean(collaboratorMenu)}
        onClose={() => setCollaboratorMenu(null)}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 1 }}>
            {t(`${PW}.teamMenu.title`)}
          </Typography>
        </Box>
        <MenuItem disabled>
          <Avatar sx={{ width: 24, height: 24, fontSize: 11, mr: 1.5, bgcolor: ACCENT }}>
            {proposal?.lead_pi?.name?.charAt(0) || 'L'}
          </Avatar>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
              {proposal?.lead_pi?.name || t('researcher.grantsProposals.roles.leadPi')}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{t('researcher.grantsProposals.roles.leadPi')}</Typography>
          </Box>
        </MenuItem>
        {proposal?.collaborators?.map((collab, idx) => (
          <MenuItem key={idx} disabled>
            <Avatar sx={{ width: 24, height: 24, fontSize: 11, mr: 1.5, bgcolor: '#8b5cf6' }}>
              {collab.user?.name?.charAt(0) || collab.invited_name?.charAt(0) || 'C'}
            </Avatar>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                {collab.user?.name || collab.invited_name || t('researcher.grantsProposals.roles.pending')}
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                {formatRole(collab.role || 'Co-Investigator', t)} • {formatCollabStatus(collab.status, t)}
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
        <DialogTitle>{t(`${PW}.editTitleDialog.title`)}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label={t(`${PW}.editTitleDialog.label`)}
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
            {t(`${PW}.editTitleDialog.cancel`)}
          </Button>
          <Button 
            onClick={updateProposalTitle}
            variant="contained"
            disabled={!editedTitle.trim()}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}
            startIcon={<EditIcon />}
          >
            {t(`${PW}.editTitleDialog.update`)}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
