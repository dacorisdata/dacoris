'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Button, Paper, TextField, CircularProgress, Alert,
  Divider, IconButton, Chip, useTheme, MenuItem, Select, FormControl,
  InputLabel, Dialog, DialogTitle, DialogContent, DialogActions,
  InputAdornment, Tooltip,
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon,
  Search as SearchIcon,
  WorkspacePremium as OrcidIcon,
  AutoAwesome as AiIcon,
  PersonSearch as SuggestIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';
const inp = { '& .MuiOutlinedInput-root': { borderRadius: 2 } };
const EMPTY_MANUSCRIPT_KEYWORDS = [];

const normalizeOrcidId = (value) =>
  (value || '').trim().replace(/^https?:\/\/orcid\.org\//i, '');

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

function SubLabel({ label, action }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 1 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.7 }}>
        {label}
      </Typography>
      {action}
    </Box>
  );
}

function parseNameParts(fullName, fallbackGiven = '', fallbackFamily = '') {
  const trimmed = (fullName || '').trim();
  if (!trimmed) {
    return { given: fallbackGiven.trim(), family: fallbackFamily.trim() };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { given: parts[0], family: fallbackFamily.trim() };
  }
  return {
    given: parts.slice(0, -1).join(' '),
    family: parts[parts.length - 1],
  };
}

