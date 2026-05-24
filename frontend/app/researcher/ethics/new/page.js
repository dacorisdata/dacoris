'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box, Typography, Button, Paper, TextField, CircularProgress, Alert,
  Divider, IconButton, Chip, useTheme, MenuItem, Select, FormControl,
  InputLabel, FormControlLabel, Checkbox, LinearProgress, Switch,
} from '@mui/material';
import {
  ArrowBack as BackIcon, Save as SaveIcon, Add as AddIcon,
  Delete as DeleteIcon, CheckCircle as CheckIcon,
  Gavel as EthicsIcon, Group as ParticipantIcon,
  Warning as RiskIcon, VerifiedUser as ConsentIcon,
  Lock as PrivacyIcon, AccountBalance as FundingIcon,
  FactCheck as DeclareIcon, UploadFile as UploadIcon,
  WorkspacePremium as OrcidIcon, Science as ProjectIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../lib/api';
import { SAMPLE_PROJECTS } from '../../projects/page';
import { accentScrollbarSx } from '../../../../lib/scrollStyles';

const ACCENT = '#1ca7a1';

const STEPS = [
  { label: 'Project & Personnel', Icon: ProjectIcon    },
  { label: 'Participants',        Icon: ParticipantIcon },
  { label: 'Risk & Benefits',     Icon: RiskIcon        },
  { label: 'Informed Consent',    Icon: ConsentIcon     },
  { label: 'Data Privacy',        Icon: PrivacyIcon     },
  { label: 'COI & Funding',       Icon: FundingIcon     },
  { label: 'Declarations',        Icon: DeclareIcon     },
];

const inp = { '& .MuiOutlinedInput-root': { borderRadius: 2 } };
const multilineInp = {
  ...inp,
  '& .MuiInputBase-inputMultiline': { overflow: 'hidden !important', resize: 'none' },
};

function FieldRow({ children }) {
  return <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap', mb: 2.5 }}>{children}</Box>;
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

function DropZone({ label, file, onFile, accent }) {
  const theme = useTheme();
  const onDrop = useCallback(accepted => { if (accepted[0]) onFile(accepted[0]); }, [onFile]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: false });
  return (
    <Box>
      <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.75 }}>{label}</Typography>
      <Box {...getRootProps()} sx={{
        border: `2px dashed ${isDragActive ? accent : theme.palette.divider}`,
        borderRadius: 2, p: 2.5, textAlign: 'center', cursor: 'pointer',
        bgcolor: isDragActive ? `${accent}08` : 'transparent',
        transition: 'all 0.15s',
        '&:hover': { borderColor: accent, bgcolor: `${accent}06` },
      }}>
        <input {...getInputProps()} />
        <UploadIcon sx={{ fontSize: 22, color: 'text.disabled', mb: 0.5 }} />
        {file ? (
          <Typography sx={{ fontSize: 12, color: accent, fontWeight: 600 }}>{file.name}</Typography>
        ) : (
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            {isDragActive ? 'Drop here' : 'Drag & drop or click to upload'}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

const VULNERABLE_GROUPS = ['Minors (under 18)', 'Pregnant women', 'Prisoners / Detainees', 'Cognitively impaired', 'Indigenous populations', 'Elderly (65+)', 'Students / Employees (undue influence)', 'Economically disadvantaged'];
const RISK_CATEGORIES   = ['Physical', 'Psychological', 'Social', 'Legal', 'Economic', 'Reputational', 'Loss of privacy'];
const ETHICAL_CODES     = ['Declaration of Helsinki', 'Belmont Report', 'CIOMS Guidelines', 'ICH-GCP', 'Nuremberg Code'];

export default function NewEthicsApplicationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fetchUser } = useAuth();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [loading,    setLoading]    = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');
  const [projects,   setProjects]   = useState([]);

  const [formData, setFormData] = useState({
    // Step 1
    linkToProject:   false,
    projectId:       '',
    projectTitle:    '',
    applicationType: 'initial_review',
    piName:          '',
    piOrcid:         '',
    piInstitution:   '',
    startDate:       '',
    endDate:         '',
    ethicsLead:      '',
    ethicsLeadEmail: '',
    trainingCertFile: null,

    // Step 2
    ageRange:          '',
    genderProfile:     '',
    socioEconomic:     '',
    vulnerableGroups:  [],
    recruitmentMethod: '',
    totalParticipants: '',
    statisticalPower:  '',

    // Step 3
    riskCategories:       [],
    riskMitigation:       '',
    adverseEventProtocol: '',
    directBenefits:       '',
    indirectBenefits:     '',

    // Step 4
    consentType:        'written',
    consentProcess:     '',
    languageProvisions: '',
    pisFile:            null,
    icfFile:            null,

    // Step 5
    identifiability: 'de_identified',
    keyStorage:      '',
    keyAccess:       '',

    // Step 6
    financialDisclosure: '',
    dualRoles:           '',

    // Step 7
    ethicalCodes:    [],
    additionalNotes: '',
    piDeclaration:   false,
    declarationDate: '',
  });

  const set = (f, v) => setFormData(p => ({ ...p, [f]: v }));

  const toggleArr = (field, val) => setFormData(p => ({
    ...p,
    [field]: p[field].includes(val) ? p[field].filter(x => x !== val) : [...p[field], val],
  }));

  useEffect(() => {
    fetchUser().then(async u => {
      if (!u) { router.push('/login'); return; }
      try {
        const res = await api.get('/research/projects');
        const live = res.data || [];
        const list = live.length > 0 ? live : SAMPLE_PROJECTS;
        setProjects(list);
        const linkedProjectId = searchParams.get('project');
        if (linkedProjectId) {
          const proj = list.find(p => String(p.id) === String(linkedProjectId));
          if (proj) {
            setFormData(p => ({
              ...p,
              linkToProject: true,
              projectId: linkedProjectId,
              projectTitle: proj.title || '',
              piName: proj.pi_name || proj.submitted_by?.name || '',
              piOrcid: proj.pi_orcid || proj.submitted_by?.orcid || '',
              piInstitution: proj.institution || proj.lead_institution || '',
              startDate: proj.start_date || '',
              endDate: proj.end_date || '',
            }));
          }
        }
      } catch { setProjects(SAMPLE_PROJECTS); }
      setLoading(false);
    });
  }, []);

  const handleProjectSelect = (projectId) => {
    set('projectId', projectId);
    const proj = projects.find(p => String(p.id) === String(projectId));
    if (proj) {
      setFormData(p => ({
        ...p,
        projectId,
        projectTitle:  proj.title      || '',
        piName:        proj.pi_name    || proj.submitted_by?.name  || '',
        piOrcid:       proj.pi_orcid   || proj.submitted_by?.orcid || '',
        piInstitution: proj.institution || '',
        startDate:     proj.start_date || '',
        endDate:       proj.end_date   || '',
      }));
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSuccess('Draft saved');
    setSaving(false);
  };

  const handleSubmit = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSuccess('Ethics application submitted successfully');
    setTimeout(() => router.push('/researcher/ethics'), 1500);
    setSaving(false);
  };

  const progress = Math.round(((activeStep + 1) / STEPS.length) * 100);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: 0 }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  // ── STEP RENDERS ─────────────────────────────────────────────────────────

  const step1 = (
    <Box>
      <SectionHeader icon={ProjectIcon} title="Project & Personnel Context"
        subtitle="Link to an existing research project and identify accountability contacts." />

      <SubLabel label="1.1 Project Reference" />
      <FieldRow>
        <FormControlLabel
          control={<Switch checked={formData.linkToProject} onChange={e => set('linkToProject', e.target.checked)} sx={{ '& .MuiSwitch-thumb': { bgcolor: ACCENT }, '& .Mui-checked + .MuiSwitch-track': { bgcolor: ACCENT } }} />}
          label={<Typography sx={{ fontSize: 13 }}>Link this application to an existing Research Project</Typography>}
        />
      </FieldRow>

      {formData.linkToProject && (
        <FieldRow>
          <FormControl sx={{ flex: '2 1 300px', ...inp }}>
            <InputLabel size="small">Select Project *</InputLabel>
            <Select size="small" value={formData.projectId} label="Select Project *"
              onChange={e => handleProjectSelect(e.target.value)}>
              {projects.length === 0
                ? <MenuItem disabled value="">No projects found</MenuItem>
                : projects.map(p => <MenuItem key={p.id} value={p.id}>{p.title}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl sx={{ flex: '1 1 180px', ...inp }}>
            <InputLabel size="small">Application Type</InputLabel>
            <Select size="small" value={formData.applicationType} label="Application Type"
              onChange={e => set('applicationType', e.target.value)}>
              <MenuItem value="initial_review">Initial Review</MenuItem>
              <MenuItem value="amendment">Amendment to Approved Protocol</MenuItem>
              <MenuItem value="renewal">Renewal</MenuItem>
            </Select>
          </FormControl>
        </FieldRow>
      )}

      {formData.projectTitle && (
        <Paper elevation={0} sx={{ mb: 2.5, p: 2, borderRadius: 2, bgcolor: `${ACCENT}08`, border: `1px solid ${ACCENT}30` }}>
          <Typography sx={{ fontSize: 11, color: ACCENT, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.3 }}>Linked Project</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{formData.projectTitle}</Typography>
          {formData.startDate && <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.3 }}>{formData.startDate} → {formData.endDate}</Typography>}
        </Paper>
      )}

      <Divider sx={{ my: 2.5 }} />
      <SubLabel label="1.2 Investigator Responsibilities" />

      <FieldRow>
        <TextField size="small" label="Principal Investigator Name" value={formData.piName}
          onChange={e => set('piName', e.target.value)}
          disabled={formData.linkToProject && !!formData.projectId}
          sx={{ flex: '2 1 260px', ...inp }} />
        <TextField size="small" label="PI ORCID" value={formData.piOrcid}
          onChange={e => set('piOrcid', e.target.value)}
          disabled={formData.linkToProject && !!formData.projectId}
          InputProps={{ startAdornment: <OrcidIcon sx={{ fontSize: 14, color: 'text.disabled', mr: 0.5 }} /> }}
          sx={{ flex: '1 1 180px', ...inp }} />
        <TextField size="small" label="Institution" value={formData.piInstitution}
          onChange={e => set('piInstitution', e.target.value)}
          disabled={formData.linkToProject && !!formData.projectId}
          sx={{ flex: '2 1 220px', ...inp }} />
      </FieldRow>

      <FieldRow>
        <TextField size="small" label="Ethics Lead / Contact Name" value={formData.ethicsLead}
          onChange={e => set('ethicsLead', e.target.value)} sx={{ flex: '2 1 260px', ...inp }}
          helperText="Person responsible for day-to-day ethical compliance" />
        <TextField size="small" label="Ethics Lead Email" value={formData.ethicsLeadEmail}
          onChange={e => set('ethicsLeadEmail', e.target.value)} sx={{ flex: '2 1 260px', ...inp }} />
      </FieldRow>

      <SubLabel label="Training Certification" />
      <DropZone label="Ethics Training Certificate (CITI Program, NIH, etc.)"
        file={formData.trainingCertFile}
        onFile={f => set('trainingCertFile', f)} accent={ACCENT} />
    </Box>
  );

  const step2 = (
    <Box>
      <SectionHeader icon={ParticipantIcon} title="Participant & Subject Details"
        subtitle="Define who is being researched and the associated participant profile." />

      <SubLabel label="2.1 Participant Profile" />
      <FieldRow>
        <TextField size="small" label="Age Range (e.g. 18–65)" value={formData.ageRange}
          onChange={e => set('ageRange', e.target.value)} sx={{ flex: '1 1 160px', ...inp }} />
        <TextField size="small" label="Gender Profile" value={formData.genderProfile}
          onChange={e => set('genderProfile', e.target.value)} sx={{ flex: '1 1 160px', ...inp }} />
        <TextField size="small" label="Socio-economic Background" value={formData.socioEconomic}
          onChange={e => set('socioEconomic', e.target.value)} sx={{ flex: '2 1 240px', ...inp }} />
      </FieldRow>

      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 1 }}>Vulnerable Groups Involved</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {VULNERABLE_GROUPS.map(g => (
            <Chip key={g} label={g} size="small" clickable
              onClick={() => toggleArr('vulnerableGroups', g)}
              sx={{
                fontSize: 11, borderRadius: 1.5,
                bgcolor: formData.vulnerableGroups.includes(g) ? `${ACCENT}20` : dark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                color:   formData.vulnerableGroups.includes(g) ? ACCENT : 'text.secondary',
                border:  formData.vulnerableGroups.includes(g) ? `1px solid ${ACCENT}50` : '1px solid transparent',
                fontWeight: formData.vulnerableGroups.includes(g) ? 700 : 400,
              }} />
          ))}
        </Box>
      </Box>

      <TextField fullWidth size="small" multiline minRows={3} label="Recruitment Method"
        value={formData.recruitmentMethod} onChange={e => set('recruitmentMethod', e.target.value)}
        placeholder="Describe how participants will be identified and approached…"
        sx={{ mb: 2.5, ...multilineInp }} />

      <Divider sx={{ my: 2.5 }} />
      <SubLabel label="2.2 Sample Size & Rationale" />
      <FieldRow>
        <TextField size="small" label="Total Participants" type="number" value={formData.totalParticipants}
          onChange={e => set('totalParticipants', e.target.value)} sx={{ flex: '1 1 160px', ...inp }} />
        <TextField size="small" multiline minRows={2} label="Statistical Power / Justification"
          value={formData.statisticalPower} onChange={e => set('statisticalPower', e.target.value)}
          placeholder="Briefly justify the sample size is sufficient…"
          sx={{ flex: '3 1 360px', ...multilineInp }} />
      </FieldRow>
    </Box>
  );

  const step3 = (
    <Box>
      <SectionHeader icon={RiskIcon} title="Risk & Benefit Analysis"
        subtitle="Evaluate the safety and value of the study for participants and society." />

      <SubLabel label="3.1 Potential Risks" />
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 1 }}>Risk Categories Applicable</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {RISK_CATEGORIES.map(r => (
            <Chip key={r} label={r} size="small" clickable
              onClick={() => toggleArr('riskCategories', r)}
              sx={{
                fontSize: 11, borderRadius: 1.5,
                bgcolor: formData.riskCategories.includes(r) ? 'rgba(239,68,68,0.12)' : dark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                color:   formData.riskCategories.includes(r) ? '#ef4444' : 'text.secondary',
                border:  formData.riskCategories.includes(r) ? '1px solid rgba(239,68,68,0.4)' : '1px solid transparent',
                fontWeight: formData.riskCategories.includes(r) ? 700 : 400,
              }} />
          ))}
        </Box>
      </Box>

      <TextField fullWidth size="small" multiline minRows={3} label="Risk Mitigation Procedures"
        value={formData.riskMitigation} onChange={e => set('riskMitigation', e.target.value)}
        placeholder="Describe procedures in place to minimize identified risks…"
        sx={{ mb: 2.5, ...multilineInp }} />

      <TextField fullWidth size="small" multiline minRows={3} label="Adverse Event Protocol"
        value={formData.adverseEventProtocol} onChange={e => set('adverseEventProtocol', e.target.value)}
        placeholder="Describe the plan for handling and reporting unexpected harm to participants…"
        sx={{ mb: 2.5, ...multilineInp }} />

      <Divider sx={{ my: 2.5 }} />
      <SubLabel label="3.2 Potential Benefits" />

      <FieldRow>
        <TextField size="small" multiline minRows={3} label="Direct Benefits to Participants"
          value={formData.directBenefits} onChange={e => set('directBenefits', e.target.value)}
          placeholder="Describe any direct benefits to individual participants, if any…"
          sx={{ flex: '1 1 280px', ...multilineInp }} />
        <TextField size="small" multiline minRows={3} label="Indirect / Societal Benefits"
          value={formData.indirectBenefits} onChange={e => set('indirectBenefits', e.target.value)}
          placeholder="Describe contributions to scientific knowledge or society…"
          sx={{ flex: '1 1 280px', ...multilineInp }} />
      </FieldRow>
    </Box>
  );

  const step4 = (
    <Box>
      <SectionHeader icon={ConsentIcon} title="Informed Consent Process"
        subtitle="Ensure voluntary and informed participation with appropriate documentation." />

      <SubLabel label="4.1 Consent Mechanics" />
      <FieldRow>
        <FormControl sx={{ flex: '1 1 200px', ...inp }}>
          <InputLabel size="small">Consent Type</InputLabel>
          <Select size="small" value={formData.consentType} label="Consent Type"
            onChange={e => set('consentType', e.target.value)}>
            <MenuItem value="written">Written Consent</MenuItem>
            <MenuItem value="verbal">Verbal Consent</MenuItem>
            <MenuItem value="waiver">Waiver Requested</MenuItem>
            <MenuItem value="opt_out">Opt-out</MenuItem>
          </Select>
        </FormControl>
      </FieldRow>

      <TextField fullWidth size="small" multiline minRows={3} label="Consent Process Description"
        value={formData.consentProcess} onChange={e => set('consentProcess', e.target.value)}
        placeholder="When and where will consent be sought, and by whom?…"
        sx={{ mb: 2.5, ...multilineInp }} />

      <TextField fullWidth size="small" multiline minRows={2} label="Language & Literacy Provisions"
        value={formData.languageProvisions} onChange={e => set('languageProvisions', e.target.value)}
        placeholder="Provisions for non-primary language speakers or participants with limited literacy…"
        sx={{ mb: 2.5, ...multilineInp }} />

      <Divider sx={{ my: 2.5 }} />
      <SubLabel label="4.2 Documentation Upload" />
      <FieldRow>
        <Box sx={{ flex: '1 1 280px' }}>
          <DropZone label="Participant Information Sheet (PIS)"
            file={formData.pisFile} onFile={f => set('pisFile', f)} accent={ACCENT} />
        </Box>
        <Box sx={{ flex: '1 1 280px' }}>
          <DropZone label="Informed Consent Form (ICF)"
            file={formData.icfFile} onFile={f => set('icfFile', f)} accent={ACCENT} />
        </Box>
      </FieldRow>
    </Box>
  );

  const step5 = (
    <Box>
      <SectionHeader icon={PrivacyIcon} title="Data Privacy & Confidentiality"
        subtitle="Safeguard participant identity and define data protection measures." />

      <SubLabel label="5.1 Anonymization & Identifiability" />
      <FieldRow>
        <FormControl sx={{ flex: '1 1 220px', ...inp }}>
          <InputLabel size="small">Identifiability Level</InputLabel>
          <Select size="small" value={formData.identifiability} label="Identifiability Level"
            onChange={e => set('identifiability', e.target.value)}>
            <MenuItem value="anonymous">Anonymous</MenuItem>
            <MenuItem value="de_identified">De-identified</MenuItem>
            <MenuItem value="coded">Coded (key held separately)</MenuItem>
            <MenuItem value="identifiable">Identifiable</MenuItem>
          </Select>
        </FormControl>
      </FieldRow>

      {(formData.identifiability === 'coded' || formData.identifiability === 'identifiable') && (
        <FieldRow>
          <TextField size="small" multiline minRows={2} label="Key / Identifier Storage Location"
            value={formData.keyStorage} onChange={e => set('keyStorage', e.target.value)}
            placeholder="Where is the key linking IDs to identities stored?…"
            sx={{ flex: '1 1 280px', ...multilineInp }} />
          <TextField size="small" multiline minRows={2} label="Who Has Access to the Key"
            value={formData.keyAccess} onChange={e => set('keyAccess', e.target.value)}
            placeholder="List roles/individuals with access to the identifying key…"
            sx={{ flex: '1 1 280px', ...multilineInp }} />
        </FieldRow>
      )}

      {formData.identifiability === 'anonymous' && (
        <Alert severity="success" sx={{ borderRadius: 2, fontSize: 12 }}>
          Anonymous data collection minimizes ethical risk. No re-identification key storage details required.
        </Alert>
      )}
    </Box>
  );

  const step6 = (
    <Box>
      <SectionHeader icon={FundingIcon} title="Conflict of Interest & Funding"
        subtitle="Identify potential biases and financial relationships that could influence the research." />

      <SubLabel label="Financial Disclosure" />
      <TextField fullWidth size="small" multiline minRows={3} label="Financial Interests in Study Outcomes"
        value={formData.financialDisclosure} onChange={e => set('financialDisclosure', e.target.value)}
        placeholder="Describe any financial interests, equity holdings, or consultancy fees related to the study outcomes. Enter 'None' if not applicable…"
        sx={{ mb: 2.5, ...multilineInp }} />

      <Divider sx={{ my: 2.5 }} />
      <SubLabel label="Dual Roles" />
      <TextField fullWidth size="small" multiline minRows={3} label="Dual Role Identification"
        value={formData.dualRoles} onChange={e => set('dualRoles', e.target.value)}
        placeholder="Identify if the researcher also serves as a clinician, teacher, employer, or other role to participants. Describe how this potential coercion will be managed…"
        sx={multilineInp} />
    </Box>
  );

  const step7 = (
    <Box>
      <SectionHeader icon={DeclareIcon} title="Declarations & Sign-off"
        subtitle="Formal commitment to ethical standards and PI accountability." />

      <SubLabel label="Ethical Codes of Conduct" />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2.5 }}>
        {ETHICAL_CODES.map(c => (
          <Chip key={c} label={c} size="small" clickable
            onClick={() => toggleArr('ethicalCodes', c)}
            sx={{
              fontSize: 11, borderRadius: 1.5,
              bgcolor: formData.ethicalCodes.includes(c) ? `${ACCENT}20` : dark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
              color:   formData.ethicalCodes.includes(c) ? ACCENT : 'text.secondary',
              border:  formData.ethicalCodes.includes(c) ? `1px solid ${ACCENT}50` : '1px solid transparent',
              fontWeight: formData.ethicalCodes.includes(c) ? 700 : 400,
            }} />
        ))}
      </Box>

      <TextField fullWidth size="small" multiline minRows={3} label="Additional Notes or Special Considerations"
        value={formData.additionalNotes} onChange={e => set('additionalNotes', e.target.value)}
        placeholder="Any additional ethical considerations not covered above…"
        sx={{ mb: 2.5, ...multilineInp }} />

      <FieldRow>
        <TextField size="small" label="Declaration Date" type="date"
          value={formData.declarationDate} onChange={e => set('declarationDate', e.target.value)}
          InputLabelProps={{ shrink: true }} sx={{ flex: '1 1 180px', ...inp }} />
      </FieldRow>

      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2.5, bgcolor: dark ? `${ACCENT}08` : `${ACCENT}06`, border: `1px solid ${ACCENT}30`, mb: 2.5 }}>
        <FormControlLabel
          control={<Checkbox checked={formData.piDeclaration} onChange={e => set('piDeclaration', e.target.checked)} sx={{ color: ACCENT, '&.Mui-checked': { color: ACCENT } }} />}
          label={
            <Typography sx={{ fontSize: 13, lineHeight: 1.5 }}>
              I, the Principal Investigator, declare that all information provided in this application is true and accurate. I commit to conducting this research in compliance with the selected ethical guidelines and institutional policies, and will report any adverse events or protocol deviations promptly to the Ethics Committee.
            </Typography>
          }
        />
      </Paper>
    </Box>
  );

  const STEP_CONTENT = [step1, step2, step3, step4, step5, step6, step7];

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minHeight: 0,
      overflow: 'hidden',
      bgcolor: 'background.default',
    }}>
      <Box sx={{
        flexShrink: 0,
        zIndex: 1100,
        bgcolor: 'background.default',
        borderBottom: '1px solid', borderColor: 'divider',
        px: { xs: 2, md: 4 }, py: 2,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Button size="small" startIcon={<BackIcon sx={{ fontSize: 15 }} />}
              onClick={() => router.push('/researcher/ethics')}
              sx={{ textTransform: 'none', color: 'text.secondary', borderRadius: 2 }}>
              Back to Ethics
            </Button>
            <Typography sx={{ color: 'divider' }}>|</Typography>
            <Box>
              <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>New Ethics Application</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                {formData.projectTitle || 'IRB / Ethics Committee review submission'}
              </Typography>
            </Box>
          </Box>
          <Button size="small" variant="contained"
            startIcon={saving ? <CircularProgress size={13} sx={{ color: 'inherit' }} /> : <SaveIcon sx={{ fontSize: 14 }} />}
            onClick={handleSaveDraft} disabled={saving}
            sx={{
              textTransform: 'none', borderRadius: 2, fontSize: 12,
              bgcolor: ACCENT, color: '#fff',
              '&:hover': { bgcolor: '#0e8a85' },
            }}>
            Save Draft
          </Button>
        </Box>
      </Box>

      <Box sx={{
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        ...accentScrollbarSx(dark, { size: 10 }),
      }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: { xs: 0, lg: 2 },
          px: { xs: 2, md: 4 },
          py: 3,
        }}>
          <Paper elevation={0} variant="outlined" sx={{
            width: 220,
            flexShrink: 0,
            borderRadius: 3,
            display: { xs: 'none', lg: 'block' },
            position: 'sticky',
            top: 0,
            zIndex: 100,
            bgcolor: 'background.paper',
          }}>
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.7, mb: 1 }}>Progress</Typography>
              <LinearProgress variant="determinate" value={progress}
                sx={{ height: 5, borderRadius: 3, bgcolor: 'divider', '& .MuiLinearProgress-bar': { bgcolor: ACCENT } }} />
              <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>{progress}% complete</Typography>
            </Box>
            <Box sx={{ py: 1 }}>
              {STEPS.map((s, i) => {
                const done = i < activeStep;
                const active = i === activeStep;
                return (
                  <Box key={i} onClick={() => setActiveStep(i)} sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.2, cursor: 'pointer',
                    borderLeft: active ? `3px solid ${ACCENT}` : '3px solid transparent',
                    bgcolor: active ? `${ACCENT}10` : 'transparent', transition: 'all 0.15s',
                    '&:hover': { bgcolor: `${ACCENT}08` },
                  }}>
                    <Box sx={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: done ? '#10b981' : active ? ACCENT : dark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                    }}>
                      {done ? <CheckIcon sx={{ fontSize: 13, color: '#fff' }} /> : <s.Icon sx={{ fontSize: 12, color: active ? '#fff' : 'text.disabled' }} />}
                    </Box>
                    <Typography sx={{ fontSize: 11.5, fontWeight: active ? 700 : 500, color: active ? ACCENT : done ? 'text.primary' : 'text.secondary', lineHeight: 1.3 }}>
                      {s.label}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Paper>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

            <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, p: { xs: 2.5, md: 3.5 }, mb: 2.5, overflow: 'visible' }}>
              {STEP_CONTENT[activeStep]}
            </Paper>

            <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Button variant="outlined" size="small" disabled={activeStep === 0}
                onClick={() => setActiveStep(s => s - 1)} startIcon={<BackIcon sx={{ fontSize: 15 }} />}
                sx={{ textTransform: 'none', borderRadius: 2, fontSize: 13 }}>Previous</Button>
              <Box sx={{ display: 'flex', gap: 0.75 }}>
                {STEPS.map((_, i) => (
                  <Box key={i} onClick={() => setActiveStep(i)} sx={{
                    width: i === activeStep ? 20 : 7, height: 7, borderRadius: 4,
                    bgcolor: i === activeStep ? ACCENT : i < activeStep ? `${ACCENT}60` : dark ? 'rgba(255,255,255,0.15)' : '#e2e8f0',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }} />
                ))}
              </Box>
              {activeStep < STEPS.length - 1 ? (
                <Button variant="contained" size="small" onClick={() => setActiveStep(s => s + 1)}
                  sx={{ textTransform: 'none', borderRadius: 2, fontSize: 13, bgcolor: ACCENT, '&:hover': { bgcolor: '#0e8a85' } }}>
                  Next Step
                </Button>
              ) : (
                <Button variant="contained" size="small" onClick={handleSubmit}
                  disabled={saving || !formData.piDeclaration}
                  startIcon={saving ? <CircularProgress size={13} sx={{ color: 'inherit' }} /> : null}
                  sx={{ textTransform: 'none', borderRadius: 2, fontSize: 13, bgcolor: ACCENT, '&:hover': { bgcolor: '#0e8a85' } }}>
                  Submit Application
                </Button>
              )}
            </Paper>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
