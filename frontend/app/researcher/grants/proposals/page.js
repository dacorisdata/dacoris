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

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCENT = '#16a699';

const statusColor = s => ({ DRAFT:'#f59e0b','UNDER_REVIEW':'#0ea5e9','SUBMITTED':ACCENT, AWARDED:'#10b981', REJECTED:'#ef4444', RETURNED:'#f97316' }[s] || '#64748b');

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
  
  // ORCID search
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [orcidResults, setOrcidResults] = useState([]);
  const [searchingOrcid, setSearchingOrcid] = useState(false);
  const [invitedCollaborators, setInvitedCollaborators] = useState([]);
  
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

  useEffect(() => {
    fetchUser().then(u => { 
      if (!u) router.push('/login'); 
      else {
        loadProposals();
        // Check if coming from opportunity apply
        const newParam = searchParams.get('new');
        const oppParam = searchParams.get('opp');
        if (newParam === 'true' && oppParam) {
          try {
            const oppData = JSON.parse(decodeURIComponent(oppParam));
            setSelectedOpp(oppData);
            setNewTitle(`Application for ${oppData.title}`);
            setCreateDialog(true);
          } catch (e) {
            console.error('Failed to parse opportunity data:', e);
          }
        }
      }
    });
  }, [searchParams]);

  const loadProposals = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/grants/proposals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProposals(res.data);
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

  const searchOrcid = async () => {
    if (!givenName.trim() && !familyName.trim()) return;
    setSearchingOrcid(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/auth/orcid/search`, {
        params: { 
          given_name: givenName.trim(),
          family_name: familyName.trim()
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrcidResults(res.data || []);
    } catch (e) {
      console.error('ORCID search failed:', e);
      setOrcidResults([]);
    } finally {
      setSearchingOrcid(false);
    }
  };

  const addCollaborator = (person) => {
    if (!invitedCollaborators.find(c => c.orcid === person.orcid)) {
      setInvitedCollaborators([...invitedCollaborators, { ...person, role: 'Co-Investigator' }]);
      setGivenName('');
      setFamilyName('');
      setOrcidResults([]);
    }
  };

  const removeCollaborator = (orcid) => {
    setInvitedCollaborators(invitedCollaborators.filter(c => c.orcid !== orcid));
  };

  const updateCollaboratorRole = (orcid, role) => {
    setInvitedCollaborators(invitedCollaborators.map(c => 
      c.orcid === orcid ? { ...c, role } : c
    ));
  };

  const createProposal = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/grants/proposals`,
        { 
          title: newTitle, 
          opportunity_id: selectedOpp?.id,
          collaborators: invitedCollaborators.map(c => ({
            orcid: c.orcid,
            name: c.name,
            email: c.email,
            role: c.role
          }))
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Proposal created! Collaborators will be notified.');
      setCreateDialog(false);
      setNewTitle('');
      setSelectedOpp(null);
      setInvitedCollaborators([]);
      setActiveStep(0);
      setTimeout(() => router.push(`/researcher/grants/proposals/${res.data.id}`), 1500);
    } catch (e) {
      setError('Failed to create proposal: ' + (e.response?.data?.detail || e.message));
    }
  };

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

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
                {proposals
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((p) => (
                    <TableRow 
                      key={p.id}
                      hover
                      sx={{ 
                        '&:last-child td, &:last-child th': { border: 0 },
                        cursor: 'pointer',
                        '&:hover': { bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }
                      }}
                    >
                      <TableCell>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary' }}>
                          {p.title}
                        </Typography>
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
                          label={p.status} 
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
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={proposals.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </Paper>
      )}

      {/* Enhanced Create Proposal Dialog */}
      <Dialog 
        open={createDialog} 
        onClose={() => {
          setCreateDialog(false);
          setActiveStep(0);
          setInvitedCollaborators([]);
          setGivenName('');
          setFamilyName('');
          setOrcidResults([]);
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
          <Step><StepLabel>Invite Collaborators</StepLabel></Step>
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

          {/* Step 2: Invite Collaborators */}
          {activeStep === 1 && (
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 2 }}>Search & Invite Collaborators via ORCID</Typography>
              
              <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                <TextField
                  size="small"
                  placeholder="Given Name"
                  value={givenName}
                  onChange={(e) => setGivenName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchOrcid()}
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  placeholder="Family Name"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchOrcid()}
                  sx={{ flex: 1 }}
                />
                <Button 
                  variant="contained" 
                  onClick={searchOrcid}
                  disabled={searchingOrcid || (!givenName.trim() && !familyName.trim())}
                  sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' }, minWidth: 100 }}
                >
                  {searchingOrcid ? <CircularProgress size={20} /> : <SearchIcon />}
                </Button>
              </Box>

              {/* ORCID Search Results */}
              {orcidResults.length > 0 && (
                <Box sx={{ mb: 3, maxHeight: 200, overflow: 'auto', border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                  {orcidResults.map((person, idx) => (
                    <Box 
                      key={idx}
                      sx={{ 
                        p: 1.5, 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        borderBottom: idx < orcidResults.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: ACCENT, fontSize: 14 }}>
                          {person.name?.charAt(0) || '?'}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{person.name || 'Unknown'}</Typography>
                          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                            {person.email || person.orcid}
                          </Typography>
                        </Box>
                      </Box>
                      <IconButton 
                        size="small" 
                        onClick={() => addCollaborator(person)}
                        sx={{ color: ACCENT }}
                      >
                        <InviteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}

              {/* Invited Collaborators */}
              <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>
                Invited Collaborators ({invitedCollaborators.length})
              </Typography>
              {invitedCollaborators.length === 0 ? (
                <Typography sx={{ fontSize: 12, color: 'text.secondary', fontStyle: 'italic', py: 2, textAlign: 'center' }}>
                  No collaborators invited yet. Search above to add team members.
                </Typography>
              ) : (
                <Table size="small">
                  <TableBody>
                    {invitedCollaborators.map((collab) => (
                      <TableRow key={collab.orcid}>
                        <TableCell sx={{ py: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 28, height: 28, bgcolor: ACCENT, fontSize: 12 }}>
                              {collab.name?.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{collab.name}</Typography>
                              <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{collab.email}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 1, width: 180 }}>
                          <Select
                            size="small"
                            value={collab.role}
                            onChange={(e) => updateCollaboratorRole(collab.orcid, e.target.value)}
                            fullWidth
                            sx={{ fontSize: 12 }}
                          >
                            <MenuItem value="Co-Investigator">Co-Investigator</MenuItem>
                            <MenuItem value="Consultant">Consultant</MenuItem>
                            <MenuItem value="Advisor">Advisor</MenuItem>
                            <MenuItem value="Collaborator">Collaborator</MenuItem>
                          </Select>
                        </TableCell>
                        <TableCell sx={{ py: 1, width: 50 }}>
                          <IconButton size="small" onClick={() => removeCollaborator(collab.orcid)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
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
                  COLLABORATORS ({invitedCollaborators.length})
                </Typography>
                {invitedCollaborators.length === 0 ? (
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', fontStyle: 'italic' }}>
                    No collaborators
                  </Typography>
                ) : (
                  invitedCollaborators.map((c) => (
                    <Box key={c.orcid} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography sx={{ fontSize: 13 }}>{c.name}</Typography>
                      <Chip label={c.role} size="small" sx={{ fontSize: 10, height: 20 }} />
                    </Box>
                  ))
                )}
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                Collaborators will receive email notifications and in-app alerts to join this proposal.
              </Alert>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => {
            setCreateDialog(false);
            setActiveStep(0);
            setInvitedCollaborators([]);
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
