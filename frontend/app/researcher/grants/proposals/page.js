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
import { Add as AddIcon, Edit as EditIcon, Send as SubmitIcon, Search as SearchIcon, PersonAdd as InviteIcon, Delete as DeleteIcon, People as PeopleIcon } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import axios from 'axios';
import {
  TeamInvitePanel, PROPOSAL_TEAM_ROLES, buildTeamInvitePayload, getDisplayName,
} from '../../../../components/TeamInvitePanel';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#16a699';

const PROPOSAL_STATUS_META = {
  draft:           { label: 'Draft',               color: '#f59e0b', priority: 1 },
  returned:        { label: 'Revision Requested',  color: '#f97316', priority: 0 },
  submitted:       { label: 'Submitted',           color: ACCENT,    priority: 2 },
  internal_review: { label: 'In Review',           color: '#3b82f6', priority: 3 },
  under_review:    { label: 'In Review',           color: '#0ea5e9', priority: 4 },
  awarded:         { label: 'Awarded',             color: '#10b981', priority: 5 },
  declined:        { label: 'Not Awarded',         color: '#ef4444', priority: 6 },
};

const STATUS_GROUPS = [
  {
    key: 'action',
    label: 'Needs Your Attention',
    hint: 'Revision requested — edit and resubmit',
    color: '#f97316',
    match: (status) => normalizeStatusKey(status) === 'returned',
  },
  {
    key: 'draft',
    label: 'Drafts',
    hint: 'Still in progress',
    color: '#f59e0b',
    match: (status) => normalizeStatusKey(status) === 'draft',
  },
  {
    key: 'pipeline',
    label: 'Submitted & Under Review',
    hint: 'Waiting on review',
    color: '#0ea5e9',
    match: (status) => ['submitted', 'internal_review', 'under_review'].includes(normalizeStatusKey(status)),
  },
  {
    key: 'awarded',
    label: 'Awarded',
    hint: 'Successful applications',
    color: '#10b981',
    match: (status) => normalizeStatusKey(status) === 'awarded',
  },
];

function normalizeStatusKey(status) {
  return (status || '').toLowerCase();
}

function getStatusMeta(status) {
  return PROPOSAL_STATUS_META[normalizeStatusKey(status)] || {
    label: status || 'Unknown',
    color: '#64748b',
    priority: 99,
  };
}

const statusColor = (status) => getStatusMeta(status).color;
const getStatusLabel = (status) => getStatusMeta(status).label;

const getStatusGroupKey = (status) => {
  const group = STATUS_GROUPS.find((g) => g.match(status));
  return group?.key || 'pipeline';
};

const proposalSortDate = (proposal) => {
  const key = normalizeStatusKey(proposal.status);
  const date = key === 'draft'
    ? proposal.created_at
    : (proposal.submitted_at || proposal.created_at);
  return new Date(date || 0).getTime();
};

const sortProposalsForResearcher = (items) =>
  [...items].sort((a, b) => {
    const priorityDiff = getStatusMeta(a.status).priority - getStatusMeta(b.status).priority;
    if (priorityDiff !== 0) return priorityDiff;
    return proposalSortDate(b) - proposalSortDate(a);
  });

const proposalRowBg = (status, dark) => {
  const key = normalizeStatusKey(status);
  if (key === 'draft') return dark ? 'rgba(245, 158, 11, 0.09)' : 'rgba(245, 158, 11, 0.08)';
  if (key === 'awarded') return dark ? 'rgba(16, 185, 129, 0.10)' : 'rgba(16, 185, 129, 0.08)';
  if (key === 'returned') return dark ? 'rgba(249, 115, 22, 0.10)' : 'rgba(249, 115, 22, 0.08)';
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
  if (['submitted', 'internal_review', 'under_review'].includes(key)) {
    return dark ? 'rgba(14, 165, 233, 0.14)' : 'rgba(14, 165, 233, 0.10)';
  }
  return dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
};

function MyProposalsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
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
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Modals
  const [opportunityModal, setOpportunityModal] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [teamModal, setTeamModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [proposalToDelete, setProposalToDelete] = useState(null);
  const [editTitleDialog, setEditTitleDialog] = useState(false);
  const [editingProposal, setEditingProposal] = useState(null);
  const [editedTitle, setEditedTitle] = useState('');

  useEffect(() => {
    fetchUser().then(u => { 
      if (!u) router.push('/login'); 
      else {
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
      setNewTitle(`Application for ${oppData.title}`);
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
      setError('Failed to load proposals');
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
      
      setSuccess(`Proposal "${proposalToDelete.title}" deleted successfully`);
      setDeleteDialog(false);
      setProposalToDelete(null);
      await loadProposals();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to delete proposal');
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
      
      setSuccess('Proposal title updated successfully');
      setEditTitleDialog(false);
      setEditingProposal(null);
      setEditedTitle('');
      await loadProposals();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to update proposal title');
      console.error('Update title error:', e);
    }
  };

  const createProposal = async () => {
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
      setSuccess('Proposal created! Team members will be notified.');
      setCreateDialog(false);
      setNewTitle('');
      setSelectedOpp(null);
      setTeamMembers([]);
      setActiveStep(0);
      setTimeout(() => router.push(`/researcher/grants/proposals/${res.data.id}`), 1500);
    } catch (e) {
      setError('Failed to create proposal: ' + (e.response?.data?.detail || e.message));
    }
  };

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const sortedProposals = sortProposalsForResearcher(proposals);
  const pageStart = page * rowsPerPage;
  const paginatedProposals = sortedProposals.slice(pageStart, pageStart + rowsPerPage);
  const previousPageLastGroup = pageStart > 0
    ? getStatusGroupKey(sortedProposals[pageStart - 1].status)
    : null;

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'text.primary' }}>My Proposals</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.3 }}>Track your grant proposals across all stages of the application lifecycle</Typography>
        </Box>
        <Button variant="contained" size="small" startIcon={<AddIcon />}
          onClick={() => setCreateDialog(true)}
          sx={{ bgcolor:ACCENT, textTransform:'none', fontWeight:600, borderRadius:2, '&:hover':{ bgcolor:'#14958a' } }}>
          New Proposal
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {proposals.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography sx={{ color: 'text.secondary', mb: 2 }}>No proposals yet</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialog(true)}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}>
            Create Your First Proposal
          </Button>
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
            {STATUS_GROUPS.map((group) => {
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
                  <TableCell sx={{ fontWeight: 700, fontSize: 13 }}>Proposal Title</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 13 }}>Linked Opportunity</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 13 }}>Team Members</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 13 }}>Progress</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 13 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 13 }}>Date Created</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 13 }}>Submitted</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 13 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  const rows = [];
                  let lastGroup = previousPageLastGroup;

                  paginatedProposals.forEach((p) => {
                    const groupKey = getStatusGroupKey(p.status);
                    if (groupKey !== lastGroup) {
                      const group = STATUS_GROUPS.find((g) => g.key === groupKey);
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
                            {p.opportunity?.title || `Opportunity #${p.opportunity_id}`}
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
                          <Tooltip title={`${p.lead_pi?.name || 'Lead PI'} - Lead PI`} arrow>
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
                              title={`${collab.user?.name || collab.invited_name || 'Pending'} - ${collab.role || 'Co-Investigator'} (${collab.status || 'pending'})`}
                              arrow
                            >
                              <Avatar 
                                sx={{ 
                                  bgcolor: '#8b5cf6', 
                                  width: 32, 
                                  height: 32, 
                                  fontSize: 13,
                                  border: `2px solid ${theme.palette.background.paper}`,
                                  transition: 'transform 0.2s',
                                  opacity: collab.status === 'pending' ? 0.6 : 1
                                }}
                              >
                                {collab.user?.name?.charAt(0) || collab.invited_name?.charAt(0) || 'C'}
                              </Avatar>
                            </Tooltip>
                          ))}
                        </Box>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>
                          {1 + (p.collaborators?.length || 0)} member{(1 + (p.collaborators?.length || 0)) !== 1 ? 's' : ''}
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
                                  {filled}/{total} sections
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
                          label={getStatusLabel(p.status)} 
                          size="small" 
                          sx={{ 
                            fontSize: 11, 
                            fontWeight: 700, 
                            bgcolor: statusColor(p.status) + '22', 
                            color: statusColor(p.status),
                            borderRadius: 1.5
                          }} 
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Typography sx={{ fontSize: 13, color: 'text.primary' }}>
                          {new Date(p.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </Typography>
                      </TableCell>

                      {/* Submission date — own column */}
                      <TableCell>
                        {p.submitted_at ? (
                          <>
                            <Typography sx={{ fontSize: 13, color: 'text.primary', fontWeight: 500 }}>
                              {new Date(p.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                              {new Date(p.submitted_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          </>
                        ) : (
                          <Typography sx={{ fontSize: 12, color: 'text.disabled', fontStyle: 'italic' }}>Not submitted</Typography>
                        )}
                      </TableCell>
                      
                      <TableCell align="right">
                        {(() => {
                          const isDraft = p.status === 'draft' || p.status?.toUpperCase() === 'DRAFT';
                          const lockedTip = 'This proposal has been submitted and can no longer be edited';
                          return (
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                              <Tooltip title={isDraft ? 'Edit Proposal' : lockedTip} arrow>
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
                              <Tooltip title={isDraft ? 'Manage Team' : lockedTip} arrow>
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
                              <Tooltip title={isDraft ? 'Delete Proposal' : lockedTip} arrow>
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
          setCreateDialog(false);
          setActiveStep(0);
          setTeamMembers([]);
        }} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography sx={{ fontSize: 20, fontWeight: 700 }}>Create New Proposal</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
            {selectedOpp ? `Applying for: ${selectedOpp.title}` : 'Start your grant application'}
          </Typography>
        </DialogTitle>

        <Stepper activeStep={activeStep} sx={{ px: 3, pt: 2 }}>
          <Step><StepLabel>Proposal Details</StepLabel></Step>
          <Step><StepLabel>Team</StepLabel></Step>
          <Step><StepLabel>Review & Create</StepLabel></Step>
        </Stepper>

        <DialogContent sx={{ mt: 2 }}>
          {/* Step 1: Proposal Details */}
          {activeStep === 0 && (
            <Box>
              <TextField
                fullWidth
                label="Proposal Title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                sx={{ mb: 2 }}
                helperText="Give your proposal a descriptive title"
              />
              {selectedOpp && (
                <Box sx={{ p: 2, bgcolor: `${ACCENT}08`, borderRadius: 2, border: `1px solid ${ACCENT}40` }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: ACCENT, mb: 1 }}>OPPORTUNITY</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 0.5 }}>{selectedOpp.title}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    Sponsor: {selectedOpp.sponsor}
                  </Typography>
                  {selectedOpp.deadline && (
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                      Deadline: {new Date(selectedOpp.deadline).toLocaleDateString()}
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
              listLabel="Team List"
              description="Add proposal team members via ORCID or institution search. Email is required for notifications."
              roleLabel="Default Role for New Team Members"
              formatRole={(r) => r}
            />
          )}

          {/* Step 3: Review */}
          {activeStep === 2 && (
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 2 }}>Review & Confirm</Typography>
              
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2, mb: 2 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 1 }}>PROPOSAL TITLE</Typography>
                <Typography sx={{ fontSize: 14 }}>{newTitle}</Typography>
              </Box>

              {selectedOpp && (
                <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2, mb: 2 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 1 }}>OPPORTUNITY</Typography>
                  <Typography sx={{ fontSize: 14 }}>{selectedOpp.title}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>{selectedOpp.sponsor}</Typography>
                </Box>
              )}

              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 1 }}>
                  TEAM ({teamMembers.length})
                </Typography>
                {teamMembers.length === 0 ? (
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', fontStyle: 'italic' }}>
                    No team members added
                  </Typography>
                ) : (
                  teamMembers.map((c, idx) => (
                    <Box key={idx} sx={{
                      py: 1.5,
                      borderBottom: idx < teamMembers.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{getDisplayName(c)}</Typography>
                        <Chip label={c.role} size="small" sx={{ fontSize: 10, height: 20 }} />
                      </Box>
                      {c.email && (
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Email: {c.email}</Typography>
                      )}
                      {c.affiliation && (
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Affiliation: {c.affiliation}</Typography>
                      )}
                    </Box>
                  ))
                )}
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                Team members will receive email notifications and in-app alerts to join this proposal.
              </Alert>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => {
            setCreateDialog(false);
            setActiveStep(0);
            setTeamMembers([]);
          }}>
            Cancel
          </Button>
          {activeStep > 0 && (
            <Button onClick={handleBack}>
              Back
            </Button>
          )}
          {activeStep < 2 ? (
            <Button 
              onClick={handleNext} 
              variant="contained"
              disabled={activeStep === 0 && !newTitle.trim()}
              sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}
            >
              Next
            </Button>
          ) : (
            <Button 
              onClick={createProposal} 
              variant="contained"
              disabled={!newTitle.trim()}
              sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}
            >
              Create Proposal
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
          <Typography sx={{ fontSize: 20, fontWeight: 700 }}>Opportunity Details</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedOpportunity ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>TITLE</Typography>
                <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{selectedOpportunity.title}</Typography>
              </Box>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>SPONSOR / FUNDER</Typography>
                  <Typography sx={{ fontSize: 14 }}>{selectedOpportunity.sponsor || '—'}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>SPONSOR TYPE</Typography>
                  <Typography sx={{ fontSize: 14 }}>{selectedOpportunity.sponsor_type || '—'}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>CATEGORY / SECTOR</Typography>
                  <Typography sx={{ fontSize: 14 }}>{selectedOpportunity.category || '—'}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>GEOGRAPHY</Typography>
                  <Typography sx={{ fontSize: 14 }}>{selectedOpportunity.geography || '—'}</Typography>
                </Box>
              </Box>

              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>ELIGIBLE APPLICANTS</Typography>
                <Typography sx={{ fontSize: 14 }}>{selectedOpportunity.eligible_applicants || '—'}</Typography>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>FUNDING TYPE</Typography>
                  <Typography sx={{ fontSize: 14 }}>{selectedOpportunity.funding_type || '—'}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>CURRENCY</Typography>
                  <Typography sx={{ fontSize: 14 }}>{selectedOpportunity.currency || '—'}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>STATUS</Typography>
                  <Chip label={selectedOpportunity.status || 'Unknown'} size="small" 
                    sx={{ fontSize: 11, fontWeight: 600, bgcolor: ACCENT + '22', color: ACCENT }} />
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>MIN AWARD</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                    {selectedOpportunity.currency} {selectedOpportunity.amount_min?.toLocaleString() || '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>MAX AWARD</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                    {selectedOpportunity.currency} {selectedOpportunity.amount_max?.toLocaleString() || '—'}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>OPEN DATE</Typography>
                  <Typography sx={{ fontSize: 14 }}>
                    {selectedOpportunity.open_date ? new Date(selectedOpportunity.open_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>DEADLINE</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#ef4444' }}>
                    {selectedOpportunity.deadline ? new Date(selectedOpportunity.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
                  </Typography>
                </Box>
              </Box>

              {selectedOpportunity.round_cycle && (
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>ROUND / CYCLE</Typography>
                  <Typography sx={{ fontSize: 14 }}>{selectedOpportunity.round_cycle}</Typography>
                </Box>
              )}

              {selectedOpportunity.contact_email && (
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>CONTACT EMAIL</Typography>
                  <Typography sx={{ fontSize: 14, color: ACCENT }}>{selectedOpportunity.contact_email}</Typography>
                </Box>
              )}

              {selectedOpportunity.url && (
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>OPPORTUNITY URL</Typography>
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
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>INTERNAL NOTES</Typography>
                  <Typography sx={{ fontSize: 14, fontStyle: 'italic', color: 'text.secondary' }}>{selectedOpportunity.notes}</Typography>
                </Box>
              )}
            </Box>
          ) : (
            <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>No opportunity details available</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpportunityModal(false)}>Close</Button>
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
          <Typography sx={{ fontSize: 20, fontWeight: 700 }}>Manage Team</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
            {selectedProposal?.title}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedProposal ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Lead PI */}
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 1.5 }}>LEAD PRINCIPAL INVESTIGATOR</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                  <Avatar sx={{ bgcolor: ACCENT, width: 40, height: 40 }}>
                    {selectedProposal.lead_pi?.name?.charAt(0) || 'L'}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{selectedProposal.lead_pi?.name || 'Lead PI'}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{selectedProposal.lead_pi?.email || '—'}</Typography>
                  </Box>
                  <Chip label="Lead PI" size="small" sx={{ bgcolor: ACCENT + '22', color: ACCENT, fontWeight: 600 }} />
                </Box>
              </Box>

              {/* Collaborators */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>COLLABORATORS ({selectedProposal.collaborators?.length || 0})</Typography>
                  <Button 
                    size="small" 
                    startIcon={<InviteIcon />}
                    onClick={() => {
                      setTeamModal(false);
                      setCreateDialog(true);
                      setActiveStep(1);
                    }}
                    sx={{ textTransform: 'none', fontSize: 12, fontWeight: 600, color: ACCENT }}
                  >
                    Invite Member
                  </Button>
                </Box>
                
                {selectedProposal.collaborators && selectedProposal.collaborators.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {selectedProposal.collaborators.map((collab, idx) => (
                      <Box 
                        key={idx}
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 2, 
                          p: 2, 
                          border: `1px solid ${theme.palette.divider}`, 
                          borderRadius: 2,
                          '&:hover': { bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }
                        }}
                      >
                        <Avatar sx={{ bgcolor: '#8b5cf6', width: 40, height: 40 }}>
                          {collab.user?.name?.charAt(0) || collab.invited_name?.charAt(0) || 'C'}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                            {collab.user?.name || collab.invited_name || 'Pending'}
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                            {collab.user?.email || collab.invited_email || '—'}
                          </Typography>
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
                            <MenuItem value="Co-Investigator">Co-Investigator</MenuItem>
                            <MenuItem value="Consultant">Consultant</MenuItem>
                            <MenuItem value="Advisor">Advisor</MenuItem>
                            <MenuItem value="Collaborator">Collaborator</MenuItem>
                          </Select>
                        </FormControl>
                        <Chip 
                          label={collab.status || 'pending'} 
                          size="small" 
                          sx={{ 
                            fontSize: 11, 
                            fontWeight: 600,
                            bgcolor: collab.status === 'accepted' ? '#10b98122' : '#f59e0b22',
                            color: collab.status === 'accepted' ? '#10b981' : '#f59e0b'
                          }} 
                        />
                        <IconButton 
                          size="small"
                          onClick={() => {
                            if (confirm(`Remove ${collab.user?.name || collab.invited_name} from team?`)) {
                              // TODO: Remove collaborator
                              console.log('Remove collaborator:', collab.id);
                            }
                          }}
                          sx={{ color: '#ef4444' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4, bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                    <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>No collaborators yet</Typography>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      startIcon={<InviteIcon />}
                      onClick={() => {
                        setTeamModal(false);
                        setCreateDialog(true);
                        setActiveStep(1);
                      }}
                      sx={{ textTransform: 'none', borderColor: ACCENT, color: ACCENT }}
                    >
                      Invite First Member
                    </Button>
                  </Box>
                )}
              </Box>
            </Box>
          ) : (
            <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>No proposal selected</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setTeamModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialog} 
        onClose={() => setDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Proposal</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone. All sections, documents, and collaborator invitations will be permanently deleted.
          </Alert>
          <Typography sx={{ fontSize: 14, mb: 1 }}>
            Are you sure you want to delete this proposal?
          </Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary' }}>
            "{proposalToDelete?.title}"
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => { setDeleteDialog(false); setProposalToDelete(null); }}>
            Cancel
          </Button>
          <Button 
            onClick={deleteProposal}
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
          >
            Delete Proposal
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
            setEditingProposal(null);
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