function ResearcherProfileModal({
  open,
  onClose,
  researcher,
  snapshot,
  loading,
  accent,
  onInvite,
  alreadyAdded,
  inviteLabel,
}) {
  const { t } = useLanguage();
  const data = snapshot || researcher;
  if (!data) return null;

  const expertise = snapshot?.expertise_keywords || researcher?.expertise_keywords || [];
  const skills = snapshot?.skills || researcher?.skills || [];
  const pubs = [
    ...(snapshot?.publication_titles || []),
    ...(snapshot?.orcid_work_titles || []),
  ].slice(0, 5);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography sx={{ fontSize: 18, fontWeight: 700 }}>{data.name || t('researcher.teamInvite.profileTitle')}</Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
          {[data.job_title, data.department].filter(Boolean).join(' · ') || t('researcher.teamInvite.institutionResearcher')}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: '8px !important' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} sx={{ color: accent }} />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(snapshot?.match_explanation || researcher?.match_explanation) && (
              <Alert severity="info" icon={<AiIcon fontSize="small" />} sx={{ borderRadius: 2 }}>
                {snapshot?.match_explanation || researcher?.match_explanation}
              </Alert>
            )}

            {(snapshot?.match_reasons?.length > 0 || researcher?.reasons?.length > 0) && (
              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', mb: 1 }}>
                  {t('researcher.teamInvite.whySuggested')}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {(snapshot?.match_reasons || researcher?.reasons || []).map((r, i) => (
                    <Chip key={i} label={r} size="small" sx={{ fontSize: 11, height: 24, bgcolor: `${accent}12`, color: accent }} />
                  ))}
                </Box>
              </Box>
            )}

            {expertise.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', mb: 1 }}>
                  {t('researcher.teamInvite.expertise')}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {expertise.map(kw => (
                    <Chip key={kw} label={kw} size="small" variant="outlined" sx={{ fontSize: 11, height: 24 }} />
                  ))}
                </Box>
              </Box>
            )}

            {skills.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', mb: 1 }}>
                  {t('researcher.teamInvite.skills')}
                </Typography>
                <Typography sx={{ fontSize: 13, color: 'text.primary' }}>{skills.join(' · ')}</Typography>
              </Box>
            )}

            {snapshot?.biography && (
              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', mb: 0.75 }}>
                  {t('researcher.teamInvite.biography')}
                </Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.55 }}>{snapshot.biography}</Typography>
              </Box>
            )}

            {pubs.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', mb: 1 }}>
                  {t('researcher.teamInvite.recentWork')}
                </Typography>
                {pubs.map((t, i) => (
                  <Typography key={i} sx={{ fontSize: 12.5, color: 'text.secondary', mb: 0.75, lineHeight: 1.45 }}>
                    · {t}
                  </Typography>
                ))}
              </Box>
            )}

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, pt: 0.5 }}>
              {data.email && (
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{data.email}</Typography>
              )}
              {data.orcid && (
                <Typography sx={{ fontSize: 12, color: 'text.disabled', fontFamily: 'monospace' }}>{data.orcid}</Typography>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>{t('researcher.teamInvite.close')}</Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled={alreadyAdded || loading}
          onClick={onInvite}
          sx={{ bgcolor: accent, textTransform: 'none', borderRadius: 2, '&:hover': { bgcolor: '#0e8a85' } }}
        >
          {alreadyAdded ? t('researcher.teamInvite.alreadyOnTeam') : (inviteLabel || t('researcher.teamInvite.inviteToTeam'))}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function TeamInvitePanel({
  invitees = [],
  onChange,
  roles = PROJECT_TEAM_ROLES,
  defaultRole = roles[0] || 'co_investigator',
  accent = '#1ca7a1',
  listLabel = 'Team List',
  description = 'Search by name, click Add on a result, or enter details manually below.',
  roleLabel = 'Default Role for New Invitees',
  formatRole = (r) => r.replace(/_/g, ' '),
  opportunityId = null,
  proposalTitle = '',
  manuscriptTitle = '',
  manuscriptDescription = '',
  manuscriptKeywords = EMPTY_MANUSCRIPT_KEYWORDS,
  manuscriptDepartment = '',
  suggestionsLabel = 'Suggested Collaborators',
  suggestionsHint = 'Researchers at your institution whose expertise may strengthen this work. Click a name to review their profile.',
  inviteFromProfileLabel = 'Invite to Team',
  lockedInvitees = [],
}) {
  const theme = useTheme();
  const { user: currentUser } = useAuth();
  const { t } = useLanguage();
  const listLabelText = listLabel || t('researcher.teamInvite.listLabel');
  const descriptionText = description || t('researcher.teamInvite.description');
  const roleLabelText = roleLabel || t('researcher.teamInvite.roleLabel');
  const suggestionsLabelText = suggestionsLabel || t('researcher.teamInvite.suggestionsLabel');
  const suggestionsHintText = suggestionsHint || t('researcher.teamInvite.suggestionsHint');
  const inviteFromProfileLabelText = inviteFromProfileLabel || t('researcher.teamInvite.inviteToTeam');
  const EMPTY_FORM = {
    given_name: '', family_name: '', email: '', affiliation: '', orcid: '',
    user_id: '', name: '', role: defaultRole, source: '',
  };

  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [orcidResults, setOrcidResults] = useState([]);
  const [searchingOrcid, setSearchingOrcid] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM, role: defaultRole });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [addingPerson, setAddingPerson] = useState(false);

  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsAi, setSuggestionsAi] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedResearcher, setSelectedResearcher] = useState(null);
  const [profileSnapshot, setProfileSnapshot] = useState(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [inviteTab, setInviteTab] = useState('orcid');

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  const hasManuscriptContext = !!(
    manuscriptTitle?.trim()
    || manuscriptDescription?.trim()
    || manuscriptDepartment?.trim()
    || (Array.isArray(manuscriptKeywords) && manuscriptKeywords.length > 0)
  );
  const showSuggestions = !!(opportunityId || proposalTitle?.trim() || hasManuscriptContext);
  const suggestionMode = hasManuscriptContext ? 'manuscript' : 'proposal';

  const hasName = (inv) => !!(inv.given_name?.trim() || inv.family_name?.trim() || inv.name?.trim());

  const isValidManualInvitee = (inv) => inv.user_id
    ? !!inv.role
    : hasName(inv) && !!inv.email?.trim();

  const isValidSearchInvitee = (inv) => inv.user_id ? !!inv.role : hasName(inv);

  const isSelfPerson = (person) => {
    if (!person || !currentUser) return !!person?.is_self;
    if (person.is_self) return true;
    if (person.user_id && person.user_id === currentUser.id) return true;
    const personOrcid = normalizeOrcidId(person.orcid);
    const myOrcid = normalizeOrcidId(currentUser.orcid_id);
    if (personOrcid && myOrcid && personOrcid === myOrcid) return true;
    if (person.email && currentUser.email && person.email.toLowerCase() === currentUser.email.toLowerCase()) {
      return true;
    }
    return false;
  };

  const clearEntryForm = () => {
    setForm({ ...EMPTY_FORM, role: form.role });
    setInfo('');
    setError('');
  };

  const addInvitee = (invitee, { fromSearch = false } = {}) => {
    if (isSelfPerson(invitee)) {
      setError(t('researcher.teamInvite.cannotAddSelf'));
      return false;
    }
    const valid = fromSearch ? isValidSearchInvitee(invitee) : isValidManualInvitee(invitee);
    if (!valid) {
      setError(fromSearch
        ? t('researcher.teamInvite.missingName')
        : t('researcher.teamInvite.completeNameEmail'));
      return false;
    }
    const key = getInviteeKey(invitee);
    if (invitees.some(p => getInviteeKey(p) === key)) {
      setError(t('researcher.teamInvite.alreadyOnList'));
      return false;
    }
    if (lockedInvitees.some(p => getInviteeKey(p) === key)) {
      setError(t('researcher.teamInvite.alreadyOnList'));
      return false;
    }
    onChange([...invitees, { ...invitee, role: invitee.role || form.role }]);
    clearEntryForm();
    setGivenName('');
    setFamilyName('');
    setOrcidResults([]);
    if (fromSearch && !invitee.email?.trim()) {
      setInfo(t('researcher.teamInvite.addedNeedEmail', { name: getDisplayName(invitee) }));
    }
    return true;
  };

  const removeInvitee = (key) => onChange(invitees.filter(p => getInviteeKey(p) !== key));

  const updateInviteeRole = (key, role) =>
    onChange(invitees.map(p => getInviteeKey(p) === key ? { ...p, role } : p));

  const updateInviteeEmail = (key, email) =>
    onChange(invitees.map(p => getInviteeKey(p) === key ? { ...p, email } : p));

  const buildInviteeFromPerson = (person, profile) => {
    const source = profile || person;
    const fullName = (source.name || person.name || '').trim();
    const { given, family } = parseNameParts(
      fullName,
      source.given_name || givenName,
      source.family_name || familyName,
    );
    return {
      given_name: source.given_name || given,
      family_name: source.family_name || family,
      name: fullName || `${given} ${family}`.trim(),
      email: source.email || person.email || '',
      affiliation: source.affiliation || person.affiliation || person.department || '',
      orcid: source.orcid || person.orcid || '',
      user_id: source.user_id || person.user_id || '',
      role: form.role,
      source: (source.user_id || person.user_id) ? 'institution' : 'orcid',
    };
  };

  const buildInviteeFromSuggested = (person) => {
    const { given, family } = parseNameParts(person.name);
    return {
      given_name: given,
      family_name: family,
      name: person.name,
      email: person.email || '',
      affiliation: person.department || '',
      orcid: person.orcid || '',
      user_id: person.user_id,
      role: form.role,
      source: 'suggested',
    };
  };

  const excludeUserIds = useMemo(
    () => [...lockedInvitees, ...invitees].filter(i => i.user_id).map(i => i.user_id).join(','),
    [invitees, lockedInvitees],
  );
  const manuscriptKeywordsKey = useMemo(
    () => (Array.isArray(manuscriptKeywords) ? manuscriptKeywords.join(',') : (manuscriptKeywords || '')),
    [manuscriptKeywords],
  );

  const loadSuggestions = useCallback(async () => {
    if (!showSuggestions) return;
    setLoadingSuggestions(true);
    try {
      const headers = authHeaders();
      let res;

      if (suggestionMode === 'manuscript') {
        res = await axios.get(`${API}/manuscripts/co-authors/suggest`, {
          params: {
            title: manuscriptTitle?.trim() || undefined,
            description: manuscriptDescription?.trim() || undefined,
            keywords: manuscriptKeywordsKey || undefined,
            department: manuscriptDepartment?.trim() || undefined,
            exclude_user_ids: excludeUserIds || undefined,
            limit: 6,
          },
          headers,
        });
      } else {
        res = await axios.get(`${API}/grants/proposals/collaborators/suggest`, {
          params: {
            opportunity_id: opportunityId || undefined,
            proposal_title: proposalTitle?.trim() || undefined,
            exclude_user_ids: excludeUserIds || undefined,
            limit: 6,
          },
          headers,
        });
      }

      setSuggestions(res.data?.suggestions || []);
      setSuggestionsAi(!!res.data?.ai_enhanced);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [
    showSuggestions,
    suggestionMode,
    opportunityId,
    proposalTitle,
    manuscriptTitle,
    manuscriptDescription,
    manuscriptKeywordsKey,
    manuscriptDepartment,
    excludeUserIds,
  ]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const openResearcherProfile = async (researcher) => {
    setSelectedResearcher(researcher);
    setProfileSnapshot(null);
    setProfileModalOpen(true);
    setLoadingSnapshot(true);
    try {
      const headers = authHeaders();
      let res;

      if (suggestionMode === 'manuscript') {
        const kw = Array.isArray(manuscriptKeywords)
          ? manuscriptKeywords.join(',')
          : (manuscriptKeywords || '');
        res = await axios.get(`${API}/manuscripts/co-authors/${researcher.user_id}/profile-snapshot`, {
          params: {
            title: manuscriptTitle?.trim() || undefined,
            description: manuscriptDescription?.trim() || undefined,
            keywords: kw || undefined,
            department: manuscriptDepartment?.trim() || undefined,
          },
          headers,
        });
      } else {
        res = await axios.get(`${API}/grants/proposals/collaborators/${researcher.user_id}/profile-snapshot`, {
          params: {
            opportunity_id: opportunityId || undefined,
            proposal_title: proposalTitle?.trim() || undefined,
          },
          headers,
        });
      }

      setProfileSnapshot(res.data);
    } catch {
      setProfileSnapshot(null);
    } finally {
      setLoadingSnapshot(false);
    }
  };

  const inviteFromProfile = () => {
    if (!selectedResearcher) return;
    const invitee = buildInviteeFromSuggested(selectedResearcher);
    if (addInvitee(invitee, { fromSearch: true })) {
      setProfileModalOpen(false);
      setSelectedResearcher(null);
      loadSuggestions();
    }
  };

  const searchOrcid = async () => {
    if (!givenName.trim() && !familyName.trim()) return;
    setSearchingOrcid(true);
    setError('');
    setInfo('');
    try {
      const res = await axios.get(`${API}/auth/orcid/search`, {
        params: { given_name: givenName.trim(), family_name: familyName.trim() },
        headers: authHeaders(),
      });
      setOrcidResults(res.data || []);
      if (!(res.data || []).length) {
        setInfo('No ORCID matches found. Try different spelling or use the Manual Entry tab.');
      }
    } catch {
      setOrcidResults([]);
      setError('ORCID search failed. Use the Manual Entry tab instead.');
    } finally {
      setSearchingOrcid(false);
    }
  };

  const lookupOrcidProfile = async (orcidId) => {
    if (!orcidId) return null;
    try {
      const res = await axios.get(`${API}/auth/orcid/lookup`, {
        params: { orcid_id: orcidId },
        headers: authHeaders(),
      });
      return res.data || null;
    } catch {
      return null;
    }
  };

  const selectOrcidPerson = async (person) => {
    if (isSelfPerson(person)) {
      setError(t('researcher.teamInvite.cannotInviteSelf'));
      return;
    }
    setAddingPerson(true);
    setError('');
    setInfo('');
    try {
      const profile = person.orcid ? await lookupOrcidProfile(person.orcid) : null;
      const invitee = buildInviteeFromPerson(person, profile);
      addInvitee(invitee, { fromSearch: true });
    } finally {
      setAddingPerson(false);
    }
  };

  const canAddCurrent = isValidManualInvitee(form);
  const selectedAlreadyAdded = selectedResearcher
    ? [...lockedInvitees, ...invitees].some(p => p.user_id && p.user_id === selectedResearcher.user_id)
    : false;

  return (
    <Box>
      {descriptionText && (
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>{descriptionText}</Typography>
      )}

      {showSuggestions && (
        <Box sx={{ mb: 2.5 }}>
          <SubLabel
            label={suggestionsLabelText}
            action={suggestionsAi ? (
              <Chip icon={<AiIcon sx={{ fontSize: 14 }} />} label={t('researcher.teamInvite.aiEnhanced')} size="small"
                sx={{ height: 22, fontSize: 10, fontWeight: 700, bgcolor: '#8b5cf618', color: '#7c3aed' }} />
            ) : null}
          />
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.5 }}>
            {suggestionsHintText}
          </Typography>

          {loadingSuggestions ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} sx={{ color: accent }} />
            </Box>
          ) : suggestions.length === 0 ? (
            <Box sx={{ p: 2.5, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
              <SuggestIcon sx={{ fontSize: 28, color: 'text.disabled', mb: 0.75 }} />
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                {t('researcher.teamInvite.noSuggestions')}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {suggestions.map(person => {
                const added = [...lockedInvitees, ...invitees].some(p => p.user_id && p.user_id === person.user_id);
                return (
                  <Paper
                    key={person.user_id}
                    elevation={0}
                    variant="outlined"
                    onClick={() => openResearcherProfile(person)}
                    sx={{
                      p: 1.5, borderRadius: 2, cursor: 'pointer',
                      transition: 'border-color 0.15s, background-color 0.15s',
                      borderColor: added ? `${accent}55` : 'divider',
                      bgcolor: added ? `${accent}06` : 'transparent',
                      '&:hover': { borderColor: accent, bgcolor: `${accent}08` },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                      <Box sx={{
                        width: 36, height: 36, borderRadius: '50%', bgcolor: '#8b5cf6', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
                      }}>
                        {person.name?.charAt(0) || '?'}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.25 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{person.name}</Typography>
                          {added && (
                            <Chip label={t('researcher.teamInvite.onTeam')} size="small" sx={{ height: 18, fontSize: 9, bgcolor: `${accent}18`, color: accent }} />
                          )}
                          {person.score > 0 && (
                            <Chip label={t('researcher.teamInvite.fitPercent', { percent: Math.round(person.score * 100) })} size="small"
                              sx={{ height: 18, fontSize: 9, bgcolor: 'action.hover', color: 'text.secondary' }} />
                          )}
                        </Box>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }} noWrap>
                          {[person.job_title, person.department].filter(Boolean).join(' · ')}
                        </Typography>
                        {person.match_explanation ? (
                          <Typography sx={{ fontSize: 11.5, color: accent, mt: 0.75, lineHeight: 1.4 }}>
                            {person.match_explanation}
                          </Typography>
                        ) : person.reasons?.[0] && (
                          <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.5 }}>{person.reasons[0]}</Typography>
                        )}
                        {person.expertise_keywords?.length > 0 && (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                            {person.expertise_keywords.slice(0, 4).map(kw => (
                              <Chip key={kw} label={kw} size="small" sx={{ height: 20, fontSize: 10 }} />
                            ))}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          )}
          <Divider sx={{ mt: 2.5 }} />
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button
          size="small"
          variant={inviteTab === 'orcid' ? 'contained' : 'text'}
          onClick={() => setInviteTab('orcid')}
          sx={{
            textTransform: 'none', fontWeight: 600, borderRadius: 2,
            bgcolor: inviteTab === 'orcid' ? accent : 'transparent',
            color: inviteTab === 'orcid' ? '#fff' : 'text.secondary',
            '&:hover': { bgcolor: inviteTab === 'orcid' ? '#0e8a85' : 'action.hover' },
          }}
        >
          {t('researcher.teamInvite.orcidSearch')}
        </Button>
        <Button
          size="small"
          variant={inviteTab === 'manual' ? 'contained' : 'text'}
          onClick={() => setInviteTab('manual')}
          sx={{
            textTransform: 'none', fontWeight: 600, borderRadius: 2,
            bgcolor: inviteTab === 'manual' ? accent : 'transparent',
            color: inviteTab === 'manual' ? '#fff' : 'text.secondary',
            '&:hover': { bgcolor: inviteTab === 'manual' ? '#0e8a85' : 'action.hover' },
          }}
        >
          {t('researcher.teamInvite.manualEntry')}
        </Button>
      </Box>

      {inviteTab === 'orcid' && (
        <>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.5 }}>
            {t('researcher.teamInvite.orcidSearchHint')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField size="small" label={t('researcher.teamInvite.givenName')} value={givenName}
              onChange={e => { setGivenName(e.target.value); setOrcidResults([]); }}
              onKeyDown={e => e.key === 'Enter' && searchOrcid()} sx={{ flex: 1, ...inp }} />
            <TextField size="small" label={t('researcher.teamInvite.familyName')} value={familyName}
              onChange={e => { setFamilyName(e.target.value); setOrcidResults([]); }}
              onKeyDown={e => e.key === 'Enter' && searchOrcid()} sx={{ flex: 1, ...inp }} />
            <Button variant="contained" onClick={searchOrcid}
              disabled={searchingOrcid || (!givenName.trim() && !familyName.trim())}
              sx={{ bgcolor: accent, '&:hover': { bgcolor: '#0e8a85' }, minWidth: 44, alignSelf: 'stretch' }}>
              {searchingOrcid ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
            </Button>
          </Box>

          {orcidResults.length > 0 && (
            <Box sx={{ mb: 2, maxHeight: 200, overflow: 'auto', border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
              {orcidResults.map((person, idx) => {
                const isSelf = isSelfPerson(person);
                return (
                <Box key={person.orcid || idx} sx={{
                  p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1,
                  borderBottom: idx < orcidResults.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                  opacity: isSelf ? 0.72 : 1,
                  bgcolor: isSelf ? 'action.hover' : 'transparent',
                  '&:hover': { bgcolor: 'action.hover' },
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
                    <Box sx={{
                      width: 32, height: 32, borderRadius: '50%', bgcolor: isSelf ? '#64748b' : accent, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
                    }}>
                      {person.name?.charAt(0) || '?'}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mb: 0.25 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{person.name || t('researcher.teamInvite.unknown')}</Typography>
                        {isSelf && (
                          <Chip label={t('researcher.teamInvite.you')} size="small" sx={{ height: 18, fontSize: 9, fontWeight: 700, bgcolor: '#64748b22', color: '#64748b' }} />
                        )}
                        {person.registered && !isSelf && (
                          <Chip label={t('researcher.teamInvite.registered')} size="small" sx={{ height: 18, fontSize: 9, fontWeight: 700, bgcolor: '#10b98122', color: '#10b981' }} />
                        )}
                      </Box>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }} noWrap>
                        {person.orcid}{person.affiliation ? ` · ${person.affiliation}` : ''}
                      </Typography>
                      {person.registered && person.email && !isSelf && (
                        <Typography sx={{ fontSize: 11, color: accent }} noWrap>{person.email}</Typography>
                      )}
                    </Box>
                  </Box>
                  <Tooltip title={isSelf ? t('researcher.teamInvite.cannotInviteSelfTooltip') : t('researcher.teamInvite.addToTeam')}>
                    <span>
                      <Button size="small" variant="outlined" startIcon={addingPerson ? <CircularProgress size={14} /> : <AddIcon />}
                        disabled={addingPerson || isSelf} onClick={() => selectOrcidPerson(person)}
                        sx={{ textTransform: 'none', borderRadius: 2, flexShrink: 0, borderColor: accent, color: accent }}>
                        {t('researcher.teamInvite.add')}
                      </Button>
                    </span>
                  </Tooltip>
                </Box>
              );})}
            </Box>
          )}
        </>
      )}

      {inviteTab === 'manual' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('researcher.teamInvite.manualEntryHint')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField size="small" label={t('researcher.teamInvite.givenNameRequired')} value={form.given_name}
              onChange={e => setForm(f => ({ ...f, given_name: e.target.value, user_id: '', source: 'manual' }))}
              sx={{ flex: '1 1 180px', ...inp }} />
            <TextField size="small" label={t('researcher.teamInvite.familyNameRequired')} value={form.family_name}
              onChange={e => setForm(f => ({ ...f, family_name: e.target.value, user_id: '', source: 'manual' }))}
              sx={{ flex: '1 1 180px', ...inp }} />
          </Box>
          <TextField fullWidth size="small" label={t('researcher.teamInvite.orcidId')} value={form.orcid}
            onChange={e => setForm(f => ({ ...f, orcid: e.target.value, user_id: '', source: 'manual' }))}
            placeholder="0000-0000-0000-0000"
            InputProps={{
              startAdornment: <InputAdornment position="start"><OrcidIcon sx={{ fontSize: 15, color: accent }} /></InputAdornment>,
            }}
            sx={inp} />
          <TextField fullWidth size="small" label={t('researcher.teamInvite.email')} type="email" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            helperText={t('researcher.teamInvite.emailHelper')}
            sx={inp} />
          <TextField fullWidth size="small" label={t('researcher.teamInvite.affiliationOptional')} value={form.affiliation}
            onChange={e => setForm(f => ({ ...f, affiliation: e.target.value }))}
            placeholder="Institution / Department"
            sx={inp} />
          <Button size="small" variant="outlined" startIcon={<AddIcon />}
            onClick={() => addInvitee({ ...form, role: form.role })}
            disabled={!canAddCurrent}
            sx={{ alignSelf: 'flex-start', textTransform: 'none', borderRadius: 2 }}>
            {t('researcher.teamInvite.addToTeamList')}
          </Button>
        </Box>
      )}

      <TextField fullWidth size="small" select label={roleLabelText} value={form.role}
        onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
        sx={{ ...inp }}>
        {roles.map(r => (
          <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize', fontSize: 12 }}>
            {formatRole(r)}
          </MenuItem>
        ))}
      </TextField>

      <Divider sx={{ my: 2.5 }} />
      <SubLabel label={`${listLabelText} (${invitees.length})`} />
      {invitees.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('researcher.teamInvite.emptyTeamList')}
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
                    {inv.orcid && (
                      <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{inv.orcid}</Typography>
                    )}
                    {inv.affiliation && (
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{inv.affiliation}</Typography>
                    )}
                    {!inv.email?.trim() ? (
                      <TextField size="small" label={t('researcher.teamInvite.emailForNotifications')} type="email"
                        value={inv.email || ''}
                        onChange={e => updateInviteeEmail(key, e.target.value)}
                        sx={{ mt: 1, width: '100%', ...inp }} />
                    ) : (
                      <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>{inv.email}</Typography>
                    )}
                    <FormControl size="small" sx={{ mt: 1, minWidth: 180, ...inp }}>
                      <InputLabel>Role</InputLabel>
                      <Select value={inv.role} label={t('researcher.teamInvite.role')} onChange={e => updateInviteeRole(key, e.target.value)}>
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

      {info && <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }} onClose={() => setInfo('')}>{info}</Alert>}
      {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <ResearcherProfileModal
        open={profileModalOpen}
        onClose={() => { setProfileModalOpen(false); setSelectedResearcher(null); }}
        researcher={selectedResearcher}
        snapshot={profileSnapshot}
        loading={loadingSnapshot}
        accent={accent}
        onInvite={inviteFromProfile}
        alreadyAdded={selectedAlreadyAdded}
        inviteLabel={inviteFromProfileLabelText}
      />
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
