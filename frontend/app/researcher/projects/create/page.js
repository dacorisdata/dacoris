'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Paper, TextField, CircularProgress, Alert,
  Divider, IconButton, Chip, useTheme, Autocomplete, MenuItem, Select,
  FormControl, InputLabel, FormControlLabel, Checkbox, InputAdornment,
  LinearProgress,
} from '@mui/material';
import {
  ArrowBack as BackIcon, ArrowForward as NextIcon, Save as SaveIcon,
  Add as AddIcon, Delete as DeleteIcon, CheckCircle as CheckIcon,
  Science as ProjectIcon, Group as TeamIcon, Description as DescIcon,
  Gavel as EthicsIcon, Flag as MilestoneIcon, AttachMoney as MoneyIcon,
  VerifiedUser as DeclareIcon, EmojiEvents as TrophyIcon, Person as PersonIcon,
  WorkspacePremium as OrcidIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';

const ACCENT = '#16a699';
const GOLD   = '#f59e0b';

const STEPS = [
  { label: 'Project Core',     Icon: ProjectIcon  },
  { label: 'Research Team',    Icon: TeamIcon     },
  { label: 'Research Details', Icon: DescIcon     },
  { label: 'Ethics & DMP',     Icon: EthicsIcon   },
  { label: 'Milestones',       Icon: MilestoneIcon },
  { label: 'Financials',       Icon: MoneyIcon    },
  { label: 'Declarations',     Icon: DeclareIcon  },
];

const inp = { '& .MuiOutlinedInput-root': { borderRadius: 2 } };

function FieldRow({ children }) {
  return (
    <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap', mb: 2.5 }}>
      {children}
    </Box>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: `${ACCENT}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon sx={{ fontSize: 19, color: ACCENT }} />
      </Box>
      <Box>
        <Typography sx={{ fontSize: 17, fontWeight: 800, lineHeight: 1.2 }}>{title}</Typography>
        {subtitle && <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.2 }}>{subtitle}</Typography>}
      </Box>
    </Box>
  );
}

function SubLabel({ label }) {
  return (
    <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.7, mb: 1.5 }}>
      {label}
    </Typography>
  );
}

const RESEARCH_AREAS = [
  'Clinical Research',
  'Social Sciences',
  'Engineering & Technology',
  'Natural Sciences',
  'Agricultural Sciences',
  'Health Sciences',
  'Environmental Sciences',
  'Computer Science',
  'Other',
];

const TEAM_ROLES = [
  'Lead Researcher',
  'Co-Investigator',
  'Data Analyst',
  'Field Coordinator',
  'Statistician',
  'Research Assistant',
  'Technical Support',
  'Other',
];

export default function CreateProjectPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [loading,    setLoading]    = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');
  const [awardData,  setAwardData]  = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    // Step 1: Project Core
    title: '',
    shortTitle: '',
    researchArea: '',
    startDate: '',
    endDate: '',

    // Step 2: Research Team
    piOrcid: '',
    piName: '',
    piInstitution: '',
    piDepartment: '',
    piEmail: '',
    coInvestigators: [],
    adminLead: '',
    technicalSupport: '',

    // Step 3: Research Details
    abstract: '',
    background: '',
    methodology: '',
    impactStatement: '',
    keywords: [],
    forCodes: [],

    // Step 4: Ethics & Compliance
    ethicsStatus: 'not_required',
    linkedEthicsApp: '',
    ethicsDocuments: [],
    conflictOfInterest: '',
    dmpLinked: '',
    dataStorage: '',

    // Step 5: Milestones
    milestones: [],

    // Step 6: Financials
    awardId: '',
    fundingSource: '',
    totalAward: '',
    currency: 'KES',
    grantType: '',
    budgetBreakdown: [],

    // Step 7: Declarations
    resourceRequirements: '',
    piDeclaration: false,
    hodReviewer: '',
  });

  useEffect(() => {
    fetchUser().then(u => {
      if (!u) { router.push('/login'); return; }
      const stored = sessionStorage.getItem('awardData');
      if (stored) {
        const award = JSON.parse(stored);
        setAwardData(award);
        const coIs = (award.collaborators || []).map(c => ({
          orcid:       c.user?.orcid || c.orcid        || '',
          name:        c.user?.name  || c.invited_name || '',
          institution: c.user?.institution_name        || '',
          email:       c.user?.email || c.email        || '',
          role:        c.role                          || 'Co-Investigator',
          effort:      '',
        }));
        setFormData(prev => ({
          ...prev,
          title:           award.proposal_title  || '',
          awardId:         award.award_number    || '',
          fundingSource:   award.funder_name     || '',
          totalAward:      award.total_amount    || '',
          currency:        award.currency        || 'KES',
          startDate:       award.start_date      || '',
          endDate:         award.end_date        || '',
          budgetBreakdown: award.budget_lines    || [],
          piName:          award.pi_name         || '',
          piEmail:         award.pi_email        || '',
          piOrcid:         award.pi_orcid        || '',
          piInstitution:   award.pi_institution  || '',
          piDepartment:    award.pi_department   || '',
          coInvestigators: coIs,
        }));
      }
      setLoading(false);
    });
  }, []);

  const set = (f, v) => setFormData(p => ({ ...p, [f]: v }));

  const addCoI = () => setFormData(p => ({
    ...p, coInvestigators: [...p.coInvestigators, { orcid: '', name: '', institution: '', email: '', role: '', effort: '' }],
  }));
  const updCoI = (i, f, v) => setFormData(p => ({
    ...p, coInvestigators: p.coInvestigators.map((c, idx) => idx === i ? { ...c, [f]: v } : c),
  }));
  const delCoI = i => setFormData(p => ({ ...p, coInvestigators: p.coInvestigators.filter((_, idx) => idx !== i) }));

  const addMs = () => setFormData(p => ({
    ...p, milestones: [...p.milestones, { title: '', description: '', targetDate: '', deliverables: '' }],
  }));
  const updMs = (i, f, v) => setFormData(p => ({
    ...p, milestones: p.milestones.map((m, idx) => idx === i ? { ...m, [f]: v } : m),
  }));
  const delMs = i => setFormData(p => ({ ...p, milestones: p.milestones.filter((_, idx) => idx !== i) }));

  const handleSaveDraft = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSuccess('Draft saved');
    setSaving(false);
  };

  const handleSubmit = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSuccess('Project submitted successfully');
    setTimeout(() => router.push('/researcher/projects'), 1500);
    setSaving(false);
  };

  const duration = formData.startDate && formData.endDate
    ? Math.round((new Date(formData.endDate) - new Date(formData.startDate)) / (1000 * 60 * 60 * 24 * 30))
    : 0;
  const progress = Math.round(((activeStep + 1) / STEPS.length) * 100);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress sx={{ color: ACCENT }} />
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>

      {/* ── Top bar ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button size="small" startIcon={<BackIcon sx={{ fontSize: 15 }} />}
            onClick={() => router.push('/researcher/grants/awards')}
            sx={{ textTransform: 'none', color: 'text.secondary', borderRadius: 2 }}>
            Back to Awards
          </Button>
          <Typography sx={{ color: 'divider' }}>|</Typography>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>Create Research Project</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              {awardData ? `From award ${awardData.award_number} · ${awardData.proposal_title}` : 'New project submission'}
            </Typography>
          </Box>
        </Box>
        <Button size="small" variant="outlined" startIcon={saving ? <CircularProgress size={13} /> : <SaveIcon sx={{ fontSize: 14 }} />}
          onClick={handleSaveDraft} disabled={saving}
          sx={{ textTransform: 'none', borderRadius: 2, fontSize: 12 }}>
          Save Draft
        </Button>
      </Box>

      {/* ── Award banner ── */}
      {awardData && (
        <Paper elevation={0} sx={{
          mb: 3, px: 2.5, py: 1.5, borderRadius: 2.5,
          background: dark ? 'linear-gradient(135deg,#78350f18,#92400e18)' : 'linear-gradient(135deg,#fffbeb,#fef3c7)',
          border: `1px solid ${GOLD}44`,
          display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
        }}>
          <TrophyIcon sx={{ fontSize: 18, color: GOLD }} />
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: GOLD }}>Converting Awarded Grant</Typography>
            <Typography sx={{ fontSize: 12, color: dark ? '#fcd34d' : '#78350f' }}>
              {awardData.funder_name} · {awardData.currency} {Number(awardData.total_amount).toLocaleString()} · {awardData.award_number}
            </Typography>
          </Box>
          <Chip label="Pre-populated" size="small" sx={{ bgcolor: `${GOLD}22`, color: GOLD, fontWeight: 700, fontSize: 11 }} />
        </Paper>
      )}

      {error   && <Alert severity="error"   sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{success}</Alert>}

      {/* ── Two-col layout: sidebar + content ── */}
      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>

        {/* ── Sidebar stepper ── */}
        <Paper elevation={0} variant="outlined" sx={{
          width: 220, flexShrink: 0, borderRadius: 3, overflow: 'hidden',
          display: { xs: 'none', lg: 'block' },
          position: 'sticky', top: 24,
        }}>
          <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.7, mb: 1 }}>Progress</Typography>
            <LinearProgress variant="determinate" value={progress}
              sx={{ height: 5, borderRadius: 3, bgcolor: 'divider', '& .MuiLinearProgress-bar': { bgcolor: ACCENT } }} />
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>{progress}% complete</Typography>
          </Box>
          <Box sx={{ py: 1 }}>
            {STEPS.map((s, i) => {
              const done   = i < activeStep;
              const active = i === activeStep;
              const { Icon } = s;
              return (
                <Box key={s.label} onClick={() => setActiveStep(i)} sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  px: 2, py: 1.2, cursor: 'pointer',
                  bgcolor: active ? `${ACCENT}12` : 'transparent',
                  borderLeft: active ? `3px solid ${ACCENT}` : '3px solid transparent',
                  transition: 'all 0.15s',
                  '&:hover': { bgcolor: active ? `${ACCENT}12` : 'action.hover' },
                }}>
                  <Box sx={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: done ? ACCENT : active ? `${ACCENT}20` : 'action.hover',
                  }}>
                    {done
                      ? <CheckIcon sx={{ fontSize: 14, color: '#fff' }} />
                      : <Icon sx={{ fontSize: 14, color: active ? ACCENT : 'text.disabled' }} />}
                  </Box>
                  <Typography sx={{
                    fontSize: 12, fontWeight: active ? 700 : 500,
                    color: active ? ACCENT : done ? 'text.primary' : 'text.secondary',
                    lineHeight: 1.3,
                  }}>{s.label}</Typography>
                </Box>
              );
            })}
          </Box>
        </Paper>

        {/* ── Main form ── */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, p: { xs: 2.5, md: 4 }, mb: 2.5 }}>

            {/* Step 1 */}
            {activeStep === 0 && (
              <Box>
                <SectionHeader icon={ProjectIcon} title="Project Core Information" subtitle="Foundational identity and timeline of the research project" />
                <Box sx={{ mb: 2.5 }}>
                  <TextField fullWidth label="Project Title" value={formData.title}
                    onChange={e => set('title', e.target.value)}
                    placeholder="Full descriptive title of the research" sx={inp} />
                </Box>
                <FieldRow>
                  <TextField label="Short / Running Title" value={formData.shortTitle}
                    onChange={e => set('shortTitle', e.target.value)}
                    placeholder="Max 50 characters" inputProps={{ maxLength: 50 }}
                    helperText={`${formData.shortTitle.length}/50`}
                    sx={{ ...inp, flex: '1 1 280px' }} />
                  <FormControl sx={{ flex: '1 1 280px' }}>
                    <InputLabel>Primary Research Area</InputLabel>
                    <Select value={formData.researchArea} label="Primary Research Area"
                      onChange={e => set('researchArea', e.target.value)} sx={{ borderRadius: 2 }}>
                      {RESEARCH_AREAS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                    </Select>
                  </FormControl>
                </FieldRow>
                <Divider sx={{ my: 2.5 }} />
                <SubLabel label="Project Timeline" />
                <FieldRow>
                  <TextField type="date" label="Proposed Start Date" value={formData.startDate}
                    onChange={e => set('startDate', e.target.value)} InputLabelProps={{ shrink: true }}
                    sx={{ ...inp, flex: '1 1 200px' }} />
                  <TextField type="date" label="Proposed End Date" value={formData.endDate}
                    onChange={e => set('endDate', e.target.value)} InputLabelProps={{ shrink: true }}
                    sx={{ ...inp, flex: '1 1 200px' }} />
                  <TextField label="Duration" disabled
                    value={duration > 0 ? `${duration} month${duration !== 1 ? 's' : ''}` : '—'}
                    helperText="Auto-calculated" sx={{ ...inp, flex: '0 1 170px' }} />
                </FieldRow>
              </Box>
            )}

            {/* Step 2 */}
            {activeStep === 1 && (
              <Box>
                <SectionHeader icon={TeamIcon} title="Research Team" subtitle="Personnel, ORCID integration, and role assignment" />
                <SubLabel label="Principal Investigator" />
                <Paper elevation={0} sx={{ bgcolor: dark ? `${ACCENT}08` : `${ACCENT}06`, border: `1px solid ${ACCENT}30`, borderRadius: 2.5, p: 2.5, mb: 3 }}>
                  <FieldRow>
                    <TextField size="small" label="ORCID iD" value={formData.piOrcid}
                      onChange={e => set('piOrcid', e.target.value)} placeholder="0000-0000-0000-0000"
                      InputProps={{ startAdornment: <InputAdornment position="start"><OrcidIcon sx={{ fontSize: 15, color: ACCENT }} /></InputAdornment> }}
                      sx={{ ...inp, flex: '1 1 200px' }} />
                    <TextField size="small" label="Full Name" value={formData.piName}
                      onChange={e => set('piName', e.target.value)}
                      InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon sx={{ fontSize: 15, color: 'text.disabled' }} /></InputAdornment> }}
                      sx={{ ...inp, flex: '1 1 200px' }} />
                    <TextField size="small" label="Email" value={formData.piEmail}
                      onChange={e => set('piEmail', e.target.value)} sx={{ ...inp, flex: '1 1 200px' }} />
                  </FieldRow>
                  <FieldRow>
                    <TextField size="small" label="Institution" value={formData.piInstitution}
                      onChange={e => set('piInstitution', e.target.value)} sx={{ ...inp, flex: '1 1 260px' }} />
                    <TextField size="small" label="Department" value={formData.piDepartment}
                      onChange={e => set('piDepartment', e.target.value)} sx={{ ...inp, flex: '1 1 260px' }} />
                  </FieldRow>
                </Paper>

                <Divider sx={{ mb: 2.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <SubLabel label="Co-Investigators" />
                  <Button size="small" startIcon={<AddIcon sx={{ fontSize: 14 }} />} onClick={addCoI}
                    sx={{ textTransform: 'none', borderRadius: 2, fontSize: 12, mb: 1.5 }}>
                    Add Co-Investigator
                  </Button>
                </Box>
                {formData.coInvestigators.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2.5, mb: 2.5 }}>
                    <TeamIcon sx={{ fontSize: 30, color: 'text.disabled', mb: 0.5 }} />
                    <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No co-investigators added yet</Typography>
                  </Box>
                ) : formData.coInvestigators.map((ci, i) => (
                  <Paper key={i} elevation={0} variant="outlined" sx={{ p: 2.5, mb: 2, borderRadius: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>Co-Investigator {i + 1}</Typography>
                      <IconButton size="small" onClick={() => delCoI(i)} sx={{ color: '#ef4444' }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
                    </Box>
                    <FieldRow>
                      <TextField size="small" label="ORCID iD" value={ci.orcid} onChange={e => updCoI(i, 'orcid', e.target.value)} sx={{ ...inp, flex: '1 1 160px' }} />
                      <TextField size="small" label="Name" value={ci.name} onChange={e => updCoI(i, 'name', e.target.value)} sx={{ ...inp, flex: '1 1 160px' }} />
                      <TextField size="small" label="Institution" value={ci.institution} onChange={e => updCoI(i, 'institution', e.target.value)} sx={{ ...inp, flex: '1 1 160px' }} />
                      <TextField size="small" label="Email" value={ci.email} onChange={e => updCoI(i, 'email', e.target.value)} sx={{ ...inp, flex: '1 1 160px' }} />
                    </FieldRow>
                    <FieldRow>
                      <FormControl size="small" sx={{ flex: '2 1 200px' }}>
                        <InputLabel>Role</InputLabel>
                        <Select value={ci.role} label="Role" onChange={e => updCoI(i, 'role', e.target.value)} sx={{ borderRadius: 2 }}>
                          {TEAM_ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                        </Select>
                      </FormControl>
                      <TextField size="small" label="Effort %" type="number" value={ci.effort}
                        onChange={e => updCoI(i, 'effort', e.target.value)}
                        InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                        sx={{ ...inp, flex: '0 1 130px' }} />
                    </FieldRow>
                  </Paper>
                ))}

                <Divider sx={{ my: 2.5 }} />
                <SubLabel label="Support Staff" />
                <FieldRow>
                  <TextField label="Admin Lead" value={formData.adminLead}
                    onChange={e => set('adminLead', e.target.value)} placeholder="Logistical contact"
                    sx={{ ...inp, flex: '1 1 260px' }} />
                  <TextField label="Technical Support" value={formData.technicalSupport}
                    onChange={e => set('technicalSupport', e.target.value)} placeholder="Lab or IT support"
                    sx={{ ...inp, flex: '1 1 260px' }} />
                </FieldRow>
              </Box>
            )}

            {/* Step 3 */}
            {activeStep === 2 && (
              <Box>
                <SectionHeader icon={DescIcon} title="Research Details" subtitle="Scientific inquiry, rationale, and methodology" />
                <Box sx={{ mb: 2.5 }}>
                  <TextField fullWidth multiline rows={4} label="Abstract / Lay Summary"
                    value={formData.abstract} onChange={e => set('abstract', e.target.value)}
                    placeholder="High-level overview of the research (Max 500 words)"
                    helperText={`${formData.abstract.split(/\s+/).filter(w => w).length} / 500 words`}
                    sx={inp} />
                </Box>
                <Box sx={{ mb: 2.5 }}>
                  <TextField fullWidth multiline rows={5} label="Background & Objectives"
                    value={formData.background} onChange={e => set('background', e.target.value)}
                    placeholder="Problem statement and numbered aims" sx={inp} />
                </Box>
                <Box sx={{ mb: 2.5 }}>
                  <TextField fullWidth multiline rows={6} label="Methodology"
                    value={formData.methodology} onChange={e => set('methodology', e.target.value)}
                    placeholder="Detailed research design and experimental procedures" sx={inp} />
                </Box>
                <Box sx={{ mb: 2.5 }}>
                  <TextField fullWidth multiline rows={3} label="Impact Statement"
                    value={formData.impactStatement} onChange={e => set('impactStatement', e.target.value)}
                    placeholder="Potential contributions and expected outcomes" sx={inp} />
                </Box>
                <FieldRow>
                  <Autocomplete multiple freeSolo options={[]} value={formData.keywords}
                    onChange={(_, v) => set('keywords', v)}
                    renderInput={p => <TextField {...p} label="Keywords" placeholder="Type and press Enter (5–7 recommended)" />}
                    renderTags={(v, getTagProps) => v.map((opt, i) => (
                      <Chip key={i} label={opt} size="small" sx={{ bgcolor: `${ACCENT}18`, color: ACCENT }} {...getTagProps({ index: i })} />
                    ))}
                    sx={{ flex: '1 1 300px' }}
                  />
                  <Autocomplete multiple freeSolo options={[]} value={formData.forCodes}
                    onChange={(_, v) => set('forCodes', v)}
                    renderInput={p => <TextField {...p} label="FoR Codes" placeholder="Field of Research codes" />}
                    renderTags={(v, getTagProps) => v.map((opt, i) => (
                      <Chip key={i} label={opt} size="small" {...getTagProps({ index: i })} />
                    ))}
                    sx={{ flex: '1 1 300px' }}
                  />
                </FieldRow>
              </Box>
            )}

            {/* Step 4 */}
            {activeStep === 3 && (
              <Box>
                <SectionHeader icon={EthicsIcon} title="Ethics, Compliance & Data Management" subtitle="Regulatory requirements and data stewardship" />
                <SubLabel label="Ethics & Integrity" />
                <FieldRow>
                  <FormControl sx={{ flex: '1 1 260px' }}>
                    <InputLabel>Ethics Approval Status</InputLabel>
                    <Select value={formData.ethicsStatus} label="Ethics Approval Status"
                      onChange={e => set('ethicsStatus', e.target.value)} sx={{ borderRadius: 2 }}>
                      <MenuItem value="not_required">Not Required</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="approved">Approved</MenuItem>
                      <MenuItem value="linked">Linked to Existing Application</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField label="Linked Ethics Application" value={formData.linkedEthicsApp}
                    onChange={e => set('linkedEthicsApp', e.target.value)}
                    placeholder="Reference number" disabled={formData.ethicsStatus !== 'linked'}
                    sx={{ ...inp, flex: '1 1 260px' }} />
                </FieldRow>
                <Box sx={{ mb: 2.5 }}>
                  <TextField fullWidth multiline rows={3} label="Conflict of Interest Disclosure"
                    value={formData.conflictOfInterest} onChange={e => set('conflictOfInterest', e.target.value)}
                    placeholder="Disclose any financial or personal interests that may affect objectivity" sx={inp} />
                </Box>
                <Divider sx={{ my: 2.5 }} />
                <SubLabel label="Data Management Plan" />
                <Box sx={{ mb: 2.5 }}>
                  <TextField fullWidth label="DMP Link (Optional)" value={formData.dmpLinked}
                    onChange={e => set('dmpLinked', e.target.value)}
                    placeholder="Link to DMPOnline or similar external DMP tool" sx={inp} />
                </Box>
                <TextField fullWidth multiline rows={4} label="Data Storage & Security Protocols"
                  value={formData.dataStorage} onChange={e => set('dataStorage', e.target.value)}
                  placeholder="Describe data handling, storage location, access controls, and long-term preservation" sx={inp} />
              </Box>
            )}

            {/* Step 5 */}
            {activeStep === 4 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: `${ACCENT}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MilestoneIcon sx={{ fontSize: 19, color: ACCENT }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 17, fontWeight: 800, lineHeight: 1.2 }}>Project Milestones</Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.2 }}>Define the project roadmap and tangible outputs</Typography>
                    </Box>
                  </Box>
                  <Button size="small" variant="contained" startIcon={<AddIcon sx={{ fontSize: 14 }} />} onClick={addMs}
                    sx={{ textTransform: 'none', borderRadius: 2, fontSize: 12, flexShrink: 0, bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}>
                    Add Milestone
                  </Button>
                </Box>
                {formData.milestones.length === 0 ? (
                  <Box sx={{ p: 5, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2.5 }}>
                    <MilestoneIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
                    <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>No milestones yet</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 0.4 }}>Click "Add Milestone" to define the project roadmap</Typography>
                  </Box>
                ) : formData.milestones.map((ms, i) => (
                  <Paper key={i} elevation={0} variant="outlined" sx={{ p: 2.5, mb: 2, borderRadius: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography sx={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>{i + 1}</Typography>
                        </Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Milestone {i + 1}</Typography>
                      </Box>
                      <IconButton size="small" onClick={() => delMs(i)} sx={{ color: '#ef4444' }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
                    </Box>
                    <FieldRow>
                      <TextField size="small" label="Milestone Title" value={ms.title}
                        onChange={e => updMs(i, 'title', e.target.value)} placeholder="e.g., Recruitment Phase 1"
                        sx={{ ...inp, flex: '2 1 280px' }} />
                      <TextField size="small" type="date" label="Target Date" value={ms.targetDate}
                        onChange={e => updMs(i, 'targetDate', e.target.value)} InputLabelProps={{ shrink: true }}
                        sx={{ ...inp, flex: '1 1 170px' }} />
                    </FieldRow>
                    <Box sx={{ mb: 1.5 }}>
                      <TextField size="small" fullWidth multiline rows={2} label="Description" value={ms.description}
                        onChange={e => updMs(i, 'description', e.target.value)} placeholder="Detailed success criteria" sx={inp} />
                    </Box>
                    <TextField size="small" fullWidth label="Expected Deliverables" value={ms.deliverables}
                      onChange={e => updMs(i, 'deliverables', e.target.value)}
                      placeholder="e.g., Dataset, Interim Report, Prototype, Peer-reviewed paper" sx={inp} />
                  </Paper>
                ))}
              </Box>
            )}

            {/* Step 6 */}
            {activeStep === 5 && (
              <Box>
                <SectionHeader icon={MoneyIcon} title="Financial Details" subtitle="Funding accountability and award details" />
                <SubLabel label="Award Details" />
                <FieldRow>
                  <TextField label="Award ID" value={formData.awardId}
                    onChange={e => set('awardId', e.target.value)} placeholder="Reference from funding body"
                    sx={{ ...inp, flex: '1 1 200px' }} />
                  <TextField label="Funding Source" value={formData.fundingSource}
                    onChange={e => set('fundingSource', e.target.value)} placeholder="e.g., Wellcome Trust, NSF, ERC"
                    sx={{ ...inp, flex: '2 1 280px' }} />
                </FieldRow>
                <FieldRow>
                  <TextField label="Total Award Amount" type="number" value={formData.totalAward}
                    onChange={e => set('totalAward', e.target.value)} sx={{ ...inp, flex: '2 1 200px' }} />
                  <FormControl sx={{ flex: '1 1 120px' }}>
                    <InputLabel>Currency</InputLabel>
                    <Select value={formData.currency} label="Currency"
                      onChange={e => set('currency', e.target.value)} sx={{ borderRadius: 2 }}>
                      {['KES','USD','EUR','GBP'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl sx={{ flex: '1 1 200px' }}>
                    <InputLabel>Grant Type</InputLabel>
                    <Select value={formData.grantType} label="Grant Type"
                      onChange={e => set('grantType', e.target.value)} sx={{ borderRadius: 2 }}>
                      <MenuItem value="seed">Seed Grant</MenuItem>
                      <MenuItem value="fellowship">Fellowship</MenuItem>
                      <MenuItem value="multi_year">Multi-year Grant</MenuItem>
                      <MenuItem value="equipment">Equipment Grant</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </FieldRow>
                {formData.budgetBreakdown.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Divider sx={{ mb: 2.5 }} />
                    <SubLabel label="Budget Breakdown" />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {formData.budgetBreakdown.map((item, i) => {
                        const total = formData.budgetBreakdown.reduce((s, b) => s + (b.amount || 0), 0);
                        const pct   = total > 0 ? Math.round((item.amount / total) * 100) : 0;
                        return (
                          <Box key={i} sx={{
                            display: 'flex', alignItems: 'center', gap: 2,
                            p: 1.5, borderRadius: 2,
                            bgcolor: dark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                            border: '1px solid', borderColor: 'divider',
                          }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 600, flex: '0 0 110px' }}>{item.category}</Typography>
                            <Box sx={{ flex: 1 }}>
                              <LinearProgress variant="determinate" value={pct}
                                sx={{ height: 5, borderRadius: 3, bgcolor: 'divider', '& .MuiLinearProgress-bar': { bgcolor: ACCENT } }} />
                            </Box>
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: ACCENT, flex: '0 0 150px', textAlign: 'right' }}>
                              {formData.currency} {Number(item.amount).toLocaleString()}
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: 'text.secondary', flex: '0 0 34px', textAlign: 'right' }}>{pct}%</Typography>
                          </Box>
                        );
                      })}
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 800 }}>
                          Total: {formData.currency} {Number(formData.budgetBreakdown.reduce((s, b) => s + (b.amount || 0), 0)).toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                )}
              </Box>
            )}

            {/* Step 7 */}
            {activeStep === 6 && (
              <Box>
                <SectionHeader icon={DeclareIcon} title="Final Declarations" subtitle="Legal and institutional sign-off" />
                <Box sx={{ mb: 2.5 }}>
                  <TextField fullWidth multiline rows={3} label="Resource Requirements"
                    value={formData.resourceRequirements} onChange={e => set('resourceRequirements', e.target.value)}
                    placeholder="Describe lab space, HPC, shared equipment or other institutional resources needed" sx={inp} />
                </Box>
                <Box sx={{ mb: 3 }}>
                  <TextField fullWidth label="Head of Department (Internal Routing)"
                    value={formData.hodReviewer} onChange={e => set('hodReviewer', e.target.value)}
                    placeholder="Name or email of reviewing Head of Department" sx={inp} />
                </Box>
                <Paper elevation={0} sx={{
                  p: 2.5, borderRadius: 2.5,
                  bgcolor: dark ? `${ACCENT}08` : `${ACCENT}06`,
                  border: `1px solid ${ACCENT}30`,
                }}>
                  <FormControlLabel
                    control={
                      <Checkbox checked={formData.piDeclaration}
                        onChange={e => set('piDeclaration', e.target.checked)}
                        sx={{ '&.Mui-checked': { color: ACCENT } }} />
                    }
                    label={
                      <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.3 }}>PI Declaration</Typography>
                        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.65 }}>
                          I confirm that all information provided in this submission is accurate and complete to the best of my knowledge.
                          I agree to comply with all institutional policies, ethical guidelines, and requirements of the funding body.
                          I understand that this project is subject to internal review and approval before commencing.
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: 'flex-start', gap: 0.5 }}
                  />
                </Paper>
                {!formData.piDeclaration && (
                  <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
                    You must accept the PI Declaration before submitting.
                  </Alert>
                )}
              </Box>
            )}

          </Paper>

          {/* ── Navigation footer ── */}
          <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Button variant="outlined" startIcon={<BackIcon sx={{ fontSize: 15 }} />}
              onClick={() => setActiveStep(p => Math.max(p - 1, 0))}
              disabled={activeStep === 0}
              sx={{ textTransform: 'none', borderRadius: 2, fontSize: 13 }}>
              Previous
            </Button>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              {STEPS.map((_, i) => (
                <Box key={i} onClick={() => setActiveStep(i)} sx={{
                  width: i === activeStep ? 20 : 8, height: 8, borderRadius: 4, cursor: 'pointer',
                  bgcolor: i < activeStep ? ACCENT : i === activeStep ? ACCENT : 'divider',
                  opacity: i === activeStep ? 1 : 0.5,
                  transition: 'all 0.2s',
                }} />
              ))}
            </Box>

            {activeStep === STEPS.length - 1 ? (
              <Button variant="contained" onClick={handleSubmit}
                disabled={saving || !formData.piDeclaration}
                startIcon={saving ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : <CheckIcon sx={{ fontSize: 15 }} />}
                sx={{ textTransform: 'none', borderRadius: 2, fontSize: 13, px: 3, bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}>
                Submit Project
              </Button>
            ) : (
              <Button variant="contained" onClick={() => setActiveStep(p => Math.min(p + 1, STEPS.length - 1))}
                endIcon={<NextIcon sx={{ fontSize: 15 }} />}
                sx={{ textTransform: 'none', borderRadius: 2, fontSize: 13, px: 3, bgcolor: ACCENT, '&:hover': { bgcolor: '#14958a' } }}>
                Next Step
              </Button>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}

