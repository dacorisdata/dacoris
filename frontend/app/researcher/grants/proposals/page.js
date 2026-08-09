'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box, Typography, Chip, CircularProgress, Button, useTheme,
  LinearProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Autocomplete, IconButton,
  Stepper, Step, StepLabel, Table, TableBody, TableCell, TableRow, Avatar,
  TableHead, TableContainer, Paper, TablePagination, AvatarGroup, Tooltip,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Send as SubmitIcon, Search as SearchIcon,
  PersonAdd as InviteIcon, Delete as DeleteIcon, People as PeopleIcon,
  NotificationsActive as RemindIcon, AccountBalance as FundingIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import { useLanguage } from '../../../../contexts/LanguageContext';
import axios from 'axios';
import {
  TeamInvitePanel, TeamInviteDialog, PROPOSAL_TEAM_ROLES, buildTeamInvitePayload, getDisplayName,
  teamMembersMissingEmail,
} from '../../../../components/TeamInvitePanel';
import { collabAvatarSx } from '../../../../lib/pendingAvatar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#16a699';
const LOCALE_MAP = { en: 'en-US', fr: 'fr-FR', ar: 'ar', sw: 'sw-KE' };

const STATUS_STYLE = {
  draft:           { color: '#f59e0b', priority: 1 },
  returned:        { color: '#f97316', priority: 0 },
  submitted:       { color: ACCENT,    priority: 2 },
  internal_review: { color: '#3b82f6', priority: 3 },
  under_review:    { color: '#0ea5e9', priority: 4 },
  approved:        { color: '#10b981', priority: 5 },
  applying:        { color: '#06b6d4', priority: 6 },
  awarded:         { color: '#10b981', priority: 7 },
  funding_unsuccessful: { color: '#ef4444', priority: 8 },
  declined:        { color: '#ef4444', priority: 9 },
};

function normalizeStatusKey(status) {
  return (status || '').toLowerCase();
}

function getStatusGroups(t) {
  return [
    {
      key: 'action',
      label: t('researcher.grantsProposals.groups.action.label'),
      hint: t('researcher.grantsProposals.groups.action.hint'),
      color: '#f97316',
      match: (status) => normalizeStatusKey(status) === 'returned',
    },
    {
      key: 'draft',
      label: t('researcher.grantsProposals.groups.draft.label'),
      hint: t('researcher.grantsProposals.groups.draft.hint'),
      color: '#f59e0b',
      match: (status) => normalizeStatusKey(status) === 'draft',
    },
    {
      key: 'pipeline',
      label: t('researcher.grantsProposals.groups.pipeline.label'),
      hint: t('researcher.grantsProposals.groups.pipeline.hint'),
      color: '#0ea5e9',
      match: (status) => ['submitted', 'internal_review', 'under_review'].includes(normalizeStatusKey(status)),
    },
    {
      key: 'approved',
      label: t('researcher.grantsProposals.groups.approved.label'),
      hint: t('researcher.grantsProposals.groups.approved.hint'),
      color: '#10b981',
      match: (status) => normalizeStatusKey(status) === 'approved',
    },
    {
      key: 'funding',
      label: t('researcher.grantsProposals.groups.funding.label'),
      hint: t('researcher.grantsProposals.groups.funding.hint'),
      color: '#06b6d4',
      match: (status) => ['applying', 'awarded', 'funding_unsuccessful'].includes(normalizeStatusKey(status)),
    },
    {
      key: 'declined',
      label: t('researcher.grantsProposals.groups.declined.label'),
      hint: t('researcher.grantsProposals.groups.declined.hint'),
      color: '#ef4444',
      match: (status) => normalizeStatusKey(status) === 'declined',
    },
  ];
}

function getStatusMeta(status, t) {
  const key = normalizeStatusKey(status);
  const style = STATUS_STYLE[key] || { color: '#64748b', priority: 99 };
  const labelKey = `researcher.grantsProposals.status.${key}`;
  const label = t(labelKey);
  return {
    label: label !== labelKey ? label : (status || t('researcher.grantsProposals.status.unknown')),
    ...style,
  };
}

const statusColor = (status, t) => getStatusMeta(status, t).color;
const getStatusLabel = (status, t) => getStatusMeta(status, t).label;

const getStatusGroupKey = (status, groups) => {
  const group = groups.find((g) => g.match(status));
  return group?.key || 'pipeline';
};

const proposalSortDate = (proposal) => {
  const key = normalizeStatusKey(proposal.status);
  const date = key === 'draft'
    ? proposal.created_at
    : (proposal.submitted_at || proposal.created_at);
  return new Date(date || 0).getTime();
};

const sortProposalsForResearcher = (items, t) =>
  [...items].sort((a, b) => {
    const priorityDiff = getStatusMeta(a.status, t).priority - getStatusMeta(b.status, t).priority;
    if (priorityDiff !== 0) return priorityDiff;
    return proposalSortDate(b) - proposalSortDate(a);
  });

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

const INVITE_RESPONSE_DAYS = 7;

const getInviteDueInfo = (collab) => {
  if ((collab?.status || '').toLowerCase() !== 'pending') return null;
  let due = collab.invite_due_at ? new Date(collab.invite_due_at) : null;
  if (!due && collab.invited_at) {
    due = new Date(collab.invited_at);
    due.setDate(due.getDate() + INVITE_RESPONSE_DAYS);
  }
  if (!due || Number.isNaN(due.getTime())) return null;

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const daysLeft = Math.round((dueDay - startToday) / (24 * 60 * 60 * 1000));
  return {
    dueAt: due,
    daysLeft,
    isOverdue: daysLeft < 0,
    isDueToday: daysLeft === 0,
  };
};

const fmtDate = (d, locale, options = { year: 'numeric', month: 'short', day: 'numeric' }) =>
  d ? new Date(d).toLocaleDateString(LOCALE_MAP[locale] || 'en-US', options) : '—';

const proposalRowBg = (status, dark) => {
  const key = normalizeStatusKey(status);
  if (key === 'draft') return dark ? 'rgba(245, 158, 11, 0.09)' : 'rgba(245, 158, 11, 0.08)';
  if (key === 'awarded' || key === 'approved') return dark ? 'rgba(16, 185, 129, 0.10)' : 'rgba(16, 185, 129, 0.08)';
  if (key === 'applying') return dark ? 'rgba(6, 182, 212, 0.10)' : 'rgba(6, 182, 212, 0.08)';
  if (key === 'returned') return dark ? 'rgba(249, 115, 22, 0.10)' : 'rgba(249, 115, 22, 0.08)';
  if (key === 'declined' || key === 'funding_unsuccessful') return dark ? 'rgba(239, 68, 68, 0.10)' : 'rgba(239, 68, 68, 0.08)';
  if (['submitted', 'internal_review', 'under_review'].includes(key)) {
    return dark ? 'rgba(14, 165, 233, 0.08)' : 'rgba(14, 165, 233, 0.06)';
  }
  return 'transparent';
};

