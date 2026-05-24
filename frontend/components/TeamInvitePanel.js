'use client';

import { useState } from 'react';
import {
  Box, Typography, Button, Paper, TextField, CircularProgress, Alert,
  Divider, IconButton, Chip, useTheme, MenuItem, Select, FormControl,
  InputLabel, Dialog, DialogTitle, DialogContent, DialogActions,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon,
  Search as SearchIcon, PersonAdd as InviteIcon,
  WorkspacePremium as OrcidIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';
const inp = { '& .MuiOutlinedInput-root': { borderRadius: 2 } };

export const PROJECT_TEAM_ROLES = ['co_investigator', 'research_assistant', 'data_manager', 'external_collaborator'];
export const PROPOSAL_TEAM_ROLES = ['Co-Investigator', 'Consultant', 'Advisor', 'Collaborator'];
export const MANUSCRIPT_TEAM_ROLES = ['author', 'corresponding_author', 'contributor'];

export const getInviteeKey = (inv) => (inv.user_id || inv.orcid || inv.email || '').toString().toLowerCase();

export const getDisplayName = (inv) =>
  inv.name || `${inv.given_name || ''} ${inv.family_name || ''}`.trim() || inv.email;

export const buildTeamInvitePayload = (inv) => ({
  role: inv.role,
  email: inv.email?.trim(),
  affiliation: inv.affiliation?.trim() || undefined,
  orcid: inv.orcid?.trim() || undefined,
  user_id: inv.user_id || undefined,
  given_name: inv.given_name?.trim() || undefined,
  family_name: inv.family_name?.trim() || undefined,
  name: inv.name?.trim() || getDisplayName(inv) || undefined,
});

function SubLabel({ label }) {
  return (
    <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.7, mb: 1.5 }}>
      {label}
    </Typography>
  );
}