const proposalRowHoverBg = (status, dark) => {
  const key = normalizeStatusKey(status);
  if (key === 'draft') return dark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.12)';
  if (key === 'awarded') return dark ? 'rgba(16, 185, 129, 0.16)' : 'rgba(16, 185, 129, 0.12)';
  if (key === 'returned') return dark ? 'rgba(249, 115, 22, 0.16)' : 'rgba(249, 115, 22, 0.12)';
  if (key === 'declined') return dark ? 'rgba(239, 68, 68, 0.16)' : 'rgba(239, 68, 68, 0.12)';
  if (['submitted', 'internal_review', 'under_review'].includes(key)) {
    return dark ? 'rgba(14, 165, 233, 0.14)' : 'rgba(14, 165, 233, 0.10)';
  }
  return dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
};

function MyProposalsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fetchUser } = useAuth();
  const { t, locale } = useLanguage();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const statusGroups = getStatusGroups(t);
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createDialog, setCreateDialog] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  
  // Proposal data
  const [newTitle, setNewTitle] = useState('');
  const [selectedOpp, setSelectedOpp] = useState(null);
  
  // Team members for new proposal
  const [teamMembers, setTeamMembers] = useState([]);
  const [creating, setCreating] = useState(false);
  const [teamAction, setTeamAction] = useState(null); // { id, type: 'remove' | 'remind' }
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Modals
  const [opportunityModal, setOpportunityModal] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [teamModal, setTeamModal] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [proposalToDelete, setProposalToDelete] = useState(null);
  const [editTitleDialog, setEditTitleDialog] = useState(false);
  const [editingProposal, setEditingProposal] = useState(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [fundingDialog, setFundingDialog] = useState(null);
  const [fundingForm, setFundingForm] = useState({
    status: 'applying', total_amount: '', currency: 'KES', funder_name: '', notes: '',
  });
  const [fundingSaving, setFundingSaving] = useState(false);
  const [awardDocFile, setAwardDocFile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    fetchUser().then(u => { 
      if (!u) router.push('/login'); 
      else {
        setCurrentUserId(u.id);
        loadProposals(u.id);
      }
    });
  }, [searchParams]);

  const openCreateOrExisting = (userId, proposalsList) => {
    const newParam = searchParams.get('new');
    const oppParam = searchParams.get('opp');
    if (newParam !== 'true' || !oppParam) return;

    try {
      const oppData = JSON.parse(decodeURIComponent(oppParam));
      const existing = proposalsList.find(
        p => p.opportunity_id === oppData.id && p.lead_pi_id === userId
      );
      if (existing) {
        router.replace(`/researcher/grants/proposals/${existing.id}`);
        return;
      }
      setSelectedOpp(oppData);
      setNewTitle(t('researcher.grantsProposals.defaultTitle', { title: oppData.title }));
      setCreateDialog(true);
    } catch (e) {
      console.error('Failed to parse opportunity data:', e);
    }
  };

  const loadProposals = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/grants/proposals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = res.data || [];
      setProposals(list);
      if (userId) openCreateOrExisting(userId, list);
    } catch (e) {
      setError(t('researcher.grantsProposals.errorLoad'));
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const deleteProposal = async () => {
    if (!proposalToDelete) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/grants/proposals/${proposalToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess(t('researcher.grantsProposals.successDelete', { title: proposalToDelete.title }));
      setDeleteDialog(false);
      setProposalToDelete(null);
      await loadProposals();
    } catch (e) {
      setError(e.response?.data?.detail || t('researcher.grantsProposals.errorDelete'));
      console.error('Delete error:', e);
    }
  };

  const updateProposalTitle = async () => {
    if (!editingProposal || !editedTitle.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/grants/proposals/${editingProposal.id}/title?title=${encodeURIComponent(editedTitle.trim())}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess(t('researcher.grantsProposals.successUpdateTitle'));
      setEditTitleDialog(false);
      setEditingProposal(null);
      setEditedTitle('');
      await loadProposals();
    } catch (e) {
      setError(e.response?.data?.detail || t('researcher.grantsProposals.errorUpdateTitle'));
      console.error('Update title error:', e);
    }
  };

  const createProposal = async () => {
    if (creating) return;
    const missingEmail = teamMembersMissingEmail(teamMembers);
    if (missingEmail.length > 0) {
      setError(t('researcher.grantsProposals.createDialog.emailRequiredForTeam'));
      setActiveStep(1);
      return;
    }
    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/grants/proposals`,
        { 
          title: newTitle, 
          opportunity_id: selectedOpp?.id,
          collaborators: teamMembers.map(c => buildTeamInvitePayload(c)),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(t('researcher.grantsProposals.successCreate'));
      setCreateDialog(false);
      setNewTitle('');
      setSelectedOpp(null);
      setTeamMembers([]);
      setActiveStep(0);
      setTimeout(() => router.push(`/researcher/grants/proposals/${res.data.id}`), 1500);
    } catch (e) {
      setError(t('researcher.grantsProposals.errorCreate', {
        detail: e.response?.data?.detail || e.message,
      }));
    } finally {
      setCreating(false);
    }
  };

  const openFundingDialog = (proposal) => {
    setFundingDialog(proposal);
    setFundingForm({
      status: proposal.status === 'approved' ? 'applying' : proposal.status === 'applying' ? 'awarded' : 'applying',
      total_amount: proposal.award?.total_amount?.toString() || '',
      currency: proposal.award?.currency || proposal.opportunity?.currency || 'KES',
      funder_name: proposal.award?.funder_name || proposal.opportunity?.sponsor || '',
      notes: '',
    });
    setAwardDocFile(null);
  };

  const saveFundingStatus = async () => {
    if (!fundingDialog) return;
    setFundingSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        status: fundingForm.status,
        notes: fundingForm.notes || undefined,
        currency: fundingForm.currency,
        funder_name: fundingForm.funder_name || undefined,
      };
      if (fundingForm.status === 'awarded') {
        payload.total_amount = parseFloat(fundingForm.total_amount);
      }
      await axios.patch(
        `${API_URL}/grants/proposals/${fundingDialog.id}/funding-status`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (awardDocFile && ['awarded', 'applying'].includes(fundingForm.status)) {
        const fd = new FormData();
        fd.append('document_type', 'funding_award');
        fd.append('file', awardDocFile);
        await axios.post(`${API_URL}/grants/proposals/${fundingDialog.id}/documents`, fd, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        });
      }
      setSuccess(t('researcher.grantsProposals.funding.success'));
      setFundingDialog(null);
      await loadProposals();
    } catch (e) {
      setError(e.response?.data?.detail || t('researcher.grantsProposals.funding.error'));
    } finally {
      setFundingSaving(false);
    }
  };

  const canManageFunding = (p) => currentUserId && p.lead_pi_id === currentUserId
    && ['approved', 'applying'].includes(normalizeStatusKey(p.status));

  const refreshSelectedProposalTeam = async (proposalId) => {
    try {
      const token = localStorage.getItem('token');
      const [listRes, detailRes] = await Promise.all([
        axios.get(`${API_URL}/grants/proposals`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/grants/proposals/${proposalId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setProposals(listRes.data || []);
      setSelectedProposal(detailRes.data);
    } catch (e) {
      console.error(e);
      await loadProposals();
    }
  };

  const removeCollaborator = async (collab) => {
    if (!selectedProposal?.id || !collab?.id || teamAction) return;
    const name = collab.user?.name || collab.invited_name || collab.invited_email || 'this collaborator';
    if (!confirm(t('researcher.grantsProposals.collab.removeConfirm', { name }))) return;

    setTeamAction({ id: collab.id, type: 'remove' });
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_URL}/grants/proposals/${selectedProposal.id}/collaborators/${collab.id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setSuccess(t('researcher.grantsProposals.collab.removeSuccess', { name }));
      await refreshSelectedProposalTeam(selectedProposal.id);
    } catch (e) {
      setError(e.response?.data?.detail || t('researcher.grantsProposals.collab.removeError'));
    } finally {
      setTeamAction(null);
    }
  };

  const inviteCollaborators = async (invitees) => {
    if (!selectedProposal?.id) return;
    const token = localStorage.getItem('token');
    let sent = 0;
    const failures = [];
    for (const data of invitees) {
      try {
        await axios.post(
          `${API_URL}/grants/proposals/${selectedProposal.id}/collaborators`,
          buildTeamInvitePayload(data),
          { headers: { Authorization: `Bearer ${token}` } },
        );
        sent += 1;
      } catch (e) {
        const label = data.name || data.email || 'Unknown';
        failures.push(`${label}: ${e.response?.data?.detail || 'failed'}`);
      }
    }
    await refreshSelectedProposalTeam(selectedProposal.id);
    if (failures.length) {
      throw new Error(
        sent > 0
          ? `Sent ${sent} invitation(s). Some failed: ${failures.join('; ')}`
          : failures.join('; ')
      );
    }
    setSuccess(t('researcher.grantsProposals.collab.inviteSuccess', { count: sent }));
  };

  const remindCollaborator = async (collab) => {
    if (!selectedProposal?.id || !collab?.id || teamAction) return;
    if ((collab.status || '').toLowerCase() !== 'pending') return;

    setTeamAction({ id: collab.id, type: 'remind' });
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/grants/proposals/${selectedProposal.id}/collaborators/${collab.id}/remind`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const name = collab.user?.name || collab.invited_name || collab.invited_email || '';
      setSuccess(t('researcher.grantsProposals.collab.remindSuccess', { name }));
      await refreshSelectedProposalTeam(selectedProposal.id);
    } catch (e) {
      setError(e.response?.data?.detail || t('researcher.grantsProposals.collab.remindError'));
    } finally {
      setTeamAction(null);
    }
  };

  const teamEmailsComplete = teamMembers.length === 0 || teamMembersMissingEmail(teamMembers).length === 0;

  const handleNext = () => {
    if (activeStep === 1 && !teamEmailsComplete) {
      setError(t('researcher.grantsProposals.createDialog.emailRequiredForTeam'));
      return;
    }
    setError('');
    setActiveStep((prev) => prev + 1);
  };
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const lockedTeamInvitees = selectedProposal
    ? [
        ...(selectedProposal.lead_pi
          ? [{ user_id: selectedProposal.lead_pi_id, email: selectedProposal.lead_pi.email, name: selectedProposal.lead_pi.name }]
          : []),
        ...(selectedProposal.collaborators || []).map((c) => ({
          user_id: c.user_id,
          email: c.user?.email || c.invited_email,
          name: c.user?.name || c.invited_name,
        })),
      ]
    : [];

  const sortedProposals = sortProposalsForResearcher(proposals, t);
  const pageStart = page * rowsPerPage;
  const paginatedProposals = sortedProposals.slice(pageStart, pageStart + rowsPerPage);
  const previousPageLastGroup = pageStart > 0
    ? getStatusGroupKey(sortedProposals[pageStart - 1].status, statusGroups)
    : null;

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'text.primary' }}>{t('researcher.grantsProposals.title')}</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.3 }}>{t('researcher.grantsProposals.subtitle')}</Typography>
        </Box>
        <Button variant="contained" size="small" startIcon={<AddIcon />}
          onClick={() => setCreateDialog(true)}
          sx={{ bgcolor:ACCENT, textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#14958a' } }}>
          {t('researcher.grantsProposals.newProposal')}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {proposals.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography sx={{ color: 'text.secondary', mb: 2 }}>{t('researcher.grantsProposals.empty')}</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialog(true)}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}>
            {t('researcher.grantsProposals.createFirst')}
          </Button>
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
            {statusGroups.map((group) => {
              const count = proposals.filter((p) => group.match(p.status)).length;
              if (count === 0) return null;
              return (
                <Box
                  key={group.key}
                  sx={{
                    px: 1.75,
                    py: 1.25,
                    borderRadius: 2,
                    bgcolor: dark ? `${group.color}14` : `${group.color}10`,
                    border: `1px solid ${group.color}33`,
                    minWidth: 150,
                  }}
                >
                  <Typography sx={{ fontSize: 18, fontWeight: 800, color: group.color, lineHeight: 1 }}>
                    {count}
                  </Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.primary', mt: 0.5 }}>
                    {group.label}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>
                    {group.hint}
                  </Typography>
                </Box>
              );
            })}
          </Box>

        <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 2 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: 13 }}>{t('researcher.grantsProposals.table.title')}</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 13 }}>{t('researcher.grantsProposals.table.opportunity')}</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 13 }}>{t('researcher.grantsProposals.table.team')}</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 13 }}>{t('researcher.grantsProposals.table.progress')}</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 13 }}>{t('researcher.grantsProposals.table.status')}</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 13 }}>{t('researcher.grantsProposals.table.dateCreated')}</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 13 }}>{t('researcher.grantsProposals.table.submitted')}</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 13 }} align="right">{t('researcher.grantsProposals.table.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  const rows = [];
                  let lastGroup = previousPageLastGroup;

                  paginatedProposals.forEach((p) => {
                    const groupKey = getStatusGroupKey(p.status, statusGroups);
                    if (groupKey !== lastGroup) {
                      const group = statusGroups.find((g) => g.key === groupKey);
                      rows.push(
                        <TableRow key={`group-${groupKey}-${p.id}`}>
                          <TableCell
                            colSpan={8}
                            sx={{
                              py: 1.25,
                              bgcolor: dark ? `${group?.color || ACCENT}12` : `${group?.color || ACCENT}08`,
                              borderBottom: `1px solid ${group?.color || ACCENT}33`,
                            }}
                          >
                            <Typography sx={{ fontSize: 12, fontWeight: 800, color: group?.color || ACCENT, letterSpacing: 0.4 }}>
                              {group?.label?.toUpperCase()}
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>
                              {group?.hint}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                      lastGroup = groupKey;
                    }

                    rows.push(
                    <TableRow 
                      key={p.id}
                      hover
                      sx={{ 
                        bgcolor: proposalRowBg(p.status, dark),
                        '&:last-child td, &:last-child th': { border: 0 },
                        cursor: 'pointer',
                        '&:hover': { bgcolor: proposalRowHoverBg(p.status, dark) },
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography 
                            sx={{ 
                              fontSize: 14, 
                              fontWeight: 600, 
                              color: ACCENT,
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              '&:hover': { opacity: 0.8 }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/researcher/grants/proposals/${p.id}`);
                            }}
                          >
                            {p.title}
                          </Typography>
                          {(() => {
                            const isDraft = p.status === 'draft' || p.status?.toUpperCase() === 'DRAFT';
                            return isDraft && (
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingProposal(p);
                                  setEditedTitle(p.title);
                                  setEditTitleDialog(true);
                                }}
                                sx={{ 
                                  opacity: 0, 
                                  transition: 'opacity 0.2s',
                                  '.MuiTableRow-root:hover &': { opacity: 1 }
                                }}
                              >
                                <EditIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            );
                          })()}
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Box 
                          onClick={() => {
                            setSelectedOpportunity(p.opportunity);
                            setOpportunityModal(true);
                          }}
                          sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
                        >
                          <Typography sx={{ fontSize: 13, fontWeight: 600, color: ACCENT, textDecoration: 'underline' }}>
                            {p.opportunity?.title || t('researcher.grantsProposals.opportunityFallback', { id: p.opportunity_id })}
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                            {p.opportunity?.sponsor || '—'}
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Box 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 0.5,
                            cursor: 'pointer',
                            '&:hover .MuiAvatar-root': { transform: 'scale(1.1)' }
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProposal(p);
                            setTeamModal(true);
                          }}
                        >
                          {/* Lead PI */}
                          <Tooltip title={`${p.lead_pi?.name || t('researcher.grantsProposals.roles.leadPi')} - ${t('researcher.grantsProposals.roles.leadPi')}`} arrow>
                            <Avatar 
                              sx={{ 
                                bgcolor: ACCENT, 
                                width: 32, 
                                height: 32, 
                                fontSize: 13,
                                border: `2px solid ${theme.palette.background.paper}`,
                                transition: 'transform 0.2s'
                              }}
                            >
                              {p.lead_pi?.name?.charAt(0) || 'L'}
                            </Avatar>
                          </Tooltip>
                          
                          {/* All Collaborators */}
                          {p.collaborators?.map((collab, idx) => (
                            <Tooltip 
                              key={idx}
                              title={`${collab.user?.name || collab.invited_name || t('researcher.grantsProposals.roles.pending')} - ${formatRole(collab.role || 'Co-Investigator', t)} (${formatCollabStatus(collab.status, t)})`}
                              arrow
                            >
                              <Avatar 
                                sx={collabAvatarSx(collab.status, { 
                                  bgcolor: '#8b5cf6', 
                                  width: 32, 
                                  height: 32, 
                                  fontSize: 13,
                                  border: `2px solid ${theme.palette.background.paper}`,
                                  transition: 'transform 0.2s',
                                })}
                              >
                                {collab.user?.name?.charAt(0) || collab.invited_name?.charAt(0) || 'C'}
                              </Avatar>
                            </Tooltip>
                          ))}
                        </Box>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>
                          {(1 + (p.collaborators?.length || 0)) === 1
                            ? t('researcher.grantsProposals.memberCount', { count: 1 + (p.collaborators?.length || 0) })
                            : t('researcher.grantsProposals.memberCountPlural', { count: 1 + (p.collaborators?.length || 0) })}
                        </Typography>
                      </TableCell>

                      {/* Progress */}
                      <TableCell sx={{ minWidth: 130 }}>
                        {(() => {
                          const total = p.sections?.length || 0;
                          const filled = p.sections?.filter(s => (s.word_count || 0) > 50).length || 0;
                          const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
                          const color = pct >= 80 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
                          return (
                            <Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                                  {t('researcher.grantsProposals.sectionsCount', { filled, total })}
                                </Typography>
                                <Typography sx={{ fontSize: 12, fontWeight: 700, color }}>
                                  {pct}%
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={pct}
                                sx={{
                                  height: 5,
                                  borderRadius: 3,
                                  bgcolor: color + '22',
                                  '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 }
                                }}
                              />
                            </Box>
                          );
                        })()}
                      </TableCell>
                      
                      <TableCell>
                        <Chip 
                          label={getStatusLabel(p.status, t)} 
                          size="small" 
                          sx={{ 
                            fontSize: 11, 
                            fontWeight: 700, 
                            bgcolor: statusColor(p.status, t) + '22', 
                            color: statusColor(p.status, t),
                            borderRadius: 1.5
                          }} 
                        />
                        {['submitted', 'internal_review', 'under_review'].includes(normalizeStatusKey(p.status)) && p.review_stage_name && (
                          <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.5, maxWidth: 140, lineHeight: 1.3 }}>
                            {p.review_stage_name}
                          </Typography>
                        )}
                        {normalizeStatusKey(p.status) === 'declined' && p.stage_notes && (
                          <Typography sx={{ fontSize: 10.5, color: '#ef4444', mt: 0.5, maxWidth: 160, lineHeight: 1.3 }}>
                            {p.stage_notes}
                          </Typography>
                        )}
                        {normalizeStatusKey(p.status) === 'awarded' && p.award && (
                          <Typography sx={{ fontSize: 10.5, color: '#10b981', mt: 0.5, fontWeight: 600 }}>
                            {p.award.currency} {Number(p.award.total_amount).toLocaleString()}
                          </Typography>
                        )}
                        {canManageFunding(p) && (
                          <Button size="small" startIcon={<FundingIcon sx={{ fontSize: 14 }} />}
                            onClick={(e) => { e.stopPropagation(); openFundingDialog(p); }}
                            sx={{ mt: 0.5, textTransform: 'none', fontSize: 10.5, fontWeight: 700, color: ACCENT, p: 0, minWidth: 0 }}>
                            {t('researcher.grantsProposals.funding.update')}
                          </Button>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Typography sx={{ fontSize: 13, color: 'text.primary' }}>
                          {fmtDate(p.created_at, locale)}
                        </Typography>
                      </TableCell>

                      {/* Submission date — own column */}
                      <TableCell>
                        {p.submitted_at ? (
                          <>
                            <Typography sx={{ fontSize: 13, color: 'text.primary', fontWeight: 500 }}>
                              {fmtDate(p.submitted_at, locale)}
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                              {p.submitted_at ? new Date(p.submitted_at).toLocaleTimeString(LOCALE_MAP[locale] || 'en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </Typography>
                          </>
                        ) : (
                          <Typography sx={{ fontSize: 12, color: 'text.disabled', fontStyle: 'italic' }}>{t('researcher.grantsProposals.notSubmitted')}</Typography>
                        )}
                      </TableCell>
                      
                      <TableCell align="right">
                        {(() => {
                          const isDraft = p.status === 'draft' || p.status?.toUpperCase() === 'DRAFT';
                          const lockedTip = t('researcher.grantsProposals.lockedTip');
                          return (
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                              <Tooltip title={isDraft ? t('researcher.grantsProposals.tooltips.editProposal') : lockedTip} arrow>
                                <span>
                                  <IconButton 
                                    size="small"
                                    disabled={!isDraft}
                                    onClick={() => router.push(`/researcher/grants/proposals/${p.id}`)}
                                    sx={{ color: isDraft ? ACCENT : 'text.disabled' }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title={isDraft ? t('researcher.grantsProposals.tooltips.manageTeam') : lockedTip} arrow>
                                <span>
                                  <IconButton 
                                    size="small"
                                    disabled={!isDraft}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedProposal(p);
                                      setTeamModal(true);
                                    }}
                                    sx={{ color: isDraft ? '#8b5cf6' : 'text.disabled' }}
                                  >
                                    <PeopleIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title={isDraft ? t('researcher.grantsProposals.tooltips.deleteProposal') : lockedTip} arrow>
                                <span>
                                  <IconButton 
                                    size="small"
                                    disabled={!isDraft}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setProposalToDelete(p);
                                      setDeleteDialog(true);
                                    }}
                                    sx={{ color: isDraft ? '#ef4444' : 'text.disabled' }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Box>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                    );
                  });

                  return rows;
                })()}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={sortedProposals.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </Paper>
        </>
      )}

      {/* Enhanced Create Proposal Dialog */}
      <Dialog 
        open={createDialog} 
        onClose={() => {
          if (creating) return;
          setCreateDialog(false);
          setActiveStep(0);
          setTeamMembers([]);
        }} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography sx={{ fontSize: 20, fontWeight: 700 }}>{t('researcher.grantsProposals.createDialog.title')}</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
            {selectedOpp ? t('researcher.grantsProposals.createDialog.applyingFor', { title: selectedOpp.title }) : t('researcher.grantsProposals.createDialog.startApplication')}
          </Typography>
        </DialogTitle>

        <Stepper activeStep={activeStep} sx={{ px: 3, pt: 2 }}>
          <Step><StepLabel>{t('researcher.grantsProposals.createDialog.steps.details')}</StepLabel></Step>
          <Step><StepLabel>{t('researcher.grantsProposals.createDialog.steps.team')}</StepLabel></Step>
          <Step><StepLabel>{t('researcher.grantsProposals.createDialog.steps.review')}</StepLabel></Step>
        </Stepper>

        <DialogContent sx={{ mt: 2 }}>
          {/* Step 1: Proposal Details */}
          {activeStep === 0 && (
            <Box>
              <TextField
                fullWidth
                label={t('researcher.grantsProposals.createDialog.proposalTitle')}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                sx={{ mb: 2 }}
                helperText={t('researcher.grantsProposals.createDialog.titleHelper')}
              />
              {selectedOpp && (
                <Box sx={{ p: 2, bgcolor: `${ACCENT}08`, borderRadius: 2, border: `1px solid ${ACCENT}40` }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: ACCENT, mb: 1 }}>{t('researcher.grantsProposals.createDialog.opportunity')}</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 0.5 }}>{selectedOpp.title}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {t('researcher.grantsProposals.createDialog.sponsor', { sponsor: selectedOpp.sponsor })}
                  </Typography>
                  {selectedOpp.deadline && (
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {t('researcher.grantsProposals.createDialog.deadline', { date: fmtDate(selectedOpp.deadline, locale) })}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          )}

          {/* Step 2: Team */}
          {activeStep === 1 && (
            <TeamInvitePanel
              invitees={teamMembers}
              onChange={setTeamMembers}
              roles={PROPOSAL_TEAM_ROLES}
              defaultRole="Co-Investigator"
              accent={ACCENT}
              listLabel={t('researcher.teamInvite.listLabel')}
              opportunityId={selectedOpp?.id}
              proposalTitle={newTitle}
              description={t('researcher.teamInvite.description')}
              roleLabel={t('researcher.teamInvite.roleLabel')}
              formatRole={(r) => formatRole(r, t)}
              suggestionsLabel={t('researcher.teamInvite.suggestionsLabel')}
              suggestionsHint={t('researcher.teamInvite.suggestionsHint')}
              inviteFromProfileLabel={t('researcher.teamInvite.inviteToTeam')}
            />
          )}

          {/* Step 3: Review */}
          {activeStep === 2 && (
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 2 }}>{t('researcher.grantsProposals.createDialog.reviewTitle')}</Typography>
              
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2, mb: 2 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 1 }}>{t('researcher.grantsProposals.createDialog.proposalTitleLabel')}</Typography>
                <Typography sx={{ fontSize: 14 }}>{newTitle}</Typography>
              </Box>

              {selectedOpp && (
                <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2, mb: 2 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 1 }}>{t('researcher.grantsProposals.createDialog.opportunity')}</Typography>
                  <Typography sx={{ fontSize: 14 }}>{selectedOpp.title}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>{selectedOpp.sponsor}</Typography>
                </Box>
              )}

              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 1 }}>
                  {t('researcher.grantsProposals.createDialog.teamLabel', { count: teamMembers.length })}
                </Typography>
                {teamMembers.length === 0 ? (
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', fontStyle: 'italic' }}>
                    {t('researcher.grantsProposals.createDialog.noTeamMembers')}
                  </Typography>
                ) : (
                  teamMembers.map((c, idx) => (
                    <Box key={idx} sx={{
                      py: 1.5,
                      borderBottom: idx < teamMembers.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{getDisplayName(c)}</Typography>
                        <Chip label={formatRole(c.role, t)} size="small" sx={{ fontSize: 10, height: 20 }} />
                      </Box>
                      {c.email && (
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{t('researcher.grantsProposals.createDialog.email', { email: c.email })}</Typography>
                      )}
                      {c.affiliation && (
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{t('researcher.grantsProposals.createDialog.affiliation', { affiliation: c.affiliation })}</Typography>
                      )}
                    </Box>
                  ))
                )}
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                {t('researcher.grantsProposals.createDialog.teamNotify')}
              </Alert>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            disabled={creating}
            onClick={() => {
              setCreateDialog(false);
              setActiveStep(0);
              setTeamMembers([]);
            }}
          >
            {t('researcher.grantsProposals.common.cancel')}
          </Button>
          {activeStep > 0 && (
            <Button onClick={handleBack} disabled={creating}>
              {t('researcher.grantsProposals.common.back')}
            </Button>
          )}
          {activeStep < 2 ? (
            <Button 
              onClick={handleNext} 
              variant="contained"
              disabled={
                (activeStep === 0 && !newTitle.trim())
                || (activeStep === 1 && !teamEmailsComplete)
              }
              sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}
            >
              {t('researcher.grantsProposals.common.next')}
            </Button>
          ) : (
            <Button 
              onClick={createProposal} 
              variant="contained"
              disabled={creating || !newTitle.trim() || !teamEmailsComplete}
              startIcon={creating ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' }, minWidth: 160 }}
            >
              {creating
                ? t('researcher.grantsProposals.createDialog.creating')
                : t('researcher.grantsProposals.createDialog.createProposal')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Opportunity Details Modal */}
      <Dialog 
        open={opportunityModal} 
        onClose={() => setOpportunityModal(false)}
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography sx={{ fontSize: 20, fontWeight: 700 }}>{t('researcher.grantsProposals.opportunityModal.title')}</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedOpportunity ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>{t('researcher.grantsProposals.opportunityModal.fields.title')}</Typography>
                <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{selectedOpportunity.title}</Typography>
              </Box>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>{t('researcher.grantsProposals.opportunityModal.fields.sponsor')}</Typography>
                  <Typography sx={{ fontSize: 14 }}>{selectedOpportunity.sponsor || '—'}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>{t('researcher.grantsProposals.opportunityModal.fields.sponsorType')}</Typography>
                  <Typography sx={{ fontSize: 14 }}>{selectedOpportunity.sponsor_type || '—'}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>{t('researcher.grantsProposals.opportunityModal.fields.category')}</Typography>
                  <Typography sx={{ fontSize: 14 }}>{selectedOpportunity.category || '—'}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>{t('researcher.grantsProposals.opportunityModal.fields.geography')}</Typography>
                  <Typography sx={{ fontSize: 14 }}>{selectedOpportunity.geography || '—'}</Typography>
                </Box>
              </Box>

              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>{t('researcher.grantsProposals.opportunityModal.fields.eligibleApplicants')}</Typography>
                <Typography sx={{ fontSize: 14 }}>{selectedOpportunity.eligible_applicants || '—'}</Typography>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>{t('researcher.grantsProposals.opportunityModal.fields.fundingType')}</Typography>
                  <Typography sx={{ fontSize: 14 }}>{selectedOpportunity.funding_type || '—'}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>{t('researcher.grantsProposals.opportunityModal.fields.currency')}</Typography>
                  <Typography sx={{ fontSize: 14 }}>{selectedOpportunity.currency || '—'}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>{t('researcher.grantsProposals.opportunityModal.fields.status')}</Typography>
                  <Chip label={getStatusLabel(selectedOpportunity.status, t)} size="small" 
                    sx={{ fontSize: 11, fontWeight: 600, bgcolor: ACCENT + '22', color: ACCENT }} />
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>{t('researcher.grantsProposals.opportunityModal.fields.minAward')}</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                    {selectedOpportunity.currency} {selectedOpportunity.amount_min?.toLocaleString() || '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>{t('researcher.grantsProposals.opportunityModal.fields.maxAward')}</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                    {selectedOpportunity.currency} {selectedOpportunity.amount_max?.toLocaleString() || '—'}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>{t('researcher.grantsProposals.opportunityModal.fields.openDate')}</Typography>
                  <Typography sx={{ fontSize: 14 }}>
                    {selectedOpportunity.open_date ? fmtDate(selectedOpportunity.open_date, locale, { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>{t('researcher.grantsProposals.opportunityModal.fields.deadline')}</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#ef4444' }}>
                    {selectedOpportunity.deadline ? fmtDate(selectedOpportunity.deadline, locale, { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
                  </Typography>
                </Box>
              </Box>

              {selectedOpportunity.round_cycle && (
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>{t('researcher.grantsProposals.opportunityModal.fields.roundCycle')}</Typography>
                  <Typography sx={{ fontSize: 14 }}>{selectedOpportunity.round_cycle}</Typography>
                </Box>
              )}

              {selectedOpportunity.contact_email && (
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>{t('researcher.grantsProposals.opportunityModal.fields.contactEmail')}</Typography>
                  <Typography sx={{ fontSize: 14, color: ACCENT }}>{selectedOpportunity.contact_email}</Typography>
                </Box>
              )}

              {selectedOpportunity.url && (
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>{t('researcher.grantsProposals.opportunityModal.fields.url')}</Typography>
                  <Typography 
                    component="a" 
                    href={selectedOpportunity.url} 
                    target="_blank"
                    sx={{ fontSize: 14, color: ACCENT, textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    {selectedOpportunity.url}
                  </Typography>
                </Box>
              )}

              {selectedOpportunity.notes && (
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>{t('researcher.grantsProposals.opportunityModal.fields.notes')}</Typography>
                  <Typography sx={{ fontSize: 14, fontStyle: 'italic', color: 'text.secondary' }}>{selectedOpportunity.notes}</Typography>
                </Box>
              )}
            </Box>
          ) : (
            <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>{t('researcher.grantsProposals.opportunityModal.noDetails')}</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpportunityModal(false)}>{t('researcher.grantsProposals.common.close')}</Button>
        </DialogActions>
      </Dialog>

      {/* Team Management Modal */}
      <Dialog 
        open={teamModal} 
        onClose={() => setTeamModal(false)}
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography sx={{ fontSize: 20, fontWeight: 700 }}>{t('researcher.grantsProposals.teamModal.title')}</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
            {selectedProposal?.title}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedProposal ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Lead PI */}
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 1.5 }}>{t('researcher.grantsProposals.teamModal.leadPi')}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                  <Avatar sx={{ bgcolor: ACCENT, width: 40, height: 40 }}>
                    {selectedProposal.lead_pi?.name?.charAt(0) || 'L'}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{selectedProposal.lead_pi?.name || t('researcher.grantsProposals.roles.leadPi')}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{selectedProposal.lead_pi?.email || '—'}</Typography>
                  </Box>
                  <Chip label={t('researcher.grantsProposals.roles.leadPi')} size="small" sx={{ bgcolor: ACCENT + '22', color: ACCENT, fontWeight: 600 }} />
                </Box>
              </Box>

              {/* Collaborators */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>{t('researcher.grantsProposals.teamModal.collaborators', { count: selectedProposal.collaborators?.length || 0 })}</Typography>
                  <Button 
                    size="small" 
                    startIcon={<InviteIcon />}
                    onClick={() => setInviteDialogOpen(true)}
                    sx={{ textTransform: 'none', fontSize: 12, fontWeight: 600, color: ACCENT }}
                  >
                    {t('researcher.grantsProposals.teamModal.inviteMember')}
                  </Button>
                </Box>
                
                {selectedProposal.collaborators && selectedProposal.collaborators.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {(() => {
                      const pending = selectedProposal.collaborators.filter(c => (c.status || '').toLowerCase() === 'pending');
                      const overdueCount = pending.filter(c => getInviteDueInfo(c)?.isOverdue).length;
                      if (!pending.length) return null;
                      return (
                        <Alert
                          severity={overdueCount ? 'warning' : 'info'}
                          sx={{ borderRadius: 2, py: 0.5, '& .MuiAlert-message': { fontSize: 12.5 } }}
                        >
                          {overdueCount
                            ? t('researcher.grantsProposals.collab.overdueSummary', {
                              overdue: overdueCount,
                              pending: pending.length,
                            })
                            : t('researcher.grantsProposals.collab.pendingSummary', {
                              pending: pending.length,
                              days: INVITE_RESPONSE_DAYS,
                            })}
                        </Alert>
                      );
                    })()}
                    {selectedProposal.collaborators.map((collab, idx) => {
                      const dueInfo = getInviteDueInfo(collab);
                      return (
                      <Box 
                        key={collab.id || idx}
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 2, 
                          p: 2, 
                          border: `1px solid ${dueInfo?.isOverdue ? '#f59e0b66' : theme.palette.divider}`, 
                          borderRadius: 2,
                          bgcolor: dueInfo?.isOverdue
                            ? (dark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.06)')
                            : 'transparent',
                          '&:hover': { bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }
                        }}
                      >
                        <Avatar sx={collabAvatarSx(collab.status, { bgcolor: '#8b5cf6', width: 40, height: 40 })}>
                          {collab.user?.name?.charAt(0) || collab.invited_name?.charAt(0) || 'C'}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                            {collab.user?.name || collab.invited_name || t('researcher.grantsProposals.roles.pending')}
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                            {collab.user?.email || collab.invited_email || '—'}
                          </Typography>
                          {dueInfo && (
                            <Typography sx={{
                              fontSize: 11,
                              mt: 0.4,
                              fontWeight: 600,
                              color: dueInfo.isOverdue ? '#d97706' : dueInfo.isDueToday ? '#ea580c' : 'text.secondary',
                            }}>
                              {dueInfo.isOverdue
                                ? t('researcher.grantsProposals.collab.overdueBy', {
                                  days: Math.abs(dueInfo.daysLeft),
                                  date: fmtDate(dueInfo.dueAt, locale),
                                })
                                : dueInfo.isDueToday
                                  ? t('researcher.grantsProposals.collab.dueToday', { date: fmtDate(dueInfo.dueAt, locale) })
                                  : t('researcher.grantsProposals.collab.dueIn', {
                                    days: dueInfo.daysLeft,
                                    date: fmtDate(dueInfo.dueAt, locale),
                                  })}
                            </Typography>
                          )}
                        </Box>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                          <Select
                            value={collab.role || 'Co-Investigator'}
                            onChange={(e) => {
                              // TODO: Update collaborator role
                              console.log('Update role to:', e.target.value);
                            }}
                            sx={{ fontSize: 13 }}
                          >
                            <MenuItem value="Co-Investigator">{t('researcher.grantsProposals.roles.coInvestigator')}</MenuItem>
                            <MenuItem value="Consultant">{t('researcher.grantsProposals.roles.consultant')}</MenuItem>
                            <MenuItem value="Advisor">{t('researcher.grantsProposals.roles.advisor')}</MenuItem>
                            <MenuItem value="Collaborator">{t('researcher.grantsProposals.roles.collaborator')}</MenuItem>
                          </Select>
                        </FormControl>
                        <Chip 
                          label={dueInfo?.isOverdue
                            ? t('researcher.grantsProposals.collab.statusOverdue')
                            : formatCollabStatus(collab.status, t)} 
                          size="small" 
                          sx={{ 
                            fontSize: 11, 
                            fontWeight: 600,
                            bgcolor: collab.status === 'accepted'
                              ? '#10b98122'
                              : dueInfo?.isOverdue
                                ? '#ef444422'
                                : '#f59e0b22',
                            color: collab.status === 'accepted'
                              ? '#10b981'
                              : dueInfo?.isOverdue
                                ? '#ef4444'
                                : '#f59e0b'
                          }} 
                        />
                        {(collab.status || '').toLowerCase() === 'pending' && (
                          <Tooltip title={t('researcher.grantsProposals.collab.remindTooltip')} arrow>
                            <span>
                              <IconButton
                                size="small"
                                disabled={!!teamAction}
                                onClick={() => remindCollaborator(collab)}
                                sx={{ color: ACCENT }}
                              >
                                {teamAction?.id === collab.id && teamAction?.type === 'remind'
                                  ? <CircularProgress size={16} color="inherit" />
                                  : <RemindIcon fontSize="small" />}
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                        <Tooltip title={t('researcher.grantsProposals.collab.removeTooltip')} arrow>
                          <span>
                            <IconButton
                              size="small"
                              disabled={!!teamAction}
                              onClick={() => removeCollaborator(collab)}
                              sx={{ color: '#ef4444' }}
                            >
                              {teamAction?.id === collab.id && teamAction?.type === 'remove'
                                ? <CircularProgress size={16} color="inherit" />
                                : <DeleteIcon fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    );})}
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4, bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                    <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>{t('researcher.grantsProposals.teamModal.noCollaborators')}</Typography>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      startIcon={<InviteIcon />}
                      onClick={() => setInviteDialogOpen(true)}
                      sx={{ textTransform: 'none', borderColor: ACCENT, color: ACCENT }}
                    >
                      {t('researcher.grantsProposals.teamModal.inviteFirst')}
                    </Button>
                  </Box>
                )}
              </Box>
            </Box>
          ) : (
            <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>{t('researcher.grantsProposals.teamModal.noProposal')}</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setTeamModal(false)}>{t('researcher.grantsProposals.common.close')}</Button>
        </DialogActions>
      </Dialog>

      <TeamInviteDialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        onSave={inviteCollaborators}
        title={t('researcher.teamInvite.inviteMembersTitle')}
        roles={PROPOSAL_TEAM_ROLES}
        defaultRole="Co-Investigator"
        accent={ACCENT}
        opportunityId={selectedProposal?.opportunity_id}
        proposalTitle={selectedProposal?.title}
        lockedInvitees={lockedTeamInvitees}
        listLabel={t('researcher.teamInvite.listLabel')}
        description={t('researcher.teamInvite.description')}
        roleLabel={t('researcher.teamInvite.roleLabel')}
        formatRole={(r) => formatRole(r, t)}
        suggestionsLabel={t('researcher.teamInvite.suggestionsLabel')}
        suggestionsHint={t('researcher.teamInvite.suggestionsHint')}
        inviteFromProfileLabel={t('researcher.teamInvite.inviteToTeam')}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialog} 
        onClose={() => setDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('researcher.grantsProposals.deleteDialog.title')}</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t('researcher.grantsProposals.deleteDialog.warning')}
          </Alert>
          <Typography sx={{ fontSize: 14, mb: 1 }}>
            {t('researcher.grantsProposals.deleteDialog.confirm')}
          </Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary' }}>
            "{proposalToDelete?.title}"
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => { setDeleteDialog(false); setProposalToDelete(null); }}>
            {t('researcher.grantsProposals.common.cancel')}
          </Button>
          <Button 
            onClick={deleteProposal}
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
          >
            {t('researcher.grantsProposals.deleteDialog.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Funding status dialog (PI only) */}
      <Dialog open={!!fundingDialog} onClose={() => setFundingDialog(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>{t('researcher.grantsProposals.funding.title')}</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
            {fundingDialog?.title}
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>{t('researcher.grantsProposals.funding.statusLabel')}</InputLabel>
            <Select
              value={fundingForm.status}
              label={t('researcher.grantsProposals.funding.statusLabel')}
              onChange={(e) => setFundingForm((f) => ({ ...f, status: e.target.value }))}
            >
              {fundingDialog?.status === 'approved' && (
                <MenuItem value="applying">{t('researcher.grantsProposals.status.applying')}</MenuItem>
              )}
              {fundingDialog?.status === 'applying' && [
                <MenuItem key="awarded" value="awarded">{t('researcher.grantsProposals.status.awarded')}</MenuItem>,
                <MenuItem key="funding_unsuccessful" value="funding_unsuccessful">{t('researcher.grantsProposals.status.funding_unsuccessful')}</MenuItem>,
              ]}
            </Select>
          </FormControl>
          {fundingForm.status === 'awarded' && (
            <>
              <TextField fullWidth size="small" label={t('researcher.grantsProposals.funding.amount')} type="number"
                value={fundingForm.total_amount} sx={{ mb: 2 }}
                onChange={(e) => setFundingForm((f) => ({ ...f, total_amount: e.target.value }))} />
              <TextField fullWidth size="small" label={t('researcher.grantsProposals.funding.currency')}
                value={fundingForm.currency} sx={{ mb: 2 }}
                onChange={(e) => setFundingForm((f) => ({ ...f, currency: e.target.value }))} />
              <TextField fullWidth size="small" label={t('researcher.grantsProposals.funding.funder')}
                value={fundingForm.funder_name} sx={{ mb: 2 }}
                onChange={(e) => setFundingForm((f) => ({ ...f, funder_name: e.target.value }))} />
            </>
          )}
          <TextField fullWidth size="small" multiline rows={2} label={t('researcher.grantsProposals.funding.notes')}
            value={fundingForm.notes} sx={{ mb: 2 }}
            onChange={(e) => setFundingForm((f) => ({ ...f, notes: e.target.value }))} />
          <Button variant="outlined" component="label" startIcon={<UploadIcon />} sx={{ textTransform: 'none' }}>
            {awardDocFile ? awardDocFile.name : t('researcher.grantsProposals.funding.uploadDoc')}
            <input type="file" hidden onChange={(e) => setAwardDocFile(e.target.files?.[0] || null)} />
          </Button>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFundingDialog(null)}>{t('researcher.grantsProposals.common.cancel')}</Button>
          <Button variant="contained" onClick={saveFundingStatus} disabled={fundingSaving}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}>
            {fundingSaving ? t('researcher.grantsProposals.funding.saving') : t('researcher.grantsProposals.funding.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Title Dialog */}
      <Dialog 
        open={editTitleDialog} 
        onClose={() => {
          setEditTitleDialog(false);
          setEditingProposal(null);
          setEditedTitle('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('researcher.grantsProposals.editTitleDialog.title')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label={t('researcher.grantsProposals.editTitleDialog.proposalTitle')}
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
            setEditingProposal(null);
            setEditedTitle('');
          }}>
            {t('researcher.grantsProposals.common.cancel')}
          </Button>
          <Button 
            onClick={updateProposalTitle}
            variant="contained"
            disabled={!editedTitle.trim()}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}
            startIcon={<EditIcon />}
          >
            {t('researcher.grantsProposals.editTitleDialog.update')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function MyProposalsPage() {
  return (
    <Suspense fallback={
      <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}>
        <CircularProgress />
      </Box>
    }>
      <MyProposalsContent />
    </Suspense>
  );
}