export function TeamInvitePanel({
  invitees = [],
  onChange,
  roles = PROJECT_TEAM_ROLES,
  defaultRole = roles[0] || 'co_investigator',
  accent = '#1ca7a1',
  listLabel = 'Team List',
  description = 'Invite via ORCID (with email for notifications) or search registered researchers at your institution.',
  roleLabel = 'Default Role for New Invitees',
  formatRole = (r) => r.replace(/_/g, ' '),
}) {
  const theme = useTheme();
  const EMPTY_FORM = {
    given_name: '', family_name: '', email: '', affiliation: '', orcid: '',
    user_id: '', name: '', role: defaultRole, source: '',
  };

  const [searchMode, setSearchMode] = useState('orcid');
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [institutionQuery, setInstitutionQuery] = useState('');
  const [orcidResults, setOrcidResults] = useState([]);
  const [institutionResults, setInstitutionResults] = useState([]);
  const [searchingOrcid, setSearchingOrcid] = useState(false);
  const [searchingInstitution, setSearchingInstitution] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM, role: defaultRole });
  const [error, setError] = useState('');
  const [lookingUpOrcid, setLookingUpOrcid] = useState(false);
  const [emailAutoFilled, setEmailAutoFilled] = useState(false);

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  const isValidInvitee = (inv) => inv.user_id
    ? !!inv.role
    : !!(inv.email?.trim() && (inv.given_name?.trim() || inv.family_name?.trim() || inv.name?.trim()));

  const clearEntryForm = () => {
    setForm({ ...EMPTY_FORM, role: form.role });
    setGivenName('');
    setFamilyName('');
    setInstitutionQuery('');
    setOrcidResults([]);
    setInstitutionResults([]);
    setEmailAutoFilled(false);
    setError('');
  };

  const addInvitee = (invitee) => {
    if (!isValidInvitee(invitee)) {
      setError('Complete name and email before adding to the list.');
      return false;
    }
    const key = getInviteeKey(invitee);
    if (invitees.some(p => getInviteeKey(p) === key)) {
      setError('This person is already in the team list.');
      return false;
    }
    onChange([...invitees, { ...invitee, role: invitee.role || form.role }]);
    clearEntryForm();
    return true;
  };

  const removeInvitee = (key) => onChange(invitees.filter(p => getInviteeKey(p) !== key));

  const updateInviteeRole = (key, role) =>
    onChange(invitees.map(p => getInviteeKey(p) === key ? { ...p, role } : p));

  const searchOrcid = async () => {
    if (!givenName.trim() && !familyName.trim()) return;
    setSearchingOrcid(true);
    setError('');
    try {
      const res = await axios.get(`${API}/auth/orcid/search`, {
        params: { given_name: givenName.trim(), family_name: familyName.trim() },
        headers: authHeaders(),
      });
      setOrcidResults(res.data || []);
    } catch {
      setOrcidResults([]);
      setError('ORCID search failed. You can still enter details manually below.');
    } finally {
      setSearchingOrcid(false);
    }
  };

  const searchInstitution = async () => {
    if (institutionQuery.trim().length < 2) return;
    setSearchingInstitution(true);
    setError('');
    try {
      const res = await axios.get(`${API}/grants/proposals/collaborators/search`, {
        params: { query: institutionQuery.trim() },
        headers: authHeaders(),
      });
      setInstitutionResults(res.data || []);
    } catch {
      setInstitutionResults([]);
      setError('Institution search failed.');
    } finally {
      setSearchingInstitution(false);
    }
  };

  const lookupRegisteredUser = async (orcidId) => {
    const normalized = (orcidId || '').trim().replace(/^https?:\/\/orcid\.org\//, '');
    if (!normalized) return null;
    try {
      const res = await axios.get(`${API}/auth/orcid/lookup`, {
        params: { orcid_id: normalized },
        headers: authHeaders(),
      });
      return res.data?.registered ? res.data : null;
    } catch {
      return null;
    }
  };

  const buildInviteeFromPerson = (person, registered) => {
    const parts = (registered?.name || person.name || '').trim().split(/\s+/);
    const given = parts.slice(0, -1).join(' ') || givenName.trim();
    const family = parts.length > 1 ? parts[parts.length - 1] : familyName.trim();
    return {
      given_name: given,
      family_name: family,
      name: registered?.name || person.name || `${given} ${family}`.trim(),
      email: registered?.email || person.email || '',
      affiliation: registered?.affiliation || person.affiliation || person.department || '',
      orcid: registered?.orcid || person.orcid || '',
      user_id: registered?.user_id || person.user_id || '',
      role: form.role,
      source: registered?.user_id || person.user_id ? 'institution' : 'orcid',
    };
  };

  const applyRegisteredUser = (person, registered) => {
    const invitee = buildInviteeFromPerson(person, registered);
    setForm(f => ({ ...f, ...invitee }));
    setEmailAutoFilled(!!invitee.email && !!(registered?.user_id || person.registered));
  };

  const selectOrcidPerson = async (person) => {
    setLookingUpOrcid(true);
    setError('');
    try {
      const registered = person.orcid ? await lookupRegisteredUser(person.orcid) : null;
      addInvitee(buildInviteeFromPerson(person, registered || (person.registered ? person : null)));
      setOrcidResults([]);
    } finally {
      setLookingUpOrcid(false);
    }
  };

  const handleOrcidBlur = async (orcidValue) => {
    const orcid = (orcidValue || '').trim();
    if (!orcid) {
      setEmailAutoFilled(false);
      return;
    }
    setLookingUpOrcid(true);
    try {
      const registered = await lookupRegisteredUser(orcid);
      if (registered) {
        applyRegisteredUser({ orcid, name: registered.name, affiliation: registered.affiliation }, registered);
      } else {
        setEmailAutoFilled(false);
        setForm(f => ({ ...f, user_id: '', source: 'orcid' }));
      }
    } finally {
      setLookingUpOrcid(false);
    }
  };

  const selectInstitutionPerson = (person) => {
    addInvitee(buildInviteeFromPerson(person, person));
    setInstitutionResults([]);
    setInstitutionQuery('');
  };

  const canAddCurrent = isValidInvitee(form);

  return (
    <Box>
      {description && (
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>{description}</Typography>
      )}

      <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
        <Button
          size="small"
          variant={searchMode === 'orcid' ? 'contained' : 'text'}
          onClick={() => { setSearchMode('orcid'); setInstitutionResults([]); setInstitutionQuery(''); }}
          sx={{
            textTransform: 'none', fontWeight: 600, borderRadius: 2,
            bgcolor: searchMode === 'orcid' ? accent : 'transparent',
            color: searchMode === 'orcid' ? '#fff' : 'text.secondary',
            '&:hover': { bgcolor: searchMode === 'orcid' ? '#0e8a85' : 'action.hover' },
          }}
        >
          ORCID
        </Button>
        <Button
          size="small"
          variant={searchMode === 'institution' ? 'contained' : 'text'}
          onClick={() => { setSearchMode('institution'); setOrcidResults([]); setGivenName(''); setFamilyName(''); }}
          sx={{
            textTransform: 'none', fontWeight: 600, borderRadius: 2,
            bgcolor: searchMode === 'institution' ? accent : 'transparent',
            color: searchMode === 'institution' ? '#fff' : 'text.secondary',
            '&:hover': { bgcolor: searchMode === 'institution' ? '#0e8a85' : 'action.hover' },
          }}
        >
          Institution Researchers
        </Button>
      </Box>

      {searchMode === 'orcid' && (
        <>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField size="small" placeholder="Given Name" value={givenName}
              onChange={e => setGivenName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchOrcid()} sx={{ flex: 1 }} />
            <TextField size="small" placeholder="Family Name" value={familyName}
              onChange={e => setFamilyName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchOrcid()} sx={{ flex: 1 }} />
            <Button variant="contained" onClick={searchOrcid}
              disabled={searchingOrcid || (!givenName.trim() && !familyName.trim())}
              sx={{ bgcolor: accent, '&:hover': { bgcolor: '#0e8a85' }, minWidth: 44 }}>
              {searchingOrcid ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
            </Button>
          </Box>

          {orcidResults.length > 0 && (
            <Box sx={{ mb: 2, maxHeight: 180, overflow: 'auto', border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
              {orcidResults.map((person, idx) => (
                <Box key={idx} sx={{
                  p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  borderBottom: idx < orcidResults.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                  '&:hover': { bgcolor: 'action.hover' },
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                    <Box sx={{
                      width: 32, height: 32, borderRadius: '50%', bgcolor: accent, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                    }}>
                      {person.name?.charAt(0) || '?'}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{person.name || 'Unknown'}</Typography>
                        {person.registered && (
                          <Chip label="Registered" size="small" sx={{ height: 18, fontSize: 9, fontWeight: 700, bgcolor: '#10b98122', color: '#10b981' }} />
                        )}
                      </Box>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                        {person.orcid}{person.affiliation ? ` · ${person.affiliation}` : ''}
                      </Typography>
                      {person.registered && person.email && (
                        <Typography sx={{ fontSize: 11, color: accent }}>{person.email}</Typography>
                      )}
                    </Box>
                  </Box>
                  <IconButton size="small" onClick={() => selectOrcidPerson(person)} sx={{ color: accent }}>
                    <InviteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}

          <Divider sx={{ my: 2 }} />
          <SubLabel label="Invitee Details" />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField size="small" label="Given Name *" value={form.given_name}
                onChange={e => setForm(f => ({ ...f, given_name: e.target.value, user_id: '', source: 'orcid' }))}
                sx={{ flex: '1 1 180px', ...inp }} />
              <TextField size="small" label="Family Name *" value={form.family_name}
                onChange={e => setForm(f => ({ ...f, family_name: e.target.value, user_id: '', source: 'orcid' }))}
                sx={{ flex: '1 1 180px', ...inp }} />
            </Box>
            <TextField fullWidth size="small" label="ORCID iD (optional)" value={form.orcid}
              onChange={e => {
                setForm(f => ({ ...f, orcid: e.target.value, user_id: '', source: 'orcid' }));
                setEmailAutoFilled(false);
              }}
              onBlur={e => handleOrcidBlur(e.target.value)}
              placeholder="0000-0000-0000-0000"
              InputProps={{
                startAdornment: <InputAdornment position="start"><OrcidIcon sx={{ fontSize: 15, color: accent }} /></InputAdornment>,
                endAdornment: lookingUpOrcid ? <InputAdornment position="end"><CircularProgress size={14} /></InputAdornment> : null,
              }}
              sx={inp} />
            <TextField fullWidth size="small" label="Email *" type="email" value={form.email}
              onChange={e => {
                setForm(f => ({ ...f, email: e.target.value }));
                setEmailAutoFilled(false);
              }}
              disabled={!!form.user_id && emailAutoFilled}
              helperText={emailAutoFilled
                ? 'Auto-filled from registered DACORIS account'
                : 'Required for email and in-system notifications'}
              sx={inp} />
            <TextField fullWidth size="small" label="Affiliation (optional)" value={form.affiliation}
              onChange={e => setForm(f => ({ ...f, affiliation: e.target.value }))}
              placeholder="Institution / Department"
              sx={inp} />
            <Button size="small" variant="outlined" startIcon={<AddIcon />}
              onClick={() => addInvitee({ ...form, role: form.role })}
              disabled={!canAddCurrent}
              sx={{ alignSelf: 'flex-start', textTransform: 'none', borderRadius: 2 }}>
              Add to Team List
            </Button>
          </Box>
        </>
      )}

      {searchMode === 'institution' && (
        <>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField size="small" fullWidth placeholder="Search by name, email, or department..."
              value={institutionQuery}
              onChange={e => setInstitutionQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchInstitution()} />
            <Button variant="contained" onClick={searchInstitution}
              disabled={searchingInstitution || institutionQuery.trim().length < 2}
              sx={{ bgcolor: accent, '&:hover': { bgcolor: '#0e8a85' }, minWidth: 44 }}>
              {searchingInstitution ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
            </Button>
          </Box>

          {institutionResults.length > 0 && (
            <Box sx={{ mb: 2, maxHeight: 220, overflow: 'auto', border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
              {institutionResults.map((person, idx) => (
                <Box key={person.user_id || idx} sx={{
                  p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  borderBottom: idx < institutionResults.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                  '&:hover': { bgcolor: 'action.hover' },
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                    <Box sx={{
                      width: 32, height: 32, borderRadius: '50%', bgcolor: '#8b5cf6', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                    }}>
                      {person.name?.charAt(0) || '?'}
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{person.name || 'Unknown'}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                        {person.email}{person.department ? ` · ${person.department}` : ''}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton size="small" onClick={() => selectInstitutionPerson(person)} sx={{ color: accent }}>
                    <InviteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}

          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
            Click the add icon on a search result to add them to the team list.
          </Typography>
        </>
      )}

      <TextField fullWidth size="small" select label={roleLabel} value={form.role}
        onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
        sx={{ mt: 2, ...inp }}>
        {roles.map(r => (
          <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize', fontSize: 12 }}>
            {formatRole(r)}
          </MenuItem>
        ))}
      </TextField>

      <Divider sx={{ my: 2.5 }} />
      <SubLabel label={`${listLabel} (${invitees.length})`} />
      {invitees.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            No team members added yet. Search above or enter details manually.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {invitees.map(inv => {
            const key = getInviteeKey(inv);
            return (
              <Paper key={key} elevation={0} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Box sx={{
                    width: 30, height: 30, borderRadius: '50%', fontSize: 12, mt: 0.25,
                    bgcolor: inv.user_id ? '#8b5cf6' : accent, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {getDisplayName(inv)?.charAt(0)?.toUpperCase() || '?'}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{getDisplayName(inv)}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{inv.email}</Typography>
                    {(inv.affiliation || inv.orcid) && (
                      <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                        {[inv.affiliation, inv.orcid].filter(Boolean).join(' · ')}
                      </Typography>
                    )}
                    <FormControl size="small" sx={{ mt: 1, minWidth: 180, ...inp }}>
                      <InputLabel>Role</InputLabel>
                      <Select value={inv.role} label="Role" onChange={e => updateInviteeRole(key, e.target.value)}>
                        {roles.map(r => (
                          <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize', fontSize: 12 }}>
                            {formatRole(r)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  <IconButton size="small" onClick={() => removeInvitee(key)} sx={{ color: '#ef4444' }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{error}</Alert>}
    </Box>
  );
}

export function TeamInviteDialog({
  open,
  onClose,
  onSave,
  title = 'Invite Team Members',
  sendLabel,
  accent = '#1ca7a1',
  roles = PROJECT_TEAM_ROLES,
  defaultRole = roles[0],
  ...panelProps
}) {
  const [invitees, setInvitees] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setInvitees([]);
    setError('');
    onClose();
  };

  const handleSendAll = async () => {
    if (invitees.length === 0) return;
    setSaving(true);
    setError('');
    try {
      await onSave(invitees.map(buildTeamInvitePayload));
      setInvitees([]);
      onClose();
    } catch (e) {
      setError(typeof e === 'string' ? e : e.message || e.response?.data?.detail || 'Failed to send invitations');
    } finally {
      setSaving(false);
    }
  };

  const label = sendLabel || `Send ${invitees.length} Invitation${invitees.length !== 1 ? 's' : ''}`;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{title}</DialogTitle>
      <DialogContent sx={{ pt: '8px !important' }}>
        <TeamInvitePanel
          invitees={invitees}
          onChange={setInvitees}
          roles={roles}
          defaultRole={defaultRole}
          accent={accent}
          {...panelProps}
        />
        {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0, flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={handleClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" onClick={handleSendAll} disabled={saving || invitees.length === 0}
          sx={{ bgcolor: accent, textTransform: 'none', borderRadius: 2, '&:hover': { bgcolor: '#0e8a85' } }}>
          {saving ? 'Sending…' : label}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
